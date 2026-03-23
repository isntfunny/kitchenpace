import { ensureAdminSession } from '@app/lib/admin/ensure-admin';
import { prisma } from '@shared/prisma';

import { css } from 'styled-system/css';

import { CategoriesTable } from './categories-table';

export const dynamic = 'force-dynamic';

async function getCategories() {
    const categories = await prisma.category.findMany({
        select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            color: true,
            icon: true,
            sortOrder: true,
            _count: {
                select: { recipes: true },
            },
        },
        orderBy: { sortOrder: 'asc' },
    });

    return categories.map(({ _count, ...rest }) => ({
        ...rest,
        recipeCount: _count.recipes,
    }));
}

export default async function CategoriesPage() {
    await ensureAdminSession('admin-categories');
    const categories = await getCategories();

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '6' })}>
            <CategoriesTable categories={categories} />
        </div>
    );
}
