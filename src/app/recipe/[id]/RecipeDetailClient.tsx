'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import {
    rateRecipeAction,
    toggleFavoriteAction,
    toggleFollowAction,
    markRecipeCookedAction,
} from '@app/app/actions/social';
import { AchievementOverlay } from '@app/components/features/AchievementOverlay';
import { RecipeStepsViewer } from '@app/components/flow/RecipeStepsViewer';
import type { PersistedViewerState } from '@app/components/flow/viewer/viewerPersistence';
import { useRecipeTabs } from '@app/components/hooks/useRecipeTabs';
import { PageShell } from '@app/components/layouts/PageShell';
import { RECIPE_CREATION_TUTORIAL_CELEBRATION_KEY } from '@app/components/recipe/tutorial/shared';
import { buildRecipeFilterHref } from '@app/lib/recipeFilters';
import { TROPHIES } from '@app/lib/trophies/registry';

import { css } from 'styled-system/css';
import { grid, container } from 'styled-system/patterns';

import { ActivityFeed } from './components/ActivityFeed';
import { AuthorCard } from './components/AuthorCard';
import { CookDialog } from './components/CookDialog';
import { HeroImageGallery } from './components/HeroImageGallery';
import { IngredientList } from './components/IngredientList';
import { printRecipe } from './components/PrintRecipe';
import { RecipeActionButtons } from './components/RecipeActionButtons';
import { RecipeStatusBanner } from './components/RecipeStatusBanner';
import { RecipeSummaryCard } from './components/RecipeSummaryCard';
import type { Recipe, User, Activity } from './data';

// ── Inline star sparkle ───────────────────────────────────────────────────────
// Stars are size=22 inside a borderless button (≈22×22px).
// Outer star tips sit at ~43% of button size from center.
const _STAR_TIPS = Array.from({ length: 5 }, (_, k) => {
    const angle = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
    return { x: 50 + 43 * Math.cos(angle), y: 50 + 43 * Math.sin(angle), angle };
});
const _STAR_COLORS = ['#f8b500', '#e07b53', '#f76b15', '#ffd166', '#ffb347', '#ff9a5c'];

interface _StarSpark {
    id: number;
    x: string;
    y: string;
    dx: number;
    dy: number;
    color: string;
    size: number;
    duration: number;
    delay: number;
}
interface _StarBurst {
    id: number;
    starIndex: number;
    sparks: _StarSpark[];
}

function _makeStarSparks(): _StarSpark[] {
    const sparks: _StarSpark[] = [];
    _STAR_TIPS.forEach((tip, ti) => {
        for (let i = 0; i < 3; i++) {
            const angle = tip.angle + (Math.random() - 0.5) * (Math.PI / 3.5);
            const dist = 14 + Math.random() * 24;
            sparks.push({
                id: ti * 10 + i,
                x: `${tip.x}%`,
                y: `${tip.y}%`,
                dx: Math.cos(angle) * dist,
                dy: Math.sin(angle) * dist,
                color: _STAR_COLORS[Math.floor(Math.random() * _STAR_COLORS.length)],
                size: 2 + Math.random() * 3,
                duration: 0.42 + Math.random() * 0.3,
                delay: Math.random() * 0.08,
            });
        }
    });
    return sparks;
}

type CookImageItem = {
    id: string;
    imageKey: string;
    caption: string | null;
    createdAt: Date;
    user: {
        id: string;
        name: string | null;
        nickname: string | null;
        avatar: string | null;
    };
};

type HeroImage = {
    src: string;
    thumbKey?: string | null;
    title: string;
    subtitle?: string;
    reportable?: {
        contentType: 'cook_image';
        contentId: string;
        ownerId: string;
    };
};

type RecipeDetailClientProps = {
    recipe: Recipe;
    author: User | null;
    recipeActivities: Activity[];
    cookImages?: CookImageItem[];
    isDraft?: boolean;
    initialProgress?: PersistedViewerState | null;
    isAuthenticated?: boolean;
};

