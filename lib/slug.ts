import _ from 'lodash';
const { kebabCase, trim, lowerCase } = _;

export function slugify(text: string): string {
    const germanMap: Record<string, string> = {
        ä: 'ae',
        ö: 'oe',
        ü: 'ue',
        ß: 'ss',
        Ä: 'ae',
        Ö: 'oe',
        Ü: 'ue',
    };

    const normalized = lowerCase(text)
        .split('')
        .map((char: string) => germanMap[char] || char)
        .join('');

    return kebabCase(trim(normalized));
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

export function generateSlug(title: string, timestamp?: number): string {
    const base = slugify(title);
    return timestamp ? `${base}-${timestamp}` : base;
}
