import { PageShell } from '@/components/layouts/PageShell';
import { ensureAdminSession } from '@/lib/admin/ensure-admin';
import { getQueueSnapshots } from '@/lib/queues/insights';
import { getJobRuns, type JobRun, type JobStatus } from '@/lib/queues/job-run';
import { getQueueLabel, JOB_STATUS_DETAILS, STATUS_ORDER } from '@/lib/queues/job-run-ui';
import { getScheduledJobDefinitions } from '@/lib/queues/scheduler';
import { QueueName } from '@/lib/queues/types';
import { getWorkerDefinitions } from '@/lib/queues/worker';
import { css } from 'styled-system/css';

import { triggerJobAction } from './actions';

export const dynamic = 'force-dynamic';

async function getJobRunsData(): Promise<JobRun[]> {
    await ensureAdminSession('admin-worker-dashboard');

    return getJobRuns({ limit: 50 });
}

function formatDuration(start: Date | null, end: Date | null): string {
    if (!start || !end) return '-';
    const diff = end.getTime() - start.getTime();
    if (diff < 1000) return `${diff}ms`;
    if (diff < 60000) return `${(diff / 1000).toFixed(1)}s`;
    return `${(diff / 60000).toFixed(1)}m`;
}

function formatTime(date: Date | null): string {
    if (!date) return '-';
    return date.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

function calculateAverageDuration(runs: JobRun[]): string {
    const durations = runs
        .filter((run) => run.startedAt && run.completedAt)
        .map((run) => run.completedAt!.getTime() - run.startedAt!.getTime());

    if (durations.length === 0) {
        return '-';
    }

    const average = durations.reduce((sum, value) => sum + value, 0) / durations.length;
    if (average < 1000) return `${Math.round(average)}ms`;
    if (average < 60000) return `${(average / 1000).toFixed(1)}s`;
    return `${(average / 60000).toFixed(1)}m`;
}

type JobCatalogItem = {
    id: string;
    jobName: string;
    queue: QueueName;
    type: 'worker' | 'scheduled';
    defaultPayload: Record<string, unknown>;
    meta: {
        concurrency?: number;
        repeatPattern?: string;
    };
};

function stringifyPayload(payload: Record<string, unknown>): string {
    if (!payload || Object.keys(payload).length === 0) {
        return '{}';
    }
    return JSON.stringify(payload, null, 2);
}

export default async function WorkerDashboardPage() {
    const [jobRuns, queueSnapshots] = await Promise.all([getJobRunsData(), getQueueSnapshots()]);
    const totalJobs = jobRuns.length;

    const statusCounts = STATUS_ORDER.reduce(
        (acc, status) => ({
            ...acc,
            [status]: 0,
        }),
        {} as Record<JobStatus, number>,
    );

    jobRuns.forEach((run) => {
        statusCounts[run.status] = (statusCounts[run.status] ?? 0) + 1;
    });

    const completedRate =
        totalJobs > 0 ? Math.round((statusCounts.COMPLETED / totalJobs) * 100) : 0;
    const averageDuration = calculateAverageDuration(jobRuns);

    const queueCounts = jobRuns.reduce<Record<string, number>>((acc, run) => {
        acc[run.queueName] = (acc[run.queueName] ?? 0) + 1;
        return acc;
    }, {});

    const queueHighlights = Object.entries(queueCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

    const workerDefinitions = getWorkerDefinitions();
    const scheduledDefinitions = getScheduledJobDefinitions();

    const jobCatalog: JobCatalogItem[] = [
        ...workerDefinitions.map((worker) => ({
            id: `worker-${worker.name}`,
            jobName: worker.name,
            queue: worker.queue,
            type: 'worker' as const,
            defaultPayload: {},
            meta: {
                concurrency: worker.concurrency,
            },
        })),
        ...scheduledDefinitions.map((job) => ({
            id: `scheduled-${job.name}`,
            jobName: job.name,
            queue: job.queue,
            type: 'scheduled' as const,
            defaultPayload: job.data,
            meta: {
                repeatPattern: job.options?.repeat?.pattern,
            },
        })),
    ].sort((a, b) => a.jobName.localeCompare(b.jobName));

    const bestPracticeLinks = [
        {
            label: 'Bull Board Monitoring Guide',
            href: 'https://oneuptime.com/blog/post/2026-01-21-bullmq-bull-board/view',
        },
        {
            label: 'Worker Health Checks Checklist',
            href: 'https://oneuptime.com/blog/post/2026-01-21-bullmq-worker-health-checks/view',
        },
        {
            label: 'bullmq-dash (Open Source Dashboard)',
            href: 'https://github.com/quanghuynt14/bullmq-dash',
        },
    ];

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
                        display: 'flex',
                        flexDirection: { base: 'column', md: 'row' },
                        gap: '3',
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
                            Admin · Worker
                        </p>
                        <h1
                            className={css({
                                fontSize: '3xl',
                                fontWeight: 'semibold',
                                color: 'foreground',
                            })}
                        >
                            Worker Dashboard
                        </h1>
                        <p
                            className={css({
                                marginTop: '1',
                                fontSize: 'sm',
                                color: 'foreground.muted',
                            })}
                        >
                            Aktuelle Jobläufe, Engpässe und Ausfälle im Blick behalten.
                        </p>
                    </div>
                    <div
                        className={css({
                            marginLeft: { md: 'auto' },
                            borderRadius: 'xl',
                            borderWidth: '1px',
                            borderColor: 'border.muted',
                            paddingX: '5',
                            paddingY: '3',
                            background: 'surface.elevated',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: '1',
                        })}
                    >
                        <span
                            className={css({
                                fontSize: '0.65rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.4em',
                                color: 'foreground.muted',
                            })}
                        >
                            Erfolgsquote
                        </span>
                        <strong
                            className={css({
                                fontSize: '2.5rem',
                                fontWeight: 'semibold',
                                color: 'foreground',
                            })}
                        >
                            {completedRate}%
                        </strong>
                        <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                            von {totalJobs} letzten Jobs
                        </span>
                    </div>
                </header>

                <section
                    className={css({
                        display: 'grid',
                        gap: '3',
                        gridTemplateColumns: {
                            base: 'repeat(2, minmax(0, 1fr))',
                            md: 'repeat(4, minmax(0, 1fr))',
                        },
                    })}
                >
                    {STATUS_ORDER.map((status) => {
                        const details = JOB_STATUS_DETAILS[status];
                        const percent =
                            totalJobs > 0
                                ? Math.round((statusCounts[status] / totalJobs) * 100)
                                : 0;

                        return (
                            <div
                                key={status}
                                className={css({
                                    borderRadius: 'xl',
                                    borderWidth: '1px',
                                    borderColor: 'border.muted',
                                    background: 'surface.elevated',
                                    padding: '3',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1',
                                })}
                            >
                                <p
                                    className={css({
                                        fontSize: 'xs',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.3em',
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
                                    {statusCounts[status]}
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
                                        style={{
                                            width: `${percent}%`,
                                            background: details.color,
                                        }}
                                    />
                                </div>
                                <span
                                    className={css({ fontSize: 'xs', color: 'foreground.muted' })}
                                >
                                    {percent}% der Liste
                                </span>
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
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '2',
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
                                Warteschlangen
                            </p>
                            <h2
                                className={css({
                                    fontSize: 'lg',
                                    fontWeight: 'semibold',
                                    color: 'foreground',
                                })}
                            >
                                Queue Highlights
                            </h2>
                        </div>
                        <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                            {queueHighlights.length} aktive Queues
                        </span>
                    </div>
                    <div
                        className={css({
                            display: 'grid',
                            gap: '3',
                            gridTemplateColumns: { base: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
                        })}
                    >
                        {queueHighlights.map(([queue, count]) => (
                            <div
                                key={queue}
                                className={css({
                                    borderRadius: 'xl',
                                    borderWidth: '1px',
                                    borderColor: 'border.muted',
                                    background: 'surface',
                                    paddingX: '4',
                                    paddingY: '3',
                                })}
                            >
                                <p
                                    className={css({
                                        fontSize: 'sm',
                                        fontWeight: 'semibold',
                                        color: 'foreground',
                                    })}
                                >
                                    {getQueueLabel(queue)}
                                </p>
                                <p
                                    className={css({
                                        fontSize: '2xl',
                                        fontWeight: 'bold',
                                        color: 'foreground.muted',
                                    })}
                                >
                                    {count}
                                </p>
                                <p className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                                    Letzte 50 Jobs
                                </p>
                            </div>
                        ))}
                        {queueHighlights.length === 0 && (
                            <p className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                                Keine aktiven Queues sichtbar.
                            </p>
                        )}
                    </div>
                    <p className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                        Durchschnittliche Laufzeit:{' '}
                        <span className={css({ color: 'foreground' })}>{averageDuration}</span>
                    </p>
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
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '2',
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
                                Zustand
                            </p>
                            <h2
                                className={css({
                                    fontSize: 'lg',
                                    fontWeight: 'semibold',
                                    color: 'foreground',
                                })}
                            >
                                Queue Gesundheit
                            </h2>
                        </div>
                        <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                            Echtzeit-Schnappschuss via Redis
                        </span>
                    </div>
                    <div
                        className={css({
                            display: 'grid',
                            gap: '3',
                            gridTemplateColumns: { base: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                        })}
                    >
                        {queueSnapshots.map((snapshot) => (
                            <div
                                key={snapshot.queue}
                                className={css({
                                    borderRadius: 'xl',
                                    borderWidth: '1px',
                                    borderColor: 'border.muted',
                                    background: 'surface',
                                    padding: '4',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2',
                                })}
                            >
                                <div
                                    className={css({
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '2',
                                    })}
                                >
                                    <p
                                        className={css({
                                            fontWeight: 'semibold',
                                            color: 'foreground',
                                        })}
                                    >
                                        {getQueueLabel(snapshot.queue)}
                                    </p>
                                    <span
                                        className={css({
                                            borderRadius: 'full',
                                            px: '3',
                                            py: '1',
                                            fontSize: 'xs',
                                            fontWeight: 'semibold',
                                            color: 'white',
                                        })}
                                        style={{
                                            backgroundColor: snapshot.healthy
                                                ? '#16a34a'
                                                : '#dc2626',
                                        }}
                                    >
                                        {snapshot.healthy ? 'Healthy' : 'Degraded'}
                                    </span>
                                </div>
                                <div
                                    className={css({
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                        gap: '2',
                                        fontSize: 'sm',
                                    })}
                                >
                                    <div>
                                        <p
                                            className={css({
                                                color: 'foreground.muted',
                                                fontSize: 'xs',
                                            })}
                                        >
                                            Waiting
                                        </p>
                                        <p
                                            className={css({
                                                fontWeight: 'semibold',
                                                color: 'foreground',
                                            })}
                                        >
                                            {snapshot.counts.waiting}
                                        </p>
                                    </div>
                                    <div>
                                        <p
                                            className={css({
                                                color: 'foreground.muted',
                                                fontSize: 'xs',
                                            })}
                                        >
                                            Active
                                        </p>
                                        <p
                                            className={css({
                                                fontWeight: 'semibold',
                                                color: 'foreground',
                                            })}
                                        >
                                            {snapshot.counts.active}
                                        </p>
                                    </div>
                                    <div>
                                        <p
                                            className={css({
                                                color: 'foreground.muted',
                                                fontSize: 'xs',
                                            })}
                                        >
                                            Failed
                                        </p>
                                        <p
                                            className={css({
                                                fontWeight: 'semibold',
                                                color: 'foreground',
                                            })}
                                        >
                                            {snapshot.counts.failed}
                                        </p>
                                    </div>
                                    <div>
                                        <p
                                            className={css({
                                                color: 'foreground.muted',
                                                fontSize: 'xs',
                                            })}
                                        >
                                            Workers ready
                                        </p>
                                        <p
                                            className={css({
                                                fontWeight: 'semibold',
                                                color: 'foreground',
                                            })}
                                        >
                                            {snapshot.idleWorkers}/{snapshot.workerCount}
                                        </p>
                                    </div>
                                </div>
                                <p className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                                    Hosts:{' '}
                                    {snapshot.workerHosts.length > 0
                                        ? snapshot.workerHosts.join(', ')
                                        : '–'}
                                </p>
                            </div>
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
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '2',
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
                                Tasks
                            </p>
                            <h2
                                className={css({
                                    fontSize: 'lg',
                                    fontWeight: 'semibold',
                                    color: 'foreground',
                                })}
                            >
                                Aktive BullMQ Jobs & Trigger
                            </h2>
                        </div>
                        <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                            Payload bitte als gültiges JSON angeben
                        </span>
                    </div>
                    <div
                        className={css({
                            display: 'grid',
                            gap: '3',
                            gridTemplateColumns: { base: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                        })}
                    >
                        {jobCatalog.map((item) => (
                            <div
                                key={item.id}
                                className={css({
                                    borderRadius: 'xl',
                                    borderWidth: '1px',
                                    borderColor: 'border.muted',
                                    background: 'surface',
                                    padding: '4',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '3',
                                })}
                            >
                                <div
                                    className={css({
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '3',
                                    })}
                                >
                                    <div>
                                        <p
                                            className={css({
                                                fontSize: 'sm',
                                                fontWeight: 'semibold',
                                                color: 'foreground',
                                            })}
                                        >
                                            {item.jobName}
                                        </p>
                                        <p
                                            className={css({
                                                fontSize: 'xs',
                                                color: 'foreground.muted',
                                            })}
                                        >
                                            {getQueueLabel(item.queue)} ·{' '}
                                            {item.type === 'worker'
                                                ? `${item.meta.concurrency ?? 1} parallel`
                                                : (item.meta.repeatPattern ?? 'ad hoc')}
                                        </p>
                                    </div>
                                    <span
                                        className={css({
                                            borderRadius: 'full',
                                            px: '3',
                                            py: '1',
                                            fontSize: 'xs',
                                            fontWeight: 'semibold',
                                            background: 'border.muted',
                                        })}
                                    >
                                        {item.type === 'worker' ? 'Worker' : 'Scheduler'}
                                    </span>
                                </div>
                                <form
                                    action={triggerJobAction}
                                    className={css({
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2',
                                    })}
                                >
                                    <input type="hidden" name="queue" value={item.queue} />
                                    <input type="hidden" name="jobName" value={item.jobName} />
                                    <label
                                        className={css({
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '1',
                                            fontSize: 'xs',
                                            color: 'foreground.muted',
                                        })}
                                    >
                                        Payload
                                        <textarea
                                            name="payload"
                                            defaultValue={stringifyPayload(item.defaultPayload)}
                                            rows={4}
                                            className={css({
                                                borderRadius: 'lg',
                                                borderWidth: '1px',
                                                borderColor: 'border',
                                                fontFamily: 'mono',
                                                fontSize: 'sm',
                                                padding: '2',
                                                color: 'foreground',
                                                background: 'surface.elevated',
                                            })}
                                        />
                                    </label>
                                    <button
                                        type="submit"
                                        className={css({
                                            alignSelf: 'flex-start',
                                            borderRadius: 'full',
                                            background: 'primary',
                                            color: 'white',
                                            fontSize: 'xs',
                                            fontWeight: 'semibold',
                                            px: '4',
                                            py: '1.5',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.3em',
                                        })}
                                    >
                                        Triggern
                                    </button>
                                </form>
                            </div>
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
                    <div>
                        <p
                            className={css({
                                fontSize: 'xs',
                                textTransform: 'uppercase',
                                letterSpacing: '0.4em',
                                color: 'foreground.muted',
                            })}
                        >
                            Best Practices
                        </p>
                        <h2
                            className={css({
                                fontSize: 'lg',
                                fontWeight: 'semibold',
                                color: 'foreground',
                            })}
                        >
                            Monitoring & Tooling Inspiration
                        </h2>
                    </div>
                    <p className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                        Für tiefergehende Dashboards empfehlen sich etablierte Projekte wie Bull
                        Board für Echtzeit-Kontrolle und bullmq-dash für TUI-Monitoring. Ergänzend
                        sollten laut OneUptime regelmäßige Worker-Health-Checks (Liveness,
                        Readiness, Startup) implementiert werden.
                    </p>
                    <ul
                        className={css({
                            listStyle: 'disc',
                            pl: '5',
                            fontSize: 'sm',
                            color: 'foreground',
                        })}
                    >
                        {bestPracticeLinks.map((link) => (
                            <li key={link.href}>
                                <a
                                    href={link.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={css({
                                        color: 'primary',
                                        textDecoration: 'underline',
                                    })}
                                >
                                    {link.label}
                                </a>
                            </li>
                        ))}
                    </ul>
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
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '2',
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
                                Verlauf
                            </p>
                            <h2
                                className={css({
                                    fontSize: 'lg',
                                    fontWeight: 'semibold',
                                    color: 'foreground',
                                })}
                            >
                                Neueste Jobläufe
                            </h2>
                        </div>
                        <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                            Zeige {jobRuns.length} Einträge
                        </span>
                    </div>
                    {jobRuns.length === 0 ? (
                        <div
                            className={css({
                                borderRadius: 'xl',
                                borderWidth: '1px',
                                borderColor: 'border.muted',
                                borderStyle: 'dashed',
                                padding: '6',
                                textAlign: 'center',
                                color: 'foreground.muted',
                            })}
                        >
                            Keine Jobläufe verfügbar.
                        </div>
                    ) : (
                        <div
                            className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}
                        >
                            {jobRuns.map((run) => {
                                const details = JOB_STATUS_DETAILS[run.status];

                                return (
                                    <div
                                        key={run.id}
                                        className={css({
                                            borderRadius: 'xl',
                                            borderWidth: '1px',
                                            borderColor: 'border.muted',
                                            background: 'surface',
                                            padding: '4',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '2',
                                        })}
                                    >
                                        <div
                                            className={css({
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                flexWrap: 'wrap',
                                                gap: '2',
                                            })}
                                        >
                                            <div>
                                                <p
                                                    className={css({
                                                        fontSize: 'sm',
                                                        fontWeight: 'semibold',
                                                        color: 'foreground',
                                                    })}
                                                >
                                                    {run.jobName}
                                                </p>
                                                <p
                                                    className={css({
                                                        fontSize: 'xs',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.3em',
                                                        color: 'foreground.muted',
                                                    })}
                                                >
                                                    {run.id.slice(0, 8)} •{' '}
                                                    {getQueueLabel(run.queueName)}
                                                </p>
                                            </div>
                                            <span
                                                className={css({
                                                    borderRadius: 'full',
                                                    paddingX: '3',
                                                    paddingY: '1',
                                                    fontSize: 'xs',
                                                    fontWeight: 'semibold',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.3em',
                                                    color: 'foreground',
                                                })}
                                                style={{ backgroundColor: details.accent }}
                                            >
                                                {details.label}
                                            </span>
                                        </div>
                                        <div
                                            className={css({
                                                display: 'grid',
                                                gap: '3',
                                                gridTemplateColumns: {
                                                    md: 'repeat(2, minmax(0, 1fr))',
                                                },
                                            })}
                                        >
                                            <div>
                                                <p
                                                    className={css({
                                                        fontSize: 'xs',
                                                        color: 'foreground.muted',
                                                    })}
                                                >
                                                    Dauer
                                                </p>
                                                <p
                                                    className={css({
                                                        fontSize: 'lg',
                                                        fontWeight: 'semibold',
                                                        color: 'foreground',
                                                    })}
                                                >
                                                    {formatDuration(run.startedAt, run.completedAt)}
                                                </p>
                                            </div>
                                            <div>
                                                <p
                                                    className={css({
                                                        fontSize: 'xs',
                                                        color: 'foreground.muted',
                                                    })}
                                                >
                                                    Versuche
                                                </p>
                                                <p
                                                    className={css({
                                                        fontSize: 'lg',
                                                        fontWeight: 'semibold',
                                                        color: 'foreground',
                                                    })}
                                                >
                                                    {run.attempts}
                                                </p>
                                            </div>
                                        </div>
                                        <div
                                            className={css({
                                                display: 'grid',
                                                gap: '1.5',
                                                gridTemplateColumns: {
                                                    sm: 'repeat(3, minmax(0, 1fr))',
                                                },
                                                fontSize: 'xs',
                                                color: 'foreground.muted',
                                            })}
                                        >
                                            <div>
                                                <p
                                                    className={css({
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.3em',
                                                    })}
                                                >
                                                    Erstellt
                                                </p>
                                                <p>
                                                    {run.createdAt.toLocaleString('de-DE', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                            </div>
                                            <div>
                                                <p
                                                    className={css({
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.3em',
                                                    })}
                                                >
                                                    Gestartet
                                                </p>
                                                <p>{formatTime(run.startedAt)}</p>
                                            </div>
                                            <div>
                                                <p
                                                    className={css({
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.3em',
                                                    })}
                                                >
                                                    Beendet
                                                </p>
                                                <p>{formatTime(run.completedAt)}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </PageShell>
    );
}
