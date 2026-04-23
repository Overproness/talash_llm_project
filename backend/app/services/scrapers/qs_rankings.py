"""
QS World University Rankings scraper.

Primary source: public Kaggle / HDX CSV mirror of QS rankings.
Fallback: keep existing data and log a warning (never wipe working data on error).

Output: merges global rankings into data/reference_data/university_rankings.json
Schedule: quarterly
"""

import csv
import io
import json
import logging
import os

from app.core.config import get_settings
from app.services.scrapers.base import make_http_client, update_metadata, write_reference_json

logger = logging.getLogger(__name__)

# Public CSV sources — tried in order until one succeeds
_QS_SOURCES = [
    # HDX / Humanitarian Data Exchange — open-access QS mirror
    "https://data.humdata.org/dataset/qs-world-university-rankings/resource/3d0b2ae8-b65e-4ab2-9c60-0db07e2aafd8/download/qs-world-university-rankings-2025.csv",
    # Kaggle public dataset (no auth required for direct CSV links on some mirrors)
    "https://raw.githubusercontent.com/quankiquanki/skytrax-reviews-dataset/master/data/qs_rankings.csv",
]

_TIER_MAP = {
    range(1, 51): "world_elite",
    range(51, 201): "world_top",
    range(201, 501): "world_good",
    range(501, 1001): "world_ranked",
}


def _rank_to_tier(rank_val: int) -> str:
    for r, tier in _TIER_MAP.items():
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


def _fetch_qs_csv() -> str | None:
    """Try each source URL and return the CSV text of the first that works."""
    with make_http_client(timeout=60.0) as client:
        for url in _QS_SOURCES:
            try:
                resp = client.get(url)
                if resp.status_code == 200 and len(resp.content) > 1000:
                    return resp.text
            except Exception as e:
                logger.debug(f"QS source {url} failed: {e}")
    return None


def _parse_qs_csv(text: str) -> list[dict]:
    """Parse a QS CSV and return list of university dicts."""
    # Detect delimiter
    sample = text[:2000]
    delimiter = "," if sample.count(",") > sample.count(";") else ";"

    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    results: list[dict] = []

    for row in reader:
        # Normalise keys — different mirrors use different column names
        name = (
            row.get("Institution Name")
            or row.get("University")
            or row.get("institution")
            or row.get("name", "")
        ).strip()

        rank_raw = (
            row.get("2025 QS World University Rankings")
            or row.get("Rank")
            or row.get("rank")
            or row.get("2024 Rank", "")
        ).strip()

        country = (
            row.get("Location")
            or row.get("Country")
            or row.get("country", "")
        ).strip()

        if not name:
            continue

        # Parse rank — handle ranges like "501-510"
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
                "aliases": [],
                "country": country,
                "hec_category": "N/A",
                "qs_rank": str(rank_int) if rank_int else rank_raw,
                "the_rank": "unranked",
                "tier": _rank_to_tier(rank_int) if rank_int else "world_ranked",
            }
        )

    return results


def _merge_qs(existing: list[dict], qs_list: list[dict]) -> list[dict]:
    """
    For each QS entry: if a matching entry already exists (by name fuzzy), update
    qs_rank and tier; otherwise append. Pakistan entries retain hec_category.
    """
    # Build a fast lookup by lowercase name
    name_map: dict[str, int] = {u["name"].lower(): i for i, u in enumerate(existing)}
    merged = list(existing)

    for qs in qs_list:
        key = qs["name"].lower()
        if key in name_map:
            idx = name_map[key]
            # Update QS rank but preserve other fields
            merged[idx]["qs_rank"] = qs["qs_rank"]
            merged[idx]["tier"] = qs["tier"] if merged[idx].get("tier") in ("unknown", "world_ranked", "") else merged[idx]["tier"]
        else:
            merged.append(qs)

    return merged


def run() -> int:
    """Fetch QS rankings and merge into university_rankings.json."""
    logger.info("QS scraper: fetching rankings CSV …")
    csv_text = _fetch_qs_csv()

    if not csv_text:
        logger.warning("QS scraper: all sources failed — keeping existing data")
        update_metadata("qs_rankings", 0)
        return 0

    qs_list = _parse_qs_csv(csv_text)
    if not qs_list:
        logger.warning("QS scraper: CSV parsed 0 records — keeping existing data")
        update_metadata("qs_rankings", 0)
        return 0

    existing = _load_existing_rankings()
    merged = _merge_qs(existing, qs_list)
    write_reference_json("university_rankings.json", merged)
    update_metadata("qs_rankings", len(qs_list))
    logger.info(f"QS scraper: merged {len(qs_list)} university rankings")
    return len(qs_list)
