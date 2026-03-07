'use client';

import { Flame } from 'lucide-react';
import { motion } from 'motion/react';

export function AnimatedFlame({ size = 18 }: { size?: number }) {
    return (
        <motion.span
            style={{ display: 'inline-flex' }}
            animate={{ y: [0, -2, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
            <Flame size={size} />
        </motion.span>
    );
}
