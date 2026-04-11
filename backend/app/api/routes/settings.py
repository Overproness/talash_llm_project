"""LLM provider settings — get and hot-swap the active provider at runtime."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import get_settings
from app.services.llm_client import (
    get_active_model,
    get_active_provider,
    is_llm_available,
    set_runtime_provider,
)

router = APIRouter()

# Catalogue of supported providers and their suggested models
PROVIDERS: dict[str, dict] = {
    "ollama": {
        "label": "Ollama (Local)",
        "requires_key": False,
        "models": ["llama3.2:3b", "llama3.1:8b", "mistral:7b", "mixtral:8x7b", "qwen2.5:7b"],
    },
    "gemini": {
        "label": "Google Gemini",
        "requires_key": True,
        "key_env": "GOOGLE_API_KEY",
        "models": ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"],
    },
    "openai": {
        "label": "OpenAI",
        "requires_key": True,
        "key_env": "OPENAI_API_KEY",
        "models": ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
    },
    "grok": {
        "label": "Grok (xAI)",
        "requires_key": True,
        "key_env": "XAI_API_KEY",
        "models": ["grok-3-mini", "grok-3", "grok-2"],
    },
}


class ProviderUpdate(BaseModel):
    provider: str
    model: str = ""


@router.get("/settings/llm")
async def get_llm_settings():
    """Return current LLM config and which providers are configured."""
    settings = get_settings()
    available = await is_llm_available()

    configured = {
        "ollama": True,   # always listed; availability checked at runtime
        "gemini": bool(settings.google_api_key),
        "openai": bool(settings.openai_api_key),
        "grok":   bool(settings.xai_api_key),
    }

    return {
        "active_provider": get_active_provider(),
        "active_model":    get_active_model(),
        "available":       available,
        "providers":       PROVIDERS,
        "configured":      configured,
    }


@router.post("/settings/llm")
async def update_llm_provider(body: ProviderUpdate):
    """Hot-swap the active LLM provider (takes effect immediately, no restart)."""
    if body.provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {body.provider!r}")

    settings = get_settings()
    if PROVIDERS[body.provider]["requires_key"]:
        key_map = {
            "gemini": settings.google_api_key,
            "openai": settings.openai_api_key,
            "grok":   settings.xai_api_key,
        }
        if not key_map.get(body.provider):
            raise HTTPException(
                status_code=422,
                detail=f"API key for {body.provider!r} is not configured in .env",
            )

    set_runtime_provider(body.provider, body.model)
    available = await is_llm_available()

    return {
        "active_provider": get_active_provider(),
        "active_model":    get_active_model(),
        "available":       available,
    }
