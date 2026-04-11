from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from functools import lru_cache


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
    gemini_model: str = "gemini-1.5-flash"

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


@lru_cache()
def get_settings() -> Settings:
    return Settings()
