'use client';

import type { ReactNode } from 'react';

import { Header } from '@app/components/features/Header';
import { Footer } from '@app/components/layouts/Footer';

import { css } from 'styled-system/css';

type PageShellProps = {
    children: ReactNode;
    /** When true, the main area has no max-width / padding — the page controls its own layout. */
    fluid?: boolean;
};

export function PageShell({ children, fluid }: PageShellProps) {
    return (
        <div
            className={css({
                minH: '100vh',
                color: 'text',
                display: 'flex',
                flexDirection: 'column',
            })}
        >
            <Header />
            <main
                className={
                    fluid
                        ? css({ flex: '1' })
                        : css({
                              flex: '1',
                              maxWidth: '1400px',
                              marginX: 'auto',
                              width: '100%',
                              paddingX: { base: 'page.x', md: 'page.x.md' },
                              paddingY: { base: 'page.y', md: 'page.y.md' },
                          })
                }
            >
                {children}
            </main>
            <Footer />
        </div>
    );
}
