'use client';

import { useEffect, useState } from 'react';

import type { ActivityFeedItem } from '@app/app/actions/community';
import { css } from 'styled-system/css';

import { Heading, Text } from '../atoms/Typography';
import { buildStreamCursor } from '../notifications/useStreamCursor';

import { ActivityList } from './ActivitySidebar';


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
        const handleCreated = (event: MessageEvent<string>) => {
            const payload = JSON.parse(event.data) as ActivityFeedItem;
            setActivities((current) => {
                if (current.some((item) => item.id === payload.id)) {
                    return current;
                }

                return [payload, ...current].slice(0, limit);
            });
        };

        eventSource.addEventListener('activity.created', handleCreated);

        return () => {
            eventSource.removeEventListener('activity.created', handleCreated);
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

    return (
        <aside
            className={css({
                p: '5',
                borderRadius: '2xl',
                bg: 'surface',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                height: 'fit-content',
                position: 'sticky',
                top: '100px',
            })}
        >
            <div className={css({ mb: '4' })}>
                <Heading
                    as="h3"
                    size="md"
                    className={css({
                        color: 'primary',
                    })}
                >
                    Aktivität
                </Heading>
                <Text size="sm" color="muted" className={css({ fontSize: '0.75rem' })}>
                    Was passiert gerade in der Community
                </Text>
            </div>

            <ActivityList activities={activities} />
        </aside>
    );
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
