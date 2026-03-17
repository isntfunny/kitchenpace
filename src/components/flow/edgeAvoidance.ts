/**
 * Edge-avoidance utility: detects when a straight/step edge between two nodes
 * would pass through an intermediate node and computes a path that routes
 * above or below the obstacle(s).
 *
 * Works for LR (left-to-right) dagre layouts.
 */

interface NodeRect {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

interface AvoidanceResult {
    /** SVG path `d` string */
    path: string;
    /** Midpoint X for edge label placement */
    labelX: number;
    /** Midpoint Y for edge label placement */
    labelY: number;
}

/** Padding around obstacle bounding box */
const OBSTACLE_PAD = 30;
/** Corner radius for rounded turns */
const CORNER_R = 10;

/**
 * Build a rounded-corner orthogonal path that detours via `detourY`.
 *
 * Shape:  source ─→ midX ─↕ detourY ─→ midX ─↕ targetY ─→ target
 *
 * If `detourY` is between sourceY and targetY the path degenerates to a
 * normal step path, so the caller should only invoke this when a real
 * detour is necessary.
 */
function buildDetourPath(sx: number, sy: number, tx: number, ty: number, detourY: number): string {
    const r = CORNER_R;

    // Horizontal leg out of source
    const legOutX = sx + 20;
    // Horizontal leg into target
    const legInX = tx - 20;

    // The two vertical-turn X positions: one near source, one near target
    const turnX1 = legOutX + 10;
    const turnX2 = legInX - 10;

    // Clamp radius so it doesn't exceed available distances
    const availH1 = Math.abs(turnX1 - legOutX);
    const availH2 = Math.abs(turnX2 - legInX);
    const availV1 = Math.abs(detourY - sy);
    const availV2 = Math.abs(detourY - ty);
    const rr = Math.min(r, availH1, availH2, availV1 / 2, availV2 / 2, 999);

    if (rr < 1) {
        // Degenerate: just straight lines
        return `M ${sx} ${sy} L ${legOutX} ${sy} L ${turnX1} ${detourY} L ${turnX2} ${detourY} L ${legInX} ${ty} L ${tx} ${ty}`;
    }

    const dirY1 = detourY > sy ? 1 : -1; // going down or up from source
    const dirY2 = ty > detourY ? 1 : -1; // going down or up to target

    // Path segments with rounded corners:
    // 1. Horizontal from source handle
    // 2. Turn toward detourY
    // 3. Horizontal along detourY
    // 4. Turn toward targetY
    // 5. Horizontal into target handle
    const d = [
        `M ${sx} ${sy}`,
        `L ${turnX1 - rr} ${sy}`,
        // corner: turn from horizontal to vertical
        `Q ${turnX1} ${sy} ${turnX1} ${sy + dirY1 * rr}`,
        `L ${turnX1} ${detourY - dirY1 * rr}`,
        // corner: turn from vertical to horizontal
        `Q ${turnX1} ${detourY} ${turnX1 + rr} ${detourY}`,
        `L ${turnX2 - rr} ${detourY}`,
        // corner: turn from horizontal to vertical
        `Q ${turnX2} ${detourY} ${turnX2} ${detourY + dirY2 * rr}`,
        `L ${turnX2} ${ty - dirY2 * rr}`,
        // corner: turn from vertical to horizontal
        `Q ${turnX2} ${ty} ${turnX2 + rr} ${ty}`,
        `L ${tx} ${ty}`,
    ].join(' ');

    return d;
}

/**
 * Convert xyflow nodes to simple rects for intersection testing.
 */
export function nodesToRects(
    nodes: {
        id: string;
        position: { x: number; y: number };
        measured?: { width?: number; height?: number };
    }[],
): NodeRect[] {
    return nodes.map((n) => ({
        id: n.id,
        x: n.position.x,
        y: n.position.y,
        width: n.measured?.width ?? 220,
        height: n.measured?.height ?? 160,
    }));
}

/**
 * Check if any node sits between source and target and would be crossed
 * by a direct step path. If so, return a detour path.
 *
 * Returns `null` when no avoidance is needed (caller should use default path).
 */
export function computeAvoidingPath(
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    allNodes: NodeRect[],
    sourceId: string,
    targetId: string,
): AvoidanceResult | null {
    // Only handle left-to-right case
    if (sourceX >= targetX - 40) return null;

    const midX = (sourceX + targetX) / 2;

    // The default smooth-step path sweeps vertically at the midpoint.
    // Find nodes whose horizontal extent overlaps the midpoint region
    // AND whose vertical extent overlaps the source↔target Y sweep.
    const sweepMinY = Math.min(sourceY, targetY);
    const sweepMaxY = Math.max(sourceY, targetY);

    // Single pass: collect obstacles, global Y bounds, and corridor candidates
    const obstacles: NodeRect[] = [];
    let allMinY = Infinity;
    let allMaxY = -Infinity;
    let obsMinY = Infinity;
    let obsMaxY = -Infinity;

    // Nodes in the horizontal corridor (for corridor-clear checks later)
    const corridorNodes: Array<{ y: number; bottom: number }> = [];

    for (const n of allNodes) {
        const nRight = n.x + n.width;
        const nBottom = n.y + n.height;

        // Track global Y bounds
        allMinY = Math.min(allMinY, n.y);
        allMaxY = Math.max(allMaxY, nBottom);

        if (n.id === sourceId || n.id === targetId) continue;

        // Horizontally between source and target?
        if (nRight < sourceX + 30 || n.x > targetX - 30) continue;

        // Track corridor nodes for later clear-checks
        corridorNodes.push({ y: n.y, bottom: nBottom });

        // Obstacle: overlaps vertical sweep AND covers midX
        if (nBottom < sweepMinY - OBSTACLE_PAD || n.y > sweepMaxY + OBSTACLE_PAD) continue;
        const nodeCoversX = n.x - OBSTACLE_PAD < midX && nRight + OBSTACLE_PAD > midX;
        if (!nodeCoversX) continue;

        obstacles.push(n);
        obsMinY = Math.min(obsMinY, n.y);
        obsMaxY = Math.max(obsMaxY, nBottom);
    }

    if (obstacles.length === 0) return null;

    const roomAbove = obsMinY - allMinY;
    const roomBelow = allMaxY - obsMaxY;

    const candidateAbove = obsMinY - OBSTACLE_PAD;
    const candidateBelow = obsMaxY + OBSTACLE_PAD;

    // Check if above/below corridors are clear (single pass over corridor nodes)
    let aboveClear = true;
    let belowClear = true;
    for (const cn of corridorNodes) {
        if (aboveClear && cn.bottom > candidateAbove - 10 && cn.y < candidateAbove + 10) {
            aboveClear = false;
        }
        if (belowClear && cn.y < candidateBelow + 10 && cn.bottom > candidateBelow - 10) {
            belowClear = false;
        }
        if (!aboveClear && !belowClear) break;
    }

    let detourY: number;
    if (aboveClear && belowClear) {
        detourY = roomAbove >= roomBelow ? candidateBelow : candidateAbove;
    } else if (aboveClear) {
        detourY = candidateAbove;
    } else if (belowClear) {
        detourY = candidateBelow;
    } else {
        // Both blocked — go further out
        detourY = roomAbove >= roomBelow ? allMaxY + OBSTACLE_PAD : allMinY - OBSTACLE_PAD;
    }

    const path = buildDetourPath(sourceX, sourceY, targetX, targetY, detourY);

    return {
        path,
        labelX: midX,
        labelY: (sourceY + detourY) / 2,
    };
}
