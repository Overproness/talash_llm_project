from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import get_settings

_client: AsyncIOMotorClient | None = None


async def connect_db() -> None:
    global _client
    settings = get_settings()
    _client = AsyncIOMotorClient(settings.mongodb_url)


async def close_db() -> None:
    global _client
    if _client:
        _client.close()
        _client = None


def get_db() -> AsyncIOMotorDatabase:
    settings = get_settings()
    if _client is None:
        raise RuntimeError("Database not connected. Call connect_db() first.")
    return _client[settings.mongodb_db]
