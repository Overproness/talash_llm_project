"""
QS World University Rankings scraper.

Primary source: official QS Rankings API (via Playwright for session auth).
Fallback: keep existing data and log a warning (never wipe working data on error).

Output: merges global rankings into data/reference_data/university_rankings.json
Schedule: quarterly
"""

import json
import logging
import os
import time

from app.core.config import get_settings
from app.services.scrapers.base import update_metadata, write_reference_json

logger = logging.getLogger(__name__)

# QS 2025 ranking node ID (discovered by intercepting network requests)
_QS_NID = "3990755"
_QS_RANKING_URL = "https://www.topuniversities.com/world-university-rankings/2025"
_QS_API_ENDPOINT = (
    "https://www.topuniversities.com/rankings/endpoint"
    "?nid={nid}&page={page}&items_per_page={per_page}"
    "&tab=indicators&region=&countries=&cities=&search=&star="
    "&sort_by=&order_by=&program_type=&scholarship=&fee="
    "&english_score=&academic_score=&mix_student=&loggedincache=&study_level=&subjects="
)

_TIER_MAP = [
    (range(1, 51), "world_elite"),
    (range(51, 201), "world_top"),
    (range(201, 501), "world_good"),
    (range(501, 1001), "world_ranked"),
]


def _rank_to_tier(rank_val: int) -> str:
    for r, tier in _TIER_MAP:
        if rank_val in r:
            return tier
    return "world_ranked"


def _load_existing_rankings() -> list[dict]:
    path = os.path.join(get_settings().reference_data_dir, "university_rankings.json")
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return []
    except Exception as e:
        logger.warning(f"Could not load existing university_rankings.json: {e}")
        return []


def _fetch_qs_via_playwright() -> list[dict]:
    """
    Scrape QS rankings via official QS API, using Playwright to obtain a valid
    browser session (cookies + headers) that bypasses Cloudflare.
    Returns list of raw score_node dicts.
    """
    from playwright.sync_api import sync_playwright

    all_nodes: list[dict] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        )
        page = ctx.new_page()

        # Intercept the first data call to get total pages
        first_response: dict | None = None

        def _handle_response(response):
            nonlocal first_response
            if (
                f"rankings/endpoint?nid={_QS_NID}" in response.url
                and first_response is None
            ):
                try:
                    first_response = response.json()
                    if isinstance(first_response, dict):
                        all_nodes.extend(first_response.get("score_nodes", []))
                except Exception:
                    pass

        page.on("response", _handle_response)

        logger.info("QS scraper: loading rankings page to establish session …")
        page.goto(_QS_RANKING_URL, timeout=60_000, wait_until="networkidle")

        if first_response is None:
            logger.warning("QS scraper: no API response intercepted")
            browser.close()
            return []

        total_pages = first_response.get("total_pages", 1)
        per_page = first_response.get("items_per_page", 30)
        logger.info(f"QS scraper: total_pages={total_pages}, per_page={per_page}")

        # Fetch remaining pages using the session cookies
        cookies = ctx.cookies()
        cookie_str = "; ".join(f"{c['name']}={c['value']}" for c in cookies)

        # Re-use the API via fetch() inside the page context (inherits session)
        for pg in range(1, total_pages):
            url = _QS_API_ENDPOINT.format(nid=_QS_NID, page=pg, per_page=per_page)
            try:
                result = page.evaluate(
                    """async (url) => {
                        const r = await fetch(url, {credentials: 'include'});
                        return r.json();
                    }""",
                    url,
                )
                if isinstance(result, dict):
                    all_nodes.extend(result.get("score_nodes", []))
                time.sleep(0.2)  # polite delay
            except Exception as e:
                logger.warning(f"QS scraper: page {pg} failed: {e}")

        browser.close()

    logger.info(f"QS scraper: collected {len(all_nodes)} raw entries")
    return all_nodes


def _parse_qs_nodes(nodes: list[dict]) -> list[dict]:
    """Convert raw QS score_node dicts to our university schema."""
    results: list[dict] = []
    for node in nodes:
        name = (node.get("title") or "").strip()
        if not name:
            continue
        rank_display = (node.get("rank_display") or node.get("rank") or "").strip()
        country = (node.get("country") or "").strip()

        # Derive numeric rank from rank_display (handles "=1", "1201+", "501-510")
        rank_int: int | None = None
        if rank_display:
            clean = rank_display.replace("=", "").replace("+", "").split("-")[0].strip()
            try:
                rank_int = int(clean)
            except ValueError:
                pass

        results.append(
            {
                "name": name,
                "aliases": [],
                "country": country,
                "hec_category": "N/A",
                "qs_rank": rank_display if rank_display else "unranked",
                "the_rank": "unranked",
                "tier": _rank_to_tier(rank_int) if rank_int else "world_ranked",
            }
        )
    return results


def _merge_qs(existing: list[dict], qs_list: list[dict]) -> list[dict]:
    """
    For each QS entry: if a matching entry already exists (by name), update
    qs_rank and tier; otherwise append. Pakistan entries retain hec_category.
    """
    name_map: dict[str, int] = {u["name"].lower(): i for i, u in enumerate(existing)}
    merged = list(existing)

    for qs in qs_list:
        key = qs["name"].lower()
        if key in name_map:
            idx = name_map[key]
            merged[idx]["qs_rank"] = qs["qs_rank"]
            if merged[idx].get("tier") in ("unknown", "world_ranked", ""):
                merged[idx]["tier"] = qs["tier"]
        else:
            merged.append(qs)

    return merged


def run() -> int:
    """Fetch QS rankings via Playwright and merge into university_rankings.json."""
    logger.info("QS scraper: starting Playwright-based fetch …")
    nodes = _fetch_qs_via_playwright()

    if not nodes:
        logger.warning("QS scraper: no data retrieved — keeping existing data")
        update_metadata("qs_rankings", 0)
        return 0

    qs_list = _parse_qs_nodes(nodes)
    if not qs_list:
        logger.warning("QS scraper: parsed 0 records — keeping existing data")
        update_metadata("qs_rankings", 0)
        return 0

    existing = _load_existing_rankings()
    merged = _merge_qs(existing, qs_list)
    write_reference_json("university_rankings.json", merged)
    update_metadata("qs_rankings", len(qs_list))
    logger.info(f"QS scraper: merged {len(qs_list)} university rankings")
    return len(qs_list)
