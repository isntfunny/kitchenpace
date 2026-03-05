import { Check, Clock, X } from 'lucide-react';

import { css } from 'styled-system/css';

interface FlowNode {
    id: string;
    type: string;
    label: string;
    description: string;
    duration?: number;
}

interface NodeDetailModalProps {
    node: FlowNode;
    isCompleted: boolean;
    onToggleComplete: () => void;
    onClose: () => void;
}

const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
        prep: '🔪',
        cook: '🔥',
        wait: '⏰',
        season: '🌿',
        combine: '🍽️',
        serve: '✨',
    };
    return icons[type] || '✨';
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

export function NodeDetailModal({
    node,
    isCompleted,
    onToggleComplete,
    onClose,
}: NodeDetailModalProps) {
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
                    width: '100',
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
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            color: '#2196f3',
                        })}
                    >
                        <span style={{ fontSize: '24px' }}>{getTypeIcon(node.type)}</span>
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
                        <X size={24} />
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
                        <Clock size={16} />
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
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1',
                    })}
                >
                    {isCompleted ? (
                        <>
                            <Check size={16} /> Rückgängig machen
                        </>
                    ) : (
                        <>
                            <Check size={16} /> Als erledigt markieren
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
