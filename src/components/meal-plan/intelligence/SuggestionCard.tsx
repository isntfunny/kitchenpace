'use client';

import { Sparkles } from 'lucide-react';
import Link from 'next/link';

import type { SuggestionDTO } from '@app/lib/meal-plan/intelligence/week-planner';

import { css } from 'styled-system/css';

import { actionButton } from '../styles';

/** Dashed "Vorschlag" card in an empty slot (mockup `.sugg`): nothing is saved until "Übernehmen". */
export function SuggestionCard({
    suggestion,
    busy,
    onAccept,
    onSwap,
}: {
    suggestion: SuggestionDTO;
    busy: boolean;
    onAccept: () => void;
    onSwap: () => void;
}) {
    const small = css({ minH: '30px', px: '2.5', fontSize: 'xs' });
    return (
        <div
            className={css({
                display: 'flex',
                flexDirection: 'column',
                gap: '1',
                p: '2',
                borderRadius: 'lg',
                border: '1.5px dashed',
                borderColor: 'primary',
                bg: 'accent.soft',
                minW: 0,
            })}
        >
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1',
                    fontSize: '10px',
                    fontWeight: '700',
                    color: 'primary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                })}
            >
                <Sparkles size={11} aria-hidden />
                Vorschlag
            </div>
            <Link
                href={`/recipe/${suggestion.slug}`}
                className={css({
                    fontSize: 'xs',
                    fontWeight: '600',
                    lineHeight: '1.3',
                    color: 'text',
                    overflowWrap: 'break-word',
                    hyphens: 'manual',
                    _hover: { color: 'primary' },
                })}
            >
                {suggestion.title}
            </Link>
            <div
                className={css({ fontSize: '11px', color: 'foreground.muted', lineHeight: '1.3' })}
            >
                {suggestion.totalTime > 0 && <span>{suggestion.totalTime} Min.</span>}
                {suggestion.reasons[0] && (
                    <span>
                        {suggestion.totalTime > 0 ? ' · ' : ''}
                        {suggestion.reasons[0]}
                    </span>
                )}
            </div>
            <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '1', mt: '0.5' })}>
                <button
                    type="button"
                    disabled={busy}
                    onClick={onAccept}
                    className={`${actionButton({ variant: 'primary' })} ${small}`}
                >
                    Übernehmen
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={onSwap}
                    className={`${actionButton({ variant: 'outline' })} ${small}`}
                >
                    Tauschen
                </button>
            </div>
        </div>
    );
}
