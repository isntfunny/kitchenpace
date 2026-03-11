'use client';

import { Check } from 'lucide-react';
import { motion } from 'motion/react';

import { css } from 'styled-system/css';

interface SuccessBannerProps {
    title: string;
    subtitle: React.ReactNode;
}

export function SuccessBanner({ title, subtitle }: SuccessBannerProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={bannerClass}
        >
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className={bannerIconClass}
            >
                <Check className={checkClass} />
            </motion.div>
            <div>
                <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className={bannerTitleClass}
                >
                    {title}
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className={bannerSubtitleClass}
                >
                    {subtitle}
                </motion.p>
            </div>
        </motion.div>
    );
}

const bannerClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '4',
    mb: '6',
    p: '5',
    backgroundColor: { base: 'rgba(0,184,148,0.08)', _dark: 'rgba(0,184,148,0.12)' },
    borderRadius: 'xl',
    border: '1px solid',
    borderColor: { base: 'rgba(0,184,148,0.2)', _dark: 'rgba(0,184,148,0.25)' },
});

const bannerIconClass = css({
    width: '56px',
    height: '56px',
    borderRadius: 'full',
    backgroundColor: { base: 'rgba(0,184,148,0.15)', _dark: 'rgba(0,184,148,0.2)' },
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
});

const checkClass = css({
    width: '28px',
    height: '28px',
    color: 'palette.emerald',
});

const bannerTitleClass = css({
    fontSize: 'lg',
    fontWeight: '700',
    color: 'text',
});

const bannerSubtitleClass = css({
    fontSize: 'sm',
    color: 'text.muted',
});
