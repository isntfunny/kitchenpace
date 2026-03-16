import _ from 'lodash';
const { kebabCase, trim, lowerCase } = _;

export function slugify(text: string): string {
    const charMap: Record<string, string> = {
        ä: 'ae',
        ö: 'oe',
        ü: 'ue',
        ß: 'ss',
        Ä: 'ae',
        Ö: 'oe',
        Ü: 'ue',
        é: 'e',
        è: 'e',
        ê: 'e',
        ë: 'e',
        à: 'a',
        â: 'a',
        á: 'a',
        ù: 'u',
        û: 'u',
        ú: 'u',
        î: 'i',
        ï: 'i',
        í: 'i',
        ô: 'o',
        ó: 'o',
        ò: 'o',
        ç: 'c',
        ñ: 'n',
    };

    // Apply charMap BEFORE lowerCase — lodash lowerCase strips diacritics (ö→o)
    const mapped = text
        .split('')
        .map((char: string) => charMap[char] || charMap[char.toLowerCase()] || char)
        .join('');

    return kebabCase(trim(lowerCase(mapped)));
}

export async function generateUniqueSlug(
    title: string,
    existsFn: (slug: string) => Promise<boolean>,
): Promise<string> {
    const base = slugify(title);

    if (!(await existsFn(base))) {
        return base;
    }

    let counter = 1;
    while (await existsFn(`${base}-${counter}`)) {
        counter++;
    }

    return `${base}-${counter}`;
}
