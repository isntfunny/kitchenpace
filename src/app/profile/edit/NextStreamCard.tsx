'use client';

import { Calendar, Plus, Trash2, Tv } from 'lucide-react';
import { useState, useTransition } from 'react';

import { deletePlannedStream, planStream } from '@app/app/actions/twitch';
import { Button } from '@app/components/atoms/Button';
import { SmartImage } from '@app/components/atoms/SmartImage';
import { Heading, Text } from '@app/components/atoms/Typography';
import type { SelectedRecipe } from '@app/components/features/RecipeSearchPicker';
import { RecipeSearchPicker } from '@app/components/features/RecipeSearchPicker';
import { formatPlannedTime } from '@app/lib/date';

import { css } from 'styled-system/css';

export interface PlannedStreamItem {
    id: string;
    plannedAt: string | null;
    recipe: SelectedRecipe;
}

interface NextStreamCardProps {
    plannedStreams: PlannedStreamItem[];
}

const inputStyles = css({
    width: '100%',
    height: '44px',
    px: '3',
    borderRadius: 'xl',
    border: '1px solid',
    borderColor: 'border',
    bg: 'background',
    fontSize: 'sm',
    fontFamily: 'body',
    color: 'text',
    outline: 'none',
    transition: 'all 150ms ease',
    _focus: {
        borderColor: 'social.twitch',
        boxShadow: '0 0 0 3px rgba(145,70,255,0.15)',
    },
});

export function NextStreamCard({ plannedStreams: initialStreams }: NextStreamCardProps) {
    const [streams, setStreams] = useState(initialStreams);
    // Only show future or unscheduled streams; past ones are kept as history in DB
    const visibleStreams = streams.filter(
        (s) => !s.plannedAt || new Date(s.plannedAt) > new Date(),
    );
    const [showForm, setShowForm] = useState(false);
    const [selectedRecipe, setSelectedRecipe] = useState<SelectedRecipe | null>(null);
    const [plannedAt, setPlannedAt] = useState('');
    const [isPending, startTransition] = useTransition();
    const [status, setStatus] = useState<'idle' | 'saved' | 'deleted'>('idle');

    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const handleAdd = () => {
        if (!selectedRecipe) return;
        setStatus('idle');
        startTransition(async () => {
            const id = await planStream(
                selectedRecipe.id,
                plannedAt ? new Date(plannedAt).toISOString() : undefined,
                userTimezone,
            );
            setStreams((prev) => [
                ...prev,
                {
                    id,
                    plannedAt: plannedAt ? new Date(plannedAt).toISOString() : null,
                    recipe: selectedRecipe,
                },
            ]);
            setSelectedRecipe(null);
            setPlannedAt('');
            setShowForm(false);
            setStatus('saved');
        });
    };

    const handleDelete = (streamId: string) => {
        setStatus('idle');
        startTransition(async () => {
            await deletePlannedStream(streamId);
            setStreams((prev) => prev.filter((s) => s.id !== streamId));
            setStatus('deleted');
        });
    };

    return (
        <div
            className={css({
                p: { base: '4', md: '5' },
                borderRadius: '2xl',
                bg: 'surface',
                boxShadow: 'shadow.medium',
            })}
        >
            {/* Header */}
            <div className={css({ mb: '4' })}>
                <div className={css({ display: 'flex', alignItems: 'center', gap: '3', mb: '1' })}>
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
                        Geplante Streams
                    </Heading>
                </div>
                <Text color="muted" size="sm">
                    Plane Rezepte, die du live kochen möchtest.
                </Text>
            </div>

            {/* Existing planned streams */}
            {visibleStreams.length > 0 && (
                <div className={css({ display: 'flex', flexDir: 'column', gap: '2', mb: '4' })}>
                    {visibleStreams.map((stream) => (
                        <div
                            key={stream.id}
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3',
                                p: '3',
                                borderRadius: 'xl',
                                border: '1px solid',
                                borderColor: 'border',
                                bg: 'background',
                            })}
                        >
                            <div
                                className={css({
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: 'lg',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    bg: 'surface.muted',
                                })}
                            >
                                <SmartImage
                                    imageKey={stream.recipe.imageKey}
                                    alt={stream.recipe.title}
                                    aspect="1:1"
                                    sizes="44px"
                                />
                            </div>
                            <div className={css({ flex: 1, minWidth: 0 })}>
                                <div
                                    className={css({
                                        fontSize: 'sm',
                                        fontWeight: '600',
                                        color: 'text',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    })}
                                >
                                    {stream.recipe.title}
                                </div>
                                <div className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                                    {stream.plannedAt
                                        ? formatPlannedTime(stream.plannedAt, userTimezone)
                                        : 'Kein Datum festgelegt'}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleDelete(stream.id)}
                                disabled={isPending}
                                className={css({
                                    flexShrink: 0,
                                    p: '2',
                                    borderRadius: 'md',
                                    color: 'foreground.muted',
                                    cursor: 'pointer',
                                    background: 'transparent',
                                    border: 'none',
                                    transition: 'all 150ms ease',
                                    _hover: { color: 'status.error', bg: 'surface.muted' },
                                    _disabled: { opacity: 0.5, cursor: 'not-allowed' },
                                })}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Add form */}
            {showForm ? (
                <div className={css({ display: 'flex', flexDir: 'column', gap: '4' })}>
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
                        <RecipeSearchPicker
                            selected={selectedRecipe}
                            onSelect={(recipe) => {
                                setSelectedRecipe(recipe);
                                setStatus('idle');
                            }}
                            onClear={() => {
                                setSelectedRecipe(null);
                                setStatus('idle');
                            }}
                        />
                    </div>

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
                            className={inputStyles}
                        />
                        {plannedAt && (
                            <Text size="sm" color="muted" className={css({ mt: '1' })}>
                                {formatPlannedTime(new Date(plannedAt), userTimezone)}
                            </Text>
                        )}
                    </div>

                    <div className={css({ display: 'flex', gap: '3', alignItems: 'center' })}>
                        <Button
                            variant="primary"
                            onClick={handleAdd}
                            disabled={isPending || !selectedRecipe}
                        >
                            <Tv size={16} />
                            {isPending ? 'Speichern…' : 'Stream planen'}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setShowForm(false);
                                setSelectedRecipe(null);
                                setPlannedAt('');
                            }}
                            disabled={isPending}
                        >
                            Abbrechen
                        </Button>
                    </div>
                </div>
            ) : (
                <Button variant="secondary" onClick={() => setShowForm(true)}>
                    <Plus size={16} />
                    Stream hinzufügen
                </Button>
            )}

            {/* Status feedback */}
            {status === 'saved' && (
                <Text size="sm" className={css({ color: 'status.success', mt: '3' })}>
                    Stream geplant!
                </Text>
            )}
            {status === 'deleted' && (
                <Text size="sm" color="muted" className={css({ mt: '3' })}>
                    Stream entfernt.
                </Text>
            )}
        </div>
    );
}
