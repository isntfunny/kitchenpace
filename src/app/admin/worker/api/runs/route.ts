'use server';

import { NextResponse } from 'next/server';

import { getJobRuns } from '@worker/queues/job-run';

export async function GET() {
    const runs = await getJobRuns({ limit: 30 });
    return NextResponse.json(runs);
}
