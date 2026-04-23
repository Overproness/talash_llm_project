"""
Times Higher Education (THE) World University Rankings scraper.

Source: https://www.timeshighereducation.com/json/ranking_tables/world_university_rankings/<year>
Returns JSON with 3000+ universities and scores for:
  rank, name, location (country), overall, teaching, research, citations,
  industry_income, international_outlook, student stats.

Output: merges the_rank into data/reference_data/university_rankings.json
Schedule: annually (rankings update once per year)
"""

import json
import logging
import os

from app.core.config import get_settings
from app.services.scrapers.base import make_http_client, update_metadata, write_reference_json

logger = logging.getLogger(__name__)

_THE_BASE_URL = "https://www.timeshighereducation.com"
_THE_RANKING_URL = (
    _THE_BASE_URL + "/json/ranking_tables/world_university_rankings/{year}"
)
_CURRENT_YEAR = 2026  # update annually

_TIER_MAP = [
    (range(1, 51), "world_elite"),
    (range(51, 201), "world_top"),
    (range(201, 501), "world_good"),
    (range(501, 1001), "world_ranked"),
]


def _rank_to_tier(rank_int: int) -> str:
    for r, tier in _TIER_MAP:
        if rank_int in r:
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


def _fetch_the_json(year: int) -> list[dict] | None:
    """Fetch THE rankings JSON for the given year. Returns list of raw entries."""
    url = _THE_RANKING_URL.format(year=year)
    logger.info(f"THE scraper: fetching {url}")
    with make_http_client(timeout=60.0) as client:
        # THE's CDN requires a Referer that looks like it comes from their site
        client.headers.update({
            "Referer": f"{_THE_BASE_URL}/world-university-rankings/latest/world-ranking",
            "Accept": "application/json, */*",
        })
        resp = client.get(url)
        resp.raise_for_status()

    data = resp.json()
    if isinstance(data, dict):
        return data.get("data", [])
    return None


def _parse_the_entries(entries: list[dict]) -> list[dict]:
    """Convert raw THE entries to our university schema."""
    results: list[dict] = []
    for entry in entries:
        name = (entry.get("name") or "").strip()
        if not name:
            continue

        rank_raw = (entry.get("rank") or "").strip()
        country = (entry.get("location") or "").strip()

        # Normalise rank string ("=1", "201-250", "1201+")
        rank_int: int | None = None
        if rank_raw:
            clean = rank_raw.replace("=", "").replace("+", "").split("-")[0].strip()
            try:
                rank_int = int(clean)
            except ValueError:
                pass

        results.append(
            {
                "name": name,
                "aliases": [a.strip() for a in (entry.get("aliases") or "").split(",") if a.strip()],
                "country": country,
                "hec_category": "N/A",
                "qs_rank": "unranked",
                "the_rank": rank_raw if rank_raw else "unranked",
                "the_overall_score": entry.get("scores_overall") or "",
                "the_teaching_score": entry.get("scores_teaching") or "",
                "the_research_score": entry.get("scores_research") or "",
                "the_citations_score": entry.get("scores_citations") or "",
                "tier": _rank_to_tier(rank_int) if rank_int else "world_ranked",
            }
        )
    return results


def _merge_the(existing: list[dict], the_list: list[dict]) -> list[dict]:
    """
    Merge THE data into existing university_rankings list.
    Matches by exact name (case-insensitive). Preserves QS/HEC data.
    """
    name_map: dict[str, int] = {u["name"].lower(): i for i, u in enumerate(existing)}
    merged = list(existing)

    for entry in the_list:
        key = entry["name"].lower()
        if key in name_map:
            idx = name_map[key]
            merged[idx]["the_rank"] = entry["the_rank"]
            merged[idx]["the_overall_score"] = entry.get("the_overall_score", "")
            merged[idx]["the_teaching_score"] = entry.get("the_teaching_score", "")
            merged[idx]["the_research_score"] = entry.get("the_research_score", "")
            merged[idx]["the_citations_score"] = entry.get("the_citations_score", "")
            # Only update tier if current one is generic
            if merged[idx].get("tier") in ("unknown", "world_ranked", ""):
                merged[idx]["tier"] = entry["tier"]
            # Add aliases from THE if not already there
            for alias in entry.get("aliases", []):
                if alias and alias not in merged[idx]["aliases"]:
                    merged[idx]["aliases"].append(alias)
        else:
            merged.append(entry)
            name_map[key] = len(merged) - 1

    return merged


def run() -> int:
    """Fetch THE world university rankings and merge into university_rankings.json."""
    logger.info("THE scraper: starting …")
    entries = _fetch_the_json(_CURRENT_YEAR)

    if not entries:
        logger.warning("THE scraper: no data retrieved — keeping existing data")
        update_metadata("the_rankings", 0)
        return 0

    the_list = _parse_the_entries(entries)
    if not the_list:
        logger.warning("THE scraper: parsed 0 records")
        update_metadata("the_rankings", 0)
        return 0

    existing = _load_existing_rankings()
    merged = _merge_the(existing, the_list)
    write_reference_json("university_rankings.json", merged)
    update_metadata("the_rankings", len(the_list))
    logger.info(f"THE scraper: merged {len(the_list)} university rankings")
    return len(the_list)
