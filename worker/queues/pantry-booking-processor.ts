import { Job } from 'bullmq';

import { bookPastEntries, type PastBookingReport } from '@app/lib/pantry/book';

import { prisma } from './prisma';
import type { BookAssumedCookedJob } from './types';

/**
 * Nightly "assumed cooked" (KUC-107): books plan entries of past days that were never booked
 * into the pantry (no "Gekocht" tap). Uses the same booking as the button; idempotent, so a
 * re-run or a late tap never deducts twice. `dryRun` reports without writing.
 */
export async function processBookAssumedCooked(
    job: Job<BookAssumedCookedJob>,
): Promise<PastBookingReport> {
    const dryRun = job.data.dryRun === true;
    console.log(
        `[PantryBooking] Starting book-assumed-cooked job ${job.id} (${dryRun ? 'dry run' : 'write'})`,
    );
    const report = await bookPastEntries(prisma, new Date(), { dryRun, limit: job.data.limit });
    console.log(
        `[PantryBooking] ${dryRun ? 'Would book' : 'Booked'} ${report.entries} entries, ${report.updatedPosts} pantry posts, ${report.failed} failed`,
    );
    return report;
}
