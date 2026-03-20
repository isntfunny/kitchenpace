# S3 Bucket Cleanup Job

**Date:** 2026-03-20
**Status:** Draft

## Problem

S3 accumulates orphaned files over time:

- Failed/abandoned uploads that never completed moderation
- Approved images whose parent entity (recipe, comment, profile, etc.) was deleted
- Thumbnail cache entries whose originals no longer exist

There is no mechanism to detect or remove these dead files.

## Solution

A BullMQ repeatable job (`s3-cleanup`) that scans the bucket weekly, identifies orphaned files, and deletes them with conservative safety guards.

## Rules

| S3 Prefix   | Action           | Min Age | Orphan Condition                                  |
| ----------- | ---------------- | ------- | ------------------------------------------------- |
| `uploads/`  | Delete           | 30 days | Key not referenced in any DB image field          |
| `approved/` | Delete           | 7 days  | Key not referenced in any DB image field          |
| `thumbs/`   | Delete           | 7 days  | No original exists (hash not in known-hashes set) |
| `trash/`    | **Never delete** | —       | Retained for legal/compliance purposes            |

## Architecture

### Job Registration

- **Queue:** `SCHEDULED` (existing queue for periodic jobs)
- **Job name:** `s3-cleanup`
- **Schedule:** `0 3 * * 0` (Sunday 03:00)
- **Concurrency:** 1 (never parallel)

### Three-Phase Execution

The job runs 3 sequential phases. Each phase is independent — a failure in one does not prevent the others from running. All errors are collected in an `errors` array.

**Note on S3 listing:** The existing `listByPrefix()` helper does not paginate and only returns key strings (no `LastModified`). The cleanup job must use `ListObjectsV2Command` directly with a `ContinuationToken` pagination loop (as `processCachePurge` already does) and collect both `Key` and `LastModified` from each object.

#### Phase 1: Scan `uploads/`

1. Paginated `ListObjectsV2` on `uploads/` prefix — collect all `{ key, lastModified, size }` tuples
2. Filter to keys where `lastModified` is older than 30 days
3. Batch-query all DB tables with image fields: check if key exists in any of them
4. Keys not found in any table = orphan
5. Batch-delete orphans via `DeleteObjects` API
6. Collect deleted keys and freed bytes
7. **Build hash set:** Run `keyHash(key)` on ALL listed keys (regardless of age filter) and add to `knownHashes` set

#### Phase 2: Scan `approved/`

1. Paginated `ListObjectsV2` on `approved/` prefix — collect all `{ key, lastModified, size }` tuples
2. Filter to keys where `lastModified` is older than 7 days
3. Same DB lookup as Phase 1
4. Keys not found = orphan
5. Batch-delete, collect results
6. **Extend hash set:** Run `keyHash(key)` on ALL listed keys (regardless of age filter) and add to `knownHashes` set

**Important:** The `knownHashes` set must include hashes of ALL keys found in `uploads/` and `approved/`, not just the age-filtered subset. A 2-day-old `approved/` key that is perfectly valid would otherwise have its thumbnails incorrectly deleted in Phase 3.

#### Phase 3: Scan `thumbs/`

1. Paginated `ListObjectsV2` on `thumbs/` prefix — collect all `{ key, lastModified, size }` tuples
2. Filter to keys where `lastModified` is older than 7 days
3. Exclude `thumbs/og-category/` (static category images, not derived from user uploads)
4. Extract the hash segment from each thumb key (`thumbs/{hash}/...`)
5. Check if hash exists in the `knownHashes` set from Phase 1+2
6. Hash not found = orphan thumbnail
7. Batch-delete, collect results

**Note:** There is an existing `purge-thumbnail-cache` hourly job that deletes all thumbs older than 3 days regardless of orphan status. Phase 3 serves a different purpose: it catches orphan thumbs that are younger than 3 days but whose originals are already gone, and provides a second safety net. The two jobs are complementary — the existing job handles cache freshness, Phase 3 handles orphan cleanup.

### DB Tables with Image Fields

The orphan check queries these tables/fields:

| Model             | Field           |
| ----------------- | --------------- |
| `Profile`         | `photoKey`      |
| `Recipe`          | `imageKey`      |
| `RecipeStepImage` | `photoKey`      |
| `Comment`         | `imageKey`      |
| `CookImage`       | `imageKey`      |
| `UserCookHistory` | `imageKey`      |
| `Category`        | `coverImageKey` |

A key is orphaned only if it appears in **none** of these fields.

### Job Result

Stored automatically in the `JobRun` table (existing pattern). The processor returns:

```ts
{
  success: boolean,
  uploadsScanned: number,
  uploadsDeleted: number,
  approvedScanned: number,
  approvedDeleted: number,
  thumbsScanned: number,
  thumbsDeleted: number,
  bytesFreed: number,
  deletedKeys: string[],
  errors: string[]
}
```

Visible in admin dashboard at `/admin/worker/runs`.

## Safety Guards

1. **Age thresholds are non-negotiable** — `uploads/` 30 days, `approved/` + `thumbs/` 7 days. A file younger than its threshold is never deleted, even if orphaned.

2. **Max-delete cap: 500 per run** — if more orphans are found, the job stops early with `success: false` and a warning. The next scheduled run picks up where it left off. This prevents catastrophic mass-deletion from a bug.

3. **Batch deletes** — uses S3 `DeleteObjects` API (up to 1000 keys per call) for efficiency.

4. **`trash/` is hardcoded skip** — not configurable, not parameterized. The cleanup job has no code path that can touch `trash/`.

5. **Phase independence** — each phase runs in a try/catch. A failure in Phase 1 does not prevent Phase 2 and 3 from executing.

6. **Thumbs validation uses in-memory hash set** — no additional S3 existence checks needed per thumbnail. The hash set is built as a byproduct of Phase 1+2 scans.

## Files to Create/Modify

| File                                     | Action | Purpose                                                          |
| ---------------------------------------- | ------ | ---------------------------------------------------------------- |
| `worker/queues/processors/s3-cleanup.ts` | Create | Job processor with 3-phase logic                                 |
| `worker/queues/scheduler.ts`             | Modify | Add `s3-cleanup` entry to `scheduledJobs` array                  |
| `worker/queues/worker.ts`                | Modify | Add `case 's3-cleanup'` to `QueueName.SCHEDULED` switch          |
| `worker/queues/types.ts`                 | Modify | Add `S3CleanupJob` interface and union variant                   |
| `src/lib/s3/operations.ts`               | Modify | Add `deleteObjects()` (batch delete) and `listObjectsWithMeta()` |
| `src/lib/s3/cleanup.ts`                  | Create | Core cleanup logic: `findOrphanKeys()`, `buildKnownHashSet()`    |

## Not in Scope

- Admin UI for triggering manual cleanup runs (can be added later)
- Configurable thresholds (hardcoded for safety)
- `trash/` retention policy or cleanup
- Notification/alerting on cleanup results
