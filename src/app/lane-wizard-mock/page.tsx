'use client';

import { useState } from 'react';

import { LaneWizard } from '@app/components/lane-wizard';
import type { LaneGrid, LaneMode } from '@app/components/lane-wizard';
import { css } from 'styled-system/css';

/**
 * Mock page — Pasta Bolognese as a LaneWizard grid.
 * Demonstrates: segments, splits, merges, timers, parallel lanes.
 *
 * Open at /lane-wizard-mock
 */

const BOLOGNESE_GRID: LaneGrid = {
    segments: [
        {
            id: 'seg-start',
            lanes: [
                [
                    {
                        id: 'start',
                        type: 'start',
                        label: 'Pasta Bolognese',
                        description: 'Klassische Bolognese mit frischen Zutaten. Dauer: ~48 Min.',
                    },
                ],
            ],
            columnSpans: [3],
        },
        {
            id: 'seg-wasser',
            lanes: [
                [
                    {
                        id: 'wasser',
                        type: 'kochen',
                        label: 'Wasser aufsetzen',
                        description: 'Großen Topf mit gut gesalzenem Wasser zum Kochen bringen.',
                        duration: 10,
                    },
                ],
            ],
            columnSpans: [3],
        },
        {
            id: 'seg-gemuese',
            lanes: [
                [
                    {
                        id: 'zwiebeln',
                        type: 'schneiden',
                        label: 'Zwiebeln würfeln',
                        description: '2 mittelgroße Zwiebeln in feine Würfel schneiden.',
                    },
                ],
                [
                    {
                        id: 'knoblauch',
                        type: 'schneiden',
                        label: 'Knoblauch hacken',
                        description: '3 Zehen Knoblauch fein hacken oder durch die Presse drücken.',
                    },
                ],
                [
                    {
                        id: 'karotten',
                        type: 'schneiden',
                        label: 'Karotten würfeln',
                        description:
                            '2 Karotten schälen und in kleine Würfel (ca. 5 mm) schneiden.',
                    },
                ],
            ],
            columnSpans: [1, 1, 1],
        },
        {
            id: 'seg-anbraten',
            lanes: [
                [
                    {
                        id: 'anbraten',
                        type: 'braten',
                        label: 'Gemüse & Hackfleisch anbraten',
                        description:
                            'Olivenöl in großer Pfanne erhitzen. Zwiebeln glasig dünsten, Knoblauch und Karotten dazugeben. Hackfleisch zugeben und krümelig braten.',
                        duration: 8,
                    },
                ],
            ],
            columnSpans: [3],
        },
        {
            id: 'seg-kochen',
            lanes: [
                [
                    {
                        id: 'sauce',
                        type: 'kochen',
                        label: 'Soße köcheln lassen',
                        description:
                            'Tomatenmark einrühren, mit Rotwein ablöschen. Passierte Tomaten, Oregano, Salz und Pfeffer zugeben. Bei niedriger Hitze köcheln.',
                        duration: 25,
                    },
                    {
                        id: 'wuerzen',
                        type: 'wuerzen',
                        label: 'Abschmecken',
                        description:
                            'Soße mit Salz, Pfeffer und einer Prise Zucker abschmecken. Frisches Basilikum einreißen.',
                    },
                ],
                [
                    {
                        id: 'pasta',
                        type: 'kochen',
                        label: 'Pasta kochen',
                        description:
                            '400 g Spaghetti ins sprudelnde Salzwasser geben und al dente kochen (Packungsangabe).',
                        duration: 11,
                    },
                ],
            ],
            columnSpans: [2, 1],
        },
        {
            id: 'seg-anrichten',
            lanes: [
                [
                    {
                        id: 'anrichten',
                        type: 'anrichten',
                        label: 'Pasta anrichten',
                        description:
                            'Pasta in tiefen Tellern anrichten, Soße großzügig darüber geben. Frischen Parmesan reiben und mit Basilikum garnieren.',
                    },
                ],
            ],
            columnSpans: [3],
        },
        {
            id: 'seg-servieren',
            lanes: [
                [
                    {
                        id: 'servieren',
                        type: 'servieren',
                        label: 'Servieren',
                        description: 'Heiß servieren — Guten Appetit!',
                    },
                ],
            ],
            columnSpans: [3],
        },
    ],
};

export default function LaneWizardMockPage() {
    const [mode, setMode] = useState<LaneMode>('edit');

    return (
        <div className={pageClass}>
            {/* Dev banner */}
            <div className={bannerClass}>
                <span className={css({ color: '#e07b53', fontWeight: '700' })}>MOCK</span>
                <span>LaneWizard — Pasta Bolognese — 7 Segmente</span>

                {/* Mode toggle */}
                <div className={toggleWrapClass}>
                    <button
                        type="button"
                        onClick={() => setMode('edit')}
                        className={toggleBtnClass}
                        style={{
                            backgroundColor: mode === 'edit' ? '#e07b53' : 'transparent',
                            color: mode === 'edit' ? 'white' : 'rgba(255,255,255,0.5)',
                        }}
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('view')}
                        className={toggleBtnClass}
                        style={{
                            backgroundColor: mode === 'view' ? '#00b894' : 'transparent',
                            color: mode === 'view' ? 'white' : 'rgba(255,255,255,0.5)',
                        }}
                    >
                        Cook
                    </button>
                </div>
            </div>

            {/* Recipe title bar */}
            <div className={titleBarClass}>
                <span className={css({ fontSize: 'xl' })}>&#x1F35D;</span>
                <h1 className={titleClass}>Pasta Bolognese</h1>
                <span className={timeBadgeClass}>~48 Min.</span>
            </div>

            {/* LaneWizard */}
            <div className={css({ flex: '1', minH: '0', overflow: 'auto', bg: '#faf9f7' })}>
                <LaneWizard initialGrid={BOLOGNESE_GRID} mode={mode} />
            </div>
        </div>
    );
}

/* ── Page styles ── */

const pageClass = css({
    minH: '100svh',
    display: 'flex',
    flexDirection: 'column',
    bg: '#faf9f7',
});

const bannerClass = css({
    bg: '#1a1a2e',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '11px',
    fontFamily: 'monospace',
    p: '6px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexShrink: '0',
});

const toggleWrapClass = css({
    ml: 'auto',
    display: 'flex',
    gap: '2px',
    bg: 'rgba(255,255,255,0.08)',
    borderRadius: 'full',
    p: '2px',
});

const toggleBtnClass = css({
    px: '12px',
    py: '4px',
    borderRadius: 'full',
    border: 'none',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: 'monospace',
});

const titleBarClass = css({
    p: '10px 20px 8px',
    bg: 'white',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    flexShrink: '0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
});

const titleClass = css({
    m: '0',
    fontSize: '17px',
    fontWeight: '700',
    color: '#1a1a1a',
    fontFamily: 'body',
});

const timeBadgeClass = css({
    ml: 'auto',
    fontSize: '12px',
    color: '#aaa',
    bg: 'rgba(224,123,83,0.1)',
    p: '3px 10px',
    borderRadius: 'full',
    fontWeight: '600',
});
