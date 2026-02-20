'use client';

import { useMemo, useState, useRef } from 'react';

import type { FlowNode, FlowEdge } from '@/app/recipe/[id]/data';
import { css } from 'styled-system/css';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;
const NODE_GAP_X = 80;
const NODE_GAP_Y = 60;

const getTypeEmoji = (type: string): string => {
    const emojis: Record<string, string> = {
        prep: '🔪',
        cook: '🍳',
        wait: '⏱️',
        season: '🧂',
        combine: '🍽️',
        serve: '✨',
    };
    return emojis[type] || '📝';
};

const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
        prep: '#e3f2fd',
        cook: '#fff3e0',
        wait: '#f3e5f5',
        season: '#e8f5e9',
        combine: '#fce4ec',
        serve: '#ffebee',
    };
    return colors[type] || '#f5f5f5';
};

const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
        prep: 'Vorbereitung',
        cook: 'Kochen',
        wait: 'Warten',
        season: 'Würzen',
        combine: 'Anrichten',
        serve: 'Servieren',
    };
    return labels[type] || type;
};

interface NodeCardProps {
    node: FlowNode;
    isCompleted: boolean;
    isActive: boolean;
    isJustCompleted: boolean;
    onToggleComplete: () => void;
    onClick: () => void;
}

function NodeCard({
    node,
    isCompleted,
    isActive,
    isJustCompleted,
    onToggleComplete,
    onClick,
}: NodeCardProps) {
    return (
        <div
            onClick={onClick}
            className={css({
                width: `${NODE_WIDTH}px`,
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: isCompleted ? '#f0f9f0' : getTypeColor(node.type),
                border: isActive
                    ? '2px solid #2196f3'
                    : isCompleted
                      ? '2px solid #4caf50'
                      : '2px solid transparent',
                boxShadow: isActive
                    ? '0 4px 20px rgba(33, 150, 243, 0.25)'
                    : '0 2px 8px rgba(0,0,0,0.08)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                _hover: {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                },
                position: 'relative',
                overflow: 'hidden',
                animation: isJustCompleted ? 'cardComplete 600ms ease-out' : 'none',
                zIndex: 2,
            })}
        >
            <div
                className={css({
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                })}
            >
                <div className={css({ display: 'flex', alignItems: 'center', gap: '8px' })}>
                    <span className={css({ fontSize: '20px' })}>{getTypeEmoji(node.type)}</span>
                    <span
                        className={css({
                            fontSize: '11px',
                            fontWeight: '600',
                            color: '#666',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                        })}
                    >
                        {getTypeLabel(node.type)}
                    </span>
                </div>
                {node.duration && (
                    <div
                        className={css({
                            fontSize: '11px',
                            color: '#888',
                            backgroundColor: 'rgba(255,255,255,0.7)',
                            padding: '3px 8px',
                            borderRadius: '12px',
                        })}
                    >
                        {node.duration} Min.
                    </div>
                )}
            </div>

            <div
                className={css({
                    fontSize: '14px',
                    fontWeight: '600',
                    color: isCompleted ? '#666' : '#333',
                    marginBottom: '4px',
                })}
            >
                {node.label}
            </div>

            <div
                className={css({
                    fontSize: '12px',
                    color: isCompleted ? '#888' : '#666',
                    lineHeight: '1.4',
                    textDecoration: isCompleted ? 'line-through' : 'none',
                })}
            >
                {node.description}
            </div>

            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    marginTop: '10px',
                })}
            >
                {isActive && (
                    <div
                        className={css({
                            fontSize: '11px',
                            color: '#2196f3',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginRight: '8px',
                        })}
                    >
                        <span
                            className={css({
                                width: '6px',
                                height: '6px',
                                borderRadius: 'full',
                                backgroundColor: '#2196f3',
                                animation: 'pulse 1.5s infinite',
                            })}
                        />
                        Details
                    </div>
                )}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleComplete();
                    }}
                    className={css({
                        padding: '5px 10px',
                        borderRadius: '999px',
                        border: isCompleted ? 'none' : '1px solid #ddd',
                        backgroundColor: isCompleted ? '#4caf50' : 'white',
                        color: isCompleted ? 'white' : '#666',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        _hover: {
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                        },
                    })}
                >
                    {isCompleted ? '✓' : 'Fertig'}
                </button>
            </div>

            <div
                className={css({
                    position: 'absolute',
                    inset: '0',
                    pointerEvents: 'none',
                    opacity: isJustCompleted ? 1 : 0,
                    background: 'linear-gradient(120deg, rgba(76,175,80,0.15), rgba(76,175,80,0))',
                    animation: isJustCompleted ? 'completeGlow 600ms ease-out' : 'none',
                })}
            />
        </div>
    );
}

