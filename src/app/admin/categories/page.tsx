import { PageShell } from '@app/components/layouts/PageShell';
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
    const categories = await getCategories();

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
                        Admin · Kategorien
                    </p>
                    <h1
                        className={css({
                            fontSize: '3xl',
                            fontWeight: 'semibold',
                            color: 'foreground',
                            marginTop: '1',
                        })}
                    >
                        Kategorien
                    </h1>
                    <p className={css({ marginTop: '2', color: 'foreground.muted' })}>
                        Rezept-Kategorien verwalten, erstellen und sortieren.
                    </p>
                </header>

                <CategoriesTable categories={categories} />
            </div>
        </PageShell>
    );
}
