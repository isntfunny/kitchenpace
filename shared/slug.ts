import slugifyLib from 'slugify';

/** URL slug: lower case, German transliteration ("ä" → "ae", "&" → "und"), only [a-z0-9-]. */
export function slugify(text: string): string {
    return slugifyLib(text, { lower: true, strict: true, locale: 'de' });
}
