'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Google Cast — simplified sender hook.
 *
 * The phone starts a cast session and sends only the recipe slug.
 * The receiver page (`/cast/receiver`) loads `/recipe/[slug]/mobile`
 * in a fullscreen iframe. All interaction happens via touch on the
 * Cast device itself — no phone-as-remote.
 *
 * Register your receiver at https://cast.google.com/publish and set
 * NEXT_PUBLIC_CAST_APP_ID in your environment.
 */
const CAST_APP_ID = process.env.NEXT_PUBLIC_CAST_APP_ID ?? 'CC1AD845';

/** Namespace for custom messages between sender and receiver. */
export const CAST_NAMESPACE = 'urn:x-cast:de.kuechentakt.recipe';

export type CastMessage = { type: 'LOAD_RECIPE'; slug: string };

export type CastState = 'unavailable' | 'available' | 'connecting' | 'connected';

export interface UseCastReturn {
    castState: CastState;
    startCast: () => void;
    stopCast: () => void;
    sendMessage: (msg: CastMessage) => void;
}

// Augment window for the Cast SDK globals.
declare global {
    interface Window {
        __onGCastApiAvailable?: (isAvailable: boolean) => void;
        cast?: {
            framework: {
                CastContext: {
                    getInstance: () => CastContextInstance;
                };
                CastContextEventType: { SESSION_STATE_CHANGED: string };
                SessionState: {
                    SESSION_STARTED: string;
                    SESSION_RESUMED: string;
                    SESSION_ENDED: string;
                    NO_SESSION: string;
                };
            };
        };
        chrome?: {
            cast: {
                AutoJoinPolicy: { ORIGIN_SCOPED: string };
            };
        };
    }
}

interface CastContextInstance {
    setOptions: (opts: {
        receiverApplicationId: string;
        autoJoinPolicy: string;
    }) => void;
    requestSession: () => Promise<void>;
    endCurrentSession: (stopCasting: boolean) => void;
    getCurrentSession: () => CastSession | null;
    addEventListener: (event: string, handler: (e: unknown) => void) => void;
    removeEventListener: (event: string, handler: (e: unknown) => void) => void;
}

interface CastSession {
    sendMessage: (
        namespace: string,
        message: string,
        successCallback?: () => void,
        errorCallback?: (e: unknown) => void,
    ) => void;
}

export function useCast(): UseCastReturn {
    const [castState, setCastState] = useState<CastState>('unavailable');
    const sessionRef = useRef<CastSession | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (document.getElementById('google-cast-sdk')) return;

        window.__onGCastApiAvailable = (isAvailable: boolean) => {
            if (!isAvailable || !window.cast) return;

            const ctx = window.cast.framework.CastContext.getInstance();
            ctx.setOptions({
                receiverApplicationId: CAST_APP_ID,
                autoJoinPolicy: window.chrome?.cast.AutoJoinPolicy.ORIGIN_SCOPED ?? 'origin_scoped',
            });

            ctx.addEventListener(
                window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
                () => {
                    if (!window.cast) return;
                    const session = ctx.getCurrentSession();
                    if (session) {
                        sessionRef.current = session;
                        setCastState('connected');
                    } else {
                        sessionRef.current = null;
                        setCastState('available');
                    }
                },
            );

            setCastState('available');
        };

        const script = document.createElement('script');
        script.id = 'google-cast-sdk';
        script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
        script.async = true;
        document.head.appendChild(script);
    }, []);

    const startCast = useCallback(async () => {
        if (!window.cast) return;
        setCastState('connecting');
        try {
            await window.cast.framework.CastContext.getInstance().requestSession();
        } catch {
            setCastState('available');
        }
    }, []);

    const stopCast = useCallback(() => {
        if (!window.cast) return;
        window.cast.framework.CastContext.getInstance().endCurrentSession(true);
        sessionRef.current = null;
        setCastState('available');
    }, []);

    const sendMessage = useCallback((msg: CastMessage) => {
        const session = sessionRef.current;
        if (!session) return;
        session.sendMessage(CAST_NAMESPACE, JSON.stringify(msg));
    }, []);

    return { castState, startCast, stopCast, sendMessage };
}
