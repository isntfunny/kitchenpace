'use client';

/* eslint-disable import/order */
import type { TrophyTier } from '@prisma/client';
import { Star } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import type { ChefSpotlightData } from '@app/app/actions/community';
import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';
/* eslint-enable import/order */

import { Avatar } from '../atoms/Avatar';
import { SmartImage } from '../atoms/SmartImage';
import { Heading, Text } from '../atoms/Typography';

interface ChefSpotlightProps {
    chef: ChefSpotlightData | null;
}

export function ChefSpotlight({ chef }: ChefSpotlightProps) {
    if (!chef) {
        return (
            <div
                className={css({
                    p: 'card.md',
                    borderRadius: 'surface',
                    bg: 'surface',
                    boxShadow: 'shadow.medium',
                })}
            >
                <div className={css({ mb: '2', fontWeight: '600', color: 'text' })}>
                    Chef des Monats
                </div>
                <Text size="sm" color="muted">
                    Wir sammeln gerade noch Daten – bald zeigen wir dir einen Kochhelden aus der
                    Community.
                </Text>
            </div>
        );
    }

    const displayName = chef.name || chef.nickname || 'Chef des Monats';
    const profileHref = `/user/${chef.slug}`;
    const linkCss = css({ textDecoration: 'none', color: 'inherit', _hover: { opacity: 0.85 } });

    return (
        <div
            className={css({
                p: 'card.md',
                borderRadius: 'surface',
                bg: 'surface',
                boxShadow: 'shadow.medium',
            })}
        >
            <div
                className={css({
                    mb: '3',
                    display: 'inline-flex',
                    bg: 'palette.gold',
                    borderRadius: 'full',
                    px: '3',
                    py: '1',
                })}
            >
                <Text
                    size="sm"
                    className={css({
                        fontWeight: '600',
                        color: 'white',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '1',
                    })}
                >
                    <motion.span
                        style={{ display: 'inline-flex' }}
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <Star size={16} />
                    </motion.span>
                    <span>Chef des Monats</span>
                </Text>
            </div>

            <div className={flex({ gap: '3', align: 'center', mb: '3' })}>
                <Link href={profileHref} className={linkCss}>
                    <Avatar
                        imageKey={chef.photoKey}
                        userId={chef.id}
                        name={displayName}
                        size={56}
                        ring={!chef.trophyTier}
                        ringColor="palette.gold"
                        trophyTier={(chef.trophyTier as TrophyTier) ?? null}
                        trophyCount={chef.trophyTier ? 1 : 0}
                    />
                </Link>
                <div>
                    <Link href={profileHref} className={linkCss}>
                        <Heading as="h4" size="sm">
                            {displayName}
                        </Heading>
                    </Link>
                    <Text size="sm" color="muted">
                        <Link href={profileHref} className={linkCss}>
                            {chef.followerCount} Follower
                        </Link>
                        {' · '}
                        {chef.recipeCount} Rezepte
                    </Text>
                </div>
            </div>

            {chef.bio && (
                <Text size="sm" color="muted" className={css({ mb: '3', fontStyle: 'italic' })}>
                    &ldquo;{chef.bio}&rdquo;
                </Text>
            )}

            <div
                className={css({
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '2',
                })}
            >
                {chef.topRecipes.map((recipe) => (
                    <a href={`/recipe/${recipe.slug}`} key={recipe.id}>
                        <div
                            className={css({
                                position: 'relative',
                                aspectRatio: '1',
                                borderRadius: 'lg',
                                overflow: 'hidden',
                            })}
                        >
                            <SmartImage
                                imageKey={recipe.imageKey}
                                recipeId={recipe.id}
                                alt={recipe.title}
                                aspect="1:1"
                                fill
                                className={css({ objectFit: 'cover' })}
                            />
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
}
