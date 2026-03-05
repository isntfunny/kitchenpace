import 'dotenv/config';
import { db } from './lib/db.js';

async function main() {
    const recipes = await db.recipe.findMany({
        take: 3,
        select: { id: true, title: true, slug: true, status: true },
    });
    console.log('Recipes in database:');
    for (const r of recipes) {
        console.log(`  - ${r.title} (slug: ${r.slug}, status: ${r.status})`);
    }
    await db.$disconnect();
}

main();
