import Link from 'next/link';

import { ensureAdminSession } from '@app/lib/admin/ensure-admin';
import {
    getClusterRunDetail,
    getLiveRunId,
    listClusterRuns,
} from '@app/lib/theme-clusters/queries';
import { clusterSearchHref } from '@shared/theme-clusters/href';
import { canApproveRun } from '@shared/theme-clusters/release';
import { termsFromStored } from '@shared/theme-clusters/snapshot';

import { css } from 'styled-system/css';

import { approveRunAction, setClusterActiveAction } from './actions';

export const dynamic = 'force-dynamic';

const STATUS_LABEL = { RUNNING: 'Läuft', COMPLETED: 'Abgeschlossen', FAILED: 'Fehlgeschlagen' };

const formatDate = (date: Date | null) =>
    date
        ? date.toLocaleString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
          })
        : '–';

const buttonClass = css({
    paddingX: '3',
    paddingY: '1.5',
    borderRadius: 'lg',
    borderWidth: '1px',
    borderColor: 'border.muted',
    background: 'surface.elevated',
    color: 'foreground',
    fontSize: 'sm',
    fontWeight: '600',
    cursor: 'pointer',
    _hover: { borderColor: 'accent' },
});

const primaryButtonClass = css({
    paddingX: '4',
    paddingY: '2',
    borderRadius: 'lg',
    background: 'accent',
    color: 'white',
    fontSize: 'sm',
    fontWeight: '600',
    cursor: 'pointer',
});

const cellClass = css({ paddingX: '3', paddingY: '2', verticalAlign: 'top', fontSize: 'sm' });
const mutedClass = css({ color: 'foreground.muted', fontSize: 'xs' });

function coverageOf(topTerms: unknown): number | null {
    const value = (topTerms as { filterCoverage?: unknown } | null)?.filterCoverage;
    return typeof value === 'number' ? value : null;
}

