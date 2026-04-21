import asyncio, sys
sys.path.insert(0, '.')
from app.services.cv_parser import parse_cv
from app.services.candidate_analyzer import run_full_analysis
from app.core.config import get_settings

settings = get_settings()
CV2 = 'd:/GitHub/talash_llm_project/demo_CVs_for_testing/Handler (8)-5-8.pdf'

async def test_cv(path):
    label = path.split('/')[-1]
    print(f"\n{'='*60}\n  {label}\n{'='*60}")
    parsed = await parse_cv(path, settings.processed_dir)
    print(f"Name: {parsed.personal_info.name}")
    print(f"Email: {parsed.personal_info.email}")
    print(f"Phone: {parsed.personal_info.phone}")
    print(f"Education: {len(parsed.education)}")
    print(f"Experience: {len(parsed.experience)}")
    print(f"Publications: {len(parsed.publications)}")
    print(f"Skills: {len(parsed.skills)} -> {parsed.skills[:8]}")
    print(f"Missing: {parsed.missing_fields}")
    print(f"Method: {parsed.extraction_method}")

    print("\n--- Running analysis ---")
    result = await run_full_analysis(parsed)
    print(f"overall_score: {result.overall_score}")
    print(f"summary: {result.summary[:120] if result.summary else 'N/A'}")
    if result.education_analysis:
        ea = result.education_analysis
        print(f"\nEDU score={ea.education_score} highest={ea.highest_qualification} trend={ea.performance_trend}")
    if result.experience_analysis:
        xa = result.experience_analysis
        print(f"\nEXP score={xa.experience_score} traj={xa.career_trajectory} years={xa.total_experience_years}")
    if result.missing_info:
        print(f"\nMissing items ({len(result.missing_info)}):")
        for mi in result.missing_info[:8]:
            print(f"  [{mi.severity}] {mi.field}: {mi.description}")
    if result.research_summary:
        rs = result.research_summary
        print(f"\nResearch: total={rs.total_publications} journals={rs.journal_count} conf={rs.conference_count}")
        print(f"  areas: {rs.primary_research_areas}")

asyncio.run(test_cv(CV2))
