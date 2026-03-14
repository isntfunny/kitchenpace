import { Clock, Megaphone, MessageSquare } from 'lucide-react';

import { PageShell } from '@app/components/layouts/PageShell';
import { ensureAdminSession } from '@app/lib/admin/ensure-admin';
import { css } from 'styled-system/css';

import { getRecentSystemMessages, getRoleStats } from './actions';
import { SendMessageForm } from './send-message-form';

export const dynamic = 'force-dynamic';

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Gerade eben';
    if (mins < 60) return `vor ${mins} Min.`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `vor ${hours} Std.`;
    const days = Math.floor(hours / 24);
    return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
}

export default async function AdminNotificationsPage() {
    await ensureAdminSession('admin-notifications');

    const [roleStats, recentMessages] = await Promise.all([
        getRoleStats(),
        getRecentSystemMessages(),
    ]);

    return (
        <PageShell>
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '6' })}>
                {/* ── Header ── */}
                <header
                    className={css({
                        borderRadius: '2xl',
                        borderWidth: '1px',
                        borderColor: 'border.muted',
                        background: 'surface',
                        padding: { base: '4', md: '5' },
                    })}
                >
                    <p
                        className={css({
                            fontSize: 'xs',
                            textTransform: 'uppercase',
                            letterSpacing: '0.4em',
                            color: 'foreground.muted',
                        })}
                    >
                        Admin · Benachrichtigungen
                    </p>
                    <h1
                        className={css({
                            fontSize: '3xl',
                            fontWeight: 'semibold',
                            color: 'foreground',
                            marginTop: '1',
                        })}
                    >
                        Nachrichten-Zentrale
                    </h1>
                    <p className={css({ marginTop: '2', color: 'foreground.muted' })}>
                        Sende System-Nachrichten an einzelne Benutzer oder ganze Gruppen.
                    </p>
                </header>

                <div
                    className={css({
                        display: 'grid',
                        gap: '6',
                        gridTemplateColumns: { base: '1fr', lg: '2fr 1fr' },
                    })}
                >
                    {/* ── Send form ── */}
                    <section
                        className={css({
                            borderRadius: '2xl',
                            borderWidth: '1px',
                            borderColor: 'border.muted',
                            background: 'surface.elevated',
                            padding: { base: '4', md: '5' },
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5',
                        })}
                    >
                        <div
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3',
                            })}
                        >
                            <div
                                className={css({
                                    borderRadius: 'lg',
                                    borderWidth: '1px',
                                    borderColor: 'border',
                                    padding: '2.5',
                                    background: 'surface',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                })}
                            >
                                <Megaphone size={20} />
                            </div>
                            <div>
                                <h2
                                    className={css({
                                        fontSize: 'lg',
                                        fontWeight: 'semibold',
                                        color: 'foreground',
                                    })}
                                >
                                    Nachricht senden
                                </h2>
                                <p
                                    className={css({
                                        fontSize: 'sm',
                                        color: 'foreground.muted',
                                    })}
                                >
                                    An Benutzer oder Gruppen
                                </p>
                            </div>
                        </div>

                        <SendMessageForm roleStats={roleStats} />
                    </section>

                    {/* ── Sidebar ── */}
                    <div
                        className={css({
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4',
                        })}
                    >
                        {/* Role overview */}
                        <section
                            className={css({
                                borderRadius: '2xl',
                                borderWidth: '1px',
                                borderColor: 'border.muted',
                                background: 'surface.elevated',
                                padding: '4',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '3',
                            })}
                        >
                            <h3
                                className={css({
                                    fontSize: 'sm',
                                    fontWeight: '600',
                                    color: 'foreground',
                                })}
                            >
                                Benutzer-Übersicht
                            </h3>
                            <div
                                className={css({
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: '2',
                                })}
                            >
                                {[
                                    {
                                        label: 'Gesamt',
                                        count: roleStats.total,
                                        color: '#0984e3',
                                    },
                                    {
                                        label: 'Benutzer',
                                        count: roleStats.users,
                                        color: '#636e72',
                                    },
                                    {
                                        label: 'Moderatoren',
                                        count: roleStats.moderators,
                                        color: '#a855f7',
                                    },
                                    {
                                        label: 'Admins',
                                        count: roleStats.admins,
                                        color: '#0984e3',
                                    },
                                ].map((stat) => (
                                    <div
                                        key={stat.label}
                                        className={css({
                                            padding: '3',
                                            borderRadius: 'xl',
                                            background: 'surface',
                                            border: '1px solid',
                                            borderColor: 'border.muted',
                                            textAlign: 'center',
                                        })}
                                    >
                                        <p
                                            className={css({
                                                fontSize: '2xl',
                                                fontWeight: '700',
                                                fontFamily: 'mono',
                                            })}
                                            style={{ color: stat.color }}
                                        >
                                            {stat.count}
                                        </p>
                                        <p
                                            className={css({
                                                fontSize: 'xs',
                                                color: 'foreground.muted',
                                                marginTop: '0.5',
                                            })}
                                        >
                                            {stat.label}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Recent messages */}
                        <section
                            className={css({
                                borderRadius: '2xl',
                                borderWidth: '1px',
                                borderColor: 'border.muted',
                                background: 'surface.elevated',
                                padding: '4',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '3',
                            })}
                        >
                            <div
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2',
                                })}
                            >
                                <Clock size={14} className={css({ color: 'foreground.muted' })} />
                                <h3
                                    className={css({
                                        fontSize: 'sm',
                                        fontWeight: '600',
                                        color: 'foreground',
                                    })}
                                >
                                    Letzte Nachrichten
                                </h3>
                            </div>

                            {recentMessages.length === 0 ? (
                                <p
                                    className={css({
                                        fontSize: 'sm',
                                        color: 'foreground.muted',
                                        textAlign: 'center',
                                        paddingY: '4',
                                    })}
                                >
                                    Noch keine Nachrichten gesendet.
                                </p>
                            ) : (
                                <div
                                    className={css({
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1',
                                    })}
                                >
                                    {recentMessages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={css({
                                                padding: '3',
                                                borderRadius: 'lg',
                                                background: 'surface',
                                                border: '1px solid',
                                                borderColor: 'border.muted',
                                            })}
                                        >
                                            <div
                                                className={css({
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    gap: '2',
                                                })}
                                            >
                                                <p
                                                    className={css({
                                                        fontSize: 'sm',
                                                        fontWeight: '600',
                                                        color: 'foreground',
                                                        lineClamp: '1',
                                                    })}
                                                >
                                                    {msg.title}
                                                </p>
                                                <span
                                                    className={css({
                                                        fontSize: 'xs',
                                                        color: 'foreground.muted',
                                                        whiteSpace: 'nowrap',
                                                        flexShrink: 0,
                                                    })}
                                                >
                                                    {timeAgo(msg.createdAt)}
                                                </span>
                                            </div>
                                            <div
                                                className={css({
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '1.5',
                                                    marginTop: '1',
                                                })}
                                            >
                                                <MessageSquare
                                                    size={12}
                                                    className={css({
                                                        color: 'foreground.muted',
                                                        flexShrink: 0,
                                                    })}
                                                />
                                                <span
                                                    className={css({
                                                        fontSize: 'xs',
                                                        color: 'foreground.muted',
                                                    })}
                                                >
                                                    an {msg.recipientName}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </PageShell>
    );
}
