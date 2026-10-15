/** Pure, conservative resolution of recipe-specific ingredient references. */
export interface MentionIngredient {
    id: string;
    ingredientId?: string;
    name: string;
    aliases?: string[];
    amount?: string;
    unit?: string;
    notes?: string | null;
}

export interface MentionNode {
    id: string;
    description?: string;
    ingredientIds?: string[];
}

export interface MentionIssue {
    nodeId: string;
    reference: string;
    name?: string;
    reason: 'missing' | 'ambiguous' | 'multiple-source-ids';
}

export const mentionPattern = () => /@\[(.*?)(?:\|(.*?))?\]\((.*?)\)/g;
const normalize = (value: string) => value.trim().normalize('NFC').toLocaleLowerCase('de');
const names = (row: MentionIngredient) => [row.name, ...(row.aliases ?? [])];
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function repairIngredientMentions<T extends MentionNode>(
    nodes: T[],
    ingredients: MentionIngredient[],
    sourceIds: ReadonlyMap<string, string> = new Map(),
    options: { allowNameFallback?: boolean } = {},
): { nodes: T[]; issues: MentionIssue[] } {
    const rows = new Map(ingredients.map((row) => [row.id, row]));
    const issues: MentionIssue[] = [];
    // Two distinct orphan IDs with the same name may be collapsed occurrences
    // with different amounts. A name match alone cannot recover that information.
    const orphanIdsByName = new Map<string, Set<string>>();
    const nameKey = (name: string) => {
        const candidates = ingredients.filter((row) =>
            names(row).some((variant) => normalize(variant) === normalize(name)),
        );
        return candidates.length === 1 ? normalize(candidates[0].name) : normalize(name);
    };
    for (const node of nodes) {
        for (const match of (node.description ?? '').matchAll(mentionPattern())) {
            const [, name, , id] = match;
            const key = nameKey(name);
            const ids = orphanIdsByName.get(key) ?? new Set<string>();
            ids.add(id);
            orphanIdsByName.set(key, ids);
        }
        for (const id of node.ingredientIds ?? []) {
            const row =
                rows.get(id) ?? ingredients.find((ingredient) => ingredient.ingredientId === id);
            if (!row) continue;
            const key = nameKey(row.name);
            const ids = orphanIdsByName.get(key) ?? new Set<string>();
            ids.add(id);
            orphanIdsByName.set(key, ids);
        }
    }

    const resolve = (id: string, name: string | undefined, nodeId: string) => {
        const direct = rows.get(sourceIds.get(id) ?? id);
        if (direct) return direct;
        const catalogue = ingredients.filter((row) => row.ingredientId === id);
        if (catalogue.length === 1) return catalogue[0];
        if (catalogue.length > 1) {
            issues.push({ nodeId, reference: id, name, reason: 'ambiguous' });
            return undefined;
        }
        if (name && (orphanIdsByName.get(nameKey(name))?.size ?? 0) > 1) {
            issues.push({ nodeId, reference: id, name, reason: 'multiple-source-ids' });
            return undefined;
        }
        const matches =
            name && options.allowNameFallback !== false
                ? ingredients.filter((row) =>
                      names(row).some((n) => normalize(n) === normalize(name)),
                  )
                : [];
        if (matches.length === 1) return matches[0];
        issues.push({
            nodeId,
            reference: id,
            name,
            reason: matches.length ? 'ambiguous' : 'missing',
        });
        return undefined;
    };

    const repaired = nodes.map((node) => {
        const resolved = new Set<string>();
        const bindings = new Map<string, string>();
        const unresolved = new Set<string>();
        let description = (node.description ?? '').replace(
            mentionPattern(),
            (full, name: string, override: string | undefined, id: string) => {
                const row = resolve(id, name, node.id);
                if (!row) {
                    unresolved.add(id);
                    return full;
                }
                bindings.set(id, row.id);
                resolved.add(row.id);
                // An explicit source mapping also covers an intentionally replaced ingredient.
                const label = sourceIds.has(id) ? row.name : name;
                return `@[${label}${override !== undefined ? `|${override}` : ''}](${row.id})`;
            },
        );
        for (const id of node.ingredientIds ?? []) {
            if (resolved.has(id) || unresolved.has(id)) continue;
            // A mention already resolved an orphan ID by its embedded name.
            const mention = [...(node.description ?? '').matchAll(mentionPattern())].find(
                (m) => m[3] === id,
            );
            if (mention) continue;
            const row = resolve(id, undefined, node.id);
            if (!row) {
                unresolved.add(id);
                continue;
            }
            bindings.set(id, row.id);
            resolved.add(row.id);
            if ([...description.matchAll(mentionPattern())].some((m) => m[3] === row.id)) continue;
            // Only annotate plain text explicitly attributed to this step. Leave
            // existing mentions and unrelated occurrences (e.g. extra flour) alone.
            const variants = names(row)
                .filter(Boolean)
                .sort((a, b) => b.length - a.length);
            const re = new RegExp(
                `(?<![\\p{L}\\p{N}])(${variants.map(escape).join('|')})(?![\\p{L}\\p{N}])`,
                'iu',
            );
            let inserted = false;
            description = description
                .split(/(@\[.*?\]\(.*?\))/g)
                .map((part) => {
                    if (inserted || part.startsWith('@[')) return part;
                    return part.replace(re, (name) => {
                        inserted = true;
                        return `@[${name}](${row.id})`;
                    });
                })
                .join('');
        }
        const result = { ...node };
        if (node.description !== undefined) result.description = description;
        if (node.ingredientIds !== undefined || resolved.size > 0) {
            // Preserve the caller's reference order. Newly inserted mentions may
            // appear earlier in the prose; rescanning must not reorder the list.
            const ordered = new Set<string>();
            for (const id of node.ingredientIds ?? []) {
                const bound =
                    bindings.get(id) ?? (resolved.has(id) || unresolved.has(id) ? id : undefined);
                if (bound) ordered.add(bound);
            }
            result.ingredientIds = [...new Set([...ordered, ...resolved, ...unresolved])];
        }
        return result;
    });
    return { nodes: repaired, issues };
}

