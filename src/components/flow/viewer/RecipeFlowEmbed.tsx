/**
 * RecipeFlowEmbed — server component
 *
 * Embed the full recipe flow viewer anywhere by just passing a recipeId or slug.
 * Loads DRAFT recipes too (no publishedAt filter), so safe for admin/info pages.
 *
 * Usage:
 *   <RecipeFlowEmbed recipeId="some-slug-or-id" />
 *   <RecipeFlowEmbed recipeId="abc123" fallback={<p>Rezept nicht gefunden</p>} />
 */

import { type ReactNode } from 'react';

import { prisma } from '@shared/prisma';

import type { FlowEdgeSerialized, FlowNodeSerialized } from '../editor/editorTypes';
import { RecipeStepsViewer } from '../RecipeStepsViewer';

interface RecipeFlowEmbedProps {
    /** Recipe ID or slug */
    recipeId: string;
    /** Rendered when the recipe doesn't exist (default: null) */
    fallback?: ReactNode;
}

export async function RecipeFlowEmbed({ recipeId, fallback = null }: RecipeFlowEmbedProps) {
    const recipe = await prisma.recipe.findFirst({
        where: { OR: [{ id: recipeId }, { slug: recipeId }] },
        // no publishedAt filter — DRAFT recipes are intentionally included
        select: {
            slug: true,
            flowNodes: true,
            flowEdges: true,
            recipeIngredients: {
                include: { ingredient: true },
                orderBy: { position: 'asc' },
            },
        },
    });

    if (!recipe) return <>{fallback}</>;

    const nodes = (recipe.flowNodes as FlowNodeSerialized[] | null) ?? [];
    const edges = (recipe.flowEdges as FlowEdgeSerialized[] | null) ?? [];
    const ingredients = recipe.recipeIngredients.map((ri) => ({
        id: ri.ingredientId,
        name: ri.ingredient.name,
        amount: ri.amount ?? undefined,
        unit: ri.unit ?? undefined,
    }));

    return (
        <RecipeStepsViewer
            nodes={nodes}
            edges={edges}
            ingredients={ingredients}
            recipeSlug={recipe.slug ?? undefined}
        />
    );
}
