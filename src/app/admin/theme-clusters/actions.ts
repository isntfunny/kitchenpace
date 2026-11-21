'use server';

import { revalidatePath, updateTag } from 'next/cache';

import { ensureAdminSession } from '@app/lib/admin/ensure-admin';
import { approveClusterRun, setClusterActive } from '@app/lib/theme-clusters/approval';
import { THEME_CLUSTER_CACHE_TAG } from '@app/lib/theme-clusters/queries';

function refresh() {
    updateTag(THEME_CLUSTER_CACHE_TAG);
    revalidatePath('/admin/theme-clusters');
    revalidatePath('/recipes');
}

/** Form action: releases the run `runId` (the labels were reviewed on this page). */
export async function approveRunAction(formData: FormData) {
    const session = await ensureAdminSession('admin/theme-clusters');
    const runId = String(formData.get('runId') ?? '');
    const result = await approveClusterRun(runId, session.user.id);
    if (!result.ok) throw new Error(result.reason);
    refresh();
}

/** Form action: hides (`active=false`) or shows (`active=true`) one theme of a released run. */
export async function setClusterActiveAction(formData: FormData) {
    await ensureAdminSession('admin/theme-clusters');
    const clusterId = String(formData.get('clusterId') ?? '');
    const active = formData.get('active') === 'true';
    const result = await setClusterActive(clusterId, active);
    if (!result.ok) throw new Error(result.reason);
    refresh();
}
