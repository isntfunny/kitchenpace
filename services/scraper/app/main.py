"""KitchenPace Scraper — FastAPI service with jsonld / scrapling / yt-dlp+whisper."""

import json
import logging
import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional

from app.sites import get_mode, get_site_name, get_strategy
from app.strategies import dispatch
from app.strategies.ytdlp import scrape_steps as ytdlp_steps

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-8s %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("scraper")

app = FastAPI(title="KitchenPace Scraper", version="2.4.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


class ScrapeRequest(BaseModel):
    url: HttpUrl
    mode: str = "stealthy-fetch"
    timeout: int = Field(default=30, ge=5, le=120)
    wait_for_network_idle: bool = False
    solve_cloudflare: bool = False
    css_selector: Optional[str] = None


class ScrapeResponse(BaseModel):
    success: bool
    markdown: str
    title: Optional[str] = None
    image_url: Optional[str] = None
    source_url: str
    extraction_time_ms: int


def _title(md: str) -> Optional[str]:
    for line in md.split("\n"):
        if line.startswith("# "):
            return line[2:].strip()
    return None


def _opts(req: ScrapeRequest) -> dict:
    return dict(mode=req.mode, timeout=req.timeout,
                wait_for_network_idle=req.wait_for_network_idle,
                solve_cloudflare=req.solve_cloudflare)


@app.get("/health")
async def health():
    return {"status": "ok", "version": app.version}


@app.post("/api/scrape", response_model=ScrapeResponse)
async def scrape(req: ScrapeRequest):
    url = str(req.url)
    log.info("SCRAPE %s", url)
    t0 = time.time()

    try:
        content, image_url = await dispatch(url, req.css_selector, **_opts(req))

        if not content.strip():
            raise RuntimeError("No content extracted")

        ms = int((time.time() - t0) * 1000)
        log.info("SCRAPE OK %s %d chars %dms image=%s", url, len(content), ms, bool(image_url))
        return ScrapeResponse(success=True, markdown=content, title=_title(content),
                              image_url=image_url, source_url=url, extraction_time_ms=ms)
    except HTTPException:
        raise
    except Exception as e:
        log.error("SCRAPE ERROR %s: %s", url, e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/scrape/stream")
async def scrape_stream(req: ScrapeRequest):
    def sse(event: str, data: dict) -> str:
        return f"event: {event}\ndata: {json.dumps(data)}\n\n"

    async def stream():
        url = str(req.url)
        strategy = get_strategy(url) if not req.css_selector else "scrapling"
        t0 = time.time()

        try:
            site = get_site_name(url)
            yield sse("status", {"message": "Starting scrape", "url": url, "strategy": strategy})
            yield sse("progress", {"step": "detect", "message": f"Site: {site or 'unknown'} ({strategy})"})

            if strategy == "ytdlp":
                content, image_url = "", None
                async for step, msg, is_final, md, img in ytdlp_steps(url, mode=get_mode(url)):
                    yield sse("progress", {"step": step, "message": msg})
                    if is_final:
                        content, image_url = md or "", img
            else:
                yield sse("progress", {"step": "fetch", "message": "Trying JSON-LD, then scrapling..."})
                content, image_url = await dispatch(url, req.css_selector, **_opts(req))

            if not content.strip():
                yield sse("error", {"success": False, "error": "No content extracted", "url": url})
                return

            ms = int((time.time() - t0) * 1000)
            yield sse("progress", {"step": "hit", "message": f"{len(content)} chars"})
            yield sse("complete", {"success": True, "markdown": content, "title": _title(content),
                                   "image_url": image_url, "source_url": url, "extraction_time_ms": ms})
        except Exception as e:
            yield sse("error", {"success": False, "error": str(e), "url": url})

    return StreamingResponse(stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "Connection": "keep-alive"})
