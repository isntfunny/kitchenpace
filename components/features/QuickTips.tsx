'use client';

import * as React from 'react';

import { css } from 'styled-system/css';

import { Heading, Text } from '../atoms/Typography';

const tips = [
    {
        icon: '⏱️',
        title: 'Schnelle Tipps',
        content: 'Gekochte Eier schälen: Im Eiswasserbad abschrecken',
        iconBg: '#74b9ff',
    },
    {
        icon: '🌿',
        title: 'Kräuter-Guide',
        content: 'Basilikum niemals im Kühlschrank lagern',
        iconBg: '#00b894',
    },
    {
        icon: '🧂',
        title: 'Würzen',
        content: 'Salz erst am Ende zugeben - nicht während des Kochens',
        iconBg: '#fdcb6e',
    },
];

export function QuickTips() {
    return (
        <div
            className={css({
                p: '5',
                borderRadius: '2xl',
                bg: '#fffcf9',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            })}
        >
            <div className={css({ mb: '3' })}>
                <Heading
                    as="h3"
                    size="md"
                    className={css({
                        color: '#00b894',
                    })}
                >
                    Küchen-Hacks 💡
                </Heading>
            </div>

            <div className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
                {tips.map((tip, index) => (
                    <div
                        key={index}
                        className={css({
                            display: 'flex',
                            gap: '3',
                            p: '3',
                            _hover: {
                                bg: 'rgba(0,0,0,0.02)',
                            },
                            transition: 'background 150ms ease',
                        })}
                    >
                        <span
                            className={css({
                                fontSize: 'xl',
                                flexShrink: 0,
                                width: '36px',
                                height: '36px',
                                display: 'grid',
                                placeItems: 'center',
                                borderRadius: 'full',
                                background: tip.iconBg,
                                color: 'white',
                            })}
                        >
                            {tip.icon}
                        </span>
                        <div>
                            <Text size="sm" className={css({ fontWeight: '600', color: 'text' })}>
                                {tip.title}
                            </Text>
                            <Text size="sm" color="muted">
                                {tip.content}
                            </Text>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
