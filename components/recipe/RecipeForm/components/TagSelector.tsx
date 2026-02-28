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
    borderRadius: 'xl',
    border: '1px solid',
    borderColor: 'light',
    background: 'surface',
    px: '3',
    py: '2.5',
    fontSize: 'sm',
    outline: 'none',
    _focus: {
        borderColor: 'primary',
    },
});

const tagChipsWrapperClass = css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '2',
});

const tagChipBaseClass = css({
    borderRadius: 'full',
    px: '3',
    py: '2',
    minHeight: '40px',
    border: '1px solid',
    borderColor: 'light',
    background: 'surface',
    color: 'text',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2',
    fontSize: 'sm',
    cursor: 'pointer',
    transition: 'border 150ms ease, background 150ms ease, color 150ms ease',
});

const tagChipSelectedClass = css({
    borderColor: 'primary-dark',
    background: 'primary',
    color: 'light',
    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.12)',
});

const tagZeroClass = css({
    opacity: 0.8,
    color: 'text-muted',
});

const tagCountClass = css({
    fontSize: 'xs',
    borderRadius: 'full',
    px: '2',
    py: '0.5',
    background: 'accent',
    color: 'secondary',
    fontWeight: '600',
});

const tagCountZeroClass = css({
    background: 'surface',
    border: '1px solid',
    borderColor: 'light',
    color: 'text-muted',
    fontWeight: '500',
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
            <label className={css({ fontWeight: '600', display: 'block' })}>Tags</label>
            <input
                type="search"
                value={tagQuery}
                onChange={(event) => onTagQueryChange(event.target.value)}
                placeholder="Tags durchsuchen"
                className={tagSearchInputClass}
            />
            <ToggleGroup.Root
                type="multiple"
                aria-label="Tags auswählen"
                className={tagChipsWrapperClass}
                value={selectedTags}
                onValueChange={onSelectionChange}
            >
                {sortedTags.map((tag) => {
                    const chipClass = cx(
                        tagChipBaseClass,
                        tag.selected && tagChipSelectedClass,
                        !tag.selected && tag.count === 0 && tagZeroClass,
                    );
                    const badgeClass = cx(
                        tagCountClass,
                        tag.count === 0 && tagCountZeroClass,
                    );
                    return (
                        <ToggleGroup.Item key={tag.id} value={tag.id} className={chipClass}>
                            <span>{tag.name}</span>
                            <span className={badgeClass}>{tag.count}</span>
                        </ToggleGroup.Item>
                    );
                })}
            </ToggleGroup.Root>
            {sortedTags.length === 0 && (
                <p className={css({ fontSize: 'xs', color: 'text-muted' })}>
                    Keine Tags zum Anzeigen.
                </p>
            )}
        </div>
    );
}
