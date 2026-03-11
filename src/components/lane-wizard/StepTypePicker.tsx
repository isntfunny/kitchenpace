'use client';

import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';

import type { StepType } from '@app/components/flow/editor/editorTypes';
import { ADDABLE_STEP_TYPES, STEP_CONFIGS } from '@app/components/flow/editor/stepConfig';
import { useIsDark } from '@app/lib/darkMode';
import { css } from 'styled-system/css';

interface StepTypePickerProps {
    title?: string;
    onSelect: (type: StepType) => void;
    onClose: () => void;
    inline?: boolean;
}

export function StepTypePicker({
    title = 'Was passiert als nächstes?',
    onSelect,
    onClose,
    inline = false,
}: StepTypePickerProps) {
    const ref = useRef<HTMLDivElement>(null);
    const dark = useIsDark();

    useEffect(() => {
        if (inline) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose, inline]);

    if (inline) {
        return (
            <div ref={ref} className={inlineContainerClass}>
                <div className={headerClass}>{title}</div>
                <div className={inlineGridClass}>
                    {ADDABLE_STEP_TYPES.map((type) => {
                        const config = STEP_CONFIGS[type];
                        const Icon = config.icon;
                        return (
                            <button
                                key={type}
                                type="button"
                                className={itemClass}
                                style={{
                                    background: dark ? config.darkColor : config.flatBg,
                                    backgroundImage: dark ? config.darkGradient : undefined,
                                    color: config.accent,
                                }}
                                onClick={() => onSelect(type)}
                            >
                                <Icon className={css({ w: '18px', h: '18px' })} />
                                <span>{config.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.92, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -8 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={containerClass}
        >
            <div className={headerClass}>{title}</div>
            <div className={gridClass}>
                {ADDABLE_STEP_TYPES.map((type) => {
                    const config = STEP_CONFIGS[type];
                    const Icon = config.icon;
                    return (
                        <button
                            key={type}
                            type="button"
                            className={itemClass}
                            style={{
                                background: dark ? config.darkColor : config.flatBg,
                                backgroundImage: dark ? config.darkGradient : undefined,
                                color: config.accent,
                            }}
                            onClick={() => onSelect(type)}
                        >
                            <Icon className={css({ w: '20px', h: '20px' })} />
                            <span>{config.label}</span>
                        </button>
                    );
                })}
            </div>
            <button type="button" onClick={onClose} className={cancelClass}>
                Abbrechen
            </button>
        </motion.div>
    );
}

/* ── Styles ── */

const inlineContainerClass = css({
    p: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: '1',
});

const inlineGridClass = css({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))',
    gap: '6px',
});

const containerClass = css({
    bg: 'surface',
    borderRadius: 'xl',
    border: {
        base: '1px solid rgba(224,123,83,0.3)',
        _dark: '1px solid rgba(224,123,83,0.25)',
    },
    boxShadow: {
        base: '0 8px 32px rgba(0,0,0,0.12)',
        _dark: '0 8px 32px rgba(0,0,0,0.35)',
    },
    p: '3',
    w: '280px',
});

const headerClass = css({
    fontSize: 'xs',
    fontWeight: '600',
    color: 'text.muted',
    mb: '2',
    textAlign: 'center',
});

const gridClass = css({
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1.5',
});

const itemClass = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5',
    p: '2',
    borderRadius: 'lg',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontSize: '9px',
    fontWeight: '700',
    _hover: {
        borderColor: 'brand.primary',
        transform: 'translateY(-1px)',
        boxShadow: {
            base: '0 2px 8px rgba(224,123,83,0.2)',
            _dark: '0 2px 8px rgba(224,123,83,0.3)',
        },
    },
});

const cancelClass = css({
    display: 'block',
    w: '100%',
    mt: '2',
    py: '1.5',
    borderRadius: 'lg',
    border: 'none',
    bg: 'transparent',
    color: 'text.muted',
    fontSize: 'xs',
    cursor: 'pointer',
    _hover: {
        bg: { base: 'rgba(0,0,0,0.04)', _dark: 'rgba(255,255,255,0.06)' },
    },
});
