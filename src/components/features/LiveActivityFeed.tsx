'use client';

import { useEffect, useState } from 'react';

import type { ActivityFeedItem } from '@app/app/actions/community';

import { css } from 'styled-system/css';

import { Text } from '../atoms/Typography';
import { buildStreamCursor } from '../notifications/useStreamCursor';

import { ActivityList, ActivitySidebar } from './ActivitySidebar';

function logActivityStream(
    scope: 'global' | 'user',
    message: string,
    details?: Record<string, unknown>,
) {
    if (process.env.NODE_ENV !== 'development') {
        return;
    }

    if (details) {
        console.debug(`[SSE activity:${scope}] ${message}`, details);
        return;
    }

    console.debug(`[SSE activity:${scope}] ${message}`);
}

function useLiveActivity(
    initialActivities: ActivityFeedItem[],
    scope: 'global' | 'user',
    limit: number,
) {
    const [activities, setActivities] = useState(initialActivities);

    useEffect(() => {
        setActivities(initialActivities);
    }, [initialActivities]);

    useEffect(() => {
        const cursor = buildStreamCursor(initialActivities);
        const params = new URLSearchParams({ scope });
        if (cursor) {
            params.set('after', cursor.after);
            params.set('afterId', cursor.afterId);
        }

        const eventSource = new EventSource(`/api/activity/stream?${params.toString()}`);
        logActivityStream(scope, 'connecting', {
            url: `/api/activity/stream?${params.toString()}`,
        });
        const handleCreated = (event: MessageEvent<string>) => {
            const payload = JSON.parse(event.data) as ActivityFeedItem;
            logActivityStream(scope, 'created', { id: payload.id });
            setActivities((current) => {
                if (current.some((item) => item.id === payload.id)) {
                    return current;
                }

                return [payload, ...current].slice(0, limit);
            });
        };

        const handleOpen = () => {
            logActivityStream(scope, 'open', { readyState: eventSource.readyState });
        };

        const handleReady = () => {
            logActivityStream(scope, 'ready');
        };

        const handleError = () => {
            logActivityStream(scope, 'error', { readyState: eventSource.readyState });
        };

        eventSource.addEventListener('activity.created', handleCreated);
        eventSource.addEventListener('open', handleOpen);
        eventSource.addEventListener('ready', handleReady);
        eventSource.addEventListener('error', handleError);

        return () => {
            eventSource.removeEventListener('activity.created', handleCreated);
            eventSource.removeEventListener('open', handleOpen);
            eventSource.removeEventListener('ready', handleReady);
            eventSource.removeEventListener('error', handleError);
            logActivityStream(scope, 'closing');
            eventSource.close();
        };
    }, [initialActivities, limit, scope]);

    return activities;
}

export function LiveActivitySidebar({
    initialActivities,
}: {
    initialActivities: ActivityFeedItem[];
}) {
    const activities = useLiveActivity(initialActivities, 'global', 6);
    return <ActivitySidebar activities={activities} />;
}

export function LiveUserActivityList({
    initialActivities,
}: {
    initialActivities: ActivityFeedItem[];
}) {
    const activities = useLiveActivity(initialActivities, 'user', 20);

    if (activities.length === 0) {
        return (
            <div
                className={css({
                    p: '5',
                    textAlign: 'center',
                    border: '1px dashed',
                    borderColor: 'border',
                    borderRadius: 'xl',
                })}
            >
                <Text size="sm" color="muted">
                    Noch keine Aktivitäten.
                </Text>
            </div>
        );
    }

    return <ActivityList activities={activities} />;
}
