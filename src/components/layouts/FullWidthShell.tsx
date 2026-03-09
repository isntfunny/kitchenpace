'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { Header } from '@app/components/features/Header';
import { css } from 'styled-system/css';

type FullWidthShellProps = {
    children: ReactNode;
};

export function FullWidthShell({ children }: FullWidthShellProps) {
    // Lock body scroll on desktop while this full-screen shell is mounted
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 768px)');
        const apply = () => {
            document.body.style.overflow = mq.matches ? 'hidden' : '';
        };
        const prev = document.body.style.overflow;
        apply();
        mq.addEventListener('change', apply);
        return () => {
            mq.removeEventListener('change', apply);
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
    h: { base: 'auto', md: '100vh' },
    overflow: { base: 'visible', md: 'hidden' },
    color: 'text',
    bg: 'background',
    display: { base: 'block', md: 'flex' },
    flexDirection: 'column',
});

const mainClass = css({
    flex: { md: '1' },
    height: { base: 'auto', md: 'calc(100vh - 64px)' },
    overflow: { base: 'visible', md: 'hidden' },
    display: { base: 'block', md: 'flex' },
});
