'use client';

import { css } from 'styled-system/css';

import { FilterAutocomplete } from './FilterAutocomplete';

interface FilterPanelProps {
    category: unknown;
    categoryLabel?: unknown;
    tags: unknown;
    tagLabels?: unknown;
    sort: string;
    limit: number;
    defaultSort: string;
    defaultLimit: number;
    maxLimit: number;
    categoryPlaceholder?: string;
    showSortLimit?: boolean;
    updateAttributes: (attrs: Record<string, unknown>) => void;
}

const selectClass = css({
    w: '100%',
    mt: '1',
    px: '2',
    py: '1',
    border: '1px solid',
    borderColor: 'border',
    borderRadius: 'md',
    bg: 'background',
    fontSize: 'sm',
    outline: 'none',
});

const labelClass = css({ fontSize: 'xs', color: 'foreground.muted' });

export function FilterPanel({
    category,
    categoryLabel,
    tags,
    tagLabels,
    sort,
    limit,
    defaultSort,
    defaultLimit,
    maxLimit,
    categoryPlaceholder = 'z.B. Hauptgerichte',
    showSortLimit = true,
    updateAttributes,
}: FilterPanelProps) {
    const selectedCategory =
        typeof category === 'string' && category.length > 0
            ? [
                  {
                      value: category,
                      label: typeof categoryLabel === 'string' ? categoryLabel : category,
                  },
              ]
            : [];

    const tagValues = Array.isArray(tags)
        ? tags.filter((tag): tag is string => typeof tag === 'string' && tag.length > 0)
        : typeof tags === 'string'
          ? tags
                .split(',')
                .map((tag) => tag.trim())
                .filter((tag): tag is string => tag.length > 0)
          : [];

    const tagLabelList = Array.isArray(tagLabels)
        ? tagLabels.filter(
              (label): label is string => typeof label === 'string' && label.length > 0,
          )
        : [];

    const selectedTags = tagValues.map((value, index) => ({
        value,
        label: tagLabelList[index] ?? value,
    }));

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
            <label className={labelClass}>
                Kategorie
                <FilterAutocomplete
                    type="categories"
                    selected={selectedCategory}
                    onChange={(next) =>
                        updateAttributes({
                            category: next[0]?.value ?? '',
                            categoryLabel: next[0]?.label ?? '',
                        })
                    }
                    placeholder={categoryPlaceholder}
                    emptyMessage="Keine Kategorien gefunden"
                />
            </label>
            <label className={labelClass}>
                Tags
                <FilterAutocomplete
                    type="tags"
                    multiple
                    selected={selectedTags}
                    onChange={(next) =>
                        updateAttributes({
                            tags: next.map((item) => item.value),
                            tagLabels: next.map((item) => item.label),
                        })
                    }
                    placeholder="Tags suchen…"
                    emptyMessage="Keine Tags gefunden"
                />
            </label>
            {showSortLimit && (
                <div className={css({ display: 'flex', gap: '3' })}>
                    <label className={css({ fontSize: 'xs', color: 'foreground.muted', flex: 1 })}>
                        Sortierung
                        <select
                            value={typeof sort === 'string' ? sort : defaultSort}
                            onChange={(e) => updateAttributes({ sort: e.target.value })}
                            className={selectClass}
                        >
                            <option value="newest">Neueste</option>
                            <option value="rating">Beste Bewertung</option>
                            <option value="popular">Beliebteste</option>
                        </select>
                    </label>
                    <label
                        className={css({ fontSize: 'xs', color: 'foreground.muted', w: '80px' })}
                    >
                        Limit
                        <input
                            type="number"
                            min={1}
                            max={maxLimit}
                            value={typeof limit === 'number' ? limit : defaultLimit}
                            onChange={(e) =>
                                updateAttributes({
                                    limit: parseInt(e.target.value, 10) || defaultLimit,
                                })
                            }
                            className={css({
                                w: '100%',
                                mt: '1',
                                px: '2',
                                py: '1',
                                border: '1px solid',
                                borderColor: 'border',
                                borderRadius: 'md',
                                bg: 'background',
                                fontSize: 'sm',
                                outline: 'none',
                                _focus: { borderColor: 'accent' },
                            })}
                        />
                    </label>
                </div>
            )}
        </div>
    );
}
