import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'node_modules/.prisma/client';
import { Pool } from 'pg';

type GlobalWithPrisma = typeof globalThis & {
    prisma?: PrismaClient;
};

const databaseUrl =
    process.env.DATABASE_URL ??
    'postgresql://kitchenpace:kitchenpace_secret@localhost:64000/kitchenpace';

const pool = new Pool({
    connectionString: databaseUrl,
});

const adapter = new PrismaPg(pool);

const globalWithPrisma = globalThis as GlobalWithPrisma;

export const prisma: PrismaClient =
    globalWithPrisma.prisma ??
    new PrismaClient({
        adapter,
    });

if (process.env.NODE_ENV !== 'production') {
    globalWithPrisma.prisma = prisma;
}
