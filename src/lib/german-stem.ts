import { readFileSync } from 'fs';

import { Nodehun } from 'nodehun';

const HUNSPELL_DIR = '/usr/share/hunspell';

let hunspell: Nodehun | null = null;

function getHunspell(): Nodehun {
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

    // Prefer stems that start with uppercase (German nouns are capitalized)
    const nounStems = stems.filter(
        (s) => s[0] === s[0].toUpperCase() && s[0] !== s[0].toLowerCase(),
    );

    const candidates = nounStems.length > 0 ? nounStems : stems;

    // Shortest candidate is usually the singular base form
    return candidates.sort((a, b) => a.length - b.length)[0];
}

/**
 * Returns all known variants of a word (input + all stems), lowercased and deduplicated.
 */
export async function getWordVariants(word: string): Promise<string[]> {
    const h = getHunspell();
    const stems = await h.stem(word);
    return [...new Set([word.toLowerCase(), ...stems.map((s) => s.toLowerCase())])];
}
