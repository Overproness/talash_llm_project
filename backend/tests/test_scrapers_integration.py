"""
Integration test: verify that the scraped reference data is usable by
research_analyzer and education_analyzer.
Run with: python tests/test_scrapers_integration.py
"""

import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def test_reference_data_files():
    """Check all expected reference data files exist and have records."""
    import app.core.config  # noqa — side-effect: sets CWD-relative paths

    base = "data/reference_data"
    files = {
        "university_rankings.json": 100,   # at least 100 entries
        "core_conferences.json": 100,
        "academic_publishers.json": 10,
    }
    for fname, min_count in files.items():
        path = os.path.join(base, fname)
        assert os.path.exists(path), f"Missing: {path}"
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        assert isinstance(data, list), f"{fname}: expected list"
        assert len(data) >= min_count, f"{fname}: only {len(data)} records (need ≥{min_count})"
        print(f"  {fname}: {len(data)} records ✓")


def test_university_lookup():
    """Confirm known universities are found with a meaningful tier."""
    from app.services.education_analyzer import lookup_institution_ranking

    cases = [
        ("University of Oxford", "world_elite"),
        ("MIT", None),               # just check it doesn't crash
        ("LUMS", None),
        ("Air University", "national_top"),
    ]
    for name, expected_tier in cases:
        result = lookup_institution_ranking(name)
        assert isinstance(result, dict)
        if expected_tier:
            assert result.get("tier") == expected_tier, (
                f"{name}: expected tier={expected_tier}, got {result.get('tier')}"
            )
        print(f"  {name}: tier={result.get('tier')}, qs={result.get('qs_rank')}, "
              f"the={result.get('the_rank')} ✓")


def test_conference_lookup():
    """Confirm CORE conference data is loaded and queryable via core_search."""
    from app.services.scrapers import core_search

    # CVPR should be A*
    best = core_search.best_match("CVPR")
    assert best is not None, "CVPR not found via core_search"
    rank = best.get("core_rank", "")
    assert rank == "A*", f"CVPR rank expected A*, got {rank}"
    print(f"  CVPR: core_rank={rank} ✓")

    # ICSE should be A*
    best2 = core_search.best_match("ICSE")
    assert best2 is not None, "ICSE not found via core_search"
    print(f"  ICSE: core_rank={best2.get('core_rank')} ✓")


def test_publisher_lookup():
    """Confirm publisher data is loaded and contains reputable publishers."""
    from app.services.research_analyzer import _load_publishers

    publishers = _load_publishers()
    assert len(publishers) > 10

    names_lower = {p.get("name", "").lower() for p in publishers}
    for expected in ("ieee", "elsevier", "springer", "acm"):
        assert expected in names_lower, f"Missing publisher: {expected}"
    print(f"  publisher list: {len(publishers)} entries ✓")


async def test_journal_quality():
    """Check journal quality fallback chain works end-to-end."""
    from app.services.research_analyzer import check_journal_quality

    # IEEE Transactions → publisher inference should return Q1
    result = await check_journal_quality("IEEE Transactions on Neural Networks", "")
    assert result.quartile in ("Q1", "Q2"), (
        f"IEEE Transactions: unexpected quartile={result.quartile}"
    )
    print(f"  IEEE Transactions: quartile={result.quartile}, source={result.data_source} ✓")

    # Unknown venue → should not crash, returns JournalQualityInfo with some source
    result2 = await check_journal_quality("Some Unknown Random Journal XYZ", "")
    assert result2 is not None
    print(f"  Unknown journal: quartile={result2.quartile}, source={result2.data_source} ✓")


if __name__ == "__main__":
    print("=== Scraper Integration Tests ===\n")

    print("1. Reference data files")
    test_reference_data_files()

    print("\n2. University lookup")
    test_university_lookup()

    print("\n3. Conference lookup")
    test_conference_lookup()

    print("\n4. Publisher lookup")
    test_publisher_lookup()

    print("\n5. Journal quality fallback chain")
    asyncio.run(test_journal_quality())

    print("\nAll tests passed ✓")
