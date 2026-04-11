import sys
sys.path.insert(0, 'd:/OneDrive - National University of Sciences & Technology/Study/Semester 6/LLM/Project/talash_llm_project/backend')
from app.services.cv_parser import extract_pdf_text, rule_based_extract

pdf = 'd:/OneDrive - National University of Sciences & Technology/Study/Semester 6/LLM/Project/talash_llm_project/data/sample_cvs/Handler (8).pdf'
text = extract_pdf_text(pdf)
print(f"Extracted {len(text)} characters")
print("--- FIRST 500 CHARS ---")
print(text[:500])
print()
result = rule_based_extract(text)
pi = result["personal_info"]
print("=== EXTRACTED STRUCTURED DATA ===")
print(f"Name: {pi['name']}")
print(f"Email: {pi['email']}")
print(f"Phone: {pi['phone']}")
print(f"LinkedIn: {pi['linkedin']}")
print(f"Education records: {len(result['education'])}")
for edu in result['education'][:3]:
    print(f"  - [{edu['level']}] {edu['degree']} at {edu['institution']} | {edu['marks_or_cgpa']}")
print(f"Experience records: {len(result['experience'])}")
for exp in result['experience'][:3]:
    print(f"  - {exp['title']} at {exp['organization']}")
print(f"Publications: {len(result['publications'])}")
for pub in result['publications'][:3]:
    print(f"  - [{pub['pub_type']}] {pub['title'][:80]}")
print(f"Skills ({len(result['skills'])}): {result['skills'][:8]}")
