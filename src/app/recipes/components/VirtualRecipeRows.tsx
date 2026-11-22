'use client';

import { useVirtualizer, useWindowVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
    type RefObject,
} from 'react';

import type { RecipeCardData } from '@app/app/actions/recipes';

/* eslint-disable react/no-unused-prop-types -- props are passed on by spreading */
type VirtualRecipeRowsProps = {
    rows: RecipeCardData[][];
    estimateSize: number;
    /** Scroll container; without it the window scrolls (recipe page) */
    scrollElement?: RefObject<HTMLElement | null>;
    renderRow: (row: RecipeCardData[]) => ReactNode;
    /** Called when the last rendered row is close to the end (load the next page) */
    onNearEnd: () => void;
    /** Dims the rows while a new result is loading */
    dimmed: boolean;
    /** A change scrolls back to the start of the list (filters changed) */
    resetKey: unknown;
};
/* eslint-enable react/no-unused-prop-types */

/**
 * Virtualized result rows (KUC-126). The page scrolls the window, the week selection dialog
 * its content area; each case gets its own inner component so no hook is conditional.
 */
export function VirtualRecipeRows(props: VirtualRecipeRowsProps) {
    return props.scrollElement ? (
        <ElementRows {...props} scrollElement={props.scrollElement} />
    ) : (
        <WindowRows {...props} />
    );
}

function WindowRows(props: VirtualRecipeRowsProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [scrollMargin, setScrollMargin] = useState(0);

    // The header above the grid may change height (chip bar, active filters)
    const measure = () => {
        const next = wrapperRef.current?.offsetTop ?? 0;
        setScrollMargin((prev) => (prev === next ? prev : next));
    };
    useLayoutEffect(() => {
        // Measuring the layout is what this effect is for
        // eslint-disable-next-line react-hooks/set-state-in-effect
        measure();
    }, [props.resetKey]);

    const virtualizer = useWindowVirtualizer({
        count: props.rows.length,
        estimateSize: () => props.estimateSize,
        overscan: 5,
        scrollMargin,
    });

    const firstRender = useRef(true);
    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
        if (!wrapperRef.current) return;
        const top = wrapperRef.current.offsetTop - 20;
        if (window.scrollY > top) window.scrollTo({ top, behavior: 'instant' });
    }, [props.resetKey]);

    return (
        <Rows {...props} virtualizer={virtualizer} wrapperRef={wrapperRef} offset={scrollMargin} />
    );
}

function ElementRows(
    props: VirtualRecipeRowsProps & { scrollElement: RefObject<HTMLElement | null> },
) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [scrollMargin, setScrollMargin] = useState(0);

    // Offset of the list inside the scroll container (header, tabs and chips above it)
    const measure = () => {
        const container = props.scrollElement.current;
        const wrapper = wrapperRef.current;
        if (!container || !wrapper) return;
        const next =
            wrapper.getBoundingClientRect().top -
            container.getBoundingClientRect().top +
            container.scrollTop;
        setScrollMargin((prev) => (prev === next ? prev : next));
    };
    useLayoutEffect(() => {
        measure();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- re-measure only on reset
    }, [props.resetKey]);

    const virtualizer = useVirtualizer({
        count: props.rows.length,
        getScrollElement: () => props.scrollElement.current,
        estimateSize: () => props.estimateSize,
        overscan: 5,
        scrollMargin,
    });

    const firstRender = useRef(true);
    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
        const container = props.scrollElement.current;
        if (!container) return;
        const top = Math.max(0, scrollMargin - 20);
        if (container.scrollTop > top) container.scrollTo({ top, behavior: 'instant' });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only on reset
    }, [props.resetKey]);

    return (
        <Rows {...props} virtualizer={virtualizer} wrapperRef={wrapperRef} offset={scrollMargin} />
    );
}

function Rows({
    rows,
    renderRow,
    onNearEnd,
    dimmed,
    virtualizer,
    wrapperRef,
    offset,
}: VirtualRecipeRowsProps & {
    virtualizer: Virtualizer<Window, Element> | Virtualizer<HTMLElement, Element>;
    wrapperRef: RefObject<HTMLDivElement | null>;
    offset: number;
}) {
    const virtualItems = virtualizer.getVirtualItems();
    const lastIndex = virtualItems[virtualItems.length - 1]?.index ?? -1;

    useEffect(() => {
        if (lastIndex >= rows.length - 3) onNearEnd();
    }, [lastIndex, rows.length, onNearEnd]);

    return (
        <div
            ref={wrapperRef}
            style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
                opacity: dimmed ? 0.55 : 1,
                transition: 'opacity 150ms ease',
                pointerEvents: dimmed ? 'none' : undefined,
            }}
        >
            {virtualItems.map((virtualRow) => (
                <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start - offset}px)`,
                    }}
                >
                    {renderRow(rows[virtualRow.index])}
                </div>
            ))}
        </div>
    );
}
