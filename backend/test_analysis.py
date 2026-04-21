import asyncio, sys
sys.path.insert(0, '.')
from app.services.cv_parser import parse_cv
from app.services.candidate_analyzer import run_full_analysis
from app.core.config import get_settings

CV1 = 'd:/GitHub/talash_llm_project/demo_CVs_for_testing/Handler (8)-1-4.pdf'
CV2 = 'd:/GitHub/talash_llm_project/demo_CVs_for_testing/Handler (8)-5-8.pdf'

async def test_cv(path, label):
    settings = get_settings()
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"{'='*60}")
    parsed = await parse_cv(path, settings.processed_dir)
    print(f"Name: {parsed.personal_info.name}")
    print(f"Email: {parsed.personal_info.email}")
    print(f"Phone: {parsed.personal_info.phone}")
    print(f"Location: {parsed.personal_info.location}")
    print(f"Education: {len(parsed.education)}")
    print(f"Experience: {len(parsed.experience)}")
    print(f"Publications: {len(parsed.publications)}")
    print(f"Skills: {len(parsed.skills)} -> {parsed.skills[:8]}")
    print(f"Missing: {parsed.missing_fields}")
    print(f"Method: {parsed.extraction_method}")

    print("\n--- Running analysis ---")
    try:
        result = await run_full_analysis(parsed)
        print(f"overall_score: {result.get('overall_score')}")
        print(f"summary: {str(result.get('summary',''))[:150]}")

        edu = result.get('education_analysis') or {}
        print(f"\nEDU score={edu.get('education_score')} highest={edu.get('highest_qualification')} trend={edu.get('performance_trend')}")
        for g in edu.get('education_gaps', []):
            print(f"  gap: {g.get('from_level')} -> {g.get('to_level')} years={g.get('gap_years')} justified={g.get('justified')}")

        exp = result.get('experience_analysis') or {}
        print(f"\nEXP score={exp.get('experience_score')} traj={exp.get('career_trajectory')} years={exp.get('total_experience_years')}")
        for g in exp.get('experience_gaps', []):
            print(f"  exp_gap: {g.get('from_date')} -> {g.get('to_date')} months={g.get('gap_months')}")
        for o in exp.get('timeline_overlaps', []):
            print(f"  overlap: {o.get('type')} {o.get('item_a')} / {o.get('item_b')}")

        missing = result.get('missing_info_detailed') or []
        print(f"\nMissing items ({len(missing)}):")
        for m in missing:
            sev = m.get('severity','?')
            field = m.get('field','?')
            desc = m.get('description','?')
            print(f"  [{sev}] {field}: {desc}")

        rs = result.get('research_summary') or {}
        print(f"\nResearch: total={rs.get('total_publications')} journals={rs.get('journal_count')} conf={rs.get('conference_count')}")
        print(f"  areas: {rs.get('primary_research_areas')}")
        print(f"  assessment: {str(rs.get('overall_assessment',''))[:100]}")

    except Exception as e:
        import traceback
        print(f"ANALYSIS ERROR: {e}")
        traceback.print_exc()

async def main():
    await test_cv(CV1, "CV1: Handler (8)-1-4.pdf")
    await test_cv(CV2, "CV2: Handler (8)-5-8.pdf")

asyncio.run(main())
