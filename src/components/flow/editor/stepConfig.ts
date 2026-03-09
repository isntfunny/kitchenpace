import {
    PlayCircle,
    Scissors,
    Flame,
    Beef,
    UtensilsCrossed,
    Blend,
    Clock,
    Leaf,
    Layers,
    Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { StepType } from './editorTypes';

export type StepCategory = 'vorbereitung' | 'kochen' | 'warten' | 'wuerzen' | 'fertig';

export interface StepConfig {
    type: StepType;
    label: string;
    description: string;
    icon: LucideIcon;
    color: string;
    gradient: string;
    /** Subtle flat tint used for LaneWizard step cards */
    flatBg: string;
    /** Accent colour used for icons / badges in LaneWizard */
    accent: string;
    category: StepCategory;
    canHaveIncomingEdge: boolean;
    canHaveOutgoingEdge: boolean;
}

export const STEP_CATEGORIES: Record<StepCategory, string> = {
    vorbereitung: 'Vorbereitung',
    kochen: 'Kochen',
    warten: 'Warten',
    wuerzen: 'Würzen',
    fertig: 'Fertig',
};

export const STEP_CONFIGS: Record<StepType, StepConfig> = {
    start: {
        type: 'start',
        label: 'Start',
        description: 'Pflichtschritt. Einmalig. Startet den Flow.',
        icon: PlayCircle,
        color: '#f0f4ff',
        gradient: 'linear-gradient(135deg, #f0f4ff 0%, #e8ecff 100%)',
        flatBg: 'rgba(39,174,96,0.07)',
        accent: '#27ae60',
        category: 'vorbereitung',
        canHaveIncomingEdge: false,
        canHaveOutgoingEdge: true,
    },
    schneiden: {
        type: 'schneiden',
        label: 'Schneiden',
        description: 'Schneiden, Hacken, Würfeln, Reiben, Schälen',
        icon: Scissors,
        color: '#e3f2fd',
        gradient: 'linear-gradient(135deg, #e3f2fd 0%, #d4ecf9 100%)',
        flatBg: 'rgba(61,154,232,0.07)',
        accent: '#3d9ae8',
        category: 'vorbereitung',
        canHaveIncomingEdge: true,
        canHaveOutgoingEdge: true,
    },
    kochen: {
        type: 'kochen',
        label: 'Kochen',
        description: 'Kochen, Sieden, Blanchieren, Dämpfen, Frittieren',
        icon: Flame,
        color: '#fff3e0',
        gradient: 'linear-gradient(135deg, #fff3e0 0%, #ffecd9 100%)',
        flatBg: 'rgba(224,123,83,0.07)',
        accent: '#e07b53',
        category: 'kochen',
        canHaveIncomingEdge: true,
        canHaveOutgoingEdge: true,
    },
    braten: {
        type: 'braten',
        label: 'Braten',
        description: 'Anbraten, Sautieren, Pfannenrühren, Grillen',
        icon: Beef,
        color: '#fbe9e7',
        gradient: 'linear-gradient(135deg, #fbe9e7 0%, #fadbd8 100%)',
        flatBg: 'rgba(230,126,34,0.08)',
        accent: '#e67e22',
        category: 'kochen',
        canHaveIncomingEdge: true,
        canHaveOutgoingEdge: true,
    },
    backen: {
        type: 'backen',
        label: 'Backen',
        description: 'Backen, Rösten, Gratinieren, Ofengaren',
        icon: UtensilsCrossed,
        color: '#fce4ec',
        gradient: 'linear-gradient(135deg, #fce4ec 0%, #fad0e4 100%)',
        flatBg: 'rgba(142,68,173,0.07)',
        accent: '#8e44ad',
        category: 'kochen',
        canHaveIncomingEdge: true,
        canHaveOutgoingEdge: true,
    },
    mixen: {
        type: 'mixen',
        label: 'Mixen',
        description: 'Mixen, Rühren, Schlagen, Kneten, Pürieren, Vermengen',
        icon: Blend,
        color: '#e8eaf6',
        gradient: 'linear-gradient(135deg, #e8eaf6 0%, #d9dcf2 100%)',
        flatBg: 'rgba(22,160,133,0.07)',
        accent: '#16a085',
        category: 'vorbereitung',
        canHaveIncomingEdge: true,
        canHaveOutgoingEdge: true,
    },
    warten: {
        type: 'warten',
        label: 'Warten',
        description: 'Ruhen lassen, Marinieren, Abkühlen, Gehen lassen, Einweichen',
        icon: Clock,
        color: '#f3e5f5',
        gradient: 'linear-gradient(135deg, #f3e5f5 0%, #ead6f0 100%)',
        flatBg: 'rgba(127,140,141,0.06)',
        accent: '#7f8c8d',
        category: 'warten',
        canHaveIncomingEdge: true,
        canHaveOutgoingEdge: true,
    },
    wuerzen: {
        type: 'wuerzen',
        label: 'Würzen',
        description: 'Würzen, Abschmecken, Verfeinern',
        icon: Leaf,
        color: '#e8f5e9',
        gradient: 'linear-gradient(135deg, #e8f5e9 0%, #d4e9d1 100%)',
        flatBg: 'rgba(243,156,18,0.07)',
        accent: '#f39c12',
        category: 'wuerzen',
        canHaveIncomingEdge: true,
        canHaveOutgoingEdge: true,
    },
    anrichten: {
        type: 'anrichten',
        label: 'Anrichten',
        description: 'Anrichten, Zusammenfügen, Aufteilen, Portionieren',
        icon: Layers,
        color: '#fff8e1',
        gradient: 'linear-gradient(135deg, #fff8e1 0%, #ffecd8 100%)',
        flatBg: 'rgba(46,204,113,0.07)',
        accent: '#2ecc71',
        category: 'fertig',
        canHaveIncomingEdge: true,
        canHaveOutgoingEdge: true,
    },
    servieren: {
        type: 'servieren',
        label: 'Servieren',
        description: 'Pflichtschritt. Einmalig. Terminiert den Flow.',
        icon: Sparkles,
        color: '#ffebee',
        gradient: 'linear-gradient(135deg, #ffebee 0%, #ffd9df 100%)',
        flatBg: 'rgba(39,174,96,0.07)',
        accent: '#27ae60',
        category: 'fertig',
        canHaveIncomingEdge: true,
        canHaveOutgoingEdge: false,
    },
};

export const ADDABLE_STEP_TYPES: StepType[] = [
    'schneiden',
    'kochen',
    'braten',
    'backen',
    'mixen',
    'warten',
    'wuerzen',
    'anrichten',
];

export function getStepConfig(type: StepType): StepConfig {
    return STEP_CONFIGS[type];
}

export function getStepLabel(type: StepType): string {
    return STEP_CONFIGS[type].label;
}

export function getStepColor(type: StepType): string {
    return STEP_CONFIGS[type].color;
}

export function getStepsByCategory(): Record<StepCategory, StepType[]> {
    const result: Record<StepCategory, StepType[]> = {
        vorbereitung: [],
        kochen: [],
        warten: [],
        wuerzen: [],
        fertig: [],
    };

    for (const type of ADDABLE_STEP_TYPES) {
        const config = STEP_CONFIGS[type];
        result[config.category].push(type);
    }

    return result;
}
