import { ensureAdminSession } from '@app/lib/admin/ensure-admin';
import { prisma } from '@shared/prisma';

import { css } from 'styled-system/css';

import { TagsTable } from './tags-table';

export const dynamic = 'force-dynamic';

async function getTags() {
    const tags = await prisma.tag.findMany({
        select: {
            id: true,
            name: true,
            slug: true,
            _count: {
                select: {
                    recipes: true,
                },
            },
        },
        orderBy: {
            name: 'asc',
        },
        take: 500,
    });

    return tags.map(({ _count, ...rest }) => ({
        ...rest,
        recipeCount: _count.recipes,
    }));
}

export default async function TagsPage() {
    await ensureAdminSession('admin-tags');
    const tags = await getTags();

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '6' })}>
            <TagsTable tags={tags} />
        </div>
    );
}
