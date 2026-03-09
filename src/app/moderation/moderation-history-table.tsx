'use client';

import type { ModerationLog, ModerationQueue, User } from '@prisma/client';
import JsonView from '@uiw/react-json-view';
import {
    Check,
    X,
    Ban,
    Unlock,
    Flag,
    Bot,
    ShieldCheck,
    Eye,
    ChevronRight,
} from 'lucide-react';
import { Dialog } from 'radix-ui';
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
    actorEmail?: string | null;
    detail: string;
    reason?: string | null;
    score?: number;
    createdAt: Date;
    // For auto items — full data for detail view
    flags?: Record<string, number>;
    snapshot?: ModerationContentSnapshot | null;
    rawResponse?: unknown;
    // For manual items
    metadata?: unknown;
};

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Check; color: string }> = {
    approve: { label: 'Freigegeben', icon: Check, color: '#16a34a' },
    reject: { label: 'Abgelehnt', icon: X, color: '#dc2626' },
    ban_user: { label: 'Gesperrt', icon: Ban, color: '#dc2626' },
    unban_user: { label: 'Entsperrt', icon: Unlock, color: '#16a34a' },
    resolve_report: { label: 'Meldung erledigt', icon: Flag, color: '#6b7280' },
    hide_content: { label: 'Versteckt', icon: Eye, color: '#d97706' },
    restore_content: { label: 'Wiederhergestellt', icon: ShieldCheck, color: '#16a34a' },
    auto_approved: { label: 'Auto-Approved', icon: Bot, color: '#16a34a' },
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

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '1' })}>
            <span className={css({ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'foreground.muted', fontWeight: 600 })}>
                {label}
            </span>
            <div className={css({ fontSize: 'sm', color: 'foreground' })}>{children}</div>
        </div>
    );
}

