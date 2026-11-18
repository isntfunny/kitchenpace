'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useTransition } from 'react';

import type { DuplicateCandidate, DuplicateGroup } from '@app/lib/ingredients/duplicate-groups';
import type { MergeGroupPreview } from '@app/lib/ingredients/merge-group';

import { css } from 'styled-system/css';

import { btnPrimary, btnSecondary } from './ingredient-types';
import { mergeDuplicateGroup, previewDuplicateMerge } from './shelf-life-actions';

// ---------------------------------------------------------------------------
// Duplicate groups by normalized name (KUC-114), merged one group at a time
// after a preview and an explicit confirmation.
// ---------------------------------------------------------------------------

export function DuplicateGroupsSection({ groups }: { groups: DuplicateGroup[] }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div
            className={css({
                borderRadius: '2xl',
                borderWidth: '1px',
                borderColor: 'border.muted',
                bg: 'surface',
                overflow: 'hidden',
            })}
        >
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={css({
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4',
                    bg: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'foreground',
                    _hover: { bg: 'surface.muted' },
                })}
            >
                <span className={css({ fontWeight: '600', fontSize: 'md' })}>
                    Duplikate ({groups.length} Gruppen mit gleichem Anzeigenamen)
                </span>
                {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {isOpen && (
                <div
                    className={css({
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3',
                        padding: '4',
                        paddingTop: '0',
                    })}
                >
                    {groups.length === 0 && (
                        <p className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                            Keine Duplikate gefunden.
                        </p>
                    )}
                    {groups.map((group) => (
                        <DuplicateGroupCard key={group.key} group={group} />
                    ))}
                </div>
            )}
        </div>
    );
}

function DuplicateGroupCard({ group }: { group: DuplicateGroup }) {
    const [keepId, setKeepId] = useState(group.suggestedKeepId);
    const [preview, setPreview] = useState<MergeGroupPreview | null>(null);
    const [message, setMessage] = useState('');
    const [done, setDone] = useState(false);
    const [isPending, startTransition] = useTransition();
    const mergeIds = group.members.filter((m) => m.id !== keepId).map((m) => m.id);

    const run = (action: () => Promise<void>) => {
        setMessage('');
        startTransition(async () => {
            try {
                await action();
            } catch (error) {
                setMessage(error instanceof Error ? error.message : 'Fehler');
            }
        });
    };

    const choose = (id: string) => {
        setKeepId(id);
        setPreview(null);
    };

    return (
        <div
            className={css({
                borderWidth: '1px',
                borderColor: 'border.muted',
                borderRadius: 'xl',
                padding: '3',
                opacity: done ? '0.6' : '1',
            })}
        >
            <p className={css({ fontWeight: '600', fontSize: 'sm', marginBottom: '2' })}>
                {group.normalizedName}
            </p>
            {group.members.map((member: DuplicateCandidate) => (
                <label
                    key={member.id}
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2',
                        fontSize: 'sm',
                        paddingY: '0.5',
                        cursor: done ? 'default' : 'pointer',
                    })}
                >
                    <input
                        type="radio"
                        name={`keep-${group.key}`}
                        checked={keepId === member.id}
                        disabled={done || isPending}
                        onChange={() => choose(member.id)}
                        className={css({ accentColor: 'brand.primary' })}
                    />
                    <span>{member.name}</span>
                    <span className={css({ color: 'foreground.muted', fontSize: 'xs' })}>
                        {member.recipeCount} Rezepte{keepId === member.id ? ' · wird behalten' : ''}
                    </span>
                </label>
            ))}

            {preview && !done && (
                <div
                    className={css({
                        marginTop: '2',
                        padding: '2.5',
                        borderRadius: 'lg',
                        bg: 'surface.muted',
                        fontSize: 'xs',
                    })}
                >
                    <p className={css({ fontWeight: '600', marginBottom: '1' })}>
                        {preview.affectedRecipeIds.length} Rezepte betroffen; alle Verweise gehen an
                        „{preview.keep.name}“, die übrigen Namen werden Aliase.
                    </p>
                    {preview.merge.map((entry) => (
                        <p key={entry.id}>
                            {entry.name}: {entry.recipeIngredients} Rezeptzeilen,{' '}
                            {entry.shoppingItems} Einkaufseinträge, {entry.filterSets} Filter
                        </p>
                    ))}
                </div>
            )}

            {message && (
                <p className={css({ marginTop: '2', fontSize: 'xs', color: 'status.danger' })}>
                    {message}
                </p>
            )}

            {!done && (
                <div className={css({ display: 'flex', gap: '2', marginTop: '2.5' })}>
                    <button
                        type="button"
                        className={btnSecondary}
                        disabled={isPending}
                        onClick={() =>
                            run(async () =>
                                setPreview(await previewDuplicateMerge(keepId, mergeIds)),
                            )
                        }
                    >
                        Vorschau
                    </button>
                    <button
                        type="button"
                        className={btnPrimary}
                        disabled={isPending || !preview}
                        onClick={() =>
                            run(async () => {
                                const result = await mergeDuplicateGroup(keepId, mergeIds);
                                setDone(true);
                                setMessage('');
                                setPreview(null);
                                alert(
                                    `${result.merged} Einträge zusammengeführt, ${result.affectedRecipes} Rezepte umgehängt.`,
                                );
                            })
                        }
                    >
                        Zusammenführen bestätigen
                    </button>
                </div>
            )}
        </div>
    );
}
