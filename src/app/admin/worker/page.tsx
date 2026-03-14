import { PageShell } from '@app/components/layouts/PageShell';
import { getQueueSnapshots } from '@worker/queues/insights';
import { getJobRuns, type JobRun, type JobStatus } from '@worker/queues/job-run';
import { getQueueLabel, JOB_STATUS_DETAILS, STATUS_ORDER } from '@worker/queues/job-run-ui';
import { getScheduledJobDefinitions } from '@worker/queues/scheduler';
import { QueueName, type JobPayloadSchema } from '@worker/queues/types';
import { getWorkerDefinitions } from '@worker/queues/worker';
import { css } from 'styled-system/css';

import { JobTriggerCard } from './job-trigger-card';
import { PastRuns } from './past-runs';

export const dynamic = 'force-dynamic';

async function getJobRunsData(): Promise<JobRun[]> {
    return getJobRuns({ limit: 50 });
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
    schema?: JobPayloadSchema;
    meta: {
        concurrency?: number;
        repeatPattern?: string;
    };
};

function JobAccordionSection({ title, jobs }: { title: string; jobs: JobCatalogItem[] }) {
    return (
        <div
            className={css({
                borderBottomWidth: '1px',
                borderColor: 'border.muted',
            })}
        >
            <details>
                <summary
                    className={css({
                        padding: '3',
                        paddingX: '4',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        listStyle: 'none',
                        _hover: {
                            background: 'surface.elevated',
                        },
                    })}
                >
                    <span
                        className={css({
                            fontSize: 'xs',
                            fontWeight: 'semibold',
                            color: 'foreground',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3em',
                        })}
                    >
                        {title}
                    </span>
                    <span
                        className={css({
                            fontSize: 'xs',
                            color: 'foreground.muted',
                        })}
                    >
                        {jobs.length} Jobs
                    </span>
                </summary>
                <div
                    className={css({
                        paddingX: '3',
                        paddingBottom: '3',
                    })}
                >
                    <ul
                        className={css({
                            listStyle: 'none',
                            margin: 0,
                            padding: 0,
                            display: 'grid',
                            gap: '2',
                        })}
                    >
                        {jobs.map((job) => (
                            <JobTriggerCard key={job.id} item={job} />
                        ))}
                    </ul>
                </div>
            </details>
        </div>
    );
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

    const workerDefinitions = getWorkerDefinitions();
    const scheduledDefinitions = getScheduledJobDefinitions();

    const workerJobs = workerDefinitions.map((worker) => ({
        id: `worker-${worker.name}`,
        jobName: worker.name,
        queue: worker.queue,
        type: 'worker' as const,
        defaultPayload: {},
        meta: {
            concurrency: worker.concurrency,
        },
    }));

    const scheduledJobs = scheduledDefinitions.map((job) => ({
        id: `scheduled-${job.name}`,
        jobName: job.name,
        queue: job.queue,
        type: 'scheduled' as const,
        defaultPayload: job.data,
        schema: job.schema,
        meta: {
            repeatPattern: job.options?.repeat?.pattern,
        },
    }));

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

                <div
                    className={css({
                        display: 'grid',
                        gridTemplateColumns: { base: '1fr', lg: '320px 1fr' },
                        gap: '4',
                    })}
                >
                    <aside
                        className={css({
                            borderRadius: '2xl',
                            borderWidth: '1px',
                            borderColor: 'border.muted',
                            background: 'surface.elevated',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: 'fit-content',
                        })}
                    >
                        <div
                            className={css({
                                padding: '3',
                                paddingX: '4',
                                borderBottomWidth: '1px',
                                borderColor: 'border.muted',
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
                                Jobs
                            </p>
                            <h2
                                className={css({
                                    fontSize: 'lg',
                                    fontWeight: 'semibold',
                                    color: 'foreground',
                                })}
                            >
                                Tasks & Schedules
                            </h2>
                        </div>
                        <div
                            className={css({
                                overflow: 'auto',
                                maxHeight: '500px',
                            })}
                        >
                            <JobAccordionSection title="⚡ Worker" jobs={workerJobs} />
                            <JobAccordionSection title="📅 Scheduled" jobs={scheduledJobs} />
                        </div>
                    </aside>

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
                            minHeight: '0',
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
                            <div
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2',
                                })}
                            >
                                <span
                                    className={css({
                                        width: '2',
                                        height: '2',
                                        borderRadius: 'full',
                                        background: 'green.500',
                                        animation: 'pulse 2s infinite',
                                    })}
                                />
                                <span
                                    className={css({ fontSize: 'xs', color: 'foreground.muted' })}
                                >
                                    Live (3s)
                                </span>
                            </div>
                        </div>
                        <div
                            className={css({
                                overflow: 'auto',
                                flex: '1',
                            })}
                        >
                            <PastRuns />
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
                                Queue Status & Highlights
                            </h2>
                        </div>
                        <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                            Durchschn. Laufzeit: {averageDuration}
                        </span>
                    </div>
                    <div
                        className={css({
                            display: 'grid',
                            gap: '3',
                            gridTemplateColumns: {
                                base: '1fr',
                                md: 'repeat(2, minmax(0, 1fr))',
                                lg: 'repeat(3, minmax(0, 1fr))',
                            },
                        })}
                    >
                        {queueSnapshots.map((snapshot) => {
                            const highlightCount = queueCounts[snapshot.queue] ?? 0;
                            return (
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
                                                px: '2',
                                                py: '0.5',
                                                fontSize: 'xs',
                                                fontWeight: 'semibold',
                                            })}
                                            style={{
                                                backgroundColor: snapshot.healthy
                                                    ? 'rgba(34, 197, 94, 0.15)'
                                                    : 'rgba(239, 68, 68, 0.15)',
                                                color: snapshot.healthy ? '#22c55e' : '#ef4444',
                                            }}
                                        >
                                            {snapshot.healthy ? '✓ Healthy' : '✗ Degraded'}
                                        </span>
                                    </div>
                                    <div
                                        className={css({
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(4, 1fr)',
                                            gap: '2',
                                            fontSize: 'xs',
                                        })}
                                    >
                                        <div>
                                            <p
                                                className={css({
                                                    color: 'foreground.muted',
                                                    fontSize: '0.65rem',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.2em',
                                                })}
                                            >
                                                Wait
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
                                                    fontSize: '0.65rem',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.2em',
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
                                                    fontSize: '0.65rem',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.2em',
                                                })}
                                            >
                                                Fail
                                            </p>
                                            <p
                                                className={css({
                                                    fontWeight: 'semibold',
                                                    color:
                                                        snapshot.counts.failed > 0
                                                            ? 'red.500'
                                                            : 'foreground',
                                                })}
                                            >
                                                {snapshot.counts.failed}
                                            </p>
                                        </div>
                                        <div>
                                            <p
                                                className={css({
                                                    color: 'foreground.muted',
                                                    fontSize: '0.65rem',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.2em',
                                                })}
                                            >
                                                Worker
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
                                    <div
                                        className={css({
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            paddingTop: '2',
                                            borderTopWidth: '1px',
                                            borderColor: 'border.muted',
                                        })}
                                    >
                                        <span
                                            className={css({
                                                fontSize: 'xs',
                                                color: 'foreground.muted',
                                            })}
                                        >
                                            Letzte 50: {highlightCount}
                                        </span>
                                        <span
                                            className={css({
                                                fontSize: 'xs',
                                                color: 'foreground.muted',
                                            })}
                                        >
                                            {snapshot.workerHosts.length > 0
                                                ? snapshot.workerHosts.slice(0, 2).join(', ')
                                                : '– no hosts'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>
        </PageShell>
    );
}
