'use client';

import { X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import type { ReactNode } from 'react';

import { css, cx } from 'styled-system/css';

import { actionButton, overlay, sheet, sheetWide } from './styles';

/** Bottom sheet on phones, dialog on desktop: title row with close button (KUC-101). */
export function SheetFrame({
    open,
    onOpenChange,
    title,
    subtitle,
    wide,
    children,
    onCloseAutoFocus,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    subtitle?: ReactNode;
    wide?: boolean;
    children: ReactNode;
    onCloseAutoFocus?: (event: Event) => void;
}) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className={overlay} />
                <Dialog.Content
                    className={cx(sheet, wide && sheetWide)}
                    aria-describedby={undefined}
                    onCloseAutoFocus={onCloseAutoFocus}
                >
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '2',
                            mb: '4',
                        })}
                    >
                        <div className={css({ flex: 1, minW: 0 })}>
                            <Dialog.Title
                                className={css({
                                    fontFamily: 'heading',
                                    fontSize: 'xl',
                                    fontWeight: '700',
                                    lineHeight: '1.2',
                                    overflowWrap: 'anywhere',
                                })}
                            >
                                {title}
                            </Dialog.Title>
                            {subtitle && (
                                <p className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        <Dialog.Close
                            className={actionButton({ variant: 'ghost' })}
                            aria-label="Schließen"
                        >
                            <X size={18} />
                        </Dialog.Close>
                    </div>
                    {children}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
