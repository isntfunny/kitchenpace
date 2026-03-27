import type { ReactNode } from 'react';

import { prisma } from '@shared/prisma';

import type { FlowEdgeSerialized, FlowNodeSerialized } from '../editor/editorTypes';
import { RecipeStepsViewer } from '../RecipeStepsViewer';

interface RecipeFlowEmbedProps {
    recipeId: string;
    fallback?: ReactNode;
}

export async function RecipeFlowEmbed({ recipeId, fallback = null }: RecipeFlowEmbedProps) {
    if (!recipeId) return <>{fallback}</>;

    const recipe = await prisma.recipe.findFirst({
        where: {
            OR: [{ id: recipeId }, { slug: recipeId }],
            status: 'PUBLISHED',
            moderationStatus: { in: ['AUTO_APPROVED', 'APPROVED'] },
        },
        select: {
            id: true,
            slug: true,
            title: true,
            flowNodes: true,
            flowEdges: true,
            recipeIngredients: {
                include: {
                    unit: true,
                    ingredient: true,
                },
                orderBy: { position: 'asc' },
            },
        },
    });

    if (!recipe) return <>{fallback}</>;

    const stepImages = await prisma.recipeStepImage.findMany({
        where: { recipeId: recipe.id },
        select: { stepId: true, photoKey: true },
    });

    const photoKeyByStepId = new Map(
        stepImages.map((stepImage) => [stepImage.stepId, stepImage.photoKey]),
    );

    const nodes = ((recipe.flowNodes as FlowNodeSerialized[] | null) ?? []).map((node) => {
        const photoKey = photoKeyByStepId.get(node.id);
        return photoKey ? { ...node, photoKey } : node;
    });
    const edges = (recipe.flowEdges as FlowEdgeSerialized[] | null) ?? [];
    const ingredients = recipe.recipeIngredients.map((ri) => ({
        id: ri.ingredientId,
        name: ri.ingredient.name,
        amount: ri.amount ?? undefined,
        unit: ri.unit.shortName,
    }));

    return (
        <div
            style={{
                margin: '1.5rem 0',
                background: 'var(--colors-surface)',
                borderRadius: '24px',
                padding: '1.25rem',
            }}
        >
            <div
                style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    marginBottom: '0.75rem',
                }}
            >
                {recipe.title}
            </div>
            <RecipeStepsViewer
                nodes={nodes}
                edges={edges}
                ingredients={ingredients}
                recipeSlug={recipe.slug}
            />
        </div>
    );
}
