'use client';

import { LaneWizardView, type LanePhase } from '@app/components/flow/viewer/LaneWizardView';

/**
 * MOCK page — for visual testing of the LaneWizard concept only.
 * No real data, no router, no auth. Just the UI.
 *
 * Open at /lane-wizard-mock
 */

const BOLOGNESE_PHASES: LanePhase[] = [
    {
        // Phase 1 — single lane: start
        steps: [
            {
                id: 'start',
                type: 'start',
                label: 'Pasta Bolognese',
                description: 'Klassische Bolognese mit frischen Zutaten. Dauer: ~50 Min.',
            },
        ],
    },
    {
        // Phase 2 — single lane: Wasser aufsetzen
        steps: [
            {
                id: 'wasser',
                type: 'kochen',
                label: 'Wasser aufsetzen',
                description: 'Großen Topf mit gut gesalzenem Wasser zum Kochen bringen.',
                duration: 10,
            },
        ],
    },
    {
        // Phase 3 — 3 parallel lanes: Gemüse vorbereiten
        steps: [
            {
                id: 'zwiebeln',
                type: 'schneiden',
                label: 'Zwiebeln würfeln',
                description: '2 mittelgroße Zwiebeln in feine Würfel schneiden.',
            },
            {
                id: 'knoblauch',
                type: 'schneiden',
                label: 'Knoblauch hacken',
                description: '3 Zehen Knoblauch fein hacken oder durch die Presse drücken.',
            },
            {
                id: 'karotten',
                type: 'schneiden',
                label: 'Karotten würfeln',
                description: '2 Karotten schälen und in kleine Würfel (ca. 5 mm) schneiden.',
            },
        ],
    },
    {
        // Phase 4 — single lane: Anbraten
        steps: [
            {
                id: 'anbraten',
                type: 'braten',
                label: 'Gemüse & Hackfleisch anbraten',
                description:
                    'Olivenöl in großer Pfanne erhitzen. Zwiebeln glasig dünsten, Knoblauch und Karotten dazugeben. Hackfleisch zugeben und krümelig braten.',
                duration: 8,
            },
        ],
    },
    {
        // Phase 5 — 2 parallel lanes: Soße köcheln + Pasta kochen
        steps: [
            {
                id: 'sauce',
                type: 'kochen',
                label: 'Soße köcheln lassen',
                description:
                    'Tomatenmark einrühren, mit Rotwein ablöschen. Passierte Tomaten, Oregano, Salz und Pfeffer zugeben. Bei niedriger Hitze köcheln.',
                duration: 25,
            },
            {
                id: 'pasta',
                type: 'kochen',
                label: 'Pasta kochen',
                description:
                    '400 g Spaghetti ins sprudelnde Salzwasser geben und al dente kochen (Packungsangabe).',
                duration: 11,
            },
        ],
    },
    {
        // Phase 6 — single lane: Abschmecken
        steps: [
            {
                id: 'wuerzen',
                type: 'wuerzen',
                label: 'Abschmecken',
                description:
                    'Soße mit Salz, Pfeffer und einer Prise Zucker abschmecken. Frisches Basilikum einreißen.',
            },
        ],
    },
    {
        // Phase 7 — 2 parallel lanes: Anrichten
        steps: [
            {
                id: 'anrichten',
                type: 'anrichten',
                label: 'Pasta anrichten',
                description: 'Pasta in tiefen Tellern anrichten, Soße großzügig darüber geben.',
            },
            {
                id: 'parmesan',
                type: 'wuerzen',
                label: 'Parmesan reiben',
                description: 'Frischen Parmesan direkt über den Teller reiben. Mit Basilikum garnieren.',
            },
        ],
    },
    {
        // Phase 8 — single lane: servieren
        steps: [
            {
                id: 'servieren',
                type: 'servieren',
                label: 'Servieren',
                description: 'Heiß servieren — Guten Appetit!',
            },
        ],
    },
];

export default function LaneWizardMockPage() {
    return (
        <div
            style={{
                minHeight: '100svh',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#faf9f7',
            }}
        >
            {/* Dev banner */}
            <div
                style={{
                    backgroundColor: '#1a1a2e',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 11,
                    fontFamily: 'monospace',
                    padding: '6px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexShrink: 0,
                }}
            >
                <span style={{ color: '#e07b53', fontWeight: 700 }}>MOCK</span>
                <span>LaneWizardView — Pasta Bolognese — 8 Phasen</span>
                <span style={{ marginLeft: 'auto', opacity: 0.4 }}>Swipe oder Pfeiltasten zum Navigieren</span>
            </div>

            {/* Recipe title bar */}
            <div
                style={{
                    padding: '10px 20px 8px',
                    backgroundColor: 'white',
                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                }}
            >
                <span style={{ fontSize: 20 }}>🍝</span>
                <h1
                    style={{
                        margin: 0,
                        fontSize: 17,
                        fontWeight: 700,
                        color: '#1a1a1a',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                >
                    Pasta Bolognese
                </h1>
                <span
                    style={{
                        marginLeft: 'auto',
                        fontSize: 12,
                        color: '#aaa',
                        backgroundColor: 'rgba(224,123,83,0.1)',
                        padding: '3px 10px',
                        borderRadius: 999,
                        fontWeight: 600,
                    }}
                >
                    ~50 Min.
                </span>
            </div>

            {/* LaneWizard */}
            <div style={{ flex: 1, minHeight: 0 }}>
                <LaneWizardView phases={BOLOGNESE_PHASES} />
            </div>
        </div>
    );
}
