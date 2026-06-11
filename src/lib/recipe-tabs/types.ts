export const MAX_RECENT = 5;
export const MAX_PINNED = 3;

export interface RecipeTabItem {
    id: string;
    title: string;
    slug?: string;
    imageKey?: string | null;
    prepTime?: number;
    cookTime?: number;
    difficulty?: string;
}

export interface RecipeTabsData {
    pinned: RecipeTabItem[];
    recent: RecipeTabItem[];
}