export function RecipeDetailClient({
    recipe,
    author,
    recipeActivities,
    cookImages = [],
    isDraft = false,
    initialProgress,
    isAuthenticated,
}: RecipeDetailClientProps) {
    // State declarations MUST come first
    const router = useRouter();
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [servings, setServings] = useState(recipe.servings);
    const initialViewer = recipe.viewer ?? null;
    const [favoriteState, setFavoriteState] = useState({
        isFavorite: initialViewer?.isFavorite ?? false,
        count: recipe.favoriteCount ?? 0,
    });
    const [isFollowing, setIsFollowing] = useState(initialViewer?.isFollowingAuthor ?? false);
    const [authorFollowers, setAuthorFollowers] = useState(author?.followerCount ?? 0);
    const [viewerRating, setViewerRating] = useState<number | null>(initialViewer?.rating ?? null);
    const [averageRating, setAverageRating] = useState(recipe.rating ?? 0);
    const [ratingCount, setRatingCount] = useState(recipe.ratingCount ?? 0);
    const [starBursts, setStarBursts] = useState<_StarBurst[]>([]);
    const [isFavoritePending, startFavoriteTransition] = useTransition();
    const [isFollowPending, startFollowTransition] = useTransition();
    const [isRatingPending, startRatingTransition] = useTransition();
    const [isCookPending, startCookTransition] = useTransition();
    const [showCookDialog, setShowCookDialog] = useState(false);
    const [cookCount, setCookCount] = useState(recipe.cookCount ?? 0);
    const [hasCooked, setHasCooked] = useState(initialViewer?.hasCooked ?? false);
    const [heroIndex, setHeroIndex] = useState(0);
    const [viewerId, setViewerId] = useState(initialViewer?.id ?? null);
    const [celebrationTrophy, setCelebrationTrophy] = useState<{
        id: string;
        name: string;
        description: string;
        icon: string;
    } | null>(null);

    // Show trophy celebration after tutorial redirect
    useEffect(() => {
        try {
            const trophyId = window.sessionStorage.getItem(
                RECIPE_CREATION_TUTORIAL_CELEBRATION_KEY,
            );
            if (!trophyId) return;
            window.sessionStorage.removeItem(RECIPE_CREATION_TUTORIAL_CELEBRATION_KEY);
            const trophy = TROPHIES[trophyId as keyof typeof TROPHIES];
            if (trophy) {
                setCelebrationTrophy(trophy);
            }
        } catch {
            // ignore sessionStorage failures
        }
    }, []);

    useEffect(() => {
        let active = true;

        const loadViewer = async () => {
            try {
                const response = await fetch(`/api/recipe/${recipe.slug}/viewer`, {
                    credentials: 'include',
                });
                if (!response.ok) {
                    return;
                }

                const data = (await response.json()) as { viewer: Recipe['viewer'] | null };
                if (!active) {
                    return;
                }

                const viewer = data.viewer;
                if (!viewer) {
                    setViewerId(null);
                    setIsFollowing(false);
                    setViewerRating(null);
                    setHasCooked(false);
                    setFavoriteState((state) => ({
                        ...state,
                        isFavorite: false,
                    }));
                    return;
                }

                setViewerId(viewer.id);
                setIsFollowing(viewer.isFollowingAuthor ?? false);
                setViewerRating(viewer.rating ?? null);
                setHasCooked(viewer.hasCooked ?? false);
                setFavoriteState((state) => ({
                    ...state,
                    isFavorite: viewer.isFavorite ?? false,
                }));
            } catch (error) {
                console.error('Failed to load viewer info', error);
            }
        };

        loadViewer();

        return () => {
            active = false;
        };
    }, [recipe.slug]);

    const heroImages = useMemo<HeroImage[]>(() => {
        const primary: HeroImage = {
            src: recipe.image,
            thumbKey: recipe.imageKey ?? null,
            title: recipe.title,
            subtitle: 'Rezeptbild',
        };
        const extras = cookImages.map((img) => ({
            src: img.imageKey,
            thumbKey: img.imageKey,
            title: img.user.name || img.user.nickname || 'Küchenfreund',
            subtitle: img.caption || 'Foto',
            reportable: {
                contentType: 'cook_image' as const,
                contentId: img.id,
                ownerId: img.user.id,
            },
        }));
        return [primary, ...extras];
    }, [cookImages, recipe.image, recipe.imageKey, recipe.title]);

    // Recipe tabs context for tracking views
    const { addToRecent } = useRecipeTabs();

    // Track recipe view - only once per recipe
    const trackedRef = useRef<string | null>(null);
    useEffect(() => {
        if (trackedRef.current === recipe.id) return;
        trackedRef.current = recipe.id;

        addToRecent({
            id: recipe.id,
            title: recipe.title,
            slug: recipe.id,
            imageKey: recipe.imageKey ?? undefined,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
            difficulty: recipe.difficulty,
        });
    }, [
        recipe.id,
        recipe.title,
        recipe.image,
        recipe.imageKey,
        recipe.prepTime,
        recipe.cookTime,
        recipe.difficulty,
        addToRecent,
    ]);

    const starValues = [1, 2, 3, 4, 5] as const;
    const activeStarValue = viewerRating ?? Math.round(averageRating || 0);

    const formatAmount = (amount: number): string => {
        const scaled = amount * (servings / recipe.servings);
        return Number.isInteger(scaled) ? scaled.toString() : scaled.toFixed(1);
    };

    const handleTagClick = (tag: string) => {
        router.push(buildRecipeFilterHref({ tags: [tag] }));
    };

    const handlePrint = () => printRecipe(recipe, servings);

    const requireAuth = () => {
        if (viewerId) {
            return true;
        }

        const callback = typeof window !== 'undefined' ? window.location.pathname : '/';
        router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callback)}`);
        return false;
    };

    const handleFavoriteToggle = () => {
        if (!requireAuth()) return;

        startFavoriteTransition(async () => {
            try {
                const result = await toggleFavoriteAction(recipe.id);
                setFavoriteState({
                    isFavorite: result.isFavorite,
                    count: result.favoriteCount,
                });
            } catch (error) {
                console.error(error);
            }
        });
    };

    const handleFollowToggle = () => {
        if (!author || author.id === viewerId) return;
        if (!requireAuth()) return;

        startFollowTransition(async () => {
            try {
                const result = await toggleFollowAction(author.id, { recipeId: recipe.id });
                setIsFollowing(result.isFollowing);
                setAuthorFollowers(result.followerCount);
            } catch (error) {
                console.error(error);
            }
        });
    };

    const triggerStarBurst = useCallback((starIndex: number) => {
        const id = Date.now() + starIndex;
        setStarBursts((prev) => [...prev, { id, starIndex, sparks: _makeStarSparks() }]);
        setTimeout(() => setStarBursts((prev) => prev.filter((b) => b.id !== id)), 1000);
    }, []);

    const handleRatingSelect = (value: number) => {
        if (!requireAuth()) return;

        // Cascade sparkle across newly-lit stars
        const prev = viewerRating ?? 0;
        if (value > prev) {
            for (let v = prev + 1; v <= value; v++) {
                setTimeout(() => triggerStarBurst(v), (v - prev - 1) * 75);
            }
        } else {
            triggerStarBurst(value);
        }

        startRatingTransition(async () => {
            try {
                const result = await rateRecipeAction(recipe.id, value);
                setViewerRating(result.rating);
                setAverageRating(result.average);
                setRatingCount(result.count);
            } catch (error) {
                console.error(error);
            }
        });
    };

    const handleMarkCooked = () => {
        if (!requireAuth()) return;
        setShowCookDialog(true);
    };

    const handleSubmitCook = async ({ notes, imageKey }: { notes: string; imageKey?: string }) => {
        if (!requireAuth()) return;

        startCookTransition(async () => {
            try {
                const result = await markRecipeCookedAction(recipe.id, {
                    notes: notes || undefined,
                    imageKey,
                });

                if (result.hasImage) {
                    router.refresh();
                }
                setHasCooked(true);
                setCookCount(result.cookCount);
                setShowCookDialog(false);
            } catch (error) {
                console.error(error);
            }
        });
    };

    return (
        <PageShell fluid>
            <RecipeStatusBanner
                recipeId={recipe.id}
                isDraft={isDraft}
                isAuthor={recipe.viewer?.isAuthor ?? false}
                moderationStatus={recipe.moderationStatus}
                moderationNote={recipe.moderationNote}
            />
            <div
                className={container({
                    maxW: '1400px',
                    mx: 'auto',
                    px: { base: '4', md: '6' },
                    py: '5',
                })}
            >
                <div className={css({ mb: '5' })}>
                    <div className={css({ mb: '4' })}>
                        <h1
                            className={css({
                                fontFamily: 'heading',
                                fontSize: '4xl',
                                fontWeight: '700',
                                lineHeight: 'short',
                            })}
                        >
                            {recipe.title}
                        </h1>
                    </div>
                    <div className={grid({ columns: { base: 1, md: 2 }, gap: '5' })}>
                        <div
                            className={css({
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '3',
                            })}
                        >
                            <HeroImageGallery
                                images={heroImages}
                                currentIndex={heroIndex}
                                onIndexChange={setHeroIndex}
                                lightboxIndex={lightboxIndex}
                                onLightboxIndexChange={setLightboxIndex}
                                lightboxOpen={lightboxOpen}
                                onLightboxOpenChange={setLightboxOpen}
                                recipeId={recipe.id}
                                recipeTitle={recipe.title}
                                viewerId={viewerId}
                            />
                        </div>

                        <div
                            className={css({
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                            })}
                        >
                            <RecipeSummaryCard
                                recipe={recipe}
                                categoryHref={
                                    recipe.categorySlug
                                        ? `/category/${recipe.categorySlug}`
                                        : buildRecipeFilterHref({ categories: [recipe.category] })
                                }
                                isDraft={isDraft}
                                starValues={starValues}
                                activeStarValue={activeStarValue}
                                isRatingPending={isRatingPending}
                                ratingCount={ratingCount}
                                averageRating={averageRating}
                                starBursts={starBursts}
                                onTagClick={handleTagClick}
                                onRatingSelect={handleRatingSelect}
                            />

                            <RecipeActionButtons
                                recipeId={recipe.id}
                                recipeTitle={recipe.title}
                                recipeSlug={recipe.slug}
                                recipeImageKey={recipe.imageKey}
                                isFavorite={favoriteState.isFavorite}
                                favoriteCount={favoriteState.count}
                                hasCooked={hasCooked}
                                cookCount={cookCount}
                                isFavoritePending={isFavoritePending}
                                isCookPending={isCookPending}
                                isAuthor={recipe.viewer?.isAuthor ?? false}
                                onFavoriteToggle={handleFavoriteToggle}
                                onCookToggle={handleMarkCooked}
                                onPrint={handlePrint}
                            />
                        </div>
                    </div>
                </div>

                <div className={grid({ columns: { base: 1, md: 12 }, gap: '5' })}>
                    <div className={css({ md: { gridColumn: 'span 4' } })}>
                        <IngredientList
                            ingredients={recipe.ingredients}
                            servings={servings}
                            originalServings={recipe.servings}
                            onServingsChange={setServings}
                            calories={recipe.calories}
                            proteinPerServing={recipe.proteinPerServing}
                            fatPerServing={recipe.fatPerServing}
                            carbsPerServing={recipe.carbsPerServing}
                            nutritionCompleteness={recipe.nutritionCompleteness}
                            formatAmount={formatAmount}
                        />
                    </div>

                    <div className={css({ md: { gridColumn: 'span 8' } })}>
                        <div
                            className={css({
                                bg: 'surface',
                                borderRadius: '2xl',
                                p: '5',
                                boxShadow: 'shadow.medium',
                            })}
                        >
                            <h2
                                className={css({
                                    fontFamily: 'heading',
                                    fontSize: 'xl',
                                    fontWeight: '600',
                                    mb: '3',
                                })}
                            >
                                Zubereitung
                            </h2>

                            <RecipeStepsViewer
                                nodes={(recipe.flow?.nodes ?? []) as any}
                                edges={(recipe.flow?.edges ?? []) as any}
                                ingredients={recipe.ingredients?.map((ing: any) => ({
                                    id: ing.id ?? ing.name,
                                    name: ing.name,
                                    amount: ing.amount != null ? String(ing.amount) : undefined,
                                    unit: ing.unit,
                                }))}
                                recipeSlug={recipe.slug}
                                initialProgress={initialProgress}
                                isAuthenticated={isAuthenticated}
                            />
                        </div>
                    </div>
                </div>

                {author && (
                    <AuthorCard
                        author={author}
                        isFollowing={isFollowing}
                        followerCount={authorFollowers}
                        isFollowPending={isFollowPending}
                        isOwnProfile={author.id === viewerId}
                        onFollowToggle={handleFollowToggle}
                    />
                )}

                <ActivityFeed activities={recipeActivities} />
            </div>

            <CookDialog
                isOpen={showCookDialog}
                onClose={() => setShowCookDialog(false)}
                onSubmit={handleSubmitCook}
                isPending={isCookPending}
            />

            {celebrationTrophy && (
                <AchievementOverlay
                    trophy={celebrationTrophy}
                    onClose={() => setCelebrationTrophy(null)}
                />
            )}
        </PageShell>
    );
}
