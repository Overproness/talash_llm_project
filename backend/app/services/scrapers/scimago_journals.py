"""
Scimago Journals scraper.

Source: https://www.scimagojr.com/journalrank.php?out=xls
Downloads the free annual CSV (~30k journals, semicolon-delimited) using
Playwright to bypass Cloudflare protection.

Fallback: if Playwright fails (e.g. Cloudflare still blocking), the existing
journal_quality.json is left unchanged and a warning is logged.

Output: data/reference_data/journal_quality.json
Schedule: monthly
"""

import csv
import io
import logging
import os
import time

from app.services.scrapers.base import make_http_client, update_metadata, write_reference_json

logger = logging.getLogger(__name__)

SCIMAGO_HOME = "https://www.scimagojr.com/journalrank.php"
SCIMAGO_URL = "https://www.scimagojr.com/journalrank.php?out=xls"

_QUARTILE_RANK = {"Q1": 1, "Q2": 2, "Q3": 3, "Q4": 4}


def _parse_csv_content(content: str) -> list[dict]:
    """Parse the semicolon-delimited Scimago CSV into a deduplicated list of records."""
    reader = csv.DictReader(io.StringIO(content), delimiter=";")
    seen: dict[str, dict] = {}

    for row in reader:
        raw_issn = row.get("Issn", "").strip().replace(" ", "")
        issns = [i.strip() for i in raw_issn.split(",") if i.strip()]
        primary_issn = issns[0] if issns else ""

        quartile = row.get("SJR Best Quartile", "").strip()
        title = row.get("Title", "").strip()
        sjr = row.get("SJR", "").strip().replace(",", ".")
        subject = row.get("Categories", row.get("Areas", "")).strip()

        if not primary_issn and not title:
            continue

        record = {
            "issn": primary_issn,
            "issn_all": issns,
            "title": title,
            "quartile": quartile if quartile in _QUARTILE_RANK else "unranked",
            "sjr": float(sjr) if sjr else None,
            "subject_area": subject,
        }

        key = primary_issn or title.lower()
        existing = seen.get(key)
        if existing is None:
            seen[key] = record
        else:
            existing_rank = _QUARTILE_RANK.get(existing["quartile"], 99)
            new_rank = _QUARTILE_RANK.get(record["quartile"], 99)
            if new_rank < existing_rank:
                seen[key] = record

    return list(seen.values())


def _fetch_via_direct_http() -> str | None:
    """Try a direct httpx download first (fast, works if Cloudflare isn't active)."""
    try:
        with make_http_client(timeout=120.0) as client:
            # Visit homepage first to pick up cookies
            client.get(SCIMAGO_HOME, timeout=30.0)
            resp = client.get(SCIMAGO_URL)
            if resp.status_code == 200 and ";" in resp.text[:500]:
                logger.info("Scimago scraper: direct HTTP download succeeded")
                return resp.content.decode("utf-8", errors="replace")
    except Exception as e:
        logger.debug(f"Scimago scraper: direct HTTP failed: {e}")
    return None


def _fetch_via_playwright() -> str | None:
    """Use Playwright to load the page (bypasses Cloudflare JS challenge) then download CSV."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        logger.warning("Scimago scraper: Playwright not installed, skipping")
        return None

    csv_content: list[str] = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            ctx = browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                accept_downloads=True,
            )
            page = ctx.new_page()

            # Navigate to the homepage; Cloudflare challenge auto-solves within ~5s
            logger.info("Scimago scraper: opening homepage via Playwright …")
            page.goto(SCIMAGO_HOME, timeout=60_000, wait_until="domcontentloaded")

            # Wait for Cloudflare challenge to pass (title changes from "Just a moment...")
            for _ in range(20):
                title = page.title()
                if "just a moment" not in title.lower():
                    break
                time.sleep(1)
            else:
                logger.warning("Scimago scraper: Cloudflare challenge did not resolve")
                browser.close()
                return None

            logger.info("Scimago scraper: Cloudflare resolved, downloading CSV …")

            # Use fetch() inside the page context so it inherits the session cookies
            result = page.evaluate(
                """async () => {
                    const resp = await fetch(
                        'https://www.scimagojr.com/journalrank.php?out=xls',
                        {credentials: 'include'}
                    );
                    if (!resp.ok) return null;
                    return await resp.text();
                }"""
            )
            browser.close()

            if result and ";" in result[:500]:
                logger.info("Scimago scraper: Playwright CSV download succeeded")
                return result

            logger.warning("Scimago scraper: Playwright download returned unexpected content")
            return None

    except Exception as e:
        logger.error(f"Scimago scraper: Playwright error: {e}")
        return None


def run() -> int:
    """Fetch Scimago CSV and write journal_quality.json. Returns record count."""
    logger.info("Scimago scraper: starting …")

    # 1. Try direct HTTP (fast path)
    content = _fetch_via_direct_http()

    # 2. Fallback to Playwright (handles Cloudflare)
    if content is None:
        logger.info("Scimago scraper: falling back to Playwright …")
        content = _fetch_via_playwright()

    # 3. If both fail, keep existing data
    if content is None:
        logger.warning(
            "Scimago scraper: all download methods failed — "
            "journal_quality.json not updated"
        )
        update_metadata("scimago_journals", 0)
        return 0

    journals = _parse_csv_content(content)
    if not journals:
        logger.warning("Scimago scraper: CSV parsed but yielded 0 records — not updating file")
        return 0

    write_reference_json("journal_quality.json", journals)
    update_metadata("scimago_journals", len(journals))
    logger.info(f"Scimago scraper: wrote {len(journals)} journals")
    return len(journals)
