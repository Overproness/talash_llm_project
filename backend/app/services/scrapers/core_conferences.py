"""
CORE Conference Rankings scraper.

Source: https://portal.core.edu.au/conf-ranks/?search=&by=all&source=CORE2023&sort=arank&page=1&do=Export
Downloads a headerless CSV. Columns (by position):
  0: ID, 1: Title, 2: Acronym, 3: Source, 4: Rank, 5: Note,
  6: DBLP, 7: Primary FOR, 8: Comments, 9: Average Rating

Output: data/reference_data/core_conferences.json  (replaces static stub)
Schedule: monthly
"""

import csv
import io
import logging

from app.services.scrapers.base import make_http_client, update_metadata, write_reference_json

logger = logging.getLogger(__name__)

CORE_URL = (
    "https://portal.core.edu.au/conf-ranks/"
    "?search=&by=all&source=CORE2023&sort=arank&page=1&do=Export"
)

_VALID_RANKS = {"A*", "A", "B", "C"}


def run() -> int:
    """Fetch CORE CSV and write core_conferences.json. Returns record count."""
    logger.info("CORE scraper: downloading CSV …")
    with make_http_client(timeout=60.0) as client:
        response = client.get(CORE_URL)
        response.raise_for_status()

    content = response.content.decode("utf-8", errors="replace")
    reader = csv.reader(io.StringIO(content))

    conferences: list[dict] = []
    for cols in reader:
        # Skip blank lines
        if not cols or all(c.strip() == "" for c in cols):
            continue

        # Normalise — pad to at least 10 columns
        while len(cols) < 10:
            cols.append("")

        title = cols[1].strip()
        acronym = cols[2].strip()
        rank = cols[4].strip().upper()
        field = cols[7].strip()

        if not title:
            continue

        record = {
            "name": title,
            "acronym": acronym,
            "aliases": [acronym] if acronym else [],
            "core_rank": rank if rank in _VALID_RANKS else "Unranked",
            "field": field.lower().replace(" ", "_") if field else "general",
            "proceedings_publisher": "",
        }
        conferences.append(record)

    write_reference_json("core_conferences.json", conferences)
    update_metadata("core_conferences", len(conferences))
    logger.info(f"CORE scraper: wrote {len(conferences)} conferences")
    return len(conferences)
