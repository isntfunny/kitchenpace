"""Scrape API endpoints using Scrapling CLI."""

import asyncio
import json
import logging
import os
import tempfile
import time
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, HttpUrl

logger = logging.getLogger("scraper")

router = APIRouter(prefix="/api", tags=["scrape"])

# CSS selectors to try for extracting recipe content (in order of specificity).
# The first one that produces enough content wins.
RECIPE_SELECTORS = [
    '[itemtype*="Recipe"]',
    "article",
    "main",
    '[role="main"]',
]

# Minimum character threshold — if a selector extraction is shorter than this,
# we assume it missed the content and fall back to the full page.
MIN_CONTENT_LENGTH = 200


class ScrapeRequest(BaseModel):
    """Request model for scraping."""

    url: HttpUrl = Field(..., description="URL to scrape")
    mode: str = Field(
        default="stealthy-fetch",
        description="get (HTTP), fetch (Playwright), or stealthy-fetch (Camoufox)",
    )
    timeout: int = Field(default=30, ge=5, le=120, description="Timeout in seconds")
    wait_for_network_idle: bool = Field(
        default=False, description="Wait for network to be idle"
    )
    solve_cloudflare: bool = Field(
        default=False, description="Solve Cloudflare challenges (stealthy mode)"
    )
    css_selector: Optional[str] = Field(
        default=None,
        description="CSS selector to extract specific content. "
        "If omitted, auto-detects recipe content via main/article/schema.org.",
    )


class ScrapeResponse(BaseModel):
    """Response model for scrape endpoint."""

    success: bool
    markdown: str
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    source_url: str
    extraction_time_ms: int


def _build_base_cmd(mode: str, url: str, output_file: str, timeout: int,
                     wait_for_network_idle: bool, solve_cloudflare: bool,
                     css_selector: Optional[str] = None) -> list[str]:
    """Build the scrapling CLI command list."""
    if mode == "get":
        cmd = [
            "scrapling", "extract", "get",
            url, output_file,
            "--timeout", str(timeout),
        ]
    elif mode == "fetch":
        cmd = [
            "scrapling", "extract", "fetch",
            url, output_file,
            "--timeout", str(timeout * 1000),
        ]
        if wait_for_network_idle:
            cmd.append("--network-idle")
    else:  # stealthy-fetch
        cmd = [
            "scrapling", "extract", "stealthy-fetch",
            url, output_file,
            "--timeout", str(timeout * 1000),
        ]
        if wait_for_network_idle:
            cmd.append("--network-idle")
        if solve_cloudflare:
            cmd.append("--solve-cloudflare")

    if css_selector:
        cmd.extend(["-s", css_selector])

    return cmd


async def _run_scrape(cmd: list[str]) -> str:
    """Execute a scrapling CLI command and return the output file content."""
    output_file = cmd[4]  # positional arg after url

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _stdout, stderr = await process.communicate()

    if process.returncode != 0:
        raise Exception(f"Scrapling CLI failed: {stderr.decode()}")

    with open(output_file, "r", encoding="utf-8") as f:
        return f.read()


def _extract_title(markdown: str) -> Optional[str]:
    """Pull the first h1 from markdown."""
    for line in markdown.split("\n"):
        if line.startswith("# "):
            return line[2:].strip()
    return None


