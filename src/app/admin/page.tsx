import {
    Activity,
    ShieldCheck,
    ShieldAlert,
    Users,
    BookOpen,
    Tag,
    Settings,
    Sparkles,
    LayoutList,
    Bell,
} from 'lucide-react';
import Link from 'next/link';

import { PageShell } from '@app/components/layouts/PageShell';
import { getServerAuthSession } from '@app/lib/auth';
import { prisma } from '@shared/prisma';
import { getJobRuns, type JobRun, type JobStatus } from '@worker/queues/job-run';
import { STATUS_ORDER, getQueueLabel } from '@worker/queues/job-run-ui';
import { css } from 'styled-system/css';

const ADMIN_ACTIONS = [
    {
        label: 'Nachrichten-Zentrale',
        description: 'System-Nachrichten an Benutzer oder Gruppen senden.',
        href: '/admin/notifications',
        icon: Bell,
    },
    {
        label: 'Moderations-Queue',
        description: 'Gemeldete Inhalte prüfen, freigeben oder ablehnen.',
        href: '/moderation',
        icon: ShieldAlert,
    },
    {
        label: 'Content Moderation',
        description: 'Startseite: Highlight-Rezept & Top-User auswählen.',
        href: '/admin/content',
        icon: Settings,
    },
    {
        label: 'Benutzerverwaltung',
        description: 'Benutzerkonten verwalten, Rollen zuweisen.',
        href: '/admin/accounts',
        icon: Users,
    },
    {
        label: 'Rezepte',
        description: 'Rezepte verwalten und archivieren.',
        href: '/admin/recipes',
        icon: BookOpen,
    },
    {
        label: 'Zutaten',
        description: 'Zutaten und Kategorien verwalten.',
        href: '/admin/ingredients',
        icon: Activity,
    },
    {
        label: 'Tags',
        description: 'Schlagwörter verwalten.',
        href: '/admin/tags',
        icon: Tag,
    },
    {
        label: 'Kategorien',
        description: 'Rezept-Kategorien verwalten und sortieren.',
        href: '/admin/categories',
        icon: LayoutList,
    },
    {
        label: 'Worker Dashboard',
        description: 'Jobläufe, Zustände und Timeouts im Blick behalten.',
        href: '/admin/worker',
        icon: Activity,
    },
    {
        label: 'KI-Imports',
        description: 'Import-Verlauf, Kosten und Rezept-Zuweisung.',
        href: '/admin/imports',
        icon: Sparkles,
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

async function getDashboardStats() {
    const [totalUsers, activeUsers, adminUsers, totalRecipes, publishedRecipes, draftRecipes] =
        await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { isActive: true } }),
            prisma.user.count({ where: { role: 'ADMIN' } }),
            prisma.recipe.count(),
            prisma.recipe.count({ where: { status: 'PUBLISHED' } }),
            prisma.recipe.count({ where: { status: 'DRAFT' } }),
        ]);

    return {
        users: { total: totalUsers, active: activeUsers, admins: adminUsers },
        recipes: { total: totalRecipes, published: publishedRecipes, drafts: draftRecipes },
    };
}