export default async function ThemeClustersPage({
    searchParams,
}: {
    searchParams: Promise<{ run?: string }>;
}) {
    await ensureAdminSession('admin/theme-clusters');
    const { run: requestedRun } = await searchParams;

    const [runs, liveRunId] = await Promise.all([listClusterRuns(), getLiveRunId()]);
    const selectedId = requestedRun ?? runs[0]?.id;
    const run = selectedId ? await getClusterRunDetail(selectedId) : null;
    const approval = run ? canApproveRun(run) : null;

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '6' })}>
            <header className={css({ display: 'flex', flexDirection: 'column', gap: '1' })}>
                <h2
                    className={css({ fontSize: 'xl', fontWeight: 'semibold', color: 'foreground' })}
                >
                    Themen-Cluster
                </h2>
                <p className={mutedClass}>
                    Themen werden wöchentlich aus den Rezept-Embeddings berechnet (Job
                    „cluster-recipe-themes“ unter Worker). Neue Läufe bleiben unsichtbar, bis du die
                    Labels geprüft und den Lauf freigegeben hast.
                </p>
            </header>

            {runs.length === 0 ? (
                <p className={mutedClass}>Noch kein Lauf vorhanden.</p>
            ) : (
                <nav
                    aria-label="Läufe"
                    className={css({ display: 'flex', gap: '2', flexWrap: 'wrap' })}
                >
                    {runs.map((entry) => (
                        <Link
                            key={entry.id}
                            href={`/admin/theme-clusters?run=${entry.id}`}
                            className={css({
                                paddingX: '3',
                                paddingY: '1.5',
                                borderRadius: 'full',
                                borderWidth: '1px',
                                borderColor: entry.id === selectedId ? 'accent' : 'border.muted',
                                fontSize: 'xs',
                                color: 'foreground',
                            })}
                        >
                            {formatDate(entry.createdAt)} · {STATUS_LABEL[entry.status]}
                            {entry.approvedAt ? ' · freigegeben' : ''}
                        </Link>
                    ))}
                </nav>
            )}

            {run && (
                <section className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
                    <div
                        className={css({
                            display: 'flex',
                            gap: '6',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                        })}
                    >
                        <p className={css({ fontSize: 'sm', color: 'foreground' })}>
                            {STATUS_LABEL[run.status]} · {run.recipeCount} Rezepte · {run.k} Themen
                            · Modell {run.model}
                            {run.iterations !== null ? ` · ${run.iterations} Iterationen` : ''}
                            {run.stabilityRatio !== null
                                ? ` · Stabilität ${Math.round(run.stabilityRatio * 100)} %`
                                : ''}
                        </p>
                        {run.approvedAt ? (
                            <p className={mutedClass}>
                                {run.id === liveRunId ? 'Aktuell sichtbar · ' : 'Früherer Lauf · '}
                                Freigegeben am {formatDate(run.approvedAt)}
                                {run.approvedBy?.name ? ` von ${run.approvedBy.name}` : ''}
                            </p>
                        ) : approval?.ok ? (
                            <form action={approveRunAction}>
                                <input type="hidden" name="runId" value={run.id} />
                                <button type="submit" className={primaryButtonClass}>
                                    Lauf freigeben
                                </button>
                            </form>
                        ) : (
                            <p className={mutedClass}>
                                {approval && !approval.ok && approval.reason}
                            </p>
                        )}
                    </div>
                    {run.error && (
                        <p className={css({ color: 'red.500', fontSize: 'sm' })}>{run.error}</p>
                    )}

                    <table className={css({ width: '100%', borderCollapse: 'collapse' })}>
                        <thead>
                            <tr
                                className={css({
                                    textAlign: 'left',
                                    fontSize: 'xs',
                                    color: 'foreground.muted',
                                })}
                            >
                                <th className={cellClass}>Thema</th>
                                <th className={cellClass}>Rezepte</th>
                                <th className={cellClass}>Begriffe</th>
                                <th className={cellClass}>Suche</th>
                                <th className={cellClass}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {run.clusters.map((cluster) => {
                                const href = clusterSearchHref({
                                    tags: cluster.filterTags,
                                    categories: cluster.filterCategories,
                                });
                                const coverage = coverageOf(cluster.topTerms);
                                return (
                                    <tr
                                        key={cluster.id}
                                        className={css({
                                            borderTopWidth: '1px',
                                            borderColor: 'border.muted',
                                        })}
                                    >
                                        <td className={cellClass}>
                                            <strong>{cluster.label}</strong>
                                            <div className={mutedClass}>{cluster.key}</div>
                                        </td>
                                        <td className={cellClass}>{cluster.size}</td>
                                        <td className={cellClass}>
                                            {termsFromStored(cluster.topTerms).join(', ') || '–'}
                                        </td>
                                        <td className={cellClass}>
                                            <Link
                                                href={href}
                                                target="_blank"
                                                className={css({ color: 'accent' })}
                                            >
                                                {href}
                                            </Link>
                                            {coverage !== null && (
                                                <div className={mutedClass}>
                                                    findet {Math.round(coverage * 100)} % der
                                                    Rezepte
                                                </div>
                                            )}
                                        </td>
                                        <td className={cellClass}>
                                            {!cluster.eligible ? (
                                                <span className={mutedClass}>nicht geeignet</span>
                                            ) : run.id === liveRunId ? (
                                                <form action={setClusterActiveAction}>
                                                    <input
                                                        type="hidden"
                                                        name="clusterId"
                                                        value={cluster.id}
                                                    />
                                                    <input
                                                        type="hidden"
                                                        name="active"
                                                        value={cluster.active ? 'false' : 'true'}
                                                    />
                                                    <button type="submit" className={buttonClass}>
                                                        {cluster.active
                                                            ? 'Ausblenden'
                                                            : 'Einblenden'}
                                                    </button>
                                                </form>
                                            ) : (
                                                <span className={mutedClass}>
                                                    wartet auf Freigabe
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </section>
            )}
        </div>
    );
}
