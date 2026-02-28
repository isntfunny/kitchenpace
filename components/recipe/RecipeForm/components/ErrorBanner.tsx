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
                bg: '#fee2e2',
                color: '#dc2626',
                borderRadius: 'xl',
            })}
        >
            {message}
        </div>
    );
}
