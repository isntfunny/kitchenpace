import { randomUUID } from 'node:crypto';

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { bodyLimit } from 'hono/body-limit';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

import type { ApiPrincipal } from './auth';
import {
    bringParams,
    bringDeleteQuery,
    bringListsSchema,
    bringListSchema,
    bringRecipeInput,
    bringTransferSchema,
} from './bring-schemas';
import {
    collectionCreateInput,
    collectionUpdateInput,
    collectionDetailSchema,
} from './collection-schemas';
import { ApiError } from './errors';
import type { Scope } from './permissions';
import {
    collectionSchema,
    cookInput,
    cookSchema,
    errorSchema,
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
    app.openapi(
        createRoute({
            method: 'get',
            path: '/collections/{id}',
            summary: 'Eigene Sammlung abrufen',
            description:
                'collections:read. recipeIds enthält nur weiterhin zugängliche Rezepte in Sammlungsreihenfolge.',
            tags: ['Sammlungen'],
            security,
            middleware: [access('collections:read')],
            request: { params },
            responses: { ...errors, 200: json(collectionDetailSchema, 'Sammlung') },
        }),
        async (c) =>
            c.json(
                collectionDetailSchema.parse(
                    await services.collection(c.get('principal'), c.req.valid('param').id),
                ),
                200,
            ),
    );
    app.openapi(
        createRoute({
            method: 'post',
            path: '/collections',
            summary: 'Private Sammlung erstellen',
            description:
                'collections:write umfasst Erstellen, Bearbeiten und Löschen. title, optionale description und bis zu 50 eindeutige recipeIds. Nur eigene oder öffentlich zugängliche Rezepte. Immer privat; Veröffentlichung erfolgt auf der Website.',
            tags: ['Sammlungen'],
            security,
            middleware: [access('collections:write')],
            request: {
                body: {
                    required: true,
                    content: { 'application/json': { schema: collectionCreateInput } },
                },
            },
            responses: { ...errors, 201: json(collectionDetailSchema, 'Private Sammlung') },
        }),
        async (c) =>
            c.json(
                collectionDetailSchema.parse(
                    await services.createCollection(c.get('principal'), c.req.valid('json')),
                ),
                201,
            ),
    );
    app.openapi(
        createRoute({
            method: 'patch',
            path: '/collections/{id}',
            summary: 'Eigene Sammlung bearbeiten',
            description:
                'collections:write. Nur angegebene Felder ändern. description: null leert die Beschreibung. recipeIds ersetzt den gesamten Sammlungsinhalt durch Rezeptkarten; [] leert ihn. Ohne recipeIds bleiben Editor-Inhalte erhalten. Änderungen setzen auch veröffentlichte Sammlungen auf privat. 409 COLLECTION_CHANGED bei gleichzeitiger Änderung; neu lesen und abgleichen.',
            tags: ['Sammlungen'],
            security,
            middleware: [access('collections:write')],
            request: {
                params,
                body: {
                    required: true,
                    content: { 'application/json': { schema: collectionUpdateInput } },
                },
            },
            responses: {
                ...errors,
                200: json(collectionDetailSchema, 'Aktualisierte private Sammlung'),
            },
        }),
        async (c) =>
            c.json(
                collectionDetailSchema.parse(
                    await services.updateCollection(
                        c.get('principal'),
                        c.req.valid('param').id,
                        c.req.valid('json'),
                    ),
                ),
                200,
            ),
    );
    app.openapi(
        createRoute({
            method: 'delete',
            path: '/collections/{id}',
            summary: 'Eigene Sammlung löschen',
            description:
                'collections:write. Löscht die eigene Sammlung samt Zuordnungen; die Rezepte bleiben erhalten.',
            tags: ['Sammlungen'],
            security,
            middleware: [access('collections:write')],
            request: { params },
            responses: { ...errors, 204: { description: 'Sammlung gelöscht' } },
        }),
        async (c) => {
            await services.deleteCollection(c.get('principal'), c.req.valid('param').id);
            return c.body(null, 204);
        },
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
                'cooks:write. Jeder POST erstellt einen neuen Kocheintrag. Keine öffentliche Aktivitätsmeldung.',
            tags: ['Gekocht'],
            security,
            middleware: [access('cooks:write')],
            request: {
                body: { required: true, content: { 'application/json': { schema: cookInput } } },
            },
            responses: { ...errors, 201: json(cookSchema, 'Kocheintrag') },
        }),
        async (c) =>
            c.json(
                cookSchema.parse(
                    await services.cook(
                        c.get('principal'),
                        c.get('requestId'),
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
                'imports:create. Jeder POST startet einen neuen Importauftrag. Genau eines von text/url. 10 Aufträge pro UTC-Tag, maximal 2 gleichzeitig je Nutzer. Immer Entwurf, ohne Bildübernahme. Unterstützt öffentliche HTML/Text-Seiten ohne JavaScript-Ausführung.',
            tags: ['Importe'],
            security,
            middleware: [access('imports:create')],
            request: {
                body: { required: true, content: { 'application/json': { schema: importInput } } },
            },
            responses: { ...errors, 202: json(importSchema, 'Importauftrag') },
        }),
        async (c) =>
            c.json(
                importSchema.parse(
                    await services.createImport(
                        c.get('principal'),
                        c.get('requestId'),
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
    app.openapi(
        createRoute({
            method: 'get',
            path: '/bring/lists',
            summary: 'Verknüpfte Bring!-Listen',
            description:
                'bring:read. Konto vorher unter /profile/integrations verknüpfen. 409 BRING_CONNECTION_REQUIRED bei fehlender oder ungültiger Verbindung.',
            tags: ['Bring!'],
            security,
            middleware: [access('bring:read')],
            responses: { ...errors, 200: json(bringListsSchema, 'Listen und Standardliste') },
        }),
        async (c) =>
            c.json(bringListsSchema.parse(await services.bringLists(c.get('principal'))), 200),
    );
    app.openapi(
        createRoute({
            method: 'get',
            path: '/bring/lists/{id}',
            summary: 'Bring!-Artikel lesen',
            description:
                'bring:read. purchase enthält offene, recently zuletzt gekaufte Artikel. name ist die Bring!-Identität, displayName der lokalisierte Name.',
            tags: ['Bring!'],
            security,
            middleware: [access('bring:read')],
            request: { params: bringParams },
            responses: { ...errors, 200: json(bringListSchema, 'Listeninhalt') },
        }),
        async (c) =>
            c.json(
                bringListSchema.parse(
                    await services.bringList(c.get('principal'), c.req.valid('param').id),
                ),
                200,
            ),
    );
    app.openapi(
        createRoute({
            method: 'post',
            path: '/bring/lists/{id}/recipes',
            summary: 'Rezeptzutaten zur Einkaufsliste hinzufügen',
            description:
                'bring:write. Eigene oder öffentlich freigegebene Rezepte. servings überschreibt die Portionszahl; ingredientIds sind IDs aus GET /recipes/{id} (ingredients[].id), sonst alle Zutaten, maximal 50. Alltagszutaten werden nicht automatisch ausgefiltert. Bestehende Artikel werden nicht überschrieben. 200 kann Teilergebnisse enthalten: added/existing/failed prüfen. Fehlgeschlagene Zutaten nach Prüfung der Liste erneut übertragen. Bei BRING_CONFLICT die Liste vor einer erneuten Übertragung prüfen.',
            tags: ['Bring!'],
            security,
            middleware: [access('bring:write')],
            request: {
                params: bringParams,
                body: {
                    required: true,
                    content: { 'application/json': { schema: bringRecipeInput } },
                },
            },
            responses: { ...errors, 200: json(bringTransferSchema, 'Ergebnis je Zutat') },
        }),
        async (c) =>
            c.json(
                bringTransferSchema.parse(
                    await services.bringRecipe(
                        c.get('principal'),
                        c.req.valid('param').id,
                        c.get('requestId'),
                        c.req.valid('json'),
                    ),
                ),
                200,
            ),
    );
    app.openapi(
        createRoute({
            method: 'delete',
            path: '/bring/lists/{id}/items',
            summary: 'Bring!-Artikel entfernen',
            description:
                'bring:write. name muss die exakte Bring!-Identität aus GET /bring/lists/{id} sein, nicht displayName oder eine Zutaten-ID. Query-Parameter URL-kodieren. Entfernt den Artikel aus offenen oder zuletzt gekauften Artikeln. 200 liefert den aktualisierten Listeninhalt; 409 BRING_CONFLICT, wenn der Artikel bereits fehlt.',
            tags: ['Bring!'],
            security,
            middleware: [access('bring:write')],
            request: { params: bringParams, query: bringDeleteQuery },
            responses: { ...errors, 200: json(bringListSchema, 'Aktualisierter Listeninhalt') },
        }),
        async (c) =>
            c.json(
                bringListSchema.parse(
                    await services.bringRemoveItem(
                        c.get('principal'),
                        c.req.valid('param').id,
                        c.req.valid('query').name,
                    ),
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
