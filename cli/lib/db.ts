import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, RecipeStatus } from '@prisma/client';
import pg from 'pg';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool as any);
export const db = new PrismaClient({ adapter });

export { RecipeStatus };
