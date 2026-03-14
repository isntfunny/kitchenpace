'use client';

import { LogOut, Monitor, Smartphone, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@app/components/atoms/Button';
import { Heading, Text } from '@app/components/atoms/Typography';
import { css } from 'styled-system/css';

interface SessionInfo {
    id: string;
    deviceLabel: string | null;
    ipAddress: string | null;
    createdAt: string;
    expires: string;
    isCurrent: boolean;
}

function maskIp(ip: string | null): string {
    if (!ip) return '';
    if (ip.includes(':')) return ip.split(':').slice(0, 4).join(':') + ':***';
    const parts = ip.split('.');
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.*.*` : ip;
}

function relativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
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
    const [revoking, setRevoking] = useState<string | null>(null);
    const [revokingAll, setRevokingAll] = useState(false);

    const fetchSessions = useCallback(async () => {
        try {
            const res = await fetch('/api/sessions');
            if (res.ok) {
                setSessions(await res.json());
                setFetchError(false);
            } else {
                setFetchError(true);
            }
        } catch {
            setFetchError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const revokeSession = async (id: string) => {
        setRevoking(id);
        try {
            const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setSessions((prev) => prev.filter((s) => s.id !== id));
            }
        } finally {
            setRevoking(null);
        }
    };

    const revokeAll = async () => {
        setRevokingAll(true);
        try {
            const res = await fetch('/api/sessions', { method: 'DELETE' });
            if (res.ok) {
                setSessions((prev) => prev.filter((s) => s.isCurrent));
            }
        } finally {
            setRevokingAll(false);
        }
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
                            bg: 'secondary',
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
                                            <Text
                                                className={css({
                                                    fontWeight: '600',
                                                })}
                                            >
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
                                        onClick={() => revokeSession(session.id)}
                                        disabled={revoking === session.id}
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
                                            cursor:
                                                revoking === session.id ? 'not-allowed' : 'pointer',
                                            opacity: revoking === session.id ? 0.6 : 1,
                                            transition: 'all 150ms ease',
                                            flexShrink: 0,
                                            _hover:
                                                revoking === session.id
                                                    ? {}
                                                    : {
                                                          bg: 'red.50',
                                                          borderColor: 'red.400',
                                                      },
                                        })}
                                    >
                                        <Trash2 size={14} />
                                        {revoking === session.id ? 'Wird entfernt...' : 'Entfernen'}
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
                        onClick={revokeAll}
                        disabled={revokingAll}
                    >
                        <LogOut size={18} />
                        {revokingAll
                            ? 'Wird abgemeldet...'
                            : `Alle anderen Sitzungen beenden (${otherSessions.length})`}
                    </Button>
                </div>
            )}
        </div>
    );
}
