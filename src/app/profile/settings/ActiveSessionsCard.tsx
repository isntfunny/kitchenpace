'use client';

import { LogOut, Monitor, Smartphone, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState, useTransition } from 'react';

import { Button } from '@app/components/atoms/Button';
import { Heading, Text } from '@app/components/atoms/Typography';
import {
    listSessions,
    revokeAllOtherSessions,
    revokeSession,
    type SessionInfo,
} from '@app/lib/auth/session-actions';
import { css } from 'styled-system/css';

function maskIp(ip: string | null): string {
    if (!ip) return '';
    if (ip.includes(':')) return ip.split(':').slice(0, 4).join(':') + ':***';
    const parts = ip.split('.');
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.*.*` : ip;
}

function relativeTime(date: Date): string {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `Vor ${minutes} Min.`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Vor ${hours} Std.`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Gestern';
    return `Vor ${days} Tagen`;
}

function isMobile(label: string | null): boolean {
    if (!label) return false;
    return /android|ios|iphone|ipad/i.test(label);
}

export function ActiveSessionsCard() {
    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [revokingToken, setRevokingToken] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const fetchSessions = useCallback(async () => {
        try {
            const data = await listSessions();
            setSessions(data);
            setFetchError(false);
        } catch {
            setFetchError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const handleRevoke = (token: string) => {
        setRevokingToken(token);
        startTransition(async () => {
            const result = await revokeSession(token);
            if ('success' in result) {
                setSessions((prev) => prev.filter((s) => s.token !== token));
            }
            setRevokingToken(null);
        });
    };

    const handleRevokeAll = () => {
        startTransition(async () => {
            const result = await revokeAllOtherSessions();
            if ('revoked' in result) {
                setSessions((prev) => prev.filter((s) => s.isCurrent));
            }
        });
    };

    const otherSessions = sessions.filter((s) => !s.isCurrent);

    return (
        <div
            className={css({
                p: { base: '4', md: '5' },
                borderRadius: '2xl',
                bg: 'surface',
                boxShadow: 'shadow.medium',
            })}
        >
            <div className={css({ mb: '5' })}>
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3',
                        mb: '3',
                    })}
                >
                    <div
                        className={css({
                            w: '10',
                            h: '10',
                            borderRadius: 'lg',
                            bg: 'palette.emerald',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                        })}
                    >
                        <Monitor size={20} />
                    </div>
                    <Heading as="h2" size="lg">
                        Aktive Sitzungen
                    </Heading>
                </div>
                <Text color="muted" size="sm">
                    Verwalte deine aktiven Anmeldungen auf verschiedenen Geräten.
                </Text>
            </div>

            {loading ? (
                <Text color="muted" size="sm">
                    Sitzungen werden geladen...
                </Text>
            ) : fetchError ? (
                <Text size="sm" className={css({ color: 'red.600' })}>
                    Sitzungen konnten nicht geladen werden.
                </Text>
            ) : sessions.length === 0 ? (
                <Text color="muted" size="sm">
                    Keine aktiven Sitzungen gefunden.
                </Text>
            ) : (
                <div className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
                    {sessions.map((session) => {
                        const DeviceIcon = isMobile(session.deviceLabel) ? Smartphone : Monitor;
                        const isRevoking = revokingToken === session.token;

                        return (
                            <div
                                key={session.id}
                                className={css({
                                    p: '4',
                                    borderRadius: 'xl',
                                    border: '1px solid',
                                    borderColor: session.isCurrent ? 'primary' : 'border',
                                    bg: 'background',
                                    display: 'flex',
                                    flexDir: { base: 'column', sm: 'row' },
                                    gap: '3',
                                    alignItems: { base: 'flex-start', sm: 'center' },
                                    justifyContent: 'space-between',
                                })}
                            >
                                <div
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3',
                                        flex: 1,
                                    })}
                                >
                                    <DeviceIcon
                                        size={20}
                                        className={css({
                                            color: session.isCurrent
                                                ? 'primary'
                                                : 'foreground.muted',
                                            flexShrink: 0,
                                        })}
                                    />
                                    <div>
                                        <div
                                            className={css({
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '2',
                                                flexWrap: 'wrap',
                                            })}
                                        >
                                            <Text className={css({ fontWeight: '600' })}>
                                                {session.deviceLabel ?? 'Unbekanntes Gerät'}
                                            </Text>
                                            {session.isCurrent && (
                                                <span
                                                    className={css({
                                                        fontSize: 'xs',
                                                        fontWeight: '600',
                                                        px: '2',
                                                        py: '0.5',
                                                        borderRadius: 'full',
                                                        bg: 'primary',
                                                        color: 'white',
                                                    })}
                                                >
                                                    Aktuelle Sitzung
                                                </span>
                                            )}
                                        </div>
                                        <Text size="sm" color="muted">
                                            {[
                                                maskIp(session.ipAddress),
                                                relativeTime(session.createdAt),
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </Text>
                                    </div>
                                </div>

                                {!session.isCurrent && (
                                    <button
                                        type="button"
                                        onClick={() => handleRevoke(session.token)}
                                        disabled={isRevoking}
                                        className={css({
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1.5',
                                            px: '3',
                                            py: '1.5',
                                            borderRadius: 'lg',
                                            border: '1px solid',
                                            borderColor: 'red.300',
                                            bg: 'transparent',
                                            color: 'red.600',
                                            fontSize: 'sm',
                                            fontWeight: '500',
                                            fontFamily: 'body',
                                            cursor: isRevoking ? 'not-allowed' : 'pointer',
                                            opacity: isRevoking ? 0.6 : 1,
                                            transition: 'all 150ms ease',
                                            flexShrink: 0,
                                            _hover: isRevoking
                                                ? {}
                                                : {
                                                      bg: 'red.50',
                                                      borderColor: 'red.400',
                                                  },
                                        })}
                                    >
                                        <Trash2 size={14} />
                                        {isRevoking ? 'Wird entfernt...' : 'Entfernen'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {otherSessions.length > 0 && (
                <div className={css({ mt: '5' })}>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleRevokeAll}
                        disabled={isPending}
                    >
                        <LogOut size={18} />
                        {isPending
                            ? 'Wird abgemeldet...'
                            : `Alle anderen Sitzungen beenden (${otherSessions.length})`}
                    </Button>
                </div>
            )}
        </div>
    );
}
