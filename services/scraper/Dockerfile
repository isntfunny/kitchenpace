FROM jlesage/baseimage-gui:ubuntu-24.04-v4

# System deps for browsers + ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    libglib2.0-0 libnss3 libatk1.0-0 libcups2 libdrm2 libdbus-1-3 \
    libxcb1 libxkbcommon0 libx11-6 libgbm1 libasound2t64 \
    libpango-1.0-0 libpangocairo-1.0-0 libgtk-3-0 \
    curl ffmpeg unzip software-properties-common gpg \
    && rm -rf /var/lib/apt/lists/*

# Firefox from Mozilla's official apt repo (Ubuntu 24.04 only has snap)
RUN install -d -m 0755 /etc/apt/keyrings \
    && curl -fsSL https://packages.mozilla.org/apt/repo-signing-key.gpg \
       -o /etc/apt/keyrings/packages.mozilla.org.asc \
    && echo "deb [signed-by=/etc/apt/keyrings/packages.mozilla.org.asc] https://packages.mozilla.org/apt mozilla main" \
       > /etc/apt/sources.list.d/mozilla.list \
    && echo 'Package: *\nPin: origin packages.mozilla.org\nPin-Priority: 1000' \
       > /etc/apt/preferences.d/mozilla \
    && apt-get update && apt-get install -y --no-install-recommends firefox \
    && rm -rf /var/lib/apt/lists/*

# Install deno (required by yt-dlp for YouTube JS extraction)
RUN curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh

ENV PLAYWRIGHT_BROWSERS_PATH=/tmp/playwright-browsers
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

# Browsers for scrapling (patchright, not playwright — scrapling uses patchright)
RUN patchright install chromium

# Pre-download whisper model so first request isn't slow
ARG WHISPER_MODEL=large-v3-turbo
ENV WHISPER_MODEL=${WHISPER_MODEL}
RUN python3 -c "from faster_whisper import WhisperModel; WhisperModel('${WHISPER_MODEL}', device='cpu', compute_type='int8')"

COPY app/ ./app/

# startapp.sh (Firefox GUI + uvicorn scraper)
COPY rootfs/ /

EXPOSE 5800 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1
