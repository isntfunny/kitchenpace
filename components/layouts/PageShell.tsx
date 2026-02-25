'use client';

import { ReactNode } from 'react';

import { Header } from '@/components/features/Header';
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
            <main
                className={css({
                    maxWidth: '1400px',
                    marginX: 'auto',
                    paddingX: { base: '4', md: '6' },
                    paddingY: { base: '4', md: '5' },
                })}
            >
                {children}
            </main>
        </div>
    );
}
