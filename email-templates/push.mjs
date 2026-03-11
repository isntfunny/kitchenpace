#!/usr/bin/env node
/**
 * push.mjs — Parse MJML templates and push to Notifuse
 *
 * Usage:
 *   node email-templates/push.mjs                    # push all templates
 *   node email-templates/push.mjs --template=welcome # push a single template
 *   node email-templates/push.mjs --dry-run          # parse only, no push
 *
 * Requires env vars (loaded from .env automatically):
 *   NOTIFUSE_API_KEY, NOTIFUSE_WORKSPACE_ID, NOTIFUSE_BASE_URI
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const parseMjml = require('mjml-parser-xml');

/* ── env loading ──────────────────────────────────────────── */

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const envPath = join(ROOT, '.env');

if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
        const m = line.match(/^([A-Z_]+)\s*=\s*"?([^"#\n]*)"?/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
}

/* ── config ───────────────────────────────────────────────── */

const API_KEY = process.env.NOTIFUSE_API_KEY;
const WORKSPACE_ID = process.env.NOTIFUSE_WORKSPACE_ID;
const BASE_URI = (process.env.NOTIFUSE_BASE_URI ?? 'https://api.notifuse.com/v2/').replace(
    /\/$/,
    '',
);
const MJML_DIR = join(__dirname, 'mjml');

if (!API_KEY || !WORKSPACE_ID) {
    console.error('✗ NOTIFUSE_API_KEY and NOTIFUSE_WORKSPACE_ID must be set');
    process.exit(1);
}

/**
 * Template metadata — maps MJML filename (without .mjml) to Notifuse template config.
 *
 * id:       Template ID in Notifuse (alphanumeric, hyphens, underscores, max 32 chars)
 * name:     Display name in Notifuse dashboard
 * category: One of: transactional | welcome | marketing | opt_in | other
 * subject:  Email subject line (supports Liquid: {{ contact.first_name }})
 */
const TEMPLATE_CONFIG = {
    'activate-account': {
        id: 'activate-account',
        name: 'Konto aktivieren',
        category: 'transactional',
        subject: 'Bitte aktiviere dein KüchenTakt-Konto',
    },
    welcome: {
        id: 'welcome',
        name: 'Willkommen bei KüchenTakt',
        category: 'welcome',
        subject: 'Willkommen bei KüchenTakt 👨‍🍳',
    },
    'password-reset': {
        id: 'password-reset',
        name: 'Passwort zurücksetzen',
        category: 'transactional',
        subject: 'Dein KüchenTakt-Passwort zurücksetzen',
    },
    'password-changed': {
        id: 'password-changed',
        name: 'Passwort geändert',
        category: 'transactional',
        subject: 'Dein KüchenTakt-Passwort wurde geändert',
    },
    'weekly-newsletter': {
        id: 'weekly-newsletter',
        name: 'Wöchentlicher Newsletter',
        category: 'marketing',
        subject: 'Deine wöchentlichen Rezeptempfehlungen 🍳',
    },
    'new-comment': {
        id: 'new-comment',
        name: 'Neuer Kommentar',
        category: 'transactional',
        subject: '{{ contact.first_name }}, jemand hat dein Rezept kommentiert',
    },
    'new-follower': {
        id: 'new-follower',
        name: 'Neuer Follower',
        category: 'transactional',
        subject: '{{ contact.first_name }}, du hast einen neuen Follower!',
    },
    'recipe-published': {
        id: 'recipe-published',
        name: 'Rezept veröffentlicht',
        category: 'transactional',
        subject: 'Ein neues Rezept wurde veröffentlicht',
    },
    'recipe-of-the-day': {
        id: 'recipe-of-the-day',
        name: 'Rezept des Tages',
        category: 'marketing',
        subject: 'Dein Rezept des Tages 🌟',
    },
    generic: {
        id: 'generic',
        name: 'Generic',
        category: 'transactional',
        subject: '{{{ subject }}}',
    },
};

/* ── CLI args ─────────────────────────────────────────────── */

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const filterArg = args.find((a) => a.startsWith('--template='));
const filterName = filterArg ? filterArg.split('=')[1] : null;

/* ── helpers ──────────────────────────────────────────────── */

