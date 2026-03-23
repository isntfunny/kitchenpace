import { ensureAdminSession } from '@app/lib/admin/ensure-admin';
import { prisma } from '@shared/prisma';

import { css } from 'styled-system/css';

import { AccountsTable } from './accounts-table';

export const dynamic = 'force-dynamic';

async function getUsers() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            banned: true,
            emailVerified: true,
            createdAt: true,
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

    return users.map(({ _count, createdAt, name, email, emailVerified, ...rest }) => ({
        ...rest,
        name: name ?? '—',
        email: email ?? '—',
        emailVerified: !!emailVerified,
        createdAt: createdAt.toISOString(),
        recipeCount: _count.recipes,
    }));
}

export default async function AccountsPage() {
    await ensureAdminSession('admin-accounts');
    const users = await getUsers();

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '6' })}>
            <AccountsTable users={users} />
        </div>
    );
}
