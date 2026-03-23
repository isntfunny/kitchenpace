import { Scale } from 'lucide-react';

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
            <header
                className={css({
                    borderRadius: '2xl',
                    borderWidth: '1px',
                    borderColor: 'border.muted',
                    background: 'surface',
                    padding: { base: '4', md: '6' },
                    display: 'flex',
                    flexDirection: { base: 'column', md: 'row' },
                    alignItems: { md: 'flex-start' },
                    gap: '4',
                })}
            >
                <div
                    className={css({
                        padding: '2.5',
                        borderRadius: 'lg',
                        background: 'surface.elevated',
                        borderWidth: '1px',
                        borderColor: 'border',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    })}
                >
                    <Scale size={22} />
                </div>
                <div>
                    <p
                        className={css({
                            fontSize: 'xs',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5em',
                            color: 'foreground.muted',
                            marginBottom: '1',
                        })}
                    >
                        Admin &middot; Einheiten
                    </p>
                    <h1
                        className={css({
                            fontSize: { base: '2xl', md: '3xl' },
                            fontWeight: 'semibold',
                            color: 'foreground',
                        })}
                    >
                        Einheitenverwaltung
                    </h1>
                    <p
                        className={css({
                            marginTop: '2',
                            color: 'foreground.muted',
                            maxWidth: '3xl',
                        })}
                    >
                        Masseinheiten verwalten, Standard-Grammwerte festlegen und sehen welche
                        Zutaten sie verwenden.
                    </p>
                </div>
            </header>

            <UnitsDashboard units={units} />
        </div>
    );
}
