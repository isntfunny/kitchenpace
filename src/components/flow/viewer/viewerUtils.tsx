import dagre from 'dagre';
import type { ReactNode } from 'react';

import { css } from 'styled-system/css';

import type { FlowEdgeSerialized, FlowNodeSerialized } from '../editor/editorTypes';

const mentionCss = css({
    bg: 'mention.bg',
    color: 'mention.text',
    borderRadius: '4px',
    px: '0.75',
    fontWeight: 600,
});

/* ── topology builder (dagre-powered) ───────────────────── */

export interface Topology {
    columnGroups: FlowNodeSerialized[][];
    /** dagre Y position per node — used by minimap for stable lane positioning */
    dagreY: Map<string, number>;
    outgoing: Map<string, string[]>;
    incoming: Map<string, string[]>;
    nodeById: Map<string, FlowNodeSerialized>;
}

export function buildTopology(nodes: FlowNodeSerialized[], edges: FlowEdgeSerialized[]): Topology {
    const outgoing = new Map<string, string[]>();
    const incoming = new Map<string, string[]>();
    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    for (const n of nodes) {
        outgoing.set(n.id, []);
        incoming.set(n.id, []);
    }
    for (const e of edges) {
        outgoing.get(e.source)?.push(e.target);
        incoming.get(e.target)?.push(e.source);
    }

    if (nodes.length === 0) {
        return { columnGroups: [], dagreY: new Map(), outgoing, incoming, nodeById };
    }

    // Use dagre for layered layout — it handles topological ordering, column
    // assignment (ranks), and Y-lane positioning (Brandes-Köpf) in one call.
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'LR', nodesep: 30, ranksep: 40 });

    for (const n of nodes) g.setNode(n.id, { width: 24, height: 24 });
    for (const e of edges) g.setEdge(e.source, e.target);

    dagre.layout(g);

    // Extract positions — dagre X = rank/column, Y = lane
    const positions = new Map<string, { x: number; y: number }>();
    const dagreY = new Map<string, number>();
    for (const n of nodes) {
        const pos = g.node(n.id);
        positions.set(n.id, pos);
        dagreY.set(n.id, pos.y);
    }

    // Derive column groups from dagre X positions (same X = same column).
    // Dagre uses exact X values per rank, so we can group by X.
    const xToNodes = new Map<number, FlowNodeSerialized[]>();
    for (const n of nodes) {
        const x = positions.get(n.id)!.x;
        if (!xToNodes.has(x)) xToNodes.set(x, []);
        xToNodes.get(x)!.push(n);
    }

    // Sort columns by X value; within each column sort by duration descending
    // (longest task first, so parallel steps that take longest are encountered first
    // when swiping — they need to be started earliest). Fall back to dagre Y as tiebreaker.
    const sortedXValues = [...xToNodes.keys()].sort((a, b) => a - b);
    const groups: FlowNodeSerialized[][] = sortedXValues.map((x) => {
        const col = xToNodes.get(x)!;
        col.sort((a, b) => {
            const durationDiff = (b.duration ?? 0) - (a.duration ?? 0);
            if (durationDiff !== 0) return durationDiff;
            return (dagreY.get(a.id) ?? 0) - (dagreY.get(b.id) ?? 0);
        });
        return col;
    });

    return { columnGroups: groups, dagreY, outgoing, incoming, nodeById };
}

/* ── helpers ─────────────────────────────────────────────── */

export function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

const MENTION_REGEX = /@\[(.*?)(?:\|(.*?))?\]\((.*?)\)/g;

export function renderDescription(
    text: string,
    ingredients: { id: string; name: string; amount?: string; unit?: string }[] | undefined,
): ReactNode[] {
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    MENTION_REGEX.lastIndex = 0;

    while ((match = MENTION_REGEX.exec(text)) !== null) {
        if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
        const [, name, override, id] = match;
        const ing = ingredients?.find((i) => i.id === id);
        const amountStr = override
            ? ` (${override})`
            : ing && (ing.amount || ing.unit)
              ? ` (${[ing.amount, ing.unit].filter(Boolean).join(' ')})`
              : '';
        parts.push(
            <span key={match.index} className={mentionCss}>
                {name}
                {amountStr}
            </span>,
        );
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts;
}

/** Extract unique ingredient IDs from a description's @mentions. */
export function extractMentionedIds(description: string | undefined): Set<string> {
    if (!description) return new Set();
    const ids = new Set<string>();
    const re = new RegExp(MENTION_REGEX.source, 'g');
    for (const match of description.matchAll(re)) {
        ids.add(match[3]); // group 3 = ingredient ID
    }
    return ids;
}

/** Extract unique ingredient chips from a node description's @mentions. */
export function extractIngredientChips(
    description: string | undefined,
    ingredients: { id: string; name: string; amount?: string; unit?: string }[] | undefined,
): { id: string; label: string }[] {
    if (!ingredients) return [];
    const ids = extractMentionedIds(description);
    if (ids.size === 0) return [];
    return [...ids]
        .map((id) => {
            const ing = ingredients.find((i) => i.id === id);
            return ing
                ? { id, label: [ing.amount, ing.unit, ing.name].filter(Boolean).join(' ') }
                : null;
        })
        .filter((c): c is NonNullable<typeof c> => Boolean(c));
}

/** Interpolate between orange (#e07b53) and green (#00b894) based on 0-100 pct */
export function timerColor(pct: number): string {
    const r = Math.round(224 - 224 * (pct / 100));
    const g = Math.round(123 + 61 * (pct / 100));
    const b = Math.round(83 + 65 * (pct / 100));
    return `rgb(${r},${g},${b})`;
}
