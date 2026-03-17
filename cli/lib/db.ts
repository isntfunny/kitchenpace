import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, RecipeStatus } from '@prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const db = new PrismaClient({ adapter });

export { RecipeStatus };
