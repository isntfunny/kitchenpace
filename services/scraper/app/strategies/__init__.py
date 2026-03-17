"""Strategy dispatch — routes URLs to the right scraping method."""

from typing import Optional

from app.sites import get_selector, get_site_name, get_strategy

from .scrapling import scrape as scrape_scrapling
from .ytdlp import scrape as scrape_ytdlp

# Re-export for main.py
ScrapeResult = tuple[str, Optional[str]]  # (markdown, image_url)

MIN_CONTENT = 200

__all__ = ["dispatch", "dispatch_scrapling_loop", "MIN_CONTENT"]


async def dispatch(url: str, css_selector: Optional[str] = None, **scrapling_opts) -> ScrapeResult:
    """Route to the right strategy. ytdlp sites skip the selector loop."""
    strategy = get_strategy(url) if not css_selector else "scrapling"

    if strategy == "ytdlp":
        return await scrape_ytdlp(url)

    return await scrape_scrapling(url, css_selector, **scrapling_opts)


async def dispatch_scrapling_loop(url: str, css_selector: Optional[str] = None,
                                  **scrapling_opts) -> ScrapeResult:
    """Try domain-specific selector, then full page fallback."""
    import logging
    log = logging.getLogger("scraper")

    selectors: list[Optional[str]]
    if css_selector:
        selectors = [css_selector, None]
    else:
        log.info("  site=%s", get_site_name(url) or "unknown")
        selectors = [get_selector(url), None]

    content, image_url = "", None
    for sel in selectors:
        label = sel or "full page"
        try:
            content, image_url = await scrape_scrapling(url, sel, **scrapling_opts)
        except Exception as e:
            log.info("  %s failed: %s", label, str(e)[:100])
            continue
        if len(content.strip()) >= MIN_CONTENT:
            log.info("  %s OK (%d chars)", label, len(content))
            return content, image_url
        log.info("  %s too short (%d chars)", label, len(content))

    return content, image_url
