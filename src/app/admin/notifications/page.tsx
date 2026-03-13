import { Bell, MessageSquare } from 'lucide-react';

import { PageShell } from '@app/components/layouts/PageShell';
import { ensureAdminSession } from '@app/lib/admin/ensure-admin';
import { css } from 'styled-system/css';

import { getUsersForSelect } from './actions';
import { SendMessageForm } from './send-message-form';

export const dynamic = 'force-dynamic';

export default async function AdminNotificationsPage() {
    await ensureAdminSession('admin-notifications');
    const users = await getUsersForSelect();

    return (
        <PageShell>
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '6' })}>
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
                        SYSTEM-Nachrichten
                    </h1>
                    <p
                        className={css({
                            marginTop: '2',
                            color: 'foreground.muted',
                        })}
                    >
                        Sende Test-Nachrichten und Toasts an Benutzer. Ideal für das Testen des
                        Toast-Systems (KUC-67).
                    </p>
                </header>

                <div
                    className={css({
                        display: 'grid',
                        gap: '4',
                        gridTemplateColumns: { base: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
                    })}
                >
                    <section
                        className={css({
                            borderRadius: '2xl',
                            borderWidth: '1px',
                            borderColor: 'border.muted',
                            background: 'surface.elevated',
                            padding: '4',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4',
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
                                <MessageSquare size={20} />
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
                                    SYSTEM-Nachricht an einen Benutzer
                                </p>
                            </div>
                        </div>

                        <SendMessageForm users={users} />
                    </section>

                    <section
                        className={css({
                            borderRadius: '2xl',
                            borderWidth: '1px',
                            borderColor: 'border.muted',
                            background: 'surface.elevated',
                            padding: '4',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4',
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
                                <Bell size={20} />
                            </div>
                            <div>
                                <h2
                                    className={css({
                                        fontSize: 'lg',
                                        fontWeight: 'semibold',
                                        color: 'foreground',
                                    })}
                                >
                                    Toast-Test
                                </h2>
                                <p
                                    className={css({
                                        fontSize: 'sm',
                                        color: 'foreground.muted',
                                    })}
                                >
                                    Echtzeit-Toast-Benachrichtigung
                                </p>
                            </div>
                        </div>

                        <div
                            className={css({
                                padding: '4',
                                borderRadius: 'xl',
                                background: 'surface',
                                border: '1px solid',
                                borderColor: 'border.muted',
                            })}
                        >
                            <h3
                                className={css({
                                    fontSize: 'sm',
                                    fontWeight: '600',
                                    color: 'foreground',
                                    marginBottom: '2',
                                })}
                            >
                                Was passiert beim Senden?
                            </h3>
                            <ul
                                className={css({
                                    fontSize: 'sm',
                                    color: 'foreground.muted',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1.5',
                                    paddingLeft: '4',
                                })}
                            >
                                <li>
                                    Eine SYSTEM-Nachricht wird in der Datenbank erstellt und
                                    erscheint im Benachrichtigungs-Panel des Nutzers
                                </li>
                                <li>
                                    Wenn "Auch als Toast anzeigen" aktiviert ist, wird ein
                                    Echtzeit-Toast über SSE an den Benutzer gesendet
                                </li>
                                <li>
                                    Der Toast erscheint als animierte Bubble nahe dem
                                    Benachrichtigungs-Bell im Header
                                </li>
                                <li>
                                    Der Toast verschwindet automatisch nach 8 Sekunden (oder per
                                    Swipe/X-Button)
                                </li>
                            </ul>
                        </div>

                        <div
                            className={css({
                                padding: '4',
                                borderRadius: 'xl',
                                background: 'rgba(0,184,148,0.06)',
                                border: '1px solid',
                                borderColor: 'rgba(0,184,148,0.15)',
                            })}
                        >
                            <h3
                                className={css({
                                    fontSize: 'sm',
                                    fontWeight: '600',
                                    color: 'foreground',
                                    marginBottom: '2',
                                })}
                            >
                                Verwendung im Code
                            </h3>
                            <pre
                                className={css({
                                    fontSize: 'xs',
                                    fontFamily: 'monospace',
                                    color: 'foreground.muted',
                                    overflow: 'auto',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                })}
                            >{`// Server-Action
import { publishToast } from '@app/lib/realtime/toastEvents';

await publishToast(userId, {
  type: 'success',
  title: '🏆 Trophy Earned!',
  message: 'Tutorial Graduate',
  duration: 8000,
  action: { label: 'View Profile', href: '/profile' }
});`}</pre>
                        </div>
                    </section>
                </div>

                <section
                    className={css({
                        borderRadius: '2xl',
                        borderWidth: '1px',
                        borderColor: 'border.muted',
                        background: 'surface.elevated',
                        padding: '4',
                    })}
                >
                    <h2
                        className={css({
                            fontSize: 'lg',
                            fontWeight: 'semibold',
                            color: 'foreground',
                            marginBottom: '3',
                        })}
                    >
                        Verfügbare Toast-Typen
                    </h2>
                    <div
                        className={css({
                            display: 'grid',
                            gap: '3',
                            gridTemplateColumns: {
                                base: '1fr',
                                sm: 'repeat(2, 1fr)',
                                md: 'repeat(4, 1fr)',
                            },
                        })}
                    >
                        {[
                            {
                                type: 'success',
                                label: 'Erfolg',
                                color: '#00b894',
                                desc: 'Positive Rückmeldungen',
                            },
                            {
                                type: 'info',
                                label: 'Info',
                                color: '#0984e3',
                                desc: 'Neutrale Informationen',
                            },
                            {
                                type: 'warning',
                                label: 'Warnung',
                                color: '#f8b500',
                                desc: 'Achtung erforderlich',
                            },
                            {
                                type: 'error',
                                label: 'Fehler',
                                color: '#e05353',
                                desc: 'Kritische Meldungen',
                            },
                        ].map((t) => (
                            <div
                                key={t.type}
                                className={css({
                                    padding: '3',
                                    borderRadius: 'xl',
                                    background: 'surface',
                                    border: '1px solid',
                                    borderColor: 'border.muted',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3',
                                })}
                            >
                                <div
                                    className={css({
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: 'full',
                                    })}
                                    style={{ background: t.color }}
                                />
                                <div>
                                    <p
                                        className={css({
                                            fontSize: 'sm',
                                            fontWeight: '600',
                                            color: 'foreground',
                                        })}
                                    >
                                        {t.label}
                                    </p>
                                    <p
                                        className={css({
                                            fontSize: 'xs',
                                            color: 'foreground.muted',
                                        })}
                                    >
                                        {t.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </PageShell>
    );
}
