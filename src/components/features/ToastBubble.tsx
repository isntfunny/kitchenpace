'use client';

import { AlertCircle, AlertTriangle, CheckCircle2, ChefHat, Info, X } from 'lucide-react';
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
    showTail?: boolean;
    isMobile?: boolean;
    onDismiss: () => void;
};

export function ToastBubble({
    toast,
    showTail = false,
    isMobile = false,
    onDismiss,
}: ToastBubbleProps) {
    const Icon = ICONS[toast.type];

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            onDismiss();
        }
    };

    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        // Mobile: swipe up to dismiss; Desktop: drag left/right
        if (isMobile) {
            if (info.offset.y < -40 || info.velocity.y < -400) onDismiss();
        } else {
            if (Math.abs(info.offset.x) > 96 || Math.abs(info.velocity.x) > 650) onDismiss();
        }
    };

    return (
        <motion.div
            layout
            drag={isMobile ? 'y' : 'x'}
            dragElastic={0.15}
            dragConstraints={isMobile ? { top: 0, bottom: 0 } : { left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            // Mobile: slides down from top; Desktop: slides in from the right (badge side)
            initial={
                isMobile ? { opacity: 0, y: -48, scale: 0.95 } : { opacity: 0, x: 14, scale: 0.93 }
            }
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={
                isMobile ? { opacity: 0, y: -48, scale: 0.95 } : { opacity: 0, x: 14, scale: 0.93 }
            }
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={css({
                position: 'relative',
                width: '100%',
                outline: 'none',
                transformOrigin: isMobile ? 'top center' : 'top right',
            })}
            style={{ touchAction: isMobile ? 'pan-x' : 'pan-y' }}
        >
            {/* Speech bubble tail — right-pointing, toward the badge.
                Positioned at top:11px so its center (11+9=20px) aligns with the
                badge center (badge_top+10 + crossAxis_offset=10 = 20px from container top) */}
            {showTail && !isMobile && (
                <div
                    aria-hidden="true"
                    className={css({
                        position: 'absolute',
                        top: '11px',
                        right: '-9px',
                        width: '18px',
                        height: '18px',
                        rotate: '45deg',
                        borderTop: '1px solid',
                        borderRight: '1px solid',
                        borderColor: 'border',
                        // matches card gradient start color
                        background: {
                            base: '#fffaf7',
                            _dark: '#1e1916',
                        },
                        zIndex: 1,
                        pointerEvents: 'none',
                    })}
                />
            )}

            {/* Card */}
            <div
                className={css({
                    position: 'relative',
                    width: '100%',
                    borderRadius: isMobile ? 'xl' : '2xl',
                    border: '1px solid',
                    borderColor: 'border',
                    background: {
                        base: 'linear-gradient(135deg, #fffaf7 0%, #fef4ec 100%)',
                        _dark: 'linear-gradient(135deg, #1e1916 0%, #261f1a 100%)',
                    },
                    overflow: 'hidden',
                    boxShadow: {
                        base: '0 2px 12px rgba(224,123,83,0.10), 0 1px 3px rgba(0,0,0,0.04)',
                        _dark: '0 2px 12px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.2)',
                    },
                })}
            >
                {/* Brand orange left stripe with gradient */}
                <div
                    className={css({
                        position: 'absolute',
                        insetInlineStart: 0,
                        top: 0,
                        bottom: 0,
                        width: '3px',
                        background: 'linear-gradient(180deg, #f76b15 0%, #e07b53 100%)',
                    })}
                />

                {/* Decorative XXL ChefHat SVG — very faint, bottom-right, same as HeroSpotlight */}
                <div
                    aria-hidden="true"
                    className={css({
                        position: 'absolute',
                        bottom: '-10px',
                        right: '-6px',
                        pointerEvents: 'none',
                        color: 'primary',
                        opacity: { base: 0.055, _dark: 0.07 },
                    })}
                >
                    <ChefHat size={72} />
                </div>

                {/* Content */}
                <div
                    className={css({
                        position: 'relative',
                        zIndex: 1,
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr auto',
                        gap: '3',
                        alignItems: 'center',
                        px: '3.5',
                        py: '3',
                        pl: '4',
                    })}
                >
                    {/* Icon — ${brand}14 background, same pattern as StatPill / RecipeSection */}
                    <div
                        className={css({
                            width: '36px',
                            height: '36px',
                            borderRadius: 'lg',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            background: {
                                base: 'rgba(224,123,83,0.14)',
                                _dark: 'rgba(224,123,83,0.18)',
                            },
                            color: 'primary',
                        })}
                    >
                        <Icon size={18} />
                    </div>

                    {/* Text */}
                    <div className={css({ minWidth: 0 })}>
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
                                    lineHeight: '1.35',
                                    color: 'text',
                                })}
                            >
                                {toast.title}
                            </p>
                            <span
                                className={css({
                                    fontSize: '2xs',
                                    color: 'foreground.muted',
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
                                    lineHeight: '1.5',
                                    color: 'foreground.muted',
                                    mt: '0.5',
                                })}
                            >
                                {toast.message}
                            </p>
                        )}

                        {toast.action && (
                            <div
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2',
                                    mt: '2',
                                })}
                            >
                                {toast.action.href ? (
                                    <Link
                                        href={toast.action.href}
                                        onClick={onDismiss}
                                        className={css({
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: '30px',
                                            px: '3',
                                            borderRadius: 'full',
                                            fontSize: 'xs',
                                            fontWeight: '700',
                                            textDecoration: 'none',
                                            color: 'white',
                                            background: 'primary',
                                            transition: 'opacity 150ms ease',
                                            _hover: { opacity: 0.88 },
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
                                            height: '30px',
                                            px: '3',
                                            borderRadius: 'full',
                                            border: '1px solid',
                                            borderColor: 'border',
                                            fontSize: 'xs',
                                            fontWeight: '700',
                                            color: 'text',
                                            background: 'transparent',
                                            cursor: 'pointer',
                                            transition: 'background 150ms ease',
                                            _hover: { background: 'surface.muted' },
                                        })}
                                    >
                                        {toast.action.label}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Close */}
                    <button
                        type="button"
                        onClick={onDismiss}
                        aria-label="Toast schließen"
                        className={css({
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: 'full',
                            border: 'none',
                            background: 'transparent',
                            color: 'foreground.muted',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'all 120ms ease',
                            _hover: {
                                background: 'rgba(224,123,83,0.10)',
                                color: 'primary',
                            },
                        })}
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
