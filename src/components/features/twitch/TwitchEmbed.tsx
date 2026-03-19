'use client';

import { css } from 'styled-system/css';

import { useHostname } from './useHostname';

interface TwitchEmbedProps {
    channel: string;
    autoplay?: boolean;
    rounded?: boolean;
}

export function TwitchEmbed({ channel, autoplay = true, rounded = true }: TwitchEmbedProps) {
    const hostname = useHostname();

    if (!hostname) return null;

    const src = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${hostname}&muted=true${autoplay ? '&autoplay=true' : '&autoplay=false'}`;

    return (
        <div
            className={css({
                position: 'relative',
                paddingBottom: '56.25%',
                height: 0,
                overflow: 'hidden',
                borderRadius: rounded ? 'surface.sm' : '0',
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
