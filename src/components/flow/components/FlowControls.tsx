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
                            color: '#333',
                        })}
                    >
                        <Map size={16} />
                        <span>Koch-Flow</span>
                    </div>
                    <div className={css({ fontSize: '11px', color: '#666' })}>
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
                            border: isCookingMode ? '2px solid #4caf50' : '1px solid #ddd',
                            backgroundColor: isCookingMode ? '#e8f5e9' : 'white',
                            color: isCookingMode ? '#2e7d32' : '#666',
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
                            border: '1px solid #ddd',
                            backgroundColor: 'white',
                            color: '#666',
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
                            color: '#333',
                        })}
                    >
                        <Map size={18} />
                        <span>Koch-Flow</span>
                    </div>
                    <div className={css({ fontSize: '12px', color: '#666' })}>
                        {completedCount} von {totalCount} erledigt
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
                            border: '1px solid #ddd',
                            backgroundColor: 'white',
                            color: '#666',
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
                            border: '1px solid #ddd',
                            backgroundColor: 'white',
                            color: '#666',
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
                            border: '1px solid #ddd',
                            backgroundColor: 'white',
                            color: '#666',
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
                        <FileText size={16} />
                        PDF
                    </button>
                </div>
            </div>
        </>
    );
}
