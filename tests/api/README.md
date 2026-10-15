# Personal API checks

`npm run test:api` runs the pure policy checks without services.

Integration tests use a disposable PostgreSQL database only. They deliberately reject
URLs other than `127.0.0.1:55490/kuc90`. Create that empty database, then run:

```sh
export DATABASE_URL=postgresql://paseo@127.0.0.1:55490/kuc90
export API_TEST_DATABASE_URL="$DATABASE_URL"
npx prisma db push
npm run test:api:integration
```

The browser smoke additionally requires the app running with that same database at
`http://localhost:3109`, a disposable Redis instance, and a local Better Auth secret
and URL. Set `API_TEST_CHROMIUM_PATH` if Playwright's default browser is unavailable,
then run `npm run test:api:browser`. It creates and removes a test user. It expects
a Next dev build to inspect the registered Server Action identifiers.

Tests use the real Better Auth plugin, Prisma and Hono. AI/network calls in processor
tests are injected: these checks never spend AI credits or call production services.
The browser test checks account key lifecycle, real HTTP authorization, private
metadata and rendered documentation. Full application E2E tests remain separate.

Bring API tests use real Hono/Better Auth and PostgreSQL, replacing the external
Bring gateway. Run `npm run test:bring` for the shared transfer/receipt tests,
including recovery after uncertain writes and rejection of changed recipe requests.
The browser smoke also checks the Bring read scope and a disconnected account
through the actual production service, without sending requests to Bring.
