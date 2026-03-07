'use client';

import type { ModerationLog, ModerationQueue, User } from '@prisma/client';
import {
    Check,
    X,
    Ban,
    Unlock,
    Flag,
    Bot,
    ShieldCheck,
    Eye,
} from 'lucide-react';
import { useState } from 'react';

import { css } from 'styled-system/css';

type LogItem = ModerationLog & {
    actor: Pick<User, 'id' | 'name' | 'email'>;
};

type AutoItem = ModerationQueue & {
    author: Pick<User, 'id' | 'name' | 'email'>;
};

type ModerationContentSnapshot = {
    title?: string;
    description?: string;
    text?: string;
    imageUrl?: string;
};

type HistoryEntry = {
    id: string;
    type: 'manual' | 'auto';
    action: string;
    contentType?: string | null;
    actorName: string;
    detail: string;
    reason?: string | null;
    score?: number;
    createdAt: Date;
};

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Check; color: string }> = {
    approve: { label: 'Freigegeben', icon: Check, color: '#16a34a' },
    reject: { label: 'Abgelehnt', icon: X, color: '#dc2626' },
    ban_user: { label: 'Gesperrt', icon: Ban, color: '#dc2626' },
    unban_user: { label: 'Entsperrt', icon: Unlock, color: '#16a34a' },
    resolve_report: { label: 'Meldung erledigt', icon: Flag, color: '#6b7280' },
    hide_content: { label: 'Versteckt', icon: Eye, color: '#d97706' },
    restore_content: { label: 'Wiederhergestellt', icon: ShieldCheck, color: '#16a34a' },
    auto_approved: { label: 'Auto-Approved', icon: Bot, color: '#6b7280' },
    auto_rejected: { label: 'Auto-Rejected', icon: Bot, color: '#dc2626' },
};

const TYPE_LABELS: Record<string, string> = {
    recipe: 'Rezept',
    comment: 'Kommentar',
    profile: 'Profil',
    cook_image: 'Bild',
    user: 'Benutzer',
    report: 'Meldung',
};

export function ModerationHistoryTable({
    logs,
    autoItems,
}: {
    logs: LogItem[];
    autoItems: AutoItem[];
}) {
    const [filter, setFilter] = useState<'all' | 'manual' | 'auto'>('all');

    // Merge logs and auto items into a unified timeline
    const entries: HistoryEntry[] = [
        ...logs.map((log): HistoryEntry => ({
            id: log.id,
            type: 'manual',
            action: log.action,
            contentType: log.contentType,
            actorName: log.actor.name ?? log.actor.email ?? '—',
            detail: log.contentId
                ? `${TYPE_LABELS[log.contentType ?? ''] ?? log.contentType} #${log.contentId.slice(0, 8)}`
                : '',
            reason: log.reason,
            createdAt: log.createdAt,
        })),
        ...autoItems.map((item): HistoryEntry => {
            const snapshot = item.contentSnapshot as ModerationContentSnapshot | null;
            return {
                id: item.id,
                type: 'auto',
                action: item.status === 'AUTO_APPROVED' ? 'auto_approved' : 'auto_rejected',
                contentType: item.contentType,
                actorName: item.author.name ?? item.author.email ?? '—',
                detail: snapshot?.title
                    ?? snapshot?.text?.slice(0, 60)
                    ?? `${TYPE_LABELS[item.contentType] ?? item.contentType}`,
                score: item.aiScore,
                createdAt: item.createdAt,
            };
        }),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const filtered = entries.filter((e) => {
        if (filter === 'manual') return e.type === 'manual';
        if (filter === 'auto') return e.type === 'auto';
        return true;
    });

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
            {/* Filter row */}
            <div className={css({ display: 'flex', gap: '2' })}>
                {(['all', 'manual', 'auto'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={css({
                            px: '3',
                            py: '1.5',
                            borderRadius: 'lg',
                            fontSize: 'xs',
                            fontWeight: '600',
                            border: '1px solid',
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                        })}
                        style={{
                            background: filter === f ? 'rgba(224,123,83,0.1)' : 'transparent',
                            borderColor: filter === f ? 'rgba(224,123,83,0.4)' : 'rgba(0,0,0,0.08)',
                            color: filter === f ? '#c2410c' : undefined,
                        }}
                    >
                        {f === 'all' ? 'Alle' : f === 'manual' ? 'Manuell' : 'Automatisch'}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div
                    className={css({
                        textAlign: 'center',
                        py: '12',
                        color: 'foreground.muted',
                        fontSize: 'lg',
                    })}
                >
                    Keine Einträge im Verlauf
                </div>
            ) : (
                filtered.map((entry) => {
                    const config = ACTION_CONFIG[entry.action] ?? {
                        label: entry.action,
                        icon: Eye,
                        color: '#6b7280',
                    };
                    const ActionIcon = config.icon;

                    return (
                        <div
                            key={entry.id}
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3',
                                px: '4',
                                py: '3',
                                borderRadius: 'xl',
                                borderWidth: '1px',
                                borderColor: 'border.muted',
                                bg: 'surface',
                            })}
                        >
                            <div
                                className={css({
                                    p: '1.5',
                                    borderRadius: 'lg',
                                    flexShrink: '0',
                                })}
                                style={{ background: `${config.color}15` }}
                            >
                                <ActionIcon size={14} style={{ color: config.color }} />
                            </div>

                            <span
                                className={css({
                                    fontSize: 'xs',
                                    fontWeight: '700',
                                    flexShrink: '0',
                                    width: '120px',
                                })}
                                style={{ color: config.color }}
                            >
                                {config.label}
                            </span>

                            {entry.contentType && (
                                <span
                                    className={css({
                                        fontSize: 'xs',
                                        color: 'foreground.muted',
                                        flexShrink: '0',
                                        width: '70px',
                                    })}
                                >
                                    {TYPE_LABELS[entry.contentType] ?? entry.contentType}
                                </span>
                            )}

                            <span
                                className={css({
                                    fontSize: 'sm',
                                    flex: '1',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    color: 'foreground',
                                })}
                            >
                                {entry.detail}
                                {entry.reason && (
                                    <span className={css({ color: 'foreground.muted' })}>
                                        {' — '}
                                        {entry.reason}
                                    </span>
                                )}
                            </span>

                            {entry.score !== undefined && (
                                <span
                                    className={css({
                                        px: '2',
                                        py: '0.5',
                                        borderRadius: 'full',
                                        fontSize: 'xs',
                                        fontWeight: '700',
                                        fontFamily: 'mono',
                                        bg: 'rgba(0,0,0,0.04)',
                                        color: 'foreground.muted',
                                        flexShrink: '0',
                                    })}
                                >
                                    {entry.score.toFixed(2)}
                                </span>
                            )}

                            <span
                                className={css({
                                    fontSize: 'xs',
                                    color: 'foreground.muted',
                                    flexShrink: '0',
                                })}
                            >
                                {entry.type === 'auto' ? 'KI' : entry.actorName}
                            </span>

                            <span
                                className={css({
                                    fontSize: 'xs',
                                    color: 'foreground.muted',
                                    flexShrink: '0',
                                    width: '80px',
                                    textAlign: 'right',
                                })}
                            >
                                {timeAgo(entry.createdAt)}
                            </span>
                        </div>
                    );
                })
            )}
        </div>
    );
}

function timeAgo(date: Date) {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'gerade eben';
    if (diffMins < 60) return `vor ${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `vor ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `vor ${diffDays}d`;
}
