import { PageShell } from '@app/components/layouts/PageShell';
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
    const users = await getUsers();

    return (
        <PageShell>
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '6' })}>
                <header
                    className={css({
                        borderRadius: '2xl',
                        borderWidth: '1px',
                        borderColor: 'border.muted',
                        background: 'surface',
                        padding: { base: '4', md: '5' },
                    })}
                >
                    <p
                        className={css({
                            fontSize: 'xs',
                            textTransform: 'uppercase',
                            letterSpacing: '0.4em',
                            color: 'foreground.muted',
                        })}
                    >
                        Admin · Konten
                    </p>
                    <h1
                        className={css({
                            fontSize: '3xl',
                            fontWeight: 'semibold',
                            color: 'foreground',
                            marginTop: '1',
                        })}
                    >
                        Benutzerverwaltung
                    </h1>
                    <p
                        className={css({
                            marginTop: '2',
                            color: 'foreground.muted',
                        })}
                    >
                        Benutzerkonten verwalten, Rollen zuweisen und Zugriff kontrollieren.
                    </p>
                </header>

                <AccountsTable users={users} />
            </div>
        </PageShell>
    );
}
