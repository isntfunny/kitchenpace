interface FlowNode {
    id: string;
    position: { x: number; y: number };
}

interface FlowEdge {
    id: string;
    source: string;
    target: string;
}

interface FlowEdgesProps {
    nodes: FlowNode[];
    edges: FlowEdge[];
    bounds: {
        minX: number;
        minY: number;
        width: number;
        height: number;
    };
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;
const NODE_GAP_X = 80;
const NODE_GAP_Y = 60;

export function FlowEdges({ nodes, edges, bounds }: FlowEdgesProps) {
    return (
        <svg
            width={bounds.width}
            height={bounds.height}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                zIndex: 0,
            }}
            viewBox={`0 0 ${bounds.width} ${bounds.height}`}
        >
            {edges.map((edge) => {
                const source = nodes.find((n) => n.id === edge.source);
                const target = nodes.find((n) => n.id === edge.target);
                if (!source || !target) return null;

                const startX = source.position.x - bounds.minX + NODE_WIDTH / 2 + NODE_GAP_X;
                const startY = source.position.y - bounds.minY + NODE_HEIGHT + NODE_GAP_Y;
                const endX = target.position.x - bounds.minX + NODE_WIDTH / 2 + NODE_GAP_X;
                const endY = target.position.y - bounds.minY + NODE_GAP_Y;

                const midY = startY + (endY - startY) / 2;
                const path = `M ${startX} ${startY} C ${startX} ${midY} ${endX} ${midY} ${endX} ${endY}`;

                return (
                    <path
                        key={edge.id}
                        d={path}
                        fill="none"
                        stroke="rgba(122,165,107,0.5)"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        strokeLinecap="round"
                    />
                );
            })}
        </svg>
    );
}
