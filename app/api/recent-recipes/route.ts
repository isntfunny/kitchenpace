import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

const MAX_RECENT = 10;

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recentViews = await prisma.userViewHistory.findMany({
        where: { userId: session.user.id },
        include: {
            recipe: {
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    imageUrl: true,
                    prepTime: true,
                    cookTime: true,
                    difficulty: true,
                },
            },
        },
        orderBy: { viewedAt: 'desc' },
        take: MAX_RECENT,
        distinct: ['recipeId'],
    });

    const recent = recentViews.map((view) => ({
        id: view.recipe.id,
        title: view.recipe.title,
        slug: view.recipe.slug,
        imageUrl: view.recipe.imageUrl,
        prepTime: view.recipe.prepTime,
        cookTime: view.recipe.cookTime,
        difficulty: view.recipe.difficulty,
        viewedAt: view.viewedAt,
    }));

    return NextResponse.json(recent);
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipeId } = body;

    if (!recipeId) {
        return NextResponse.json({ error: 'recipeId is required' }, { status: 400 });
    }

    const existing = await prisma.userViewHistory.findFirst({
        where: { userId: session.user.id, recipeId },
    });

    if (existing) {
        await prisma.userViewHistory.update({
            where: { id: existing.id },
            data: { viewedAt: new Date() },
        });
    } else {
        await prisma.userViewHistory.create({
            data: {
                userId: session.user.id,
                recipeId,
                viewedAt: new Date(),
            },
        });
    }

    const count = await prisma.userViewHistory.count({
        where: { userId: session.user.id },
    });

    if (count > MAX_RECENT * 2) {
        const toDelete = await prisma.userViewHistory.findMany({
            where: { userId: session.user.id },
            orderBy: { viewedAt: 'asc' },
            take: count - MAX_RECENT,
            select: { id: true },
        });

        const idsToDelete = toDelete.map((t) => t.id);
        await prisma.userViewHistory.deleteMany({
            where: { id: { in: idsToDelete } },
        });
    }

    return NextResponse.json({ success: true });
}
