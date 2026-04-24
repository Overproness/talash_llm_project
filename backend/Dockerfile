FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for PyMuPDF + tesseract
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libffi-dev \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers (Chromium only — used by QS and Scimago scrapers)
RUN playwright install chromium --with-deps

COPY . .

# Create data directory structure so the app works even without a mounted volume.
# If a volume IS mounted (docker-compose), these dirs get replaced by the mount.
RUN mkdir -p data/cv_uploads \
             data/processed \
             data/reference_data/cache \
             data/sample_cvs

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
