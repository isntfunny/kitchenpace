import type { FlowNodeInput, FlowEdgeInput } from '@app/components/recipe/createActions';

export type FlowNode = FlowNodeInput;
export type FlowEdge = FlowEdgeInput;

export type FlowValidationScope = 'editor' | 'publish';
export type FlowValidationSeverity = 'error' | 'warning';

export type FlowValidationErrorType =
    | 'MISSING_START'
    | 'MULTIPLE_STARTS'
    | 'MISSING_FINISH'
    | 'MULTIPLE_FINISHES'
    | 'INVALID_START_CONNECTION'
    | 'INVALID_FINISH_CONNECTION'
    | 'ORPHANED_NODE'
    | 'INSUFFICIENT_EDGES'
    | 'DISCONNECTED_FROM_START'
    | 'NO_PATH_TO_FINISH'
    | 'MISSING_DESCRIPTION'
    | 'CYCLE_DETECTED';

export interface FlowValidationError {
    id: string;
    type: FlowValidationErrorType;
    severity: FlowValidationSeverity;
    blocking: boolean;
    nodeId?: string;
    nodeLabel?: string;
    relatedNodeIds: string[];
    relatedNodeLabels: string[];
    title: string;
    message: string;
    hint?: string;
}

export interface FlowValidationResult {
    scope: FlowValidationScope;
    isValid: boolean;
    errors: FlowValidationError[];
    blockingIssues: FlowValidationError[];
    warningIssues: FlowValidationError[];
    summary: string | null;
    counts: {
        total: number;
        blocking: number;
        warnings: number;
    };
}

interface FlowValidationContext {
    scope: FlowValidationScope;
    nodes: FlowNode[];
    edges: FlowEdge[];
    nodesById: Map<string, FlowNode>;
    outgoing: Map<string, string[]>;
    incoming: Map<string, string[]>;
    startNodes: FlowNode[];
    finishNodes: FlowNode[];
    normalNodes: FlowNode[];
    orphanedNodeIds: Set<string>;
}

interface FlowValidationOptions {
    scope?: FlowValidationScope;
}

interface FlowValidationRule {
    run: (ctx: FlowValidationContext) => FlowValidationError[];
}

type IssueDraft = {
    type: FlowValidationErrorType;
    severity: FlowValidationSeverity;
    title: string;
    message: string;
    hint?: string;
    nodeId?: string;
    relatedNodeIds?: string[];
};

const VALIDATION_RULES: FlowValidationRule[] = [
    { run: validateTerminalNodes },
    { run: validateTerminalConnections },
    { run: validateOrphanedNodes },
    { run: validateEdgeRequirements },
    { run: validateReachabilityFromStart },
    { run: validateReachabilityToFinish },
    { run: validateDescriptions },
    { run: validateCycles },
];

export function validateFlow(
    nodes: FlowNode[],
    edges: FlowEdge[],
    options: FlowValidationOptions = {},
): FlowValidationResult {
    const scope = options.scope ?? 'editor';
    const ctx = buildContext(nodes, edges, scope);
    const issues = dedupeIssues(
        VALIDATION_RULES.flatMap((rule) => rule.run(ctx)).sort(compareIssues),
        ctx.nodesById,
    );
    const blockingIssues = issues.filter((issue) => issue.blocking);
    const warningIssues = issues.filter((issue) => !issue.blocking);

    return {
        scope,
        isValid: blockingIssues.length === 0,
        errors: issues,
        blockingIssues,
        warningIssues,
        summary:
            issues.length > 0 ? buildSummary(blockingIssues.length, warningIssues.length) : null,
        counts: {
            total: issues.length,
            blocking: blockingIssues.length,
            warnings: warningIssues.length,
        },
    };
}

export function getValidationIssuesByNode(
    validation: FlowValidationResult,
): Map<string, FlowValidationError[]> {
    const issuesByNode = new Map<string, FlowValidationError[]>();

    for (const issue of validation.errors) {
        for (const nodeId of issue.relatedNodeIds) {
            if (!nodeId) continue;
            const existing = issuesByNode.get(nodeId) ?? [];
            existing.push(issue);
            existing.sort(compareIssues);
            issuesByNode.set(nodeId, existing);
        }
    }

    return issuesByNode;
}

