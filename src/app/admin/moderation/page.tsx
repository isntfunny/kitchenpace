import { ensureModeratorSession } from '@app/lib/admin/ensure-moderator';
import { prisma } from '@shared/prisma';

import { css } from 'styled-system/css';

import { IngredientReviewTable } from './ingredient-review-table';
import { ModerationHistoryTable } from './moderation-history-table';
import { ModerationQueueTable } from './moderation-queue-table';
import { ReportsTable } from './reports-table';

export const dynamic = 'force-dynamic';

export default async function ModerationPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>;
}) {
    await ensureModeratorSession('moderation');
    const params = await searchParams;
    const tab = params.tab ?? 'queue';

    const [pendingCount, reportCount, todayActionCount, ingredientReviewCount] = await Promise.all([
        prisma.moderationQueue.count({ where: { status: 'PENDING' } }),
        prisma.report.count({ where: { resolved: false } }),
        prisma.moderationLog.count({
            where: {
                createdAt: { gte: startOfDay() },
            },
        }),
        prisma.ingredient.count({ where: { needsReview: true } }),
    ]);

    return (
        <>
            {/* Stats row */}
            <div
                className={css({
                    display: 'grid',
                    gridTemplateColumns: { base: '1fr 1fr', md: 'repeat(4, 1fr)' },
                    gap: '3',
                })}
            >
                <StatCard
                    value={pendingCount}
                    label="Ausstehend"
                    variant={pendingCount > 0 ? 'warning' : 'success'}
                />
                <StatCard
                    value={reportCount}
                    label="Meldungen"
                    variant={reportCount > 0 ? 'danger' : 'success'}
                />
                <StatCard
                    value={ingredientReviewCount}
                    label="Zutaten-Review"
                    variant={ingredientReviewCount > 0 ? 'warning' : 'success'}
                />
                <StatCard value={todayActionCount} label="Aktionen heute" variant="neutral" />
            </div>

            {/* Tab content */}
            {tab === 'reports' && <ReportsSection />}
            {tab === 'ingredients' && <IngredientsSection />}
            {tab === 'history' && <HistorySection />}
            {tab !== 'reports' && tab !== 'history' && tab !== 'ingredients' && <QueueSection />}
        </>
    );
}

async function QueueSection() {
    const items = await prisma.moderationQueue.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        include: {
            author: {
                select: { id: true, name: true, email: true },
            },
        },
        take: 100,
    });

    return <ModerationQueueTable items={items} />;
}

async function ReportsSection() {
    const reports = await prisma.report.findMany({
        where: { resolved: false },
        orderBy: { createdAt: 'desc' },
        include: {
            reporter: {
                select: { id: true, name: true, email: true },
            },
        },
        take: 100,
    });

    return <ReportsTable reports={reports} />;
}

async function HistorySection() {
    // Audit log entries (human actions)
    const logs = await prisma.moderationLog.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            actor: {
                select: { id: true, name: true, email: true },
            },
        },
        take: 100,
    });

    // Auto-approved + auto-rejected items (AI decisions, no human reviewer)
    const autoItems = await prisma.moderationQueue.findMany({
        where: {
            status: { in: ['AUTO_APPROVED', 'REJECTED'] },
            reviewedBy: null,
        },
        orderBy: { createdAt: 'desc' },
        include: {
            author: {
                select: { id: true, name: true, email: true },
            },
        },
        take: 200,
    });

    return <ModerationHistoryTable logs={logs} autoItems={autoItems} />;
}

function StatCard({
    value,
    label,
    variant,
}: {
    value: number;
    label: string;
    variant: 'warning' | 'danger' | 'success' | 'neutral';
}) {
    const colors = {
        warning: {
            bg: { base: 'rgba(245,158,11,0.1)', _dark: 'rgba(245,158,11,0.15)' },
            border: { base: 'rgba(245,158,11,0.3)', _dark: 'rgba(245,158,11,0.4)' },
        },
        danger: {
            bg: { base: 'rgba(239,68,68,0.1)', _dark: 'rgba(239,68,68,0.15)' },
            border: { base: 'rgba(239,68,68,0.3)', _dark: 'rgba(239,68,68,0.4)' },
        },
        success: {
            bg: { base: 'rgba(34,197,94,0.1)', _dark: 'rgba(34,197,94,0.15)' },
            border: { base: 'rgba(34,197,94,0.3)', _dark: 'rgba(34,197,94,0.4)' },
        },
        neutral: { bg: 'surface.muted', border: 'border.muted' },
    };
    const c = colors[variant];

    return (
        <div
            className={css({
                px: '4',
                py: '3',
                borderRadius: 'xl',
                border: '1px solid',
                borderColor: c.border,
                bg: c.bg,
            })}
        >
            <span className={css({ fontSize: '2xl', fontWeight: '800', color: 'foreground' })}>
                {value}
            </span>
            <span className={css({ fontSize: 'sm', color: 'foreground.muted', ml: '2' })}>
                {label}
            </span>
        </div>
    );
}

async function IngredientsSection() {
    const ingredients = await prisma.ingredient.findMany({
        where: { needsReview: true },
        orderBy: { createdAt: 'desc' },
        include: {
            ingredientUnits: {
                include: { unit: { select: { shortName: true } } },
            },
            _count: { select: { recipes: true } },
        },
        take: 100,
    });

    return <IngredientReviewTable ingredients={ingredients} />;
}

function startOfDay(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}
