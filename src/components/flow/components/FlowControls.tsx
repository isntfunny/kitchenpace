import { ChefHat, Clock, Download, Eye, FileText, Map, RotateCcw, X } from 'lucide-react';

import { css } from 'styled-system/css';

interface FlowControlsProps {
    completedCount: number;
    totalCount: number;
    isCookingMode: boolean;
    isZoomed: boolean;
    onCookingModeToggle: () => void;
    onZoomToggle: () => void;
    onExport: (format: 'png' | 'pdf') => void;
}

export function FlowControls({
    completedCount,
    totalCount,
    isCookingMode,
    isZoomed,
    onCookingModeToggle,
    onZoomToggle,
    onExport,
}: FlowControlsProps) {
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    return (
        <>
            {/* Mobile Controls */}
            <div className="mobile-controls">
                <div>
                    <div
                        className={css({
                            display: 'flex',
                            gap: '6px',
                            alignItems: 'center',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'text',
                        })}
                    >
                        <Map size={16} />
                        <span>Koch-Flow</span>
                    </div>
                    <div className={css({ fontSize: '11px', color: 'text.muted' })}>
                        {completedCount} von {totalCount} erledigt
                    </div>
                </div>
                <div className={css({ display: 'flex', gap: '6px' })}>
                    <button
                        onClick={onCookingModeToggle}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: isCookingMode ? '2px solid #4caf50' : '1px solid',
                            borderColor: isCookingMode ? '#4caf50' : 'border',
                            backgroundColor: isCookingMode ? { base: '#e8f5e9', _dark: 'rgba(76,175,80,0.15)' } : 'surface',
                            color: isCookingMode ? { base: '#2e7d32', _dark: '#66bb6a' } : 'text.muted',
                            fontSize: '11px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        })}
                    >
                        {isCookingMode ? <X size={14} /> : <ChefHat size={14} />}
                        <span>Kochmodus</span>
                    </button>
                    <button
                        onClick={onZoomToggle}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid',
                            borderColor: 'border',
                            backgroundColor: 'surface',
                            color: 'text.muted',
                            fontSize: '11px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        })}
                    >
                        {isZoomed ? <RotateCcw size={14} /> : <Eye size={14} />}
                        <span>{isZoomed ? 'Zoom aus' : 'Zoom'}</span>
                    </button>
                </div>
            </div>

            {/* Desktop Controls */}
            <div className="flow-controls">
                <div>
                    <div
                        className={css({
                            display: 'flex',
                            gap: '6px',
                            alignItems: 'center',
                            fontSize: '16px',
                            fontWeight: '700',
                            color: 'text',
                        })}
                    >
                        <Map size={18} />
                        <span>Koch-Flow</span>
                    </div>
                    <div className={css({ fontSize: '12px', color: 'text.muted' })}>
                        {completedCount} von {totalCount} erledigt
                    </div>
                </div>
                <div className={css({ display: 'flex', alignItems: 'center', gap: '12px' })}>
                    <div className={css({ display: 'flex', alignItems: 'center', gap: '6px' })}>
                        <div
                            className={css({
                                width: '80px',
                                height: '6px',
                                backgroundColor: { base: '#e0e0e0', _dark: '#3a3a3a' },
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
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span
                            className={css({
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#4caf50',
                            })}
                        >
                            {Math.round(progress)}%
                        </span>
                    </div>
                    <button
                        onClick={onCookingModeToggle}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: isCookingMode ? '2px solid #4caf50' : '1px solid',
                            borderColor: isCookingMode ? '#4caf50' : 'border',
                            backgroundColor: isCookingMode ? { base: '#e8f5e9', _dark: 'rgba(76,175,80,0.15)' } : 'surface',
                            color: isCookingMode ? { base: '#2e7d32', _dark: '#66bb6a' } : 'text.muted',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            _hover: {
                                transform: 'translateY(-1px)',
                                boxShadow: { base: '0 2px 6px rgba(0,0,0,0.1)', _dark: '0 2px 6px rgba(0,0,0,0.3)' },
                            },
                        })}
                    >
                        {isCookingMode ? <X size={16} /> : <ChefHat size={16} />}
                        <span>Kochmodus</span>
                    </button>
                    <button
                        onClick={onZoomToggle}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: '1px solid',
                            borderColor: 'border',
                            backgroundColor: 'surface',
                            color: 'text.muted',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            _hover: {
                                transform: 'translateY(-1px)',
                                boxShadow: { base: '0 2px 6px rgba(0,0,0,0.1)', _dark: '0 2px 6px rgba(0,0,0,0.3)' },
                            },
                        })}
                    >
                        {isZoomed ? <RotateCcw size={16} /> : <Clock size={16} />}
                        <span>{isZoomed ? 'Zoom aus' : 'Zoom'}</span>
                    </button>
                    <button
                        onClick={() => onExport('png')}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: '1px solid',
                            borderColor: 'border',
                            backgroundColor: 'surface',
                            color: 'text.muted',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            _hover: {
                                transform: 'translateY(-1px)',
                                boxShadow: { base: '0 2px 6px rgba(0,0,0,0.1)', _dark: '0 2px 6px rgba(0,0,0,0.3)' },
                            },
                        })}
                    >
                        <Download size={16} />
                        PNG
                    </button>
                    <button
                        onClick={() => onExport('pdf')}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: '1px solid',
                            borderColor: 'border',
                            backgroundColor: 'surface',
                            color: 'text.muted',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            _hover: {
                                transform: 'translateY(-1px)',
                                boxShadow: { base: '0 2px 6px rgba(0,0,0,0.1)', _dark: '0 2px 6px rgba(0,0,0,0.3)' },
                            },
                        })}
                    >
                        <FileText size={16} />
                        PDF
                    </button>
                </div>
            </div>
        </>
    );
}