export function formatValidationErrors(
    input: FlowValidationResult | FlowValidationError[],
): string {
    const issues = Array.isArray(input) ? input : input.errors;
    const blockingIssues = issues.filter((issue) => issue.blocking);
    const warningIssues = issues.filter((issue) => !issue.blocking);

    if (issues.length === 0) return '';

    const lines: string[] = [];

    if (blockingIssues.length > 0) {
        lines.push(`Der Flow ist noch nicht veroeffentlichbar (${blockingIssues.length} Blocker).`);
        lines.push(...blockingIssues.slice(0, 6).map((issue) => `- ${issue.message}`));
        if (blockingIssues.length > 6) {
            lines.push(`- +${blockingIssues.length - 6} weitere Blocker`);
        }
    }

    if (warningIssues.length > 0) {
        if (lines.length > 0) lines.push('');
        lines.push(`Hinweise (${warningIssues.length}):`);
        lines.push(...warningIssues.slice(0, 3).map((issue) => `- ${issue.message}`));
        if (warningIssues.length > 3) {
            lines.push(`- +${warningIssues.length - 3} weitere Hinweise`);
        }
    }

    return lines.join('\n');
}

function buildContext(
    nodes: FlowNode[],
    edges: FlowEdge[],
    scope: FlowValidationScope,
): FlowValidationContext {
    const nodesById = new Map<string, FlowNode>();
    const outgoing = new Map<string, string[]>();
    const incoming = new Map<string, string[]>();

    for (const node of nodes) {
        nodesById.set(node.id, node);
        outgoing.set(node.id, []);
        incoming.set(node.id, []);
    }

    for (const edge of edges) {
        if (!nodesById.has(edge.source) || !nodesById.has(edge.target)) continue;
        outgoing.get(edge.source)?.push(edge.target);
        incoming.get(edge.target)?.push(edge.source);
    }

    const startNodes = nodes.filter((node) => node.type === 'start');
    const finishNodes = nodes.filter((node) => node.type === 'servieren');
    const normalNodes = nodes.filter((node) => node.type !== 'start' && node.type !== 'servieren');
    const orphanedNodeIds = new Set(
        normalNodes
            .filter(
                (node) =>
                    (incoming.get(node.id)?.length ?? 0) === 0 &&
                    (outgoing.get(node.id)?.length ?? 0) === 0,
            )
            .map((node) => node.id),
    );

    return {
        scope,
        nodes,
        edges,
        nodesById,
        outgoing,
        incoming,
        startNodes,
        finishNodes,
        normalNodes,
        orphanedNodeIds,
    };
}

function validateTerminalNodes(ctx: FlowValidationContext): FlowValidationError[] {
    const issues: IssueDraft[] = [];

    if (ctx.startNodes.length === 0) {
        issues.push({
            type: 'MISSING_START',
            severity: 'error',
            title: 'Start fehlt',
            message: 'Dem Flow fehlt ein Start-Schritt.',
            hint: 'Lege einen eindeutigen Start-Schritt an.',
        });
    }

    if (ctx.startNodes.length > 1) {
        issues.push({
            type: 'MULTIPLE_STARTS',
            severity: 'error',
            title: 'Zu viele Start-Schritte',
            message: `Der Flow hat ${ctx.startNodes.length} Start-Schritte. Es darf nur einen geben.`,
            hint: 'Behalte genau einen Start-Schritt und wandle die anderen in normale Schritte um.',
            relatedNodeIds: ctx.startNodes.map((node) => node.id),
        });
    }

    if (ctx.finishNodes.length === 0) {
        issues.push({
            type: 'MISSING_FINISH',
            severity: 'error',
            title: 'Servieren fehlt',
            message: 'Dem Flow fehlt ein Servieren-Schritt als Ende.',
            hint: 'Lege einen eindeutigen Servieren-Schritt an.',
        });
    }

    if (ctx.finishNodes.length > 1) {
        issues.push({
            type: 'MULTIPLE_FINISHES',
            severity: 'error',
            title: 'Zu viele Enden',
            message: `Der Flow hat ${ctx.finishNodes.length} Servieren-Schritte. Es darf nur einen geben.`,
            hint: 'Fuehre alle Pfade in einen gemeinsamen Servieren-Schritt zusammen.',
            relatedNodeIds: ctx.finishNodes.map((node) => node.id),
        });
    }

    return finalizeIssues(issues, ctx.nodesById, ctx.scope);
}

