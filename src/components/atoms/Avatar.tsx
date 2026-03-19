'use client';

import type { TrophyTier } from '@prisma/client';
import { ChefHat, Trophy, User } from 'lucide-react';

import { LiveBadge } from '@app/components/features/twitch/LiveBadge';
import { PALETTE } from '@app/lib/palette';
import { SOCIAL } from '@app/lib/themes/palette';
import { TIER_STYLES } from '@app/lib/trophies/registry';

import { css, cx } from 'styled-system/css';

import { SmartImage } from './SmartImage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<AvatarSize, number> = {
    xs: 24,
    sm: 32,
    md: 48,
    lg: 80,
    xl: 96,
};

interface AvatarProps {
    /** S3 key — preferred over src */
    imageKey?: string | null;
    /** Fallback: direct image URL */
    src?: string | null;
    /** User ID (for SmartImage thumbnail generation) */
    userId?: string;
    /** Display name (used for alt text and initial fallback) */
    name?: string | null;
    /** Predefined size or pixel number */
    size?: AvatarSize | number;
    /** Show a border ring */
    ring?: boolean;
    /** Border color token (Panda CSS) */
    ringColor?: string;
    /** Highest trophy tier to show as badge (null/undefined = no badge) */
    trophyTier?: TrophyTier | null;
    /** Number of trophies earned (shown in badge tooltip) */
    trophyCount?: number;
    /** Border radius variant (default: 'full' = circle) */
    rounded?: 'full' | '3xl' | 'xl';
    /** Extra className for the outer container */
    className?: string;
    /** Fallback type when no image */
    fallbackType?: 'initial' | 'icon' | 'user';
    /** Show live state: purple ring + LiveBadge (overrides trophy badge) */
    isLive?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Avatar({
    imageKey,
    src,
    userId,
    name,
    size = 'md',
    ring = false,
    ringColor = 'primary',
    trophyTier,
    trophyCount,
    rounded = 'full',
    className,
    fallbackType = 'initial',
    isLive = false,
}: AvatarProps) {
    const px = typeof size === 'number' ? size : SIZE_MAP[size];
    const hasImage = Boolean(imageKey || src);
    const initial = (name || 'U').charAt(0).toUpperCase();

    // Badge sizing scales with avatar
    const showTrophyBadge = !isLive && trophyTier != null && trophyCount != null && trophyCount > 0;
    const badgePx = Math.max(16, Math.round(px * 0.3));
    const badgeIconPx = Math.round(badgePx * 0.6);

    // Ring priority: isLive > explicit ring > trophy ring
    const trophyRing = !ring && !isLive && trophyTier != null ? TIER_STYLES[trophyTier] : null;

    return (
        <div
            className={cx(
                css({
                    position: 'relative',
                    flexShrink: 0,
                    borderRadius: rounded,
                    overflow: 'visible',
                }),
                isLive
                    ? css({ border: '3px solid' })
                    : ring
                      ? css({
                            border: '3px solid',
                            borderColor: ringColor,
                            boxShadow: {
                                base: '0 4px 16px rgba(224,123,83,0.25)',
                                _dark: '0 4px 16px rgba(224,123,83,0.3)',
                            },
                        })
                      : trophyRing
                        ? css({ border: '3px solid' })
                        : undefined,
                className,
            )}
            style={{
                width: px,
                height: px,
                ...(isLive
                    ? {
                          borderColor: SOCIAL.twitch,
                          boxShadow: `0 0 0 2px ${SOCIAL.twitch}, 0 0 16px rgba(145,70,255,0.35)`,
                      }
                    : trophyRing
                      ? {
                            borderColor: trophyRing.fill,
                            boxShadow: `0 2px 8px ${trophyRing.glow}`,
                        }
                      : undefined),
            }}
        >
            {/* Image or fallback */}
            <div
                className={css({
                    width: '100%',
                    height: '100%',
                    borderRadius: rounded,
                    overflow: 'hidden',
                })}
            >
                {hasImage ? (
                    <SmartImage
                        imageKey={imageKey}
                        src={src ?? undefined}
                        userId={userId}
                        alt={name ?? 'Profil'}
                        aspect="1:1"
                        fill
                        className={css({ objectFit: 'cover' })}
                    />
                ) : fallbackType === 'user' ? (
                    <div
                        className={css({
                            width: '100%',
                            height: '100%',
                            bg: 'surface.muted',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        })}
                    >
                        <User size={Math.round(px * 0.45)} color="var(--colors-text-muted)" />
                    </div>
                ) : fallbackType === 'icon' ? (
                    <div
                        className={css({
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                        })}
                        style={{
                            background: `linear-gradient(135deg, ${PALETTE.orange} 0%, #c4623d 100%)`,
                        }}
                    >
                        <ChefHat size={Math.round(px * 0.42)} />
                    </div>
                ) : (
                    <div
                        className={css({
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: '600',
                        })}
                        style={{
                            background: `linear-gradient(135deg, ${PALETTE.orange} 0%, ${PALETTE.gold} 100%)`,
                            fontSize: Math.round(px * 0.4),
                        }}
                    >
                        {initial}
                    </div>
                )}
            </div>

            {/* Live badge (overrides trophy) */}
            {isLive && (
                <div
                    className={css({
                        position: 'absolute',
                        bottom: '-4px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                    })}
                >
                    <LiveBadge size={px >= 80 ? 'md' : 'sm'} />
                </div>
            )}

            {/* Trophy badge */}
            {showTrophyBadge && (
                <div
                    className={css({
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-2px',
                        borderRadius: 'full',
                        border: '2px solid',
                        borderColor: 'surface',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    })}
                    style={{
                        width: badgePx,
                        height: badgePx,
                        background: `linear-gradient(135deg, ${TIER_STYLES[trophyTier].fill}, ${TIER_STYLES[trophyTier].stroke})`,
                        boxShadow: `0 2px 8px ${TIER_STYLES[trophyTier].glow}`,
                    }}
                    title={`${trophyCount} Trophäe${trophyCount > 1 ? 'n' : ''}`}
                >
                    <Trophy size={badgeIconPx} color="white" />
                </div>
            )}
        </div>
    );
}
