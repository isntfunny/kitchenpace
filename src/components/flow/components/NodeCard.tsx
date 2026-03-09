'use client';

import { Check, Clock, Flame, ForkKnife, Leaf, PocketKnife, Sparkles } from 'lucide-react';

import { useIsDark } from '@app/lib/darkMode';
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

const getTypeColor = (type: string, dark: boolean): string => {
    const lightColors: Record<string, string> = {
        prep: '#e3f2fd',
        cook: '#fff3e0',
        wait: '#f3e5f5',
        season: '#e8f5e9',
        combine: '#fce4ec',
        serve: '#ffebee',
    };
    const darkColors: Record<string, string> = {
        prep: '#1a2a3d',
        cook: '#3d2a1a',
        wait: '#2d1a3d',
        season: '#1a3d1e',
        combine: '#3d1a2a',
        serve: '#3d1a1a',
    };
    const colors = dark ? darkColors : lightColors;
    return colors[type] || (dark ? '#2a2a2a' : '#f5f5f5');
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
    const dark = useIsDark();

    return (
        <div
            onClick={onClick}
            className={css({
                width: `${NODE_WIDTH}px`,
                padding: '16px',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                _hover: {
                    transform: 'translateY(-2px)',
                    boxShadow: {
                        base: '0 4px 16px rgba(0,0,0,0.12)',
                        _dark: '0 4px 16px rgba(0,0,0,0.3)',
                    },
                },
                position: 'relative',
                overflow: 'hidden',
                zIndex: 2,
            })}
            style={{
                backgroundColor: isCompleted
                    ? dark
                        ? '#1a3d1a'
                        : '#f0f9f0'
                    : getTypeColor(node.type, dark),
                border: isActive
                    ? '2px solid #2196f3'
                    : isCompleted
                      ? '2px solid #4caf50'
                      : '2px solid transparent',
                boxShadow: isActive
                    ? '0 4px 20px rgba(33, 150, 243, 0.25)'
                    : dark
                      ? '0 2px 8px rgba(0,0,0,0.3)'
                      : '0 2px 8px rgba(0,0,0,0.08)',
                animation: isJustCompleted ? 'cardComplete 600ms ease-out' : 'none',
            }}
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
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                        })}
                        style={{ color: dark ? '#a0a0a0' : '#666' }}
                    >
                        {getTypeLabel(node.type)}
                    </span>
                </div>
                {node.duration && (
                    <div
                        className={css({
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                        })}
                        style={{
                            color: dark ? '#808080' : '#888',
                            backgroundColor: dark
                                ? 'rgba(255,255,255,0.1)'
                                : 'rgba(255,255,255,0.7)',
                        }}
                    >
                        {node.duration} Min.
                    </div>
                )}
            </div>

            <div
                className={css({
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '4px',
                })}
                style={{
                    color: isCompleted ? (dark ? '#808080' : '#666') : dark ? '#e0e0e0' : '#333',
                }}
            >
                {node.label}
            </div>

            <div
                className={css({
                    fontSize: '12px',
                    lineHeight: '1.4',
                    textDecoration: isCompleted ? 'line-through' : 'none',
                })}
                style={{
                    color: isCompleted ? (dark ? '#606060' : '#888') : dark ? '#a0a0a0' : '#666',
                }}
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
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        _hover: {
                            boxShadow: {
                                base: '0 2px 6px rgba(0,0,0,0.1)',
                                _dark: '0 2px 6px rgba(0,0,0,0.3)',
                            },
                        },
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '1',
                    })}
                    style={{
                        border: isCompleted ? 'none' : dark ? '1px solid #444' : '1px solid #ddd',
                        backgroundColor: isCompleted ? '#4caf50' : dark ? '#2a2a2a' : 'white',
                        color: isCompleted ? 'white' : dark ? '#a0a0a0' : '#666',
                    }}
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
