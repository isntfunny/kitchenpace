'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';

interface FadeInSectionProps {
    children: ReactNode;
    y?: number;
    duration?: number;
    delay?: number;
    className?: string;
}

export function FadeInSection({
    children,
    y = 18,
    duration = 0.4,
    delay = 0,
    className,
}: FadeInSectionProps) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, y }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration, delay, ease: 'easeOut' }}
        >
            {children}
        </motion.div>
    );
}
