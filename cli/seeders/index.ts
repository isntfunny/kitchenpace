import type { PrismaClient } from '@prisma/client';

export interface SeederResult {
    created: number;
    skipped: number;
    deleted: number;
}

export interface Seeder {
    name: string;
    description: string;
    /** INSERT OR IGNORE -- safe for production, never deletes/overwrites */
    run(db: PrismaClient): Promise<SeederResult>;
    /** Delete all managed data + re-create. Only with --force */
    reset(db: PrismaClient): Promise<SeederResult>;
}

// Import and re-export all seeders in execution order
import { basicsSeeder } from './basics.js';
import { ingredientsSeeder } from './ingredients.js';
// import { devSeeder } from './dev.js';  // TODO: migrate from seed.ts later

export const seeders: Seeder[] = [
    basicsSeeder,
    ingredientsSeeder,
    // devSeeder,
];