function validateTerminalConnections(ctx: FlowValidationContext): FlowValidationError[] {
    const issues: IssueDraft[] = [];

    for (const node of ctx.startNodes) {
        const incoming = ctx.incoming.get(node.id)?.length ?? 0;
        const outgoing = ctx.outgoing.get(node.id)?.length ?? 0;

        if (incoming > 0) {
            issues.push({
                type: 'INVALID_START_CONNECTION',
                severity: 'error',
                title: 'Start falsch verbunden',
                nodeId: node.id,
                message: 'Der Start-Schritt darf keine eingehenden Verbindungen haben.',
                hint: 'Entferne alle Kanten, die in den Start hineinfuehren.',
            });
        }

        if (outgoing === 0) {
            issues.push({
                type: 'INVALID_START_CONNECTION',
                severity: 'error',
                nodeId: node.id,
                title: 'Start endet sofort',
                message:
                    'Der Start-Schritt braucht mindestens eine Verbindung zum ersten Arbeitsschritt.',
                hint: 'Verbinde den Start mit dem naechsten Schritt.',
            });
        }
    }

    for (const node of ctx.finishNodes) {
        const incoming = ctx.incoming.get(node.id)?.length ?? 0;
        const outgoing = ctx.outgoing.get(node.id)?.length ?? 0;

        if (incoming === 0) {
            issues.push({
                type: 'INVALID_FINISH_CONNECTION',
                severity: 'error',
                nodeId: node.id,
                title: 'Servieren ist unerreichbar',
                message: 'Der Servieren-Schritt braucht mindestens eine eingehende Verbindung.',
                hint: 'Verbinde den letzten Schritt mit dem Servieren-Knoten.',
            });
        }

        if (outgoing > 0) {
            issues.push({
                type: 'INVALID_FINISH_CONNECTION',
                severity: 'error',
                nodeId: node.id,
                title: 'Servieren fuehrt weiter',
                message: 'Vom Servieren-Schritt duerfen keine weiteren Kanten ausgehen.',
                hint: 'Entferne ausgehende Kanten vom Servieren-Knoten.',
            });
        }
    }

    return finalizeIssues(issues, ctx.nodesById, ctx.scope);
}

function validateOrphanedNodes(ctx: FlowValidationContext): FlowValidationError[] {
    const issues = ctx.normalNodes
        .filter((node) => ctx.orphanedNodeIds.has(node.id))
        .map((node) => ({
            type: 'ORPHANED_NODE' as const,
            severity: 'error' as const,
            nodeId: node.id,
            title: 'Schritt ist isoliert',
            message: `Der Schritt "${getNodeLabel(node)}" ist mit keinem anderen Schritt verbunden.`,
            hint: 'Verbinde den Schritt mit einer eingehenden und einer ausgehenden Kante.',
        }));

    return finalizeIssues(issues, ctx.nodesById, ctx.scope);
}

function validateEdgeRequirements(ctx: FlowValidationContext): FlowValidationError[] {
    const issues = ctx.normalNodes
        .filter((node) => !ctx.orphanedNodeIds.has(node.id))
        .flatMap((node) => {
            const incoming = ctx.incoming.get(node.id)?.length ?? 0;
            const outgoing = ctx.outgoing.get(node.id)?.length ?? 0;

            if (incoming > 0 && outgoing > 0) return [];

            return [
                {
                    type: 'INSUFFICIENT_EDGES' as const,
                    severity: 'error' as const,
                    nodeId: node.id,
                    title: 'Schrittkette ist unvollstaendig',
                    message:
                        incoming === 0
                            ? `Der Schritt "${getNodeLabel(node)}" hat keinen Vorgaenger.`
                            : `Der Schritt "${getNodeLabel(node)}" hat keinen Nachfolger.`,
                    hint:
                        incoming === 0
                            ? 'Verbinde einen vorherigen Schritt mit diesem Knoten.'
                            : 'Fuehre den Schritt weiter oder verbinde ihn mit Servieren.',
                },
            ];
        });

    return finalizeIssues(issues, ctx.nodesById, ctx.scope);
}