function HistoryDetailDialog({ entry, open, onClose }: { entry: HistoryEntry; open: boolean; onClose: () => void }) {
    const config = ACTION_CONFIG[entry.action] ?? { label: entry.action, icon: Eye, color: '#6b7280' };
    const ActionIcon = config.icon;

    return (
        <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className={css({ position: 'fixed', inset: 0, background: 'surface.overlay', zIndex: 999 })} />
                <Dialog.Content
                    className={css({
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'surface',
                        borderRadius: '2xl',
                        borderWidth: '1px',
                        borderColor: 'border.muted',
                        padding: '6',
                        width: '90vw',
                        maxWidth: '800px',
                        maxHeight: '85vh',
                        overflow: 'auto',
                        zIndex: 1000,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5',
                    })}
                >
                    {/* Header */}
                    <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' })}>
                        <div>
                            <div className={css({ display: 'flex', alignItems: 'center', gap: '2', mb: '1' })}>
                                <div className={css({ p: '1.5', borderRadius: 'lg' })} style={{ background: `${config.color}15` }}>
                                    <ActionIcon size={16} style={{ color: config.color }} />
                                </div>
                                <span className={css({ fontSize: 'sm', fontWeight: '700' })} style={{ color: config.color }}>
                                    {config.label}
                                </span>
                            </div>
                            <Dialog.Title className={css({ fontSize: 'xl', fontWeight: '700', color: 'foreground' })}>
                                {entry.detail || config.label}
                            </Dialog.Title>
                        </div>
                        <Dialog.Close className={css({ p: '2', cursor: 'pointer', border: 'none', bg: 'transparent', color: 'foreground.muted', _hover: { color: 'foreground' } })}>
                            <X size={20} />
                        </Dialog.Close>
                    </div>

                    {/* Meta */}
                    <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', md: 'repeat(3, 1fr)' }, gap: '4' })}>
                        <DetailField label={entry.type === 'auto' ? 'Autor' : 'Moderator'}>
                            <span className={css({ fontWeight: '600' })}>{entry.actorName}</span>
                            {entry.actorEmail && (
                                <>
                                    <br />
                                    <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>{entry.actorEmail}</span>
                                </>
                            )}
                        </DetailField>
                        <DetailField label="Typ">
                            {TYPE_LABELS[entry.contentType ?? ''] ?? entry.contentType ?? '—'}
                        </DetailField>
                        <DetailField label="Zeitpunkt">
                            {new Date(entry.createdAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'medium' })}
                        </DetailField>
                    </div>

                    {/* Score */}
                    {entry.score !== undefined && (
                        <DetailField label="AI Score">
                            <span
                                className={css({ px: '3', py: '1', borderRadius: 'full', fontFamily: 'mono', fontWeight: '700', fontSize: 'md' })}
                                style={{
                                    background: entry.score >= 0.7 ? 'rgba(239,68,68,0.15)' : entry.score >= 0.4 ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.1)',
                                    color: entry.score >= 0.7 ? '#dc2626' : entry.score >= 0.4 ? '#d97706' : '#16a34a',
                                }}
                            >
                                {entry.score.toFixed(4)}
                            </span>
                        </DetailField>
                    )}

                    {/* Reason */}
                    {typeof entry.reason === 'string' && entry.reason && (
                        <DetailField label="Begründung">
                            <div className={css({ p: '3', borderRadius: 'lg', borderWidth: '1px', borderColor: 'border.muted', bg: 'surface.muted' })}>
                                {entry.reason}
                            </div>
                        </DetailField>
                    )}

                    {/* Content preview — hidden for rejected entries (content is deleted) */}
                    {entry.action === 'auto_rejected' || entry.action === 'reject' ? (
                        <div className={css({ display: 'flex', alignItems: 'center', gap: '2', p: '3', borderRadius: 'lg', borderWidth: '1px', borderColor: 'border.muted', bg: { base: 'rgba(239,68,68,0.04)', _dark: 'rgba(239,68,68,0.08)' } })}>
                            <X size={14} style={{ color: '#dc2626', flexShrink: 0 }} />
                            <span className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                                Inhalt wurde entfernt und ist nicht mehr verfügbar.
                            </span>
                        </div>
                    ) : entry.snapshot && (
                        <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
                            <span className={css({ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'foreground.muted', fontWeight: 600 })}>
                                Inhalt
                            </span>

                            {entry.snapshot.imageUrl && (
                                <img
                                    src={String(entry.snapshot.imageUrl)}
                                    alt="Geprüfter Inhalt"
                                    className={css({ maxWidth: '100%', maxHeight: '300px', borderRadius: 'xl', objectFit: 'contain', border: '1px solid', borderColor: 'border.muted' })}
                                />
                            )}

                            {(entry.snapshot.description || entry.snapshot.text) && (
                                <div className={css({ p: '4', borderRadius: 'xl', borderWidth: '1px', borderColor: 'border.muted', bg: 'surface.muted', whiteSpace: 'pre-wrap', fontSize: 'sm', maxHeight: '200px', overflow: 'auto' })}>
                                    {entry.snapshot.description || entry.snapshot.text}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Category scores (for auto items) */}
                    {entry.flags && Object.keys(entry.flags).length > 0 && (
                        <div>
                            <span className={css({ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'foreground.muted', fontWeight: 600, mb: '2', display: 'block' })}>
                                Kategorie-Scores
                            </span>
                            <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '2' })}>
                                {Object.entries(entry.flags).sort(([, a], [, b]) => b - a).map(([cat, score]) => (
                                    <div
                                        key={cat}
                                        className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: '3', py: '1.5', borderRadius: 'lg', fontSize: 'xs', borderWidth: '1px', borderColor: 'border.muted' })}
                                        style={{ background: score > 0.4 ? 'rgba(239,68,68,0.05)' : score > 0.2 ? 'rgba(245,158,11,0.04)' : 'transparent' }}
                                    >
                                        <span className={css({ fontWeight: '600', color: 'foreground' })}>{cat.replace(/\//g, ' / ')}</span>
                                        <span className={css({ fontFamily: 'mono', fontWeight: '700' })} style={{ color: score > 0.4 ? '#dc2626' : score > 0.2 ? '#d97706' : '#6b7280' }}>
                                            {score.toFixed(4)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Raw data */}
                    {(entry.rawResponse != null || entry.snapshot != null || entry.metadata != null) && (
                        <div>
                            <span className={css({ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'foreground.muted', fontWeight: 600 })}>
                                {entry.type === 'auto' ? 'Raw AI Response' : 'Rohdaten'}
                            </span>
                            <div className={css({
                                mt: '2',
                                borderRadius: 'lg',
                                borderWidth: '1px',
                                borderColor: 'border.muted',
                                overflow: 'auto',
                                maxHeight: '300px',
                                fontSize: '0.8rem',
                                fontFamily: 'mono',
                                '& .json-view': { background: 'transparent !important', padding: '1rem' },
                            })}>
                                <JsonView
                                    value={(entry.rawResponse ?? entry.snapshot ?? entry.metadata ?? {}) as object}
                                    collapsed={2}
                                    enableClipboard
                                    displayDataTypes={false}
                                    shortenTextAfterLength={80}
                                />
                            </div>
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

export function ModerationHistoryTable({
    logs,
    autoItems,
}: {
    logs: LogItem[];
    autoItems: AutoItem[];
}) {
    const [filter, setFilter] = useState<'all' | 'manual' | 'auto'>('all');
    const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);

    const entries: HistoryEntry[] = [
        ...logs.map((log): HistoryEntry => ({
            id: log.id,
            type: 'manual',
            action: log.action,
            contentType: log.contentType,
            actorName: log.actor.name ?? log.actor.email ?? '—',
            actorEmail: log.actor.email,
            detail: log.contentId
                ? `${TYPE_LABELS[log.contentType ?? ''] ?? log.contentType} #${log.contentId.slice(0, 8)}`
                : '',
            reason: log.reason,
            createdAt: log.createdAt,
            metadata: log.metadata,
        })),
        ...autoItems.map((item): HistoryEntry => {
            const snapshot = item.contentSnapshot as ModerationContentSnapshot | null;
            return {
                id: item.id,
                type: 'auto',
                action: item.status === 'AUTO_APPROVED' ? 'auto_approved' : 'auto_rejected',
                contentType: item.contentType,
                actorName: item.author.name ?? item.author.email ?? '—',
                actorEmail: item.author.email,
                detail: snapshot?.title ?? snapshot?.text?.slice(0, 60) ?? TYPE_LABELS[item.contentType] ?? item.contentType,
                score: item.aiScore,
                createdAt: item.createdAt,
                flags: item.aiFlags as Record<string, number>,
                snapshot,
                rawResponse: item.aiRawResponse,
            };
        }),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const filtered = entries.filter((e) => {
        if (filter === 'manual') return e.type === 'manual';
        if (filter === 'auto') return e.type === 'auto';
        return true;
    });

    return (
        <>
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
                {/* Filter row */}
                <div className={css({ display: 'flex', gap: '2', alignItems: 'center' })}>
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
                                ...(filter === f
                                    ? {
                                        bg: 'accent.soft',
                                        borderColor: { base: 'rgba(224,123,83,0.4)', _dark: 'rgba(224,123,83,0.5)' },
                                        color: { base: '#c2410c', _dark: '#f09070' },
                                    }
                                    : {
                                        bg: 'transparent',
                                        borderColor: 'border',
                                        color: 'foreground.muted',
                                    }),
                            })}
                        >
                            {f === 'all' ? `Alle (${entries.length})` : f === 'manual' ? `Manuell (${entries.filter(e => e.type === 'manual').length})` : `Automatisch (${entries.filter(e => e.type === 'auto').length})`}
                        </button>
                    ))}
                </div>

                {filtered.length === 0 ? (
                    <div className={css({ textAlign: 'center', py: '12', color: 'foreground.muted', fontSize: 'lg' })}>
                        Keine Einträge im Verlauf
                    </div>
                ) : (
                    <div className={css({ borderRadius: 'xl', borderWidth: '1px', borderColor: 'border.muted', overflow: 'hidden' })}>
                        {/* Table header */}
                        <div
                            className={css({
                                display: 'grid',
                                gridTemplateColumns: '140px 80px 1fr 80px 120px 90px',
                                gap: '3',
                                px: '4',
                                py: '2.5',
                                bg: 'surface.muted',
                                borderBottom: '1px solid',
                                borderColor: 'border.muted',
                                fontSize: 'xs',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: 'foreground.muted',
                            })}
                        >
                            <span>Aktion</span>
                            <span>Typ</span>
                            <span>Detail</span>
                            <span>Score</span>
                            <span>Akteur</span>
                            <span>Zeit</span>
                        </div>

                        {filtered.map((entry) => {
                            const config = ACTION_CONFIG[entry.action] ?? { label: entry.action, icon: Eye, color: '#6b7280' };
                            const ActionIcon = config.icon;

                            return (
                                <div
                                    key={entry.id}
                                    className={css({
                                        display: 'grid',
                                        gridTemplateColumns: '140px 80px 1fr 80px 120px 90px',
                                        gap: '3',
                                        px: '4',
                                        py: '3',
                                        alignItems: 'center',
                                        borderBottom: '1px solid',
                                        borderColor: 'border.muted',
                                        cursor: 'pointer',
                                        transition: 'background 100ms',
                                        _hover: { bg: 'accent.soft' },
                                        _last: { borderBottom: 'none' },
                                    })}
                                    onClick={() => setSelectedEntry(entry)}
                                >
                                    <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
                                        <div className={css({ p: '1', borderRadius: 'md', flexShrink: '0' })} style={{ background: `${config.color}15` }}>
                                            <ActionIcon size={12} style={{ color: config.color }} />
                                        </div>
                                        <span className={css({ fontSize: 'xs', fontWeight: '700' })} style={{ color: config.color }}>
                                            {config.label}
                                        </span>
                                    </div>

                                    <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                                        {TYPE_LABELS[entry.contentType ?? ''] ?? entry.contentType ?? '—'}
                                    </span>

                                    <div className={css({ display: 'flex', alignItems: 'center', gap: '2', overflow: 'hidden' })}>
                                        <span className={css({ fontSize: 'sm', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>
                                            {entry.detail}
                                        </span>
                                        {entry.reason && (
                                            <span className={css({ fontSize: 'xs', color: 'foreground.muted', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: '1' })}>
                                                — {entry.reason}
                                            </span>
                                        )}
                                        <ChevronRight size={14} className={css({ color: 'foreground.muted', flexShrink: '0', ml: 'auto' })} />
                                    </div>

                                    <span className={css({ fontFamily: 'mono', fontSize: 'xs', fontWeight: '700', color: 'foreground.muted' })}>
                                        {entry.score !== undefined ? entry.score.toFixed(3) : '—'}
                                    </span>

                                    <span className={css({ fontSize: 'xs', color: 'foreground.muted', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>
                                        {entry.type === 'auto' ? 'KI' : entry.actorName}
                                    </span>

                                    <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                                        {timeAgo(entry.createdAt)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedEntry && (
                <HistoryDetailDialog
                    entry={selectedEntry}
                    open={!!selectedEntry}
                    onClose={() => setSelectedEntry(null)}
                />
            )}
        </>
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
