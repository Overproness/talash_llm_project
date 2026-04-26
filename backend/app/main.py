import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from pathlib import Path
from bson import ObjectId

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.config import get_settings
from app.core.database import connect_db, close_db, get_db
from app.api.routes import upload, candidates, health, settings as settings_routes
from app.api.routes import analysis
from app.api.routes import admin as admin_routes
from app.services.data_refresher import run_due_scrapers, run_monthly_scrapers, run_quarterly_scrapers
from app.services.folder_watcher import FolderWatcher

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

_scheduler = AsyncIOScheduler()
_folder_watcher: FolderWatcher | None = None
_watcher_task: asyncio.Task | None = None


async def _process_watched_file(file_path: str, settings) -> None:
    """Process a CV file detected by the folder watcher."""
    db = get_db()
    try:
        filename = Path(file_path).name
        # Skip if already in DB
        existing = await db.candidates.find_one({"file_path": file_path})
        if existing:
            logger.info(f"Folder watcher: {filename} already in DB, skipping.")
            return

        pending_doc = {
            "filename": filename,
            "file_path": file_path,
            "processing_status": "processing",
            "processing_error": "",
            "raw_text": "",
            "extraction_method": "",
            "personal_info": {},
            "education": [],
            "experience": [],
            "publications": [],
            "skills": [],
            "books": [],
            "patents": [],
            "supervision": [],
            "missing_fields": [],
            "overall_score": None,
            "summary": "",
        }
        result = await db.candidates.insert_one(pending_doc)
        candidate_id = str(result.inserted_id)
        logger.info(f"Folder watcher: queued {filename} as candidate {candidate_id}")

        try:
            from app.services.cv_parser import parse_cv as _parse_cv
            parsed = await _parse_cv(file_path, settings.processed_dir)
            update_data = parsed.model_dump(exclude={"filename", "file_path"})
            await db.candidates.update_one({"_id": ObjectId(candidate_id)}, {"$set": update_data})

            from app.services.candidate_analyzer import run_full_analysis as _analyze
            analysis_results = await _analyze(parsed)
            analysis_results["processing_status"] = "done"
            await db.candidates.update_one({"_id": ObjectId(candidate_id)}, {"$set": analysis_results})
            logger.info(f"Folder watcher: finished processing {filename}")
        except Exception as e:
            logger.error(f"Folder watcher: processing failed for {filename}: {e}")
            await db.candidates.update_one(
                {"_id": ObjectId(candidate_id)},
                {"$set": {"processing_status": "failed", "processing_error": str(e)}},
            )
    except Exception as e:
        logger.error(f"Folder watcher: unexpected error for {file_path}: {e}", exc_info=True)


async def _watcher_queue_worker(queue: asyncio.Queue, settings) -> None:
    """Continuously drain the folder-watcher queue and process each file."""
    logger.info("Folder watcher queue worker started")
    while True:
        file_path: str = await queue.get()
        logger.info(f"Folder watcher: processing queued file: {file_path}")
        try:
            await _process_watched_file(file_path, settings)
        except Exception as e:
            logger.error(f"Folder watcher worker error: {e}", exc_info=True)
        finally:
            queue.task_done()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _folder_watcher, _watcher_task
    settings = get_settings()
    logger.info(f"Connecting to MongoDB at {settings.mongodb_url}")
    await connect_db()
    logger.info("MongoDB connected")

    # ── APScheduler ──────────────────────────────────────────────────────────
    # Monthly job: 1st of every month at 02:00 UTC
    _scheduler.add_job(
        run_monthly_scrapers,
        trigger="cron",
        day=1,
        hour=2,
        minute=0,
        id="monthly_scrapers",
        replace_existing=True,
    )
    # Quarterly job: 1st of Jan / Apr / Jul / Oct at 03:00 UTC
    _scheduler.add_job(
        run_quarterly_scrapers,
        trigger="cron",
        month="1,4,7,10",
        day=1,
        hour=3,
        minute=0,
        id="quarterly_scrapers",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("APScheduler started")

    # ── Folder Watcher ───────────────────────────────────────────────────────
    watcher_queue: asyncio.Queue = asyncio.Queue()
    _folder_watcher = FolderWatcher(settings.cv_upload_dir, watcher_queue)
    _folder_watcher.start()
    _watcher_task = asyncio.create_task(_watcher_queue_worker(watcher_queue, settings))
    logger.info(f"Folder watcher started on {settings.cv_upload_dir}")

    # Catch up on any stale data without waiting for next cron tick
    logger.info("Running due scrapers on startup …")
    try:
        await run_due_scrapers()
    except Exception as e:
        logger.error(f"Startup scraper run failed: {e}", exc_info=True)

    yield

    if _folder_watcher:
        _folder_watcher.stop()
        logger.info("Folder watcher stopped")
    if _watcher_task:
        _watcher_task.cancel()
        try:
            await _watcher_task
        except asyncio.CancelledError:
            pass

    _scheduler.shutdown(wait=False)
    logger.info("APScheduler stopped")
    await close_db()
    logger.info("MongoDB disconnected")


app = FastAPI(
    title="TALASH — Smart HR Recruitment API",
    description="LLM-powered CV analysis and candidate profiling system",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "https://talash-llm-project.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = get_settings().api_prefix
app.include_router(health.router, prefix=PREFIX, tags=["health"])
app.include_router(upload.router, prefix=PREFIX, tags=["upload"])
app.include_router(candidates.router, prefix=PREFIX, tags=["candidates"])
app.include_router(settings_routes.router, prefix=PREFIX, tags=["settings"])
app.include_router(analysis.router, prefix=PREFIX, tags=["analysis"])
app.include_router(admin_routes.router, prefix=PREFIX, tags=["admin"])


@app.get("/")
async def root():
    return {"message": "TALASH API v0.1.0 — Upload CVs at POST /api/upload"}
