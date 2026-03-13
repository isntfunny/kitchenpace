'use client';

import { Hash } from 'lucide-react';
import { ToggleGroup } from 'radix-ui';
import { useCallback, useState } from 'react';

import { css, cx } from 'styled-system/css';

interface TagChip {
    id: string;
    name: string;
    count: number;
    selected: boolean;
}

interface TagSelectorProps {
    sortedTags: TagChip[];
    selectedTags: string[];
    tagQuery: string;
    onTagQueryChange: (value: string) => void;
    onSelectionChange: (next: string[]) => void;
    onCreateTag?: (name: string) => Promise<{ id: string; name: string } | null>;
}

const tagSearchInputClass = css({
    width: '100%',
    mt: '2',
    borderRadius: 'xl',
    border: '1px solid',
    borderColor: { base: 'rgba(224,123,83,0.4)', _dark: 'rgba(224,123,83,0.45)' },
    background: 'surface',
    px: '3',
    py: '2.5',
    fontSize: 'sm',
    outline: 'none',
    _focus: {
        borderColor: 'palette.orange',
        boxShadow: {
            base: '0 0 0 2px rgba(224,123,83,0.2)',
            _dark: '0 0 0 2px rgba(224,123,83,0.25)',
        },
    },
});

const tagChipsWrapperClass = css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1.5',
    mt: '3',
});

const tagChipBaseClass = css({
    position: 'relative',
    borderRadius: 'full',
    px: '2.5',
    pl: '4',
    py: '1',
    border: '1.5px solid',
    borderColor: 'border',
    background: 'surface',
    color: 'text',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1.5',
    fontSize: 'xs',
    fontWeight: '500',
    cursor: 'pointer',
    overflow: 'hidden',
    transition: 'all 150ms ease',
    _hover: {
        borderColor: { base: 'rgba(224,123,83,0.5)', _dark: 'rgba(224,123,83,0.55)' },
        background: 'accent.soft',
    },
});

const hashIconClass = css({
    position: 'absolute',
    left: '3px',
    top: '50%',
    transform: 'translateY(-50%)',
    opacity: 0.15,
    color: 'currentColor',
    pointerEvents: 'none',
});

const tagChipSelectedClass = css({
    borderColor: 'palette.orange',
    background: { base: 'rgba(224,123,83,0.12)', _dark: 'rgba(224,123,83,0.17)' },
    color: 'primary',
});

const tagCountClass = css({
    fontSize: '10px',
    borderRadius: 'full',
    px: '1.5',
    background: { base: 'rgba(0,0,0,0.06)', _dark: 'rgba(255,255,255,0.06)' },
    color: 'text.muted',
    fontWeight: '600',
    lineHeight: '1.6',
});

const tagCountSelectedClass = css({
    background: { base: 'rgba(192,98,46,0.15)', _dark: 'rgba(192,98,46,0.2)' },
    color: 'primary',
});

const TAG_NAME_REGEX = /^[a-zA-ZäöüÄÖÜß0-9\- ]+$/;

export function TagSelector({
    sortedTags,
    selectedTags,
    tagQuery,
    onTagQueryChange,
    onSelectionChange,
    onCreateTag,
}: TagSelectorProps) {
    const [creating, setCreating] = useState(false);

    const handleKeyDown = useCallback(
        async (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();

            const trimmed = tagQuery.trim();
            if (!trimmed || !onCreateTag) return;
            if (!TAG_NAME_REGEX.test(trimmed)) return;

            // Check if exact match already in list
            const existing = sortedTags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
            if (existing) {
                // Toggle selection if not already selected
                if (!selectedTags.includes(existing.id)) {
                    onSelectionChange([...selectedTags, existing.id]);
                }
                onTagQueryChange('');
                return;
            }

            setCreating(true);
            try {
                const tag = await onCreateTag(trimmed);
                if (tag) {
                    onSelectionChange([...selectedTags, tag.id]);
                    onTagQueryChange('');
                }
            } finally {
                setCreating(false);
            }
        },
        [tagQuery, onCreateTag, sortedTags, selectedTags, onSelectionChange, onTagQueryChange],
    );

    return (
        <div>
            <label className={css({ fontWeight: '600', display: 'block', fontSize: 'sm' })}>
                Tags
            </label>
            <input
                type="search"
                value={tagQuery}
                onChange={(event) => onTagQueryChange(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={creating ? 'Wird erstellt...' : 'Tags suchen oder erstellen'}
                disabled={creating}
                className={tagSearchInputClass}
            />
            {sortedTags.length === 0 && !tagQuery.trim() ? (
                <p className={css({ fontSize: 'xs', color: 'text.muted', mt: '2' })}>
                    Keine Tags gefunden.
                </p>
            ) : sortedTags.length === 0 && tagQuery.trim() ? (
                <p className={css({ fontSize: 'xs', color: 'text.muted', mt: '2' })}>
                    Kein Treffer — Enter drücken zum Erstellen.
                </p>
            ) : (
                <ToggleGroup.Root
                    type="multiple"
                    aria-label="Tags auswählen"
                    className={tagChipsWrapperClass}
                    value={selectedTags}
                    onValueChange={onSelectionChange}
                >
                    {sortedTags.map((tag) => (
                        <ToggleGroup.Item
                            key={tag.id}
                            value={tag.id}
                            className={cx(tagChipBaseClass, tag.selected && tagChipSelectedClass)}
                        >
                            <Hash size={18} strokeWidth={2.5} className={hashIconClass} />
                            <span>{tag.name}</span>
                            <span
                                className={cx(tagCountClass, tag.selected && tagCountSelectedClass)}
                            >
                                {tag.count}
                            </span>
                        </ToggleGroup.Item>
                    ))}
                </ToggleGroup.Root>
            )}
        </div>
    );
}
