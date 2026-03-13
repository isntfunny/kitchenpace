'use client';

import type { LucideIcon } from 'lucide-react';
import * as icons from 'lucide-react';
import { Utensils } from 'lucide-react';
import { createElement } from 'react';

import { PALETTE } from '@app/lib/palette';
import { css, cx } from 'styled-system/css';

import { Category } from '../data';

function resolveIcon(iconName: string | null): LucideIcon {
    if (!iconName) return Utensils;
    const pascal = iconName
        .split('-')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');
    const icon = (icons as Record<string, unknown>)[pascal];
    return (icon as LucideIcon) ?? Utensils;
}

interface CategorySelectorProps {
    categories: Category[];
    selectedIds: string[];
    onToggle: (id: string, selected: boolean) => void;
}

export function CategorySelector({ categories, selectedIds, onToggle }: CategorySelectorProps) {
    const noneSelected = selectedIds.length === 0;
    return (
        <div>
            <label
                className={css({
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1',
                    mb: '2',
                    fontSize: 'sm',
                })}
            >
                Kategorien
                <span
                    className={css({
                        color: noneSelected ? 'palette.orange' : 'text.muted',
                        fontWeight: noneSelected ? '700' : '400',
                        fontSize: 'sm',
                        transition: 'color 200ms',
                    })}
                >
                    *
                </span>
            </label>
            <div
                className={css({ display: 'flex', flexWrap: 'wrap', gap: '2' })}
                data-tutorial="category"
            >
                {categories.map((cat) => {
                    const selected = selectedIds.includes(cat.id);

                    return (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => onToggle(cat.id, !selected)}
                            className={cx(pillBase, selected && pillSelected)}
                            style={
                                selected
                                    ? {
                                          background: `linear-gradient(135deg, ${PALETTE.orange}, ${PALETTE.gold})`,
                                          color: 'white',
                                          borderColor: PALETTE.orange,
                                      }
                                    : undefined
                            }
                        >
                            {createElement(resolveIcon(cat.icon), { size: 14 })}
                            {cat.name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

const pillBase = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5',
    px: '3',
    py: '2',
    borderRadius: 'full',
    fontSize: 'xs',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    border: '2px solid',
    borderColor: 'border.muted',
    background: 'surface',
    color: 'foreground.muted',
    flex: '1 0 auto',
    minWidth: 'calc(25% - 6px)',
});

const pillSelected = css({});
