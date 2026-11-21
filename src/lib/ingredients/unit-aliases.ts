// Common German unit spellings that are not a Unit row's shortName or longName.
// The import prompt asks for "Pck.", sources write "Pkg.", "St.", "Bd." …; without
// this they all fell back to "Stk" (KUC-115).

const UNIT_ALIASES: Record<string, string> = {
    'pck.': 'Päckchen',
    pck: 'Päckchen',
    'pk.': 'Päckchen',
    'pkg.': 'Päckchen',
    pkg: 'Päckchen',
    'pack.': 'Päckchen',
    packung: 'Paket',
    pckg: 'Päckchen',
    'st.': 'Stk',
    st: 'Stk',
    'stk.': 'Stk',
    'bd.': 'Bund',
    'ds.': 'Dose',
    'fl.': 'Flasche',
    'gr.': 'g',
    gr: 'g',
    gramm: 'g',
    'el.': 'EL',
    'tl.': 'TL',
    msp: 'Msp.',
    messerspitze: 'Msp.',
    'pr.': 'Prise',
    'sch.': 'Scheibe',
    'tas.': 'Tasse',
    'cl.': 'Cl',
    'dl.': 'Dl',
    'cm.': 'Cm',
    'l.': 'l',
    'ml.': 'ml',
    'kg.': 'kg',
};

/** Canonical Unit shortName for a known alias, otherwise the trimmed input. */
export function canonicalUnitName(input: string): string {
    const trimmed = input.trim();
    return UNIT_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}
