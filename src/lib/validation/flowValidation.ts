// Minimal interfaces to support both FlowNodeInput and FlowNodeSerialized
interface FlowNode {
    id: string;
    type: string;
    label: string;
    description?: string;
}

interface FlowEdge {
    id: string;
    source: string;
    target: string;
}

export interface FlowValidationError {
    type:
        | 'ORPHANED_NODE'
        | 'INSUFFICIENT_EDGES'
        | 'NO_PATH_TO_FINISH'
        | 'MISSING_DESCRIPTION'
        | 'CYCLE_DETECTED';
    nodeId: string;
    nodeLabel: string;
    message: string;
}

export interface FlowValidationResult {
    isValid: boolean;
    errors: FlowValidationError[];
}

/**
 * Validates the flow graph before publishing
 */
export function validateFlow(nodes: FlowNode[], edges: FlowEdge[]): FlowValidationResult {
    const errors: FlowValidationError[] = [];

    // Rule 1: All nodes must be connected (no orphaned nodes)
    const orphanedErrors = validateNoOrphanedNodes(nodes, edges);
    errors.push(...orphanedErrors);

    // Rule 2: Intermediate nodes need at least 2 edges
    const edgeCountErrors = validateEdgeCounts(nodes, edges);
    errors.push(...edgeCountErrors);

    // Rule 3: All nodes must have a path to the servieren (finish) node
    const pathToFinishErrors = validatePathsToFinish(nodes, edges);
    errors.push(...pathToFinishErrors);

    // Rule 4: All nodes must have a description
    const descriptionErrors = validateDescriptions(nodes);
    errors.push(...descriptionErrors);

    // Rule 5: No cycles allowed
    const cycleErrors = validateNoCycles(nodes, edges);
    errors.push(...cycleErrors);

    return {
        isValid: errors.length === 0,
        errors,
    };
}

function validateNoOrphanedNodes(nodes: FlowNode[], edges: FlowEdge[]): FlowValidationError[] {
    const errors: FlowValidationError[] = [];
    const connectedNodeIds = new Set<string>();

    for (const edge of edges) {
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
    }

    for (const node of nodes) {
        if (!connectedNodeIds.has(node.id)) {
            errors.push({
                type: 'ORPHANED_NODE',
                nodeId: node.id,
                nodeLabel: node.label || 'Unbenannt',
                message: `Der Schritt "${node.label || 'Unbenannt'}" ist nicht verbunden. Bitte verbinde alle Schritte im Flow.`,
            });
        }
    }

    return errors;
}

function validateEdgeCounts(nodes: FlowNode[], edges: FlowEdge[]): FlowValidationError[] {
    const errors: FlowValidationError[] = [];
    const edgeCountByNode = new Map<string, number>();

    // Count edges per node
    for (const edge of edges) {
        edgeCountByNode.set(edge.source, (edgeCountByNode.get(edge.source) || 0) + 1);
        edgeCountByNode.set(edge.target, (edgeCountByNode.get(edge.target) || 0) + 1);
    }

    for (const node of nodes) {
        // Skip start and servieren nodes
        if (node.type === 'start' || node.type === 'servieren') continue;

        const edgeCount = edgeCountByNode.get(node.id) || 0;
        if (edgeCount < 2) {
            errors.push({
                type: 'INSUFFICIENT_EDGES',
                nodeId: node.id,
                nodeLabel: node.label || 'Unbenannt',
                message: `Der Schritt "${node.label || 'Unbenannt'}" hat nur ${edgeCount} Verbindung(en). Alle Schritte (außer Start und Servieren) brauchen mindestens 2 Verbindungen.`,
            });
        }
    }

    return errors;
}

function validatePathsToFinish(nodes: FlowNode[], edges: FlowEdge[]): FlowValidationError[] {
    const errors: FlowValidationError[] = [];

    // Find servieren node
    const servierenNode = nodes.find((n) => n.type === 'servieren');
    if (!servierenNode) return errors; // No servieren node, other validations will catch this

    // Build adjacency list (source -> targets)
    const outgoingEdges = new Map<string, string[]>();
    for (const edge of edges) {
        const targets = outgoingEdges.get(edge.source) || [];
        targets.push(edge.target);
        outgoingEdges.set(edge.source, targets);
    }

    // Check if each node (except servieren) can reach servieren
    for (const node of nodes) {
        if (node.type === 'servieren') continue;

        if (!canReachTarget(node.id, servierenNode.id, outgoingEdges, new Set())) {
            errors.push({
                type: 'NO_PATH_TO_FINISH',
                nodeId: node.id,
                nodeLabel: node.label || 'Unbenannt',
                message: `Der Schritt "${node.label || 'Unbenannt'}" hat keinen Weg zum Servieren-Schritt. Alle Pfade müssen zum Ende führen.`,
            });
        }
    }

    return errors;
}

function canReachTarget(
    startId: string,
    targetId: string,
    outgoingEdges: Map<string, string[]>,
    visited: Set<string>,
): boolean {
    if (startId === targetId) return true;
    if (visited.has(startId)) return false;

    visited.add(startId);

    const targets = outgoingEdges.get(startId) || [];
    for (const nextId of targets) {
        if (canReachTarget(nextId, targetId, outgoingEdges, visited)) {
            return true;
        }
    }

    return false;
}

