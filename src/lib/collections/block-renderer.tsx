import { FeaturedTrio } from '@app/app/category/[slug]/components/FeaturedTrio';
import { TopRankedList } from '@app/app/category/[slug]/components/sidebar/TopRankedList';
import { HorizontalRecipeScroll } from '@app/components/features/HorizontalRecipeScroll';
import { RecipeCard } from '@app/components/features/RecipeCard';
import type { RecipeCardData } from '@app/lib/recipe-card';

import { resolveRecipeFilter } from './block-queries';
import type { TiptapJSON, RecipeFilterProps } from './types';

// ── Main Component (async Server Component) ────────────────────────────────

interface CollectionBlockRendererProps {
    blocks: TiptapJSON;
    viewerUserId?: string | null;
}

export async function CollectionBlockRenderer({
    blocks,
    viewerUserId,
}: CollectionBlockRendererProps) {
    if (!blocks.content || blocks.content.length === 0) return null;

    // Pre-fetch all recipe data in one pass to avoid sequential awaits per block
    const recipeDataMap = await prefetchRecipeData(blocks, viewerUserId);

    return (
        <>
            {blocks.content.map((node, i) => (
                <BlockNode key={`block-${i}`} node={node} recipeDataMap={recipeDataMap} />
            ))}
        </>
    );
}

// ── Individual Block Renderer (sync, uses pre-fetched data) ─────────────────

interface BlockNodeProps {
    node: TiptapJSON;
    recipeDataMap: Map<string, RecipeCardData[]>;
}

function BlockNode({ node, recipeDataMap }: BlockNodeProps) {
    const cacheKey = blockCacheKey(node);
    const recipes = recipeDataMap.get(cacheKey) ?? [];

    switch (node.type) {
        case 'recipeCard': {
            if (recipes.length === 0) return null;
            return (
                <div style={{ maxWidth: 400, margin: '1.5rem 0' }}>
                    <RecipeCard recipe={recipes[0]} variant="default" categoryOnImage starRating />
                </div>
            );
        }

        case 'recipeCardWithText': {
            if (recipes.length === 0) return null;
            return (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1.5rem',
                        margin: '1.5rem 0',
                        alignItems: 'start',
                    }}
                >
                    <div style={{ fontSize: '0.95rem', lineHeight: '1.7' }}>
                        {String(node.attrs?.text ?? '')}
                    </div>
                    <RecipeCard recipe={recipes[0]} variant="default" categoryOnImage starRating />
                </div>
            );
        }

        case 'recipeSlider': {
            if (recipes.length === 0) return null;
            return <HorizontalRecipeScroll recipes={recipes} />;
        }

        case 'featuredTrio': {
            if (recipes.length === 0) return null;
            return <FeaturedTrio recipes={recipes} categoryColor="#f97316" />;
        }

        case 'topList': {
            if (recipes.length === 0) return null;
            return <TopRankedList recipes={recipes} />;
        }

        case 'recipeFlow': {
            const title = node.attrs?.recipeTitle as string | undefined;
            return (
                <div
                    style={{
                        margin: '1.5rem 0',
                        padding: '1rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        textAlign: 'center',
                        color: '#6b7280',
                    }}
                >
                    Rezept-Flow: {title ?? 'Unbekannt'}
                </div>
            );
        }

        case 'randomPick': {
            return (
                <div
                    style={{
                        margin: '1.5rem 0',
                        padding: '1rem',
                        border: '1px dashed #e5e7eb',
                        borderRadius: '12px',
                        textAlign: 'center',
                        color: '#6b7280',
                    }}
                >
                    Zufälliges Rezept wird hier angezeigt
                </div>
            );
        }

        // Text nodes
        default: {
            const html = renderNodeToHtml(node);
            if (!html) return null;
            return <div dangerouslySetInnerHTML={{ __html: html }} />;
        }
    }
}

// ── Pre-fetch: gather all recipe queries, execute in parallel ────────────────

const RECIPE_BLOCK_TYPES = new Set([
    'recipeCard',
    'recipeCardWithText',
    'recipeSlider',
    'featuredTrio',
    'topList',
]);

function blockCacheKey(node: TiptapJSON): string {
    return `${node.type}-${JSON.stringify(node.attrs ?? {})}`;
}

function blockToFilterProps(node: TiptapJSON): RecipeFilterProps | null {
    if (!RECIPE_BLOCK_TYPES.has(node.type)) return null;
    const attrs = node.attrs ?? {};

    if (node.type === 'recipeCard' || node.type === 'recipeCardWithText') {
        const id = attrs.recipeId as string;
        return id ? { ids: [id] } : null;
    }

    return {
        ids: attrs.recipeIds as string[] | undefined,
        category: attrs.category as string | undefined,
        tags: attrs.tags as string[] | undefined,
        sort: attrs.sort as 'rating' | 'newest' | 'popular' | undefined,
        limit:
            (attrs.limit as number) ??
            (node.type === 'featuredTrio' ? 3 : node.type === 'topList' ? 5 : 8),
    };
}

async function prefetchRecipeData(
    doc: TiptapJSON,
    viewerUserId?: string | null,
): Promise<Map<string, RecipeCardData[]>> {
    const map = new Map<string, RecipeCardData[]>();
    if (!doc.content) return map;

    const queries: Array<{ key: string; props: RecipeFilterProps }> = [];

    for (const node of doc.content) {
        const props = blockToFilterProps(node);
        if (props) {
            queries.push({ key: blockCacheKey(node), props });
        }
    }

    const results = await Promise.all(
        queries.map(async ({ key, props }) => {
            const data = await resolveRecipeFilter(props, viewerUserId);
            return { key, data };
        }),
    );

    for (const { key, data } of results) {
        map.set(key, data);
    }

    return map;
}

// ── Text Node → HTML ─────────────────────────────────────────────────────────

function renderNodeToHtml(node: TiptapJSON): string {
    if (node.type === 'text') {
        let html = escapeHtml(node.text ?? '');
        if (node.marks) {
            for (const mark of node.marks) {
                if (mark.type === 'bold') html = `<strong>${html}</strong>`;
                if (mark.type === 'italic') html = `<em>${html}</em>`;
                if (mark.type === 'link')
                    html = `<a href="${escapeHtml(String(mark.attrs?.href ?? ''))}" rel="noopener">${html}</a>`;
            }
        }
        return html;
    }

    const children = (node.content ?? []).map(renderNodeToHtml).join('');

    switch (node.type) {
        case 'paragraph':
            return children ? `<p>${children}</p>` : '';
        case 'heading': {
            const level = (node.attrs?.level as number) ?? 2;
            return `<h${level}>${children}</h${level}>`;
        }
        case 'bulletList':
            return `<ul>${children}</ul>`;
        case 'orderedList':
            return `<ol>${children}</ol>`;
        case 'listItem':
            return `<li>${children}</li>`;
        case 'blockquote':
            return `<blockquote>${children}</blockquote>`;
        case 'horizontalRule':
            return '<hr />';
        case 'hardBreak':
            return '<br />';
        case 'doc':
            return children;
        default:
            return children;
    }
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
