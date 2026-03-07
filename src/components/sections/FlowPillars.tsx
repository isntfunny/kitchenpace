'use client';

import { Clock, Clipboard, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import * as React from 'react';
import type { ReactNode } from 'react';

import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

import { Heading, Text } from '../atoms/Typography';

const pillars: { title: string; description: string; icon: ReactNode; color: string }[] = [
    {
        title: 'Parallele Schritte',
        description:
            "Die Sauce reduziert sich, das Gemüse röstet im Ofen – was früher ein mentales Puzzle war, wird zur klaren visuellen Wahrheit. Du siehst sofort, welche Schritte gleichzeitig laufen und was du in Wartezeiten erledigen kannst. Keine Panik mehr, kein 'Oh nein, das hätte ich vor 20 Minuten starten sollen!' – die Synchronisation ist bereits durchdacht.",
        icon: <Clock size={24} />,
        color: '#e07b53',
    },
    {
        title: 'Klar strukturiert',
        description:
            'Vom Chaos zur kristallklaren Struktur: Jeder Schritt hat seinen Platz, seine Priorität, seinen Moment. Du siehst den kritischen Pfad – wo du aufmerksam sein musst und wo du entspannen kannst. Auch wenn drei Töpfe brodeln und der Timer piept, behältst du den Überblick. Nicht mehr jonglieren und improvisieren – der Flow ist bereits da.',
        icon: <Clipboard size={24} />,
        color: '#6c5ce7',
    },
    {
        title: 'Einfach verständlich',
        description:
            'Keine kognitive Überlastung mehr. Die Visualisierung zeigt dir von Anfang an die gesamte Landkarte deines Kochabenteuers. Du siehst sofort, was als nächstes kommt, wo du stehst und wie alles zusammenfließt. Statt gestresst zwischen Herd und Schneidebrett zu rennen, befindest du dich im Flow – entspannt, kontrolliert, genussvoll.',
        icon: <Sparkles size={24} />,
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
                bg: 'surface',
            })}
        >
            <div
                className={grid({
                    columns: { base: 1, md: 3 },
                    gap: '4',
                    mt: '4',
                })}
            >
                {pillars.map((pillar, index) => (
                    <motion.div
                        key={pillar.title}
                        className={css({
                            padding: '4',
                            minHeight: '160px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2',
                        })}
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
                        <motion.span
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
                            whileHover={{ scale: 1.1, rotate: 8 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                        >
                            {pillar.icon}
                        </motion.span>
                        <Heading as="h3" size="md" className={css({ color: pillar.color })}>
                            {pillar.title}
                        </Heading>
                        <Text size="sm" color="muted">
                            {pillar.description}
                        </Text>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
