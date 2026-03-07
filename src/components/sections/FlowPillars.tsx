'use client';

import { Clock, Clipboard, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import * as React from 'react';
import type { ReactNode } from 'react';

import { PALETTE } from '@app/lib/palette';
import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

import { Heading, Text } from '../atoms/Typography';

const pillars: { title: string; description: string; icon: ReactNode; color: string }[] = [
    {
        title: 'Parallele Schritte',
        description:
            'Sieh sofort, welche Schritte gleichzeitig laufen. Keine Panik mehr – die Synchronisation ist bereits durchdacht.',
        icon: <Clock size={24} color="white" />,
        color: PALETTE.orange,
    },
    {
        title: 'Klar strukturiert',
        description:
            'Jeder Schritt hat seinen Platz. Du siehst den kritischen Pfad und behältst immer den Überblick.',
        icon: <Clipboard size={24} color="white" />,
        color: PALETTE.purple,
    },
    {
        title: 'Einfach verständlich',
        description:
            'Die Visualisierung zeigt dir die gesamte Landkarte – entspannt, kontrolliert, im Flow.',
        icon: <Sparkles size={24} color="white" />,
        color: PALETTE.emerald,
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
                            })}
                            style={{ background: pillar.color }}
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
