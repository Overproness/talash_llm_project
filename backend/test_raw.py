import asyncio, sys
sys.path.insert(0, '.')
from app.services.cv_parser import extract_pdf_text
from app.core.config import get_settings

CV1 = 'd:/GitHub/talash_llm_project/demo_CVs_for_testing/Handler (8)-1-4.pdf'
CV2 = 'd:/GitHub/talash_llm_project/demo_CVs_for_testing/Handler (8)-5-8.pdf'

def show_raw(path, label):
    text = extract_pdf_text(path)
    print(f"\n{'='*70}\n{label}\nTotal chars: {len(text)}\n{'='*70}")
    print(text[:4000])
    print("\n... [MIDDLE SECTION] ...")
    mid = len(text) // 2
    print(text[mid:mid+2000])

show_raw(CV1, "CV1")
show_raw(CV2, "CV2")
