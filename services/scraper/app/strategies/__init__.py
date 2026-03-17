"""Strategy dispatch — routes URLs to the right scraping method.

Order for non-ytdlp sites:
  1. JSON-LD (schema.org/Recipe) — works on most recipe sites
  2. Scrapling with domain-specific CSS selectors — fallback
"""

import logging
from typing import Optional

from app.sites import get_mode, get_selector, get_site_name, get_strategy

from .jsonld import scrape as scrape_jsonld
from .scrapling import scrape as scrape_scrapling
from .ytdlp import scrape as scrape_ytdlp

ScrapeResult = tuple[str, Optional[str]]  # (markdown, image_url)

MIN_CONTENT = 200
log = logging.getLogger("scraper")

__all__ = ["dispatch", "MIN_CONTENT"]


async def dispatch(url: str, css_selector: Optional[str] = None, **scrapling_opts) -> ScrapeResult:
    """Main entry point. Picks the best strategy for the URL."""
    strategy = get_strategy(url) if not css_selector else "scrapling"

    if strategy == "ytdlp":
        return await scrape_ytdlp(url, mode=get_mode(url))

    # Custom CSS selector skips jsonld
    if css_selector:
        return await _scrapling_loop(url, [css_selector, None], **scrapling_opts)

    # Try JSON-LD first (universal, structured, reliable)
    site = get_site_name(url) or "unknown"
    log.info("  site=%s, trying jsonld first", site)

    result = await scrape_jsonld(url, **scrapling_opts)
    if result:
        md, img = result
        if len(md.strip()) >= MIN_CONTENT:
            return md, img
        log.info("  jsonld too short (%d chars), falling back to scrapling", len(md))

    # Fallback: scrapling with CSS selectors
    log.info("  falling back to scrapling")
    selectors = [get_selector(url), None]
    return await _scrapling_loop(url, selectors, **scrapling_opts)


async def _scrapling_loop(url: str, selectors: list[Optional[str]], **opts) -> ScrapeResult:
    """Try selectors in order, return first good result."""
    content, image_url = "", None
    for sel in selectors:
        label = sel or "full page"
        try:
            content, image_url = await scrape_scrapling(url, sel, **opts)
        except Exception as e:
            log.info("  %s failed: %s", label, str(e)[:100])
            continue
        if len(content.strip()) >= MIN_CONTENT:
            log.info("  %s OK (%d chars)", label, len(content))
            return content, image_url
        log.info("  %s too short (%d chars)", label, len(content))
    return content, image_url
