'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';

import { slugify } from '@app/lib/slug';

import { css } from 'styled-system/css';

import { createFoodPeriod, updateFoodPeriod, deleteFoodPeriod } from './actions';
import { DateConfigForm, type DateConfigState } from './date-config-form';
import { FilterCriteriaForm } from './filter-criteria-form';
import type { FoodPeriodRow } from './periods-list';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PeriodEditorProps {
    period: FoodPeriodRow | null;
    allCategories: { id: string; name: string; slug: string; color: string }[];
    onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PeriodEditor({ period, allCategories, onClose }: PeriodEditorProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const isEditing = period !== null;

    // ── Form state ──────────────────────────────────────────────────────
    const [label, setLabelRaw] = useState(period?.label ?? '');
    const [slug, setSlug] = useState(period?.slug ?? '');
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(isEditing);

    const setLabel = useCallback(
        (value: string) => {
            setLabelRaw(value);
            if (!slugManuallyEdited) {
                setSlug(slugify(value));
            }
        },
        [slugManuallyEdited],
    );
    const [description, setDescription] = useState(period?.description ?? '');
    const [override, setOverride] = useState(period?.override ?? false);
    const [sortOrder, setSortOrder] = useState(period?.sortOrder ?? 0);

    // Date config
    const [dateConfig, setDateConfig] = useState<DateConfigState>({
        resolveType: (period?.resolveType as DateConfigState['resolveType']) ?? 'FIXED',
        startMonth: period?.startMonth ?? null,
        startDay: period?.startDay ?? null,
        endMonth: period?.endMonth ?? null,
        endDay: period?.endDay ?? null,
        startOffsetDays: period?.startOffsetDays ?? null,
        endOffsetDays: period?.endOffsetDays ?? null,
        leadDays: period?.leadDays ?? 0,
        trailDays: period?.trailDays ?? 0,
    });

    // Filter criteria
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
        period?.categories.map((c) => c.category.id) ?? [],
    );
    const [selectedTags, setSelectedTags] = useState<{ id: string; name: string }[]>(
        period?.tags.map((t) => t.tag) ?? [],
    );
    const [selectedIngredients, setSelectedIngredients] = useState<{ id: string; name: string }[]>(
        period?.ingredients.map((i) => i.ingredient) ?? [],
    );
    const [maxTotalTime, setMaxTotalTime] = useState<number | null>(period?.maxTotalTime ?? null);

    // ── Escape key to close ─────────────────────────────────────────────
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    // ── Save handler ────────────────────────────────────────────────────
    const handleSave = useCallback(() => {
        if (!label.trim() || !slug.trim()) return;

        const data = {
            label: label.trim(),
            slug: slug.trim(),
            description: description.trim() || undefined,
            override,
            resolveType: dateConfig.resolveType,
            startMonth: dateConfig.startMonth,
            startDay: dateConfig.startDay,
            endMonth: dateConfig.endMonth,
            endDay: dateConfig.endDay,
            startOffsetDays: dateConfig.startOffsetDays,
            endOffsetDays: dateConfig.endOffsetDays,
            leadDays: dateConfig.leadDays,
            trailDays: dateConfig.trailDays,
            maxTotalTime,
            sortOrder,
            tagIds: selectedTags.map((t) => t.id),
            categoryIds: selectedCategoryIds,
            ingredientIds: selectedIngredients.map((i) => i.id),
        };

        startTransition(async () => {
            if (isEditing) {
                await updateFoodPeriod(period.id, data);
            } else {
                await createFoodPeriod(data);
            }
            router.refresh();
            onClose();
        });
    }, [
        label,
        slug,
        description,
        override,
        dateConfig,
        maxTotalTime,
        sortOrder,
        selectedTags,
        selectedCategoryIds,
        selectedIngredients,
        isEditing,
        period,
        router,
        onClose,
    ]);

    // ── Delete handler ──────────────────────────────────────────────────
    const handleDelete = useCallback(() => {
        if (!isEditing) return;
        if (!confirm(`"${period.label}" wirklich loeschen?`)) return;

        startTransition(async () => {
            await deleteFoodPeriod(period.id);
            router.refresh();
            onClose();
        });
    }, [isEditing, period, router, onClose]);

    return (
        // Backdrop
        <div className={backdropStyle} onClick={onClose}>
            {/* Modal panel */}
            <div className={panelStyle} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={headerStyle}>
                    <h3
                        className={css({
                            fontSize: 'lg',
                            fontWeight: '600',
                            color: 'foreground',
                            lineClamp: '1',
                        })}
                    >
                        {isEditing ? `Periode bearbeiten: ${period.label}` : 'Neue Periode'}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1.5',
                            borderRadius: 'lg',
                            color: 'foreground.muted',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            _hover: { background: 'surface.elevated', color: 'foreground' },
                        })}
                        aria-label="Schliessen"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div
                    className={css({
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6',
                        padding: '5',
                    })}
                >
                    {/* 1. Label */}
                    <div>
                        <label className={labelStyle}>
                            Label <span className={css({ color: 'red.500' })}>*</span>
                        </label>
                        <input
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="z.B. Spargelzeit"
                            className={inputStyle}
                        />
                    </div>

                    {/* 2. Slug */}
                    <div>
                        <label className={labelStyle}>Slug</label>
                        <input
                            type="text"
                            value={slug}
                            onChange={(e) => {
                                setSlug(e.target.value);
                                setSlugManuallyEdited(true);
                            }}
                            placeholder="spargelzeit"
                            className={inputStyle}
                        />
                        {!slugManuallyEdited && slug && (
                            <p className={hintStyle}>Automatisch generiert aus Label</p>
                        )}
                    </div>

                    {/* 3. Beschreibung */}
                    <div>
                        <label className={labelStyle}>Beschreibung</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Optionale Beschreibung der Periode..."
                            className={textareaStyle}
                        />
                    </div>

                    {/* 4. Override checkbox */}
                    <label
                        className={css({
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '3',
                            cursor: 'pointer',
                            userSelect: 'none',
                        })}
                    >
                        <input
                            type="checkbox"
                            checked={override}
                            onChange={(e) => setOverride(e.target.checked)}
                            className={css({
                                width: '4',
                                height: '4',
                                marginTop: '0.5',
                                accentColor: 'accent',
                                cursor: 'pointer',
                            })}
                        />
                        <div>
                            <span
                                className={css({
                                    fontSize: 'sm',
                                    fontWeight: '600',
                                    color: 'foreground',
                                })}
                            >
                                Ganztaegig anzeigen (Override)
                            </span>
                            <p className={hintStyle}>
                                Wenn aktiv, ersetzt diese Periode die normale Zeit-Saison-Zuordnung
                                vollstaendig waehrend des aktiven Zeitraums.
                            </p>
                        </div>
                    </label>

                    {/* 5. Date config */}
                    <div>
                        <p className={sectionHeadingStyle}>Datumskonfiguration</p>
                        <DateConfigForm {...dateConfig} onChange={setDateConfig} />
                    </div>

                    {/* 6. Filter criteria */}
                    <div>
                        <p className={sectionHeadingStyle}>Filterkriterien</p>
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
                    </div>

                    {/* 7. Sort order */}
                    <div>
                        <label className={labelStyle}>Sortierung</label>
                        <input
                            type="number"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                            className={css({
                                width: '100px',
                                paddingX: '3',
                                paddingY: '2',
                                borderRadius: 'lg',
                                borderWidth: '1px',
                                borderColor: 'border.muted',
                                background: 'surface',
                                color: 'foreground',
                                fontSize: 'sm',
                                _focus: { outline: 'none', borderColor: 'accent' },
                            })}
                        />
                        <p className={hintStyle}>Niedrigere Werte werden zuerst angezeigt.</p>
                    </div>
                </div>

                {/* Footer buttons */}
                <div className={footerStyle}>
                    {isEditing && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isPending}
                            className={deleteButtonStyle}
                        >
                            {isPending ? 'Wird geloescht...' : 'Loeschen'}
                        </button>
                    )}
                    <div className={css({ flex: '1' })} />
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isPending}
                        className={cancelButtonStyle}
                    >
                        Abbrechen
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isPending || !label.trim() || !slug.trim()}
                        className={saveButtonStyle}
                    >
                        {isPending ? 'Wird gespeichert...' : 'Speichern'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const backdropStyle = css({
    position: 'fixed',
    inset: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: '50',
    padding: '4',
});

const panelStyle = css({
    width: '100%',
    maxWidth: '640px',
    maxHeight: '90vh',
    overflowY: 'auto',
    background: 'surface',
    borderRadius: '2xl',
    borderWidth: '1px',
    borderColor: 'border.muted',
    boxShadow: 'xl',
    display: 'flex',
    flexDirection: 'column',
});

const headerStyle = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '3',
    paddingX: '5',
    paddingY: '4',
    borderBottomWidth: '1px',
    borderColor: 'border.muted',
    flexShrink: 0,
});

