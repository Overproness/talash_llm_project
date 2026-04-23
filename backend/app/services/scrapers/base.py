"""
Scraper base utilities — shared HTTP client, atomic JSON writer, metadata helpers.
"""

import json
import logging
import os
import tempfile
from datetime import datetime, timezone
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Metadata file tracking last-run times and record counts
_METADATA_FILE = "metadata.json"


def _metadata_path() -> str:
    return os.path.join(get_settings().reference_data_dir, _METADATA_FILE)


def load_metadata() -> dict:
    path = _metadata_path()
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}
    except Exception as e:
        logger.warning(f"Could not read metadata.json: {e}")
        return {}


def _save_metadata(meta: dict) -> None:
    path = _metadata_path()
    _atomic_write_json(path, meta)


def update_metadata(scraper_name: str, record_count: int) -> None:
    meta = load_metadata()
    meta[scraper_name] = {
        "last_run": datetime.now(timezone.utc).isoformat(),
        "record_count": record_count,
        "status": "ok",
    }
    _save_metadata(meta)


def mark_scraper_error(scraper_name: str, error: str) -> None:
    meta = load_metadata()
    existing = meta.get(scraper_name, {})
    existing["last_error"] = error
    existing["last_error_time"] = datetime.now(timezone.utc).isoformat()
    existing["status"] = "error"
    meta[scraper_name] = existing
    _save_metadata(meta)


def _atomic_write_json(dest_path: str, data: Any) -> None:
    """Write JSON to a temp file then rename — prevents corrupt reads."""
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    dir_name = os.path.dirname(dest_path)
    fd, tmp_path = tempfile.mkstemp(dir=dir_name, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, dest_path)
    except Exception:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


def write_reference_json(filename: str, data: Any) -> str:
    """Atomically write data to data/reference_data/<filename>. Returns full path."""
    path = os.path.join(get_settings().reference_data_dir, filename)
    _atomic_write_json(path, data)
    logger.info(f"Wrote {len(data) if isinstance(data, list) else '?'} records → {path}")
    return path


def make_http_client(timeout: float = 30.0, verify: bool = True) -> httpx.Client:
    """Return a synchronous httpx client with a browser-like User-Agent."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    return httpx.Client(headers=headers, timeout=timeout, follow_redirects=True, verify=verify)
