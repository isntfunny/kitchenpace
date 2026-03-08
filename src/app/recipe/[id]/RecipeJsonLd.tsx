import type { RecipeDetailData } from '@app/app/actions/recipes';
import { APP_URL } from '@app/lib/url';

function minutesToIso8601Duration(minutes: number | undefined): string | undefined {
    if (!minutes || minutes <= 0) return undefined;
    if (minutes < 60) return `PT${minutes}M`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `PT${h}H${m}M` : `PT${h}H`;
}

type Props = {
    recipe: RecipeDetailData;
    ogImageUrl: string;
};

export function RecipeJsonLd({ recipe, ogImageUrl }: Props) {
    const recipeUrl = `${APP_URL}/recipe/${recipe.slug}`;
    const categoryName = recipe.category ?? 'Hauptgericht';
    const categorySlug = recipe.categorySlug;

    const breadcrumb = {
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'KüchenTakt',
                item: APP_URL,
            },
            ...(categorySlug
                ? [
                      {
                          '@type': 'ListItem',
                          position: 2,
                          name: categoryName,
                          item: `${APP_URL}/category/${categorySlug}`,
                      },
                      {
                          '@type': 'ListItem',
                          position: 3,
                          name: recipe.title,
                          item: recipeUrl,
                      },
                  ]
                : [
                      {
                          '@type': 'ListItem',
                          position: 2,
                          name: recipe.title,
                          item: recipeUrl,
                      },
                  ]),
        ],
    };

    const recipeSchema: Record<string, unknown> = {
        '@type': 'Recipe',
        '@id': `${recipeUrl}#recipe`,
        name: recipe.title,
        description: recipe.description || undefined,
        image: ogImageUrl,
        url: recipeUrl,
        inLanguage: 'de-DE',
        author: recipe.author
            ? {
                  '@type': 'Person',
                  name: recipe.author.name,
                  url: `${APP_URL}/user/${recipe.author.slug}`,
              }
            : undefined,
        ...(recipe.publishedAt && { datePublished: recipe.publishedAt }),
        ...(recipe.updatedAt && { dateModified: recipe.updatedAt }),
        ...(minutesToIso8601Duration(recipe.prepTime) && {
            prepTime: minutesToIso8601Duration(recipe.prepTime),
        }),
        ...(minutesToIso8601Duration(recipe.cookTime) && {
            cookTime: minutesToIso8601Duration(recipe.cookTime),
        }),
        ...(minutesToIso8601Duration(recipe.totalTime) && {
            totalTime: minutesToIso8601Duration(recipe.totalTime),
        }),
        recipeYield: recipe.servings ? `${recipe.servings} Portionen` : undefined,
        recipeIngredient:
            recipe.ingredients.length > 0
                ? recipe.ingredients.map((ing) => {
                      const parts = [
                          ing.amount > 0 ? ing.amount.toString() : null,
                          ing.unit || null,
                          ing.name,
                          ing.notes ? `(${ing.notes})` : null,
                      ].filter(Boolean);
                      return parts.join(' ');
                  })
                : undefined,
        recipeInstructions:
            recipe.flow.nodes.length > 0
                ? recipe.flow.nodes
                      .filter((n) => n.type !== 'start' && n.label)
                      .map((n, i) => ({
                          '@type': 'HowToStep',
                          position: i + 1,
                          name: n.label,
                          text: n.description || n.label,
                          ...(n.duration && n.duration > 0
                              ? { totalTime: minutesToIso8601Duration(n.duration) }
                              : {}),
                      }))
                : undefined,
        ...(recipe.rating > 0 && recipe.ratingCount > 0
            ? {
                  aggregateRating: {
                      '@type': 'AggregateRating',
                      ratingValue: recipe.rating.toFixed(1),
                      ratingCount: recipe.ratingCount,
                      bestRating: '5',
                      worstRating: '1',
                  },
              }
            : {}),
        keywords: recipe.tags.length > 0 ? recipe.tags.join(', ') : undefined,
        recipeCategory: categoryName,
    };

    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [breadcrumb, recipeSchema],
    };

    return (
        <script
            type="application/ld+json"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}
