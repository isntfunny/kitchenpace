export interface Category {
    id: string;
    name: string;
    slug: string;
    color: string;
    icon: string | null;
}

export interface Tag {
    id: string;
    name: string;
    count?: number;
}

export interface IngredientSearchResult {
    id: string;
    name: string;
    pluralName: string | null;
    category: string | null;
    units: string[];
}

export interface AddedIngredient {
    id: string;
    name: string;
    pluralName: string | null;
    amount: string;
    unit: string;
    notes: string;
    isOptional: boolean;
    isNew: boolean;
}