function validateReachabilityFromStart(ctx: FlowValidationContext): FlowValidationError[] {
    const startNode = ctx.startNodes[0];
    if (!startNode) return [];

    const reachable = traverseForward(startNode.id, ctx.outgoing);
    const issues = ctx.normalNodes
        .filter((node) => !ctx.orphanedNodeIds.has(node.id))
        .filter((node) => (ctx.incoming.get(node.id)?.length ?? 0) > 0)
        .filter((node) => !reachable.has(node.id))
        .map((node) => ({
            type: 'DISCONNECTED_FROM_START' as const,
            severity: 'error' as const,
            nodeId: node.id,
            title: 'Nicht vom Start erreichbar',
            message: `Der Schritt "${getNodeLabel(node)}" ist nicht ueber den Start erreichbar.`,
            hint: 'Verbinde ihn in die Hauptkette oder einen erreichbaren Parallelzweig.',
        }));

    return finalizeIssues(issues, ctx.nodesById, ctx.scope);
}

function validateReachabilityToFinish(ctx: FlowValidationContext): FlowValidationError[] {
    const finishNode = ctx.finishNodes[0];
    if (!finishNode) return [];

    const reachable = traverseBackward(finishNode.id, ctx.incoming);
    const issues = ctx.normalNodes
        .filter((node) => !ctx.orphanedNodeIds.has(node.id))
        .filter((node) => (ctx.outgoing.get(node.id)?.length ?? 0) > 0)
        .filter((node) => !reachable.has(node.id))
        .map((node) => ({
            type: 'NO_PATH_TO_FINISH' as const,
            severity: 'error' as const,
            nodeId: node.id,
            title: 'Kein Weg zum Ende',
            message: `Der Schritt "${getNodeLabel(node)}" fuehrt nicht zum Servieren-Schritt.`,
            hint: 'Leite den Pfad weiter bis zum Servieren-Knoten.',
        }));

    return finalizeIssues(issues, ctx.nodesById, ctx.scope);
}

function validateDescriptions(ctx: FlowValidationContext): FlowValidationError[] {
    const severity: FlowValidationSeverity = ctx.scope === 'publish' ? 'error' : 'warning';
    const issues = ctx.normalNodes
        .filter((node) => (node.description ?? '').trim().length === 0)
        .map((node) => ({
            type: 'MISSING_DESCRIPTION' as const,
            severity,
            nodeId: node.id,
            title: 'Beschreibung fehlt',
            message: `Der Schritt "${getNodeLabel(node)}" hat noch keine Beschreibung.`,
            hint: 'Beschreibe kurz, was hier passieren soll.',
        }));

    return finalizeIssues(issues, ctx.nodesById, ctx.scope);
}

function validateCycles(ctx: FlowValidationContext): FlowValidationError[] {
    const cycles = findCycles(ctx.nodes, ctx.outgoing);
    const drafts: IssueDraft[] = [];

    for (const cycle of cycles) {
        for (const nodeId of cycle) {
            drafts.push({
                type: 'CYCLE_DETECTED',
                severity: 'error',
                nodeId,
                relatedNodeIds: cycle,
                title: 'Zyklus erkannt',
                message: `Der Schritt "${getNodeLabel(ctx.nodesById.get(nodeId))}" ist Teil eines Kreises.`,
                hint: 'Entferne oder verschiebe mindestens eine Verbindung in diesem Kreis.',
            });
        }
    }

    return finalizeIssues(drafts, ctx.nodesById, ctx.scope);
}

function finalizeIssues(
    drafts: IssueDraft[],
    nodesById: Map<string, FlowNode>,
    scope: FlowValidationScope,
): FlowValidationError[] {
    return drafts.map((draft) => createIssue(draft, nodesById, scope));
}

function createIssue(
    draft: IssueDraft,
    nodesById: Map<string, FlowNode>,
    _scope: FlowValidationScope,
): FlowValidationError {
    const relatedNodeIds = uniqueStrings([
        ...(draft.relatedNodeIds ?? []),
        ...(draft.nodeId ? [draft.nodeId] : []),
    ]);
    const relatedNodeLabels = relatedNodeIds
        .map((nodeId) => getNodeLabel(nodesById.get(nodeId)))
        .filter(Boolean);
    const nodeLabel = draft.nodeId ? getNodeLabel(nodesById.get(draft.nodeId)) : undefined;

    return {
        id: `${draft.type}:${relatedNodeIds.join(',') || draft.message}`,
        type: draft.type,
        severity: draft.severity,
        blocking: draft.severity === 'error',
        nodeId: draft.nodeId,
        nodeLabel,
        relatedNodeIds,
        relatedNodeLabels,
        title: draft.title,
        message: draft.message,
        hint: draft.hint,
    };
}

