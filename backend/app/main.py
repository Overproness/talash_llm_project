from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.config import get_settings
from app.core.database import connect_db, close_db
from app.api.routes import upload, candidates, health, settings as settings_routes
from app.api.routes import analysis
from app.api.routes import admin as admin_routes
from app.services.data_refresher import run_due_scrapers, run_monthly_scrapers, run_quarterly_scrapers

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

_scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
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

    # Catch up on any stale data without waiting for next cron tick
    logger.info("Running due scrapers on startup …")
    try:
        await run_due_scrapers()
    except Exception as e:
        logger.error(f"Startup scraper run failed: {e}", exc_info=True)

    yield

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
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
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