interface NodeDetailModalProps {
    node: FlowNode;
    isCompleted: boolean;
    onToggleComplete: () => void;
    onClose: () => void;
}

function NodeDetailModal({ node, isCompleted, onToggleComplete, onClose }: NodeDetailModalProps) {
    return (
        <div
            className={css({
                position: 'fixed',
                inset: '0',
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px',
            })}
            onClick={onClose}
        >
            <div
                className={css({
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    padding: '24px',
                    maxWidth: '400px',
                    width: '100%',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                })}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className={css({
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '16px',
                    })}
                >
                    <div className={css({ display: 'flex', alignItems: 'center', gap: '12px' })}>
                        <span className={css({ fontSize: '32px' })}>{getTypeEmoji(node.type)}</span>
                        <div>
                            <div
                                className={css({
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: '#666',
                                    textTransform: 'uppercase',
                                })}
                            >
                                {getTypeLabel(node.type)}
                            </div>
                            <div
                                className={css({
                                    fontSize: '18px',
                                    fontWeight: '700',
                                    color: '#333',
                                })}
                            >
                                {node.label}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={css({
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            color: '#999',
                            lineHeight: '1',
                            _hover: { color: '#333' },
                        })}
                    >
                        ×
                    </button>
                </div>

                <p
                    className={css({
                        fontSize: '15px',
                        lineHeight: '1.6',
                        color: '#333',
                        marginBottom: '16px',
                    })}
                >
                    {node.description}
                </p>

                {node.duration && (
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: '#f5f5f5',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            color: '#666',
                            marginBottom: '16px',
                        })}
                    >
                        <span>⏱️</span>
                        <span>ca. {node.duration} Minuten</span>
                    </div>
                )}

                <button
                    onClick={onToggleComplete}
                    className={css({
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        backgroundColor: isCompleted ? '#f5f5f5' : '#4caf50',
                        color: isCompleted ? '#666' : 'white',
                        _hover: {
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        },
                    })}
                >
                    {isCompleted ? '✓ Rückgängig machen' : '✓ Als erledigt markieren'}
                </button>
            </div>
        </div>
    );
}

interface RecipeFlowProps {
    nodes: FlowNode[];
    edges: FlowEdge[];
}