function dedupeIssues(
    issues: FlowValidationError[],
    nodesById: Map<string, FlowNode>,
): FlowValidationError[] {
    const seen = new Set<string>();
    const deduped: FlowValidationError[] = [];

    for (const issue of issues) {
        const fingerprint = `${issue.type}:${uniqueStrings(issue.relatedNodeIds).join(',')}`;
        if (seen.has(fingerprint)) continue;
        seen.add(fingerprint);
        deduped.push({
            ...issue,
            relatedNodeLabels: issue.relatedNodeIds
                .map((nodeId) => getNodeLabel(nodesById.get(nodeId)))
                .filter(Boolean),
        });
    }

    return deduped;
}

function compareIssues(
    a: FlowValidationError | IssueDraft,
    b: FlowValidationError | IssueDraft,
): number {
    const severityRank = (severity: FlowValidationSeverity) => (severity === 'error' ? 0 : 1);
    return severityRank(a.severity) - severityRank(b.severity);
}

function buildSummary(blockingCount: number, warningCount: number): string {
    if (blockingCount > 0 && warningCount > 0) {
        return `${blockingCount} Blocker und ${warningCount} Hinweise im Rezept-Flow.`;
    }
    if (blockingCount > 0) {
        return `${blockingCount} Blocker im Rezept-Flow. Diese Punkte verhindern die Veroeffentlichung.`;
    }
    return `${warningCount} Hinweise im Rezept-Flow.`;
}

function traverseForward(startId: string, outgoing: Map<string, string[]>): Set<string> {
    const visited = new Set<string>();
    const stack = [startId];

    while (stack.length > 0) {
        const current = stack.pop();
        if (!current || visited.has(current)) continue;
        visited.add(current);
        for (const next of outgoing.get(current) ?? []) {
            stack.push(next);
        }
    }

    return visited;
}

function traverseBackward(targetId: string, incoming: Map<string, string[]>): Set<string> {
    const visited = new Set<string>();
    const stack = [targetId];

    while (stack.length > 0) {
        const current = stack.pop();
        if (!current || visited.has(current)) continue;
        visited.add(current);
        for (const previous of incoming.get(current) ?? []) {
            stack.push(previous);
        }
    }

    return visited;
}

function findCycles(nodes: FlowNode[], outgoing: Map<string, string[]>): string[][] {
    const visited = new Set<string>();
    const inPath = new Set<string>();
    const path: string[] = [];
    const cycleSignatures = new Set<string>();
    const cycles: string[][] = [];

    const visit = (nodeId: string) => {
        visited.add(nodeId);
        inPath.add(nodeId);
        path.push(nodeId);

        for (const next of outgoing.get(nodeId) ?? []) {
            if (!visited.has(next)) {
                visit(next);
                continue;
            }

            if (!inPath.has(next)) continue;

            const cycleStart = path.indexOf(next);
            if (cycleStart === -1) continue;
            const cycle = normalizeCycle(path.slice(cycleStart));
            const signature = cycle.join('>');
            if (!cycleSignatures.has(signature)) {
                cycleSignatures.add(signature);
                cycles.push(cycle);
            }
        }

        path.pop();
        inPath.delete(nodeId);
    };

    for (const node of nodes) {
        if (!visited.has(node.id)) {
            visit(node.id);
        }
    }

    return cycles;
}

function normalizeCycle(cycle: string[]): string[] {
    if (cycle.length <= 1) return cycle;

    const smallestNodeId = [...cycle].sort()[0];
    const startIndex = cycle.indexOf(smallestNodeId);
    return [...cycle.slice(startIndex), ...cycle.slice(0, startIndex)];
}

function getNodeLabel(node?: FlowNode): string {
    return node?.label?.trim() || 'Unbenannt';
}

function uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values.filter(Boolean)));
}
