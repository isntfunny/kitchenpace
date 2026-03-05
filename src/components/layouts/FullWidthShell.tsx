'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { Header } from '@app/components/features/Header';
import { css } from 'styled-system/css';

type FullWidthShellProps = {
    children: ReactNode;
};

export function FullWidthShell({ children }: FullWidthShellProps) {
    // Lock body scroll while this full-screen shell is mounted
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    return (
        <div className={shellClass}>
            <Header />
            <main className={mainClass}>{children}</main>
        </div>
    );
}

const shellClass = css({
    h: '100vh',
    overflow: 'hidden',
    color: 'text',
    bg: 'background',
    display: 'flex',
    flexDirection: 'column',
});

const mainClass = css({
    flex: '1',
    height: 'calc(100vh - 64px)',
    overflow: 'hidden',
    display: 'flex',
});
