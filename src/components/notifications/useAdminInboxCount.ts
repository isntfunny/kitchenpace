'use client';

import { useEffect, useState } from 'react';

import { connectStream, disconnectStream, onStreamEvent } from '@app/lib/realtime/clientStream';

const ADMIN_NOTIFICATIONS_URL = '/api/admin/notifications';
const STREAM_URL = '/api/notifications/stream';

export function useAdminInboxCount() {
    const [count, setCount] = useState(0);

    // Fetch initial count once on mount.
    useEffect(() => {
        fetch(ADMIN_NOTIFICATIONS_URL, { cache: 'no-store' })
            .then((r) => r.json())
            .then((d: { count?: number }) => setCount(d.count ?? 0))
            .catch(() => {});
    }, []);

    // Track real-time changes via the shared SSE connection.
    useEffect(() => {
        connectStream(STREAM_URL);

        const offCreated = onStreamEvent('admin-inbox.created', () => {
            setCount((c) => c + 1);
        });

        const offRemoved = onStreamEvent('admin-inbox.removed', () => {
            setCount((c) => Math.max(0, c - 1));
        });

        return () => {
            offCreated();
            offRemoved();
            disconnectStream();
        };
    }, []);

    return { count };
}
