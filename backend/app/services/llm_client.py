"""
LLM Client — LangChain multi-provider CV extraction.

Supported providers:
  ollama  — local Ollama server (llama3.2:3b, mistral, etc.)
  gemini  — Google Gemini API
  openai  — OpenAI API
  grok    — xAI Grok (OpenAI-compatible endpoint)

Provider and model can be switched at runtime via set_runtime_provider()
without restarting the server.  Falls back to rule-based extraction
when the active provider is unavailable.
"""

import json
import logging
from dataclasses import dataclass

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# ── Runtime provider state ────────────────────────────────────────────────────

@dataclass
class _RuntimeConfig:
    provider: str = ""   # empty → use settings default
    model: str = ""      # empty → use provider default model

_runtime = _RuntimeConfig()


def get_active_provider() -> str:
    """Return the currently active LLM provider name."""
    return _runtime.provider or get_settings().llm_provider


def get_active_model() -> str:
    """Return the currently active model name for the active provider."""
    if _runtime.model:
        return _runtime.model
    settings = get_settings()
    defaults = {
        "ollama": settings.ollama_model,
        "gemini": settings.gemini_model,
        "openai": settings.openai_model,
        "grok":   settings.grok_model,
    }
    return defaults.get(get_active_provider(), "")


def get_active_model_large() -> str:
    """Return the large-CV model name for the active provider.

    If the user has manually overridden the model at runtime, that override
    is respected.  Otherwise the provider-specific large model from settings
    is returned.
    """
    if _runtime.model:
        return _runtime.model
    settings = get_settings()
    defaults = {
        "ollama": settings.ollama_model_large,
        "gemini": settings.gemini_model_large,
        "openai": settings.openai_model_large,
        "grok":   settings.grok_model_large,
    }
    return defaults.get(get_active_provider(), get_active_model())


def set_runtime_provider(provider: str, model: str = "") -> None:
    """Switch provider (and optionally model) at runtime, no restart needed."""
    _runtime.provider = provider
    _runtime.model = model
    logger.info("LLM provider switched → %s / %s", provider, model or "(default)")


# ── LLM factory ──────────────────────────────────────────────────────────────

def _build_llm(provider: str, model: str) -> BaseChatModel:
    """Internal factory: build a LangChain chat model for *provider* using *model*."""
    settings = get_settings()

    if provider == "ollama":
        from langchain_ollama import ChatOllama
        return ChatOllama(
            base_url=settings.ollama_host,
            model=model,
            format="json",
            temperature=0.1,
            num_predict=8192,
        )

    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=settings.google_api_key,
            temperature=0.1,
        )

    if provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model,
            api_key=settings.openai_api_key,
            temperature=0.1,
        )

    if provider == "grok":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model,
            api_key=settings.xai_api_key,
            base_url="https://api.x.ai/v1",
            temperature=0.1,
        )

    raise ValueError(f"Unknown LLM provider: {provider!r}")


def get_llm() -> BaseChatModel:
    """Return a LangChain chat model using the current (standard) model."""
    return _build_llm(get_active_provider(), get_active_model())


def get_llm_large() -> BaseChatModel:
    """Return a LangChain chat model using the large-CV model for the active provider."""
    return _build_llm(get_active_provider(), get_active_model_large())


# ── Availability check ────────────────────────────────────────────────────────

async def is_llm_available() -> bool:
    """Check whether the active provider is reachable / properly configured."""
    settings = get_settings()
    provider = get_active_provider()

    if provider == "ollama":
        import httpx
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{settings.ollama_host}/api/tags")
                return resp.status_code == 200
        except Exception:
            return False

    if provider == "gemini":
        return bool(settings.google_api_key)

    if provider == "openai":
        return bool(settings.openai_api_key)

    if provider == "grok":
        return bool(settings.xai_api_key)

    return False


# Backward-compat alias (health.py + cv_parser.py import this name)
async def is_ollama_available() -> bool:
    return await is_llm_available()


# ── Extraction prompt ─────────────────────────────────────────────────────────

_SYSTEM = (
    "You are an expert CV/resume parser specializing in academic and professional CVs. "
    "You are given raw text extracted from a PDF — it may include table cell content "
    "merged on single lines or listed consecutively. Extract ALL structured information "
    "accurately and return ONLY a valid JSON object matching the schema. "
    "Use empty strings or empty arrays for missing fields. Never invent data."
)

