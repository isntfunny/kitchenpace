/** Only the observed CSP probe inside Cloudflare's Turnstile frame. */
export function isTurnstileCspProbe(text: string, sourceUrl: string): boolean {
    if (
        text !==
        "Fetch API cannot load data:,. Refused to connect because it violates the document's Content Security Policy."
    )
        return false;
    try {
        const source = new URL(sourceUrl);
        return (
            source.origin === 'https://challenges.cloudflare.com' &&
            /^\/cdn-cgi\/challenge-platform\/[^/]+\/[^/]+\/turnstile\//.test(source.pathname)
        );
    } catch {
        return false;
    }
}
