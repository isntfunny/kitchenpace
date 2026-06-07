'use client';

import { useMemo, useState } from 'react';

import type {
    FlowEdgeSerialized,
    FlowNodeSerialized,
} from '@app/components/flow/editor/editorTypes';
import { LaneWizard } from '@app/components/flow/editor/lane-wizard';
import type { LaneMode } from '@app/components/flow/editor/lane-wizard';
import { flowToLaneGrid } from '@app/components/flow/editor/lane-wizard/flowToLaneGrid';

import { css } from 'styled-system/css';

/**
 * PROTOTYPE — Lane-Wizard als read-only Frontend, gespeist aus echten
 * xyflow-Daten.
 *
 * Die Nodes/Edges unten sind 1:1 die echten `flow.nodes` / `flow.edges` von
 * https://kochtakt.de/recipe/hoernchennudeln-a-la-mama-2 (aus dem RSC-Payload
 * gelesen). `flowToLaneGrid()` projiziert sie in das Lane-Modell, `LaneWizard`
 * im "view"-Mode rendert sie. Nichts wird gespeichert — reines Display.
 *
 * Open at /lane-view-mock
 */

/* ── Echte xyflow-Daten (verbatim von kochtakt.de) ── */

const REAL_NODES: FlowNodeSerialized[] = [
    {
        id: 'start',
        type: 'start',
        label: "Los geht's!",
        description: 'Bereite alle Zutaten und Kochutensilien vor.',
        ingredientIds: [],
        position: { x: 40, y: 155 },
    },
    {
        id: 'step-1',
        type: 'schneiden',
        label: 'Gemüse würfeln',
        duration: 5,
        description:
            '@[Paprika](imported_4) und @[Zwiebel](imported_3) in kleine Würfel schneiden.',
        ingredientIds: ['imported_3', 'imported_4'],
        position: { x: 380, y: 40 },
    },
    {
        id: 'step-2',
        type: 'braten',
        label: 'Hackfleisch anbraten',
        duration: 8,
        description:
            '@[Hackfleisch](imported_0) in einer großen Pfanne in etwas Öl kräftig anbraten.',
        ingredientIds: ['imported_0', 'imported_9'],
        position: { x: 720, y: 40 },
    },
    {
        id: 'step-3',
        type: 'braten',
        label: 'Gemüse mitbraten',
        duration: 7,
        description:
            '@[Paprika](imported_4) und @[Zwiebel](imported_3) zum @[Hackfleisch](imported_0) geben und mitbraten, bis alles leicht kross ist.',
        ingredientIds: ['imported_0', 'imported_3', 'imported_4'],
        position: { x: 1060, y: 40 },
    },
    {
        id: 'step-4',
        type: 'wuerzen',
        label: 'Fleisch würzen',
        duration: 2,
        description:
            'Die Hackfleisch-Gemüse-Mischung mit @[Salz](imported_6), @[Pfeffer](imported_7) und rosenscharfem @[Paprika](imported_8) würzen.',
        ingredientIds: ['imported_6', 'imported_7', 'imported_8'],
        position: { x: 1400, y: 40 },
    },
    {
        id: 'step-5',
        type: 'kochen',
        label: 'Nudeln kochen',
        duration: 10,
        description: 'Die Hörnchennudeln in Salzwasser nach Packungsangabe gar kochen.',
        ingredientIds: ['imported_1', 'imported_2', 'imported_6'],
        position: { x: 380, y: 270 },
    },
    {
        id: 'step-6',
        type: 'anrichten',
        label: 'Alles vermengen',
        duration: 3,
        description:
            '@[Hackfleisch](imported_0), Gemüse und gekochte @[Nudeln](imported_1) in eine große Schüssel geben und gründlich vermengen.',
        ingredientIds: ['imported_0', 'imported_1', 'imported_3', 'imported_4'],
        position: { x: 1740, y: 155 },
    },
    {
        id: 'step-7',
        type: 'mixen',
        label: 'Curryketchup einrühren',
        duration: 2,
        description:
            'Curryketchup darübergeben und alles nochmals vermischen, bis die gewünschte Konsistenz erreicht ist.',
        ingredientIds: ['imported_5'],
        position: { x: 2080, y: 155 },
    },
    {
        id: 'servieren',
        type: 'servieren',
        label: 'Servieren',
        description: 'Die Hörnchennudeln à la Mama heiß servieren.',
        ingredientIds: [],
        position: { x: 2420, y: 155 },
    },
];

const REAL_EDGES: FlowEdgeSerialized[] = [
    { id: 'edge-1', source: 'start', target: 'step-1' },
    { id: 'edge-2', source: 'step-1', target: 'step-2' },
    { id: 'edge-3', source: 'step-2', target: 'step-3' },
    { id: 'edge-4', source: 'step-3', target: 'step-4' },
    { id: 'edge-5', source: 'start', target: 'step-5' },
    { id: 'edge-6', source: 'step-4', target: 'step-6' },
    { id: 'edge-7', source: 'step-5', target: 'step-6' },
    { id: 'edge-8', source: 'step-6', target: 'step-7' },
    { id: 'edge-9', source: 'step-7', target: 'servieren' },
];

export default function LaneViewMockPage() {
    const [mode, setMode] = useState<LaneMode>('view');

    // StepCard renders @[name](id) mentions via viewerUtils.renderDescription,
    // so feed the raw flow data straight through — no pre-stripping needed.
    const { grid, clean, reason } = useMemo(() => flowToLaneGrid(REAL_NODES, REAL_EDGES), []);

    const totalMin = useMemo(() => REAL_NODES.reduce((acc, n) => acc + (n.duration ?? 0), 0), []);

    return (
        <div className={pageClass}>
            {/* Dev banner */}
            <div className={bannerClass}>
                <span className={css({ color: '#e07b53', fontWeight: '700' })}>PROTOTYP</span>
                <span>
                    LaneWizard ← flowToLaneGrid() ← echte kochtakt.de-Daten · Mapping:{' '}
                    {clean ? (
                        <span className={css({ color: '#00b894', fontWeight: '700' })}>
                            sauber series-parallel ✓
                        </span>
                    ) : (
                        <span className={css({ color: '#e17055', fontWeight: '700' })}>
                            Fallback (Liste) — {reason}
                        </span>
                    )}
                </span>

                <div className={toggleWrapClass}>
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
                </div>
            </div>

            {/* Recipe title bar */}
            <div className={titleBarClass}>
                <span className={css({ fontSize: 'xl' })}>🍝</span>
                <h1 className={titleClass}>Hörnchennudeln à la Mama</h1>
                <span className={timeBadgeClass}>~{totalMin} Min.</span>
            </div>

            {/* LaneWizard */}
            <div className={css({ flex: '1', minH: '0', overflow: 'auto', bg: '#faf9f7' })}>
                <LaneWizard initialGrid={grid} mode={mode} />
            </div>
        </div>
    );
}

/* ── Page styles (mirrors lane-wizard-mock) ── */

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
