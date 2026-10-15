// Synthetic ingredient-search transport boundary, never used by the application.
export async function searchIngredients(query: string) {
    const slow = query === 'To';
    await new Promise((resolve) => setTimeout(resolve, slow ? 650 : 25));
    if (query === 'Fehler') throw new Error('Search unavailable');
    const name = query.includes('Tom') || slow ? 'Tomate' : query.includes('Min') ? 'Minze' : '';
    return {
        results: name
            ? [{ id: name, name, pluralName: null, categories: ['Gemüse & Kräuter'], units: [] }]
            : [],
        parsed: {
            name: query,
            amount: query.startsWith('200') ? '200' : '',
            unit: query.startsWith('200') ? 'g' : null,
        },
        bestMatch: null,
        matchType: 'none',
    };
}
