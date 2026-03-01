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
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '6' })}>
                <section
                    className={css({
                        borderRadius: '2xl',
                        borderWidth: '1px',
                        borderColor: 'border.muted',
                        background: 'surface',
                        padding: { base: '4', md: '6' },
                        display: 'flex',
                        flexDirection: { base: 'column', md: 'row' },
                        gap: '4',
                    })}
                >
                    <div>
                        <p
                            className={css({
                                fontSize: 'xs',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5em',
                                color: 'foreground.muted',
                                marginBottom: '2',
                            })}
                        >
                            Admin Center
                        </p>
                        <h1
                            className={css({
                                fontSize: { base: '3xl', md: '4xl' },
                                fontWeight: 'semibold',
                                color: 'foreground',
                            })}
                        >
                            Willkommen zurück, {greetingName}
                        </h1>
                        <p
                            className={css({
                                maxWidth: '3xl',
                                color: 'foreground.muted',
                                marginTop: '2',
                            })}
                        >
                            Überwache kritische Prozesse, schaue dir die letzten Fehler an und
                            schalte zwischen Scheduler- und Systemansichten.
                        </p>
                        <div
                            className={css({
                                marginTop: '3',
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
                                    borderColor: 'border',
                                    paddingX: '4',
                                    paddingY: '2',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.3em',
                                    fontSize: 'xs',
                                    fontWeight: 'semibold',
                                    color: 'foreground',
                                    background: 'surface.elevated',
                                    textDecoration: 'none',
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
                                    borderColor: 'border.muted',
                                    paddingX: '4',
                                    paddingY: '2',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.3em',
                                    fontSize: 'xs',
                                    fontWeight: 'semibold',
                                    color: 'foreground.muted',
                                    textDecoration: 'none',
                                })}
                            >
                                <Clock3 size={14} />
                                <span>Geplante Jobs</span>
                            </Link>
                        </div>
                    </div>
                    <div className={css({ marginLeft: { md: 'auto' } })}>
                        <p
                            className={css({
                                fontSize: 'xs',
                                textTransform: 'uppercase',
                                letterSpacing: '0.4em',
                                color: 'foreground.muted',
                            })}
                        >
                            Fehlerrate
                        </p>
                        <p
                            className={css({
                                fontSize: '3xl',
                                fontWeight: 'semibold',
                                color: 'foreground',
                            })}
                        >
                            {statusCounts.FAILED ?? 0}
                        </p>
                        <p className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                            der letzten 12 Jobläufe
                        </p>
                    </div>
                </section>

                <section
                    className={css({
                        display: 'grid',
                        gap: '3',
                        gridTemplateColumns: {
                            base: 'repeat(2, minmax(0, 1fr))',
                            sm: 'repeat(3, minmax(0, 1fr))',
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
                                    borderRadius: '2xl',
                                    borderWidth: '1px',
                                    borderColor: 'border.muted',
                                    background: 'surface.elevated',
                                    padding: '4',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1',
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
                                    {details.label}
                                </p>
                                <p
                                    className={css({
                                        fontSize: '2xl',
                                        fontWeight: 'semibold',
                                        color: 'foreground',
                                    })}
                                >
                                    {statusCounts[status] ?? 0}
                                </p>
                                <div
                                    className={css({
                                        height: '1',
                                        borderRadius: 'full',
                                        background: 'border.muted',
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
                            justifyContent: 'space-between',
                        })}
                    >
                        <div>
                            <p
                                className={css({
                                    fontSize: 'xs',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.4em',
                                    color: 'foreground.muted',
                                })}
                            >
                                Schnellzugriff
                            </p>
                            <h2
                                className={css({
                                    fontSize: 'lg',
                                    fontWeight: 'semibold',
                                    color: 'foreground',
                                })}
                            >
                                Schnelle Aktionen
                            </h2>
                        </div>
                        <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                            Alle Links öffnen neue Steueransichten
                        </span>
                    </div>
                    <div
                        className={css({
                            display: 'grid',
                            gap: '3',
                            gridTemplateColumns: { base: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                        })}
                    >
                        {ADMIN_ACTIONS.map((action) => (
                            <Link
                                key={action.label}
                                href={action.href}
                                className={css({
                                    borderRadius: '2xl',
                                    borderWidth: '1px',
                                    borderColor: 'border.muted',
                                    background: 'surface',
                                    padding: '4',
                                    textDecoration: 'none',
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
                                        padding: '2',
                                        background: 'surface.elevated',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    })}
                                >
                                    <action.icon size={18} />
                                </div>
                                <div>
                                    <p
                                        className={css({
                                            fontSize: 'sm',
                                            fontWeight: 'semibold',
                                            color: 'foreground',
                                        })}
                                    >
                                        {action.label}
                                    </p>
                                    <p
                                        className={css({
                                            fontSize: 'xs',
                                            color: 'foreground.muted',
                                        })}
                                    >
                                        {action.description}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
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
                        gap: '3',
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
                                    color: 'foreground.muted',
                                })}
                            >
                                Letzte Fehler
                            </p>
                            <h2
                                className={css({
                                    fontSize: 'lg',
                                    fontWeight: 'semibold',
                                    color: 'foreground',
                                })}
                            >
                                Problematische Jobs
                            </h2>
                        </div>
                        <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                            {recentFailures.length} Einträge
                        </span>
                    </div>
                    {recentFailures.length === 0 ? (
                        <p className={css({ color: 'foreground.muted' })}>
                            Keine Fehler in diesem Zeitraum.
                        </p>
                    ) : (
                        <div
                            className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}
                        >
                            {recentFailures.map((run) => (
                                <div
                                    key={run.id}
                                    className={css({
                                        borderRadius: 'xl',
                                        borderWidth: '1px',
                                        borderColor: 'border',
                                        background: 'surface',
                                        padding: '3',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1',
                                    })}
                                >
                                    <div
                                        className={css({
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            gap: '2',
                                            flexWrap: 'wrap',
                                        })}
                                    >
                                        <p
                                            className={css({
                                                fontSize: 'sm',
                                                fontWeight: 'semibold',
                                                color: 'foreground',
                                            })}
                                        >
                                            {run.jobName}
                                        </p>
                                        <span
                                            className={css({
                                                fontSize: 'xs',
                                                color: 'foreground.muted',
                                            })}
                                        >
                                            {getQueueLabel(run.queueName)} ·{' '}
                                            {formatDate(run.createdAt)}
                                        </span>
                                    </div>
                                    <p
                                        className={css({
                                            fontSize: 'sm',
                                            color: 'foreground.muted',
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
