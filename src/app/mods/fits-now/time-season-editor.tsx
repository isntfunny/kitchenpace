'use client';

import { Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { css } from 'styled-system/css';

import { upsertTimeSeasonFilterSet, deleteTimeSeasonFilterSet } from './actions';
import { FilterCriteriaForm } from './filter-criteria-form';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimeSeasonEditorProps {
    timeSlot: string;
    season: string;
    filterSet: {
        id: string;
        displayLabel: string | null;
        maxTotalTime: number | null;
        tags: { tag: { id: string; name: string } }[];
        categories: { category: { id: string; name: string; slug: string } }[];
        ingredients: { ingredient: { id: string; name: string } }[];
    } | null;
    allCategories: { id: string; name: string; slug: string; color: string }[];
    onClose: () => void;
}

// ---------------------------------------------------------------------------
// Label lookups
// ---------------------------------------------------------------------------

const TIME_SLOT_LABELS: Record<string, string> = {
    fruehstueck: 'Fruehstueck',
    brunch: 'Brunch',
    mittag: 'Mittag',
    nachmittag: 'Nachmittag',
    abend: 'Abend',
    spaet: 'Spaet',
};

const SEASON_LABELS: Record<string, string> = {
    '*': 'Standard',
    fruehling: 'Fruehling',
    sommer: 'Sommer',
    herbst: 'Herbst',
    winter: 'Winter',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimeSeasonEditor({
    timeSlot,
    season,
    filterSet,
    allCategories,
    onClose,
}: TimeSeasonEditorProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Local state initialized from filterSet (or empty defaults)
    const [displayLabel, setDisplayLabel] = useState(filterSet?.displayLabel ?? '');
    const [maxTotalTime, setMaxTotalTime] = useState<number | null>(
        filterSet?.maxTotalTime ?? null,
    );
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
        filterSet?.categories.map((c) => c.category.id) ?? [],
    );
    const [selectedTags, setSelectedTags] = useState<{ id: string; name: string }[]>(
        filterSet?.tags.map((t) => t.tag) ?? [],
    );
    const [selectedIngredients, setSelectedIngredients] = useState<{ id: string; name: string }[]>(
        filterSet?.ingredients.map((i) => i.ingredient) ?? [],
    );

    const handleSave = () => {
        startTransition(async () => {
            await upsertTimeSeasonFilterSet({
                timeSlot,
                season,
                displayLabel: displayLabel.trim() || undefined,
                maxTotalTime,
                tagIds: selectedTags.map((t) => t.id),
                categoryIds: selectedCategoryIds,
                ingredientIds: selectedIngredients.map((i) => i.id),
            });
            router.refresh();
            onClose();
        });
    };

    const handleDelete = () => {
        if (!filterSet) return;
        startTransition(async () => {
            await deleteTimeSeasonFilterSet(filterSet.id);
            router.refresh();
            onClose();
        });
    };

    return (
        <div className={panelStyle}>
            {/* Header */}
            <div className={headerStyle}>
                <h3 className={headingStyle}>
                    Bearbeiten: {TIME_SLOT_LABELS[timeSlot] ?? timeSlot} &times;{' '}
                    {SEASON_LABELS[season] ?? season}
                </h3>
                <button
                    type="button"
                    onClick={onClose}
                    className={closeButtonStyle}
                    aria-label="Schliessen"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Display label */}
            <div>
                <label className={labelStyle}>Anzeigename (optional)</label>
                <input
                    type="text"
                    value={displayLabel}
                    onChange={(e) => setDisplayLabel(e.target.value)}
                    placeholder="z.B. Fruehstueck im Winter"
                    className={inputStyle}
                />
            </div>

            {/* Filter criteria */}
            <FilterCriteriaForm
                allCategories={allCategories}
                selectedCategoryIds={selectedCategoryIds}
                selectedTags={selectedTags}
                selectedIngredients={selectedIngredients}
                maxTotalTime={maxTotalTime}
                onCategoriesChange={setSelectedCategoryIds}
                onTagsChange={setSelectedTags}
                onIngredientsChange={setSelectedIngredients}
                onMaxTimeChange={setMaxTotalTime}
            />

            {/* Actions */}
            <div className={actionsStyle}>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending}
                    className={saveButtonStyle}
                >
                    {isPending && (
                        <Loader2
                            size={14}
                            className={css({ animation: 'spin 1s linear infinite' })}
                        />
                    )}
                    Speichern
                </button>

                {filterSet && (
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isPending}
                        className={deleteButtonStyle}
                    >
                        Zuruecksetzen
                    </button>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const panelStyle = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '5',
    padding: { base: '4', md: '5' },
    borderRadius: 'xl',
    borderWidth: '1px',
    borderColor: 'border.muted',
    background: 'surface',
});

const headerStyle = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
});

const headingStyle = css({
    fontSize: 'base',
    fontWeight: '600',
    color: 'foreground',
});

const closeButtonStyle = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '8',
    height: '8',
    borderRadius: 'md',
    color: 'foreground.muted',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: {
        background: 'surface.elevated',
        color: 'foreground',
    },
});

const labelStyle = css({
    display: 'block',
    fontSize: 'sm',
    fontWeight: '600',
    color: 'foreground.muted',
    marginBottom: '2',
});

const inputStyle = css({
    width: '100%',
    paddingX: '3',
    paddingY: '2',
    borderRadius: 'lg',
    borderWidth: '1px',
    borderColor: 'border.muted',
    background: 'surface',
    color: 'foreground',
    fontSize: 'sm',
    _focus: {
        outline: 'none',
        borderColor: 'accent',
    },
    _placeholder: {
        color: 'foreground.muted',
        opacity: '0.6',
    },
});

const actionsStyle = css({
    display: 'flex',
    alignItems: 'center',
    gap: '3',
    paddingTop: '2',
    borderTopWidth: '1px',
    borderColor: 'border.muted',
});

const saveButtonStyle = css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2',
    paddingX: '4',
    paddingY: '2',
    borderRadius: 'lg',
    background: 'orange.500',
    color: 'white',
    fontSize: 'sm',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: {
        background: 'orange.600',
    },
    _disabled: {
        opacity: '0.6',
        cursor: 'not-allowed',
    },
});

const deleteButtonStyle = css({
    display: 'inline-flex',
    alignItems: 'center',
    paddingX: '4',
    paddingY: '2',
    borderRadius: 'lg',
    borderWidth: '1px',
    borderColor: 'border.muted',
    background: 'transparent',
    color: 'foreground.muted',
    fontSize: 'sm',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: {
        borderColor: 'red.400',
        color: 'red.500',
        background: 'red.50',
    },
    _disabled: {
        opacity: '0.6',
        cursor: 'not-allowed',
    },
});
