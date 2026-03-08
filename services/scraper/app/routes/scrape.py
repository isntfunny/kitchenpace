"""Scrape API endpoints using Scrapling CLI."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional
import asyncio
import json
import tempfile
import os

router = APIRouter(prefix="/api", tags=["scrape"])


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


class ScrapeResponse(BaseModel):
    """Response model for scrape endpoint."""

    success: bool
    markdown: str
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    source_url: str
    extraction_time_ms: int


@router.post("/scrape", response_model=ScrapeResponse)
async def scrape_url(request: ScrapeRequest) -> ScrapeResponse:
    """
    Scrape a URL using Scrapling CLI and return Markdown.
    
    Modes:
    - get: Simple HTTP request (fastest)
    - fetch: Playwright browser (JavaScript support)
    - stealthy-fetch: Camoufox with anti-bot protection (best for protected sites)
    """
    import time
    
    url = str(request.url)
    start_time = time.time()
    
    # Create temp file for output
    with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
        output_file = f.name
    
    try:
        # Build CLI command based on mode
        if request.mode == "get":
            cmd = [
                "scrapling", "extract", "get",
                url,
                output_file,
                "--timeout", str(request.timeout)
            ]
        elif request.mode == "fetch":
            cmd = [
                "scrapling", "extract", "fetch",
                url,
                output_file,
                "--timeout", str(request.timeout * 1000)
            ]
            if request.wait_for_network_idle:
                cmd.append("--network-idle")
        else:  # stealthy-fetch
            cmd = [
                "scrapling", "extract", "stealthy-fetch",
                url,
                output_file,
                "--timeout", str(request.timeout * 1000)
            ]
            if request.wait_for_network_idle:
                cmd.append("--network-idle")
            if request.solve_cloudflare:
                cmd.append("--solve-cloudflare")
        
        # Run CLI command
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            raise Exception(f"Scrapling CLI failed: {stderr.decode()}")
        
        # Read the markdown output
        with open(output_file, 'r', encoding='utf-8') as f:
            markdown_content = f.read()
        
        # Extract title from markdown
        title = None
        lines = markdown_content.split('\n')
        for line in lines:
            if line.startswith('# '):
                title = line[2:].strip()
                break
        
        extraction_time = int((time.time() - start_time) * 1000)
        
        return ScrapeResponse(
            success=True,
            markdown=markdown_content,
            title=title,
            description=None,
            image_url=None,
            source_url=url,
            extraction_time_ms=extraction_time
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Scraping error: {str(e)}"
        )
    finally:
        # Clean up temp file
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
        
        # Create temp file for output
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
            output_file = f.name
        
        try:
            yield f"event: status\ndata: {json.dumps({'message': 'Starting scrape', 'url': url, 'mode': request.mode})}\n\n"
            
            # Build CLI command
            if request.mode == "get":
                yield f"event: progress\ndata: {json.dumps({'step': 'init', 'message': 'Using HTTP fetcher (fast mode)'})}\n\n"
                cmd = [
                    "scrapling", "extract", "get",
                    url,
                    output_file,
                    "--timeout", str(request.timeout)
                ]
            elif request.mode == "fetch":
                yield f"event: progress\ndata: {json.dumps({'step': 'init', 'message': 'Using Playwright fetcher (dynamic content)'})}\n\n"
                cmd = [
                    "scrapling", "extract", "fetch",
                    url,
                    output_file,
                    "--timeout", str(request.timeout * 1000)
                ]
                if request.wait_for_network_idle:
                    cmd.append("--network-idle")
            else:  # stealthy-fetch
                yield f"event: progress\ndata: {json.dumps({'step': 'init', 'message': 'Using Camoufox stealth fetcher (anti-bot protection)'})}\n\n"
                cmd = [
                    "scrapling", "extract", "stealthy-fetch",
                    url,
                    output_file,
                    "--timeout", str(request.timeout * 1000)
                ]
                if request.wait_for_network_idle:
                    cmd.append("--network-idle")
                if request.solve_cloudflare:
                    cmd.append("--solve-cloudflare")
                    yield f"event: progress\ndata: {json.dumps({'step': 'config', 'message': 'Cloudflare solving enabled'})}\n\n"
            
            yield f"event: progress\ndata: {json.dumps({'step': 'fetch', 'message': 'Fetching page content...'})}\n\n"
            
            # Run CLI command and stream output
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            # Stream stdout in real-time
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                decoded = line.decode().strip()
                if decoded:
                    yield f"event: log\ndata: {json.dumps({'message': decoded})}\n\n"
            
            # Wait for completion
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Unknown error"
                yield f"event: error\ndata: {json.dumps({'success': False, 'error': error_msg, 'url': url})}\n\n"
                return
            
            fetch_time = int((time.time() - start_time) * 1000)
            yield f"event: progress\ndata: {json.dumps({'step': 'fetched', 'message': f'Page fetched in {fetch_time}ms'})}\n\n"
            
            # Read output
            yield f"event: progress\ndata: {json.dumps({'step': 'read', 'message': 'Reading scraped content...'})}\n\n"
            
            with open(output_file, 'r', encoding='utf-8') as f:
                markdown_content = f.read()
            
            # Extract title from markdown
            title = None
            lines = markdown_content.split('\n')
            for line in lines:
                if line.startswith('# '):
                    title = line[2:].strip()
                    break
            
            yield f"event: progress\ndata: {json.dumps({'step': 'complete', 'message': f'Extracted {len(markdown_content)} characters', 'title': title})}\n\n"
            
            total_time = int((time.time() - start_time) * 1000)
            
            # Send final result
            result = {
                "success": True,
                "markdown": markdown_content,
                "title": title,
                "description": None,
                "image_url": None,
                "source_url": url,
                "extraction_time_ms": total_time,
                "mode": request.mode
            }
            
            yield f"event: complete\ndata: {json.dumps(result)}\n\n"
            
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'success': False, 'error': str(e), 'url': url})}\n\n"
        finally:
            # Clean up temp file
            if os.path.exists(output_file):
                os.unlink(output_file)
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "scraper", "version": "2.0.0-cli"}