"""Main FastAPI application for the scraper service."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import scrape

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