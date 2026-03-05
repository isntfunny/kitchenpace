#!/usr/bin/env node

import { spawnSync } from 'child_process';
import { readdirSync } from 'fs';
import { join } from 'path';

const scriptDir = new URL('.', import.meta.url).pathname;
const mjmlDir = join(scriptDir, 'mjml');

console.log('Validating MJML templates...\n');

let errors = 0;

const files = readdirSync(mjmlDir).filter((f) => f.endsWith('.mjml'));

for (const file of files) {
    const filePath = join(mjmlDir, file);
    const result = spawnSync('mjml', [filePath], { encoding: 'utf8' });
    const stderr = result.stderr ?? '';
    const hasWarnings = stderr.includes('Invalid attribute') || stderr.includes('MJ-');

    if (result.status !== 0 || hasWarnings) {
        console.log(`✗ ${file} - ${result.status !== 0 ? 'FAILED' : 'WARNINGS'}`);
        if (stderr) console.log(stderr);
        errors++;
    } else {
        console.log(`✓ ${file}`);
    }
}

console.log('');

if (errors === 0) {
    console.log('All templates validated successfully!');
    process.exit(0);
} else {
    console.log(`${errors} template(s) failed validation`);
    process.exit(1);
}
