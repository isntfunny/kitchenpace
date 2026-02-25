'use client';

import * as React from 'react';

import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

import { Heading, Text } from '../atoms/Typography';

interface SectionProps {
    title: string;
    description?: string;
    children: React.ReactNode;
    action?: React.ReactNode;
    titleColor?: string;
}

export function Section({ title, description, children, action, titleColor }: SectionProps) {
    return (
        <section
            className={css({
                p: '4',
                borderRadius: '2xl',
                bg: '#fffcf9',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            })}
        >
            <div
                className={flex({
                    direction: { base: 'column', md: 'row' },
                    justify: 'space-between',
                    align: 'flex-start',
                    gap: '3',
                    mb: '3',
                })}
            >
                <div>
                    <Heading
                        as="h2"
                        size="lg"
                        className={
                            titleColor
                                ? css({
                                      background: titleColor,
                                      backgroundClip: 'text',
                                      color: 'transparent',
                                  })
                                : undefined
                        }
                    >
                        {title}
                    </Heading>
                    {description && (
                        <Text size="sm" color="muted" className={css({ maxW: '32ch', mt: '1' })}>
                            {description}
                        </Text>
                    )}
                </div>
                {action && (
                    <div className={css({ marginLeft: 'auto', mt: { base: '2', md: '0' } })}>
                        {action}
                    </div>
                )}
            </div>
            {children}
        </section>
    );
}
