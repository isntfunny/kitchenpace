'use client';

import { useEffect, useMemo, useState } from 'react';

import { css } from 'styled-system/css';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

const subscriptionToJson = (subscription: PushSubscription | null) => {
    if (!subscription) return null;
    const rawKey = subscription.getKey('p256dh');
    const rawAuth = subscription.getKey('auth');

    const toBase64 = (value: ArrayBuffer | null) => {
        if (!value) return null;
        const bytes = new Uint8Array(value);
        let binary = '';
        bytes.forEach((b) => (binary += String.fromCharCode(b)));
        return btoa(binary);
    };

    return {
        endpoint: subscription.endpoint,
        keys: {
            p256dh: toBase64(rawKey) ?? '',
            auth: toBase64(rawAuth) ?? '',
        },
    };
};

export function PushSubscriptionToggle() {
    const [status, setStatus] = useState<
        'loading' | 'enabled' | 'disabled' | 'error' | 'unsupported'
    >('disabled');
    const [endpoint, setEndpoint] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const supported = useMemo(
        () =>
            typeof window !== 'undefined' &&
            'serviceWorker' in navigator &&
            'PushManager' in window,
        [],
    );

    useEffect(() => {
        if (!supported) {
            setStatus('unsupported');
            return;
        }

        if (!VAPID_PUBLIC_KEY) {
            setStatus('unsupported');
            return;
        }

        const checkSubscription = async () => {
            setStatus('loading');
            try {
                const response = await fetch('/api/notifications/push', { cache: 'no-store' });
                if (!response.ok) throw new Error('Failed to fetch subscription');
                const payload = await response.json();
                if (payload?.endpoint) {
                    setEndpoint(payload.endpoint);
                    setStatus('enabled');
                } else {
                    setStatus('disabled');
                }
            } catch (err) {
                console.error(err);
                setStatus('error');
                setError('Push-Status konnte nicht geladen werden.');
            }
        };

        checkSubscription();
    }, [supported]);

    const subscribe = async () => {
        if (!supported || !VAPID_PUBLIC_KEY) return;
        try {
            setStatus('loading');
            if (Notification.permission !== 'granted') {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    setStatus('error');
                    setError('Erlaube Benachrichtigungen im Browser.');
                    return;
                }
            }

            const registration = await navigator.serviceWorker.register('/push-sw.js');
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });

            const body = {
                subscription: subscriptionToJson(subscription),
                label: 'Browser',
            };

            await fetch('/api/notifications/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            setEndpoint(subscription.endpoint);
            setStatus('enabled');
            setError(null);
        } catch (err) {
            console.error(err);
            setStatus('error');
            setError('Push-Abo konnte nicht erstellt werden.');
        }
    };

    const unsubscribe = async () => {
        if (!supported) return;
        try {
            setStatus('loading');
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            const endpointToRemove = subscription?.endpoint ?? endpoint;
            if (subscription) {
                await subscription.unsubscribe();
            }

            await fetch('/api/notifications/push', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: endpointToRemove }),
            });

            setEndpoint(null);
            setStatus('disabled');
            setError(null);
        } catch (err) {
            console.error(err);
            setStatus('error');
            setError('Push-Abo konnte nicht entfernt werden.');
        }
    };

    if (!VAPID_PUBLIC_KEY) {
        return null;
    }

    if (!supported) {
        return (
            <div
                className={css({
                    borderRadius: '2xl',
                    border: '1px dashed',
                    borderColor: 'border',
                    padding: '4',
                    background: 'surface.elevated',
                    color: 'text-muted',
                    fontSize: 'sm',
                })}
            >
                Push-Benachrichtigungen werden von diesem Browser nicht unterstützt.
            </div>
        );
    }

    return (
        <div
            className={css({
                borderRadius: '2xl',
                border: '1px solid rgba(224,123,83,0.25)',
                padding: '4',
                background: 'surface.elevated',
                display: 'flex',
                flexDirection: 'column',
                gap: '3',
            })}
        >
            <div>
                <p className={css({ fontWeight: '700', margin: 0 })}>Browser-Push aktivieren</p>
                <p className={css({ color: 'text-muted', fontSize: 'sm' })}>
                    Erhalte Updates selbst dann, wenn du gerade keine App geöffnet hast.
                </p>
            </div>
            <button
                onClick={endpoint ? unsubscribe : subscribe}
                disabled={status === 'loading'}
                className={css({
                    borderRadius: 'full',
                    border: 'none',
                    paddingX: '5',
                    paddingY: '2.5',
                    background: endpoint
                        ? 'rgba(220,38,38,0.15)'
                        : 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
                    color: endpoint ? 'red' : 'white',
                    fontWeight: '700',
                    cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                    transition: 'transform 150ms ease',
                    _hover: { transform: status === 'loading' ? 'none' : 'translateY(-1px)' },
                })}
            >
                {endpoint
                    ? 'Push-Benachrichtigungen deaktivieren'
                    : 'Push-Benachrichtigungen aktivieren'}
            </button>
            {error && <p className={css({ color: '#dc2626', fontSize: 'xs' })}>{error}</p>}
        </div>
    );
}
