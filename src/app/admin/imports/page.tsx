import sumBy from 'lodash/sumBy';

import { PageShell } from '@app/components/layouts/PageShell';
import { prisma } from '@shared/prisma';

import { css } from 'styled-system/css';

import { ImportsTable, type ImportRunRow } from './imports-table';

export const dynamic = 'force-dynamic';

async function getImportRuns(): Promise<ImportRunRow[]> {
    const runs = await prisma.importRun.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
            user: { select: { id: true, name: true } },
            recipe: { select: { id: true, title: true, slug: true, status: true } },
        },
    });

    return runs.map((run) => ({
        id: run.id,
        createdAt: run.createdAt.toISOString(),
        status: run.status as ImportRunRow['status'],
        sourceType: run.sourceType,
        sourceUrl: run.sourceUrl,
        markdownLength: run.markdownLength,
        model: run.model,
        inputTokens: run.inputTokens,
        cachedInputTokens: run.cachedInputTokens,
        outputTokens: run.outputTokens,
        estimatedCostUsd: run.estimatedCostUsd,
        errorType: run.errorType,
        errorMessage: run.errorMessage,
        rawApiResponse: run.rawApiResponse ?? null,
        userName: run.user.name ?? '—',
        userId: run.user.id,
        recipeId: run.recipe?.id ?? null,
        recipeTitle: run.recipe?.title ?? null,
        recipeStatus: run.recipe?.status ?? null,
        recipeSlug: run.recipe?.slug ?? null,
    }));
}

export default async function ImportsPage() {
    const runs = await getImportRuns();

    const totalCost = sumBy(runs, (r) => r.estimatedCostUsd ?? 0);
    const successCount = runs.filter((r) => r.status === 'SUCCESS').length;
    const failedCount = runs.filter((r) => r.status === 'FAILED').length;

    return (
        <PageShell>
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '6' })}>
                <header
                    className={css({
                        borderRadius: '2xl',
                        borderWidth: '1px',
                        borderColor: 'border.muted',
                        background: 'surface',
                        padding: { base: '4', md: '5' },
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
                        Admin · KI-Import
                    </p>
                    <h1
                        className={css({
                            fontSize: '3xl',
                            fontWeight: 'semibold',
                            color: 'foreground',
                            marginTop: '1',
                        })}
                    >
                        Import-Verlauf
                    </h1>
                    <p className={css({ marginTop: '2', color: 'foreground.muted' })}>
                        Alle KI-Importläufe mit Kosten, Tokens und verknüpften Rezepten.
                    </p>
                </header>

                <div
                    className={css({
                        display: 'grid',
                        gap: '3',
                        gridTemplateColumns: {
                            base: 'repeat(2, minmax(0, 1fr))',
                            md: 'repeat(4, minmax(0, 1fr))',
                        },
                    })}
                >
                    {[
                        { label: 'Gesamt', value: String(runs.length), sub: 'Läufe' },
                        { label: 'Erfolgreich', value: String(successCount), sub: 'SUCCESS' },
                        { label: 'Fehler', value: String(failedCount), sub: 'FAILED' },
                        {
                            label: 'Gesamtkosten',
                            value: `$${totalCost.toFixed(4)}`,
                            sub: 'geschätzt USD',
                        },
                    ].map((stat) => (
                        <div
                            key={stat.label}
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
                                {stat.label}
                            </p>
                            <p
                                className={css({
                                    fontSize: '2xl',
                                    fontWeight: 'semibold',
                                    color: 'foreground',
                                    fontFamily: 'mono',
                                })}
                            >
                                {stat.value}
                            </p>
                            <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                                {stat.sub}
                            </span>
                        </div>
                    ))}
                </div>

                <ImportsTable runs={runs} />
            </div>
        </PageShell>
    );
}
