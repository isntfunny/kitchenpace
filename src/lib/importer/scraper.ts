/**
 * Scrapling service client — reusable from both Next.js server actions and CLI.
 * No Next.js dependencies.
 */

export interface ScrapedContent {
    url: string;
    markdown: string;
    title?: string;
    imageUrl?: string;
}

const SCRAPLER_TIMEOUT_MS = 120_000;

function getScraplerBaseUrl(): string {
    return process.env.SCRAPLER_URL || 'http://localhost:64001';
}

/**
 * Scrapes a URL via the Scrapling service and returns markdown + metadata.
 */
export async function scrapeRecipe(url: string): Promise<ScrapedContent> {
    try {
        new URL(url);
    } catch {
        throw new Error('Ungültige URL. Bitte gib eine vollständige URL ein.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SCRAPLER_TIMEOUT_MS);

    try {
        const response = await fetch(`${getScraplerBaseUrl()}/api/scrape`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url,
                mode: 'stealthy-fetch',
                timeout: 90,
                wait_for_network_idle: true,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const body = await response.text();
            console.error('Scraping failed:', response.status, body);

            if (response.status === 404) {
                throw new Error('Rezept nicht gefunden. Bitte URL prüfen.');
            }
            if (response.status === 429) {
                throw new Error('Zu viele Anfragen. Bitte später erneut versuchen.');
            }
            throw new Error(
                `Scraping fehlgeschlagen (${response.status}). Bitte eine andere URL versuchen.`,
            );
        }

        const data = await response.json();

        return {
            url,
            markdown: data.markdown || '',
            title: data.title,
            imageUrl: data.image_url,
        };
    } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                throw new Error('Zeitüberschreitung beim Laden der Seite. Bitte erneut versuchen.');
            }
            throw error;
        }

        throw new Error('Scraping fehlgeschlagen. Bitte URL prüfen und erneut versuchen.');
    }
}

/** Checks whether the Scrapling service is reachable. */
export async function checkScraplerHealth(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${getScraplerBaseUrl()}/health`, {
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response.ok;
    } catch {
        return false;
    }
}