_EXTRACTION_PROMPT = """Extract structured CV data from the following text and return a valid JSON object.

IMPORTANT PARSING RULES:
- The text is from a structured/table-based academic CV. Row data from tables is often concatenated.
- For Education: extract each degree separately with its specialization, grade/GPA/%, passing year, and university/board.
- For Experience: extract each job role with organization, location, and date range (e.g. "Jan-2012 - Aug-2015").
- For Publications: extract each paper/article separately with its title, authors, publication venue, impact factor, volume, pages, and year.
- For the candidate's name: look for the full name at the top of the document (e.g. "MUHAMMAD SALMAN QAMAR").
- marks_or_cgpa: capture the raw value exactly as written (e.g. "3.33", "69.84", "65.45%").
- employment_type for academic roles (Lecturer, Professor, etc.) should be "Teaching".
- pub_type: use "journal" for journal papers, "conference" for conference papers.
- present_employment: copy the literal text from the "Present Employment:" field in the CV header (e.g. "Unemployed", "Associate Professor at XYZ University since 01/01/2025"). Leave empty if not present.
- For skills: If there is an explicit "Skills" or "Technical Skills" section, extract those items. If no such section exists, INFER technical skills from: (1) education specialization fields (e.g. "Wireless Communication, Convex Optimization" → ["Wireless Communication", "Convex Optimization"]), (2) publication titles and topics (e.g. papers about "NOMA", "5G", "Machine Learning" → add those as skills), (3) job responsibilities. Always populate the skills array — never leave it empty if any technical content exists in the CV.

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
    "website": "",
    "present_employment": ""
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


# ── Main extraction function ──────────────────────────────────────────────────

# Standard CVs: up to 12 000 chars fed to the standard model.
# Large CVs (> large_cv_threshold_chars): up to 40 000 chars fed to the large
# model.  Cloud providers (Gemini, OpenAI, Grok) have context windows easily
# large enough; Ollama large models (8b+) handle the increased load too.
_STANDARD_CHAR_LIMIT = 12_000
_LARGE_CHAR_LIMIT = 40_000


async def extract_with_llm(cv_text: str) -> dict:
    """
    Extract structured CV data using the active LangChain provider.

    Routing:
      - len(cv_text) <= large_cv_threshold_chars → standard model, 12 000-char window
      - len(cv_text) >  large_cv_threshold_chars → large model,   40 000-char window
    Raises on JSON parse failure or network error.
    """
    settings = get_settings()
    provider = get_active_provider()
    is_large = len(cv_text) > settings.large_cv_threshold_chars

    if is_large:
        llm = get_llm_large()
        active_model = get_active_model_large()
        char_limit = _LARGE_CHAR_LIMIT
    else:
        llm = get_llm()
        active_model = get_active_model()
        char_limit = _STANDARD_CHAR_LIMIT

    logger.info(
        "Extracting CV with provider=%s model=%s (cv_len=%d, large=%s)",
        provider, active_model, len(cv_text), is_large,
    )

    messages = [
        SystemMessage(content=_SYSTEM),
        HumanMessage(content=_EXTRACTION_PROMPT.format(cv_text=cv_text[:char_limit])),
    ]

    response = await llm.ainvoke(messages)
    raw: str = response.content

    # Strip markdown code fences some models add
    if "```json" in raw:
        raw = raw.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in raw:
        raw = raw.split("```", 1)[1].split("```", 1)[0].strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("Provider %s returned invalid JSON: %s", provider, exc)
        raise


async def extract_with_llm_custom(system_prompt: str, user_prompt: str) -> dict:
    """
    Generic LLM call with custom system/user prompts. Returns parsed JSON.
    Used by analysis modules (education, experience, email, summary).
    """
    provider = get_active_provider()
    llm = get_llm()

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt[:12000]),
    ]

    logger.info("Custom LLM call: provider=%s model=%s", provider, get_active_model())
    response = await llm.ainvoke(messages)
    raw: str = response.content

    if "```json" in raw:
        raw = raw.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in raw:
        raw = raw.split("```", 1)[1].split("```", 1)[0].strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("Custom LLM call returned invalid JSON: %s", exc)
        raise


async def generate_with_llm_text(system_prompt: str, user_prompt: str) -> str:
    """
    Generic LLM call that returns plain text (not JSON).
    Used for email drafting and summary generation.
    """
    provider = get_active_provider()
    llm = get_llm()

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt[:12000]),
    ]

    logger.info("Text LLM call: provider=%s model=%s", provider, get_active_model())
    response = await llm.ainvoke(messages)
    return response.content.strip()