const footerStyle = css({
    display: 'flex',
    alignItems: 'center',
    gap: '3',
    paddingX: '5',
    paddingY: '4',
    borderTopWidth: '1px',
    borderColor: 'border.muted',
    flexShrink: 0,
});

const labelStyle = css({
    display: 'block',
    fontSize: 'sm',
    fontWeight: '600',
    color: 'foreground.muted',
    marginBottom: '2',
});

const hintStyle = css({
    fontSize: 'xs',
    color: 'foreground.muted',
    marginTop: '1',
});

const sectionHeadingStyle = css({
    fontSize: 'sm',
    fontWeight: '700',
    color: 'foreground',
    marginBottom: '3',
    paddingBottom: '2',
    borderBottomWidth: '1px',
    borderColor: 'border.muted',
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
    _focus: { outline: 'none', borderColor: 'accent' },
    _placeholder: { color: 'foreground.muted', opacity: '0.6' },
});

const textareaStyle = css({
    width: '100%',
    paddingX: '3',
    paddingY: '2',
    borderRadius: 'lg',
    borderWidth: '1px',
    borderColor: 'border.muted',
    background: 'surface',
    color: 'foreground',
    fontSize: 'sm',
    resize: 'vertical',
    _focus: { outline: 'none', borderColor: 'accent' },
    _placeholder: { color: 'foreground.muted', opacity: '0.6' },
});

const saveButtonStyle = css({
    display: 'inline-flex',
    alignItems: 'center',
    paddingX: '5',
    paddingY: '2',
    borderRadius: 'lg',
    background: 'accent',
    color: 'white',
    fontSize: 'sm',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: { opacity: '0.9' },
    _disabled: { opacity: '0.5', cursor: 'not-allowed' },
});

const cancelButtonStyle = css({
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
    _hover: { borderColor: 'border', color: 'foreground' },
    _disabled: { opacity: '0.5', cursor: 'not-allowed' },
});

const deleteButtonStyle = css({
    display: 'inline-flex',
    alignItems: 'center',
    paddingX: '4',
    paddingY: '2',
    borderRadius: 'lg',
    borderWidth: '1px',
    borderColor: 'red.300',
    background: 'transparent',
    color: 'red.500',
    fontSize: 'sm',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: { background: 'red.50', borderColor: 'red.400' },
    _disabled: { opacity: '0.5', cursor: 'not-allowed' },
});
