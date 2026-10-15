import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isTurnstileCspProbe } from '../../e2e/turnstile-console';

const message =
    "Fetch API cannot load data:,. Refused to connect because it violates the document's Content Security Policy.";
const source =
    'https://challenges.cloudflare.com/cdn-cgi/challenge-platform/h/b/turnstile/f/example';

test('recognizes the observed Turnstile frame CSP probe', () => {
    assert.equal(isTurnstileCspProbe(message, source), true);
});
test('retains app errors, unknown origins, and other Turnstile errors', () => {
    for (const url of [
        '',
        'https://beta.xn--kchentakt-q9a.de/auth/register',
        source.replace('.com/', '.com.evil.test/'),
        source.replace('https:', 'http:'),
        'https://challenges.cloudflare.com/other',
    ]) {
        assert.equal(isTurnstileCspProbe(message, url), false);
    }
    assert.equal(isTurnstileCspProbe('Unexpected registration error', source), false);
    assert.equal(
        isTurnstileCspProbe(message.replace('data:,', 'https://example.com'), source),
        false,
    );
});
