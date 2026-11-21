/**
 * Evaluation of an OpenAI answer (KUC-115): JSON, Zod schema, flow structure
 * and ingredient mentions. Used by the direct import (with one repair round)
 * and by the Batch refresh, so both judge an answer the same way.
 */

import type { ZodType } from 'zod';

import { malformedMentions, parseMentions } from './import-mentions';
import {
    ImportedFlowSchema,
    ImportedRecipeSchema,
    type ImportedFlow,
    type ImportedFlowEdge,
    type ImportedFlowNode,
    type ImportedRecipe,
} from './openai-recipe-schema';
import type { ErrorType } from './types';

export interface ValidationDetail {
    path: string;
    message: string;
}

export type Evaluation<T> =
    | { ok: true; data: T; warnings: string[] }
    | {
          ok: false;
          errorType: ErrorType;
          message: string;
          details: ValidationDetail[];
          /**
           * True when only problems remain that are accepted as warnings after
           * the last attempt (unknown mention ids, malformed mentions). Every
           * problem triggers the repair round either way.
           */
          soft: boolean;
          /** Parsed data, set when only soft problems remain */
          data?: T;
      };

// ─────────────────────────────────────────────────────────────────────────────
// Flow structure
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Structure of the flow: exactly one start and one servieren node, unique ids,
 * edges reference existing nodes, every node has in/out edges as required,
 * everything reachable from start and leading to servieren, no cycles.
 */
export function validateFlowGraph(nodes: ImportedFlowNode[], edges: ImportedFlowEdge[]): string[] {
    const issues: string[] = [];

    const starts = nodes.filter((n) => n.type === 'start');
    const serves = nodes.filter((n) => n.type === 'servieren');
    if (starts.length === 0) issues.push('Kein Start-Knoten gefunden (type "start")');
    if (starts.length > 1) issues.push('Mehrere Start-Knoten gefunden');
    if (serves.length === 0) issues.push('Kein Servieren-Knoten gefunden (type "servieren")');
    if (serves.length > 1) issues.push('Mehrere Servieren-Knoten gefunden');

    const ids = new Set<string>();
    for (const node of nodes) {
        if (ids.has(node.id)) issues.push(`Knoten-id "${node.id}" kommt mehrfach vor`);
        ids.add(node.id);
    }

    const outgoing = new Map<string, string[]>();
    const incoming = new Map<string, string[]>();
    for (const edge of edges) {
        if (!ids.has(edge.source))
            issues.push(`Kante ${edge.source} → ${edge.target}: Quellknoten existiert nicht`);
        if (!ids.has(edge.target))
            issues.push(`Kante ${edge.source} → ${edge.target}: Zielknoten existiert nicht`);
        if (edge.source === edge.target)
            issues.push(`Kante ${edge.source} → ${edge.target} zeigt auf sich selbst`);
        outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
        incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge.source]);
    }

    for (const node of nodes) {
        if (node.type !== 'start' && !incoming.get(node.id)?.length)
            issues.push(`Knoten "${node.label}" (${node.id}) hat keine eingehende Kante`);
        if (node.type !== 'servieren' && !outgoing.get(node.id)?.length)
            issues.push(`Knoten "${node.label}" (${node.id}) hat keine ausgehende Kante`);
    }

    const reach = (from: string, adjacency: Map<string, string[]>) => {
        const seen = new Set<string>();
        const queue = [from];
        while (queue.length > 0) {
            const current = queue.shift()!;
            if (seen.has(current)) continue;
            seen.add(current);
            queue.push(...(adjacency.get(current) ?? []));
        }
        return seen;
    };
    if (starts.length > 0) {
        const fromStart = reach(starts[0].id, outgoing);
        for (const node of nodes)
            if (!fromStart.has(node.id))
                issues.push(`Knoten "${node.label}" (${node.id}) ist nicht vom Start erreichbar`);
    }
    if (serves.length > 0) {
        const toServe = reach(serves[0].id, incoming);
        for (const node of nodes)
            if (!toServe.has(node.id))
                issues.push(`Von Knoten "${node.label}" (${node.id}) führt kein Weg zum Servieren`);
    }

    if (hasCycle(nodes, outgoing)) issues.push('Der Ablauf enthält einen Zyklus');
    return issues;
}

function hasCycle(nodes: ImportedFlowNode[], outgoing: Map<string, string[]>): boolean {
    const done = new Set<string>();
    const stack = new Set<string>();
    const visit = (id: string): boolean => {
        if (stack.has(id)) return true;
        if (done.has(id)) return false;
        stack.add(id);
        for (const next of outgoing.get(id) ?? []) if (visit(next)) return true;
        stack.delete(id);
        done.add(id);
        return false;
    };
    return nodes.some((node) => visit(node.id));
}

// ─────────────────────────────────────────────────────────────────────────────
// Mentions
// ─────────────────────────────────────────────────────────────────────────────

export interface MentionCheck {
    /** Mentions whose id is not in the ingredient list (soft: become plain text) */
    unknown: ValidationDetail[];
    /** `@[` that is no valid mention (soft) */
    malformed: ValidationDetail[];
    /** Ingredients never mentioned (hard) */
    unmentioned: ValidationDetail[];
}

