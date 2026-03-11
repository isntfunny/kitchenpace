'use client';

import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDown, Search, GripVertical } from 'lucide-react';
import { memo, useState, useMemo, useCallback } from 'react';

import { css } from 'styled-system/css';

import type { StepType } from './editorTypes';
import {
    ADDABLE_STEP_TYPES,
    getStepsByCategory,
    STEP_CATEGORIES,
    STEP_CONFIGS,
    type StepCategory,
} from './stepConfig';

interface NodePaletteProps {
    onAddNode: (stepType: StepType) => void;
}

const CATEGORY_COLORS: Record<StepCategory, string> = {
    vorbereitung: '#90caf9',
    kochen: '#ffab91',
    warten: '#ce93d8',
    wuerzen: '#a5d6a7',
    fertig: '#ffe082',
};

const STEPS_BY_CATEGORY = getStepsByCategory();
const ALL_CATEGORY_KEYS = Object.keys(STEPS_BY_CATEGORY) as StepCategory[];

function NodePaletteComponent({ onAddNode }: NodePaletteProps) {
    const [search, setSearch] = useState('');

    const filteredSteps = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return null;
        return ADDABLE_STEP_TYPES.filter((type) => {
            const config = STEP_CONFIGS[type];
            return (
                type.toLowerCase().includes(q) ||
                config.label.toLowerCase().includes(q) ||
                config.description.toLowerCase().includes(q)
            );
        });
    }, [search]);

    const handleDragStart = useCallback((e: React.DragEvent, stepType: StepType) => {
        e.dataTransfer.setData('application/step-type', stepType);
        e.dataTransfer.effectAllowed = 'copy';
    }, []);

    const renderStepButton = useCallback(
        (type: StepType) => {
            const config = STEP_CONFIGS[type];
            const Icon = config.icon;
            return (
                <button
                    type="button"
                    key={type}
                    className={stepItemClass}
                    style={{ '--gradient': config.gradient } as React.CSSProperties}
                    onClick={() => onAddNode(type)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, type)}
                >
                    <GripVertical className={gripIconClass} />
                    <Icon className={stepIconClass} />
                    <span className={stepLabelClass}>{config.label}</span>
                </button>
            );
        },
        [onAddNode, handleDragStart],
    );

    return (
        <div className={paletteClass}>
            <div className={headerClass}>
                <h3 className={headerTitleClass}>Schritte</h3>
                <div className={searchContainerClass}>
                    <Search className={searchIconClass} />
                    <input
                        type="text"
                        placeholder="Suchen..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={searchInputClass}
                    />
                </div>
            </div>

            <div className={contentClass}>
                {filteredSteps ? (
                    <div>
                        {filteredSteps.map(renderStepButton)}
                        {filteredSteps.length === 0 && (
                            <p className={emptyClass}>Keine Ergebnisse</p>
                        )}
                    </div>
                ) : (
                    <Accordion.Root type="multiple" defaultValue={ALL_CATEGORY_KEYS}>
                        {ALL_CATEGORY_KEYS.map((category) => {
                            const steps = STEPS_BY_CATEGORY[category];
                            if (steps.length === 0) return null;

                            return (
                                <Accordion.Item
                                    key={category}
                                    value={category}
                                    className={accordionItemClass}
                                >
                                    <Accordion.Header>
                                        <Accordion.Trigger className={triggerClass}>
                                            <div
                                                className={css({
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '1.5',
                                                })}
                                            >
                                                <div
                                                    className={categoryDotClass}
                                                    style={{
                                                        backgroundColor: CATEGORY_COLORS[category],
                                                    }}
                                                />
                                                {STEP_CATEGORIES[category]}
                                            </div>
                                            <ChevronDown className={chevronClass} />
                                        </Accordion.Trigger>
                                    </Accordion.Header>
                                    <Accordion.Content className={accordionContentClass}>
                                        <div className={css({ pb: '1' })}>
                                            {steps.map(renderStepButton)}
                                        </div>
                                    </Accordion.Content>
                                </Accordion.Item>
                            );
                        })}
                    </Accordion.Root>
                )}
            </div>
        </div>
    );
}

export const NodePalette = memo(NodePaletteComponent);

/* ── styles ──────────────────────────────────────────────── */

