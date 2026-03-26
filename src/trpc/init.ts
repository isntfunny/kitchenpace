import 'server-only';

import { initTRPC } from '@trpc/server';

import { prisma } from '@shared/prisma';

export const createTRPCContext = async (opts: { headers: Headers }) => ({
    prisma,
    headers: opts.headers,
});

const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
