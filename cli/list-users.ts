import 'dotenv/config';
import { db } from './lib/db.js';

async function main() {
    const users = await db.user.findMany({ take: 5, include: { profile: true } });
    console.log('Users in database:');
    for (const u of users) {
        console.log(`  - ${u.email} (role: ${u.role}, active: ${u.isActive})`);
    }
    await db.$disconnect();
}

main();
