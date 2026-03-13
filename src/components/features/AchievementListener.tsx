'use client';

import type { TrophyTier } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';

import { connectStream, disconnectStream, onStreamEvent } from '@app/lib/realtime/clientStream';
import { TROPHY_STREAM_EVENT } from '@app/lib/trophies/registry';

import { AchievementOverlay, type AchievementOverlayProps } from './AchievementOverlay';

const STREAM_URL = '/api/notifications/stream';

interface TrophyPayload {
    trophyId: string;
    name: string;
    description: string;
    icon: string;
    points: number;
    tier?: TrophyTier;
}

export function AchievementListener() {
    const { data: session, status } = useSession();
    const [trophy, setTrophy] = useState<AchievementOverlayProps['trophy'] | null>(null);

    const handleEvent = useCallback((event: MessageEvent<string>) => {
        try {
            const payload = JSON.parse(event.data) as TrophyPayload;
            setTrophy({
                id: payload.trophyId,
                name: payload.name,
                description: payload.description,
                icon: payload.icon,
                points: payload.points,
                tier: payload.tier,
            });
        } catch (error) {
            console.error('[AchievementListener] Failed to parse trophy event', error);
        }
    }, []);

    useEffect(() => {
        if (status !== 'authenticated' || !session?.user?.id) return;

        connectStream(STREAM_URL);
        const off = onStreamEvent(TROPHY_STREAM_EVENT, handleEvent);

        return () => {
            off();
            disconnectStream();
        };
    }, [handleEvent, session?.user?.id, status]);

    if (!trophy) return null;

    return <AchievementOverlay trophy={trophy} onClose={() => setTrophy(null)} />;
}
