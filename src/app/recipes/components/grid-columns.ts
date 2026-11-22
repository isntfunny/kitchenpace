import { useLayoutEffect, useState, type RefObject } from 'react';

// Column steps measured on the result list itself, so the same view works on the page
// and inside the week selection dialog (KUC-126). At the old window breakpoints the list
// is about 510 px (xs, 540 px window) and 850 px wide (xl, 1280 px window).
const TWO_COLUMNS_FROM = 500;
const THREE_COLUMNS_FROM = 800;

export function columnsForWidth(width: number, viewMode: 'grid' | 'list'): 1 | 2 | 3 {
    if (viewMode === 'list') return 1;
    if (width >= THREE_COLUMNS_FROM) return 3;
    if (width >= TWO_COLUMNS_FROM) return 2;
    return 1;
}

/** Column count from the width of `ref`, kept up to date by a ResizeObserver. */
export function useContainerColumns(
    ref: RefObject<HTMLElement | null>,
    viewMode: 'grid' | 'list',
): number {
    const [width, setWidth] = useState(0);

    // Layout effect: measure before paint, so the grid does not jump from one column
    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return;
        const observer = new ResizeObserver(([entry]) => {
            const next = Math.round(entry.contentRect.width);
            setWidth((prev) => (prev === next ? prev : next));
        });
        // The observer reports the current size right after observe()
        observer.observe(element);
        return () => observer.disconnect();
    }, [ref]);

    return columnsForWidth(width, viewMode);
}
