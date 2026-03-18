'use client';

import * as React from 'react';
import type { ReactNode } from 'react';

import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

import { Heading, Text } from '../atoms/Typography';

interface SectionProps {
    title: ReactNode;
    description?: ReactNode;
    children: React.ReactNode;
    action?: React.ReactNode;
    titleColor?: string;
    titleIcon?: ReactNode;
}

export function Section({
    title,
    description,
    children,
    action,
    titleColor,
    titleIcon,
}: SectionProps) {
    return (
        <section
            className={css({
                p: 'card',
                borderRadius: 'surface',
                bg: 'surface',
                boxShadow: 'shadow.medium',
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
                                      display: 'inline-flex',
                                      gap: '0.5rem',
                                      alignItems: 'center',
                                  })
                                : css({
                                      display: 'inline-flex',
                                      gap: '0.5rem',
                                      alignItems: 'center',
                                  })
                        }
                    >
                        {titleIcon}
                        {title}
                    </Heading>
                    {description && (
                        <Text size="sm" color="muted" className={css({ maxW: '32ch', mt: '1' })}>
                            {description}
                        </Text>
                    )}
                </div>
                {action && (
                    <div
                        className={css({
                            width: { base: '100%', md: 'auto' },
                            marginLeft: { base: '0', md: 'auto' },
                            mt: { base: '2', md: '0' },
                        })}
                    >
                        {action}
                    </div>
                )}
            </div>
            {children}
        </section>
    );
}
