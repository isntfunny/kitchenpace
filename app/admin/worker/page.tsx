import { redirect } from 'next/navigation';

import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getJobRuns, type JobRun, type JobStatus } from '@/lib/queues/job-run';

export const dynamic = 'force-dynamic';

async function getJobRunsData(): Promise<JobRun[]> {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
        redirect('/auth/signin');
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true as any },
    });

    if ((user?.role as string) !== 'ADMIN') {
        redirect('/');
    }

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

function getStatusColor(status: JobStatus): string {
    switch (status) {
        case 'COMPLETED':
            return '#22c55e';
        case 'FAILED':
            return '#ef4444';
        case 'PROCESSING':
            return '#f59e0b';
        default:
            return '#6b7280';
    }
}

function getQueueLabel(queue: string): string {
    switch (queue) {
        case 'email':
            return 'E-Mail';
        case 'opensearch':
            return 'OpenSearch';
        case 'scheduled':
            return 'Geplant';
        default:
            return queue;
    }
}

export default async function WorkerDashboardPage() {
    const jobRuns = await getJobRunsData();

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <h1 className="text-2xl font-bold text-gray-900">Worker Dashboard</h1>
                <p className="text-sm text-gray-500">Job-Ausführungshistorie</p>
            </header>

            <main className="p-6">
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Job
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Queue
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Timeline
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Dauer
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Erstellt
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {jobRuns.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        Keine Jobs gefunden
                                    </td>
                                </tr>
                            ) : (
                                jobRuns.map((run) => (
                                    <tr key={run.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-gray-900">
                                                {run.jobName}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {run.id.slice(0, 8)}...
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                                                {getQueueLabel(run.queueName)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium"
                                                style={{
                                                    backgroundColor: `${getStatusColor(run.status)}20`,
                                                    color: getStatusColor(run.status),
                                                }}
                                            >
                                                {run.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="w-32">
                                                <div className="flex items-center gap-1 text-xs">
                                                    <span className="text-gray-400">●</span>
                                                    <span className="text-gray-500">
                                                        {formatTime(run.createdAt)}
                                                    </span>
                                                </div>
                                                {run.startedAt && (
                                                    <div className="flex items-center gap-1 text-xs">
                                                        <span className="text-amber-500">▶</span>
                                                        <span className="text-amber-600">
                                                            {formatTime(run.startedAt)}
                                                        </span>
                                                    </div>
                                                )}
                                                {run.completedAt && (
                                                    <div className="flex items-center gap-1 text-xs">
                                                        <span
                                                            className={`${
                                                                run.status === 'COMPLETED'
                                                                    ? 'text-green-500'
                                                                    : 'text-red-500'
                                                            }`}
                                                        >
                                                            ●
                                                        </span>
                                                        <span
                                                            className={
                                                                run.status === 'COMPLETED'
                                                                    ? 'text-green-600'
                                                                    : 'text-red-600'
                                                            }
                                                        >
                                                            {formatTime(run.completedAt)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {formatDuration(run.startedAt, run.completedAt)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {run.createdAt.toLocaleString('de-DE', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {jobRuns.length > 0 && (
                    <div className="mt-4 text-sm text-gray-500">
                        Zeige {jobRuns.length} von 50 neuesten Jobs
                    </div>
                )}
            </main>
        </div>
    );
}
