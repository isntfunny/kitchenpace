"""yt-dlp strategy — video metadata + whisper transcription or subtitles."""

import asyncio
import json
import logging
import os
import re
import tempfile
from typing import AsyncGenerator, Optional

import httpx

log = logging.getLogger("scraper")

WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "large-v3-turbo")
YTDLP_BROWSER = os.environ.get("YTDLP_BROWSER", "firefox")

_whisper_model = None


def _get_whisper():
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        log.info("Loading whisper model '%s'...", WHISPER_MODEL)
        _whisper_model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
        log.info("Whisper model loaded")
    return _whisper_model


def _base_args() -> list[str]:
    return ["--cookies-from-browser", YTDLP_BROWSER, "--remote-components", "ejs:github"]


async def _get_metadata(url: str) -> dict:
    cmd = ["yt-dlp", "-j", "--no-download", *_base_args(), url]
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        err = stderr.decode()[:200]
        raise RuntimeError(f"yt-dlp failed: {err}")
    return json.loads(stdout.decode())


async def _download_audio(url: str, out_path: str) -> bool:
    cmd = ["yt-dlp", "-f", "bestaudio/bestaudio*", "-o", out_path, "--no-playlist", *_base_args(), url]
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    await proc.communicate()
    return proc.returncode == 0


def _transcribe(audio_path: str) -> tuple[str, str]:
    model = _get_whisper()
    segments, info = model.transcribe(audio_path, beam_size=1, vad_filter=True)
    text = " ".join(s.text.strip() for s in segments)
    return text, info.language


SUBTITLE_LANGS = ["de", "en"]


def _pick_subtitle(meta: dict) -> tuple[str, str] | None:
    """Return (lang, url) for the best subtitle track, or None."""
    for source in ("subtitles", "automatic_captions"):
        for lang in SUBTITLE_LANGS:
            tracks = meta.get(source, {}).get(lang, [])
            by_ext = {t.get("ext"): t.get("url") for t in tracks if t.get("url")}
            for fmt in ("json3", "vtt", "srv3"):
                if fmt in by_ext:
                    return lang, by_ext[fmt]
    return None


async def _fetch_subtitle_text(url: str) -> str:
    """Download subtitle file and return plain text."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    raw = resp.text

    # json3
    try:
        data = json.loads(raw)
        if "events" in data:
            seen, parts = set(), []
            for event in data["events"]:
                for seg in event.get("segs", []):
                    t = seg.get("utf8", "").strip()
                    if t and t != "\n" and t not in seen:
                        seen.add(t)
                        parts.append(t)
            return " ".join(parts)
    except (json.JSONDecodeError, KeyError):
        pass

    # VTT
    if raw.strip().startswith("WEBVTT"):
        seen, lines = set(), []
        for line in raw.split("\n"):
            line = line.strip()
            if not line or line.startswith("WEBVTT") or "-->" in line or re.match(r"^\d+$", line):
                continue
            clean = re.sub(r"<[^>]+>", "", line).strip()
            if clean and clean not in seen:
                seen.add(clean)
                lines.append(clean)
        return " ".join(lines)

    # Fallback: strip tags
    return re.sub(r"<[^>]+>", "", raw).strip()


def _build_markdown(title: str, uploader: str, description: str, transcript: str) -> str:
    parts = []
    if title:
        parts.append(f"# {title}")
    if uploader:
        parts.append(f"*{uploader}*")
    if description:
        parts.append(f"\n## Caption\n\n{description}")
    if transcript:
        parts.append(f"\n## Transcript\n\n{transcript}")
    return "\n".join(parts)


# Step tuple: (step_name, message, is_final, markdown | None, image_url | None)
Step = tuple[str, str, bool, Optional[str], Optional[str]]


async def scrape_steps(url: str, mode: str | None = None) -> AsyncGenerator[Step, None]:
    """Yield progress steps. Last step has is_final=True and carries the result."""

    # 1. Metadata
    yield ("metadata", "Fetching video metadata...", False, None, None)
    meta = await _get_metadata(url)

    description = meta.get("description", "")
    thumbnail = meta.get("thumbnail")
    title = meta.get("title") or meta.get("fulltitle", "")
    uploader = meta.get("uploader") or meta.get("channel", "")
    duration = meta.get("duration_string") or str(meta.get("duration", "?"))

    yield ("metadata", f"Got metadata: \"{title[:60]}\" by {uploader} ({duration}s)", False, None, None)

    transcript = ""

    if mode == "subtitles":
        # ── Subtitle path (YouTube) ──────────────────────────────────
        yield ("subtitles", "Looking for subtitles...", False, None, None)
        sub_info = _pick_subtitle(meta)
        if sub_info is None:
            raise RuntimeError(
                "Keine Untertitel verfügbar. Dieses Video hat weder "
                "manuelle noch automatisch generierte Untertitel."
            )
        lang, sub_url = sub_info
        yield ("subtitles", f"Downloading {lang} subtitles...", False, None, None)
        transcript = await _fetch_subtitle_text(sub_url)
        yield ("subtitles", f"Subtitles: {len(transcript)} chars (lang={lang})", False, None, None)
    else:
        # ── Whisper path (TikTok, Instagram) ─────────────────────────
        yield ("download", "Downloading audio...", False, None, None)
        audio_path = tempfile.mktemp(suffix=".m4a")
        try:
            dl_ok = await _download_audio(url, audio_path)
            if dl_ok and os.path.exists(audio_path):
                size_kb = os.path.getsize(audio_path) // 1024
                yield ("download", f"Audio downloaded ({size_kb}KB)", False, None, None)

                yield ("transcribe", "Transcribing with whisper...", False, None, None)
                transcript, lang = _transcribe(audio_path)
                yield ("transcribe", f"Transcribed: {len(transcript)} chars (lang={lang})", False, None, None)
            else:
                yield ("download", "No audio available, skipping transcription", False, None, None)
        finally:
            if os.path.exists(audio_path):
                os.unlink(audio_path)

    # Final
    md = _build_markdown(title, uploader, description, transcript)
    yield ("done", f"{len(md)} chars", True, md, thumbnail)


async def scrape(url: str, mode: str | None = None) -> tuple[str, Optional[str]]:
    """Non-streaming wrapper — returns final (markdown, image_url)."""
    async for step, msg, is_final, md, img in scrape_steps(url, mode=mode):
        log.info("  ytdlp [%s] %s", step, msg)
        if is_final:
            return md or "", img
    return "", None