export default async function AdminHomePage() {
    const session = await getServerAuthSession();
    const [jobRuns, stats] = await Promise.all([getJobRuns({ limit: 12 }), getDashboardStats()]);
    const statusCounts = buildStatusCounts(jobRuns);
    const recentFailures = jobRuns.filter((run) => run.status === 'FAILED').slice(0, 4);

    const greetingName = session?.user?.name ?? 'Admin';

    return (
        <PageShell>
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '6' })}>
                <section
                    className={css({
                        borderRadius: '2xl',
                        borderWidth: '1px',
                        borderColor: 'border.muted',
                        background: 'surface',
                        padding: { base: '4', md: '6' },
                        display: 'flex',
                        flexDirection: { base: 'column', md: 'row' },
                        gap: '4',
                    })}
                >
                    <div>
                        <p
                            className={css({
                                fontSize: 'xs',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5em',
                                color: 'foreground.muted',
                                marginBottom: '2',
                            })}
                        >
                            Admin Center
                        </p>
                        <h1
                            className={css({
                                fontSize: { base: '3xl', md: '4xl' },
                                fontWeight: 'semibold',
                                color: 'foreground',
                            })}
                        >
                            Willkommen zurück, {greetingName}
                        </h1>
                        <p
                            className={css({
                                maxWidth: '3xl',
                                color: 'foreground.muted',
                                marginTop: '2',
                            })}
                        >
                            Überwache Benutzer, Rezepte und Hintergrundprozesse an einem zentralen
                            Ort.
                        </p>
                        <div
                            className={css({
                                marginTop: '3',
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '3',
                            })}
                        >
                            <Link
                                href="/admin/accounts"
                                className={css({
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2',
                                    borderRadius: 'full',
                                    borderWidth: '1px',
                                    borderColor: 'border',
                                    paddingX: '4',
                                    paddingY: '2',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.3em',
                                    fontSize: 'xs',
                                    fontWeight: 'semibold',
                                    color: 'foreground',
                                    background: 'surface.elevated',
                                    textDecoration: 'none',
                                })}
                            >
                                <Users size={14} />
                                <span>Benutzer</span>
                            </Link>
                            <Link
                                href="/admin/worker"
                                className={css({
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2',
                                    borderRadius: 'full',
                                    borderWidth: '1px',
                                    borderColor: 'border.muted',
                                    paddingX: '4',
                                    paddingY: '2',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.3em',
                                    fontSize: 'xs',
                                    fontWeight: 'semibold',
                                    color: 'foreground.muted',
                                    textDecoration: 'none',
                                })}
                            >
                                <ShieldCheck size={14} />
                                <span>Worker</span>
                            </Link>
                        </div>
                    </div>
                </section>

                <section
                    className={css({
                        display: 'grid',
                        gap: '3',
                        gridTemplateColumns: {
                            base: 'repeat(2, minmax(0, 1fr))',
                            sm: 'repeat(3, minmax(0, 1fr))',
                            lg: 'repeat(6, minmax(0, 1fr))',
                        },
                    })}
                >
                    <div
                        className={css({
                            borderRadius: '2xl',
                            borderWidth: '1px',
                            borderColor: 'border.muted',
                            background: 'surface.elevated',
                            padding: '4',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1',
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
                            Benutzer
                        </p>
                        <p
                            className={css({
                                fontSize: '2xl',
                                fontWeight: 'semibold',
                                color: 'foreground',
                            })}
                        >
                            {stats.users.total}
                        </p>
                        <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                            {stats.users.active} aktiv
                        </span>
                    </div>

                    <div
                        className={css({
                            borderRadius: '2xl',
                            borderWidth: '1px',
                            borderColor: 'border.muted',
                            background: 'surface.elevated',
                            padding: '4',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1',
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
                            Admins
                        </p>
                        <p
                            className={css({
                                fontSize: '2xl',
                                fontWeight: 'semibold',
                                color: 'foreground',
                            })}
                        >
                            {stats.users.admins}
                        </p>
                        <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                            Administratoren
                        </span>
                    </div>

                    <div
                        className={css({
                            borderRadius: '2xl',
                            borderWidth: '1px',
                            borderColor: 'border.muted',
                            background: 'surface.elevated',
                            padding: '4',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1',
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
                            Rezepte
                        </p>
                        <p
                            className={css({
                                fontSize: '2xl',
                                fontWeight: 'semibold',
                                color: 'foreground',
                            })}
                        >
                            {stats.recipes.total}
                        </p>
                        <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                            {stats.recipes.published} veröffentlicht
                        </span>
                    </div>

                    <div
                        className={css({
                            borderRadius: '2xl',
                            borderWidth: '1px',
                            borderColor: 'border.muted',
                            background: 'surface.elevated',
                            padding: '4',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1',
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
                            Entwürfe
                        </p>
                        <p
                            className={css({
                                fontSize: '2xl',
                                fontWeight: 'semibold',
                                color: 'foreground',
                            })}
                        >
                            {stats.recipes.drafts}
                        </p>
                        <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                            Unveröffentlicht
                        </span>
                    </div>

                    <div
                        className={css({
                            borderRadius: '2xl',
                            borderWidth: '1px',
                            borderColor: 'border.muted',
                            background: 'surface.elevated',
                            padding: '4',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1',
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
                            Fehler
                        </p>
                        <p
                            className={css({
                                fontSize: '2xl',
                                fontWeight: 'semibold',
                                color: 'red.500',
                            })}
                        >
                            {statusCounts.FAILED ?? 0}
                        </p>
                        <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                            von {jobRuns.length} Jobs
                        </span>
                    </div>

                    <div
                        className={css({
                            borderRadius: '2xl',
                            borderWidth: '1px',
                            borderColor: 'border.muted',
                            background: 'surface.elevated',
                            padding: '4',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1',
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
                        <p
                            className={css({
                                fontSize: '2xl',
                                fontWeight: 'semibold',
                                color: 'foreground',
                            })}
                        >
                            {jobRuns.length}
                        </p>
                        <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                            Letzte 12
                        </span>
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
                                    color: 'foreground.muted',
                                })}
                            >
                                Schnellzugriff
                            </p>
                            <h2
                                className={css({
                                    fontSize: 'lg',
                                    fontWeight: 'semibold',
                                    color: 'foreground',
                                })}
                            >
                                Schnelle Aktionen
                            </h2>
                        </div>
                        <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                            Alle Links öffnen neue Steueransichten
                        </span>
                    </div>
                    <div
                        className={css({
                            display: 'grid',
                            gap: '3',
                            gridTemplateColumns: {
                                base: '1fr',
                                sm: 'repeat(2, minmax(0, 1fr))',
                                lg: 'repeat(3, minmax(0, 1fr))',
                            },
                        })}
                    >
                        {ADMIN_ACTIONS.map((action) => (
                            <Link
                                key={action.label}
                                href={action.href}
                                className={css({
                                    borderRadius: '2xl',
                                    borderWidth: '1px',
                                    borderColor: 'border.muted',
                                    background: 'surface',
                                    padding: '4',
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3',
                                })}
                            >
                                <div
                                    className={css({
                                        borderRadius: 'lg',
                                        borderWidth: '1px',
                                        borderColor: 'border',
                                        padding: '2',
                                        background: 'surface.elevated',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    })}
                                >
                                    <action.icon size={18} />
                                </div>
                                <div>
                                    <p
                                        className={css({
                                            fontSize: 'sm',
                                            fontWeight: 'semibold',
                                            color: 'foreground',
                                        })}
                                    >
                                        {action.label}
                                    </p>
                                    <p
                                        className={css({
                                            fontSize: 'xs',
                                            color: 'foreground.muted',
                                        })}
                                    >
                                        {action.description}
                                    </p>
                                </div>
                            </Link>
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
                                    color: 'foreground.muted',
                                })}
                            >
                                Letzte Fehler
                            </p>
                            <h2
                                className={css({
                                    fontSize: 'lg',
                                    fontWeight: 'semibold',
                                    color: 'foreground',
                                })}
                            >
                                Problematische Jobs
                            </h2>
                        </div>
                        <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                            {recentFailures.length} Einträge
                        </span>
                    </div>
                    {recentFailures.length === 0 ? (
                        <p className={css({ color: 'foreground.muted' })}>
                            Keine Fehler in diesem Zeitraum.
                        </p>
                    ) : (
                        <div
                            className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}
                        >
                            {recentFailures.map((run) => (
                                <div
                                    key={run.id}
                                    className={css({
                                        borderRadius: 'xl',
                                        borderWidth: '1px',
                                        borderColor: 'border',
                                        background: 'surface',
                                        padding: '3',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1',
                                    })}
                                >
                                    <div
                                        className={css({
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            gap: '2',
                                            flexWrap: 'wrap',
                                        })}
                                    >
                                        <p
                                            className={css({
                                                fontSize: 'sm',
                                                fontWeight: 'semibold',
                                                color: 'foreground',
                                            })}
                                        >
                                            {run.jobName}
                                        </p>
                                        <span
                                            className={css({
                                                fontSize: 'xs',
                                                color: 'foreground.muted',
                                            })}
                                        >
                                            {getQueueLabel(run.queueName)} ·{' '}
                                            {formatDate(run.createdAt)}
                                        </span>
                                    </div>
                                    <p
                                        className={css({
                                            fontSize: 'sm',
                                            color: 'foreground.muted',
                                        })}
                                    >
                                        {run.errorMessage ?? 'Keine Fehlermeldung verfügbar.'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </PageShell>
    );
}
