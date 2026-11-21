import { getLiveRunId } from '@app/lib/theme-clusters/queries';
import { prisma } from '@shared/prisma';
import {
    canApproveRun,
    canToggleCluster,
    clustersToActivate,
} from '@shared/theme-clusters/release';

export type ApprovalResult = { ok: true } | { ok: false; reason: string };

/**
 * Releases a run after the admin reviewed its labels: stamps the approval, switches on the
 * run's eligible clusters and switches off every cluster of other runs, so exactly one run
 * is live. One transaction: readers never see two runs mixed.
 */
export async function approveClusterRun(
    runId: string,
    adminUserId: string,
): Promise<ApprovalResult> {
    const run = await prisma.recipeClusterRun.findUnique({
        where: { id: runId },
        select: {
            status: true,
            approvedAt: true,
            clusters: { select: { id: true, eligible: true } },
        },
    });
    if (!run) return { ok: false, reason: 'Lauf nicht gefunden.' };

    const decision = canApproveRun(run);
    if (!decision.ok) return decision;

    const activate = clustersToActivate(run.clusters);
    await prisma.$transaction([
        prisma.recipeCluster.updateMany({
            where: { runId: { not: runId }, active: true },
            data: { active: false },
        }),
        prisma.recipeCluster.updateMany({
            where: { id: { in: activate } },
            data: { active: true },
        }),
        prisma.recipeCluster.updateMany({
            where: { runId, id: { notIn: activate } },
            data: { active: false },
        }),
        prisma.recipeClusterRun.update({
            where: { id: runId },
            data: { approvedAt: new Date(), approvedById: adminUserId },
        }),
    ]);
    return { ok: true };
}

/** Hides or shows a single cluster of an approved run. */
export async function setClusterActive(
    clusterId: string,
    active: boolean,
): Promise<ApprovalResult> {
    const cluster = await prisma.recipeCluster.findUnique({
        where: { id: clusterId },
        select: { eligible: true, runId: true, run: { select: { approvedAt: true } } },
    });
    if (!cluster) return { ok: false, reason: 'Thema nicht gefunden.' };

    const decision = canToggleCluster(cluster.run, cluster, active);
    if (!decision.ok) return decision;

    // Older released runs are history: toggling them would mix two runs on the site
    if ((await getLiveRunId()) !== cluster.runId) {
        return {
            ok: false,
            reason: 'Nur Themen des aktuell freigegebenen Laufs lassen sich ein- oder ausblenden.',
        };
    }

    await prisma.recipeCluster.update({ where: { id: clusterId }, data: { active } });
    return { ok: true };
}
