'use client';

import { Calendar, Tv } from 'lucide-react';
import Link from 'next/link';

import { LiveBadge } from '@app/components/features/twitch/LiveBadge';
import { TwitchEmbed } from '@app/components/features/twitch/TwitchEmbed';
import { formatPlannedTime } from '@app/lib/date';

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
    if (isLive) {
        return (
            <section className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2',
                        flexWrap: 'wrap',
                    })}
                >
                    <Tv size={18} className={css({ color: 'social.twitch' })} />
                    {streamTitle && (
                        <span
                            className={css({
                                fontSize: 'sm',
                                fontWeight: '600',
                                color: 'text',
                            })}
                        >
                            {streamTitle}
                        </span>
                    )}
                    <LiveBadge size="md" />
                </div>
                <TwitchEmbed channel={twitchUsername} />
            </section>
        );
    }

    if (nextRecipeTitle && nextRecipeSlug) {
        const isFuture = plannedAt && new Date(plannedAt) > new Date();

        return (
            <section
                className={css({
                    borderRadius: 'surface.sm',
                    border: '1px solid',
                    borderColor: 'social.twitch',
                    bg: 'surface.card',
                    p: 'card',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3',
                })}
            >
                <Tv size={18} className={css({ color: 'social.twitch', flexShrink: 0 })} />
                <div className={css({ flex: 1, minWidth: 0 })}>
                    <p
                        className={css({
                            fontSize: 'xs',
                            color: 'text.muted',
                            fontWeight: '500',
                            mb: '0.5',
                        })}
                    >
                        Als nächstes live
                    </p>
                    <Link
                        href={`/recipe/${nextRecipeSlug}`}
                        className={css({
                            fontSize: 'sm',
                            fontWeight: '600',
                            color: 'text.accent',
                            textDecoration: 'none',
                            _hover: { textDecoration: 'underline' },
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
                                fontSize: 'xs',
                                color: 'text.muted',
                                mt: '1',
                            })}
                        >
                            <Calendar size={12} />
                            {formatPlannedTime(plannedAt, plannedTimezone)}
                        </p>
                    )}
                </div>
            </section>
        );
    }

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
