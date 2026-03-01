import { Activity, Clock3, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';

import { PageShell } from '@/components/layouts/PageShell';
import { ensureAdminSession } from '@/lib/admin/ensure-admin';
import { getJobRuns, type JobRun, type JobStatus } from '@/lib/queues/job-run';
import { JOB_STATUS_DETAILS, STATUS_ORDER, getQueueLabel } from '@/lib/queues/job-run-ui';
import { css } from 'styled-system/css';

const ADMIN_ACTIONS = [
    {
        label: 'Worker Dashboard',
        description: 'Jobläufe, Zustände und Timeouts im Blick behalten.',
        href: '/admin/worker',
        icon: Activity,
    },
    {
        label: 'Geplante Jobs',
        description: 'Cron-Wiederholungen und Scheduler-Insights.',
        href: '/admin/worker?queue=scheduled',
        icon: Clock3,
    },
    {
        label: 'Benutzerkonten',
        description: 'Aktive Admins und Benutzer verwalten.',
        href: '/profile/manage',
        icon: Users,
    },
];

function formatDate(date: Date | null) {
    if (!date) return '-';
    return date.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function buildStatusCounts(runs: JobRun[]) {
    return STATUS_ORDER.reduce(
        (acc, status) => ({
            ...acc,
            [status]: runs.filter((run) => run.status === status).length,
        }),
        {} as Record<JobStatus, number>,
    );
}

export const dynamic = 'force-dynamic';

export default async function AdminHomePage() {
    const session = await ensureAdminSession('admin-home');
    const jobRuns = await getJobRuns({ limit: 12 });
    const statusCounts = buildStatusCounts(jobRuns);
    const recentFailures = jobRuns.filter((run) => run.status === 'FAILED').slice(0, 4);

    const greetingName = session.user.name ?? 'Admin';

    return (
        <PageShell>
            <div
                className={css({
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10',
                    width: '100%',
                })}
            >
                <section
                    className={css({
                        borderRadius: '2.5rem',
                        borderWidth: '1px',
                        borderColor: 'rgba(255,255,255,0.1)',
                        background:
                            'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.75) 50%, rgba(15,23,42,0.6) 100%)',
                        padding: '8',
                        boxShadow: '0 25px 80px rgba(15,23,42,0.55)',
                    })}
                >
                    <div
                        className={css({
                            display: 'flex',
                            flexDirection: { base: 'column', lg: 'row' },
                            gap: '6',
                            justifyContent: 'space-between',
                            alignItems: { lg: 'center' },
                        })}
                    >
                        <div>
                            <p
                                className={css({
                                    fontSize: 'xs',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.6em',
                                    color: '#94a3b8',
                                })}
                            >
                                Admin Center
                            </p>
                            <h1
                                className={css({
                                    marginTop: '2',
                                    fontSize: '4xl',
                                    fontWeight: 'semibold',
                                    color: 'white',
                                })}
                            >
                                Willkommen zurück, {greetingName}
                            </h1>
                            <p
                                className={css({
                                    marginTop: '3',
                                    maxWidth: '3xl',
                                    fontSize: 'sm',
                                    color: '#cbd5f5',
                                })}
                            >
                                Überwache kritische Prozesse, schaue dir die letzten Fehler an und
                                schalte zwischen Scheduler- und Systemansichten.
                            </p>
                            <div
                                className={css({
                                    marginTop: '5',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '3',
                                })}
                            >
                                <Link
                                    href="/admin/worker"
                                    className={css({
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '2',
                                        borderRadius: 'full',
                                        borderWidth: '1px',
                                        borderColor: 'rgba(255,255,255,0.2)',
                                        background: 'rgba(255,255,255,0.1)',
                                        px: '4',
                                        py: '2',
                                        fontSize: 'xs',
                                        fontWeight: 'semibold',
                                        letterSpacing: '0.3em',
                                        textTransform: 'uppercase',
                                        color: 'white',
                                        textDecoration: 'none',
                                        transition: 'border-color 200ms ease',
                                        _hover: {
                                            borderColor: 'rgba(255,255,255,0.4)',
                                        },
                                    })}
                                >
                                    <ShieldCheck size={14} />
                                    <span>Worker Dashboard</span>
                                </Link>
                                <Link
                                    href="/admin/worker?queue=scheduled"
                                    className={css({
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '2',
                                        borderRadius: 'full',
                                        borderWidth: '1px',
                                        borderColor: 'rgba(71,85,105,0.8)',
                                        background: 'rgba(15,23,42,0.4)',
                                        px: '4',
                                        py: '2',
                                        fontSize: 'xs',
                                        fontWeight: 'semibold',
                                        letterSpacing: '0.3em',
                                        textTransform: 'uppercase',
                                        color: '#cbd5f5',
                                        textDecoration: 'none',
                                        transition: 'border-color 200ms ease',
                                        _hover: {
                                            borderColor: 'rgba(148,163,184,0.7)',
                                        },
                                    })}
                                >
                                    <Clock3 size={14} />
                                    <span>Geplante Jobs</span>
                                </Link>
                            </div>
                        </div>
                        <div
                            className={css({
                                borderRadius: '3xl',
                                borderWidth: '1px',
                                borderColor: 'rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.05)',
                                padding: '6',
                                textAlign: 'right',
                            })}
                        >
                            <p
                                className={css({
                                    fontSize: 'xs',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5em',
                                    color: '#94a3b8',
                                })}
                            >
                                Fehlerrate
                            </p>
                            <p
                                className={css({
                                    fontSize: '3xl',
                                    fontWeight: 'semibold',
                                    color: 'white',
                                })}
                            >
                                {statusCounts.FAILED ?? 0}
                            </p>
                            <p className={css({ fontSize: 'xs', color: '#94a3b8' })}>
                                der letzten 12 Jobläufe
                            </p>
                        </div>
                    </div>
                </section>

                <section
                    className={css({
                        display: 'grid',
                        gap: '4',
                        gridTemplateColumns: {
                            base: '1fr',
                            sm: 'repeat(2, minmax(0, 1fr))',
                            lg: 'repeat(4, minmax(0, 1fr))',
                        },
                    })}
                >
                    {STATUS_ORDER.map((status) => {
                        const details = JOB_STATUS_DETAILS[status];
                        return (
                            <div
                                key={status}
                                className={css({
                                    borderRadius: '3xl',
                                    borderWidth: '1px',
                                    borderColor: 'rgba(255,255,255,0.05)',
                                    background: 'rgba(255,255,255,0.05)',
                                    padding: '5',
                                    boxShadow: '0 25px 60px rgba(15,23,42,0.25)',
                                    backdropFilter: 'blur(16px)',
                                })}
                            >
                                <p
                                    className={css({
                                        fontSize: 'xs',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.4em',
                                        color: '#94a3b8',
                                    })}
                                >
                                    {details.label}
                                </p>
                                <p
                                    className={css({
                                        marginTop: '3',
                                        fontSize: '3xl',
                                        fontWeight: 'semibold',
                                        color: 'white',
                                    })}
                                >
                                    {statusCounts[status] ?? 0}
                                </p>
                                <div
                                    className={css({
                                        marginTop: '3',
                                        height: '1.5',
                                        borderRadius: 'full',
                                        background: 'rgba(255,255,255,0.1)',
                                    })}
                                >
                                    <div
                                        className={css({ height: '100%', borderRadius: 'full' })}
                                        style={{ backgroundColor: details.color, width: '100%' }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </section>

                <section
                    className={css({
                        borderRadius: '3xl',
                        borderWidth: '1px',
                        borderColor: 'rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '6',
                        boxShadow: '0 30px 80px rgba(15,23,42,0.35)',
                    })}
                >
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        })}
                    >
                        <div>
                            <p
                                className={css({
                                    fontSize: 'xs',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.4em',
                                    color: '#94a3b8',
                                })}
                            >
                                Schnellzugriff
                            </p>
                            <h2
                                className={css({
                                    fontSize: '2xl',
                                    fontWeight: 'semibold',
                                    color: 'white',
                                })}
                            >
                                Schnelle Aktionen
                            </h2>
                        </div>
                        <span className={css({ fontSize: 'xs', color: '#94a3b8' })}>
                            Alle Links öffnen neue Steueransichten
                        </span>
                    </div>
                    <div
                        className={css({
                            marginTop: '6',
                            display: 'grid',
                            gap: '4',
                            gridTemplateColumns: {
                                base: '1fr',
                                md: 'repeat(3, minmax(0, 1fr))',
                            },
                        })}
                    >
                        {ADMIN_ACTIONS.map((action) => (
                            <Link
                                key={action.label}
                                href={action.href}
                                className={css({
                                    borderRadius: '3xl',
                                    borderWidth: '1px',
                                    borderColor: 'rgba(255,255,255,0.1)',
                                    background: 'rgba(15,23,42,0.5)',
                                    padding: '4',
                                    textDecoration: 'none',
                                    transition: 'border-color 200ms ease',
                                    _hover: {
                                        borderColor: 'rgba(255,255,255,0.3)',
                                    },
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
                                            borderRadius: '2xl',
                                            borderWidth: '1px',
                                            borderColor: 'rgba(255,255,255,0.1)',
                                            background: 'rgba(255,255,255,0.05)',
                                            padding: '3',
                                            color: '#e2e8f0',
                                        })}
                                    >
                                        <action.icon className={css({ fontSize: 'lg' })} />
                                    </div>
                                    <div>
                                        <p
                                            className={css({
                                                fontSize: 'sm',
                                                fontWeight: 'semibold',
                                                color: 'white',
                                            })}
                                        >
                                            {action.label}
                                        </p>
                                        <p className={css({ fontSize: 'xs', color: '#94a3b8' })}>
                                            {action.description}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                <section
                    className={css({
                        borderRadius: '3xl',
                        borderWidth: '1px',
                        borderColor: 'rgba(255,255,255,0.1)',
                        background: 'rgba(15,23,42,0.6)',
                        padding: '6',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                    })}
                >
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        })}
                    >
                        <div>
                            <p
                                className={css({
                                    fontSize: 'xs',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.4em',
                                    color: '#94a3b8',
                                })}
                            >
                                Letzte Fehler
                            </p>
                            <h2
                                className={css({
                                    fontSize: '2xl',
                                    fontWeight: 'semibold',
                                    color: 'white',
                                })}
                            >
                                Problematische Jobs
                            </h2>
                        </div>
                        <span className={css({ fontSize: 'xs', color: '#6b7280' })}>
                            {recentFailures.length} Einträge
                        </span>
                    </div>
                    {recentFailures.length === 0 ? (
                        <p className={css({ marginTop: '4', fontSize: 'sm', color: '#94a3b8' })}>
                            Keine Fehler in diesem Zeitraum.
                        </p>
                    ) : (
                        <div
                            className={css({
                                marginTop: '4',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '3',
                            })}
                        >
                            {recentFailures.map((run) => (
                                <div
                                    key={run.id}
                                    className={css({
                                        borderRadius: '2xl',
                                        borderWidth: '1px',
                                        borderColor: 'rgba(255,255,255,0.05)',
                                        background: 'rgba(255,255,255,0.05)',
                                        padding: '4',
                                    })}
                                >
                                    <div
                                        className={css({
                                            display: 'flex',
                                            flexDirection: { base: 'column', md: 'row' },
                                            gap: '1',
                                            alignItems: { md: 'center' },
                                            justifyContent: { md: 'space-between' },
                                        })}
                                    >
                                        <p
                                            className={css({
                                                fontSize: 'sm',
                                                fontWeight: 'semibold',
                                                color: 'white',
                                            })}
                                        >
                                            {run.jobName}
                                        </p>
                                        <span
                                            className={css({
                                                fontSize: 'xs',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.3em',
                                                color: '#fca5a5',
                                            })}
                                        >
                                            {getQueueLabel(run.queueName)} ·{' '}
                                            {formatDate(run.createdAt)}
                                        </span>
                                    </div>
                                    <p
                                        className={css({
                                            marginTop: '2',
                                            fontSize: 'sm',
                                            color: '#cbd5f5',
                                        })}
                                    >
                                        {run.errorMessage ?? 'Keine Fehlermeldung verfügbar.'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </PageShell>
    );
}
