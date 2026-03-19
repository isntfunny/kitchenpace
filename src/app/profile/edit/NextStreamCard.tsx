'use client';

import { Calendar, Check, Pencil, Plus, Trash2, Tv, X } from 'lucide-react';
import { useState, useTransition } from 'react';

import { deletePlannedStream, planStream, updatePlannedStream } from '@app/app/actions/twitch';
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

const iconButtonBase = {
    flexShrink: 0,
    p: '1.5',
    borderRadius: 'md',
    color: 'foreground.muted',
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    transition: 'all 150ms ease',
    _disabled: { opacity: 0.5, cursor: 'not-allowed' },
} as const;

// ── Inline row for a single planned stream ─────────────────────────────

function StreamRow({
    stream,
    userTimezone,
    isPending,
    onSaveDate,
    onDelete,
}: {
    stream: PlannedStreamItem;
    userTimezone: string;
    isPending: boolean;
    onSaveDate: (id: string, newPlannedAt: string | null) => void;
    onDelete: (id: string) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(
        stream.plannedAt ? new Date(stream.plannedAt).toISOString().slice(0, 16) : '',
    );

    const handleSave = () => {
        onSaveDate(stream.id, editValue ? new Date(editValue).toISOString() : null);
        setEditing(false);
    };

    const handleCancel = () => {
        setEditValue(stream.plannedAt ? new Date(stream.plannedAt).toISOString().slice(0, 16) : '');
        setEditing(false);
    };

    return (
        <div
            className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '3',
                p: '3',
                borderRadius: 'xl',
                border: '1px solid',
                borderColor: editing ? 'social.twitch' : 'border',
                bg: 'background',
                transition: 'border-color 150ms ease',
            })}
        >
            {/* Recipe thumbnail */}
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

            {/* Info */}
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

                {editing ? (
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2',
                            mt: '1.5',
                        })}
                    >
                        <input
                            type="datetime-local"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className={css({
                                flex: 1,
                                height: '36px',
                                px: '2.5',
                                borderRadius: 'lg',
                                border: '1px solid',
                                borderColor: 'border',
                                bg: 'background',
                                fontSize: 'xs',
                                fontFamily: 'body',
                                color: 'text',
                                outline: 'none',
                                _focus: {
                                    borderColor: 'social.twitch',
                                    boxShadow: '0 0 0 2px rgba(145,70,255,0.15)',
                                },
                            })}
                        />
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isPending}
                            className={css({
                                ...iconButtonBase,
                                _hover: { color: 'status.success', bg: 'surface.muted' },
                            })}
                        >
                            <Check size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={handleCancel}
                            className={css({
                                ...iconButtonBase,
                                _hover: { color: 'text', bg: 'surface.muted' },
                            })}
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1',
                            fontSize: 'xs',
                            color: 'foreground.muted',
                        })}
                    >
                        <Calendar size={11} />
                        <span>
                            {stream.plannedAt
                                ? formatPlannedTime(stream.plannedAt, userTimezone)
                                : 'Kein Datum'}
                        </span>
                    </div>
                )}
            </div>

            {/* Actions */}
            {!editing && (
                <div className={css({ display: 'flex', gap: '1', flexShrink: 0 })}>
                    <button
                        type="button"
                        onClick={() => setEditing(true)}
                        disabled={isPending}
                        className={css({
                            ...iconButtonBase,
                            _hover: { color: 'social.twitch', bg: 'surface.muted' },
                        })}
                    >
                        <Pencil size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(stream.id)}
                        disabled={isPending}
                        className={css({
                            ...iconButtonBase,
                            _hover: { color: 'status.error', bg: 'surface.muted' },
                        })}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Main card ──────────────────────────────────────────────────────────

export function NextStreamCard({ plannedStreams: initialStreams }: NextStreamCardProps) {
    const [streams, setStreams] = useState(initialStreams);
    const visibleStreams = streams.filter(
        (s) => !s.plannedAt || new Date(s.plannedAt) > new Date(),
    );
    const [showForm, setShowForm] = useState(false);
    const [selectedRecipe, setSelectedRecipe] = useState<SelectedRecipe | null>(null);
    const [plannedAt, setPlannedAt] = useState('');
    const [isPending, startTransition] = useTransition();
    const [status, setStatus] = useState<'idle' | 'saved' | 'updated' | 'deleted' | 'error'>(
        'idle',
    );
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const handleAdd = () => {
        if (!selectedRecipe) return;
        setStatus('idle');
        setErrorMessage(null);
        startTransition(async () => {
            const result = await planStream(
                selectedRecipe.id,
                plannedAt ? new Date(plannedAt).toISOString() : undefined,
                userTimezone,
            );
            if ('error' in result) {
                setStatus('error');
                setErrorMessage(result.error);
                return;
            }
            setStreams((prev) => [
                ...prev,
                {
                    id: result.id,
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

    const handleSaveDate = (streamId: string, newPlannedAt: string | null) => {
        const stream = streams.find((s) => s.id === streamId);
        if (!stream) return;
        setStatus('idle');
        startTransition(async () => {
            await updatePlannedStream(
                streamId,
                stream.recipe.id,
                newPlannedAt ?? undefined,
                userTimezone,
            );
            setStreams((prev) =>
                prev.map((s) => (s.id === streamId ? { ...s, plannedAt: newPlannedAt } : s)),
            );
            setStatus('updated');
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

            {/* Stream list */}
            {visibleStreams.length > 0 && (
                <div className={css({ display: 'flex', flexDir: 'column', gap: '2', mb: '4' })}>
                    {visibleStreams.map((stream) => (
                        <StreamRow
                            key={stream.id}
                            stream={stream}
                            userTimezone={userTimezone}
                            isPending={isPending}
                            onSaveDate={handleSaveDate}
                            onDelete={handleDelete}
                        />
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
            {status === 'updated' && (
                <Text size="sm" className={css({ color: 'status.success', mt: '3' })}>
                    Datum aktualisiert.
                </Text>
            )}
            {status === 'deleted' && (
                <Text size="sm" color="muted" className={css({ mt: '3' })}>
                    Stream entfernt.
                </Text>
            )}
            {status === 'error' && errorMessage && (
                <Text size="sm" className={css({ color: 'status.error', mt: '3' })}>
                    {errorMessage}
                </Text>
            )}
        </div>
    );
}
