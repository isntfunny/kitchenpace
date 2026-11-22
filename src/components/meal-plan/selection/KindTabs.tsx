'use client';

import type { MealKind } from '@shared/meal-planning/meal-kind';

import { css } from 'styled-system/css';

import type { tabsOf } from './selection-state';

type KindTabsProps = {
    tabs: ReturnType<typeof tabsOf>;
    active: MealKind;
    onChange: (kind: MealKind) => void;
};

/** One tab per meal kind of the chosen slots, with "picked/slots"; a full tab turns green. */
export function KindTabs({ tabs, active, onChange }: KindTabsProps) {
    if (tabs.length === 0) return null;
    return (
        <div
            role="tablist"
            aria-label="Mahlzeitart"
            className={css({
                display: 'flex',
                gap: '1',
                px: { base: '4', md: '6' },
                overflowX: 'auto',
                borderBottomWidth: '1px',
                borderBottomStyle: 'solid',
                borderBottomColor: 'border',
            })}
        >
            {tabs.map((tab) => {
                const selected = tab.kind === active;
                return (
                    <button
                        key={tab.kind}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => onChange(tab.kind)}
                        className={css({
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2',
                            px: '3',
                            py: '2.5',
                            bg: 'transparent',
                            border: 'none',
                            borderBottomWidth: '2px',
                            borderBottomStyle: 'solid',
                            borderBottomColor: 'transparent',
                            color: 'text.muted',
                            fontSize: 'sm',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            _selected: { color: 'text', borderBottomColor: 'primary' },
                            _focusVisible: {
                                outline: '2px solid',
                                outlineColor: 'primary',
                                outlineOffset: '-2px',
                            },
                        })}
                    >
                        {tab.label}
                        <span
                            className={css({
                                px: '2',
                                py: '0.5',
                                borderRadius: 'full',
                                fontSize: 'xs',
                                fontVariantNumeric: 'tabular-nums',
                                bg: tab.full ? 'status.success' : 'surface.muted',
                                color: tab.full ? 'white' : 'text',
                            })}
                        >
                            {tab.used}/{tab.capacity}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
