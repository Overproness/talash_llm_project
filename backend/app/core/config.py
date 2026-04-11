from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db: str = "talash"
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"
    cv_upload_dir: str = "data/cv_uploads"
    processed_dir: str = "data/processed"
    sample_cvs_dir: str = "data/sample_cvs"
    reference_data_dir: str = "data/reference_data"
    max_file_size_mb: int = 50
    api_prefix: str = "/api"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
