'use client';

import * as React from 'react';

import { css } from 'styled-system/css';

interface CustomScrollbarProps {
    children: React.ReactNode;
    className?: string;
    direction?: 'horizontal' | 'vertical';
}

export function CustomScrollbar({
    children,
    className,
    direction = 'horizontal',
}: CustomScrollbarProps) {
    const isHorizontal = direction === 'horizontal';

    return (
        <div
            className={[
                css({
                    overflowX: isHorizontal ? 'auto' : 'hidden',
                    overflowY: isHorizontal ? 'hidden' : 'auto',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '{colors.primary} {colors.surface.elevated}',

                    '&::-webkit-scrollbar': {
                        height: isHorizontal ? '6px' : undefined,
                        width: isHorizontal ? undefined : '6px',
                        backgroundColor: 'transparent',
                    },

                    '&::-webkit-scrollbar-track': {
                        backgroundColor: {
                            base: 'rgba(0,0,0,0.04)',
                            _dark: 'rgba(255,255,255,0.04)',
                        },
                        borderRadius: '3px',
                        margin: isHorizontal ? '0 4px' : '4px 0',
                    },

                    '&::-webkit-scrollbar-thumb': {
                        backgroundColor: {
                            base: 'rgba(224, 123, 83, 0.3)',
                            _dark: 'rgba(224, 123, 83, 0.5)',
                        },
                        borderRadius: '3px',
                        transition: 'background-color 150ms ease',
                    },

                    '&::-webkit-scrollbar-thumb:hover': {
                        backgroundColor: {
                            base: 'rgba(224, 123, 83, 0.5)',
                            _dark: 'rgba(224, 123, 83, 0.7)',
                        },
                    },

                    '&::-webkit-scrollbar-corner': {
                        backgroundColor: 'transparent',
                    },
                }),
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            {children}
        </div>
    );
}
