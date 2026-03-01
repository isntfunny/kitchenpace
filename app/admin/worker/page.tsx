import { PageShell } from '@/components/layouts/PageShell';
import { ensureAdminSession } from '@/lib/admin/ensure-admin';
import { getJobRuns, type JobRun, type JobStatus } from '@/lib/queues/job-run';
import { getQueueLabel, JOB_STATUS_DETAILS, STATUS_ORDER } from '@/lib/queues/job-run-ui';

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
            <div className="space-y-10">
                <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-orange-500/30 via-rose-500/10 to-blue-500/20 p-8 shadow-2xl backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.5em] text-amber-200">
                        Admin · Worker
                    </p>
                    <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h1 className="text-4xl font-semibold text-white">Worker Dashboard</h1>
                            <p className="mt-2 max-w-2xl text-sm text-slate-100">
                                Aktuelle Jobläufe, Engpässe und Ausfälle auf einen Blick
                                nachverfolgen.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-right backdrop-blur">
                            <p className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-200">
                                Erfolgsquote
                            </p>
                            <p className="text-3xl font-semibold text-white">{completedRate}%</p>
                            <p className="text-xs text-slate-300">von {totalJobs} letzten Jobs</p>
                        </div>
                    </div>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {STATUS_ORDER.map((status) => {
                            const details = JOB_STATUS_DETAILS[status];
                            const percent =
                                totalJobs > 0
                                    ? Math.round((statusCounts[status] / totalJobs) * 100)
                                    : 0;

                            return (
                                <div
                                    key={status}
                                    className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur"
                                >
                                    <p className="text-xs uppercase tracking-[0.4em] text-slate-300">
                                        {details.label}
                                    </p>
                                    <p className="mt-1 text-2xl font-semibold text-white">
                                        {statusCounts[status]}
                                    </p>
                                    <div className="mt-3 h-1.5 rounded-full bg-white/10">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${percent}%`,
                                                background: details.color,
                                            }}
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-slate-400">
                                        {percent}% der Liste
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </header>

                <section className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/40 p-6 shadow-xl backdrop-blur">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                            Warteschlangen
                        </p>
                        <span className="text-xs text-slate-500">
                            {queueHighlights.length} aktive Queues
                        </span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                        {queueHighlights.map(([queue, count]) => (
                            <div
                                key={queue}
                                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                            >
                                <p className="text-sm font-semibold text-white">
                                    {getQueueLabel(queue)}
                                </p>
                                <p className="text-2xl font-bold text-slate-100">{count}</p>
                                <p className="text-xs text-slate-400">Letzte 50 Jobs</p>
                            </div>
                        ))}
                        {queueHighlights.length === 0 && (
                            <p className="text-sm text-slate-400">Keine aktiven Queues sichtbar.</p>
                        )}
                    </div>
                    <div className="text-sm text-slate-400">
                        Durchschnittliche Laufzeit:{' '}
                        <span className="text-white">{averageDuration}</span>
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                                Verlauf
                            </p>
                            <h2 className="text-2xl font-semibold text-white">Neueste Jobläufe</h2>
                        </div>
                        <p className="text-xs text-slate-500">Zeige {jobRuns.length} Einträge</p>
                    </div>

                    {jobRuns.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-8 text-center text-slate-500">
                            Keine Jobläufe verfügbar.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {jobRuns.map((run) => {
                                const details = JOB_STATUS_DETAILS[run.status];

                                return (
                                    <div
                                        key={run.id}
                                        className="rounded-3xl border border-white/5 bg-white/5 p-5 shadow-lg backdrop-blur transition hover:-translate-y-0.5"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-white">
                                                    {run.jobName}
                                                </p>
                                                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                                                    {run.id.slice(0, 8)} •{' '}
                                                    {getQueueLabel(run.queueName)}
                                                </p>
                                            </div>
                                            <span
                                                className="rounded-full px-3 py-1 text-xs font-semibold uppercase"
                                                style={{
                                                    backgroundColor: details.accent,
                                                    color: details.color,
                                                }}
                                            >
                                                {details.label}
                                            </span>
                                        </div>

                                        <div className="mt-4 grid gap-4 text-sm text-slate-300 md:grid-cols-2">
                                            <div>
                                                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                                                    Dauer
                                                </p>
                                                <p className="text-lg text-white">
                                                    {formatDuration(run.startedAt, run.completedAt)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                                                    Versuche
                                                </p>
                                                <p className="text-lg text-white">{run.attempts}</p>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid gap-4 text-xs text-slate-400 sm:grid-cols-3">
                                            <div>
                                                <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
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
                                                <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                                                    Gestartet
                                                </p>
                                                <p>{formatTime(run.startedAt)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
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
