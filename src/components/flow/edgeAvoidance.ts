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

    const obstacles: NodeRect[] = [];
    for (const n of allNodes) {
        if (n.id === sourceId || n.id === targetId) continue;

        const nRight = n.x + n.width;
        const nBottom = n.y + n.height;

        // Must be horizontally between source and target
        if (nRight < sourceX + 30 || n.x > targetX - 30) continue;

        // Must overlap the vertical sweep of the edge (with padding)
        if (nBottom < sweepMinY - OBSTACLE_PAD || n.y > sweepMaxY + OBSTACLE_PAD) continue;

        // More precise: would the step path's vertical segment at midX cross this node?
        // Step path vertical segment runs from sourceY to targetY at x = midX.
        // Node is an obstacle if its x-range contains midX AND its y-range overlaps [sourceY..targetY].
        const nodeCoversX = n.x - OBSTACLE_PAD < midX && nRight + OBSTACLE_PAD > midX;
        if (!nodeCoversX) continue;

        obstacles.push(n);
    }

    if (obstacles.length === 0) return null;

    // Compute bounding box of obstacles
    let obsMinY = Infinity;
    let obsMaxY = -Infinity;
    for (const n of obstacles) {
        obsMinY = Math.min(obsMinY, n.y);
        obsMaxY = Math.max(obsMaxY, n.y + n.height);
    }

    // All nodes for spatial context — find free space above and below
    const allMinY = Math.min(...allNodes.map((n) => n.y));
    const allMaxY = Math.max(...allNodes.map((n) => n.y + n.height));

    // Prefer routing on the side with more room; if equal, go above
    const roomAbove = obsMinY - allMinY;
    const roomBelow = allMaxY - obsMaxY;

    // Determine which side of the obstacle to route, and check that no other
    // node occupies that detour corridor
    const candidateAbove = obsMinY - OBSTACLE_PAD;
    const candidateBelow = obsMaxY + OBSTACLE_PAD;

    // Check if the above/below corridors are actually clear
    const aboveClear = !allNodes.some((n) => {
        if (n.id === sourceId || n.id === targetId) return false;
        const nBottom = n.y + n.height;
        const nRight = n.x + n.width;
        if (nRight < sourceX + 30 || n.x > targetX - 30) return false;
        return nBottom > candidateAbove - 10 && n.y < candidateAbove + 10;
    });

    const belowClear = !allNodes.some((n) => {
        if (n.id === sourceId || n.id === targetId) return false;
        const nRight = n.x + n.width;
        if (nRight < sourceX + 30 || n.x > targetX - 30) return false;
        return n.y < candidateBelow + 10 && n.y + n.height > candidateBelow - 10;
    });

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
