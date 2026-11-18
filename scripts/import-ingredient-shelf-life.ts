// Imports the AI shelf-life result file (KUC-94, KUC-114) into the database.
// Dry run by default; writes only with --write.
//
//   npx tsx scripts/import-ingredient-shelf-life.ts <result.json> [--write] [--report out.json]
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import {
    extractRawItems,
    formatShelfLifeReport,
    importShelfLifeResults,
} from '../shared/ingredient-shelf-life/import';
import { prisma } from '../shared/prisma';

async function main() {
    const { values, positionals } = parseArgs({
        allowPositionals: true,
        options: {
            write: { type: 'boolean', default: false },
            report: { type: 'string' },
        },
    });
    const file = positionals[0];
    if (!file) {
        throw new Error(
            'Aufruf: import-ingredient-shelf-life <result.json> [--write] [--report out.json]',
        );
    }

    const rawItems = extractRawItems(JSON.parse(readFileSync(file, 'utf8')));
    const report = await importShelfLifeResults(prisma, rawItems, { write: values.write });

    console.log(formatShelfLifeReport(report));
    if (values.report) {
        writeFileSync(values.report, JSON.stringify(report, null, 2));
        console.log(`Bericht: ${values.report}`);
    }
    if (report.failed.length > 0) process.exitCode = 1;
}

main()
    .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
