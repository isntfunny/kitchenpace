'use client';

import { Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useMemo, useState } from 'react';

import {
    acceptSuggestionsAction,
    planWeekAction,
    swapSuggestionAction,
} from '@app/app/plan/intelligence-actions';
import type { SuggestionDTO } from '@app/lib/meal-plan/intelligence/week-planner';
import { cellKey } from '@app/lib/meal-plan/view';

import { css } from 'styled-system/css';

import { actionButton } from '../styles';
import { WeekView, type WeekViewProps } from '../WeekView';

import { ShelfLifeDialog } from './ShelfLifeDialog';
import { SuggestionCard } from './SuggestionCard';

/**
 * WeekView plus the plan helpers (KUC-96, KUC-108, KUC-112, KUC-113). Suggestions live only
 * in this component's state: nothing is saved until the user accepts them.
 * `inspiration`, `notices` and `markers` come from the server page.
 */
export function IntelligentWeekView(props: Omit<WeekViewProps, 'suggestions' | 'toolbarActions'>) {
    const { data, notices } = props;
    const router = useRouter();
    const [suggestions, setSuggestions] = useState<SuggestionDTO[]>([]);
    const [rejected, setRejected] = useState<Record<string, string[]>>({});
    const [busy, setBusy] = useState(false);
    const [rerolls, setRerolls] = useState(0);
    const [message, setMessage] = useState('');

    const placement = (s: SuggestionDTO) => ({ date: s.date, slot: s.slot, recipeId: s.recipeId });

    async function plan(reroll = 0) {
        setBusy(true);
        setMessage('');
        const result = await planWeekAction({ startDate: data.startDate, reroll });
        setBusy(false);
        if (!result.ok) return setMessage(result.error);
        setSuggestions(result.data.suggestions);
        setRejected({});
        if (result.data.freeSlots === 0) setMessage('Alle Plätze dieser Woche sind schon belegt.');
        else if (result.data.suggestions.length === 0)
            setMessage('Ich habe keine passenden Rezepte für die freien Plätze gefunden.');
        else if (result.data.unfilled > 0)
            setMessage(`Für ${result.data.unfilled} Plätze habe ich nichts Passendes gefunden.`);
    }

    async function swap(target: SuggestionDTO) {
        const key = cellKey(target.date, target.slot);
        const skip = [...(rejected[key] ?? []), target.recipeId];
        setBusy(true);
        setMessage('');
        const result = await swapSuggestionAction({
            startDate: data.startDate,
            current: suggestions.map(placement),
            target: { date: target.date, slot: target.slot },
            rejected: skip,
        });
        setBusy(false);
        if (!result.ok) return setMessage(result.error);
        if (!result.data) return setMessage('Für diesen Platz habe ich keinen weiteren Vorschlag.');
        const next = result.data;
        setRejected((all) => ({ ...all, [key]: skip }));
        setSuggestions((all) => all.map((s) => (cellKey(s.date, s.slot) === key ? next : s)));
    }

    async function accept(list: SuggestionDTO[]) {
        if (list.length === 0) return;
        setBusy(true);
        setMessage('');
        const result = await acceptSuggestionsAction({
            startDate: data.startDate,
            suggestions: list.map(placement),
        });
        setBusy(false);
        if (!result.ok) return setMessage(result.error);
        const done = new Set(list.map((s) => cellKey(s.date, s.slot)));
        setSuggestions((all) => all.filter((s) => !done.has(cellKey(s.date, s.slot))));
        const { planned, skipped } = result.data;
        setMessage(
            `${planned} ${planned === 1 ? 'Gericht' : 'Gerichte'} eingeplant${skipped > 0 ? `, ${skipped} Plätze waren inzwischen belegt` : ''}.`,
        );
        router.refresh();
    }

    const suggestionNodes = useMemo(() => {
        const nodes: Record<string, ReactNode> = {};
        for (const suggestion of suggestions) {
            nodes[cellKey(suggestion.date, suggestion.slot)] = (
                <SuggestionCard
                    suggestion={suggestion}
                    busy={busy}
                    onAccept={() => accept([suggestion])}
                    onSwap={() => swap(suggestion)}
                />
            );
        }
        return nodes;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [suggestions, busy, rejected, data.startDate]);

    const toolbarActions = (
        <>
            <button
                type="button"
                className={actionButton()}
                disabled={busy}
                onClick={() => plan(0)}
            >
                <Sparkles size={16} aria-hidden />
                <span>Plan mir die Woche</span>
            </button>
            <ShelfLifeDialog startDate={data.startDate} />
        </>
    );

    const bar =
        suggestions.length > 0 || message ? (
            <div
                role="status"
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '2',
                    px: '3',
                    py: '2.5',
                    borderRadius: 'xl',
                    border: '1px dashed',
                    borderColor: 'primary',
                    bg: 'accent.soft',
                    fontSize: 'sm',
                })}
            >
                <span className={css({ flex: 1, minW: '14rem' })}>
                    {suggestions.length > 0
                        ? `${suggestions.length} ${suggestions.length === 1 ? 'Vorschlag' : 'Vorschläge'} für freie Plätze. Noch ist nichts gespeichert. ${message}`
                        : message}
                </span>
                {suggestions.length > 0 && (
                    <>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => accept(suggestions)}
                            className={actionButton({ variant: 'primary' })}
                        >
                            Alle übernehmen
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                                setRerolls((n) => n + 1);
                                void plan(rerolls + 1);
                            }}
                            className={actionButton({ variant: 'outline' })}
                        >
                            Neu vorschlagen
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                                setSuggestions([]);
                                setMessage('');
                            }}
                            className={actionButton({ variant: 'ghost' })}
                        >
                            Verwerfen
                        </button>
                    </>
                )}
            </div>
        ) : null;

    return (
        <WeekView
            {...props}
            toolbarActions={toolbarActions}
            suggestions={suggestionNodes}
            notices={
                <>
                    {bar}
                    {notices}
                </>
            }
        />
    );
}
