import { publicProcedure, router } from '../init';

export const filtersRouter = router({
    categories: publicProcedure.query(({ ctx }) =>
        ctx.prisma.category.findMany({
            where: {
                recipes: {
                    some: {
                        recipe: { publishedAt: { not: null } },
                    },
                },
            },
            orderBy: { name: 'asc' },
            select: { slug: true, name: true },
        }),
    ),
});
