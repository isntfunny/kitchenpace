import type { CollectionTemplate, ModerationStatus } from '@prisma/client';

/** Tiptap JSON document type */
export type TiptapJSON = {
    type: string;
    content?: TiptapJSON[];
    attrs?: Record<string, unknown>;
    text?: string;
    marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
};

/** Card data for collection browse/homepage displays */
export interface CollectionCardData {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    coverImageKey: string | null;
    template: CollectionTemplate;
    recipeCount: number;
    viewCount: number;
    favoriteCount: number;
    authorName: string;
    authorSlug: string;
    authorPhotoKey: string | null;
    published: boolean;
    moderationStatus: string;
    createdAt: string;
}

/** Shared filter props for recipe components */
export interface RecipeFilterProps {
    ids?: string[];
    byUser?: string;
    byMyself?: boolean;
    tags?: string[];
    category?: string;
    sort?: 'rating' | 'newest' | 'popular';
    limit?: number;
}

/** Collection detail data for the detail page */
export interface CollectionDetail {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    coverImageKey: string | null;
    template: CollectionTemplate;
    blocks: TiptapJSON | null;
    published: boolean;
    moderationStatus: ModerationStatus;
    viewCount: number;
    authorId: string;
    author: {
        id: string;
        name: string | null;
        slug: string;
        photoKey: string | null;
    };
    favoriteCount: number;
    isFavorited: boolean;
    recipeCount: number;
    createdAt: string;
    updatedAt: string;
}

/** Input for creating/updating a collection */
export interface CollectionMutationInput {
    title: string;
    description?: string;
    coverImageKey?: string;
    template: CollectionTemplate;
    blocks?: TiptapJSON | null;
    categoryIds?: string[];
    tagIds?: string[];
}
