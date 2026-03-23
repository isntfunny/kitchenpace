import { ensureModeratorSession } from '@app/lib/admin/ensure-moderator';
import { prisma } from '@shared/prisma';

import { css } from 'styled-system/css';

import { UnitsDashboard } from './units-dashboard';

export const dynamic = 'force-dynamic';

export type UnitWithDetails = {
    id: string;
    shortName: string;
    longName: string;
    gramsDefault: number | null;
    ingredientCount: number;
    topIngredients: Array<{
        ingredientId: string;
        ingredientName: string;
        grams: number | null;
    }>;
};

async function getData(): Promise<UnitWithDetails[]> {
    const units = await prisma.unit.findMany({
        select: {
            id: true,
            shortName: true,
            longName: true,
            gramsDefault: true,
            _count: { select: { ingredients: true } },
            ingredients: {
                select: {
                    grams: true,
                    ingredient: { select: { id: true, name: true } },
                },
                take: 8,
                orderBy: { ingredient: { name: 'asc' } },
            },
        },
        orderBy: { shortName: 'asc' },
    });

    return units.map((u) => ({
        id: u.id,
        shortName: u.shortName,
        longName: u.longName,
        gramsDefault: u.gramsDefault,
        ingredientCount: u._count.ingredients,
        topIngredients: u.ingredients.map((iu) => ({
            ingredientId: iu.ingredient.id,
            ingredientName: iu.ingredient.name,
            grams: iu.grams,
        })),
    }));
}

export default async function UnitsPage() {
    await ensureModeratorSession('admin-units');
    const units = await getData();

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '6' })}>
            <UnitsDashboard units={units} />
        </div>
    );
}
