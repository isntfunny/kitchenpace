'use client';

import * as React from 'react';

import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

import { Heading, Text } from '../atoms/Typography';

const pillars = [
    {
        title: 'Parallele Schritte',
        description:
            "Die Sauce reduziert sich, das Gemüse röstet im Ofen – was früher ein mentales Puzzle war, wird zur klaren visuellen Wahrheit. Du siehst sofort, welche Schritte gleichzeitig laufen und was du in Wartezeiten erledigen kannst. Keine Panik mehr, kein 'Oh nein, das hätte ich vor 20 Minuten starten sollen!' – die Synchronisation ist bereits durchdacht.",
        icon: '⏲️',
        color: '#e07b53',
    },
    {
        title: 'Klar strukturiert',
        description:
            'Vom Chaos zur kristallklaren Struktur: Jeder Schritt hat seinen Platz, seine Priorität, seinen Moment. Du siehst den kritischen Pfad – wo du aufmerksam sein musst und wo du entspannen kannst. Auch wenn drei Töpfe brodeln und der Timer piept, behältst du den Überblick. Nicht mehr jonglieren und improvisieren – der Flow ist bereits da.',
        icon: '📋',
        color: '#6c5ce7',
    },
    {
        title: 'Einfach verständlich',
        description:
            'Keine kognitive Überlastung mehr. Die Visualisierung zeigt dir von Anfang an die gesamte Landkarte deines Kochabenteuers. Du siehst sofort, was als nächstes kommt, wo du stehst und wie alles zusammenfließt. Statt gestresst zwischen Herd und Schneidebrett zu rennen, befindest du dich im Flow – entspannt, kontrolliert, genussvoll.',
        icon: '✨',
        color: '#00b894',
    },
];

export function FlowPillars() {
    return (
        <section
            className={css({
                padding: { base: '4', md: '5' },
                borderRadius: '2xl',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                bg: '#fffcf9',
            })}
        >
            <div
                className={grid({
                    columns: { base: 1, md: 3 },
                    gap: '4',
                    mt: '4',
                })}
            >
                {pillars.map((pillar) => (
                    <div
                        key={pillar.title}
                        className={css({
                            padding: '4',
                            minHeight: '160px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2',
                            _hover: {
                                transform: 'translateY(-2px)',
                            },
                            transition: 'transform 250ms ease',
                        })}
                    >
                        <span
                            className={css({
                                width: '52px',
                                height: '52px',
                                borderRadius: 'full',
                                display: 'grid',
                                placeItems: 'center',
                                fontSize: 'xl',
                                background: pillar.color,
                                color: 'white',
                            })}
                        >
                            {pillar.icon}
                        </span>
                        <Heading as="h3" size="md" className={css({ color: pillar.color })}>
                            {pillar.title}
                        </Heading>
                        <Text size="sm" color="muted">
                            {pillar.description}
                        </Text>
                    </div>
                ))}
            </div>
        </section>
    );
}
