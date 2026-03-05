import { PageShell } from '@app/components/layouts/PageShell';
import { ensureAdminSession } from '@app/lib/admin/ensure-admin';
import { prisma } from '@shared/prisma';
import { css } from 'styled-system/css';

import { IngredientsTable } from './ingredients-table';

export const dynamic = 'force-dynamic';

async function getIngredients() {
    const ingredients = await prisma.ingredient.findMany({
        select: {
            id: true,
            name: true,
            slug: true,
            category: true,
            units: true,
            _count: {
                select: {
                    recipes: true,
                },
            },
        },
        orderBy: {
            name: 'asc',
        },
    });

    return ingredients.map((ing) => ({
        id: ing.id,
        name: ing.name,
        slug: ing.slug,
        category: ing.category ?? 'SONSTIGES',
        units: ing.units ?? [],
        recipeCount: ing._count.recipes,
    }));
}

export default async function IngredientsPage() {
    await ensureAdminSession('admin-ingredients');
    const ingredients = await getIngredients();

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
                        Admin · Zutaten
                    </p>
                    <h1
                        className={css({
                            fontSize: '3xl',
                            fontWeight: 'semibold',
                            color: 'foreground',
                            marginTop: '1',
                        })}
                    >
                        Zutatenverwaltung
                    </h1>
                    <p
                        className={css({
                            marginTop: '2',
                            color: 'foreground.muted',
                        })}
                    >
                        Kategorien und Einheiten für Zutaten verwalten.
                    </p>
                </header>

                <IngredientsTable ingredients={ingredients} />
            </div>
        </PageShell>
    );
}
