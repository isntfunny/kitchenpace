'use client';

import { useSyncExternalStore } from 'react';

const getHostname = () => window.location.hostname;
const getServerHostname = () => null as string | null;
const subscribe = () => () => {};

/** SSR-safe hostname for Twitch embed parent parameter. */
export function useHostname(): string | null {
    return useSyncExternalStore(subscribe, getHostname, getServerHostname);
}