const paletteClass = css({
    width: '100%',
    height: '100%',
    backgroundColor: 'surface',
    borderRadius: 'xl',
    border: { base: '1px solid rgba(224,123,83,0.2)', _dark: '1px solid rgba(224,123,83,0.15)' },
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
});

const headerClass = css({
    p: '2',
    borderBottom: {
        base: '1px solid rgba(224,123,83,0.15)',
        _dark: '1px solid rgba(224,123,83,0.12)',
    },
});

const headerTitleClass = css({
    fontSize: 'xs',
    fontWeight: '600',
    mb: '1.5',
    color: 'text',
});

const searchContainerClass = css({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
});

const searchInputClass = css({
    width: '100%',
    py: '1.5',
    pl: '7',
    pr: '1.5',
    border: { base: '1px solid rgba(224,123,83,0.2)', _dark: '1px solid rgba(224,123,83,0.15)' },
    borderRadius: 'md',
    fontSize: 'xs',
    outline: 'none',
    backgroundColor: 'surface',
    color: 'text',
    _placeholder: { color: 'text.muted' },
    _focus: {
        borderColor: 'brand.primary',
        boxShadow: {
            base: '0 0 0 2px rgba(224,123,83,0.1)',
            _dark: '0 0 0 2px rgba(224,123,83,0.15)',
        },
    },
});

const searchIconClass = css({
    position: 'absolute',
    left: '1.5',
    width: '12px',
    height: '12px',
    color: 'text.muted',
});

const contentClass = css({
    flex: '1',
    overflowY: 'auto',
    p: '1.5',
});

const emptyClass = css({
    fontSize: 'xs',
    color: 'text.muted',
    p: '2',
    textAlign: 'center',
});

const accordionItemClass = css({ mb: '1' });

const triggerClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    py: '1.5',
    pl: '2',
    pr: '1.5',
    backgroundImage: {
        base: 'linear-gradient(135deg, rgba(224,123,83,0.06) 0%, rgba(224,123,83,0.02) 100%)',
        _dark: 'linear-gradient(135deg, rgba(224,123,83,0.1) 0%, rgba(224,123,83,0.04) 100%)',
    },
    border: { base: '1px solid rgba(224,123,83,0.1)', _dark: '1px solid rgba(224,123,83,0.15)' },
    borderRadius: 'lg',
    mb: '1',
    fontSize: 'xs',
    fontWeight: '600',
    color: 'text',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: {
        backgroundImage: {
            base: 'linear-gradient(135deg, rgba(224,123,83,0.12) 0%, rgba(224,123,83,0.06) 100%)',
            _dark: 'linear-gradient(135deg, rgba(224,123,83,0.18) 0%, rgba(224,123,83,0.08) 100%)',
        },
        borderColor: { base: 'rgba(224,123,83,0.2)', _dark: 'rgba(224,123,83,0.25)' },
    },
});

const chevronClass = css({
    width: '12px',
    height: '12px',
    color: 'text.muted',
    transition: 'transform 0.2s ease',
});

const accordionContentClass = css({ overflow: 'hidden' });

const categoryDotClass = css({
    width: '6px',
    height: '6px',
    borderRadius: 'full',
    flexShrink: '0',
});

const stepItemClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    width: '100%',
    py: '1.5',
    pl: '2',
    pr: '1.5',
    backgroundColor: 'transparent',
    border: { base: '1px solid rgba(224,123,83,0.1)', _dark: '1px solid rgba(224,123,83,0.15)' },
    borderRadius: 'lg',
    mb: '1',
    fontSize: 'xs',
    color: 'text',
    cursor: 'grab',
    transition: 'all 0.15s ease',
    _hover: {
        backgroundImage: 'var(--gradient)',
        borderColor: { base: 'rgba(224,123,83,0.25)', _dark: 'rgba(224,123,83,0.3)' },
        transform: 'translateX(2px)',
    },
});

const gripIconClass = css({
    width: '10px',
    height: '10px',
    color: 'text.muted',
    opacity: '0.5',
    flexShrink: '0',
});

const stepIconClass = css({
    width: '14px',
    height: '14px',
    flexShrink: '0',
});

const stepLabelClass = css({
    fontWeight: '500',
    flex: '1',
});
