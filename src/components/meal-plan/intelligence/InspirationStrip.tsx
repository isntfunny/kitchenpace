import Link from 'next/link';

import { chip } from '@app/components/atoms/recipes';
import type { InspirationItem } from '@shared/meal-planning/inspiration';


import { css } from 'styled-system/css';

/** Chips below the toolbar: a tap opens /recipes with the matching filter. */
export function InspirationStrip({ items }: { items: InspirationItem[] }) {
    if (items.length === 0) return null;
    return (
        <nav
            aria-label="Inspiration"
            className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '2',
                overflowX: 'auto',
                pb: '1',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
            })}
        >
            <span
                className={css({
                    flexShrink: 0,
                    fontSize: 'xs',
                    fontWeight: '700',
                    color: 'foreground.muted',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                })}
            >
                Inspiration
            </span>
            {items.map((item) => (
                <Link key={item.key} href={item.href} className={chip()}>
                    {item.label}
                </Link>
            ))}
        </nav>
    );
}
