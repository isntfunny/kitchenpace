import { PageShell } from '@app/components/layouts/PageShell';
import { ensureAdminSession } from '@app/lib/admin/ensure-admin';
import { prisma } from '@shared/prisma';
import { css } from 'styled-system/css';

import { RecipesTable } from './recipes-table';

export const dynamic = 'force-dynamic';

async function getRecipes() {
    const recipes = await prisma.recipe.findMany({
        select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            difficulty: true,
            rating: true,
            ratingCount: true,
            viewCount: true,
            cookCount: true,
            createdAt: true,
            publishedAt: true,
            isTrending: true,
            flowNodes: true,
            author: {
                select: {
                    id: true,
                    name: true,
                },
            },
            _count: {
                select: {
                    comments: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    return recipes.map((recipe) => ({
        id: recipe.id,
        title: recipe.title,
        slug: recipe.slug,
        status: recipe.status,
        difficulty: recipe.difficulty,
        rating: recipe.rating,
        ratingCount: recipe.ratingCount,
        viewCount: recipe.viewCount,
        cookCount: recipe.cookCount,
        createdAt: recipe.createdAt.toISOString(),
        publishedAt: recipe.publishedAt?.toISOString() ?? null,
        authorId: recipe.author.id,
        authorName: recipe.author.name ?? '—',
        commentCount: recipe._count.comments,
        isTrending: recipe.isTrending,
        nodeCount: recipe.flowNodes ? (recipe.flowNodes as unknown[]).length : 0,
    }));
}

export default async function RecipesPage() {
    await ensureAdminSession('admin-recipes');
    const recipes = await getRecipes();

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
                        Admin · Rezepte
                    </p>
                    <h1
                        className={css({
                            fontSize: '3xl',
                            fontWeight: 'semibold',
                            color: 'foreground',
                            marginTop: '1',
                        })}
                    >
                        Rezeptverwaltung
                    </h1>
                    <p
                        className={css({
                            marginTop: '2',
                            color: 'foreground.muted',
                        })}
                    >
                        Rezepte verwalten, Status ändern oder archivieren.
                    </p>
                </header>

                <RecipesTable recipes={recipes} />
            </div>
        </PageShell>
    );
}
