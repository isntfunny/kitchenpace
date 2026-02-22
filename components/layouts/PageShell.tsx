'use client';

import { ReactNode } from 'react';

import { Header } from '@/components/features/Header';
import { RecipeTabs } from '@/components/features/RecipeTabs';
import { css } from 'styled-system/css';

type PageShellProps = {
    children: ReactNode;
};

export function PageShell({ children }: PageShellProps) {
    return (
        <div
            className={css({
                minH: '100vh',
                color: 'text',
                bg: 'background',
            })}
        >
            <Header />
            <RecipeTabs />
            <main
                className={css({
                    maxWidth: '1400px',
                    marginX: 'auto',
                    paddingX: { base: '4', md: '6' },
                    paddingY: { base: '6', md: '10' },
                })}
            >
                {children}
            </main>
        </div>
    );
}
