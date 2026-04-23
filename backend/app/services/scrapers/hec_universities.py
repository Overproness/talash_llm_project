"""
HEC Universities scraper.

Source: https://www.hec.gov.pk/english/universities/pages/recognised.aspx
Scrapes the HTML table listing Pakistani universities recognized by HEC,
per category W / X / Y / Z.

Output: merges Pakistan subset into data/reference_data/university_rankings.json
Schedule: quarterly
"""

import json
import logging
import os

from bs4 import BeautifulSoup

from app.core.config import get_settings
from app.services.scrapers.base import make_http_client, update_metadata, write_reference_json

logger = logging.getLogger(__name__)

HEC_URL = "https://www.hec.gov.pk/english/universities/pages/recognised.aspx"

# HEC category → tier mapping
_CATEGORY_TIER = {
    "W": "national_top",
    "X": "national_good",
    "Y": "national_average",
    "Z": "national_below_average",
}


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


def _merge_pakistan_universities(existing: list[dict], new_pak: list[dict]) -> list[dict]:
    """Replace all Pakistan entries scraped from HEC; keep non-Pakistan entries."""
    non_pak = [u for u in existing if u.get("country", "") != "Pakistan"]
    return non_pak + new_pak


def run() -> int:
    """Scrape HEC and merge Pakistan universities into university_rankings.json."""
    logger.info("HEC scraper: fetching page …")
    with make_http_client(timeout=60.0, verify=False) as client:
        response = client.get(HEC_URL)
        response.raise_for_status()

    soup = BeautifulSoup(response.text, "lxml")
    universities: list[dict] = []

    # HEC page renders one or more tables — iterate all rows to find universities
    # The category is carried in section headers (h2/h3/th spanning the row) or
    # as a repeated column.  We use a best-effort approach: scan every <tr> and
    # detect category from heading rows.

    current_category = ""
    for element in soup.find_all(["h2", "h3", "h4", "tr"]):
        tag = element.name
        text = element.get_text(separator=" ", strip=True)

        if tag in ("h2", "h3", "h4"):
            # Detect category headings like "Category W" / "W Category"
            for cat in ("W", "X", "Y", "Z"):
                if f"category {cat}".lower() in text.lower() or f"cat {cat}".lower() in text.lower():
                    current_category = cat
                    break
            continue

        # It's a <tr>
        cells = element.find_all(["td", "th"])
        if not cells:
            continue

        cell_texts = [c.get_text(strip=True) for c in cells]

        # Detect sub-headers inside the table that announce a category
        joined = " ".join(cell_texts).lower()
        for cat in ("W", "X", "Y", "Z"):
            if f"category {cat}".lower() in joined or (
                len(cell_texts) == 1 and cell_texts[0].strip().upper() == cat
            ):
                current_category = cat
                break

        # A data row typically has: serial_no, university_name, [city, sector, …]
        if len(cell_texts) < 2:
            continue

        # Skip fully-header rows
        first = cell_texts[0].strip()
        if not first or not first[0].isdigit():
            # Could still be a name-only row produced by merged cells
            if len(cell_texts) >= 2 and cell_texts[1].strip():
                name = cell_texts[1].strip()
            else:
                continue
        else:
            name = cell_texts[1].strip() if len(cell_texts) > 1 else ""

        if not name or len(name) < 5:
            continue

        # Avoid duplicates within this scrape run
        if any(u["name"] == name for u in universities):
            continue

        universities.append(
            {
                "name": name,
                "aliases": [],
                "country": "Pakistan",
                "hec_category": current_category if current_category else "N/A",
                "qs_rank": "unranked",
                "the_rank": "unranked",
                "tier": _CATEGORY_TIER.get(current_category, "national_unknown"),
            }
        )

    if not universities:
        logger.warning("HEC scraper: no universities found — page structure may have changed")
        return 0

    existing = _load_existing_rankings()
    merged = _merge_pakistan_universities(existing, universities)
    write_reference_json("university_rankings.json", merged)
    update_metadata("hec_universities", len(universities))
    logger.info(f"HEC scraper: merged {len(universities)} Pakistani universities")
    return len(universities)
