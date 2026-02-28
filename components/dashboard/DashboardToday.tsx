'use client';

import { CheckCircle, Clipboard, Flame, Hourglass, ChefHat } from 'lucide-react';

import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

interface TimelineItem {
    id: string;
    time: string;
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed';
    lane?: string;
    duration?: string;
}

interface DashboardTodayProps {
    items: TimelineItem[];
}

const statusConfig = {
    pending: {
        bg: 'rgba(0,0,0,0.04)',
        border: 'rgba(0,0,0,0.1)',
        text: 'text-muted',
        icon: <Hourglass size={18} color="#636e72" />,
    },
    in_progress: {
        bg: 'rgba(224,123,83,0.1)',
        border: '#e07b53',
        text: 'primary',
        icon: <Flame size={18} color="#e07b53" />,
    },
    completed: {
        bg: 'rgba(0,184,148,0.1)',
        border: '#00b894',
        text: '#00b894',
        icon: <CheckCircle size={18} color="#00b894" />,
    },
};

const laneColors: Record<string, string> = {
    vorbereitung: '#74b9ff',
    kochen: '#e07b53',
    backen: '#fd79a8',
    warten: '#a29bfe',
    wuerzen: '#00b894',
    servieren: '#f8b500',
};

function TimelineItemComponent({ item, isLast }: { item: TimelineItem; isLast: boolean }) {
    const status = statusConfig[item.status];
    const laneColor = item.lane ? laneColors[item.lane] || '#e07b53' : '#e07b53';

    return (
        <div
            className={flex({
                gap: '4',
                position: 'relative',
            })}
        >
            <div
                className={css({
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                })}
            >
                <div
                    className={css({
                        width: '40px',
                        height: '40px',
                        borderRadius: 'full',
                        background: status.bg,
                        border: '2px solid',
                        borderColor: status.border,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 'md',
                        flexShrink: 0,
                        zIndex: 1,
                        transition: 'all 200ms ease',
                    })}
                >
                    {status.icon}
                </div>
                {!isLast && (
                    <div
                        className={css({
                            width: '2px',
                            flex: '1',
                            minHeight: '40px',
                            background:
                                item.status === 'completed' ? '#00b894' : 'rgba(0,0,0,0.08)',
                            marginTop: '2',
                        })}
                    />
                )}
            </div>

            <div
                className={css({
                    flex: '1',
                    paddingBottom: isLast ? '0' : '6',
                })}
            >
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2',
                        mb: '1',
                    })}
                >
                    <span
                        className={css({
                            fontSize: 'xs',
                            fontWeight: '600',
                            color: status.text,
                            textTransform: 'uppercase',
                            letterSpacing: 'wide',
                        })}
                    >
                        {item.time}
                    </span>
                    {item.lane && (
                        <span
                            className={css({
                                fontSize: 'xs',
                                fontWeight: '500',
                                color: laneColor,
                                background: `${laneColor}15`,
                                px: '2',
                                py: '0.5',
                                borderRadius: 'full',
                            })}
                        >
                            {item.lane}
                        </span>
                    )}
                    {item.duration && (
                        <span
                            className={css({
                                fontSize: 'xs',
                                color: 'text-muted',
                            })}
                        >
                            {item.duration}
                        </span>
                    )}
                </div>
                <h4
                    className={css({
                        fontWeight: '600',
                        color: 'text',
                        fontSize: 'md',
                    })}
                >
                    {item.title}
                </h4>
                <p
                    className={css({
                        fontSize: 'sm',
                        color: 'text-muted',
                        mt: '1',
                    })}
                >
                    {item.description}
                </p>
            </div>
        </div>
    );
}

export function DashboardToday({ items }: DashboardTodayProps) {
    return (
        <div
            className={css({
                background: 'surface.elevated',
                borderRadius: '2xl',
                padding: '6',
                border: '1px solid',
                borderColor: 'rgba(0,0,0,0.06)',
            })}
        >
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: '6',
                })}
            >
                <div>
                    <h3
                        className={css({
                            fontSize: 'xl',
                            fontWeight: '700',
                            color: 'text',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        })}
                    >
                        <ChefHat size={26} color="#e07b53" />
                        Heute beim Kochen
                    </h3>
                    <p
                        className={css({
                            fontSize: 'sm',
                            color: 'text-muted',
                            mt: '1',
                        })}
                    >
                        Dein aktueller Kochplan
                    </p>
                </div>
                <button
                    className={css({
                        fontSize: 'sm',
                        fontWeight: '600',
                        color: 'primary',
                        background: 'rgba(224,123,83,0.1)',
                        border: 'none',
                        px: '4',
                        py: '2',
                        borderRadius: 'lg',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        _hover: {
                            background: 'rgba(224,123,83,0.2)',
                        },
                    })}
                >
                    Bearbeiten
                </button>
            </div>

            <div
                className={css({
                    paddingLeft: '2',
                })}
            >
                {items.map((item, index) => (
                    <TimelineItemComponent
                        key={item.id}
                        item={item}
                        isLast={index === items.length - 1}
                    />
                ))}
            </div>

            {items.length === 0 && (
                <div
                    className={css({
                        textAlign: 'center',
                        py: '8',
                        color: 'text-muted',
                    })}
                >
                    <span
                        className={css({
                            fontSize: '3xl',
                            display: 'block',
                            mb: '2',
                            color: '#636e72',
                        })}
                    >
                        <Clipboard size={40} />
                    </span>
                    <p>Keine geplanten Gerichte heute</p>
                    <button
                        className={css({
                            marginTop: '3',
                            fontSize: 'sm',
                            fontWeight: '600',
                            color: 'primary',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            _hover: {
                                textDecoration: 'underline',
                            },
                        })}
                    >
                        Planung starten →
                    </button>
                </div>
            )}
        </div>
    );
}
