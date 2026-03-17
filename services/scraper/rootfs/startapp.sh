#!/bin/sh
set -eu
export HOME=/config
mkdir -p /config/log/firefox /config/log

# Symlink XDG firefox profile to where yt-dlp expects it (~/.mozilla/firefox)
if [ -d /config/xdg/config/mozilla/firefox ] && [ ! -e /config/.mozilla/firefox ]; then
    mkdir -p /config/.mozilla
    ln -s /config/xdg/config/mozilla/firefox /config/.mozilla/firefox
fi

# Start the scraper API in the background (restart on crash)
cd /app
CRASHES=0
while true; do
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 >> /config/log/scraper.log 2>&1
    CRASHES=$((CRASHES + 1))
    if [ "$CRASHES" -ge 10 ]; then
        echo "[$(date)] uvicorn crashed $CRASHES times, giving up" >> /config/log/scraper.log
        break
    fi
    echo "[$(date)] uvicorn exited, restarting in 1s (crash #$CRASHES)" >> /config/log/scraper.log
    sleep 1
done &

# Firefox is the foreground GUI app (managed by jlesage supervisor)
exec /usr/bin/firefox "$@" >> /config/log/firefox/output.log 2>> /config/log/firefox/error.log
