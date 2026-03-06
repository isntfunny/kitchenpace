import { NextResponse } from 'next/server';

import { fetchPinnedEntries } from '@app/app/api/recipe-tabs/helpers';
import { getServerAuthSession, logMissingSession } from '@app/lib/auth';
import { prisma } from '@shared/prisma';

const MAX_RECENT = 5;

export async function GET() {
    const session = await getServerAuthSession('api/recipe-tabs:GET');

    if (!session?.user?.id) {
        logMissingSession(session, 'api/recipe-tabs:GET');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const [{ entries: pinned }, recentViews] = await Promise.all([
        fetchPinnedEntries(userId),
        prisma.userViewHistory.findMany({
            where: { userId },
            include: {
                recipe: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        imageKey: true,
                        prepTime: true,
                        cookTime: true,
                        difficulty: true,
                    },
                },
            },
            orderBy: { viewedAt: 'desc' },
            // fetch extra to account for pinned items being filtered out
            take: MAX_RECENT + 3,
        }),
    ]);

    const pinnedIds = new Set(pinned.map((p) => p.id));

    const recent = recentViews
        .filter((view) => !pinnedIds.has(view.recipe.id))
        .slice(0, MAX_RECENT)
        .map((view) => ({
            id: view.recipe.id,
            title: view.recipe.title,
            slug: view.recipe.slug ?? undefined,
            imageKey: view.recipe.imageKey,
            prepTime: view.recipe.prepTime ?? undefined,
            cookTime: view.recipe.cookTime ?? undefined,
            difficulty: view.recipe.difficulty ?? undefined,
            viewedAt: view.viewedAt.toISOString(),
        }));

    return NextResponse.json({ pinned, recent });
}
