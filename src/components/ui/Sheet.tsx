'use client';

import { X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import type { ReactNode } from 'react';

import { IconButton } from '@app/components/atoms/Button';
import { sheet, sheetOverlay } from '@app/components/atoms/recipes';

import { css, cx } from 'styled-system/css';

type SheetVariants = NonNullable<Parameters<typeof sheet>[0]>;

const head = css({ display: 'flex', alignItems: 'flex-start', gap: '2', mb: '4' });
const titleText = css({
    fontFamily: 'heading',
    fontSize: 'xl',
    fontWeight: '700',
    lineHeight: '1.2',
    overflowWrap: 'anywhere',
});
const subtitleText = css({ fontSize: 'sm', color: 'foreground.muted', mt: '1' });
const foot = css({
    display: 'flex',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: '2',
    mt: '5',
});

/**
 * The one dialog of the app (KUC-136): bottom sheet on phones, dialog or side panel from md.
 * Title row with close button; `header={false}` keeps the title for screen readers only,
 * for dialogs that draw their own head (e.g. the week selection).
 */
export function Sheet({
    open,
    onOpenChange,
    title,
    subtitle,
    trigger,
    footer,
    header = true,
    placement,
    size,
    className,
    children,
    onCloseAutoFocus,
    describedBy,
}: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title: ReactNode;
    subtitle?: ReactNode;
    /** Element that opens the sheet (rendered with `asChild`) */
    trigger?: ReactNode;
    /** Action row at the bottom, right aligned */
    footer?: ReactNode;
    header?: boolean;
    placement?: SheetVariants['placement'];
    size?: SheetVariants['size'];
    className?: string;
    children: ReactNode;
    onCloseAutoFocus?: (event: Event) => void;
    /** Id of an element inside that describes the sheet (e.g. a status line) */
    describedBy?: string;
}) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
            <Dialog.Portal>
                <Dialog.Overlay className={sheetOverlay} />
                <Dialog.Content
                    className={cx(sheet({ placement, size }), className)}
                    aria-describedby={describedBy}
                    onCloseAutoFocus={onCloseAutoFocus}
                >
                    {header ? (
                        <div className={head}>
                            <div className={css({ flex: 1, minW: 0 })}>
                                <Dialog.Title className={titleText}>{title}</Dialog.Title>
                                {subtitle && <p className={subtitleText}>{subtitle}</p>}
                            </div>
                            <Dialog.Close asChild>
                                <IconButton variant="ghost" size="sm" aria-label="Schließen">
                                    <X size={18} />
                                </IconButton>
                            </Dialog.Close>
                        </div>
                    ) : (
                        <Dialog.Title className={css({ srOnly: true })}>{title}</Dialog.Title>
                    )}
                    {children}
                    {footer && <div className={foot}>{footer}</div>}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

/** Closes the surrounding sheet; wrap a Button in it. */
export const SheetClose = Dialog.Close;
