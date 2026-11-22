'use client';

import { RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
    dismissLeftoverAction,
    planLeftoverRecipeAction,
} from '@app/app/plan/intelligence-actions';
import { Button } from '@app/components/atoms/Button';
import type { LeftoverNoticeDTO } from '@app/lib/meal-plan/intelligence/week-planner';

import { css } from 'styled-system/css';

/** Hints for leftovers that expire soon: up to three recipes each, "Einplanen" or "Ablehnen". */
export function LeftoverNotices({ notices }: { notices: LeftoverNoticeDTO[] }) {
    const router = useRouter();
    const [hidden, setHidden] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const visible = notices.filter((notice) => !hidden.includes(notice.leftoverId));
    if (visible.length === 0) return null;

    async function plan(notice: LeftoverNoticeDTO, recipeId: string) {
        setBusy(true);
        setError('');
        const result = await planLeftoverRecipeAction({ recipeId, date: notice.suggestedDate });
        setBusy(false);
        if (!result.ok) return setError(result.error);
        setHidden((ids) => [...ids, notice.leftoverId]);
        router.refresh();
    }

    async function dismiss(notice: LeftoverNoticeDTO) {
        setBusy(true);
        setError('');
        const result = await dismissLeftoverAction({ leftoverId: notice.leftoverId });
        setBusy(false);
        if (!result.ok) return setError(result.error);
        setHidden((ids) => [...ids, notice.leftoverId]);
    }

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
            {visible.map((notice) => (
                <section
                    key={notice.leftoverId}
                    aria-label="Reste verwerten"
                    className={css({
                        p: '3',
                        borderRadius: 'xl',
                        border: '1px solid',
                        borderColor: 'palette.purple/40',
                        bg: 'palette.purple/10',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2',
                    })}
                >
                    <p
                        className={css({
                            display: 'flex',
                            gap: '2',
                            fontSize: 'sm',
                            fontWeight: '600',
                        })}
                    >
                        <RefreshCw
                            size={16}
                            aria-hidden
                            className={css({ flexShrink: 0, mt: '0.5', color: 'palette.purple' })}
                        />
                        {notice.message}
                    </p>
                    <ul
                        className={css({
                            display: 'grid',
                            gap: '2',
                            gridTemplateColumns: { base: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                        })}
                    >
                        {notice.recipes.map((recipe) => (
                            <li
                                key={recipe.id}
                                className={css({
                                    p: '2.5',
                                    borderRadius: 'lg',
                                    bg: 'surface',
                                    border: '1px solid',
                                    borderColor: 'border.muted',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1.5',
                                })}
                            >
                                <Link
                                    href={`/recipe/${recipe.slug}`}
                                    className={css({
                                        fontSize: 'sm',
                                        fontWeight: '600',
                                        _hover: { color: 'primary' },
                                    })}
                                >
                                    {recipe.title}
                                </Link>
                                <span
                                    className={css({ fontSize: 'xs', color: 'foreground.muted' })}
                                >
                                    {recipe.reasons.join(' · ')}
                                </span>
                                <Button
                                    variant="outline"
                                    type="button"
                                    disabled={busy}
                                    onClick={() => plan(notice, recipe.id)}
                                >
                                    Für {notice.dayLabel} einplanen
                                </Button>
                            </li>
                        ))}
                    </ul>
                    <div className={css({ display: 'flex', justifyContent: 'flex-end' })}>
                        <Button
                            variant="ghost"
                            type="button"
                            disabled={busy}
                            onClick={() => dismiss(notice)}
                        >
                            Ablehnen
                        </Button>
                    </div>
                </section>
            ))}
            {error && (
                <p role="alert" className={css({ color: 'status.error', fontSize: 'sm' })}>
                    {error}
                </p>
            )}
        </div>
    );
}
