"""
Admin API routes — scraper status and manual trigger endpoints.

GET  /api/admin/scrapers/status          — return metadata.json
POST /api/admin/scrapers/run             — trigger full refresh (BackgroundTask)
POST /api/admin/scrapers/run/{name}      — trigger single scraper (BackgroundTask)
"""

import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.services.scrapers.base import load_metadata
from app.services.data_refresher import run_all_scrapers, run_scraper, get_scrapers

logger = logging.getLogger(__name__)
router = APIRouter()

_SCRAPER_NAMES = ["scimago_journals", "core_conferences", "hec_universities", "qs_rankings", "publishers"]


@router.get("/admin/scrapers/status")
async def scrapers_status():
    """Return last-run metadata for all scrapers."""
    return load_metadata()


@router.post("/admin/scrapers/run")
async def scrapers_run_all(background_tasks: BackgroundTasks):
    """Trigger a full refresh of all scrapers in the background."""
    background_tasks.add_task(_run_all_bg)
    return {"status": "accepted", "message": "Full scraper refresh triggered in background"}


@router.post("/admin/scrapers/run/{scraper_name}")
async def scrapers_run_one(scraper_name: str, background_tasks: BackgroundTasks):
    """Trigger a single scraper by name in the background."""
    scrapers = get_scrapers()
    if scraper_name not in scrapers:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown scraper '{scraper_name}'. Valid names: {list(scrapers.keys())}",
        )
    fn, _ = scrapers[scraper_name]
    background_tasks.add_task(run_scraper, scraper_name, fn)
    return {"status": "accepted", "scraper": scraper_name, "message": "Scraper triggered in background"}


async def _run_all_bg() -> None:
    results = await run_all_scrapers()
    logger.info(f"Admin full refresh complete: {results}")
