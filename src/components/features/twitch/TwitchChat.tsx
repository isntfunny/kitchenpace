'use client';

import { css } from 'styled-system/css';

import { useHostname } from './useHostname';

interface TwitchChatProps {
    channel: string;
    darkMode?: boolean;
}

export function TwitchChat({ channel, darkMode = true }: TwitchChatProps) {
    const hostname = useHostname();

    if (!hostname) return null;

    const src = `https://www.twitch.tv/embed/${encodeURIComponent(channel)}/chat?parent=${hostname}${darkMode ? '&darkpopout' : ''}`;

    return (
        <iframe
            src={src}
            className={css({
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
            })}
            title={`${channel} – Chat`}
        />
    );
}
