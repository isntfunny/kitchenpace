'use client';

import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { motion, type PanInfo } from 'motion/react';
import Link from 'next/link';
import type { KeyboardEvent } from 'react';

import type { Toast, ToastType } from '@app/types/toast';
import { css } from 'styled-system/css';

const ICONS: Record<ToastType, typeof CheckCircle2> = {
    success: CheckCircle2,
    info: Info,
    warning: AlertTriangle,
    error: AlertCircle,
};

const ACCENTS: Record<ToastType, { border: string; glow: string; icon: string; badge: string }> = {
    success: {
        border: 'rgba(0,184,148,0.28)',
        glow: 'rgba(0,184,148,0.14)',
        icon: '#00b894',
        badge: 'rgba(0,184,148,0.12)',
    },
    info: {
        border: 'rgba(9,132,227,0.28)',
        glow: 'rgba(9,132,227,0.14)',
        icon: '#0984e3',
        badge: 'rgba(9,132,227,0.12)',
    },
    warning: {
        border: 'rgba(248,181,0,0.3)',
        glow: 'rgba(248,181,0,0.14)',
        icon: '#f8b500',
        badge: 'rgba(248,181,0,0.12)',
    },
    error: {
        border: 'rgba(224,83,83,0.28)',
        glow: 'rgba(224,83,83,0.14)',
        icon: '#e05353',
        badge: 'rgba(224,83,83,0.12)',
    },
};

function formatRelativeTime(date: Date) {
    const deltaMs = Date.now() - date.getTime();
    const deltaSeconds = Math.max(0, Math.round(deltaMs / 1000));

    if (deltaSeconds < 10) return 'gerade eben';
    if (deltaSeconds < 60) return `vor ${deltaSeconds}s`;

    const deltaMinutes = Math.round(deltaSeconds / 60);
    if (deltaMinutes < 60) return `vor ${deltaMinutes} Min.`;

    const deltaHours = Math.round(deltaMinutes / 60);
    if (deltaHours < 24) return `vor ${deltaHours} Std.`;

    const deltaDays = Math.round(deltaHours / 24);
    return `vor ${deltaDays} Tag${deltaDays === 1 ? '' : 'en'}`;
}

type ToastBubbleProps = {
    toast: Toast;
    onDismiss: () => void;
};

export function ToastBubble({ toast, onDismiss }: ToastBubbleProps) {
    const Icon = ICONS[toast.type];
    const accent = ACCENTS[toast.type];

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            onDismiss();
        }
    };

    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (Math.abs(info.offset.x) > 96 || Math.abs(info.velocity.x) > 650) {
            onDismiss();
        }
    };

    return (
        <motion.div
            layout
            drag="x"
            dragElastic={0.18}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, y: -18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 140, scale: 0.94 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={css({
                position: 'relative',
                width: '100%',
                borderRadius: '22px',
                border: '1px solid',
                background: {
                    base: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,249,243,0.96))',
                    _dark: 'linear-gradient(180deg, rgba(35,32,29,0.98), rgba(28,26,24,0.96))',
                },
                backdropFilter: 'blur(20px)',
                boxShadow: {
                    base: `0 24px 50px -28px ${accent.glow}, 0 18px 32px rgba(0,0,0,0.12)`,
                    _dark: `0 24px 50px -28px ${accent.glow}, 0 18px 32px rgba(0,0,0,0.42)`,
                },
                overflow: 'hidden',
                outline: 'none',
                _focusVisible: {
                    boxShadow: {
                        base: `0 0 0 3px ${accent.border}, 0 24px 50px -28px ${accent.glow}`,
                        _dark: `0 0 0 3px ${accent.border}, 0 24px 50px -28px ${accent.glow}`,
                    },
                },
            })}
            style={{ borderColor: accent.border, touchAction: 'pan-y' }}
        >
            <div
                className={css({
                    position: 'absolute',
                    insetInlineStart: '0',
                    top: '0',
                    bottom: '0',
                    width: '4px',
                })}
                style={{ background: accent.icon }}
            />
            <div
                className={css({
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: '3',
                    alignItems: 'start',
                    padding: '3.5',
                    paddingLeft: '4',
                })}
            >
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '38px',
                        height: '38px',
                        borderRadius: '14px',
                        flexShrink: 0,
                    })}
                    style={{ background: accent.badge, color: accent.icon }}
                >
                    <Icon size={20} />
                </div>

                <div className={css({ minWidth: 0, display: 'grid', gap: '1.5' })}>
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: '2',
                            flexWrap: 'wrap',
                        })}
                    >
                        <p
                            className={css({
                                fontSize: 'sm',
                                fontWeight: '700',
                                lineHeight: '1.3',
                                color: 'text',
                            })}
                        >
                            {toast.title}
                        </p>
                        <span
                            className={css({
                                fontSize: '2xs',
                                color: 'text.muted',
                                whiteSpace: 'nowrap',
                            })}
                        >
                            {formatRelativeTime(toast.createdAt)}
                        </span>
                    </div>

                    {toast.message && (
                        <p
                            className={css({
                                fontSize: 'sm',
                                lineHeight: '1.45',
                                color: 'text.muted',
                            })}
                        >
                            {toast.message}
                        </p>
                    )}

                    {toast.action && (
                        <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
                            {toast.action.href ? (
                                <Link
                                    href={toast.action.href}
                                    onClick={onDismiss}
                                    className={css({
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minHeight: '34px',
                                        px: '3',
                                        borderRadius: 'full',
                                        fontSize: 'xs',
                                        fontWeight: '700',
                                        textDecoration: 'none',
                                        color: 'white',
                                        background:
                                            'linear-gradient(135deg, rgba(224,123,83,1), rgba(248,181,0,1))',
                                    })}
                                >
                                    {toast.action.label}
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        toast.action?.onClick?.();
                                        onDismiss();
                                    }}
                                    className={css({
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minHeight: '34px',
                                        px: '3',
                                        borderRadius: 'full',
                                        border: '1px solid',
                                        borderColor: 'border',
                                        fontSize: 'xs',
                                        fontWeight: '700',
                                        color: 'text',
                                        background: 'surface',
                                        cursor: 'pointer',
                                    })}
                                >
                                    {toast.action.label}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Toast schließen"
                    className={css({
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: 'full',
                        border: 'none',
                        background: 'transparent',
                        color: 'text.muted',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        _hover: {
                            background: 'surface',
                            color: 'text',
                        },
                    })}
                >
                    <X size={16} />
                </button>
            </div>
        </motion.div>
    );
}
