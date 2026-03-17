import { useCallback, useEffect, useRef, useState } from 'react';

interface UseDropdownNavigationOptions {
    /** Number of items in the dropdown. */
    itemCount: number;
    /** Whether the dropdown is currently open/visible. */
    isOpen: boolean;
    /** Called when the user confirms an item (Enter/Tab). */
    onSelect: (index: number) => void;
    /** Called when the user presses Escape. */
    onEscape?: () => void;
}

interface UseDropdownNavigationResult {
    highlightedIndex: number;
    setHighlightedIndex: (index: number) => void;
    /** Attach to onKeyDown of the input/textarea. Only handles dropdown keys when open. */
    handleKeyDown: (e: React.KeyboardEvent) => void;
    resetHighlight: () => void;
}

/**
 * Shared keyboard navigation hook for dropdown lists.
 * Handles ArrowUp/Down, Enter/Tab to select, Escape to close.
 * Used by DescriptionEditor's @mention dropdown.
 */
export function useDropdownNavigation({
    itemCount,
    isOpen,
    onSelect,
    onEscape,
}: UseDropdownNavigationOptions): UseDropdownNavigationResult {
    const [rawIndex, setRawIndex] = useState(0);
    const rawIndexRef = useRef(0);

    // Clamp index to valid range — automatically resets when items shrink
    const highlightedIndex = itemCount === 0 ? 0 : Math.min(rawIndex, itemCount - 1);

    const setHighlightedIndex = useCallback((index: number) => {
        rawIndexRef.current = index;
        setRawIndex(index);
    }, []);

    const resetHighlight = useCallback(() => {
        rawIndexRef.current = 0;
        setRawIndex(0);
    }, []);

    // Use refs for values that change frequently to keep handleKeyDown stable
    const onSelectRef = useRef(onSelect);
    const onEscapeRef = useRef(onEscape);
    const itemCountRef = useRef(itemCount);
    const isOpenRef = useRef(isOpen);
    useEffect(() => {
        onSelectRef.current = onSelect;
        onEscapeRef.current = onEscape;
        itemCountRef.current = itemCount;
        isOpenRef.current = isOpen;
    });

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (!isOpenRef.current || itemCountRef.current === 0) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setHighlightedIndex(
                        Math.min(rawIndexRef.current + 1, itemCountRef.current - 1),
                    );
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setHighlightedIndex(Math.max(rawIndexRef.current - 1, 0));
                    break;
                case 'Enter':
                case 'Tab':
                    e.preventDefault();
                    onSelectRef.current(Math.min(rawIndexRef.current, itemCountRef.current - 1));
                    break;
                case 'Escape':
                    e.preventDefault();
                    e.stopPropagation();
                    onEscapeRef.current?.();
                    break;
            }
        },
        [setHighlightedIndex],
    );

    return { highlightedIndex, setHighlightedIndex, handleKeyDown, resetHighlight };
}
