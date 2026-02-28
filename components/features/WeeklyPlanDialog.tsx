'use client';

import { Dialog } from 'radix-ui';
import * as React from 'react';

import { css } from 'styled-system/css';

import { Button } from '../atoms/Button';
import { Heading, Text } from '../atoms/Typography';

const weeklyPlan = [
    {
        day: 'Montag',
        dish: 'Spargelrisotto mit Zitronenabrieb',
        note: 'Saisonal frisch, spendiert Power für den Wochenstart',
    },
    {
        day: 'Mittwoch',
        dish: 'Karamellisierte Süßkartoffeln mit Tahin',
        note: 'Würzig & samtig, perfekt für Reste am Donnerstag',
    },
    {
        day: 'Freitag',
        dish: 'Cremige Kokos-Kichererbsen-Pfanne',
        note: 'Ohne Stress, mit 20 Minuten Vorbereitung',
    },
];

const overlayClass = css({
    position: 'fixed',
    inset: 0,
    bg: 'rgba(15, 23, 42, 0.7)',
});

const contentClass = css({
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'min(480px, 90vw)',
    borderRadius: '2xl',
    padding: '6',
    bg: 'surface.elevated',
    border: '1px solid',
    borderColor: 'border.muted',
    boxShadow: '0 25px 55px rgba(0,0,0,0.12)',
});

const closeButtonClass = css({
    background: 'transparent',
    border: 'none',
    fontFamily: 'body',
    fontSize: 'sm',
    color: 'text-muted',
    cursor: 'pointer',
    textTransform: 'uppercase',
});

const planItemClass = css({
    borderRadius: 'xl',
    border: '1px solid',
    borderColor: 'rgba(0,0,0,0.04)',
    padding: '4',
    bg: 'white',
    marginBottom: '3',
});

export function WeeklyPlanDialog() {
    return (
        <Dialog.Root>
            <Dialog.Trigger asChild>
                <Button variant="ghost" size="md">
                    Wochenplan ansehen
                </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className={overlayClass} />
                <Dialog.Content className={contentClass}>
                    <Dialog.Title>
                        <Heading as="h3" size="lg">
                            Wochenrhythmus im Blick
                        </Heading>
                    </Dialog.Title>
                    <Text size="sm" color="muted" className={css({ mt: '2' })}>
                        Kurz gefasste Inspirationen halten dich im Takt: drei Gerichte, die sich
                        kombinieren, variieren und teilen lassen.
                    </Text>
                    <div className={css({ mt: '6' })}>
                        {weeklyPlan.map((item) => (
                            <div key={item.day} className={planItemClass}>
                                <div
                                    className={css({
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                    })}
                                >
                                    <Text size="sm" color="primary">
                                        {item.day}
                                    </Text>
                                    <Text size="sm" color="muted">
                                        3 Schritte
                                    </Text>
                                </div>
                                <Text size="md" className={css({ fontWeight: '600', mt: '1' })}>
                                    {item.dish}
                                </Text>
                                <Text size="sm" color="muted" className={css({ mt: '1' })}>
                                    {item.note}
                                </Text>
                            </div>
                        ))}
                    </div>
                    <div
                        className={css({
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '3',
                            mt: '6',
                        })}
                    >
                        <Button variant="primary" size="md">
                            Diesen Rhythmus speichern
                        </Button>
                        <Dialog.Close asChild>
                            <button className={closeButtonClass}>Schließen</button>
                        </Dialog.Close>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
