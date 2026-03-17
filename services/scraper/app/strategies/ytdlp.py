"""yt-dlp + faster-whisper strategy — video metadata + audio transcription."""

import asyncio
import json
import logging
import os
import tempfile
from typing import AsyncGenerator, Optional

log = logging.getLogger("scraper")

WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "large-v3-turbo")
YTDLP_COOKIES = os.environ.get("YTDLP_COOKIES")

_whisper_model = None


def _get_whisper():
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        log.info("Loading whisper model '%s'...", WHISPER_MODEL)
        _whisper_model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
        log.info("Whisper model loaded")
    return _whisper_model


def _cookies_args() -> list[str]:
    return ["--cookies", YTDLP_COOKIES] if YTDLP_COOKIES else []


async def _get_metadata(url: str) -> dict:
    cmd = ["yt-dlp", "-j", "--no-download", *_cookies_args(), url]
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"yt-dlp failed: {stderr.decode()[:200]}")
    return json.loads(stdout.decode())


async def _download_audio(url: str, out_path: str) -> bool:
    cmd = ["yt-dlp", "-f", "bestaudio/bestaudio*", "-o", out_path, "--no-playlist", *_cookies_args(), url]
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    await proc.communicate()
    return proc.returncode == 0


def _transcribe(audio_path: str) -> tuple[str, str]:
    model = _get_whisper()
    segments, info = model.transcribe(audio_path, beam_size=1, vad_filter=True)
    text = " ".join(s.text.strip() for s in segments)
    return text, info.language


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


async def scrape_steps(url: str) -> AsyncGenerator[Step, None]:
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

    # 2. Audio download
    yield ("download", "Downloading audio...", False, None, None)
    audio_path = tempfile.mktemp(suffix=".m4a")
    transcript = ""
    try:
        dl_ok = await _download_audio(url, audio_path)
        if dl_ok and os.path.exists(audio_path):
            size_kb = os.path.getsize(audio_path) // 1024
            yield ("download", f"Audio downloaded ({size_kb}KB)", False, None, None)

            # 3. Transcription
            yield ("transcribe", "Transcribing with whisper...", False, None, None)
            transcript, lang = _transcribe(audio_path)
            yield ("transcribe", f"Transcribed: {len(transcript)} chars (lang={lang})", False, None, None)
        else:
            yield ("download", "No audio available, skipping transcription", False, None, None)
    finally:
        if os.path.exists(audio_path):
            os.unlink(audio_path)

    # 4. Final
    md = _build_markdown(title, uploader, description, transcript)
    yield ("done", f"{len(md)} chars", True, md, thumbnail)


async def scrape(url: str) -> tuple[str, Optional[str]]:
    """Non-streaming wrapper — returns final (markdown, image_url)."""
    async for step, msg, is_final, md, img in scrape_steps(url):
        log.info("  ytdlp [%s] %s", step, msg)
        if is_final:
            return md or "", img
    return "", None
