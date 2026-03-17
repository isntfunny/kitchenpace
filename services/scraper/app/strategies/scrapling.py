"""Scrapling CLI strategy — CSS selector based HTML/Markdown extraction."""

import asyncio
import os
import re
import tempfile
from typing import Optional

from markdownify import markdownify

from app.sites import has_image_selector

_SRCSET_RE = re.compile(r'(https?://[^\s"]+)\s+\d+w')
_SRC_RE = re.compile(r'src="(https?://[^\s"]+)"')


def _extract_image(html: str) -> Optional[str]:
    urls = _SRCSET_RE.findall(html)
    if urls:
        return urls[-1]
    m = _SRC_RE.search(html)
    return m.group(1) if m else None


def _build_cmd(url: str, outfile: str, selector: Optional[str] = None, *,
               mode: str = "stealthy-fetch", timeout: int = 30,
               wait_for_network_idle: bool = False, solve_cloudflare: bool = False) -> list[str]:
    c = ["scrapling", "extract", mode, url, outfile,
         "--timeout", str(timeout if mode == "get" else timeout * 1000)]
    if mode != "get" and wait_for_network_idle:
        c.append("--network-idle")
    if mode == "stealthy-fetch" and solve_cloudflare:
        c.append("--solve-cloudflare")
    if selector:
        c.extend(["-s", selector])
    return c


async def scrape(url: str, selector: Optional[str] = None, **opts) -> tuple[str, Optional[str]]:
    """Run scrapling CLI. Returns (markdown, image_url)."""
    use_html = has_image_selector(url) and not opts.get("css_selector")
    out = tempfile.mktemp(suffix=".html" if use_html else ".md")

    try:
        cmd = _build_cmd(url, out, selector, **{k: v for k, v in opts.items() if k != "css_selector"})
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        _, stderr = await proc.communicate()

        if proc.returncode != 0:
            raise RuntimeError(stderr.decode()[:200])

        with open(out, "r", encoding="utf-8") as f:
            raw = f.read()

        if use_html:
            md = markdownify(raw, heading_style="ATX", strip=["img", "script", "style"])
            return md, _extract_image(raw)
        return raw, None
    finally:
        if os.path.exists(out):
            os.unlink(out)
