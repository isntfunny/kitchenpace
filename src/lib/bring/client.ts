import { z } from 'zod';

import type { BringCredentials, BringItems, BringList, BringOperation } from './types';

const BASE = 'https://api.getbring.com/rest/v2/';
const itemSchema = z.object({ name: z.string(), specification: z.string().default('') });
const listsSchema = z.object({
    lists: z.array(z.object({ listUuid: z.string(), name: z.string() })),
});
const itemsSchema = z.object({ purchase: z.array(itemSchema), recently: z.array(itemSchema) });

export class BringError extends Error {
    constructor(
        public readonly code:
            | 'AUTH'
            | 'UNAVAILABLE'
            | 'INVALID_RESPONSE'
            | 'FORBIDDEN'
            | 'CONFIG'
            | 'CONFLICT',
        message: string,
    ) {
        super(message);
    }
}

/** Narrow adapter for the endpoints used by discord-timeout-game. Never expose upstream bodies. */
export class BringClient {
    private constructor(
        private readonly uuid: string,
        private readonly token: string,
        private readonly request: typeof fetch,
    ) {}

    static async login(
        credentials: BringCredentials,
        request: typeof fetch = fetch,
    ): Promise<BringClient> {
        const response = await BringClient.send(
            'bringauth',
            {
                method: 'POST',
                body: new URLSearchParams({
                    email: credentials.email,
                    password: credentials.password,
                }),
            },
            request,
        );
        const parsed = z
            .object({ uuid: z.string().min(1), access_token: z.string().min(1) })
            .safeParse(await response.json().catch(() => null));
        if (!parsed.success)
            throw new BringError(
                'AUTH',
                'Bring!-Anmeldung fehlgeschlagen. Bitte prüfe deine Zugangsdaten.',
            );
        return new BringClient(parsed.data.uuid, parsed.data.access_token, request);
    }

    private static async send(
        path: string,
        init: RequestInit,
        request: typeof fetch,
    ): Promise<Response> {
        let response: Response;
        try {
            response = await request(BASE + path, {
                ...init,
                cache: 'no-store',
                signal: AbortSignal.timeout(8000),
            });
        } catch {
            throw new BringError(
                'UNAVAILABLE',
                'Bring! ist gerade nicht erreichbar. Bitte versuche es erneut.',
            );
        }
        if (response.status === 401 || response.status === 403)
            throw new BringError('AUTH', 'Bitte verbinde dein Bring!-Konto erneut.');
        if (!response.ok)
            throw new BringError(
                'UNAVAILABLE',
                'Bring! konnte die Anfrage nicht ausführen. Bitte aktualisiere die Liste.',
            );
        return response;
    }

    private async send(path: string, init: RequestInit = {}) {
        return BringClient.send(
            path,
            {
                ...init,
                headers: {
                    // Public web-client identifier used by bring-shopping (not an account credential).
                    'X-BRING-API-KEY': 'cof4Nc6D8saplXjE3h3HXqHH8m7VU2i1Gs0g85Sp',
                    'X-BRING-CLIENT': 'webApp',
                    'X-BRING-CLIENT-SOURCE': 'webApp',
                    'X-BRING-COUNTRY': 'DE',
                    'X-BRING-USER-UUID': this.uuid,
                    Authorization: `Bearer ${this.token}`,
                    ...init.headers,
                },
            },
            this.request,
        );
    }

    async lists(): Promise<BringList[]> {
        const response = await this.send(`bringusers/${encodeURIComponent(this.uuid)}/lists`);
        const parsed = listsSchema.safeParse(await response.json().catch(() => null));
        if (!parsed.success)
            throw new BringError('INVALID_RESPONSE', 'Bring!-Listen konnten nicht gelesen werden.');
        return parsed.data.lists;
    }

    async items(listUuid: string): Promise<BringItems> {
        const response = await this.send(`bringlists/${encodeURIComponent(listUuid)}`);
        const parsed = itemsSchema.safeParse(await response.json().catch(() => null));
        if (!parsed.success)
            throw new BringError(
                'INVALID_RESPONSE',
                'Die Bring!-Liste konnte nicht gelesen werden.',
            );
        return parsed.data;
    }

    async write(
        listUuid: string,
        operation: BringOperation,
        name: string,
        specification: string,
    ): Promise<void> {
        await this.send(`bringlists/${encodeURIComponent(listUuid)}`, {
            method: 'PUT',
            body: new URLSearchParams({
                purchase: operation === 'add' ? name : '',
                recently: operation === 'complete' ? name : '',
                remove: operation === 'remove' ? name : '',
                specification,
                sender: 'null',
            }),
        });
    }
}
