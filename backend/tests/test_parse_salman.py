"""
Quick test: parse Muhammad Salman Qamar's CV using Gemini LLM.
Run from backend/ dir:  python -m tests.test_parse_salman
"""
import asyncio, os, sys
sys.path.insert(0, ".")
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Force model override if needed
import os as _os
_os.environ.setdefault("GEMINI_MODEL", "gemini-1.5-flash")

from app.core.config import get_settings
get_settings.cache_clear()


async def main():
    from app.services.cv_parser import extract_pdf_text
    from app.services.llm_client import (
        extract_with_llm, is_llm_available, get_active_provider, get_active_model
    )

    provider = get_active_provider()
    model = get_active_model()
    available = await is_llm_available()
    print(f"Provider: {provider}  Model: {model}  Available: {available}\n")

    pdf = "data/cv_uploads/Handler (8)-1-4.pdf"
    text = extract_pdf_text(pdf)
    print(f"Extracted {len(text)} chars from PDF\n")

    result = await extract_with_llm(text)

    pi = result.get("personal_info", {})
    print("=== PERSONAL INFO ===")
    for k, v in pi.items():
        print(f"  {k}: {v}")

    print("\n=== EDUCATION ===")
    for e in result.get("education", []):
        print(f"  [{e.get('level')}] {e.get('degree')} | spec={e.get('specialization')} | "
              f"score={e.get('marks_or_cgpa')} | year={e.get('end_year')} | {e.get('institution')}")

    print("\n=== EXPERIENCE ===")
    for x in result.get("experience", []):
        print(f"  {x.get('title')} @ {x.get('organization')} | "
              f"{x.get('start_date')} - {x.get('end_date')} | type={x.get('employment_type')}")

    print("\n=== PUBLICATIONS ===")
    for p in result.get("publications", []):
        title = str(p.get("title", ""))[:70]
        print(f"  [{p.get('pub_type')}] {title} | year={p.get('year')} | venue={p.get('venue')}")

    print("\n=== SKILLS ===", result.get("skills", []))


if __name__ == "__main__":
    asyncio.run(main())
