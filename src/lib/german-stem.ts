import { readFileSync } from 'fs';
import { createRequire } from 'module';

// Native addons (.node binaries) require CJS require() — ESM loaders
// (tsx, Node's --experimental-vm-modules) cannot handle .node files.
const require = createRequire(import.meta.url);
const { Nodehun } = require('nodehun') as typeof import('nodehun');

const HUNSPELL_DIR = '/usr/share/hunspell';

let hunspell: InstanceType<typeof Nodehun> | null = null;

function getHunspell(): InstanceType<typeof Nodehun> {
    if (hunspell) return hunspell;

    const aff = readFileSync(`${HUNSPELL_DIR}/de_DE.aff`);
    const dic = readFileSync(`${HUNSPELL_DIR}/de_DE.dic`);

    hunspell = new Nodehun(aff, dic);
    return hunspell;
}

/**
 * Returns the singular (base form) of a German word using Hunspell stemming.
 * Filters out verb forms and picks the best noun candidate.
 * Falls back to the input word if no stem is found.
 */
export async function stemGerman(word: string): Promise<string> {
    const h = getHunspell();
    const stems = await h.stem(word);

    if (stems.length === 0) return word;

    // Only accept stems that start with uppercase (German nouns are capitalized).
    // If Hunspell only finds lowercase stems it has decomposed a compound word
    // (e.g. Sonnenblumenöl → ['blumen', 'öl']) — in that case leave the word unchanged.
    const nounStems = stems.filter(
        (s) => s[0] === s[0].toUpperCase() && s[0] !== s[0].toLowerCase(),
    );

    if (nounStems.length === 0) return word;

    // Shortest candidate is usually the singular base form
    return nounStems.sort((a, b) => a.length - b.length)[0];
}

/**
 * Returns all known variants of a word (input + all stems), lowercased and deduplicated.
 */
export async function getWordVariants(word: string): Promise<string[]> {
    const h = getHunspell();
    const stems = await h.stem(word);
    return [...new Set([word.toLowerCase(), ...stems.map((s) => s.toLowerCase())])];
}
