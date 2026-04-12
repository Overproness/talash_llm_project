# TALASH Backend

FastAPI-based backend for the TALASH Smart HR Recruitment platform. Handles CV uploads, LLM-powered parsing, candidate storage, and settings management.

## Tech Stack

- **Python 3.11+**
- **FastAPI** — REST API framework
- **Motor / MongoDB** — async database driver
- **LangChain** — multi-provider LLM abstraction (Ollama, Gemini, OpenAI, Grok)
- **PyMuPDF / pdfplumber / pytesseract** — PDF text extraction
- **Uvicorn** — ASGI server

## Prerequisites

- Python 3.11+
- MongoDB (local or Atlas)
- At least one LLM provider:
  - **Ollama** (local, default) — install from [ollama.com](https://ollama.com) and pull a model, e.g. `ollama pull llama3.2:3b`
  - **Google Gemini**, **OpenAI**, or **Grok** — requires an API key

## Setup

```bash
# 1. Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate       # Windows
# source .venv/bin/activate  # Linux / macOS

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment variables (see below)
cp .env.example .env   # or create .env manually
```

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# MongoDB
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=talash

# LLM Provider: ollama | gemini | openai | grok
LLM_PROVIDER=ollama

# Ollama (local)
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# Google Gemini (if LLM_PROVIDER=gemini)
GOOGLE_API_KEY=
GEMINI_MODEL=gemini-1.5-flash

# OpenAI (if LLM_PROVIDER=openai)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# Grok / xAI (if LLM_PROVIDER=grok)
XAI_API_KEY=
GROK_MODEL=grok-3-mini

# Storage
CV_UPLOAD_DIR=data/cv_uploads
PROCESSED_DIR=data/processed
MAX_FILE_SIZE_MB=50
```

## Running the Server

```bash
# Development (with auto-reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check and LLM status |
| `POST` | `/api/upload` | Upload a PDF CV for parsing |
| `GET` | `/api/candidates` | List all candidates (paginated) |
| `GET` | `/api/candidates/{id}` | Get full candidate profile |
| `GET` | `/api/settings` | Get current LLM provider settings |
| `POST` | `/api/settings/provider` | Switch the active LLM provider at runtime |

### Query Parameters — `GET /api/candidates`

| Param | Default | Description |
|-------|---------|-------------|
| `skip` | `0` | Number of records to skip |
| `limit` | `50` | Max records to return (max 200) |
| `status` | — | Filter by processing status (`processing`, `done`, `error`) |

## Running Tests

```bash
pytest tests/
```

## Docker

```bash
# Build and run with Docker Compose (from the project root)
docker-compose up --build backend
```

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── api/routes/          # Route handlers (upload, candidates, health, settings)
│   ├── core/
│   │   ├── config.py        # Pydantic settings (reads .env)
│   │   └── database.py      # MongoDB connection helpers
│   ├── models/
│   │   └── candidate.py     # Pydantic models / response schemas
│   └── services/
│       ├── cv_parser.py     # PDF extraction + LLM parsing pipeline
│       ├── llm_client.py    # LangChain multi-provider LLM client
│       └── folder_watcher.py# Watchdog-based folder monitoring
├── tests/
├── requirements.txt
└── .env
```
