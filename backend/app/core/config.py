import os

from pydantic_settings import BaseSettings
from pydantic import ConfigDict, model_validator
from functools import lru_cache


def _vercel_path(relative: str) -> str:
    """Return /tmp/<relative> when running on Vercel, otherwise <relative>."""
    if os.environ.get("VERCEL"):
        return f"/tmp/{relative}"
    return relative


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="ignore")

    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db: str = "talash"

    # ── LLM Provider ─────────────────────────────────────────────────────────
    # Supported values: ollama | gemini | openai | grok
    llm_provider: str = "ollama"

    # Ollama (local)
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"

    # Google Gemini
    google_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # Grok / xAI  (OpenAI-compatible endpoint)
    xai_api_key: str = ""
    grok_model: str = "grok-3-mini"

    # ── Storage ───────────────────────────────────────────────────────────────
    cv_upload_dir: str = "data/cv_uploads"
    processed_dir: str = "data/processed"
    sample_cvs_dir: str = "data/sample_cvs"
    reference_data_dir: str = "data/reference_data"
    max_file_size_mb: int = 50
    api_prefix: str = "/api"

    @model_validator(mode="after")
    def _apply_vercel_paths(self) -> "Settings":
        """On Vercel only /tmp is writable — redirect all storage dirs there."""
        import os
        if os.environ.get("VERCEL"):
            if self.cv_upload_dir == "data/cv_uploads":
                self.cv_upload_dir = "/tmp/cv_uploads"
            if self.processed_dir == "data/processed":
                self.processed_dir = "/tmp/processed"
            if self.reference_data_dir == "data/reference_data":
                self.reference_data_dir = "/tmp/reference_data"
        return self

    # ── External APIs ─────────────────────────────────────────────────────────
    # Elsevier / Scopus API key (note: env var uses typo "elseivier_api_key")
    elseivier_api_key: str = ""


@lru_cache()
def get_settings() -> Settings:
    return Settings()
