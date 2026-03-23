import { ensureAdminSession } from '@app/lib/admin/ensure-admin';
import { prisma } from '@shared/prisma';

import { css } from 'styled-system/css';

import { RecipesTable } from './recipes-table';

export const dynamic = 'force-dynamic';

async function getRecipes() {
    const recipes = await prisma.recipe.findMany({
        select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            difficulty: true,
            rating: true,
            ratingCount: true,
            viewCount: true,
            cookCount: true,
            createdAt: true,
            publishedAt: true,
            isTrending: true,
            flowNodes: true,
            author: {
                select: {
                    id: true,
                    name: true,
                },
            },
            _count: {
                select: {
                    comments: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: 500,
    });

    return recipes.map(({ author, _count, flowNodes, createdAt, publishedAt, ...rest }) => ({
        ...rest,
        createdAt: createdAt.toISOString(),
        publishedAt: publishedAt?.toISOString() ?? null,
        authorId: author.id,
        authorName: author.name ?? '—',
        commentCount: _count.comments,
        nodeCount: flowNodes ? (flowNodes as unknown[]).length : 0,
    }));
}

export default async function RecipesPage() {
    await ensureAdminSession('admin-recipes');
    const recipes = await getRecipes();

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '6' })}>
            <RecipesTable recipes={recipes} />
        </div>
    );
}
