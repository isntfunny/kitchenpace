export interface Ingredient {
    name: string;
    pluralName?: string | null;
    amount: number;
    rawAmount?: string;
    unit: string;
    notes?: string | null;
    caloriesPer100g?: number | null;
    proteinPer100g?: number | null;
    fatPer100g?: number | null;
    carbsPer100g?: number | null;
    ingredientUnitGrams?: number | null;
    unitGramsDefault?: number | null;
}

export type NodeType = 'prep' | 'cook' | 'wait' | 'season' | 'combine' | 'serve';

export interface FlowNode {
    id: string;
    type: NodeType;
    label: string;
    description: string;
    duration?: number;
    position: { x: number; y: number };
}

export interface FlowEdge {
    id: string;
    source: string;
    target: string;
}

export interface RecipeFlow {
    nodes: FlowNode[];
    edges: FlowEdge[];
}

export interface User {
    id: string;
    slug: string;
    name: string;
    avatar: string;
    bio: string;
    recipeCount: number;
    followerCount: number;
}

export interface Activity {
    id: string;
    user: {
        name: string;
        avatar: string;
    };
    action: string;
    timestamp: string;
    content?: string;
}

export interface Recipe {
    id: string;
    slug: string;
    title: string;
    description: string;
    image: string;
    imageKey?: string | null;
    category: string;
    categorySlug?: string;
    categoryColor?: string;
    rating: number;
    prepTime: number;
    cookTime: number;
    calories?: number | null;
    proteinPerServing?: number | null;
    fatPerServing?: number | null;
    carbsPerServing?: number | null;
    nutritionCompleteness?: number | null;
    servings: number;
    difficulty: 'Einfach' | 'Mittel' | 'Schwer';
    ingredients: Ingredient[];
    flow: RecipeFlow;
    tags: string[];
    authorId: string;
    favoriteCount?: number;
    ratingCount?: number;
    cookCount?: number;
    moderationStatus?: string;
    moderationNote?: string | null;
    viewer?: {
        id: string;
        isFavorite: boolean;
        rating: number | null;
        isFollowingAuthor: boolean;
        canFollow: boolean;
        isAuthor: boolean;
        hasCooked: boolean;
    };
}
