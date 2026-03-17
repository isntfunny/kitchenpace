"""yt-dlp + faster-whisper strategy — video metadata + audio transcription."""

import asyncio
import json
import logging
import os
import tempfile
from typing import Optional

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


def _ytdlp_base_cmd(url: str) -> list[str]:
    cmd = ["yt-dlp"]
    if YTDLP_COOKIES:
        cmd.extend(["--cookies", YTDLP_COOKIES])
    cmd.append(url)
    return cmd


async def _get_metadata(url: str) -> dict:
    cmd = ["yt-dlp", "-j", "--no-download"]
    if YTDLP_COOKIES:
        cmd.extend(["--cookies", YTDLP_COOKIES])
    cmd.append(url)

    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    stdout, stderr = await proc.communicate()

    if proc.returncode != 0:
        raise RuntimeError(f"yt-dlp failed: {stderr.decode()[:200]}")
    return json.loads(stdout.decode())


async def _download_audio(url: str, out_path: str) -> bool:
    # bestaudio/bestaudio* — fallback to video-with-audio if no separate audio stream
    cmd = ["yt-dlp", "-f", "bestaudio/bestaudio*", "-o", out_path, "--no-playlist"]
    if YTDLP_COOKIES:
        cmd.extend(["--cookies", YTDLP_COOKIES])
    cmd.append(url)

    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    await proc.communicate()
    return proc.returncode == 0


def _transcribe(audio_path: str) -> tuple[str, str]:
    """Returns (transcript, language)."""
    model = _get_whisper()
    segments, info = model.transcribe(audio_path, beam_size=1, vad_filter=True)
    text = " ".join(s.text.strip() for s in segments)
    return text, info.language


async def scrape(url: str) -> tuple[str, Optional[str]]:
    """Extract via yt-dlp metadata + whisper. Returns (markdown, image_url)."""
    meta = await _get_metadata(url)

    description = meta.get("description", "")
    thumbnail = meta.get("thumbnail")
    title = meta.get("title") or meta.get("fulltitle", "")
    uploader = meta.get("uploader") or meta.get("channel", "")

    # Download audio + transcribe
    audio_path = tempfile.mktemp(suffix=".m4a")
    transcript = ""
    try:
        if await _download_audio(url, audio_path) and os.path.exists(audio_path):
            transcript, lang = _transcribe(audio_path)
            log.info("  whisper: %d chars, lang=%s", len(transcript), lang)
    finally:
        if os.path.exists(audio_path):
            os.unlink(audio_path)

    # Combine
    parts = []
    if title:
        parts.append(f"# {title}")
    if uploader:
        parts.append(f"*{uploader}*")
    if description:
        parts.append(f"\n## Caption\n\n{description}")
    if transcript:
        parts.append(f"\n## Transcript\n\n{transcript}")

    return "\n".join(parts), thumbnail
