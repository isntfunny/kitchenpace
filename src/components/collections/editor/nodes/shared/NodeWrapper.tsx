'use client';

import { GripVertical, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { css } from 'styled-system/css';

interface NodeWrapperProps {
    icon: LucideIcon;
    label: string;
    selected?: boolean;
    onDelete: () => void;
    children: React.ReactNode;
}

export function NodeWrapper({ icon: Icon, label, selected, onDelete, children }: NodeWrapperProps) {
    return (
        <div
            className={css({
                my: '3',
                borderRadius: 'xl',
                border: '2px solid',
                borderColor: selected ? 'accent' : 'border',
                bg: 'surface.elevated',
                overflow: 'hidden',
                transition: 'border-color 150ms ease',
                _hover: { borderColor: selected ? 'accent' : 'border.muted' },
            })}
            data-drag-handle
        >
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2',
                    px: '3',
                    py: '2',
                    bg: 'surface.muted',
                    borderBottom: '1px solid',
                    borderColor: 'border',
                    cursor: 'grab',
                })}
            >
                <GripVertical
                    size={14}
                    className={css({ color: 'foreground.muted', flexShrink: 0 })}
                />
                <Icon size={14} className={css({ color: 'accent', flexShrink: 0 })} />
                <span
                    className={css({ fontSize: 'xs', fontWeight: '600', color: 'text', flex: 1 })}
                >
                    {label}
                </span>
                <button
                    type="button"
                    onClick={onDelete}
                    className={css({
                        p: '1',
                        borderRadius: 'md',
                        cursor: 'pointer',
                        color: 'foreground.muted',
                        _hover: { color: 'red.500', bg: 'surface.muted' },
                    })}
                >
                    <X size={14} />
                </button>
            </div>
            <div className={css({ p: '3' })}>{children}</div>
        </div>
    );
}
