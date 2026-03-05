'use client';

import { ChevronDown, ChevronRight, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { JobStatus } from '@worker/queues/job-run';
import { JOB_STATUS_DETAILS } from '@worker/queues/job-run-ui';
import { css } from 'styled-system/css';

type JobRun = {
    id: string;
    queueName: string;
    jobName: string;
    status: JobStatus;
    payload: Record<string, unknown> | null;
    result: Record<string, unknown> | null;
    errorMessage: string | null;
    attempts: number;
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
};

function formatDuration(start: string | null, end: string | null): string {
    if (!start || !end) return '-';
    const diff = new Date(end).getTime() - new Date(start).getTime();
    if (diff < 1000) return `${diff}ms`;
    if (diff < 60000) return `${(diff / 1000).toFixed(1)}s`;
    return `${(diff / 60000).toFixed(1)}m`;
}

function formatTime(dateStr: string | null): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

export function PastRuns() {
    const [runs, setRuns] = useState<JobRun[]>([]);
    const [expandedRun, setExpandedRun] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRuns = async () => {
        try {
            const res = await fetch('/admin/worker/api/runs');
            if (res.ok) {
                const data = await res.json();
                setRuns(data);
            }
        } catch (error) {
            console.error('Failed to fetch runs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRuns();
        const interval = setInterval(fetchRuns, 3000);
        return () => clearInterval(interval);
    }, []);

    const toggleExpand = (id: string) => {
        setExpandedRun(expandedRun === id ? null : id);
    };

    const hasLogs = (run: JobRun) => {
        return run.result || run.errorMessage || run.payload;
    };

    if (isLoading && runs.length === 0) {
        return (
            <div className={css({ padding: '4', textAlign: 'center', color: 'foreground.muted' })}>
                Lade...
            </div>
        );
    }

    if (runs.length === 0) {
        return (
            <div
                className={css({
                    borderRadius: 'xl',
                    borderWidth: '1px',
                    borderColor: 'border.muted',
                    borderStyle: 'dashed',
                    padding: '6',
                    textAlign: 'center',
                    color: 'foreground.muted',
                    fontSize: 'sm',
                })}
            >
                Keine Jobläufe verfügbar.
            </div>
        );
    }

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '1' })}>
            {runs.map((run) => {
                const details = JOB_STATUS_DETAILS[run.status];
                const hasData = hasLogs(run);
                const isExpanded = expandedRun === run.id;

                return (
                    <div
                        key={run.id}
                        className={css({
                            borderRadius: 'lg',
                            borderWidth: '1px',
                            borderColor: isExpanded ? 'border' : 'border.muted',
                            background: 'surface',
                            overflow: 'hidden',
                        })}
                    >
                        <div
                            className={css({
                                padding: '2',
                                paddingX: '3',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2',
                                cursor: hasData ? 'pointer' : 'default',
                            })}
                            onClick={() => hasData && toggleExpand(run.id)}
                        >
                            {hasData ? (
                                isExpanded ? (
                                    <ChevronDown
                                        className={css({
                                            width: '4',
                                            height: '4',
                                            color: 'foreground.muted',
                                            flexShrink: 0,
                                        })}
                                    />
                                ) : (
                                    <ChevronRight
                                        className={css({
                                            width: '4',
                                            height: '4',
                                            color: 'foreground.muted',
                                            flexShrink: 0,
                                        })}
                                    />
                                )
                            ) : (
                                <div className={css({ width: '4', flexShrink: 0 })} />
                            )}

                            <div
                                className={css({
                                    flex: '1',
                                    minWidth: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2',
                                })}
                            >
                                <span
                                    className={css({
                                        fontSize: 'xs',
                                        fontWeight: 'semibold',
                                        color: 'foreground',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    })}
                                >
                                    {run.jobName}
                                </span>
                                <span
                                    className={css({
                                        fontSize: 'xs',
                                        color: 'foreground.muted',
                                        whiteSpace: 'nowrap',
                                    })}
                                >
                                    {run.id.slice(0, 8)}
                                </span>
                            </div>

                            <span
                                className={css({
                                    fontSize: 'xs',
                                    color: 'foreground.muted',
                                    whiteSpace: 'nowrap',
                                })}
                            >
                                {formatTime(run.startedAt || run.createdAt)}
                            </span>

                            <span
                                className={css({
                                    borderRadius: 'full',
                                    px: '2',
                                    py: '0.5',
                                    fontSize: 'xs',
                                    fontWeight: 'medium',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                })}
                                style={{ backgroundColor: details.accent, color: details.color }}
                            >
                                {details.label}
                            </span>
                        </div>

                        {isExpanded && hasData && (
                            <div
                                className={css({
                                    borderTopWidth: '1px',
                                    borderColor: 'border.muted',
                                    padding: '3',
                                    background: 'surface.elevated',
                                })}
                            >
                                <div
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1',
                                        marginBottom: '2',
                                        color: 'foreground.muted',
                                        fontSize: 'xs',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.3em',
                                    })}
                                >
                                    <Terminal className={css({ width: '3', height: '3' })} />
                                    Logs & Details
                                </div>

                                <div
                                    className={css({
                                        display: 'grid',
                                        gap: '3',
                                        fontSize: 'xs',
                                    })}
                                >
                                    <div>
                                        <p
                                            className={css({
                                                color: 'foreground.muted',
                                                marginBottom: '1',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.2em',
                                                fontSize: '0.65rem',
                                            })}
                                        >
                                            Duration
                                        </p>
                                        <p
                                            className={css({
                                                fontWeight: 'semibold',
                                                color: 'foreground',
                                            })}
                                        >
                                            {formatDuration(run.startedAt, run.completedAt)}
                                        </p>
                                    </div>

                                    {run.errorMessage && (
                                        <div>
                                            <p
                                                className={css({
                                                    color: 'red.500',
                                                    marginBottom: '1',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.2em',
                                                    fontSize: '0.65rem',
                                                })}
                                            >
                                                Error
                                            </p>
                                            <pre
                                                className={css({
                                                    background: 'red.950',
                                                    color: 'red.200',
                                                    padding: '2',
                                                    borderRadius: 'md',
                                                    overflow: 'auto',
                                                    maxHeight: '32',
                                                    fontSize: 'xs',
                                                    fontFamily: 'mono',
                                                })}
                                            >
                                                {run.errorMessage}
                                            </pre>
                                        </div>
                                    )}

                                    {run.result && (
                                        <div>
                                            <p
                                                className={css({
                                                    color: 'foreground.muted',
                                                    marginBottom: '1',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.2em',
                                                    fontSize: '0.65rem',
                                                })}
                                            >
                                                Result
                                            </p>
                                            <pre
                                                className={css({
                                                    background: 'surface.elevated',
                                                    color: 'foreground',
                                                    padding: '2',
                                                    borderRadius: 'md',
                                                    overflow: 'auto',
                                                    maxHeight: '32',
                                                    fontSize: 'xs',
                                                    fontFamily: 'mono',
                                                })}
                                            >
                                                {JSON.stringify(run.result, null, 2)}
                                            </pre>
                                        </div>
                                    )}

                                    {run.payload && Object.keys(run.payload).length > 0 && (
                                        <div>
                                            <p
                                                className={css({
                                                    color: 'foreground.muted',
                                                    marginBottom: '1',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.2em',
                                                    fontSize: '0.65rem',
                                                })}
                                            >
                                                Payload
                                            </p>
                                            <pre
                                                className={css({
                                                    background: 'surface.elevated',
                                                    color: 'foreground',
                                                    padding: '2',
                                                    borderRadius: 'md',
                                                    overflow: 'auto',
                                                    maxHeight: '32',
                                                    fontSize: 'xs',
                                                    fontFamily: 'mono',
                                                })}
                                            >
                                                {JSON.stringify(run.payload, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
