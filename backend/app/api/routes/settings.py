"""User-scoped LLM provider settings."""

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.database import get_db
from app.services.auth_service import get_current_user
from app.services.llm_client import (
    get_active_model,
    get_active_provider,
    encrypt_api_key,
    is_llm_available,
    llm_config_from_user,
    use_llm_config,
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
        "key_label": "Gemini API key",
        "models": ["gemini-2.5-flash", "gemini-2.5-pro"],
    },
    "openai": {
        "label": "OpenAI",
        "requires_key": True,
        "key_label": "OpenAI API key",
        "models": ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
    },
    "grok": {
        "label": "Grok (xAI)",
        "requires_key": True,
        "key_label": "xAI API key",
        "models": ["grok-3-mini", "grok-3", "grok-2"],
    },
}


class ProviderUpdate(BaseModel):
    provider: str
    model: str = ""
    api_key: str | None = None


def _default_model(provider: str) -> str:
    settings = get_settings()
    defaults = {
        "ollama": settings.ollama_model,
        "gemini": settings.gemini_model,
        "openai": settings.openai_model,
        "grok": settings.grok_model,
    }
    return defaults.get(provider) or PROVIDERS[provider]["models"][0]


def _configured_from_user(current_user: dict) -> dict[str, bool]:
    llm_settings = current_user.get("llm_settings") or {}
    api_keys = llm_settings.get("api_keys") or {}
    return {
        "ollama": True,
        "gemini": bool((api_keys.get("gemini") or "").strip()),
        "openai": bool((api_keys.get("openai") or "").strip()),
        "grok": bool((api_keys.get("grok") or "").strip()),
    }


@router.get("/settings/llm")
async def get_llm_settings(current_user: dict = Depends(get_current_user)):
    """Return the current user's LLM config and configured providers."""
    config = llm_config_from_user(current_user)
    configured = _configured_from_user(current_user)

    with use_llm_config(config):
        active_provider = get_active_provider()
        active_model = get_active_model()
        available = await is_llm_available()

    return {
        "active_provider": active_provider,
        "active_model":    active_model,
        "available":       available,
        "providers":       PROVIDERS,
        "configured":      configured,
    }


@router.post("/settings/llm")
async def update_llm_provider(
    body: ProviderUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Persist the current user's LLM provider, model, and optional API key."""
    if body.provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {body.provider!r}")

    llm_settings = current_user.get("llm_settings") or {}
    existing_api_keys = llm_settings.get("api_keys") or {}
    api_key = body.api_key.strip() if body.api_key is not None else None

    if PROVIDERS[body.provider]["requires_key"]:
        existing_key = (existing_api_keys.get(body.provider) or "").strip()
        if not api_key and not existing_key:
            raise HTTPException(
                status_code=422,
                detail=f"Add your {PROVIDERS[body.provider]['label']} API key before enabling this provider.",
            )

    model = body.model.strip() or _default_model(body.provider)
    update = {
        "llm_settings.provider": body.provider,
        "llm_settings.model": model,
    }
    stored_api_key = encrypt_api_key(api_key) if api_key else ""
    if api_key:
        update[f"llm_settings.api_keys.{body.provider}"] = stored_api_key

    await db.users.update_one({"email": current_user["email"]}, {"$set": update})

    next_user = {
        **current_user,
        "llm_settings": {
            **llm_settings,
            "provider": body.provider,
            "model": model,
            "api_keys": {
                **existing_api_keys,
                **({body.provider: stored_api_key} if stored_api_key else {}),
            },
        },
    }

    with use_llm_config(llm_config_from_user(next_user)):
        available = await is_llm_available()
        active_provider = get_active_provider()
        active_model = get_active_model()

    return {
        "active_provider": active_provider,
        "active_model":    active_model,
        "available":       available,
    }
