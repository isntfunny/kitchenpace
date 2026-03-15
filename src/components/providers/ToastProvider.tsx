'use client';

import {
    type ReactNode,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import { useSession } from '@app/lib/auth-client';
import { connectStream, disconnectStream, onStreamEvent } from '@app/lib/realtime/clientStream';
import type { PublishedToast, Toast, ToastInput } from '@app/types/toast';
import { TOAST_STREAM_EVENT } from '@app/types/toast';
import { css } from 'styled-system/css';

const DEFAULT_DURATION = 5000;
const MAX_TOASTS = 5;
const STREAM_URL = '/api/notifications/stream';

type ToastContextValue = {
    toasts: Toast[];
    showToast: (toast: ToastInput) => string;
    dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function normalizeDuration(duration?: number) {
    if (typeof duration !== 'number' || Number.isNaN(duration)) {
        return DEFAULT_DURATION;
    }

    return Math.max(1000, duration);
}

function createClientToast(input: ToastInput): Toast {
    return {
        id: crypto.randomUUID(),
        createdAt: new Date(),
        ...input,
        duration: normalizeDuration(input.duration),
    };
}

function createPublishedToast(input: PublishedToast): Toast {
    return {
        id: input.id,
        type: input.type,
        title: input.title,
        message: input.message,
        duration: normalizeDuration(input.duration),
        action: input.action,
        createdAt: new Date(input.createdAt),
    };
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const { data: session, isPending } = useSession();
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timeoutIdsRef = useRef<Map<string, number>>(new Map());
    const [announcement, setAnnouncement] = useState('');

    const clearToastTimeout = useCallback((id: string) => {
        const timeoutId = timeoutIdsRef.current.get(id);
        if (timeoutId !== undefined) {
            window.clearTimeout(timeoutId);
            timeoutIdsRef.current.delete(id);
        }
    }, []);

    const dismissToast = useCallback(
        (id: string) => {
            clearToastTimeout(id);
            setToasts((current) => current.filter((toast) => toast.id !== id));
        },
        [clearToastTimeout],
    );

    const scheduleDismiss = useCallback(
        (toast: Toast) => {
            clearToastTimeout(toast.id);
            const timeoutId = window.setTimeout(() => {
                dismissToast(toast.id);
            }, toast.duration ?? DEFAULT_DURATION);
            timeoutIdsRef.current.set(toast.id, timeoutId);
        },
        [clearToastTimeout, dismissToast],
    );

    const pushToast = useCallback(
        (toast: Toast) => {
            setAnnouncement('');
            window.requestAnimationFrame(() => {
                setAnnouncement([toast.title, toast.message].filter(Boolean).join('. '));
            });
            setToasts((current) => {
                const next = [toast, ...current];
                const overflow = next.slice(MAX_TOASTS);

                for (const staleToast of overflow) {
                    clearToastTimeout(staleToast.id);
                }

                return next.slice(0, MAX_TOASTS);
            });
            scheduleDismiss(toast);
        },
        [clearToastTimeout, scheduleDismiss],
    );

    const showToast = useCallback(
        (toast: ToastInput) => {
            const nextToast = createClientToast(toast);
            pushToast(nextToast);
            return nextToast.id;
        },
        [pushToast],
    );

    useEffect(() => {
        if (isPending || !session?.user?.id) {
            return;
        }

        connectStream(STREAM_URL);
        const off = onStreamEvent(TOAST_STREAM_EVENT, (event: MessageEvent<string>) => {
            try {
                const payload = JSON.parse(event.data) as PublishedToast;
                pushToast(createPublishedToast(payload));
            } catch (error) {
                console.error('[ToastProvider] Failed to parse toast event', error);
            }
        });

        return () => {
            off();
            disconnectStream();
        };
    }, [pushToast, session?.user?.id, isPending]);

    useEffect(() => {
        const timeoutIds = timeoutIdsRef.current;
        return () => {
            for (const timeoutId of timeoutIds.values()) {
                window.clearTimeout(timeoutId);
            }
            timeoutIds.clear();
        };
    }, []);

    const value = useMemo<ToastContextValue>(
        () => ({
            toasts,
            showToast,
            dismissToast,
        }),
        [dismissToast, showToast, toasts],
    );

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div
                className={css({
                    position: 'absolute',
                    width: '1px',
                    height: '1px',
                    padding: 0,
                    margin: '-1px',
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    whiteSpace: 'nowrap',
                    borderWidth: 0,
                })}
                role="status"
                aria-live="polite"
                aria-atomic="true"
            >
                {announcement}
            </div>
        </ToastContext.Provider>
    );
}

export function useToastContext() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToastContext must be used inside ToastProvider');
    }
    return context;
}
