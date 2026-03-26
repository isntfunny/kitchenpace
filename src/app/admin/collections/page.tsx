import { ensureModeratorSession } from '@app/lib/admin/ensure-moderator';
import { prisma } from '@shared/prisma';

import { css } from 'styled-system/css';

import { CollectionsTable } from './collections-table';

export const dynamic = 'force-dynamic';

async function getCollections() {
    const collections = await prisma.collection.findMany({
        select: {
            id: true,
            title: true,
            slug: true,
            published: true,
            template: true,
            viewCount: true,
            moderationStatus: true,
            createdAt: true,
            author: {
                select: {
                    id: true,
                    name: true,
                },
            },
            _count: {
                select: {
                    recipes: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: 500,
    });

    return collections.map(({ author, _count, createdAt, ...rest }) => ({
        ...rest,
        createdAt: createdAt.toISOString(),
        authorId: author.id,
        authorName: author.name ?? '\u2014',
        recipeCount: _count.recipes,
    }));
}

export default async function CollectionsPage() {
    await ensureModeratorSession('admin-collections');
    const collections = await getCollections();

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '6' })}>
            <CollectionsTable collections={collections} />
        </div>
    );
}
