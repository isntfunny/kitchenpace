"""JSON-LD strategy — extract schema.org/Recipe from page source."""

import asyncio
import json
import logging
import os
import re
import tempfile
from typing import Optional

log = logging.getLogger("scraper")

_JSONLD_RE = re.compile(
    r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', re.S
)
_TITLE_RE = re.compile(r'<title[^>]*>(.*?)</title>', re.S | re.I)

# If the page title contains these, it's likely an error page
_ERROR_PATTERNS = ["404", "not found", "nicht gefunden", "fehler", "error", "page not found", "seite nicht gefunden"]


def _find_recipe(html: str) -> Optional[dict]:
    """Find the first schema.org Recipe object in JSON-LD scripts."""
    for m in _JSONLD_RE.finditer(html):
        try:
            data = json.loads(m.group(1))
        except json.JSONDecodeError:
            continue

        # Direct Recipe object
        if isinstance(data, dict):
            if data.get("@type") == "Recipe":
                return data
            # Nested in @graph array
            for item in data.get("@graph", []):
                if isinstance(item, dict) and item.get("@type") == "Recipe":
                    return item

        # Array of objects
        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and item.get("@type") == "Recipe":
                    return item
    return None


def _parse_duration(iso: str) -> str:
    """PT1H25M -> 1h 25min, PT20M -> 20min"""
    if not iso:
        return ""
    m = re.match(r"P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?", iso)
    if not m:
        return iso
    h, mins = m.group(1), m.group(2)
    parts = []
    if h and h != "0":
        parts.append(f"{h}h")
    if mins and mins != "0":
        parts.append(f"{mins}min")
    return " ".join(parts) or ""


def _recipe_to_markdown(r: dict) -> str:
    """Convert a schema.org Recipe dict to clean markdown."""
    lines = []

    # Title
    lines.append(f"# {r.get('name', 'Rezept')}")

    # Meta line
    meta = []
    if y := r.get("recipeYield"):
        meta.append(f"**Portionen:** {y[0] if isinstance(y, list) else y}")
    if t := _parse_duration(r.get("totalTime", "")):
        meta.append(f"**Gesamtzeit:** {t}")
    if pt := _parse_duration(r.get("prepTime", "")):
        meta.append(f"Vorbereitung: {pt}")
    if ct := _parse_duration(r.get("cookTime", "")):
        meta.append(f"Kochzeit: {ct}")
    if meta:
        lines.append(" | ".join(meta))

    # Nutrition
    if n := r.get("nutrition"):
        parts = []
        if c := n.get("calories"):
            parts.append(c)
        if p := n.get("proteinContent"):
            parts.append(f"Protein: {p}")
        if f := n.get("fatContent"):
            parts.append(f"Fett: {f}")
        if k := n.get("carbohydrateContent"):
            parts.append(f"Kohlenhydrate: {k}")
        if parts:
            lines.append(" | ".join(parts))

    # Ingredients
    if ingredients := r.get("recipeIngredient"):
        lines.append("\n## Zutaten\n")
        for ing in ingredients:
            lines.append(f"- {ing}")

    # Instructions
    instructions = r.get("recipeInstructions", [])
    if instructions:
        lines.append("\n## Zubereitung\n")
        step_num = 0
        for item in instructions:
            if isinstance(item, str):
                step_num += 1
                lines.append(f"{step_num}. {item}")
            elif isinstance(item, dict):
                if item.get("@type") == "HowToStep":
                    step_num += 1
                    lines.append(f"{step_num}. {item.get('text', '')}")
                elif item.get("@type") == "HowToSection":
                    for sub in item.get("itemListElement", []):
                        if isinstance(sub, dict):
                            step_num += 1
                            lines.append(f"{step_num}. {sub.get('text', '')}")

    return "\n".join(lines)


def _get_image(r: dict) -> Optional[str]:
    """Extract best image URL from Recipe object."""
    img = r.get("image")
    if isinstance(img, str):
        return img
    if isinstance(img, list) and img:
        return img[0]
    if isinstance(img, dict):
        return img.get("url") or img.get("contentUrl")
    return None


async def _fetch_html(url: str, mode: str, timeout: int) -> Optional[str]:
    """Fetch page HTML using scrapling CLI. Returns HTML or None on failure."""
    out = tempfile.mktemp(suffix=".html")
    try:
        cmd = ["scrapling", "extract", mode, url, out,
               "--timeout", str(timeout if mode == "get" else timeout * 1000)]
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        _, stderr = await proc.communicate()

        if proc.returncode != 0:
            log.info("  jsonld: fetch failed (%s): %s", mode, stderr.decode()[:100])
            return None

        with open(out, "r", encoding="utf-8") as f:
            return f.read()
    finally:
        if os.path.exists(out):
            os.unlink(out)


async def scrape(url: str, mode: str = "stealthy-fetch", timeout: int = 30, **_) -> Optional[tuple[str, Optional[str]]]:
    """Try to extract Recipe from JSON-LD. Returns (markdown, image_url) or None if no Recipe found.

    Tries simple GET first (fast, no browser needed), then falls back to the
    requested mode (stealthy-fetch) if GET didn't yield a Recipe.
    """
    # Try simple GET first — most recipe sites serve JSON-LD without JS
    modes = ["get"] if mode == "get" else ["get", mode]

    for fetch_mode in modes:
        html = await _fetch_html(url, fetch_mode, timeout)
        if not html:
            continue

        # Detect error pages early
        title_m = _TITLE_RE.search(html)
        if title_m:
            title = title_m.group(1).strip().lower()
            if any(p in title for p in _ERROR_PATTERNS):
                raise RuntimeError(f"Seite nicht gefunden: {title_m.group(1).strip()}")

        recipe = _find_recipe(html)
        if recipe:
            md = _recipe_to_markdown(recipe)
            img = _get_image(recipe)
            log.info("  jsonld: found Recipe '%s' (%d chars, via %s)", recipe.get("name", "?")[:50], len(md), fetch_mode)
            return md, img

        log.info("  jsonld: no Recipe schema found (via %s)", fetch_mode)

    return None
