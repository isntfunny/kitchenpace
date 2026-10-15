import { z } from 'zod';

export const SCOPES = [
    'recipes:read',
    'favorites:read',
    'collections:read',
    'cooks:read',
    'favorites:write',
    'cooks:write',
    'imports:create',
    'bring:read',
    'bring:write',
] as const;
export type Scope = (typeof SCOPES)[number];
export const SCOPE_LABELS: Record<Scope, string> = {
    'recipes:read': 'Rezepte lesen (einschließlich eigener Entwürfe)',
    'favorites:read': 'Favoriten lesen',
    'collections:read': 'Eigene Sammlungen lesen',
    'cooks:read': 'Eigene Kochhistorie lesen',
    'favorites:write': 'Favoriten setzen und entfernen',
    'cooks:write': 'Als gekocht eintragen',
    'imports:create': 'KI-Importe erstellen und abrufen',
    'bring:read': 'Bring!-Listen und Artikel lesen',
    'bring:write': 'Rezeptzutaten zu Bring!-Listen hinzufügen',
};
export const keyInputSchema = z
    .object({
        name: z.string().trim().min(1).max(60),
        days: z
            .union([z.literal(30), z.literal(90), z.literal(365)])
            .nullable()
            .default(90),
        scopes: z.array(z.enum(SCOPES)).min(1).max(SCOPES.length).default(['recipes:read']),
    })
    .strict();
export function permissionsForScopes(scopes: readonly Scope[]): Record<string, string[]> {
    const permissions: Record<string, string[]> = {};
    for (const scope of new Set(scopes)) {
        const [resource, action] = scope.split(':');
        (permissions[resource] ??= []).push(action);
    }
    return permissions;
}
