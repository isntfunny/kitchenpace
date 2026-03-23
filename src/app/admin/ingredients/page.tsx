import { ensureModeratorSession } from '@app/lib/admin/ensure-moderator';
import { prisma } from '@shared/prisma';

import { css } from 'styled-system/css';

import { CategoriesSection } from './CategoriesTab';
import { IngredientsTable } from './ingredients-table';

export const dynamic = 'force-dynamic';

async function getData() {
    const [ingredientsRaw, needsReviewCount, categories, units] = await Promise.all([
        prisma.ingredient.findMany({
            select: {
                id: true,
                name: true,
                slug: true,
                pluralName: true,
                aliases: true,
                needsReview: true,
                energyKcal: true,
                protein: true,
                fat: true,
                carbs: true,
                fiber: true,
                sugar: true,
                sodium: true,
                saturatedFat: true,
                categories: { select: { id: true, name: true, slug: true } },
                ingredientUnits: {
                    select: {
                        grams: true,
                        unit: { select: { id: true, shortName: true, longName: true } },
                    },
                },
                _count: { select: { recipes: true } },
            },
            orderBy: [{ needsReview: 'desc' }, { name: 'asc' }],
        }),
        prisma.ingredient.count({ where: { needsReview: true } }),
        prisma.ingredientCategory.findMany({
            select: {
                id: true,
                name: true,
                slug: true,
                sortOrder: true,
                _count: { select: { ingredients: true } },
            },
            orderBy: { sortOrder: 'asc' },
        }),
        prisma.unit.findMany({
            select: {
                id: true,
                shortName: true,
                longName: true,
                gramsDefault: true,
                _count: { select: { ingredients: true } },
            },
            orderBy: { shortName: 'asc' },
        }),
    ]);

    const ingredients = ingredientsRaw.map(({ _count, ...rest }) => ({
        ...rest,
        recipeCount: _count.recipes,
    }));

    return { ingredients, needsReviewCount, categories, units };
}

export default async function IngredientsPage() {
    await ensureModeratorSession('admin-ingredients');
    const { ingredients, needsReviewCount, categories, units } = await getData();

    return (
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
                    Zutaten, Kategorien und Einheiten verwalten.
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
                        neue Zutat{needsReviewCount !== 1 ? 'en' : ''} von Nutzern erstellt – bitte
                        Kategorien und Einheiten prüfen.
                    </p>
                </div>
            )}

            <IngredientsTable ingredients={ingredients} categories={categories} units={units} />

            <CategoriesSection categories={categories} />
        </div>
    );
}
