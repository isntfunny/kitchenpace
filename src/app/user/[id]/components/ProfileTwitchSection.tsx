'use client';

import { Calendar, Tv } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

import { TwitchEmbed } from '@app/components/features/twitch/TwitchEmbed';
import { formatPlannedTime } from '@app/lib/date';
import { SOCIAL } from '@app/lib/themes/palette';

import { css } from 'styled-system/css';

interface ProfileTwitchSectionProps {
    twitchUsername: string;
    isLive: boolean;
    streamTitle?: string | null;
    nextRecipeTitle?: string | null;
    nextRecipeSlug?: string | null;
    plannedAt?: string | null;
    plannedTimezone?: string | null;
}

export function ProfileTwitchSection({
    twitchUsername,
    isLive,
    streamTitle,
    nextRecipeTitle,
    nextRecipeSlug,
    plannedAt,
    plannedTimezone,
}: ProfileTwitchSectionProps) {
    // ── Live: show Twitch embed ──────────────────────────────────────────
    if (isLive) {
        return (
            <section className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
                {streamTitle && (
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2',
                        })}
                    >
                        <Tv size={16} className={css({ color: 'social.twitch' })} />
                        <span
                            className={css({
                                fontSize: 'sm',
                                fontWeight: '600',
                                color: 'text',
                            })}
                        >
                            {streamTitle}
                        </span>
                    </div>
                )}
                <TwitchEmbed channel={twitchUsername} />
            </section>
        );
    }

    // ── Planned: hero banner with gradient ────────────────────────────────
    if (nextRecipeTitle && nextRecipeSlug) {
        const isFuture = plannedAt && new Date(plannedAt) > new Date();

        return (
            <motion.section
                className={css({
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '2xl',
                    color: 'white',
                })}
                style={{
                    background: `linear-gradient(135deg, ${SOCIAL.twitch}, ${SOCIAL.twitch}cc, #6b2fa0)`,
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                {/* Decorative Twitch icon */}
                <motion.div
                    className={css({
                        position: 'absolute',
                        top: '-20px',
                        right: '-20px',
                        opacity: 0.1,
                        pointerEvents: 'none',
                    })}
                    animate={{ y: [0, -8, 0], rotate: [0, 3, 0] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <svg width="160" height="160" viewBox="0 0 24 24" fill="white">
                        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0 1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
                    </svg>
                </motion.div>

                <div
                    className={css({
                        position: 'relative',
                        zIndex: 1,
                        px: { base: '5', md: '6' },
                        py: { base: '5', md: '6' },
                        display: 'flex',
                        alignItems: { base: 'flex-start', md: 'center' },
                        gap: { base: '3', md: '4' },
                        flexDir: { base: 'column', md: 'row' },
                    })}
                >
                    <div
                        className={css({
                            w: '12',
                            h: '12',
                            borderRadius: 'xl',
                            bg: 'rgba(255,255,255,0.2)',
                            backdropFilter: 'blur(8px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            border: '1px solid rgba(255,255,255,0.25)',
                        })}
                    >
                        <Tv size={22} color="white" />
                    </div>

                    <div className={css({ flex: 1, minWidth: 0 })}>
                        <p
                            className={css({
                                fontSize: 'xs',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                color: 'rgba(255,255,255,0.7)',
                                mb: '1',
                            })}
                        >
                            Als nächstes live
                        </p>
                        <Link
                            href={`/recipe/${nextRecipeSlug}`}
                            className={css({
                                fontSize: { base: 'lg', md: 'xl' },
                                fontWeight: '700',
                                fontFamily: 'heading',
                                color: 'white',
                                textDecoration: 'none',
                                _hover: { textDecoration: 'underline' },
                                display: 'block',
                            })}
                        >
                            {nextRecipeTitle}
                        </Link>
                        {isFuture && (
                            <p
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1.5',
                                    fontSize: 'sm',
                                    color: 'rgba(255,255,255,0.8)',
                                    mt: '1.5',
                                })}
                            >
                                <Calendar size={14} />
                                {formatPlannedTime(plannedAt, plannedTimezone)}
                            </p>
                        )}
                    </div>
                </div>
            </motion.section>
        );
    }

    // ── Fallback: simple Twitch link ─────────────────────────────────────
    return (
        <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
            <Tv size={16} className={css({ color: 'social.twitch' })} />
            <a
                href={`https://twitch.tv/${twitchUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className={css({
                    fontSize: 'sm',
                    color: 'text.muted',
                    textDecoration: 'none',
                    _hover: { color: 'social.twitch', textDecoration: 'underline' },
                    transition: 'color 0.15s ease',
                })}
            >
                Twitch: @{twitchUsername}
            </a>
        </div>
    );
}
