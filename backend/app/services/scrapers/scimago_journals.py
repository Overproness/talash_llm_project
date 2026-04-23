"""
Scimago Journals scraper.

Source: https://www.scimagojr.com/journalrank.php?out=xls
Downloads the free annual CSV (~30k journals, semicolon-delimited).
Output: data/reference_data/journal_quality.json
Schedule: monthly
"""

import csv
import io
import logging

from app.services.scrapers.base import make_http_client, update_metadata, write_reference_json

logger = logging.getLogger(__name__)

SCIMAGO_URL = "https://www.scimagojr.com/journalrank.php?out=xls"


def run() -> int:
    """Fetch Scimago CSV and write journal_quality.json. Returns record count."""
    logger.info("Scimago scraper: downloading CSV …")
    with make_http_client(timeout=120.0) as client:
        response = client.get(SCIMAGO_URL)
        response.raise_for_status()

    content = response.content.decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(content), delimiter=";")

    # Deduplicate by ISSN — keep the row with best (lowest numeric) quartile
    _quartile_rank = {"Q1": 1, "Q2": 2, "Q3": 3, "Q4": 4}
    seen: dict[str, dict] = {}  # issn → best record

    for row in reader:
        raw_issn = row.get("Issn", "").strip().replace(" ", "")
        # Scimago uses comma-separated dual ISSN in one field
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
            "quartile": quartile if quartile in _quartile_rank else "unranked",
            "sjr": float(sjr) if sjr else None,
            "subject_area": subject,
        }

        key = primary_issn or title.lower()
        existing = seen.get(key)
        if existing is None:
            seen[key] = record
        else:
            # Keep best quartile
            existing_rank = _quartile_rank.get(existing["quartile"], 99)
            new_rank = _quartile_rank.get(record["quartile"], 99)
            if new_rank < existing_rank:
                seen[key] = record

    journals = list(seen.values())
    write_reference_json("journal_quality.json", journals)
    update_metadata("scimago_journals", len(journals))
    logger.info(f"Scimago scraper: wrote {len(journals)} journals")
    return len(journals)
