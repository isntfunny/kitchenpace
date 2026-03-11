'use client';

import { motion } from 'motion/react';

import { css } from 'styled-system/css';

interface ProgressBarProps {
    progress: number;
}

export function ProgressBar({ progress }: ProgressBarProps) {
    return (
        <div className={trackClass}>
            <motion.div
                className={fillClass}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', stiffness: 80 }}
            />
        </div>
    );
}

const trackClass = css({
    height: '6px',
    width: '100%',
    backgroundColor: { base: 'rgba(224,123,83,0.1)', _dark: 'rgba(224,123,83,0.15)' },
    borderRadius: 'full',
    overflow: 'hidden',
});

const fillClass = css({
    height: '100%',
    background: 'linear-gradient(90deg, #e07b53, #f8b500)',
    borderRadius: 'full',
});
