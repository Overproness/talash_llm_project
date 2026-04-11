"""
LLM Client — wraps Ollama for structured CV extraction.
Falls back to rule-based extraction if Ollama is unavailable.
"""

import json
import logging
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """You are an expert CV/resume parser. Extract structured information from the following CV text and return a valid JSON object.

CV TEXT:
{cv_text}

Return ONLY a valid JSON object with this exact structure (use empty strings/arrays for missing fields):
{{
  "personal_info": {{
    "name": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "website": ""
  }},
  "education": [
    {{
      "level": "SSE|HSSC|UG|PG|PhD|Other",
      "degree": "",
      "specialization": "",
      "institution": "",
      "start_year": null,
      "end_year": null,
      "marks_or_cgpa": "",
      "board_or_affiliation": ""
    }}
  ],
  "experience": [
    {{
      "title": "",
      "organization": "",
      "employment_type": "Full-time|Part-time|Contract|Research|Teaching",
      "start_date": "",
      "end_date": "",
      "description": ""
    }}
  ],
  "publications": [
    {{
      "pub_type": "journal|conference|book_chapter",
      "title": "",
      "authors": [],
      "venue": "",
      "year": null,
      "doi": "",
      "issn": ""
    }}
  ],
  "skills": [],
  "books": [
    {{
      "title": "",
      "authors": [],
      "publisher": "",
      "year": null,
      "isbn": "",
      "url": ""
    }}
  ],
  "patents": [
    {{
      "title": "",
      "patent_number": "",
      "inventors": [],
      "country": "",
      "date": "",
      "url": ""
    }}
  ],
  "supervision": [
    {{
      "student_name": "",
      "degree": "MS|PhD",
      "role": "main|co",
      "year": null,
      "thesis_title": ""
    }}
  ]
}}"""


async def is_ollama_available() -> bool:
    """Check if Ollama is running and accessible."""
    settings = get_settings()
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{settings.ollama_host}/api/tags")
            return resp.status_code == 200
    except Exception:
        return False


async def extract_with_llm(cv_text: str) -> dict:
    """
    Extract structured data from CV text using Ollama.
    Returns parsed dict or raises on failure.
    """
    settings = get_settings()
    prompt = EXTRACTION_PROMPT.format(cv_text=cv_text[:8000])  # Trim to avoid context overflow

    payload = {
        "model": settings.ollama_model,
        "prompt": prompt,
        "format": "json",
        "stream": False,
        "options": {"temperature": 0.1, "num_predict": 4096},
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{settings.ollama_host}/api/generate",
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        raw_response = data.get("response", "{}")
        return json.loads(raw_response)
