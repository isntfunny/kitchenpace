'use client';

import Link from 'next/link';
import { DropdownMenu } from 'radix-ui';

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
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    className={css({
                        minWidth: '320px',
                        maxWidth: '90vw',
                        maxHeight: '70vh',
                        borderRadius: 'xl',
                        border: '1px solid',
                        borderColor: 'border',
                        background: 'surface',
                        boxShadow: 'shadow.large',
                        padding: '4',
                        display: 'flex',
                        transformOrigin: 'var(--radix-dropdown-menu-content-transform-origin)',
                        '&[data-state="open"]': {
                            animation: 'scaleUp 200ms ease',
                        },
                        '&[data-state="closed"]': {
                            animation: 'scaleDown 150ms ease',
                        },
                        flexDirection: 'column',
                        gap: '3',
                        zIndex: 9999,
                    })}
                    sideOffset={8}
                >
                    <div
                        className={css({
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '3',
                        })}
                    >
                        <div>
                            <p className={css({ fontWeight: '800', fontSize: 'md' })}>{title}</p>
                            <p className={css({ fontSize: 'xs', color: 'text-muted' })}>
                                {subtitle}
                            </p>
                        </div>
                        {actionLabel && onAction && (
                            <button
                                type="button"
                                onClick={onAction}
                                className={css({
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'primary',
                                    fontSize: 'xs',
                                    cursor: 'pointer',
                                    textTransform: 'uppercase',
                                })}
                            >
                                {actionLabel}
                            </button>
                        )}
                    </div>

                    <div
                        className={css({
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2',
                            overflowY: 'auto',
                            maxHeight: '360px',
                        })}
                    >
                        {isLoading && (
                            <p className={css({ color: 'text-muted', fontSize: 'sm' })}>Lädt…</p>
                        )}
                        {!isLoading && isEmpty && (
                            <p className={css({ color: 'text-muted', fontSize: 'sm' })}>
                                {emptyLabel}
                            </p>
                        )}
                        {!isLoading && !isEmpty && children}
                    </div>

                    {footerHref && footerLabel && (
                        <Link
                            href={footerHref}
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '3',
                                borderRadius: '2xl',
                                background: 'accent.soft',
                                color: 'primary',
                                fontWeight: '700',
                                textDecoration: 'none',
                            })}
                        >
                            {footerLabel}
                        </Link>
                    )}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}
