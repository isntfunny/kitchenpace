'use client';

import * as React from 'react';

import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

import { SmartImage } from '../atoms/SmartImage';
import { Heading, Text } from '../atoms/Typography';
import { Star } from 'lucide-react';

export function HeroSpotlight() {
    return (
        <section
            className={css({
                position: 'relative',
                overflow: 'hidden',
                px: { base: '4', md: '6' },
                py: { base: '5', md: '6' },
                bg: '#fffcf9',
                borderRadius: '2xl',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                mb: '4',
            })}
        >
            <div
                className={grid({
                    columns: { base: 1, lg: 2 },
                    gap: { base: '5', md: '6' },
                    alignItems: 'center',
                })}
            >
                <div>
                    <div
                        className={css({
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            bg: '#e07b53',
                            borderRadius: 'full',
                            padding: '4px 14px',
                            fontSize: 'xs',
                            fontWeight: '600',
                            color: 'white',
                        })}
                    >
                        <Star size={16} />
                        <span>Neu gedacht</span>
                    </div>
                    <Heading as="h1" size="xl" className={css({ mt: '4', maxW: '48ch' })}>
                        Kochen ist nicht immer Schritt für Schritt
                    </Heading>
                    <Text size="lg" color="muted" className={css({ mt: '4', maxW: '46ch' })}>
                        Manchmal kocht die Soße, während du das Gemüse schneidest. Hier siehst du
                        auf einen Blick, was gleichzeitig läuft – ohne lange Listen durchzulesen.
                    </Text>
                </div>
                <div
                    className={css({
                        position: 'relative',
                        borderRadius: '2xl',
                        overflow: 'hidden',
                        minHeight: '320px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    })}
                >
                    <SmartImage
                        src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1000&q=80"
                        alt="Rezeptübersicht"
                        fill
                        sizes="(max-width: 1024px) 100vw, 480px"
                        className={css({ objectFit: 'cover' })}
                    />
                    <div
                        className={css({
                            position: 'absolute',
                            inset: 0,
                            bg: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 100%)',
                        })}
                    />
                </div>
            </div>
        </section>
    );
}
