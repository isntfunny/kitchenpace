import { PageShell } from '@/components/layouts/PageShell';
import { ensureAdminSession } from '@/lib/admin/ensure-admin';
import { getJobRuns, type JobRun, type JobStatus } from '@/lib/queues/job-run';
import { getQueueLabel, JOB_STATUS_DETAILS, STATUS_ORDER } from '@/lib/queues/job-run-ui';
import { css } from 'styled-system/css';

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

export default async function WorkerDashboardPage() {
    const jobRuns = await getJobRunsData();
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

    return (
        <PageShell>
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '10' })}>
                <header
                    className={css({
                        borderRadius: '3xl',
                        borderWidth: '1px',
                        borderColor: 'rgba(255,255,255,0.1)',
                        background:
                            'linear-gradient(135deg, rgba(249,115,22,0.35), rgba(236,72,153,0.15) 50%, rgba(15,23,42,0.5))',
                        padding: '8',
                        boxShadow: '0 40px 120px rgba(0,0,0,0.35)',
                        backdropFilter: 'blur(22px)',
                    })}
                >
                    <p
                        className={css({
                            fontSize: 'xs',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5em',
                            color: '#fcd34d',
                        })}
                    >
                        Admin · Worker
                    </p>
                    <div
                        className={css({
                            marginTop: '3',
                            display: 'flex',
                            flexDirection: { base: 'column', lg: 'row' },
                            gap: '6',
                            alignItems: { lg: 'center' },
                            justifyContent: 'space-between',
                        })}
                    >
                        <div>
                            <h1
                                className={css({
                                    fontSize: '4xl',
                                    fontWeight: 'semibold',
                                    color: 'white',
                                })}
                            >
                                Worker Dashboard
                            </h1>
                            <p
                                className={css({
                                    marginTop: '2',
                                    maxWidth: '2xl',
                                    fontSize: 'sm',
                                    color: '#e5e7eb',
                                })}
                            >
                                Aktuelle Jobläufe, Engpässe und Ausfälle auf einen Blick
                                nachverfolgen.
                            </p>
                        </div>
                        <div
                            className={css({
                                borderRadius: '2xl',
                                borderWidth: '1px',
                                borderColor: 'rgba(255,255,255,0.2)',
                                background: 'rgba(255,255,255,0.1)',
                                paddingX: '6',
                                paddingY: '4',
                                textAlign: 'right',
                                backdropFilter: 'blur(10px)',
                            })}
                        >
                            <p
                                className={css({
                                    fontSize: '0.65rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.4em',
                                    color: '#cbd5f5',
                                })}
                            >
                                Erfolgsquote
                            </p>
                            <p
                                className={css({
                                    fontSize: '3xl',
                                    fontWeight: 'semibold',
                                    color: 'white',
                                })}
                            >
                                {completedRate}%
                            </p>
                            <p className={css({ fontSize: 'xs', color: '#94a3b8' })}>
                                von {totalJobs} letzten Jobs
                            </p>
                        </div>
                    </div>
                    <div
                        className={css({
                            marginTop: '6',
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
                            const percent =
                                totalJobs > 0
                                    ? Math.round((statusCounts[status] / totalJobs) * 100)
                                    : 0;

                            return (
                                <div
                                    key={status}
                                    className={css({
                                        borderRadius: '2xl',
                                        borderWidth: '1px',
                                        borderColor: 'rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.05)',
                                        padding: '4',
                                        boxShadow: '0 20px 45px rgba(15,23,42,0.25)',
                                        backdropFilter: 'blur(12px)',
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
                                            marginTop: '1',
                                            fontSize: '2xl',
                                            fontWeight: 'semibold',
                                            color: 'white',
                                        })}
                                    >
                                        {statusCounts[status]}
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
                                            className={css({
                                                height: '100%',
                                                borderRadius: 'full',
                                            })}
                                            style={{
                                                width: `${percent}%`,
                                                background: details.color,
                                            }}
                                        />
                                    </div>
                                    <p
                                        className={css({
                                            marginTop: '1',
                                            fontSize: 'xs',
                                            color: '#94a3b8',
                                        })}
                                    >
                                        {percent}% der Liste
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </header>

                <section
                    className={css({
                        borderRadius: '3xl',
                        borderWidth: '1px',
                        borderColor: 'rgba(255,255,255,0.1)',
                        background: 'rgba(15,23,42,0.4)',
                        padding: '6',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
                        backdropFilter: 'blur(12px)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6',
                    })}
                >
                    <div
                        className={css({
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: '2',
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
                            Warteschlangen
                        </p>
                        <span className={css({ fontSize: 'xs', color: '#94a3b8' })}>
                            {queueHighlights.length} aktive Queues
                        </span>
                    </div>
                    <div
                        className={css({
                            display: 'grid',
                            gap: '4',
                            gridTemplateColumns: {
                                base: '1fr',
                                sm: 'repeat(2, minmax(0, 1fr))',
                                md: 'repeat(4, minmax(0, 1fr))',
                            },
                        })}
                    >
                        {queueHighlights.map(([queue, count]) => (
                            <div
                                key={queue}
                                className={css({
                                    borderRadius: '2xl',
                                    borderWidth: '1px',
                                    borderColor: 'rgba(255,255,255,0.1)',
                                    background: 'rgba(255,255,255,0.05)',
                                    paddingX: '4',
                                    paddingY: '3',
                                })}
                            >
                                <p
                                    className={css({
                                        fontSize: 'sm',
                                        fontWeight: 'semibold',
                                        color: 'white',
                                    })}
                                >
                                    {getQueueLabel(queue)}
                                </p>
                                <p
                                    className={css({
                                        fontSize: '2xl',
                                        fontWeight: 'bold',
                                        color: '#e5e7eb',
                                    })}
                                >
                                    {count}
                                </p>
                                <p className={css({ fontSize: 'xs', color: '#94a3b8' })}>
                                    Letzte 50 Jobs
                                </p>
                            </div>
                        ))}
                        {queueHighlights.length === 0 && (
                            <p className={css({ fontSize: 'sm', color: '#94a3b8' })}>
                                Keine aktiven Queues sichtbar.
                            </p>
                        )}
                    </div>
                    <div className={css({ fontSize: 'sm', color: '#94a3b8' })}>
                        Durchschnittliche Laufzeit:{' '}
                        <span className={css({ color: 'white' })}>{averageDuration}</span>
                    </div>
                </section>

                <section className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
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
                                Verlauf
                            </p>
                            <h2
                                className={css({
                                    fontSize: '2xl',
                                    fontWeight: 'semibold',
                                    color: 'white',
                                })}
                            >
                                Neueste Jobläufe
                            </h2>
                        </div>
                        <p className={css({ fontSize: 'xs', color: '#94a3b8' })}>
                            Zeige {jobRuns.length} Einträge
                        </p>
                    </div>

                    {jobRuns.length === 0 ? (
                        <div
                            className={css({
                                borderRadius: '3xl',
                                borderWidth: '1px',
                                borderStyle: 'dashed',
                                borderColor: 'rgba(255,255,255,0.2)',
                                background: 'rgba(255,255,255,0.05)',
                                padding: '8',
                                textAlign: 'center',
                                color: '#94a3b8',
                            })}
                        >
                            Keine Jobläufe verfügbar.
                        </div>
                    ) : (
                        <div
                            className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}
                        >
                            {jobRuns.map((run) => {
                                const details = JOB_STATUS_DETAILS[run.status];

                                return (
                                    <div
                                        key={run.id}
                                        className={css({
                                            borderRadius: '3xl',
                                            borderWidth: '1px',
                                            borderColor: 'rgba(255,255,255,0.05)',
                                            background: 'rgba(255,255,255,0.05)',
                                            padding: '5',
                                            boxShadow: '0 20px 40px rgba(15,23,42,0.2)',
                                            backdropFilter: 'blur(16px)',
                                            transition: 'transform 200ms ease',
                                            _hover: {
                                                transform: 'translateY(-2px)',
                                            },
                                        })}
                                    >
                                        <div
                                            className={css({
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                alignItems: 'flex-start',
                                                justifyContent: 'space-between',
                                                gap: '3',
                                            })}
                                        >
                                            <div>
                                                <p
                                                    className={css({
                                                        fontSize: 'sm',
                                                        fontWeight: 'semibold',
                                                        color: 'white',
                                                    })}
                                                >
                                                    {run.jobName}
                                                </p>
                                                <p
                                                    className={css({
                                                        fontSize: 'xs',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.3em',
                                                        color: '#94a3b8',
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
                                                })}
                                                style={{
                                                    backgroundColor: details.accent,
                                                    color: details.color,
                                                }}
                                            >
                                                {details.label}
                                            </span>
                                        </div>

                                        <div
                                            className={css({
                                                marginTop: '4',
                                                display: 'grid',
                                                gap: '4',
                                                fontSize: 'sm',
                                                color: '#94a3b8',
                                                gridTemplateColumns: {
                                                    md: 'repeat(2, minmax(0, 1fr))',
                                                },
                                            })}
                                        >
                                            <div>
                                                <p
                                                    className={css({
                                                        fontSize: 'xs',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.3em',
                                                        color: '#94a3b8',
                                                    })}
                                                >
                                                    Dauer
                                                </p>
                                                <p
                                                    className={css({
                                                        fontSize: 'lg',
                                                        fontWeight: 'semibold',
                                                        color: 'white',
                                                    })}
                                                >
                                                    {formatDuration(run.startedAt, run.completedAt)}
                                                </p>
                                            </div>
                                            <div>
                                                <p
                                                    className={css({
                                                        fontSize: 'xs',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.3em',
                                                        color: '#94a3b8',
                                                    })}
                                                >
                                                    Versuche
                                                </p>
                                                <p
                                                    className={css({
                                                        fontSize: 'lg',
                                                        fontWeight: 'semibold',
                                                        color: 'white',
                                                    })}
                                                >
                                                    {run.attempts}
                                                </p>
                                            </div>
                                        </div>

                                        <div
                                            className={css({
                                                marginTop: '4',
                                                display: 'grid',
                                                gap: '4',
                                                fontSize: 'xs',
                                                color: '#94a3b8',
                                                gridTemplateColumns: {
                                                    sm: 'repeat(3, minmax(0, 1fr))',
                                                },
                                            })}
                                        >
                                            <div>
                                                <p
                                                    className={css({
                                                        fontSize: '0.65rem',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.3em',
                                                        color: '#94a3b8',
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
                                                        fontSize: '0.65rem',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.3em',
                                                        color: '#94a3b8',
                                                    })}
                                                >
                                                    Gestartet
                                                </p>
                                                <p>{formatTime(run.startedAt)}</p>
                                            </div>
                                            <div>
                                                <p
                                                    className={css({
                                                        fontSize: '0.65rem',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.3em',
                                                        color: '#94a3b8',
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
