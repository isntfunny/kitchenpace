'use client';

import { Calendar, Tv, X } from 'lucide-react';
import { useState, useTransition } from 'react';

import { clearNextStream, updateNextStream } from '@app/app/actions/twitch';
import { Button } from '@app/components/atoms/Button';
import { Heading, Text } from '@app/components/atoms/Typography';
import { formatPlannedTime } from '@app/lib/date';

import { css } from 'styled-system/css';

interface NextStreamCardProps {
    recipes: Array<{ id: string; title: string }>;
    currentRecipeId: string | null;
    currentPlannedAt: string | null;
}

export function NextStreamCard({
    recipes,
    currentRecipeId,
    currentPlannedAt,
}: NextStreamCardProps) {
    const [recipeId, setRecipeId] = useState(currentRecipeId ?? '');
    const [plannedAt, setPlannedAt] = useState(currentPlannedAt?.slice(0, 16) ?? '');
    const [isPending, startTransition] = useTransition();
    const [status, setStatus] = useState<'idle' | 'saved' | 'cleared'>('idle');

    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const handleSave = () => {
        if (!recipeId) return;
        setStatus('idle');
        startTransition(async () => {
            await updateNextStream(
                recipeId,
                plannedAt ? new Date(plannedAt).toISOString() : undefined,
                userTimezone,
            );
            setStatus('saved');
        });
    };

    const handleClear = () => {
        setStatus('idle');
        startTransition(async () => {
            await clearNextStream();
            setRecipeId('');
            setPlannedAt('');
            setStatus('cleared');
        });
    };

    const selectStyles = css({
        width: '100%',
        borderRadius: 'xl',
        border: '1px solid',
        borderColor: 'border',
        p: '3',
        fontSize: 'md',
        outline: 'none',
        bg: 'background',
        color: 'text',
        transition: 'all 150ms ease',
        _focus: {
            borderColor: 'social.twitch',
            boxShadow: '0 0 0 3px rgba(145,70,255,0.15)',
        },
    });

    return (
        <div
            className={css({
                p: { base: '4', md: '5' },
                borderRadius: '2xl',
                bg: 'surface',
                boxShadow: 'shadow.medium',
                mt: '6',
                maxW: '720px',
                mx: 'auto',
            })}
        >
            <div className={css({ mb: '4' })}>
                <div className={css({ display: 'flex', alignItems: 'center', gap: '3', mb: '3' })}>
                    <div
                        className={css({
                            w: '10',
                            h: '10',
                            borderRadius: 'lg',
                            bg: 'social.twitch',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                        })}
                    >
                        <Tv size={20} />
                    </div>
                    <Heading as="h2" size="lg">
                        Nächster Stream
                    </Heading>
                </div>
                <Text color="muted" size="sm">
                    Wähle ein Rezept, das du als nächstes live kochen möchtest.
                </Text>
            </div>

            <div className={css({ display: 'flex', flexDir: 'column', gap: '4' })}>
                {/* Recipe selector */}
                <div>
                    <label
                        className={css({
                            display: 'block',
                            fontSize: 'sm',
                            fontWeight: '600',
                            mb: '1.5',
                            color: 'text',
                        })}
                    >
                        Rezept
                    </label>
                    <select
                        value={recipeId}
                        onChange={(e) => {
                            setRecipeId(e.target.value);
                            setStatus('idle');
                        }}
                        className={selectStyles}
                    >
                        <option value="">Rezept auswählen...</option>
                        {recipes.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.title}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Optional date/time picker */}
                <div>
                    <label
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1.5',
                            fontSize: 'sm',
                            fontWeight: '600',
                            mb: '1.5',
                            color: 'text',
                        })}
                    >
                        <Calendar size={14} />
                        Geplanter Zeitpunkt (optional)
                    </label>
                    <input
                        type="datetime-local"
                        value={plannedAt}
                        onChange={(e) => {
                            setPlannedAt(e.target.value);
                            setStatus('idle');
                        }}
                        className={selectStyles}
                    />
                    {plannedAt && (
                        <Text size="sm" color="muted" className={css({ mt: '1' })}>
                            {formatPlannedTime(new Date(plannedAt), userTimezone)}
                        </Text>
                    )}
                </div>

                {/* Actions */}
                <div className={css({ display: 'flex', gap: '3', alignItems: 'center' })}>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={isPending || !recipeId}
                    >
                        <Tv size={16} />
                        {isPending ? 'Speichern...' : 'Stream planen'}
                    </Button>

                    {currentRecipeId && (
                        <Button variant="ghost" onClick={handleClear} disabled={isPending}>
                            <X size={16} />
                            Zurücksetzen
                        </Button>
                    )}
                </div>

                {/* Status feedback */}
                {status === 'saved' && (
                    <Text size="sm" className={css({ color: 'status.success' })}>
                        Stream geplant! Dein nächster Stream wird auf deinem Profil angezeigt.
                    </Text>
                )}
                {status === 'cleared' && (
                    <Text size="sm" color="muted">
                        Stream-Planung zurückgesetzt.
                    </Text>
                )}
            </div>
        </div>
    );
}
