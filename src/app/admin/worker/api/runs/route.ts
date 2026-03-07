import { NextResponse } from 'next/server';

import { ensureAdminSession } from '@app/lib/admin/ensure-admin';
import { getJobRuns } from '@worker/queues/job-run';

export async function GET() {
    await ensureAdminSession('admin-worker-api-runs');
    const runs = await getJobRuns({ limit: 30 });
    return NextResponse.json(runs);
}
