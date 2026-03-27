import { NextResponse } from 'next/server';

import { prisma } from '@shared/prisma';

type OptionType = 'categories' | 'tags';

function parseType(value: string | null): OptionType | null {
    if (value === 'categories' || value === 'tags') return value;
    return null;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = parseType(searchParams.get('type'));
    const query = searchParams.get('q')?.trim() ?? '';

    if (!type) {
        return NextResponse.json({ results: [] }, { status: 400 });
    }

    if (type === 'categories') {
        const results = await prisma.category.findMany({
            where: query
                ? {
                      OR: [
                          { name: { contains: query, mode: 'insensitive' } },
                          { slug: { contains: query.toLowerCase() } },
                      ],
                  }
                : undefined,
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            take: 12,
            select: { slug: true, name: true },
        });

        return NextResponse.json({
            results: results.map((category) => ({
                value: category.slug,
                label: category.name,
            })),
        });
    }

    const results = await prisma.tag.findMany({
        where: query
            ? {
                  OR: [
                      { name: { contains: query, mode: 'insensitive' } },
                      { slug: { contains: query.toLowerCase() } },
                  ],
              }
            : undefined,
        orderBy: [{ name: 'asc' }],
        take: 12,
        select: { slug: true, name: true },
    });

    return NextResponse.json({
        results: results.map((tag) => ({
            value: tag.slug,
            label: tag.name,
        })),
    });
}
