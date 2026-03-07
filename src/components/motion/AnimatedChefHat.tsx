'use client';

import { ChefHat } from 'lucide-react';
import { motion } from 'motion/react';

export function AnimatedChefHat({ size = 48 }: { size?: number }) {
    return (
        <motion.span
            style={{ display: 'inline-flex' }}
            animate={{ y: [0, -4, 0], rotate: [0, 3, -2, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
            <ChefHat size={size} />
        </motion.span>
    );
}
