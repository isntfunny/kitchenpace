'use client';

import { motion } from 'motion/react';
import { type ReactNode } from 'react';

type FadeInProps = {
    delay?: number;
    x?: number;
    y?: number;
    as?: 'div' | 'li';
    className?: string;
    children: ReactNode;
};

export function FadeIn({ delay = 0, x = 0, y = 0, as = 'div', className, children }: FadeInProps) {
    const Component = motion[as];
    return (
        <Component
            initial={{ opacity: 0, x, y }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.4, delay }}
            className={className}
        >
            {children}
        </Component>
    );
}

export function ScaleIn({ delay = 0, className }: { delay?: number; className?: string }) {
    return (
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15, delay }}
            className={className}
        />
    );
}
