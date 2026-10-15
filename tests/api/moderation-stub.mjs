/** Local-only fixture for browser-smoke.ts. Start before Next with:
 * OPENAI_API_KEY=local-disposable-stub OPENAI_BASE_URL=http://127.0.0.1:3110/v1
 * Never use this fixture or these settings outside disposable local tests.
 */
import { createServer } from 'node:http';

createServer((request, response) => {
    request.resume();
    if (request.method !== 'POST' || request.url !== '/v1/moderations') {
        response.writeHead(404).end();
        return;
    }
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(
        JSON.stringify({
            id: 'local-test',
            model: 'omni-moderation-latest',
            results: [
                {
                    flagged: false,
                    categories: {},
                    category_scores: {},
                    category_applied_input_types: {},
                },
            ],
        }),
    );
}).listen(3110, '127.0.0.1');