export function assertResolvedMentions(issues: MentionIssue[]) {
    if (issues.length) {
        throw new Error(
            `Zutatenverweise konnten nicht eindeutig zugeordnet werden: ${issues.map((i) => i.name ?? i.reference).join(', ')}. Bitte die betroffenen Zutaten im Schritt neu auswählen.`,
        );
    }
}

/** Explicit user removal keeps the prose/overrides but removes the dead link. */
export function removeIngredientReferences<T extends MentionNode>(
    nodes: T[],
    removedIds: Set<string>,
): T[] {
    return nodes.map((node) => ({
        ...node,
        ...(node.description !== undefined
            ? {
                  description: node.description.replace(
                      mentionPattern(),
                      (full, name: string, override: string | undefined, id: string) =>
                          removedIds.has(id) ? `${name}${override ? ` (${override})` : ''}` : full,
                  ),
              }
            : {}),
        ...(node.ingredientIds
            ? { ingredientIds: node.ingredientIds.filter((id) => !removedIds.has(id)) }
            : {}),
    }));
}

/** Flow-only import intentionally retains the existing ingredient list. */
export function bindFlowToExistingIngredients<T extends MentionNode>(
    nodes: T[],
    imported: { id: string; name: string }[],
    existing: MentionIngredient[],
): T[] {
    const mappings = new Map<string, string>();
    const unselected = new Set<string>();
    for (const ingredient of imported) {
        const candidates = existing.filter((row) =>
            names(row).some((name) => normalize(name) === normalize(ingredient.name)),
        );
        const sameName = imported.filter(
            (row) => normalize(row.name) === normalize(ingredient.name),
        );
        if (candidates.length === 1 && sameName.length === 1)
            mappings.set(ingredient.id, candidates[0].id);
        else unselected.add(ingredient.id);
    }
    const selectedNodes = removeIngredientReferences(nodes, unselected);
    return repairIngredientMentions(selectedNodes, existing, mappings, { allowNameFallback: false })
        .nodes;
}
