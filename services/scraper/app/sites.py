"""Domain config — maps domains to scraping strategies.

Most recipe sites have schema.org/Recipe JSON-LD which is tried automatically.
Domain-specific CSS selectors are only needed as fallback when JSON-LD is missing.
"""

from urllib.parse import urlparse

SITE_CONFIG: dict[str, dict] = {
    # ── yt-dlp: whisper transcription ─────────────────────────────────
    "instagram.com": {"strategy": "ytdlp"},
    "tiktok.com": {"strategy": "ytdlp"},
    # ── yt-dlp: subtitles (no whisper) ─────────────────────────────────
    "youtube.com": {"strategy": "ytdlp", "mode": "subtitles"},
    "youtu.be": {"strategy": "ytdlp", "mode": "subtitles"},

    # ── Domain-specific CSS selectors (only if JSON-LD doesn't work) ─
    # Template:
    # "example.de": {
    #     "strategy": "scrapling",
    #     "content": [".recipe-ingredients", ".recipe-steps"],
    #     "image": ".recipe-hero img",
    # },

    # Sally's Blog: JSON-LD has numeric ingredient IDs instead of text,
    # so we must use scrapling with CSS selectors to get real content.
    "sallys-blog.de": {
        "strategy": "scrapling",
        "content": [
            "shop-studio-recipes-recipe-detail-tabs-description",
        ],
    },
}

# Generic fallback selectors when JSON-LD is missing and no domain config exists
FALLBACK_CONTENT = ["[itemtype*='Recipe']", "article", "main", '[role="main"]']


def _domain(url: str) -> str:
    d = urlparse(url).netloc.lower()
    return d[4:] if d.startswith("www.") else d


def _match(domain: str) -> str | None:
    if domain in SITE_CONFIG:
        return domain
    for known in SITE_CONFIG:
        if domain.endswith("." + known):
            return known
    return None


def get_site_name(url: str) -> str | None:
    return _match(_domain(url))


def get_strategy(url: str) -> str:
    match = _match(_domain(url))
    return SITE_CONFIG[match].get("strategy", "scrapling") if match else "scrapling"


def get_selector(url: str) -> str:
    """Combined content + image CSS selector for scrapling fallback."""
    match = _match(_domain(url))
    if not match or "content" not in SITE_CONFIG[match]:
        return ", ".join(FALLBACK_CONTENT)
    cfg = SITE_CONFIG[match]
    sels = list(cfg["content"])
    if "image" in cfg:
        sels.append(cfg["image"])
    return ", ".join(sels)


def has_image_selector(url: str) -> bool:
    match = _match(_domain(url))
    return bool(match and SITE_CONFIG[match].get("image"))


def get_mode(url: str) -> str | None:
    match = _match(_domain(url))
    return SITE_CONFIG[match].get("mode") if match else None
