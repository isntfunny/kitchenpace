'use client';

import { css } from 'styled-system/css';

interface FilterPanelProps {
    category: string;
    tags: string;
    sort: string;
    limit: number;
    defaultSort: string;
    defaultLimit: number;
    maxLimit: number;
    categoryPlaceholder?: string;
    updateAttributes: (attrs: Record<string, unknown>) => void;
}

const inputClass = css({
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
});

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
    tags,
    sort,
    limit,
    defaultSort,
    defaultLimit,
    maxLimit,
    categoryPlaceholder = 'z.B. Hauptgerichte',
    updateAttributes,
}: FilterPanelProps) {
    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
            <label className={labelClass}>
                Kategorie
                <input
                    type="text"
                    value={typeof category === 'string' ? category : ''}
                    onChange={(e) => updateAttributes({ category: e.target.value })}
                    placeholder={categoryPlaceholder}
                    className={inputClass}
                />
            </label>
            <label className={labelClass}>
                Tags (kommagetrennt)
                <input
                    type="text"
                    value={typeof tags === 'string' ? tags : ''}
                    onChange={(e) => updateAttributes({ tags: e.target.value })}
                    placeholder="z.B. vegan, schnell"
                    className={inputClass}
                />
            </label>
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
                <label className={css({ fontSize: 'xs', color: 'foreground.muted', w: '80px' })}>
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
                        className={inputClass}
                    />
                </label>
            </div>
        </div>
    );
}
