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
        take: 500,
    });

    return recipes.map(({ author, _count, flowNodes, createdAt, publishedAt, ...rest }) => ({
        ...rest,
        createdAt: createdAt.toISOString(),
        publishedAt: publishedAt?.toISOString() ?? null,
        authorId: author.id,
        authorName: author.name ?? '—',
        commentCount: _count.comments,
        nodeCount: flowNodes ? (flowNodes as unknown[]).length : 0,
    }));
}

export default async function RecipesPage() {
    const recipes = await getRecipes();

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
    );
}
