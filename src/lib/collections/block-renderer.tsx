import { FeaturedTrio } from '@app/app/category/[slug]/components/FeaturedTrio';
import { TopRankedList } from '@app/app/category/[slug]/components/sidebar/TopRankedList';
import { HorizontalRecipeScroll } from '@app/components/features/HorizontalRecipeScroll';
import { RecipeCard } from '@app/components/features/RecipeCard';

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

    // Pre-fetch all recipe data in parallel
    const queries: Array<{ index: number; props: RecipeFilterProps }> = [];
    for (let i = 0; i < blocks.content.length; i++) {
        const props = blockToFilterProps(blocks.content[i]);
        if (props) queries.push({ index: i, props });
    }

    const results = await Promise.all(
        queries.map(async ({ index, props }) => ({
            index,
            data: await resolveRecipeFilter(props, viewerUserId),
        })),
    );

    const recipeDataByIndex = new Map(results.map(({ index, data }) => [index, data]));

    // Render blocks inline — Client Components must be rendered directly
    // from this async Server Component, not from a nested function component
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < blocks.content.length; i++) {
        const node = blocks.content[i];
        const recipes = recipeDataByIndex.get(i) ?? [];
        const key = `block-${i}`;

        switch (node.type) {
            case 'recipeCard': {
                if (recipes.length === 0) break;
                elements.push(
                    <div key={key} style={{ maxWidth: 400, margin: '1.5rem 0' }}>
                        <RecipeCard
                            recipe={recipes[0]}
                            variant="default"
                            categoryOnImage
                            starRating
                        />
                    </div>,
                );
                break;
            }

            case 'recipeCardWithText': {
                if (recipes.length === 0) break;
                elements.push(
                    <div
                        key={key}
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
                        <RecipeCard
                            recipe={recipes[0]}
                            variant="default"
                            categoryOnImage
                            starRating
                        />
                    </div>,
                );
                break;
            }

            case 'recipeSlider': {
                if (recipes.length === 0) break;
                elements.push(<HorizontalRecipeScroll key={key} recipes={recipes} />);
                break;
            }

            case 'featuredTrio': {
                if (recipes.length === 0) break;
                elements.push(<FeaturedTrio key={key} recipes={recipes} categoryColor="#f97316" />);
                break;
            }

            case 'topList': {
                if (recipes.length === 0) break;
                elements.push(<TopRankedList key={key} recipes={recipes} />);
                break;
            }

            case 'recipeFlow': {
                const title = node.attrs?.recipeTitle as string | undefined;
                elements.push(
                    <div
                        key={key}
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
                    </div>,
                );
                break;
            }

            case 'randomPick': {
                elements.push(
                    <div
                        key={key}
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
                    </div>,
                );
                break;
            }

            default: {
                const html = renderNodeToHtml(node);
                if (html) {
                    elements.push(<div key={key} dangerouslySetInnerHTML={{ __html: html }} />);
                }
                break;
            }
        }
    }

    return <>{elements}</>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const RECIPE_BLOCK_TYPES = new Set([
    'recipeCard',
    'recipeCardWithText',
    'recipeSlider',
    'featuredTrio',
    'topList',
]);

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
