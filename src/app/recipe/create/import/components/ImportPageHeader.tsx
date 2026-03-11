'use client';

import type { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

import {
    headerClass,
    iconClass,
    iconWrapperClass,
    subtitleClass,
    titleClass,
} from '../importStyles';

interface ImportPageHeaderProps {
    icon: LucideIcon;
    title: string;
    subtitle: string;
}

export function ImportPageHeader({ icon: Icon, title, subtitle }: ImportPageHeaderProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className={headerClass}
        >
            <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className={iconWrapperClass}
            >
                <Icon className={iconClass} />
            </motion.div>

            <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className={titleClass}
            >
                {title}
            </motion.h1>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className={subtitleClass}
            >
                {subtitle}
            </motion.p>
        </motion.div>
    );
}