function validateDescriptions(nodes: FlowNode[]): FlowValidationError[] {
    const errors: FlowValidationError[] = [];

    for (const node of nodes) {
        // Skip start and servieren nodes - they don't need descriptions
        if (node.type === 'start' || node.type === 'servieren') continue;

        const description = node.description?.trim() || '';
        if (description.length === 0) {
            errors.push({
                type: 'MISSING_DESCRIPTION',
                nodeId: node.id,
                nodeLabel: node.label || 'Unbenannt',
                message: `Der Schritt "${node.label || 'Unbenannt'}" hat keine Beschreibung. Bitte füge eine Beschreibung hinzu.`,
            });
        }
    }

    return errors;
}

function validateNoCycles(nodes: FlowNode[], edges: FlowEdge[]): FlowValidationError[] {
    const errors: FlowValidationError[] = [];

    // Build adjacency list
    const outgoingEdges = new Map<string, string[]>();
    for (const edge of edges) {
        const targets = outgoingEdges.get(edge.source) || [];
        targets.push(edge.target);
        outgoingEdges.set(edge.source, targets);
    }

    // Check for cycles using DFS
    const WHITE = 0; // Unvisited
    const GRAY = 1; // Currently visiting (in recursion stack)
    const BLACK = 2; // Finished

    const colors = new Map<string, number>();
    for (const node of nodes) {
        colors.set(node.id, WHITE);
    }

    function dfs(nodeId: string, path: string[]): boolean {
        colors.set(nodeId, GRAY);
        path.push(nodeId);

        const targets = outgoingEdges.get(nodeId) || [];
        for (const targetId of targets) {
            if (colors.get(targetId) === GRAY) {
                // Cycle detected!
                const cycleStart = path.indexOf(targetId);
                const cycleNodes = path.slice(cycleStart);
                const cycleNodeLabels = cycleNodes.map((id) => {
                    const n = nodes.find((n) => n.id === id);
                    return n?.label || 'Unbenannt';
                });
                return true;
            }
            if (colors.get(targetId) === WHITE) {
                if (dfs(targetId, [...path])) {
                    return true;
                }
            }
        }

        colors.set(nodeId, BLACK);
        return false;
    }

    for (const node of nodes) {
        if (colors.get(node.id) === WHITE) {
            const path: string[] = [];
            if (dfs(node.id, path)) {
                // Find the cycle nodes
                const cycleNodes: FlowNode[] = [];
                for (const [id, color] of colors.entries()) {
                    if (color === GRAY) {
                        const n = nodes.find((n) => n.id === id);
                        if (n) cycleNodes.push(n);
                    }
                }

                // Report the first node in the cycle
                if (cycleNodes.length > 0) {
                    errors.push({
                        type: 'CYCLE_DETECTED',
                        nodeId: cycleNodes[0].id,
                        nodeLabel: cycleNodes[0].label || 'Unbenannt',
                        message: `Zyklus erkannt! Der Schritt "${cycleNodes[0].label || 'Unbenannt'}" ist Teil eines Kreises. Rezepte dürfen keine Zyklen enthalten.`,
                    });
                }
                break;
            }
        }
    }

    return errors;
}

/**
 * Formats validation errors into a single user-friendly message
 */
export function formatValidationErrors(errors: FlowValidationError[]): string {
    if (errors.length === 0) return '';

    if (errors.length === 1) {
        return errors[0].message;
    }

    // Group by error type for multiple errors
    const grouped = errors.reduce(
        (acc, err) => {
            acc[err.type] = acc[err.type] || [];
            acc[err.type].push(err);
            return acc;
        },
        {} as Record<string, FlowValidationError[]>,
    );

    const messages: string[] = [];

    if (grouped['ORPHANED_NODE']?.length > 0) {
        const count = grouped['ORPHANED_NODE'].length;
        messages.push(
            `${count} Schritt(e) sind nicht verbunden: ${grouped['ORPHANED_NODE'].map((e) => `"${e.nodeLabel}"`).join(', ')}`,
        );
    }

    if (grouped['INSUFFICIENT_EDGES']?.length > 0) {
        const count = grouped['INSUFFICIENT_EDGES'].length;
        messages.push(
            `${count} Schritt(e) haben zu wenig Verbindungen: ${grouped['INSUFFICIENT_EDGES'].map((e) => `"${e.nodeLabel}"`).join(', ')}`,
        );
    }

    if (grouped['NO_PATH_TO_FINISH']?.length > 0) {
        const count = grouped['NO_PATH_TO_FINISH'].length;
        messages.push(
            `${count} Schritt(e) führen nicht zum Ende: ${grouped['NO_PATH_TO_FINISH'].map((e) => `"${e.nodeLabel}"`).join(', ')}`,
        );
    }

    if (grouped['MISSING_DESCRIPTION']?.length > 0) {
        const count = grouped['MISSING_DESCRIPTION'].length;
        messages.push(
            `${count} Schritt(e) haben keine Beschreibung: ${grouped['MISSING_DESCRIPTION'].map((e) => `"${e.nodeLabel}"`).join(', ')}`,
        );
    }

    if (grouped['CYCLE_DETECTED']?.length > 0) {
        messages.push(
            `Zyklus erkannt! Der Flow enthält einen Kreis, der bei "${grouped['CYCLE_DETECTED'][0].nodeLabel}" beginnt.`,
        );
    }

    return messages.join('\n');
}
