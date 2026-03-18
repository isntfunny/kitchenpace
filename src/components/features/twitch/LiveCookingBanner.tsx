'use client';

import { ChevronDown, ChevronUp, Tv } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { SOCIAL } from '@app/lib/themes/palette';

import { css } from 'styled-system/css';

import { LiveBadge } from './LiveBadge';
import { TwitchEmbed } from './TwitchEmbed';

interface LiveCookingBannerProps {
    channel: string;
    userName: string;
    userSlug: string;
}

export function LiveCookingBanner({ channel, userName, userSlug }: LiveCookingBannerProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <section
            className={css({
                borderRadius: 'surface',
                border: '1px solid',
                borderColor: 'social.twitch',
                bg: 'surface.card',
                overflow: 'hidden',
                boxShadow: 'shadow.medium',
            })}
        >
            {/* Header */}
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3',
                    px: 'card',
                    py: '3',
                    borderBottom: expanded ? '1px solid' : 'none',
                    borderColor: 'border.muted',
                    bg: `${SOCIAL.twitch}0F`,
                    _dark: { bg: `${SOCIAL.twitch}1F` },
                    flexWrap: 'wrap',
                })}
            >
                <Tv size={20} className={css({ color: 'social.twitch', flexShrink: 0 })} />

                <div
                    className={css({
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2',
                        flexWrap: 'wrap',
                    })}
                >
                    <span
                        className={css({
                            fontSize: 'sm',
                            fontWeight: '600',
                            color: 'text',
                        })}
                    >
                        <Link
                            href={`/user/${userSlug}`}
                            className={css({
                                color: 'social.twitch',
                                textDecoration: 'none',
                                _hover: { textDecoration: 'underline' },
                            })}
                        >
                            {userName}
                        </Link>{' '}
                        kocht dieses Rezept gerade live!
                    </span>
                    <LiveBadge size="sm" />
                </div>

                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className={css({
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '1',
                        fontSize: 'xs',
                        fontWeight: '500',
                        color: 'text.muted',
                        bg: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: 'control',
                        px: '2',
                        py: '1',
                        _hover: { bg: 'button.secondary-hover' },
                        transition: 'background 0.15s ease',
                    })}
                >
                    {expanded ? (
                        <>
                            Ausblenden <ChevronUp size={14} />
                        </>
                    ) : (
                        <>
                            Stream ansehen <ChevronDown size={14} />
                        </>
                    )}
                </button>
            </div>

            {/* Embed */}
            {expanded && (
                <div className={css({ p: 'card' })}>
                    <TwitchEmbed channel={channel} />
                </div>
            )}
        </section>
    );
}
