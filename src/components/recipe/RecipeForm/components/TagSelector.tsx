'use client';

import { ToggleGroup } from 'radix-ui';

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
}

const tagSearchInputClass = css({
    width: '100%',
    mt: '2',
    borderRadius: 'xl',
    border: '1px solid rgba(224,123,83,0.4)',
    background: 'surface',
    px: '3',
    py: '2.5',
    fontSize: 'sm',
    outline: 'none',
    _focus: {
        borderColor: 'palette.orange',
        boxShadow: '0 0 0 2px rgba(224,123,83,0.2)',
    },
});

const tagChipsWrapperClass = css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1.5',
    mt: '3',
});

const tagChipBaseClass = css({
    borderRadius: 'full',
    px: '2.5',
    py: '1',
    border: '1.5px solid rgba(0,0,0,0.1)',
    background: 'surface',
    color: 'text.primary',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1.5',
    fontSize: 'xs',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    _hover: {
        borderColor: 'rgba(224,123,83,0.5)',
        background: 'rgba(224,123,83,0.04)',
    },
});

const tagChipSelectedClass = css({
    borderColor: 'palette.orange',
    background: 'rgba(224,123,83,0.12)',
    color: 'primary',
});

const tagCountClass = css({
    fontSize: '10px',
    borderRadius: 'full',
    px: '1.5',
    background: 'rgba(0,0,0,0.06)',
    color: 'text.secondary',
    fontWeight: '600',
    lineHeight: '1.6',
});

const tagCountSelectedClass = css({
    background: 'rgba(192,98,46,0.15)',
    color: 'primary',
});

export function TagSelector({
    sortedTags,
    selectedTags,
    tagQuery,
    onTagQueryChange,
    onSelectionChange,
}: TagSelectorProps) {
    return (
        <div>
            <label className={css({ fontWeight: '600', display: 'block', fontSize: 'sm' })}>
                Tags
            </label>
            <input
                type="search"
                value={tagQuery}
                onChange={(event) => onTagQueryChange(event.target.value)}
                placeholder="Tags durchsuchen"
                className={tagSearchInputClass}
            />
            {sortedTags.length === 0 ? (
                <p className={css({ fontSize: 'xs', color: 'text.muted', mt: '2' })}>
                    Keine Tags gefunden.
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
