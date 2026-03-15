import { PageShell } from '@app/components/layouts/PageShell';
import { prisma } from '@shared/prisma';

import { css } from 'styled-system/css';

import { IngredientsTable } from './ingredients-table';

export const dynamic = 'force-dynamic';

async function getIngredients() {
    const [ingredients, needsReviewCount] = await Promise.all([
        prisma.ingredient.findMany({
            select: {
                id: true,
                name: true,
                slug: true,
                pluralName: true,
                category: true,
                units: true,
                aliases: true,
                needsReview: true,
                _count: { select: { recipes: true } },
            },
            orderBy: [{ needsReview: 'desc' }, { name: 'asc' }],
        }),
        prisma.ingredient.count({ where: { needsReview: true } }),
    ]);

    return {
        ingredients: ingredients.map(({ _count, category, units, aliases, ...rest }) => ({
            ...rest,
            category: category ?? 'SONSTIGES',
            units: units ?? [],
            aliases: aliases ?? [],
            recipeCount: _count.recipes,
        })),
        needsReviewCount,
    };
}

export default async function IngredientsPage() {
    const { ingredients, needsReviewCount } = await getIngredients();

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

                {needsReviewCount > 0 && (
                    <div
                        className={css({
                            borderRadius: 'xl',
                            border: '1px solid rgba(224,123,83,0.4)',
                            backgroundColor: 'rgba(224,123,83,0.06)',
                            padding: '4',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3',
                        })}
                    >
                        <span
                            className={css({
                                fontWeight: '700',
                                fontSize: 'lg',
                                color: 'brand.primary',
                            })}
                        >
                            {needsReviewCount}
                        </span>
                        <p className={css({ fontSize: 'sm', color: 'text' })}>
                            neue Zutat{needsReviewCount !== 1 ? 'en' : ''} von Nutzern erstellt –
                            bitte Einheit{needsReviewCount !== 1 ? 'en' : ''} prüfen und ergänzen.
                        </p>
                    </div>
                )}

                <IngredientsTable ingredients={ingredients} />
            </div>
        </PageShell>
    );
}
