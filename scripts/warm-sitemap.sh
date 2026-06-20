#!/usr/bin/env bash
#
# warm-sitemap.sh — laedt die Live-Sitemap und ruft jede Seite einmal auf.
#
# Zweck: Cache-Warming / Smoke-Test. Parst die Sitemap, holt jede URL und
# zeigt HTTP-Status + Antwortzeit. Faengt rote Statuscodes (>=400) auf und
# fasst sie am Ende zusammen.
#
# Nutzung:
#   ./scripts/warm-sitemap.sh                       # Prod (kochtakt.de)
#   ./scripts/warm-sitemap.sh https://beta.kochtakt.de
#   BASE_URL=https://beta.kochtakt.de ./scripts/warm-sitemap.sh
#   CONCURRENCY=4 ./scripts/warm-sitemap.sh         # parallele Requests (Default 8)
#
set -euo pipefail

BASE_URL="${1:-${BASE_URL:-https://kochtakt.de}}"
BASE_URL="${BASE_URL%/}"
SITEMAP_URL="${BASE_URL}/sitemap.xml"
CONCURRENCY="${CONCURRENCY:-8}"
TIMEOUT="${TIMEOUT:-30}"
UA="${UA:-kochtakt-sitemap-warmer/1.0}"

echo "Sitemap: ${SITEMAP_URL}"
echo "Concurrency: ${CONCURRENCY}, Timeout: ${TIMEOUT}s"
echo

# Sitemap robust holen: in Datei laden, auf Vollstaendigkeit pruefen, bei
# abgeschnittener/kaputter Antwort bis zu 3x neu versuchen. (Die dynamische
# Sitemap kann gelegentlich mittendrin abbrechen — siehe </urlset>-Check.)
SITEMAP_FILE="$(mktemp)"
FAIL_LOG="$(mktemp)"
trap 'rm -f "${SITEMAP_FILE}" "${FAIL_LOG}"' EXIT

fetch_sitemap() {
    local attempt
    for attempt in 1 2 3; do
        if curl -fsSL --max-time "${TIMEOUT}" -A "${UA}" "${SITEMAP_URL}" -o "${SITEMAP_FILE}" \
            && grep -q '</urlset>' "${SITEMAP_FILE}" \
            && xmllint --noout "${SITEMAP_FILE}" 2>/dev/null; then
            return 0
        fi
        echo "Sitemap-Abruf unvollstaendig/fehlerhaft (Versuch ${attempt}/3), neuer Versuch…" >&2
        sleep 2
    done
    return 1
}

if ! fetch_sitemap; then
    echo "Sitemap konnte nicht vollstaendig geladen werden — abbruch." >&2
    exit 1
fi

mapfile -t URLS < <(
    xmllint --xpath '//*[local-name()="loc"]/text()' "${SITEMAP_FILE}" 2>/dev/null \
        | sed 's/&amp;/\&/g'
)

if [[ ${#URLS[@]} -eq 0 ]]; then
    echo "Keine URLs in der Sitemap gefunden — abbruch." >&2
    exit 1
fi

echo "Gefundene URLs: ${#URLS[@]}"
echo

# Eine einzelne URL laden und Status ausgeben.
fetch_one() {
    local url="$1"
    local out
    # http_code + total_time, verwirft den Body.
    out="$(curl -s -o /dev/null --max-time "${TIMEOUT}" -A "${UA}" \
        -w '%{http_code} %{time_total}' "${url}" || echo '000 0')"
    local code="${out%% *}"
    local time="${out##* }"
    printf '%s  %6.2fs  %s\n' "${code}" "${time}" "${url}"
    if [[ "${code}" -ge 400 || "${code}" == "000" ]]; then
        echo "${code} ${url}" >>"${FAIL_LOG}"
    fi
}
export -f fetch_one
export TIMEOUT UA FAIL_LOG

START=$(date +%s)

# Parallel mit xargs (P = Concurrency).
printf '%s\n' "${URLS[@]}" \
    | xargs -P "${CONCURRENCY}" -I{} bash -c 'fetch_one "$@"' _ {}

END=$(date +%s)

echo
echo "Fertig in $((END - START))s — ${#URLS[@]} Seiten geladen."

# Retry-Pass: Fehler (>=400 oder 000-Verbindungsabbruch) einmal sequenziell
# nachladen. Unter paralleler Last lehnt der Server kurzzeitig Verbindungen ab
# (fast-fail mit Code 000) — solche Blips loesen sich beim Einzel-Retry.
if [[ -s "${FAIL_LOG}" ]]; then
    mapfile -t RETRY_URLS < <(awk '{print $2}' "${FAIL_LOG}")
    : >"${FAIL_LOG}"
    echo
    echo "Retry fuer ${#RETRY_URLS[@]} Seite(n) (sequenziell)…"
    for url in "${RETRY_URLS[@]}"; do
        fetch_one "${url}"
    done
fi

if [[ -s "${FAIL_LOG}" ]]; then
    FAIL_COUNT=$(wc -l <"${FAIL_LOG}")
    echo
    echo "⚠️  ${FAIL_COUNT} Seite(n) bleiben fehlerhaft:"
    sort "${FAIL_LOG}"
    exit 1
fi

echo "✅ Alle Seiten OK."