export function checkMentions(
    nodes: ImportedFlowNode[],
    ingredients: { id: string; name: string }[],
): MentionCheck {
    const known = new Set(ingredients.map((i) => i.id));
    const mentioned = new Set<string>();
    const result: MentionCheck = { unknown: [], malformed: [], unmentioned: [] };
    for (const node of nodes) {
        for (const mention of parseMentions(node.description)) {
            if (known.has(mention.id)) mentioned.add(mention.id);
            else
                result.unknown.push({
                    path: `nodes.${node.id}`,
                    message: `Erwähnung "${mention.full}" verweist auf eine id, die nicht in der Zutatenliste steht`,
                });
        }
        for (const snippet of malformedMentions(node.description))
            result.malformed.push({
                path: `nodes.${node.id}`,
                message: `"${snippet}" ist keine gültige Erwähnung (Form @[Text](id) oder @[Text|Teilmenge](id))`,
            });
    }
    for (const ing of ingredients)
        if (!mentioned.has(ing.id))
            result.unmentioned.push({
                path: `ingredients.${ing.id}`,
                message: `Zutat "${ing.name}" (${ing.id}) wird in keinem Schritt erwähnt`,
            });
    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Evaluation of a whole answer
// ─────────────────────────────────────────────────────────────────────────────

function parseAndValidate<T>(
    content: string | null | undefined,
    schema: ZodType<T>,
): Evaluation<T> | { ok: true; data: T } {
    if (!content?.trim()) {
        return {
            ok: false,
            errorType: 'EMPTY_RESPONSE',
            message: 'OpenAI hat keine Antwort zurückgegeben',
            details: [{ path: '', message: 'leere Antwort' }],
            soft: false,
        };
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(content);
    } catch (error) {
        return {
            ok: false,
            errorType: 'JSON_PARSE_ERROR',
            message: 'OpenAI-Antwort ist kein gültiges JSON',
            details: [{ path: '', message: error instanceof Error ? error.message : 'ungültig' }],
            soft: false,
        };
    }
    const result = schema.safeParse(parsed);
    if (!result.success) {
        return {
            ok: false,
            errorType: 'VALIDATION_ERROR',
            message: 'Validierung der Rezeptdaten fehlgeschlagen',
            details: result.error.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
            })),
            soft: false,
        };
    }
    return { ok: true, data: result.data };
}

function evaluateFlow<T>(
    data: T,
    nodes: ImportedFlowNode[],
    edges: ImportedFlowEdge[],
    ingredients: { id: string; name: string }[],
    extra: ValidationDetail[] = [],
): Evaluation<T> {
    const structure = validateFlowGraph(nodes, edges).map((message) => ({
        path: 'flow',
        message,
    }));
    if (structure.length > 0) {
        return {
            ok: false,
            errorType: 'FLOW_VALIDATION_ERROR',
            message: `Flow-Validierung fehlgeschlagen: ${structure.length} Problem(e)`,
            details: structure,
            soft: false,
        };
    }
    const mentions = checkMentions(nodes, ingredients);
    const hard = [...extra, ...mentions.unmentioned];
    const soft = [...mentions.unknown, ...mentions.malformed];
    if (hard.length > 0 || soft.length > 0) {
        return {
            ok: false,
            errorType: 'MENTION_VALIDATION_ERROR',
            message: `Zutaten-Erwähnungen fehlerhaft: ${hard.length + soft.length} Problem(e)`,
            details: [...hard, ...soft],
            soft: hard.length === 0,
            data,
        };
    }
    return { ok: true, data, warnings: [] };
}

/** Full import answer: schema, flow structure, mentions against its own ingredient list. */
export function evaluateImportContent(
    content: string | null | undefined,
): Evaluation<ImportedRecipe> {
    const parsed = parseAndValidate(content, ImportedRecipeSchema);
    if (!parsed.ok) return parsed;
    const data = parsed.data;
    const seen = new Set<string>();
    const duplicates: ValidationDetail[] = [];
    for (const ing of data.ingredients) {
        if (seen.has(ing.id))
            duplicates.push({
                path: `ingredients.${ing.id}`,
                message: `Zutaten-id "${ing.id}" kommt mehrfach vor`,
            });
        seen.add(ing.id);
    }
    return evaluateFlow(data, data.nodes, data.edges, data.ingredients, duplicates);
}

/** Flow-only answer of the refresh, checked against the fixed ingredient list. */
export function evaluateFlowOnlyContent(
    content: string | null | undefined,
    ingredients: { id: string; name: string }[],
): Evaluation<ImportedFlow> {
    const parsed = parseAndValidate(content, ImportedFlowSchema);
    if (!parsed.ok) return parsed;
    return evaluateFlow(parsed.data, parsed.data.nodes, parsed.data.edges, ingredients);
}

/** Problems as plain lines (repair prompt, error messages). */
export function formatDetails(details: ValidationDetail[]): string[] {
    return details.map((d) => (d.path ? `${d.path}: ${d.message}` : d.message));
}

/**
 * Final verdict after the last attempt: soft problems (unknown ids, malformed
 * mentions) are accepted as warnings, the mapping turns them into plain text.
 */
export function acceptSoft<T>(evaluation: Evaluation<T>): Evaluation<T> {
    if (evaluation.ok || !evaluation.soft || evaluation.data === undefined) return evaluation;
    return { ok: true, data: evaluation.data, warnings: formatDetails(evaluation.details) };
}
