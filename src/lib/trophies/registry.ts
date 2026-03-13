import type { TrophyTier } from '@prisma/client';

// ---------------------------------------------------------------------------
// Tier visual styles — derived from enum, NOT stored in DB.
// Used by UI components to colour the trophy icon / glow / badge.
// ---------------------------------------------------------------------------

export const TIER_STYLES: Record<
    TrophyTier,
    { fill: string; stroke: string; glow: string; label: string | null }
> = {
    NONE: { fill: '#FFD700', stroke: '#B8860B', glow: 'rgba(255,215,0,0.3)', label: null },
    BRONZE: { fill: '#CD7F32', stroke: '#8B5A2B', glow: 'rgba(205,127,50,0.3)', label: 'Bronze' },
    SILVER: { fill: '#C0C0C0', stroke: '#808080', glow: 'rgba(192,192,192,0.3)', label: 'Silber' },
    GOLD: { fill: '#FFD700', stroke: '#B8860B', glow: 'rgba(255,215,0,0.3)', label: 'Gold' },
    PLATINUM: {
        fill: '#E5E4E2',
        stroke: '#B0B0B0',
        glow: 'rgba(229,228,226,0.4)',
        label: 'Platin',
    },
};

// ---------------------------------------------------------------------------
// Trophy definitions — single source of truth.
// Every trophy that can be awarded MUST be listed here.
// ---------------------------------------------------------------------------

export const TROPHIES = {
    'finished-tutorial': {
        id: 'finished-tutorial',
        groupSlug: 'finished-tutorial',
        tier: 'NONE' as const,
        category: 'ONBOARDING',
        name: 'Tutorial-Absolvent',
        description: 'Hat das Onboarding-Tutorial abgeschlossen',
        icon: 'GraduationCap',
        points: 10,
    },
} as const;

export type TrophyId = keyof typeof TROPHIES;

export const TROPHY_STREAM_EVENT = 'trophy.earned';
