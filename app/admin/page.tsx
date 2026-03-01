import { Activity, Clock3, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';

import { ensureAdminSession } from '@/lib/admin/ensure-admin';
import { getJobRuns, type JobRun, type JobStatus } from '@/lib/queues/job-run';
import { JOB_STATUS_DETAILS, STATUS_ORDER, getQueueLabel } from '@/lib/queues/job-run-ui';

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
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
                <section className="rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-800 to-slate-900/60 p-8 shadow-[0_25px_80px_rgba(15,23,42,0.55)]">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.6em] text-slate-400">
                                Admin Center
                            </p>
                            <h1 className="mt-2 text-4xl font-semibold text-white">
                                Willkommen zurück, {greetingName}
                            </h1>
                            <p className="mt-3 max-w-3xl text-sm text-slate-300">
                                Überwache kritische Prozesse, schaue dir die letzten Fehler an und
                                schalte zwischen Scheduler- und Systemansichten.
                            </p>
                            <div className="mt-5 flex flex-wrap gap-3">
                                <Link
                                    href="/admin/worker"
                                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/40"
                                >
                                    <ShieldCheck size={14} />
                                    <span>Worker Dashboard</span>
                                </Link>
                                <Link
                                    href="/admin/worker?queue=scheduled"
                                    className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-slate-500"
                                >
                                    <Clock3 size={14} />
                                    <span>Geplante Jobs</span>
                                </Link>
                            </div>
                        </div>
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-right">
                            <p className="text-xs uppercase tracking-[0.5em] text-slate-400">
                                Fehlerrate
                            </p>
                            <p className="text-3xl font-semibold">{statusCounts.FAILED ?? 0}</p>
                            <p className="text-xs text-slate-400">der letzten 12 Jobläufe</p>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {STATUS_ORDER.map((status) => {
                        const details = JOB_STATUS_DETAILS[status];
                        return (
                            <div
                                key={status}
                                className="rounded-3xl border border-white/5 bg-white/5 p-5 shadow-lg backdrop-blur"
                            >
                                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                                    {details.label}
                                </p>
                                <p className="mt-3 text-3xl font-semibold text-white">
                                    {statusCounts[status] ?? 0}
                                </p>
                                <div className="mt-3 h-1.5 rounded-full bg-white/10">
                                    <div
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: details.color, width: '100%' }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                                Schnellzugriff
                            </p>
                            <h2 className="text-2xl font-semibold text-white">Schnelle Aktionen</h2>
                        </div>
                        <span className="text-xs text-slate-400">
                            Alle Links öffnen neue Steueransichten
                        </span>
                    </div>
                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                        {ADMIN_ACTIONS.map((action) => (
                            <Link
                                key={action.label}
                                href={action.href}
                                className="group rounded-3xl border border-white/10 bg-slate-900/50 p-4 transition hover:border-white/30"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-200">
                                        <action.icon className="text-lg" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">
                                            {action.label}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {action.description}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-inner">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                                Letzte Fehler
                            </p>
                            <h2 className="text-2xl font-semibold text-white">
                                Problematische Jobs
                            </h2>
                        </div>
                        <span className="text-xs text-slate-500">
                            {recentFailures.length} Einträge
                        </span>
                    </div>
                    {recentFailures.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-400">
                            Keine Fehler in diesem Zeitraum.
                        </p>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {recentFailures.map((run) => (
                                <div
                                    key={run.id}
                                    className="rounded-2xl border border-white/5 bg-white/5 p-4"
                                >
                                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                        <p className="text-sm font-semibold text-white">
                                            {run.jobName}
                                        </p>
                                        <span className="text-xs uppercase tracking-[0.3em] text-red-300">
                                            {getQueueLabel(run.queueName)} ·{' '}
                                            {formatDate(run.createdAt)}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-sm text-slate-300">
                                        {run.errorMessage ?? 'Keine Fehlermeldung verfügbar.'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
