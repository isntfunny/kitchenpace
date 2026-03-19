'use client';

import { Check, ChefHat, Handshake, Star, UserPlus, Utensils } from 'lucide-react';
import { motion } from 'motion/react';

import { Avatar } from '@app/components/atoms/Avatar';
import { SparkleEffect } from '@app/components/atoms/SparkleEffect';
import { ReportButton } from '@app/components/features/ReportButton';
import { PALETTE } from '@app/lib/palette';
import { SOCIAL } from '@app/lib/themes/palette';

import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

import type { UserProfileData } from '../UserProfileClient';

interface ProfileHeaderProps {
    user: UserProfileData;
    recipes: UserProfileData['recipes'];
    followerTotal: number;
    isFollowing: boolean;
    isPending: boolean;
    showFollowButton: boolean;
    isSelf: boolean;
    isLive?: boolean;
    onFollowToggle: () => void;
}

const AVATAR_SIZE = 180;

export function ProfileHeader({
    user,
    recipes,
    followerTotal,
    isFollowing,
    isPending,
    showFollowButton,
    isSelf,
    isLive = false,
    onFollowToggle,
}: ProfileHeaderProps) {
    const gradient = isLive
        ? `linear-gradient(135deg, ${SOCIAL.twitch}, ${SOCIAL.twitch}cc, #6b2fa0)`
        : `linear-gradient(135deg, ${PALETTE.orange}, ${PALETTE.orange}cc, #c4623d)`;

    return (
        <div
            className={css({
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '2xl',
                mb: '6',
            })}
            style={{ background: gradient }}
        >
            {/* Decorative floating icons */}
            <motion.div
                className={css({
                    position: 'absolute',
                    top: '-40px',
                    right: '-40px',
                    opacity: 0.12,
                    pointerEvents: 'none',
                })}
                animate={{ y: [0, -12, 0], rotate: [0, 4, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            >
                <ChefHat size={200} color="white" />
            </motion.div>
            <motion.div
                className={css({
                    position: 'absolute',
                    bottom: '-60px',
                    left: '22%',
                    opacity: 0.07,
                    pointerEvents: 'none',
                })}
                animate={{ y: [0, 10, 0], rotate: [0, -3, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Utensils size={280} color="white" />
            </motion.div>

            <motion.div
                className={css({
                    position: 'relative',
                    zIndex: 1,
                    px: { base: '5', md: '8' },
                    py: { base: '7', md: '10' },
                })}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div
                    className={flex({
                        direction: { base: 'column', md: 'row' },
                        align: { base: 'center', md: 'flex-start' },
                        gap: { base: '5', md: '7' },
                    })}
                >
                    {/* Avatar */}
                    <Avatar
                        src={user.avatar}
                        name={user.name}
                        size={AVATAR_SIZE}
                        rounded="3xl"
                        trophyTier={user.trophies?.[0]?.tier ?? null}
                        trophyCount={user.trophies?.length ?? 0}
                        isLive={isLive}
                        className={css({
                            boxShadow: isLive
                                ? undefined // Avatar handles live glow internally
                                : '0 0 0 4px rgba(255,255,255,0.4), 0 8px 32px rgba(0,0,0,0.25)',
                        })}
                    />

                    {/* Profile Info */}
                    <div
                        className={css({
                            flex: 1,
                            textAlign: { base: 'center', md: 'left' },
                        })}
                    >
                        <p
                            className={css({
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: 'xs',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.12em',
                                mb: '2',
                            })}
                        >
                            {isLive ? 'Gerade Live auf Twitch' : 'Koch-Profil'}
                        </p>
                        <h1
                            className={css({
                                fontSize: { base: '2xl', md: '3xl', lg: '4xl' },
                                fontWeight: '800',
                                fontFamily: 'heading',
                                color: 'white',
                                mb: '2',
                                lineHeight: '1.15',
                            })}
                        >
                            {user.name}
                        </h1>
                        {user.bio && (
                            <motion.p
                                className={css({
                                    color: 'rgba(255,255,255,0.85)',
                                    fontSize: { base: 'sm', md: 'base' },
                                    lineHeight: '1.6',
                                    mb: '5',
                                    maxW: { base: 'full', md: '500px' },
                                    mx: { base: 'auto', md: '0' },
                                })}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.4 }}
                            >
                                {user.bio}
                            </motion.p>
                        )}

                        {/* Stats + Follow */}
                        <div
                            className={flex({
                                direction: { base: 'row', md: 'row' },
                                align: 'center',
                                justify: { base: 'center', md: 'flex-start' },
                                gap: '3',
                                mt: user.bio ? '0' : '4',
                                flexWrap: 'wrap',
                            })}
                        >
                            <div
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2',
                                    bg: 'rgba(255,255,255,0.18)',
                                    backdropFilter: 'blur(8px)',
                                    px: '3',
                                    py: '2',
                                    borderRadius: 'xl',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                })}
                            >
                                <ChefHat size={15} color="white" />
                                <span
                                    className={css({
                                        fontWeight: '700',
                                        fontSize: 'sm',
                                        color: 'white',
                                    })}
                                >
                                    {user.recipeCount}
                                </span>
                                <span
                                    className={css({
                                        fontSize: 'xs',
                                        color: 'rgba(255,255,255,0.9)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        fontWeight: '500',
                                    })}
                                >
                                    Rezepte
                                </span>
                            </div>

                            {user.showFollowerCount !== false && (
                                <div
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2',
                                        bg: 'rgba(255,255,255,0.18)',
                                        backdropFilter: 'blur(8px)',
                                        px: '3',
                                        py: '2',
                                        borderRadius: 'xl',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                    })}
                                >
                                    <Handshake size={15} color="white" />
                                    <span
                                        className={css({
                                            fontWeight: '700',
                                            fontSize: 'sm',
                                            color: 'white',
                                        })}
                                    >
                                        {followerTotal}
                                    </span>
                                    <span
                                        className={css({
                                            fontSize: 'xs',
                                            color: 'rgba(255,255,255,0.9)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            fontWeight: '500',
                                        })}
                                    >
                                        Follower
                                    </span>
                                </div>
                            )}

                            {recipes.length > 0 && (
                                <div
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2',
                                        bg: 'rgba(255,255,255,0.18)',
                                        backdropFilter: 'blur(8px)',
                                        px: '3',
                                        py: '2',
                                        borderRadius: 'xl',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                    })}
                                >
                                    <Star size={15} color="white" />
                                    <span
                                        className={css({
                                            fontWeight: '700',
                                            fontSize: 'sm',
                                            color: 'white',
                                        })}
                                    >
                                        {(
                                            recipes.reduce((sum, r) => sum + r.rating, 0) /
                                            recipes.length
                                        ).toFixed(1)}
                                    </span>
                                    <span
                                        className={css({
                                            fontSize: 'xs',
                                            color: 'rgba(255,255,255,0.9)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            fontWeight: '500',
                                        })}
                                    >
                                        Ø Rating
                                    </span>
                                </div>
                            )}

                            {showFollowButton && (
                                <SparkleEffect
                                    style={{ display: 'inline-flex', width: 'fit-content' }}
                                >
                                    {(triggerSparkle) => (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!isFollowing) triggerSparkle();
                                                onFollowToggle();
                                            }}
                                            disabled={isPending}
                                            className={css({
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '2',
                                                bg: isFollowing ? 'rgba(255,255,255,0.2)' : 'white',
                                                border: '1px solid',
                                                borderColor: isFollowing
                                                    ? 'rgba(255,255,255,0.4)'
                                                    : 'transparent',
                                                borderRadius: 'lg',
                                                px: '4',
                                                py: '2',
                                                fontWeight: '700',
                                                fontSize: 'sm',
                                                cursor: isPending ? 'not-allowed' : 'pointer',
                                                opacity: isPending ? 0.7 : 1,
                                                transition: 'all 150ms',
                                                whiteSpace: 'nowrap',
                                                _hover: {
                                                    bg: isFollowing
                                                        ? 'rgba(255,255,255,0.3)'
                                                        : 'rgba(255,255,255,0.9)',
                                                },
                                            })}
                                            style={{
                                                color: isFollowing ? 'white' : PALETTE.orange,
                                            }}
                                        >
                                            {isFollowing ? (
                                                <Check size={14} />
                                            ) : (
                                                <UserPlus size={14} />
                                            )}
                                            {isFollowing ? 'Folgst du' : 'Folgen'}
                                        </button>
                                    )}
                                </SparkleEffect>
                            )}

                            {!isSelf && (
                                <ReportButton
                                    contentType="user"
                                    contentId={user.id}
                                    variant="icon-overlay"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
