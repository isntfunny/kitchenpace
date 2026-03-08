'use client';

import type { Report, User } from '@prisma/client';
import { CheckCircle, Flag } from 'lucide-react';
import Link from 'next/link';
import { useTransition } from 'react';

import { css } from 'styled-system/css';

import { resolveReport } from './actions';

type ReportItem = Report & {
    reporter: Pick<User, 'id' | 'name' | 'email'>;
};

const REASON_LABELS: Record<string, string> = {
    spam: 'Spam',
    nsfw: 'NSFW',
    hate: 'Hassrede',
    misinformation: 'Fehlinformation',
    other: 'Sonstiges',
};

const CONTENT_LABELS: Record<string, string> = {
    recipe: 'Rezept',
    comment: 'Kommentar',
    user: 'Profil',
    cook_image: 'Foto',
};

function getContentHref(report: Pick<Report, 'contentType' | 'contentId'>) {
    if (report.contentType === 'recipe') {
        return `/recipe/${report.contentId}`;
    }

    if (report.contentType === 'user') {
        return `/user/${report.contentId}`;
    }

    return null;
}

export function ReportsTable({ reports }: { reports: ReportItem[] }) {
    const [pending, startTransition] = useTransition();

    if (reports.length === 0) {
        return (
            <div
                className={css({
                    textAlign: 'center',
                    py: '12',
                    color: 'text.muted',
                    fontSize: 'lg',
                })}
            >
                Keine offenen Meldungen
            </div>
        );
    }

    const handleResolve = (id: string) => {
        startTransition(async () => {
            await resolveReport(id);
        });
    };

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
            {reports.map((report) => (
                <div
                    key={report.id}
                    className={css({
                        display: 'flex',
                        alignItems: { base: 'flex-start', md: 'center' },
                        flexDirection: { base: 'column', md: 'row' },
                        gap: '4',
                        px: '4',
                        py: '3',
                        border: '1px solid rgba(224,123,83,0.4)',
                        borderRadius: 'xl',
                        bg: 'surface',
                    })}
                >
                    <Flag
                        size={16}
                        className={css({ color: '#dc2626', flexShrink: '0' })}
                    />

                    <span
                        className={css({
                            px: '2',
                            py: '0.5',
                            borderRadius: 'full',
                            fontSize: 'xs',
                            fontWeight: '600',
                            bg: 'rgba(239,68,68,0.1)',
                            color: '#dc2626',
                            flexShrink: '0',
                        })}
                    >
                        {REASON_LABELS[report.reason] ?? report.reason}
                    </span>

                    <div
                        className={css({
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5',
                            minW: { md: '120px' },
                        })}
                    >
                        <span
                            className={css({
                                fontSize: 'xs',
                                color: 'text.muted',
                                flexShrink: '0',
                            })}
                        >
                            {CONTENT_LABELS[report.contentType] ?? report.contentType}
                        </span>
                        <span className={css({ fontSize: 'xs', color: 'text.muted' })}>
                            {new Date(report.createdAt).toLocaleString('de-DE', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                            })}
                        </span>
                    </div>

                    <div
                        className={css({
                            fontSize: 'sm',
                            flex: '1',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1',
                        })}
                    >
                        <span
                            className={css({
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: { base: 'normal', md: 'nowrap' },
                            })}
                        >
                            {report.description || 'Keine Beschreibung'}
                        </span>
                        {getContentHref(report) && (
                            <Link
                                href={getContentHref(report)!}
                                className={css({
                                    width: 'fit-content',
                                    fontSize: 'xs',
                                    fontWeight: '600',
                                    color: 'accent',
                                    textDecoration: 'none',
                                    _hover: { textDecoration: 'underline' },
                                })}
                            >
                                Inhalt ansehen
                            </Link>
                        )}
                    </div>

                    <div className={css({ minW: { md: '160px' } })}>
                        <span
                            className={css({
                                fontSize: 'xs',
                                color: 'text.muted',
                                flexShrink: '0',
                            })}
                        >
                            {report.reporter.name ?? report.reporter.email}
                        </span>
                    </div>

                    <button
                        onClick={() => handleResolve(report.id)}
                        disabled={pending}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1',
                            px: '3',
                            py: '1.5',
                            borderRadius: 'lg',
                            bg: 'rgba(34,197,94,0.1)',
                            color: '#16a34a',
                            fontSize: 'xs',
                            fontWeight: '600',
                            cursor: 'pointer',
                            border: 'none',
                            _hover: { bg: 'rgba(34,197,94,0.2)' },
                            _disabled: { opacity: '0.5', cursor: 'not-allowed' },
                        })}
                    >
                        <CheckCircle size={14} />
                        Erledigt
                    </button>
                </div>
            ))}
        </div>
    );
}
