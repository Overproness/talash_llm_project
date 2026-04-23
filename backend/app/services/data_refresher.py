"""
Data Refresher Orchestrator.

Runs scrapers with error isolation, updates metadata, and invalidates caches.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Callable

from app.services.scrapers.base import load_metadata, mark_scraper_error

logger = logging.getLogger(__name__)

# ─── Scraper registry ─────────────────────────────────────────────────────────
# Imported lazily to avoid circular import and allow optional scraper failures

def get_scrapers() -> dict[str, tuple[Callable, int]]:
    """Return {name: (run_fn, interval_days)}."""
    from app.services.scrapers import (
        scimago_journals,
        core_conferences,
        hec_universities,
        qs_rankings,
        publishers,
    )
    return {
        "scimago_journals": (scimago_journals.run, 30),
        "core_conferences": (core_conferences.run, 30),
        "hec_universities": (hec_universities.run, 90),
        "qs_rankings": (qs_rankings.run, 90),
        "publishers": (publishers.run, 90),
    }


# ─── Cache invalidation ───────────────────────────────────────────────────────

def _invalidate_caches() -> None:
    """Clear all lru_cache loaders in research_analyzer and education_analyzer."""
    try:
        from app.services.research_analyzer import cache_clear as rc_clear
        rc_clear()
    except Exception as e:
        logger.warning(f"Could not clear research_analyzer cache: {e}")

    try:
        from app.services.education_analyzer import cache_clear as ec_clear
        ec_clear()
    except Exception as e:
        logger.warning(f"Could not clear education_analyzer cache: {e}")


# ─── Core runner ──────────────────────────────────────────────────────────────

async def run_scraper(name: str, fn: Callable) -> bool:
    """Run a single scraper in a thread (sync fn) with full error isolation."""
    logger.info(f"[data_refresher] Starting scraper: {name}")
    try:
        loop = asyncio.get_event_loop()
        count = await loop.run_in_executor(None, fn)
        logger.info(f"[data_refresher] {name} completed — {count} records")
        _invalidate_caches()
        return True
    except Exception as e:
        logger.error(f"[data_refresher] {name} FAILED: {e}", exc_info=True)
        mark_scraper_error(name, str(e))
        return False


async def run_all_scrapers() -> dict[str, bool]:
    """Run all scrapers sequentially (not parallel — avoids concurrent file writes)."""
    scrapers = get_scrapers()
    results: dict[str, bool] = {}
    for name, (fn, _) in scrapers.items():
        results[name] = await run_scraper(name, fn)
    return results


async def run_due_scrapers() -> dict[str, bool]:
    """
    Run only scrapers whose data is stale (past their refresh interval).
    Called on startup to catch up without waiting for the next cron tick.
    """
    scrapers = get_scrapers()
    metadata = load_metadata()
    results: dict[str, bool] = {}
    now = datetime.now(timezone.utc)

    for name, (fn, interval_days) in scrapers.items():
        meta = metadata.get(name, {})
        last_run_str = meta.get("last_run")
        if last_run_str:
            try:
                last_run = datetime.fromisoformat(last_run_str)
                if (now - last_run) < timedelta(days=interval_days):
                    logger.info(f"[data_refresher] {name}: data is fresh — skipping")
                    continue
            except ValueError:
                pass  # Malformed timestamp — treat as stale

        logger.info(f"[data_refresher] {name}: data is stale — running now")
        results[name] = await run_scraper(name, fn)

    return results


async def run_monthly_scrapers() -> dict[str, bool]:
    """Run scrapers scheduled monthly (Scimago + CORE)."""
    scrapers = get_scrapers()
    monthly = ["scimago_journals", "core_conferences"]
    results: dict[str, bool] = {}
    for name in monthly:
        if name in scrapers:
            fn, _ = scrapers[name]
            results[name] = await run_scraper(name, fn)
    return results


async def run_quarterly_scrapers() -> dict[str, bool]:
    """Run scrapers scheduled quarterly (HEC + QS + Publishers)."""
    scrapers = get_scrapers()
    quarterly = ["hec_universities", "qs_rankings", "publishers"]
    results: dict[str, bool] = {}
    for name in quarterly:
        if name in scrapers:
            fn, _ = scrapers[name]
            results[name] = await run_scraper(name, fn)
    return results
