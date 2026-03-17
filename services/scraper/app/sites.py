"""Domain config — maps domains to scraping strategies and selectors."""

from urllib.parse import urlparse

SITE_CONFIG: dict[str, dict] = {
    # ── Scrapling (CSS selectors) ────────────────────────────────────
    "chefkoch.de": {
        "strategy": "scrapling",
        "content": ["h1", ".ds-ingredients-table", ".instruction-row"],
        "image": "img.ds-teaser-link__image[src*='/rezepte/']:not([loading='lazy'])",
    },
    "essen-und-trinken.de": {
        "strategy": "scrapling",
        "content": ["div[data-testid='recipe-detail']", ".recipe-content", "article"],
    },
    "dr-oetker.de": {
        "strategy": "scrapling",
        "content": [".recipe-details", ".recipe-content"],
    },
    "lecker.de": {
        "strategy": "scrapling",
        "content": ["article.recipe", ".recipe-header", ".recipe-ingredients"],
    },
    "edeka.de": {
        "strategy": "scrapling",
        "content": [".recipe-detail", ".recipe-content"],
    },
    # ── yt-dlp (video caption + whisper transcript) ──────────────────
    "instagram.com": {"strategy": "ytdlp"},
    "tiktok.com": {"strategy": "ytdlp"},
    "youtube.com": {"strategy": "ytdlp"},
    "youtu.be": {"strategy": "ytdlp"},
}

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
    return SITE_CONFIG[match]["strategy"] if match else "scrapling"


def get_selector(url: str) -> str:
    """Combined content + image CSS selector for scrapling."""
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
