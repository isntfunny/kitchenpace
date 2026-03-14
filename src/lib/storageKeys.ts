/**
 * Central registry of all localStorage keys used in KitchenPace.
 * Always add new keys here to avoid collisions and aid discoverability.
 */
export const STORAGE_KEYS = {
    // UI preferences
    theme: 'kitchenpace-theme',
    searchViewMode: 'kitchenpace-search-view',
    searchSort: 'kitchenpace-search-sort',

    // Flow editor panel layout
    flowLeftWidth: 'flow-left-width',
    flowRightWidth: 'flow-right-width',
    flowLeftVisible: 'flow-left-visible',

    // Recipe tabs (pinned / recent)
    recipeTabs: 'kitchenpace_recipe_tabs',
} as const;
