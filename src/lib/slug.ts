import slugifyLib from 'slugify';

export function slugify(text: string): string {
    return slugifyLib(text, { lower: true, strict: true, locale: 'de' });
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
