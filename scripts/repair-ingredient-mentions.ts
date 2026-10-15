import 'dotenv/config';
import { Command } from 'commander';

import { registerMentionRepairCommand } from '../cli/commands/repair-ingredient-mentions';

const program = new Command();
registerMentionRepairCommand(program);
// Standalone entry avoids bootstrapping queues, AI and unrelated CLI commands.
program
    .parseAsync([
        'node',
        'repair-ingredient-mentions',
        'repair-ingredient-mentions',
        ...process.argv.slice(2),
    ])
    .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    });
