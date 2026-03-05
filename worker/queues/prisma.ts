import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const databaseUrl =
    process.env.DATABASE_URL ??
    'postgresql://kitchenpace:kitchenpace_secret@localhost:64000/kitchenpace';

const pool = new Pool({
    connectionString: databaseUrl,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
