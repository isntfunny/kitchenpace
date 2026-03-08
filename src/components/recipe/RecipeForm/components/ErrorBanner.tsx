'use client';

import { css } from 'styled-system/css';

interface ErrorBannerProps {
    message: string;
}

export function ErrorBanner({ message }: ErrorBannerProps) {
    return (
        <div
            className={css({
                padding: '4',
                bg: 'error.bg',
                color: 'error.text',
                borderRadius: 'xl',
            })}
        >
            {message}
        </div>
    );
}