@router.post("/scrape", response_model=ScrapeResponse)
async def scrape_url(request: ScrapeRequest) -> ScrapeResponse:
    """
    Scrape a URL using Scrapling CLI and return Markdown.

    Modes:
    - get: Simple HTTP request (fastest)
    - fetch: Playwright browser (JavaScript support)
    - stealthy-fetch: Camoufox with anti-bot protection (best for protected sites)

    Content extraction:
    - If `css_selector` is given, only that element's content is returned.
    - Otherwise, auto-detection tries schema.org Recipe, <article>, <main>,
      [role="main"] in order. Falls back to full page if none match.
    """
    url = str(request.url)
    logger.info("SCRAPE %s (mode=%s, timeout=%ds)", url, request.mode, request.timeout)
    start_time = time.time()

    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        output_file = f.name

    try:
        selectors_to_try: list[Optional[str]]

        if request.css_selector:
            selectors_to_try = [request.css_selector, None]
        else:
            selectors_to_try = [*RECIPE_SELECTORS, None]

        markdown_content = ""

        for selector in selectors_to_try:
            label = selector or "full page"
            logger.info("  trying selector: %s", label)
            cmd = _build_base_cmd(
                mode=request.mode,
                url=url,
                output_file=output_file,
                timeout=request.timeout,
                wait_for_network_idle=request.wait_for_network_idle,
                solve_cloudflare=request.solve_cloudflare,
                css_selector=selector,
            )

            try:
                markdown_content = await _run_scrape(cmd)
            except Exception as e:
                logger.info("  selector %s failed: %s", label, str(e)[:100])
                continue

            if len(markdown_content.strip()) >= MIN_CONTENT_LENGTH:
                logger.info("  matched %s (%d chars)", label, len(markdown_content))
                break
            else:
                logger.info("  selector %s too short (%d chars)", label, len(markdown_content))

        if not markdown_content.strip():
            logger.warning("SCRAPE FAILED %s — no content extracted", url)
            raise Exception("No content extracted from page")

        title = _extract_title(markdown_content)
        extraction_time = int((time.time() - start_time) * 1000)

        logger.info("SCRAPE OK %s — %d chars, %dms, title=%s", url, len(markdown_content), extraction_time, title)

        return ScrapeResponse(
            success=True,
            markdown=markdown_content,
            title=title,
            description=None,
            image_url=None,
            source_url=url,
            extraction_time_ms=extraction_time,
        )

    except Exception as e:
        logger.error("SCRAPE ERROR %s — %s", url, str(e))
        raise HTTPException(status_code=500, detail=f"Scraping error: {str(e)}")
    finally:
        if os.path.exists(output_file):
            os.unlink(output_file)


@router.post("/scrape/stream")
async def scrape_url_stream(request: ScrapeRequest):
    """
    Stream scrape progress using Server-Sent Events (SSE).

    Streams real-time progress as Scrapling CLI executes.
    """

    async def event_stream():
        url = str(request.url)
        import time
        start_time = time.time()

        with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
            output_file = f.name

        try:
            yield f"event: status\ndata: {json.dumps({'message': 'Starting scrape', 'url': url, 'mode': request.mode})}\n\n"

            selectors_to_try: list[Optional[str]]
            if request.css_selector:
                selectors_to_try = [request.css_selector, None]
            else:
                selectors_to_try = [*RECIPE_SELECTORS, None]

            markdown_content = ""

            for selector in selectors_to_try:
                label = selector or "full page"
                yield f"event: progress\ndata: {json.dumps({'step': 'fetch', 'message': f'Trying selector: {label}'})}\n\n"

                cmd = _build_base_cmd(
                    mode=request.mode,
                    url=url,
                    output_file=output_file,
                    timeout=request.timeout,
                    wait_for_network_idle=request.wait_for_network_idle,
                    solve_cloudflare=request.solve_cloudflare,
                    css_selector=selector,
                )

                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )

                while True:
                    line = await process.stdout.readline()
                    if not line:
                        break
                    decoded = line.decode().strip()
                    if decoded:
                        yield f"event: log\ndata: {json.dumps({'message': decoded})}\n\n"

                _stdout, stderr = await process.communicate()

                if process.returncode != 0:
                    yield f"event: progress\ndata: {json.dumps({'step': 'selector_miss', 'message': f'Selector {label} failed, trying next...'})}\n\n"
                    continue

                with open(output_file, "r", encoding="utf-8") as f:
                    markdown_content = f.read()

                if len(markdown_content.strip()) >= MIN_CONTENT_LENGTH:
                    yield f"event: progress\ndata: {json.dumps({'step': 'selector_hit', 'message': f'Matched: {label} ({len(markdown_content)} chars)'})}\n\n"
                    break
                else:
                    yield f"event: progress\ndata: {json.dumps({'step': 'selector_miss', 'message': f'Selector {label} too short ({len(markdown_content)} chars), trying next...'})}\n\n"

            if not markdown_content.strip():
                yield f"event: error\ndata: {json.dumps({'success': False, 'error': 'No content extracted', 'url': url})}\n\n"
                return

            title = _extract_title(markdown_content)
            total_time = int((time.time() - start_time) * 1000)

            yield f"event: progress\ndata: {json.dumps({'step': 'complete', 'message': f'Extracted {len(markdown_content)} characters', 'title': title})}\n\n"

            result = {
                "success": True,
                "markdown": markdown_content,
                "title": title,
                "description": None,
                "image_url": None,
                "source_url": url,
                "extraction_time_ms": total_time,
                "mode": request.mode,
            }

            yield f"event: complete\ndata: {json.dumps(result)}\n\n"

        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'success': False, 'error': str(e), 'url': url})}\n\n"
        finally:
            if os.path.exists(output_file):
                os.unlink(output_file)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "scraper", "version": "2.1.0-cli"}