export function RecipeFlow({ nodes, edges }: RecipeFlowProps) {
    const [completed, setCompleted] = useState<Set<string>>(new Set());
    const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
    const [lastCompleted, setLastCompleted] = useState<string | null>(null);
    const [isCookingMode, setIsCookingMode] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    const getActiveNode = () => {
        return nodes.find((n) => !completed.has(n.id))?.id ?? null;
    };

    const activeNode = getActiveNode();

    const toggleComplete = (id: string) => {
        setCompleted((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
                setLastCompleted(id);
                setTimeout(() => setLastCompleted(null), 700);
            }
            return next;
        });
    };

    const bounds = useMemo(() => {
        if (nodes.length === 0)
            return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 600, height: 400 };
        const xs = nodes.map((n) => n.position.x);
        const ys = nodes.map((n) => n.position.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs) + NODE_WIDTH;
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys) + NODE_HEIGHT;
        return {
            minX,
            maxX,
            minY,
            maxY,
            width: maxX - minX + NODE_GAP_X * 2,
            height: maxY - minY + NODE_GAP_Y * 2,
        };
    }, [nodes]);

    const containerStyles = isCookingMode
        ? css({
              position: 'fixed',
              inset: '0',
              zIndex: 999,
              backgroundColor: '#fafafa',
              display: 'flex',
              flexDirection: 'column',
          })
        : css({
              width: '100%',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '400px',
              backgroundColor: '#fafafa',
              borderRadius: '12px',
              overflow: 'hidden',
          });

    return (
        <div className={containerStyles}>
            <style jsx global>{`
                @keyframes cardComplete {
                    0% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.02);
                    }
                    100% {
                        transform: scale(1);
                    }
                }
                @keyframes completeGlow {
                    0% {
                        opacity: 0.9;
                    }
                    100% {
                        opacity: 0;
                    }
                }
            `}</style>

            <div
                className={css({
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    backgroundColor: 'white',
                    borderBottom: '1px solid #eee',
                    flexShrink: 0,
                })}
            >
                <div>
                    <div className={css({ fontSize: '16px', fontWeight: '700', color: '#333' })}>
                        🗺️ Koch-Flow
                    </div>
                    <div className={css({ fontSize: '12px', color: '#666' })}>
                        {completed.size} von {nodes.length} erledigt
                    </div>
                </div>
                <div className={css({ display: 'flex', alignItems: 'center', gap: '12px' })}>
                    <div className={css({ display: 'flex', alignItems: 'center', gap: '6px' })}>
                        <div
                            className={css({
                                width: '80px',
                                height: '6px',
                                backgroundColor: '#e0e0e0',
                                borderRadius: '3px',
                                overflow: 'hidden',
                            })}
                        >
                            <div
                                className={css({
                                    height: '100%',
                                    backgroundColor: '#4caf50',
                                    borderRadius: '3px',
                                    transition: 'width 0.3s ease',
                                })}
                                style={{ width: `${(completed.size / nodes.length) * 100}%` }}
                            />
                        </div>
                        <span
                            className={css({
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#4caf50',
                            })}
                        >
                            {Math.round((completed.size / nodes.length) * 100)}%
                        </span>
                    </div>
                    <button
                        onClick={() => setIsCookingMode(!isCookingMode)}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: isCookingMode ? '2px solid #4caf50' : '1px solid #ddd',
                            backgroundColor: isCookingMode ? '#e8f5e9' : 'white',
                            color: isCookingMode ? '#2e7d32' : '#666',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            _hover: {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                            },
                        })}
                    >
                        {isCookingMode ? '✕' : '🍳'} Kochmodus
                    </button>
                </div>
            </div>

            <div
                ref={containerRef}
                className={css({
                    flex: 1,
                    overflow: 'auto',
                    position: 'relative',
                    padding: '24px',
                })}
            >
                <svg
                    width={bounds.width}
                    height={bounds.height}
                    className={css({
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        pointerEvents: 'none',
                        zIndex: 0,
                    })}
                    viewBox={`0 0 ${bounds.width} ${bounds.height}`}
                >
                    {edges.map((edge) => {
                        const source = nodes.find((n) => n.id === edge.source);
                        const target = nodes.find((n) => n.id === edge.target);
                        if (!source || !target) return null;

                        const startX =
                            source.position.x - bounds.minX + NODE_WIDTH / 2 + NODE_GAP_X;
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

                <div
                    className={css({
                        position: 'relative',
                        width: bounds.width,
                        height: bounds.height,
                    })}
                >
                    {nodes.map((node) => (
                        <div
                            key={node.id}
                            style={{
                                position: 'absolute',
                                left: node.position.x - bounds.minX + NODE_GAP_X,
                                top: node.position.y - bounds.minY + NODE_GAP_Y,
                            }}
                        >
                            <NodeCard
                                node={node}
                                isCompleted={completed.has(node.id)}
                                isActive={node.id === activeNode}
                                isJustCompleted={node.id === lastCompleted}
                                onToggleComplete={() => toggleComplete(node.id)}
                                onClick={() => setSelectedNode(node)}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {completed.size === nodes.length && nodes.length > 0 && (
                <div
                    className={css({
                        padding: '16px',
                        backgroundColor: '#e8f5e9',
                        borderTop: '2px solid #4caf50',
                        textAlign: 'center',
                        flexShrink: 0,
                    })}
                >
                    <div className={css({ fontSize: '24px', marginBottom: '4px' })}>🎉</div>
                    <div className={css({ fontSize: '16px', fontWeight: '700', color: '#2e7d32' })}>
                        Fertig! Guten Appetit!
                    </div>
                </div>
            )}

            {selectedNode && (
                <NodeDetailModal
                    node={selectedNode}
                    isCompleted={completed.has(selectedNode.id)}
                    onToggleComplete={() => toggleComplete(selectedNode.id)}
                    onClose={() => setSelectedNode(null)}
                />
            )}
        </div>
    );
}
