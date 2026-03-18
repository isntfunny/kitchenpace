'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { Popover } from 'radix-ui';

import { css } from 'styled-system/css';

type InboxDropdownProps = {
    trigger: React.ReactNode;
    title: string;
    subtitle: string;
    actionLabel?: string;
    onAction?: () => void;
    isLoading?: boolean;
    isEmpty?: boolean;
    emptyLabel: string;
    children: React.ReactNode;
    footerHref?: string;
    footerLabel?: string;
};

export function InboxDropdown({
    trigger,
    title,
    subtitle,
    actionLabel,
    onAction,
    isLoading,
    isEmpty,
    emptyLabel,
    children,
    footerHref,
    footerLabel,
}: InboxDropdownProps) {
    return (
        <Popover.Root>
            <Popover.Trigger asChild>{trigger}</Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    className={css({
                        width: '360px',
                        maxWidth: '92vw',
                        maxHeight: '70vh',
                        borderRadius: 'surface',
                        border: '1px solid',
                        borderColor: 'border',
                        background: 'surface.elevated',
                        boxShadow: {
                            base: '0 25px 65px -5px rgba(0,0,0,0.15), 0 8px 20px -8px rgba(0,0,0,0.1)',
                            _dark: '0 25px 65px -5px rgba(0,0,0,0.5), 0 8px 20px -8px rgba(0,0,0,0.4)',
                        },
                        display: 'flex',
                        transformOrigin: 'var(--radix-popover-content-transform-origin)',
                        '&[data-state="open"]': {
                            animation: 'scaleUp 200ms ease',
                        },
                        '&[data-state="closed"]': {
                            animation: 'scaleDown 150ms ease',
                        },
                        flexDirection: 'column',
                        zIndex: 9999,
                        overflow: 'hidden',
                    })}
                    sideOffset={12}
                    align="end"
                >
                    {/* Header with gradient accent bar */}
                    <div
                        className={css({
                            background: {
                                base: 'linear-gradient(135deg, rgba(224,123,83,0.06) 0%, rgba(248,181,0,0.04) 100%)',
                                _dark: 'linear-gradient(135deg, rgba(224,123,83,0.1) 0%, rgba(248,181,0,0.06) 100%)',
                            },
                            px: '4',
                            py: '3',
                        })}
                    >
                        <div
                            className={css({
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '3',
                            })}
                        >
                            <div
                                className={css({ display: 'flex', alignItems: 'center', gap: '2' })}
                            >
                                <div
                                    className={css({
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: 'lg',
                                        background: 'linear-gradient(135deg, #e07b53, #f8b500)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    })}
                                >
                                    <Bell size={14} color="white" />
                                </div>
                                <div>
                                    <p
                                        className={css({
                                            fontWeight: '700',
                                            fontSize: 'sm',
                                            lineHeight: '1.2',
                                        })}
                                    >
                                        {title}
                                    </p>
                                    <p
                                        className={css({
                                            fontSize: '2xs',
                                            color: 'text-muted',
                                            lineHeight: '1.2',
                                        })}
                                    >
                                        {subtitle}
                                    </p>
                                </div>
                            </div>
                            {actionLabel && onAction && (
                                <button
                                    type="button"
                                    onClick={onAction}
                                    className={css({
                                        border: 'none',
                                        background: 'transparent',
                                        color: 'primary',
                                        fontSize: '2xs',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        whiteSpace: 'nowrap',
                                        padding: '1',
                                        borderRadius: 'md',
                                        transition: 'background 150ms ease',
                                        _hover: { background: 'accent.soft' },
                                    })}
                                >
                                    {actionLabel}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Scrollable list */}
                    <div
                        className={css({
                            position: 'relative',
                        })}
                    >
                        {/* Fade-in gradient at top of list */}
                        <div
                            className={css({
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '24px',
                                background: {
                                    base: 'linear-gradient(to top, rgba(255,255,255,0), #ffffff)',
                                    _dark: 'linear-gradient(to top, rgba(26,29,33,0), #1a1d21)',
                                },
                                pointerEvents: 'none',
                                zIndex: 1,
                            })}
                        />
                        <div
                            className={css({
                                display: 'flex',
                                flexDirection: 'column',
                                overflowY: 'auto',
                                maxHeight: '340px',
                                py: '1',
                            })}
                        >
                            {isLoading && (
                                <div
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        py: '8',
                                    })}
                                >
                                    <div
                                        className={css({
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            border: '2px solid',
                                            borderColor: 'border',
                                            borderTopColor: 'primary',
                                            animation: 'spin 1s linear infinite',
                                        })}
                                    />
                                </div>
                            )}
                            {!isLoading && isEmpty && (
                                <div className={css({ textAlign: 'center', py: '8', px: '4' })}>
                                    <div
                                        className={css({
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: 'full',
                                            background: 'accent.soft',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            mx: 'auto',
                                            mb: '2',
                                        })}
                                    >
                                        <Bell size={18} className={css({ color: 'text-muted' })} />
                                    </div>
                                    <p className={css({ color: 'text-muted', fontSize: 'sm' })}>
                                        {emptyLabel}
                                    </p>
                                </div>
                            )}
                            {!isLoading && !isEmpty && children}
                        </div>
                        {/* Fade-out gradient at bottom of list */}
                        <div
                            className={css({
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: '40px',
                                background: {
                                    base: 'linear-gradient(to bottom, rgba(255,255,255,0), #ffffff)',
                                    _dark: 'linear-gradient(to bottom, rgba(26,29,33,0), #1a1d21)',
                                },
                                pointerEvents: 'none',
                                borderRadius: '0 0 xl xl',
                            })}
                        />
                    </div>

                    {/* Footer */}
                    {footerHref && footerLabel && (
                        <div
                            className={css({
                                px: '3',
                                py: '2.5',
                                display: 'flex',
                                justifyContent: 'center',
                            })}
                        >
                            <Link
                                href={footerHref}
                                className={css({
                                    display: 'flex',
                                    width: '100%',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    px: '4',
                                    py: '1.5',
                                    borderRadius: 'full',
                                    background: 'linear-gradient(135deg, #e07b53, #f8b500)',
                                    color: 'white',
                                    fontWeight: '600',
                                    fontSize: 'xs',
                                    textDecoration: 'none',
                                    transition: 'all 150ms ease',
                                    boxShadow: '0 2px 8px rgba(224,123,83,0.3)',
                                    _hover: {
                                        transform: 'translateY(-1px)',
                                        boxShadow: '0 4px 12px rgba(224,123,83,0.4)',
                                    },
                                })}
                            >
                                {footerLabel}
                            </Link>
                        </div>
                    )}
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
