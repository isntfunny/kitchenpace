import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const databaseUrl =
    process.env.DATABASE_URL ??
    'postgresql://kitchenpace:kitchenpace_secret@localhost:64000/kitchenpace';

const adapter = new PrismaPg({ connectionString: databaseUrl });

export const prisma = new PrismaClient({ adapter });