/**
 * Strip parser metadata (file, absoluteFilePath, line, includedIn)
 * from the tree so we send only what Notifuse needs.
 */
function cleanTree(node) {
    if (!node || typeof node !== 'object') return node;
    const {
        file: _file,
        absoluteFilePath: _absoluteFilePath,
        line: _line,
        includedIn: _includedIn,
        tagName,
        children,
        ...rest
    } = node;
    const clean = { type: tagName, ...rest };
    if (children?.length) {
        clean.children = children.map(cleanTree);
    }
    return clean;
}

async function notifuseRequest(endpoint, body) {
    const url = `${BASE_URI}/${endpoint}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    const text = await res.text();
    let json;
    try {
        json = JSON.parse(text);
    } catch {
        json = { raw: text };
    }
    if (!res.ok) {
        throw new Error(`${endpoint} failed (${res.status}): ${text.slice(0, 300)}`);
    }
    return json;
}

async function compileViaNotifuse(tree) {
    const result = await notifuseRequest('templates.compile', {
        workspace_id: WORKSPACE_ID,
        message_id: `compile-${Date.now()}`,
        visual_editor_tree: tree,
    });
    if (!result.html) {
        throw new Error('templates.compile returned no HTML');
    }
    return result.html;
}

async function upsertTemplate(config, compiledHtml, tree) {
    const payload = {
        workspace_id: WORKSPACE_ID,
        id: config.id,
        name: config.name,
        channel: 'email',
        category: config.category,
        email: {
            subject: config.subject,
            compiled_preview: compiledHtml,
            visual_editor_tree: tree,
        },
    };

    // Try update first; fall back to create if the template doesn't exist yet
    try {
        const result = await notifuseRequest('templates.update', payload);
        return { action: 'updated', result };
    } catch (updateErr) {
        if (
            updateErr.message.includes('404') ||
            updateErr.message.toLowerCase().includes('not found')
        ) {
            const result = await notifuseRequest('templates.create', payload);
            return { action: 'created', result };
        }
        throw updateErr;
    }
}

/* ── main ─────────────────────────────────────────────────── */

const files = readdirSync(MJML_DIR)
    .filter((f) => f.endsWith('.mjml'))
    .filter((f) => !filterName || f === `${filterName}.mjml`);

if (files.length === 0) {
    console.error(filterName ? `✗ No template found: ${filterName}.mjml` : '✗ No MJML files found');
    process.exit(1);
}

console.log(`\nKüchenTakt → Notifuse template push`);
console.log(`Workspace: ${WORKSPACE_ID}  |  Endpoint: ${BASE_URI}`);
if (dryRun) console.log('Mode: DRY RUN (no changes will be made)\n');
else console.log('');

let ok = 0;
let skipped = 0;
let failed = 0;

for (const file of files) {
    const templateName = file.replace('.mjml', '');
    const config = TEMPLATE_CONFIG[templateName];
    const filePath = join(MJML_DIR, file);

    if (!config) {
        console.log(`⚠  ${file} — no config entry, skipping (add to TEMPLATE_CONFIG)`);
        skipped++;
        continue;
    }

    process.stdout.write(`   ${file.padEnd(28)}`);

    try {
        // Step 1: parse MJML → tree
        const mjmlSource = readFileSync(filePath, 'utf8');
        const rawTree = parseMjml(mjmlSource);
        const tree = cleanTree(rawTree);

        if (dryRun) {
            console.log(`✓  parsed — skipped push`);
            ok++;
            continue;
        }

        // Step 2: compile via Notifuse API
        const compiledHtml = await compileViaNotifuse(tree);

        // Step 3: upsert in Notifuse
        const { action } = await upsertTemplate(config, compiledHtml, tree);
        console.log(`✓  ${action} (${Math.round(compiledHtml.length / 1024)}KB)`);
        ok++;
    } catch (err) {
        console.log(`✗  FAILED`);
        console.error(`   ${err.message}\n`);
        failed++;
    }
}

console.log('');
console.log(
    `Done: ${ok} pushed, ${skipped} skipped, ${failed} failed` + (dryRun ? ' [dry run]' : ''),
);
process.exit(failed > 0 ? 1 : 0);
