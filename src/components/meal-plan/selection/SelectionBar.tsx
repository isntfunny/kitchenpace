'use client';

import { Loader2 } from 'lucide-react';

import { Button } from '@app/components/atoms/Button';
import { SmartImage } from '@app/components/atoms/SmartImage';

import { css } from 'styled-system/css';

import type { Pick, tabsOf } from './selection-state';

type SelectionBarProps = {
    picks: Pick[];
    tabs: ReturnType<typeof tabsOf>;
    onApply: () => void;
    applying: boolean;
    error: string | null;
};

/** Bar at the bottom: the picks as thumbnails, "4 von 8 Plätzen", counters and "Übernehmen". */
export function SelectionBar({ picks, tabs, onApply, applying, error }: SelectionBarProps) {
    const used = tabs.reduce((sum, tab) => sum + tab.used, 0);
    const capacity = tabs.reduce((sum, tab) => sum + tab.capacity, 0);
    const sides = picks.filter((pick) => pick.side?.accepted).length;
    return (
        <footer
            className={css({
                display: 'flex',
                alignItems: 'center',
                gap: { base: '3', md: '4' },
                px: { base: '4', md: '6' },
                pt: '3',
                pb: 'max(12px, env(safe-area-inset-bottom))',
                bg: 'surface',
                borderTopWidth: '1px',
                borderTopStyle: 'solid',
                borderTopColor: 'border',
            })}
        >
            <div
                aria-hidden
                className={css({ display: { base: 'none', sm: 'flex' }, flexShrink: 0 })}
            >
                {picks.slice(0, 8).map((pick, index) => (
                    <span
                        key={pick.recipe.id}
                        className={css({
                            w: '36px',
                            h: '36px',
                            borderRadius: 'full',
                            overflow: 'hidden',
                            outline: '2px solid',
                            outlineColor: 'surface',
                            bg: 'surface.muted',
                        })}
                        style={{ marginLeft: index === 0 ? 0 : -10 }}
                    >
                        <SmartImage
                            imageKey={pick.recipe.imageKey}
                            src={pick.recipe.image ?? undefined}
                            alt=""
                            aspect="1:1"
                            sizes="36px"
                        />
                    </span>
                ))}
            </div>
            <div
                className={css({
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1',
                    minW: 0,
                    flex: 1,
                })}
            >
                <p className={css({ fontSize: 'sm' })} aria-live="polite">
                    <b>{used}</b>{' '}
                    <span className={css({ color: 'text.muted' })}>
                        von {capacity} {capacity === 1 ? 'Platz' : 'Plätzen'}
                        {sides > 0 && ` · ${sides} ${sides === 1 ? 'Beilage' : 'Beilagen'}`}
                    </span>
                </p>
                <div
                    className={css({
                        h: '4px',
                        borderRadius: 'full',
                        bg: 'surface.muted',
                        overflow: 'hidden',
                        maxW: '320px',
                    })}
                >
                    <span
                        className={css({ display: 'block', h: 'full', bg: 'primary' })}
                        style={{
                            width: `${capacity ? Math.min(100, (used / capacity) * 100) : 0}%`,
                        }}
                    />
                </div>
                {error && (
                    <p role="alert" className={css({ fontSize: 'xs', color: 'status.error' })}>
                        {error}
                    </p>
                )}
            </div>
            <div className={css({ display: { base: 'none', md: 'flex' }, gap: '3' })}>
                {tabs.map((tab) => (
                    <span
                        key={tab.kind}
                        className={css({
                            fontSize: 'xs',
                            fontWeight: '600',
                            color: tab.full ? 'status.success' : 'text-muted',
                            whiteSpace: 'nowrap',
                        })}
                    >
                        {tab.label} {tab.used}/{tab.capacity}
                    </span>
                ))}
            </div>
            <Button
                variant="primary"
                type="button"
                onClick={onApply}
                disabled={applying || picks.length === 0}
            >
                {applying && (
                    <Loader2 size={16} className={css({ animation: 'spin 1s linear infinite' })} />
                )}
                Übernehmen
            </Button>
        </footer>
    );
}
