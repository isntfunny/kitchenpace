'use client';

import { SiDiscord, SiGoogle, SiTwitch } from '@icons-pack/react-simple-icons';
import { Link2, Link2Off, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@app/components/atoms/Button';
import { Heading, Text } from '@app/components/atoms/Typography';
import { authClient } from '@app/lib/auth-client';
import { SOCIAL } from '@app/lib/themes/palette';

import { css } from 'styled-system/css';

interface LinkedAccount {
    id: string;
    providerId: string;
    accountId: string;
}

const PROVIDERS = [
    {
        id: 'google',
        name: 'Google',
        color: SOCIAL.google,
        icon: <SiGoogle size={20} />,
    },
    {
        id: 'discord',
        name: 'Discord',
        color: SOCIAL.discord,
        icon: <SiDiscord size={20} color={SOCIAL.discord} />,
    },
    {
        id: 'twitch',
        name: 'Twitch',
        color: SOCIAL.twitch,
        icon: <SiTwitch size={20} color={SOCIAL.twitch} />,
    },
] as const;

export function LinkedAccountsCard({
    accounts: initialAccounts,
    hasPassword,
}: {
    accounts: LinkedAccount[];
    hasPassword: boolean;
}) {
    const [accounts, setAccounts] = useState<LinkedAccount[]>(initialAccounts);
    const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Refresh accounts on mount (picks up changes from OAuth redirect)
    useEffect(() => {
        authClient.listAccounts().then((result) => {
            if (!result.error && result.data) {
                setAccounts(result.data);
            }
        });
    }, []);

    const linkedIds = new Set(accounts.map((a) => a.providerId));
    const canUnlink = accounts.length > 1 || hasPassword;

    const handleLink = async (providerId: string) => {
        setLoadingProvider(providerId);
        setError(null);
        try {
            await authClient.linkSocial({
                provider: providerId as 'google' | 'discord' | 'twitch',
                callbackURL: window.location.pathname,
            });
        } catch {
            setError(`Verbindung mit ${providerId} fehlgeschlagen.`);
            setLoadingProvider(null);
        }
    };

    const handleUnlink = async (providerId: string) => {
        if (!canUnlink) return;
        setLoadingProvider(providerId);
        setError(null);
        try {
            const result = await authClient.unlinkAccount({ providerId });
            if (result.error) {
                setError(result.error.message ?? 'Trennung fehlgeschlagen.');
            } else {
                setAccounts((prev) => prev.filter((a) => a.providerId !== providerId));
            }
        } catch {
            setError('Trennung fehlgeschlagen.');
        } finally {
            setLoadingProvider(null);
        }
    };

    return (
        <div
            className={css({
                p: { base: '4', md: '5' },
                borderRadius: '2xl',
                bg: 'surface',
                boxShadow: 'shadow.medium',
            })}
        >
            <div className={css({ mb: '4' })}>
                <div className={css({ display: 'flex', alignItems: 'center', gap: '3', mb: '3' })}>
                    <div
                        className={css({
                            w: '10',
                            h: '10',
                            borderRadius: 'lg',
                            bg: 'secondary',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                        })}
                    >
                        <Link2 size={20} />
                    </div>
                    <Heading as="h2" size="lg">
                        Verknüpfte Konten
                    </Heading>
                </div>
                <Text color="muted" size="sm">
                    Verknüpfe deine Social-Media-Konten für einfacheres Anmelden.
                </Text>
            </div>

            {error && (
                <Text size="sm" className={css({ color: 'red.600', mb: '3' })}>
                    {error}
                </Text>
            )}

            <div className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
                {PROVIDERS.map((provider) => {
                    const isLinked = linkedIds.has(provider.id);
                    const isLoading = loadingProvider === provider.id;

                    return (
                        <div
                            key={provider.id}
                            className={css({
                                p: '4',
                                borderRadius: 'xl',
                                border: '1px solid',
                                borderColor: isLinked ? provider.color : 'border',
                                bg: 'background',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3',
                            })}
                        >
                            <div className={css({ flexShrink: 0 })}>{provider.icon}</div>
                            <div className={css({ flex: 1 })}>
                                <Text className={css({ fontWeight: '600' })}>{provider.name}</Text>
                                <Text size="sm" color="muted">
                                    {isLinked ? 'Verbunden' : 'Nicht verbunden'}
                                </Text>
                            </div>
                            {isLinked ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUnlink(provider.id)}
                                    disabled={isLoading || !canUnlink}
                                    title={
                                        !canUnlink
                                            ? 'Du musst mindestens eine Anmeldemethode behalten'
                                            : undefined
                                    }
                                >
                                    {isLoading ? (
                                        <Loader2
                                            size={16}
                                            className={css({
                                                animation: 'spin 1s linear infinite',
                                            })}
                                        />
                                    ) : (
                                        <Link2Off size={16} />
                                    )}
                                    Trennen
                                </Button>
                            ) : (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleLink(provider.id)}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Loader2
                                            size={16}
                                            className={css({
                                                animation: 'spin 1s linear infinite',
                                            })}
                                        />
                                    ) : (
                                        <Link2 size={16} />
                                    )}
                                    Verbinden
                                </Button>
                            )}
                        </div>
                    );
                })}
            </div>

            {!canUnlink && (
                <Text size="sm" color="muted" className={css({ mt: '3' })}>
                    Du kannst ein Konto nur trennen, wenn du ein Passwort hast oder ein anderes
                    Konto verknüpft ist.
                </Text>
            )}
        </div>
    );
}
