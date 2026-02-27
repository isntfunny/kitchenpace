import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
    ChefHat,
    Check,
    Clock,
    Download,
    Eye,
    FileText,
    Flame,
    ForkKnife,
    Leaf,
    Map,
    PocketKnife,
    RotateCcw,
    Sparkles,
    X,
    ZoomIn,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { css } from 'styled-system/css';

interface FlowNode {
    id: string;
    type: string;
    label: string;
    description: string;
    duration?: number;
    position: { x: number; y: number };
}

interface FlowEdge {
    id: string;
    source: string;
    target: string;
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;
const NODE_GAP_X = 80;
const NODE_GAP_Y = 60;

const LANES = [
    { id: 'vorbereitung', label: 'Vorbereitung', color: '#e3f2fd', y: 100 },
    { id: 'kochen', label: 'Kochen', color: '#fff3e0', y: 280 },
    { id: 'backen', label: 'Backen', color: '#fce4ec', y: 460 },
    { id: 'warten', label: 'Warten', color: '#f3e5f5', y: 640 },
    { id: 'wuerzen', label: 'Würzen', color: '#e8f5e9', y: 820 },
    { id: 'servieren', label: 'Servieren', color: '#ffebee', y: 1000 },
];

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
                        {getTypeIcon(node.type)}
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

interface RecipeFlowProps {
    nodes: FlowNode[];
    edges: FlowEdge[];
}

export function RecipeFlow({ nodes, edges }: RecipeFlowProps) {
    const [completed, setCompleted] = useState<Set<string>>(new Set());
    const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
    const [lastCompleted, setLastCompleted] = useState<string | null>(null);
    const [isCookingMode, setIsCookingMode] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false);

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

    const handleExport = (format: 'png' | 'pdf') => {
        if (!containerRef.current) return;

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;

        // Create a temporary container to render the flow
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.top = '-9999px';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = '100%';
        tempContainer.style.height = 'auto';
        tempContainer.style.backgroundColor = 'white';

        document.body.appendChild(tempContainer);

        // Clone the flow content
        const clone = containerRef.current.cloneNode(true);
        tempContainer.appendChild(clone);

        // Wait for rendering
        setTimeout(() => {
            const { width, height } = tempContainer.getBoundingClientRect();
            canvas.width = width * window.devicePixelRatio;
            canvas.height = height * window.devicePixelRatio;

            context.scale(window.devicePixelRatio, window.devicePixelRatio);

            // Render the cloned content to canvas
            html2canvas(clone as HTMLElement, {
                canvas: canvas,
                scale: 2,
                backgroundColor: 'white',
            }).then((canvas) => {
                if (format === 'png') {
                    canvas.toBlob((blob) => {
                        if (blob) {
                            saveAs(blob, 'rezept-flow.png');
                        }
                    });
                } else {
                    // Convert canvas to PDF
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jsPDF({
                        orientation: 'landscape',
                        unit: 'px',
                        format: [canvas.width, canvas.height],
                    });
                    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                    pdf.save('rezept-flow.pdf');
                }

                // Clean up
                document.body.removeChild(tempContainer);
            });
        }, 100);
    };

    const handleZoom = (zoomIn: boolean) => {
        setIsZoomed(zoomIn);
        // Implement zoom logic here - this would require more complex state management
        // For now, we'll just toggle a class that could be used for zoom styles
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
              backgroundColor: '#fafafa',
              borderRadius: '12px',
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
                .lane-label {
                    position: absolute;
                    left: -40px;
                    top: 50%;
                    transform: translateY(-50%) rotate(-90deg);
                    transform-origin: center;
                    color: white;
                    font-weight: 600;
                    font-size: 12px;
                    text-align: center;
                    width: 200px;
                    background: rgba(0, 0, 0, 0.3);
                    padding: 4px 8px;
                    border-radius: 4px;
                    pointer-events: none;
                }
                .flow-controls {
                    display: flex;
                    gap: 8px;
                    padding: 12px;
                    background: white;
                    border-bottom: 1px solid #eee;
                }
                .flow-controls button {
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    background: white;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .flow-controls button:hover {
                    background: #f5f5f5;
                    border-color: #999;
                }
                .flow-controls button.active {
                    background: #2196f3;
                    color: white;
                    border-color: #2196f3;
                }
                .mobile-controls {
                    display: none;
                }
                @media (max-width: 768px) {
                    .mobile-controls {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 12px;
                    }
                    .flow-controls {
                        display: none;
                    }
                }
            `}</style>

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
                        {completed.size} von {nodes.length} erledigt
                    </div>
                </div>
                <div className={css({ display: 'flex', gap: '6px' })}>
                    <button
                        onClick={() => setIsCookingMode(!isCookingMode)}
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
                        onClick={() => handleZoom(!isZoomed)}
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
                        {isCookingMode ? <X size={16} /> : <ChefHat size={16} />}
                        <span>Kochmodus</span>
                    </button>
                    <button
                        onClick={() => handleZoom(!isZoomed)}
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
                        {isZoomed ? <RotateCcw size={16} /> : <ZoomIn size={16} />}
                        <span>{isZoomed ? 'Zoom aus' : 'Zoom'}</span>
                    </button>
                    <button
                        onClick={() => handleExport('png')}
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
                        onClick={() => handleExport('pdf')}
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

            <div
                ref={containerRef}
                className={css({
                    flex: isCookingMode ? 1 : 'none',
                    overflow: isCookingMode ? 'auto' : 'visible',
                    position: 'relative',
                    padding: '24px',
                    height: isCookingMode ? 'auto' : bounds.height,
                })}
            >
                {/* Background for lanes */}
                <div
                    className={css({
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        pointerEvents: 'none',
                        zIndex: 1,
                    })}
                >
                    {LANES.map((lane) => (
                        <div
                            key={lane.id}
                            className={css({
                                position: 'absolute',
                                top: lane.y,
                                left: 0,
                                right: 0,
                                height: 200,
                                backgroundColor: lane.color,
                                opacity: 0.8,
                                borderRadius: '12px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            })}
                        />
                    ))}
                </div>

                {/* Lane Labels */}
                <div
                    className={css({
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        pointerEvents: 'none',
                        zIndex: 2,
                    })}
                >
                    {LANES.map((lane) => (
                        <div key={lane.id} className="lane-label" style={{ top: lane.y + 100 }}>
                            {lane.label}
                        </div>
                    ))}
                </div>

                {/* SVG Edges */}
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

                {/* Nodes */}
                <div
                    className={css({
                        position: 'relative',
                        width: bounds.width,
                        height: bounds.height,
                        zIndex: 3,
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
                    <div
                        className={css({ fontSize: '24px', marginBottom: '4px', color: '#4caf50' })}
                    >
                        <Sparkles size={32} />
                    </div>
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
