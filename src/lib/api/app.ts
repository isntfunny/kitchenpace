import { randomUUID } from 'node:crypto';

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { bodyLimit } from 'hono/body-limit';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

import type { ApiPrincipal } from './auth';
import { ApiError } from './errors';
import type { Scope } from './permissions';
import {
    collectionSchema,
    cookInput,
    cookSchema,
    errorSchema,
    idempotencyHeaders,
    idSchema,
    importInput,
    importSchema,
    pageOf,
    pageQuery,
    recipeDetail,
    recipeSummary,
} from './schemas';
import type { ApiServices } from './services';

type Env = { Variables: { principal: ApiPrincipal; requestId: string } };
export interface ApiDependencies {
    services: ApiServices;
    authenticate: (request: Request, scope: Scope) => Promise<ApiPrincipal>;
}
const json = (schema: z.ZodType, description: string) => ({
    description,
    content: { 'application/json': { schema } },
});
const errors = Object.fromEntries(
    [400, 401, 403, 404, 409, 413, 429, 500, 503].map((status) => [
        status,
        json(errorSchema, `HTTP ${status}`),
    ]),
);
const security = [{ ApiKey: [] }];
const params = z.object({ id: idSchema });

export function createApiApp({ services, authenticate }: ApiDependencies) {
    const app = new OpenAPIHono<Env>({
        defaultHook: (result) => {
            if (!result.success) throw new ApiError(400, 'INVALID_REQUEST');
        },
    }).basePath('/api/v1');
    app.openAPIRegistry.registerComponent('securitySchemes', 'ApiKey', {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
    });
    app.use('*', async (c, next) => {
        const requestId = randomUUID();
        c.set('requestId', requestId);
        c.header('X-Request-ID', requestId);
        c.header('Cache-Control', 'private, no-store');
        c.header('X-Content-Type-Options', 'nosniff');
        await next();
    });
    app.use(
        '*',
        bodyLimit({
            maxSize: 256_000,
            onError: () => {
                throw new ApiError(413, 'BODY_TOO_LARGE');
            },
        }),
    );
    app.onError((err, c) => {
        const status =
            err instanceof ApiError
                ? err.status
                : err instanceof HTTPException && err.status === 400
                  ? 400
                  : 500;
        const code =
            err instanceof ApiError
                ? err.code
                : status === 400
                  ? 'INVALID_REQUEST'
                  : 'INTERNAL_ERROR';
        if (status === 429)
            c.header(
                'Retry-After',
                code === 'IMPORT_DAILY_LIMIT'
                    ? String(Math.ceil((86400000 - (Date.now() % 86400000)) / 1000))
                    : '60',
            );
        if (status === 500)
            console.error(
                '[Personal API]',
                c.get('requestId'),
                err instanceof Error ? err.name : 'UnknownError',
            );
        return c.json({ error: { code, message: code, requestId: c.get('requestId') } }, status);
    });
    app.notFound((c) =>
        c.json(
            { error: { code: 'NOT_FOUND', message: 'NOT_FOUND', requestId: c.get('requestId') } },
            404,
        ),
    );
    const access = (scope: Scope) =>
        createMiddleware<Env>(async (c, next) => {
            c.set('principal', await authenticate(c.req.raw, scope));
            await next();
        });
    const recipesPage = pageOf(recipeSummary);
    app.openapi(
        createRoute({
            method: 'get',
            path: '/recipes',
            summary: 'Eigene Rezepte einschließlich Entwürfen',
            tags: ['Rezepte'],
            security,
            middleware: [access('recipes:read')],
            request: { query: pageQuery },
            responses: { ...errors, 200: json(recipesPage, 'Rezepte') },
        }),
        async (c) =>
            c.json(
                recipesPage.parse(await services.recipes(c.get('principal'), c.req.valid('query'))),
                200,
            ),
    );
    app.openapi(
        createRoute({
            method: 'get',
            path: '/recipes/{id}',
            summary: 'Eigenes oder öffentliches Rezept abrufen',
            tags: ['Rezepte'],
            security,
            middleware: [access('recipes:read')],
            request: { params },
            responses: { ...errors, 200: json(recipeDetail, 'Rezept') },
        }),
        async (c) =>
            c.json(
                recipeDetail.parse(
                    await services.recipe(c.get('principal'), c.req.valid('param').id),
                ),
                200,
            ),
    );
    app.openapi(
        createRoute({
            method: 'get',
            path: '/favorites',
            summary: 'Eigene Favoriten',
            tags: ['Favoriten'],
            security,
            middleware: [access('favorites:read')],
            request: { query: pageQuery },
            responses: { ...errors, 200: json(recipesPage, 'Favoriten') },
        }),
        async (c) =>
            c.json(
                recipesPage.parse(
                    await services.favorites(c.get('principal'), c.req.valid('query')),
                ),
                200,
            ),
    );
    const favoriteResult = z.object({ favorite: z.boolean() });
    for (const method of ['put', 'delete'] as const) {
        app.openapi(
            createRoute({
                method,
                path: '/favorites/{id}',
                summary: method === 'put' ? 'Favorit setzen' : 'Favorit entfernen',
                tags: ['Favoriten'],
                security,
                middleware: [access('favorites:write')],
                request: { params },
                responses: { ...errors, 200: json(favoriteResult, 'Favoritenstatus') },
            }),
            async (c) =>
                c.json(
                    await services.favorite(
                        c.get('principal'),
                        c.req.valid('param').id,
                        method === 'put',
                    ),
                    200,
                ),
        );
    }
    const collectionsPage = pageOf(collectionSchema);
    app.openapi(
        createRoute({
            method: 'get',
            path: '/collections',
            summary: 'Eigene Sammlungen',
            tags: ['Sammlungen'],
            security,
            middleware: [access('collections:read')],
            request: { query: pageQuery },
            responses: { ...errors, 200: json(collectionsPage, 'Sammlungen') },
        }),
        async (c) =>
            c.json(
                collectionsPage.parse(
                    await services.collections(c.get('principal'), c.req.valid('query')),
                ),
                200,
            ),
    );
    app.openapi(
        createRoute({
            method: 'get',
            path: '/collections/{id}/recipes',
            summary: 'Zugängliche Rezepte einer eigenen Sammlung',
            tags: ['Sammlungen'],
            security,
            middleware: [access('collections:read')],
            request: { params, query: pageQuery },
            responses: { ...errors, 200: json(recipesPage, 'Rezepte') },
        }),
        async (c) =>
            c.json(
                recipesPage.parse(
                    await services.collectionRecipes(
                        c.get('principal'),
                        c.req.valid('param').id,
                        c.req.valid('query'),
                    ),
                ),
                200,
            ),
    );
    const cooksPage = pageOf(cookSchema);
    app.openapi(
        createRoute({
            method: 'get',
            path: '/cooks',
            summary: 'Eigene Kochhistorie',
            tags: ['Gekocht'],
            security,
            middleware: [access('cooks:read')],
            request: { query: pageQuery },
            responses: { ...errors, 200: json(cooksPage, 'Kochhistorie') },
        }),
        async (c) =>
            c.json(
                cooksPage.parse(await services.cooks(c.get('principal'), c.req.valid('query'))),
                200,
            ),
    );
    app.openapi(
        createRoute({
            method: 'post',
            path: '/cooks',
            summary: 'Als gekocht eintragen',
            description:
                'cooks:write. Idempotency-Key pro Kochvorgang; Wiederholung liefert denselben Eintrag. Keine öffentliche Aktivitätsmeldung.',
            tags: ['Gekocht'],
            security,
            middleware: [access('cooks:write')],
            request: {
                headers: idempotencyHeaders,
                body: { required: true, content: { 'application/json': { schema: cookInput } } },
            },
            responses: { ...errors, 201: json(cookSchema, 'Kocheintrag') },
        }),
        async (c) =>
            c.json(
                cookSchema.parse(
                    await services.cook(
                        c.get('principal'),
                        c.req.valid('header')['idempotency-key'],
                        c.req.valid('json'),
                    ),
                ),
                201,
            ),
    );
    app.openapi(
        createRoute({
            method: 'post',
            path: '/imports',
            summary: 'Privaten KI-Import starten',
            description:
                'imports:create. Genau eines von text/url. 10 Aufträge pro UTC-Tag, maximal 2 gleichzeitig je Nutzer. Immer Entwurf, ohne Bildübernahme. Unterstützt öffentliche HTML/Text-Seiten ohne JavaScript-Ausführung.',
            tags: ['Importe'],
            security,
            middleware: [access('imports:create')],
            request: {
                headers: idempotencyHeaders,
                body: { required: true, content: { 'application/json': { schema: importInput } } },
            },
            responses: { ...errors, 202: json(importSchema, 'Importauftrag') },
        }),
        async (c) =>
            c.json(
                importSchema.parse(
                    await services.createImport(
                        c.get('principal'),
                        c.req.valid('header')['idempotency-key'],
                        c.req.valid('json'),
                    ),
                ),
                202,
            ),
    );
    app.openapi(
        createRoute({
            method: 'get',
            path: '/imports/{id}',
            summary: 'Eigenen Importstatus abrufen',
            tags: ['Importe'],
            security,
            middleware: [access('imports:create')],
            request: { params },
            responses: { ...errors, 200: json(importSchema, 'Importstatus') },
        }),
        async (c) =>
            c.json(
                importSchema.parse(
                    await services.importStatus(c.get('principal'), c.req.valid('param').id),
                ),
                200,
            ),
    );
    app.doc('/openapi.json', {
        openapi: '3.0.3',
        info: {
            title: 'KüchenTakt API',
            version: '1.0.0',
            description:
                'Persönliche Integrationen. API-Key im Account erstellen. Rechte werden pro Endpoint geprüft; keine Veröffentlichung oder Accountverwaltung per API.',
        },
    });
    return app;
}
