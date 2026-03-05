import { Check, Clock, Flame, ForkKnife, Leaf, PocketKnife, Sparkles } from 'lucide-react';

import { css } from 'styled-system/css';

interface FlowNode {
    id: string;
    type: string;
    label: string;
    description: string;
    duration?: number;
    position: { x: number; y: number };
}

interface NodeCardProps {
    node: FlowNode;
    isCompleted: boolean;
    isActive: boolean;
    isJustCompleted: boolean;
    onToggleComplete: () => void;
    onClick: () => void;
}

const NODE_WIDTH = 200;

const getTypeIcon = (type: string) => {
    switch (type) {
        case 'prep':
            return <PocketKnife size={22} />;
        case 'cook':
            return <Flame size={22} />;
        case 'wait':
            return <Clock size={22} />;
        case 'season':
            return <Leaf size={22} />;
        case 'combine':
            return <ForkKnife size={22} />;
        case 'serve':
            return <Sparkles size={22} />;
        default:
            return <Sparkles size={22} />;
    }
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

export function NodeCard({
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
                    <div
                        className={css({ display: 'flex', alignItems: 'center', color: '#2196f3' })}
                    >
                        {getTypeIcon(node.type)}
                    </div>
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
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '1',
                    })}
                >
                    {isCompleted ? <Check size={14} /> : 'Fertig'}
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
