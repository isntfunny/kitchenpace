'use client';

import { Eye, Calendar } from 'lucide-react';
import Link from 'next/link';

import { Avatar } from '@app/components/atoms/Avatar';
import { Heading, Text } from '@app/components/atoms/Typography';
import { LiveBadge } from '@app/components/features/twitch/LiveBadge';
import { TwitchEmbed } from '@app/components/features/twitch/TwitchEmbed';
import { useFeatureFlag } from '@app/components/providers/FeatureFlagsProvider';

import { css } from 'styled-system/css';

type LiveStreamItem = {
    id: string;
    title: string | null;
    viewerCount: number | null;
    channel: string;
    userName: string;
    userSlug: string;
    photoKey: string | null;
    recipeTitle: string | null;
    recipeSlug: string | null;
    recipeImageKey: string | null;
};

type UpcomingStreamItem = {
    id: string;
    plannedAtFormatted: string;
    userName: string;
    userSlug: string;
    photoKey: string | null;
    recipeTitle: string | null;
    recipeSlug: string | null;
};

function StreamRow({
    userSlug,
    userName,
    photoKey,
    recipeTitle,
    recipeSlug,
    trailing,
}: {
    userSlug: string;
    userName: string;
    photoKey: string | null;
    recipeTitle: string | null;
    recipeSlug: string | null;
    trailing: React.ReactNode;
}) {
    return (
        <div
            className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '3',
                py: '2.5',
                borderBottom: '1px solid',
                borderColor: 'border.muted',
                _last: { borderBottom: 'none' },
            })}
        >
            <Link href={`/user/${userSlug}`}>
                <Avatar imageKey={photoKey} name={userName} size="sm" />
            </Link>
            <div className={css({ flex: 1, minWidth: 0 })}>
                <Link
                    href={`/user/${userSlug}`}
                    className={css({
                        fontWeight: '600',
                        fontSize: 'sm',
                        color: 'text',
                        textDecoration: 'none',
                        _hover: { color: 'primary' },
                    })}
                >
                    {userName}
                </Link>
                {recipeTitle && recipeSlug && (
                    <Link
                        href={`/recipe/${recipeSlug}`}
                        className={css({
                            display: 'block',
                            fontSize: 'xs',
                            color: 'text.muted',
                            textDecoration: 'none',
                            lineClamp: '1',
                            _hover: { color: 'primary' },
                        })}
                    >
                        {recipeTitle}
                    </Link>
                )}
            </div>
            {trailing}
        </div>
    );
}

interface CurrentlyLiveSectionClientProps {
    liveStreams: LiveStreamItem[];
    upcomingStreams: UpcomingStreamItem[];
}

const SIMULATED_STREAM: LiveStreamItem = {
    id: 'simulated',
    title: 'Live kochen: Flammkuchen',
    viewerCount: 42,
    channel: 'twitchfarming',
    userName: 'KitchenPace Demo',
    userSlug: '',
    photoKey: null,
    recipeTitle: 'Flammkuchen',
    recipeSlug: 'flammkuchen',
    recipeImageKey: null,
};

export function CurrentlyLiveSectionClient({
    liveStreams: liveStreamsProp,
    upcomingStreams,
}: CurrentlyLiveSectionClientProps) {
    const simulateLive = useFeatureFlag('simulateTwitchLive');

    const liveStreams =
        simulateLive && liveStreamsProp.length === 0 ? [SIMULATED_STREAM] : liveStreamsProp;

    if (liveStreams.length === 0 && upcomingStreams.length === 0) {
        return null;
    }

    const hasLive = liveStreams.length > 0;
    const primaryStream = hasLive ? liveStreams[0] : null;

    return (
        <section
            className={css({
                p: 'card.md',
                borderRadius: 'surface',
                bg: 'surface',
                boxShadow: 'shadow.medium',
            })}
        >
            {/* Section header — matches ActivitySidebar pattern */}
            <div className={css({ mb: '4' })}>
                <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
                    <Heading as="h3" size="md" className={css({ color: 'primary' })}>
                        {hasLive ? 'Gerade Live' : 'Demnächst Live'}
                    </Heading>
                    {hasLive && <LiveBadge size="sm" />}
                </div>
                <Text size="sm" color="muted" className={css({ fontSize: '0.75rem' })}>
                    {hasLive ? 'Schau live beim Kochen zu' : 'Bald wird live gekocht'}
                </Text>
            </div>

            {hasLive && primaryStream && (
                <>
                    {/* Embed of first live stream */}
                    <div className={css({ mb: '3' })}>
                        <TwitchEmbed channel={primaryStream.channel} />
                    </div>

                    {/* List of all live streams */}
                    <div className={css({ display: 'flex', flexDirection: 'column' })}>
                        {liveStreams.map((stream) => (
                            <StreamRow
                                key={stream.id}
                                userSlug={stream.userSlug}
                                userName={stream.userName}
                                photoKey={stream.photoKey}
                                recipeTitle={stream.recipeTitle}
                                recipeSlug={stream.recipeSlug}
                                trailing={
                                    stream.viewerCount != null ? (
                                        <div
                                            className={css({
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1',
                                                fontSize: 'xs',
                                                color: 'text.muted',
                                                flexShrink: 0,
                                            })}
                                        >
                                            <Eye size={12} />
                                            <span>
                                                {stream.viewerCount.toLocaleString('de-DE')}
                                            </span>
                                        </div>
                                    ) : null
                                }
                            />
                        ))}
                    </div>
                </>
            )}

            {!hasLive && upcomingStreams.length > 0 && (
                <div className={css({ display: 'flex', flexDirection: 'column' })}>
                    {upcomingStreams.map((stream) => (
                        <StreamRow
                            key={stream.id}
                            userSlug={stream.userSlug}
                            userName={stream.userName}
                            photoKey={stream.photoKey}
                            recipeTitle={stream.recipeTitle}
                            recipeSlug={stream.recipeSlug}
                            trailing={
                                <div
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1',
                                        fontSize: 'xs',
                                        color: 'text.muted',
                                        flexShrink: 0,
                                    })}
                                >
                                    <Calendar size={12} />
                                    <span>{stream.plannedAtFormatted}</span>
                                </div>
                            }
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
