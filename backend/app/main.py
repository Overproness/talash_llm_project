from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import get_settings
from app.core.database import connect_db, close_db
from app.api.routes import upload, candidates, health

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info(f"Connecting to MongoDB at {settings.mongodb_url}")
    await connect_db()
    logger.info("MongoDB connected")
    yield
    await close_db()
    logger.info("MongoDB disconnected")


app = FastAPI(
    title="TALASH — Smart HR Recruitment API",
    description="LLM-powered CV analysis and candidate profiling system",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = get_settings().api_prefix
app.include_router(health.router, prefix=PREFIX, tags=["health"])
app.include_router(upload.router, prefix=PREFIX, tags=["upload"])
app.include_router(candidates.router, prefix=PREFIX, tags=["candidates"])


@app.get("/")
async def root():
    return {"message": "TALASH API v0.1.0 — Upload CVs at POST /api/upload"}
