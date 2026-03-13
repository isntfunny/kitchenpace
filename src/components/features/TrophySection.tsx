'use client';

import type { TrophyTier } from '@prisma/client';
import { GraduationCap, Trophy } from 'lucide-react';
import { useMemo } from 'react';

import { TIER_STYLES } from '@app/lib/trophies/registry';
import { css } from 'styled-system/css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EarnedTrophy {
    id: string;
    groupSlug: string;
    tier: TrophyTier;
    name: string;
    description: string;
    icon: string;
    points: number;
    earnedAt: Date;
}

// Map of known Lucide icon names → components (extend as trophies grow)
const ICON_MAP: Record<string, React.ComponentType<{ size: number; className?: string }>> = {
    GraduationCap,
    Trophy,
};

function TrophyIcon({ name, size = 28 }: { name: string; size?: number }) {
    const Icon = ICON_MAP[name] ?? Trophy;
    return <Icon size={size} className={css({ color: 'white' })} />;
}

// ---------------------------------------------------------------------------
// Trophy Card
// ---------------------------------------------------------------------------

function TrophyCard({ trophy }: { trophy: EarnedTrophy }) {
    const style = TIER_STYLES[trophy.tier];
    const earnedDate = new Date(trophy.earnedAt).toLocaleDateString('de-DE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    return (
        <div className={cardClass}>
            <div
                className={iconClass}
                style={{
                    background: `linear-gradient(135deg, ${style.fill}, ${style.stroke})`,
                    boxShadow: `0 4px 16px ${style.glow}`,
                }}
            >
                <TrophyIcon name={trophy.icon} size={28} />
            </div>
            <div className={css({ flex: 1, minW: 0 })}>
                <p className={css({ fontWeight: '700', fontSize: 'sm', lineHeight: '1.3' })}>
                    {trophy.name}
                </p>
                <p className={css({ fontSize: 'xs', color: 'text.muted', mt: '0.5' })}>
                    {trophy.description}
                </p>
                <p className={css({ fontSize: 'xs', color: 'text.secondary', mt: '1' })}>
                    {earnedDate} · +{trophy.points} Punkte
                </p>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

interface TrophySectionProps {
    trophies: EarnedTrophy[];
    isOwnProfile?: boolean;
}

export function TrophySection({ trophies, isOwnProfile = false }: TrophySectionProps) {
    // Group by groupSlug, show only the highest tier per group
    const displayed = useMemo(() => {
        const groups = new Map<string, EarnedTrophy>();
        const tierRank: Record<string, number> = {
            NONE: 0,
            BRONZE: 1,
            SILVER: 2,
            GOLD: 3,
            PLATINUM: 4,
        };
        for (const t of trophies) {
            const existing = groups.get(t.groupSlug);
            if (!existing || (tierRank[t.tier] ?? 0) > (tierRank[existing.tier] ?? 0)) {
                groups.set(t.groupSlug, t);
            }
        }
        return Array.from(groups.values());
    }, [trophies]);

    if (displayed.length === 0 && !isOwnProfile) return null;

    return (
        <section>
            <h2
                className={css({
                    fontSize: 'lg',
                    fontWeight: '700',
                    mb: '3',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2',
                })}
            >
                <Trophy size={18} className={css({ color: 'palette.gold' })} />
                Trophäen
                {displayed.length > 0 && (
                    <span
                        className={css({
                            bg: 'primary',
                            color: 'white',
                            borderRadius: 'full',
                            px: '2',
                            py: '0.5',
                            fontSize: 'xs',
                            fontWeight: '700',
                        })}
                    >
                        {displayed.length}
                    </span>
                )}
            </h2>
            {displayed.length === 0 ? (
                <div
                    className={css({
                        p: '5',
                        borderRadius: 'xl',
                        border: '1px dashed',
                        borderColor: 'border',
                        textAlign: 'center',
                    })}
                >
                    <Trophy
                        size={32}
                        className={css({ color: 'text.muted', mx: 'auto', mb: '2' })}
                    />
                    <p className={css({ fontSize: 'sm', color: 'text.muted' })}>
                        Schliesse das Tutorial ab, um deine erste Trophäe zu verdienen!
                    </p>
                </div>
            ) : (
                <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
                    {displayed.map((t) => (
                        <TrophyCard key={t.id} trophy={t} />
                    ))}
                </div>
            )}
        </section>
    );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const cardClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '3',
    p: '3',
    borderRadius: 'xl',
    bg: 'surface.elevated',
    border: '1px solid',
    borderColor: 'border',
});

const iconClass = css({
    width: '48px',
    height: '48px',
    borderRadius: 'full',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
});
