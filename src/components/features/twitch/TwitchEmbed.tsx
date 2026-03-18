'use client';

import { useSyncExternalStore } from 'react';

import { css } from 'styled-system/css';

const getHostname = () => window.location.hostname;
const getServerHostname = () => null as string | null;
const subscribe = () => () => {};

interface TwitchEmbedProps {
    channel: string;
    autoplay?: boolean;
}

export function TwitchEmbed({ channel, autoplay = true }: TwitchEmbedProps) {
    const hostname = useSyncExternalStore(subscribe, getHostname, getServerHostname);

    if (!hostname) return null;

    const src = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${hostname}&muted=true${autoplay ? '&autoplay=true' : '&autoplay=false'}`;

    return (
        <div
            className={css({
                position: 'relative',
                paddingBottom: '56.25%',
                height: 0,
                overflow: 'hidden',
                borderRadius: 'surface.sm',
                bg: 'surface.muted',
            })}
        >
            <iframe
                src={src}
                className={css({
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                })}
                allowFullScreen
                allow="autoplay; encrypted-media"
                title={`${channel} – Twitch Stream`}
            />
        </div>
    );
}
