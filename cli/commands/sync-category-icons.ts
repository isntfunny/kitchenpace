import { Command } from 'commander';

import { syncCategoryIcons } from '../lib/category-icons';
import { db } from '../lib/db';

export function registerCategoryIconsCommand(program: Command) {
    program
        .command('sync-category-icons')
        .description('Store the fixed icons of the main ingredient categories (dry run by default)')
        .option('--apply', 'Write the icons; categories that already have one are kept')
        .action(async (options: { apply?: boolean }) => {
            await db.$connect();
            try {
                const result = await syncCategoryIcons(db, { apply: Boolean(options.apply) });
                console.log(
                    options.apply
                        ? `Updated ${result.updated} of ${result.planned} categories`
                        : `Dry run: ${result.planned} categories would get an icon (use --apply)`,
                );
            } finally {
                await db.$disconnect();
            }
        });
}
