export interface Category {
    id: string;
    name: string;
}

export interface Tag {
    id: string;
    name: string;
    count?: number;
}

export interface IngredientSearchResult {
    id: string;
    name: string;
    category: string | null;
    units: string[];
}

export interface AddedIngredient {
    id: string;
    name: string;
    amount: string;
    unit: string;
    notes: string;
    isOptional: boolean;
    isNew: boolean;
}
