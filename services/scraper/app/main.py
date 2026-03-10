"""Main FastAPI application for the scraper service."""

import logging
import os
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.routes import scrape

# ── Logging setup ─────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("scraper")

# Send logs to Seq if configured
_seq_url = os.environ.get("SEQ_URL")
_seq_api_key = os.environ.get("SEQ_API_KEY")
if _seq_url and _seq_api_key:
    try:
        import seqlog

        seqlog.configure_from_dict(
            {
                "server_url": _seq_url,
                "api_key": _seq_api_key,
                "batch_size": 10,
                "auto_flush_timeout": 5,
                "override_root_logger": True,
                "additional_properties": {"Application": "scraper"},
            }
        )
        logger.info("Seq logging enabled → %s", _seq_url)
    except Exception as e:
        logger.warning("Failed to configure Seq logging: %s", e)

app = FastAPI(
    title="KitchenPace Scraper Service",
    description="Recipe scraping service using Scrapling CLI",
    version="2.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(scrape.router)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log every incoming request with method, path, and duration."""
    start = time.time()
    logger.info("→ %s %s", request.method, request.url.path)
    response = await call_next(request)
    duration_ms = int((time.time() - start) * 1000)
    logger.info("← %s %s %d (%dms)", request.method, request.url.path, response.status_code, duration_ms)
    return response


@app.on_event("startup")
async def startup():
    logger.info("🚀 Scraper service started (v2.0.0)")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "KitchenPace Scraper",
        "version": "2.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}