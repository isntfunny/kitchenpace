'use client';

import { Utensils } from 'lucide-react';
import { DynamicIcon, iconNames } from 'lucide-react/dynamic';
import type { IconName } from 'lucide-react/dynamic';

// Icon names come from the DB (admin picks any name from lucide.dev), so the
// component set can't be statically known. DynamicIcon lazy-loads each icon as
// its own chunk — a namespace import of lucide-react would ship all ~1,250
// icons (~700 KiB) in the client bundle instead.
const VALID_NAMES = new Set<string>(iconNames);

interface DynamicLucideIconProps {
    /** Kebab-case lucide icon name as stored in the DB, e.g. "cooking-pot". */
    name: string | null;
    size?: number;
    color?: string;
    className?: string;
}

export function DynamicLucideIcon({ name, size, color, className }: DynamicLucideIconProps) {
    if (!name || !VALID_NAMES.has(name)) {
        return <Utensils size={size} color={color} className={className} />;
    }
    return (
        <DynamicIcon
            name={name as IconName}
            size={size}
            color={color}
            className={className}
            fallback={() => <Utensils size={size} color={color} className={className} />}
        />
    );
}
