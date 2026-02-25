'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

import {
    rateRecipeAction,
    toggleFavoriteAction,
    toggleFollowAction,
    markRecipeCookedAction,
} from '@/app/actions/social';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { SmartImage } from '@/components/atoms/SmartImage';
import { Header } from '@/components/features/Header';
import { RecipeFlow } from '@/components/flow/RecipeFlow';
import { useRecipeTabs } from '@/components/hooks/useRecipeTabs';
import { buildRecipeFilterHref } from '@/lib/recipeFilters';
import { css } from 'styled-system/css';
import { flex, grid, container } from 'styled-system/patterns';

import type { Recipe, User, Activity } from './data';

type CookImageItem = {
    id: string;
    imageUrl: string;
    imageKey?: string | null;
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
};

type RecipeDetailClientProps = {
    recipe: Recipe;
    author: User | null;
    recipeActivities: Activity[];
    cookImages?: CookImageItem[];
};

const difficultyFilterMap: Record<string, 'EASY' | 'MEDIUM' | 'HARD'> = {
    Einfach: 'EASY',
    Mittel: 'MEDIUM',
    Schwer: 'HARD',
};

export function RecipeDetailClient({
    recipe,
    author,
    recipeActivities,
    cookImages = [],
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
    const [isFavoritePending, startFavoriteTransition] = useTransition();
    const [isFollowPending, startFollowTransition] = useTransition();
    const [isRatingPending, startRatingTransition] = useTransition();
    const [isCookPending, startCookTransition] = useTransition();
    const [showCookDialog, setShowCookDialog] = useState(false);
    const [cookCount, setCookCount] = useState(recipe.cookCount ?? 0);
    const [hasCooked, setHasCooked] = useState(initialViewer?.hasCooked ?? false);
    const [uploadedImage, setUploadedImage] = useState<File | null>(null);
    const [cookNotes, setCookNotes] = useState('');
    const [heroIndex, setHeroIndex] = useState(0);
    const [viewerId, setViewerId] = useState(initialViewer?.id ?? null);

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
            src: img.imageUrl,
            thumbKey: img.imageKey ?? null,
            title: img.user.name || img.user.nickname || 'Küchenfreund',
            subtitle: img.caption || 'Gekochtes Foto',
        }));
        return [primary, ...extras];
    }, [cookImages, recipe.image, recipe.imageKey, recipe.title]);

    const heroCount = Math.max(1, heroImages.length);
    const normalizedHeroIndex = heroCount ? heroIndex % heroCount : 0;
    const heroMeta = heroImages[normalizedHeroIndex];

    const handleHeroNext = () => setHeroIndex((prev) => (prev + 1) % heroCount);
    const handleHeroPrev = () => setHeroIndex((prev) => (prev - 1 + heroCount) % heroCount);

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
            imageUrl: recipe.image,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
            difficulty: recipe.difficulty,
        });
    }, [
        recipe.id,
        recipe.title,
        recipe.image,
        recipe.prepTime,
        recipe.cookTime,
        recipe.difficulty,
        addToRecent,
    ]);

    const totalTime = recipe.prepTime + recipe.cookTime;
    const starValues = [1, 2, 3, 4, 5] as const;
    const activeStarValue = viewerRating ?? Math.round(averageRating || 0);
    const ratingLabel = ratingCount === 1 ? 'Bewertung' : 'Bewertungen';

    const formatAmount = (amount: number): string => {
        const scaled = amount * (servings / recipe.servings);
        return Number.isInteger(scaled) ? scaled.toString() : scaled.toFixed(1);
    };

    const handleTagClick = (tag: string) => {
        router.push(buildRecipeFilterHref({ tags: [tag] }));
    };

    const handleCategoryClick = (category: string) => {
        router.push(buildRecipeFilterHref({ mealTypes: [category] }));
    };

    const handleDifficultyClick = (difficulty: string) => {
        const filterValue = difficultyFilterMap[difficulty];
        if (!filterValue) {
            return;
        }

        router.push(buildRecipeFilterHref({ difficulty: [filterValue] }));
    };

    const handlePrint = () => {
        window.print();
    };

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

    const handleRatingSelect = (value: number) => {
        if (!requireAuth()) return;

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

    const handleSubmitCook = async () => {
        if (!requireAuth()) return;

        startCookTransition(async () => {
            try {
                const result = await markRecipeCookedAction(recipe.id, {
                    notes: cookNotes || undefined,
                    image: uploadedImage,
                });

                if (result.hasImage) {
                    router.refresh();
                }
                setHasCooked(true);
                setCookCount(result.cookCount);
                setShowCookDialog(false);
                setUploadedImage(null);
                setCookNotes('');
            } catch (error) {
                console.error(error);
            }
        });
    };

    return (
        <div className={css({ minH: '100vh', color: 'text' })}>
            <Header />
            <main
                className={container({
                    maxW: '1400px',
                    mx: 'auto',
                    px: { base: '4', md: '6' },
                    py: '8',
                })}
            >
                <div className={css({ mb: '8' })}>
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
                    <div className={grid({ columns: { base: 1, lg: 2 }, gap: '8' })}>
                        <div
                            className={css({
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '3',
                            })}
                        >
                            <div
                                className={css({
                                    position: 'relative',
                                    borderRadius: '2xl',
                                    overflow: 'hidden',
                                    bg: 'black',
                                })}
                                data-debug-image-container
                            >
                                <div
                                    className={css({
                                        aspectRatio: '4/3',
                                        position: 'relative',
                                        cursor: 'pointer',
                                    })}
                                    onClick={() => {
                                        setLightboxIndex(normalizedHeroIndex);
                                        setLightboxOpen(true);
                                    }}
                                >
                                    <Image
                                        src={heroMeta?.src || recipe.image}
                                        alt={heroMeta?.title ?? recipe.title}
                                        fill
                                        sizes="(max-width: 1024px) 100vw, 50vw"
                                        style={{ objectFit: 'cover' }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleHeroPrev}
                                    aria-label="Vorheriges Bild"
                                    className={css({
                                        position: 'absolute',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        left: '2',
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: 'full',
                                        border: 'none',
                                        bg: 'rgba(0,0,0,0.4)',
                                        color: 'white',
                                        cursor: 'pointer',
                                    })}
                                >
                                    ‹
                                </button>
                                <button
                                    type="button"
                                    onClick={handleHeroNext}
                                    aria-label="Nächstes Bild"
                                    className={css({
                                        position: 'absolute',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        right: '2',
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: 'full',
                                        border: 'none',
                                        bg: 'rgba(0,0,0,0.4)',
                                        color: 'white',
                                        cursor: 'pointer',
                                    })}
                                >
                                    ›
                                </button>
                            </div>

                            <div className={css({ mt: '1' })}>
                                <div
                                    className={flex({
                                        justify: 'space-between',
                                        align: 'center',
                                        mb: '2',
                                        gap: '2',
                                    })}
                                >
                                    <span
                                        className={css({
                                            fontSize: 'sm',
                                            color: 'text-muted',
                                            fontFamily: 'body',
                                        })}
                                    >
                                        {heroMeta?.subtitle ?? 'Galerie'} ({normalizedHeroIndex + 1}
                                        /{heroCount})
                                    </span>
                                    {heroCount > 1 && (
                                        <span
                                            className={css({
                                                fontSize: 'xs',
                                                color: 'text-muted',
                                            })}
                                        >
                                            Tippe oder swipere über das Bild
                                        </span>
                                    )}
                                </div>
                                <div
                                    className={css({
                                        display: 'flex',
                                        gap: '2',
                                        overflowX: 'auto',
                                        pb: '2',
                                        maxW: '100%',
                                        lg: {
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                                            overflowX: 'visible',
                                        },
                                    })}
                                >
                                    {heroImages.map((img, idx) => {
                                        const thumbUrl = img.thumbKey
                                            ? `/api/thumbnail?key=${encodeURIComponent(img.thumbKey)}&width=200&height=200&fit=cover&quality=75`
                                            : img.src;
                                        return (
                                            <button
                                                key={`${idx}-${img.src}`}
                                                type="button"
                                                onClick={() => setHeroIndex(idx)}
                                                className={css({
                                                    borderRadius: 'lg',
                                                    border: '2px solid',
                                                    borderColor:
                                                        idx === normalizedHeroIndex
                                                            ? 'primary'
                                                            : 'transparent',
                                                    padding: 0,
                                                    minWidth: { base: '72px', lg: 'auto' },
                                                    width: '72px',
                                                    height: '72px',
                                                    flex: { base: '0 0 auto', lg: 'initial' },
                                                    overflow: 'hidden',
                                                    cursor: 'pointer',
                                                })}
                                            >
                                                <div
                                                    className={css({
                                                        position: 'relative',
                                                        width: '100%',
                                                        height: '100%',
                                                    })}
                                                >
                                                    <Image
                                                        src={thumbUrl}
                                                        alt={img.title}
                                                        fill
                                                        sizes="72px"
                                                        style={{ objectFit: 'cover' }}
                                                    />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div
                            className={css({
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                            })}
                        >
                            <div className={flex({ gap: '2', mb: '4', flexWrap: 'wrap' })}>
                                <button
                                    onClick={() => handleCategoryClick(recipe.category)}
                                    className={css({ cursor: 'pointer', _hover: { opacity: 0.8 } })}
                                >
                                    <Badge>{recipe.category}</Badge>
                                </button>
                                <button
                                    onClick={() => handleDifficultyClick(recipe.difficulty)}
                                    className={css({
                                        px: '3',
                                        py: '1',
                                        bg: 'light',
                                        borderRadius: 'full',
                                        fontSize: 'sm',
                                        fontFamily: 'body',
                                        cursor: 'pointer',
                                        transition: 'all 150ms ease',
                                        _hover: { bg: '#e8e2d9' },
                                    })}
                                >
                                    {recipe.difficulty}
                                </button>
                            </div>

                            <p
                                className={css({
                                    fontFamily: 'body',
                                    color: 'text-muted',
                                    mb: '6',
                                    lineHeight: 'relaxed',
                                })}
                            >
                                {recipe.description}
                            </p>

                            <div className={grid({ columns: 3, gap: '4', mb: '6' })}>
                                <div
                                    className={css({
                                        textAlign: 'center',
                                        p: '4',
                                        bg: 'light',
                                        borderRadius: 'xl',
                                    })}
                                >
                                    <div className={css({ fontSize: '2xl', mb: '1' })}>⏱️</div>
                                    <div
                                        className={css({
                                            fontSize: 'sm',
                                            color: 'text-muted',
                                            fontFamily: 'body',
                                        })}
                                    >
                                        Gesamt
                                    </div>
                                    <div
                                        className={css({
                                            fontWeight: '600',
                                            fontFamily: 'heading',
                                        })}
                                    >
                                        {totalTime} Min.
                                    </div>
                                </div>
                                <div
                                    className={css({
                                        textAlign: 'center',
                                        p: '4',
                                        bg: 'light',
                                        borderRadius: 'xl',
                                    })}
                                >
                                    <div className={css({ fontSize: '2xl', mb: '1' })}>👨‍🍳</div>
                                    <div
                                        className={css({
                                            fontSize: 'sm',
                                            color: 'text-muted',
                                            fontFamily: 'body',
                                        })}
                                    >
                                        Arbeit
                                    </div>
                                    <div
                                        className={css({
                                            fontWeight: '600',
                                            fontFamily: 'heading',
                                        })}
                                    >
                                        {recipe.prepTime} Min.
                                    </div>
                                </div>
                                <div
                                    className={css({
                                        textAlign: 'center',
                                        p: '4',
                                        bg: 'light',
                                        borderRadius: 'xl',
                                    })}
                                >
                                    <div className={css({ fontSize: '2xl', mb: '1' })}>🔥</div>
                                    <div
                                        className={css({
                                            fontSize: 'sm',
                                            color: 'text-muted',
                                            fontFamily: 'body',
                                        })}
                                    >
                                        Kochen
                                    </div>
                                    <div
                                        className={css({
                                            fontWeight: '600',
                                            fontFamily: 'heading',
                                        })}
                                    >
                                        {recipe.cookTime} Min.
                                    </div>
                                </div>
                            </div>

                            <div
                                className={css({
                                    mb: '6',
                                    borderRadius: 'xl',
                                    p: '5',
                                    bg: 'linear-gradient(135deg, rgba(224,123,83,0.08), rgba(255,246,236,0.9))',
                                    border: '1px solid',
                                    borderColor: 'rgba(224,123,83,0.2)',
                                    boxShadow: '0 8px 30px rgba(224,123,83,0.12)',
                                })}
                            >
                                <div
                                    className={flex({
                                        align: 'center',
                                        gap: { base: '4', md: '6' },
                                        flexWrap: 'wrap',
                                        mb: '4',
                                    })}
                                >
                                    <div
                                        className={css({
                                            fontSize: { base: '3xl', md: '4xl' },
                                            fontFamily: 'heading',
                                            fontWeight: '700',
                                            color: 'primary',
                                        })}
                                    >
                                        {averageRating.toFixed(1)} ★
                                    </div>
                                    <div
                                        className={css({
                                            fontFamily: 'body',
                                            color: 'text-muted',
                                        })}
                                    >
                                        {ratingCount} {ratingLabel}
                                    </div>
                                </div>
                                <div
                                    className={flex({
                                        gap: '2',
                                        align: 'center',
                                        flexWrap: 'wrap',
                                    })}
                                >
                                    {starValues.map((value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => handleRatingSelect(value)}
                                            disabled={isRatingPending}
                                            className={css({
                                                width: '48px',
                                                height: '48px',
                                                borderRadius: 'full',
                                                border: 'none',
                                                background:
                                                    value <= activeStarValue
                                                        ? 'rgba(224,123,83,0.9)'
                                                        : 'rgba(255,255,255,0.6)',
                                                color:
                                                    value <= activeStarValue
                                                        ? 'white'
                                                        : 'rgba(224,123,83,0.7)',
                                                fontSize: 'lg',
                                                cursor: 'pointer',
                                                transition: 'all 150ms ease',
                                                boxShadow:
                                                    value <= activeStarValue
                                                        ? '0 6px 16px rgba(224,123,83,0.35)'
                                                        : 'inset 0 0 0 1px rgba(224,123,83,0.2)',
                                                _hover: {
                                                    transform: 'translateY(-1px)',
                                                },
                                            })}
                                        >
                                            {value <= activeStarValue ? '★' : '☆'}
                                        </button>
                                    ))}
                                    <span
                                        className={css({
                                            fontSize: 'sm',
                                            color: 'text-muted',
                                            fontFamily: 'body',
                                            ml: { base: 0, md: '3' },
                                        })}
                                    >
                                        {viewerRating
                                            ? `Deine Bewertung: ${viewerRating}★`
                                            : 'Jetzt bewerten und Feedback geben'}
                                    </span>
                                </div>
                            </div>

                            <div className={flex({ gap: '3', flexWrap: 'wrap', align: 'center' })}>
                                <Button
                                    type="button"
                                    variant={favoriteState.isFavorite ? 'secondary' : 'primary'}
                                    onClick={handleFavoriteToggle}
                                    disabled={isFavoritePending}
                                >
                                    {favoriteState.isFavorite ? '❤️ Favorit' : '♡ Speichern'} ·{' '}
                                    {favoriteState.count}
                                </Button>
                                <Button
                                    type="button"
                                    variant={hasCooked ? 'secondary' : 'primary'}
                                    onClick={handleMarkCooked}
                                    disabled={isCookPending}
                                >
                                    {hasCooked ? '✅ Gekocht' : '🍳 Gekocht'} · {cookCount}
                                </Button>
                                <Button type="button" variant="ghost" onClick={handlePrint}>
                                    🖨️ Drucken
                                </Button>
                            </div>

                            {showCookDialog && (
                                <div
                                    className={css({
                                        mt: '4',
                                        p: '5',
                                        bg: 'surface.elevated',
                                        borderRadius: 'xl',
                                        border: '1px solid',
                                        borderColor: 'gray.200',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                    })}
                                >
                                    <h3
                                        className={css({
                                            fontSize: 'base',
                                            fontWeight: '700',
                                            fontFamily: 'heading',
                                            mb: '3',
                                        })}
                                    >
                                        🍳 Als gekocht markieren
                                    </h3>

                                    <div
                                        className={css({
                                            border: '2px dashed',
                                            borderColor: 'gray.300',
                                            borderRadius: 'lg',
                                            p: '6',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 150ms ease',
                                            bg: 'gray.50',
                                            _hover: {
                                                borderColor: 'primary',
                                                bg: 'rgba(224,123,83,0.05)',
                                            },
                                        })}
                                        onClick={() =>
                                            document.getElementById('cook-image-input')?.click()
                                        }
                                    >
                                        <input
                                            id="cook-image-input"
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) =>
                                                setUploadedImage(e.target.files?.[0] ?? null)
                                            }
                                            className={css({ display: 'none' })}
                                        />
                                        {uploadedImage ? (
                                            <div className={css({})}>
                                                <div
                                                    className={css({
                                                        fontSize: 'xl',
                                                        mb: '2',
                                                    })}
                                                >
                                                    ✅
                                                </div>
                                                <p
                                                    className={css({
                                                        fontSize: 'sm',
                                                        fontWeight: '500',
                                                    })}
                                                >
                                                    {uploadedImage.name}
                                                </p>
                                                <p
                                                    className={css({
                                                        fontSize: 'xs',
                                                        color: 'text-muted',
                                                        mt: '1',
                                                    })}
                                                >
                                                    Klicken zum Ändern
                                                </p>
                                            </div>
                                        ) : (
                                            <div className={css({})}>
                                                <div
                                                    className={css({
                                                        fontSize: '2xl',
                                                        mb: '2',
                                                    })}
                                                >
                                                    📷
                                                </div>
                                                <p
                                                    className={css({
                                                        fontSize: 'sm',
                                                        fontWeight: '500',
                                                    })}
                                                >
                                                    Bild hierher ziehen oder klicken
                                                </p>
                                                <p
                                                    className={css({
                                                        fontSize: 'xs',
                                                        color: 'text-muted',
                                                        mt: '1',
                                                    })}
                                                >
                                                    Optional - du kannst auch ohne Bild fortfahren
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className={flex({ gap: '3', mt: '4' })}>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => {
                                                setShowCookDialog(false);
                                                setUploadedImage(null);
                                                setCookNotes('');
                                            }}
                                        >
                                            Abbrechen
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="primary"
                                            onClick={handleSubmitCook}
                                            disabled={isCookPending}
                                        >
                                            {isCookPending ? 'Speichern...' : 'Absenden'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className={flex({ gap: '2', mt: '4', flexWrap: 'wrap' })}>
                                {recipe.tags.map((tag) => (
                                    <button
                                        key={tag}
                                        onClick={() => handleTagClick(tag)}
                                        className={css({
                                            fontSize: 'sm',
                                            color: 'primary',
                                            fontFamily: 'body',
                                            cursor: 'pointer',
                                            _hover: { textDecoration: 'underline' },
                                        })}
                                    >
                                        #{tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={grid({ columns: { base: 1, lg: 12 }, gap: '8' })}>
                    <div className={css({ lg: { gridColumn: 'span 4' } })}>
                        <div
                            className={css({
                                bg: 'white',
                                borderRadius: '2xl',
                                p: '6',
                                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                            })}
                        >
                            <h2
                                className={css({
                                    fontFamily: 'heading',
                                    fontSize: '2xl',
                                    fontWeight: '600',
                                    mb: '4',
                                })}
                            >
                                Zutaten
                            </h2>

                            <div
                                className={css({
                                    mb: '6',
                                    p: '4',
                                    bg: 'light',
                                    borderRadius: 'xl',
                                })}
                            >
                                <label
                                    className={css({
                                        display: 'block',
                                        fontSize: 'sm',
                                        color: 'text-muted',
                                        mb: '2',
                                        fontFamily: 'body',
                                    })}
                                >
                                    Portionen
                                </label>
                                <div className={flex({ gap: '2', align: 'center' })}>
                                    <button
                                        onClick={() => setServings(Math.max(1, servings - 1))}
                                        className={css({
                                            w: '10',
                                            h: '10',
                                            borderRadius: 'full',
                                            bg: 'white',
                                            border: '1px solid',
                                            borderColor: 'border',
                                            cursor: 'pointer',
                                            fontSize: 'xl',
                                            _hover: { bg: 'light' },
                                        })}
                                    >
                                        −
                                    </button>
                                    <span
                                        className={css({
                                            fontSize: 'xl',
                                            fontWeight: '600',
                                            minW: '12',
                                            textAlign: 'center',
                                            fontFamily: 'heading',
                                        })}
                                    >
                                        {servings}
                                    </span>
                                    <button
                                        onClick={() => setServings(servings + 1)}
                                        className={css({
                                            w: '10',
                                            h: '10',
                                            borderRadius: 'full',
                                            bg: 'white',
                                            border: '1px solid',
                                            borderColor: 'border',
                                            cursor: 'pointer',
                                            fontSize: 'xl',
                                            _hover: { bg: 'light' },
                                        })}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <ul className={css({ spaceY: '3' })}>
                                {recipe.ingredients.map((ingredient, index) => (
                                    <li
                                        key={index}
                                        className={flex({
                                            justify: 'space-between',
                                            align: 'center',
                                            p: '3',
                                            bg: 'light',
                                            borderRadius: 'lg',
                                            fontFamily: 'body',
                                        })}
                                    >
                                        <span className={css({ fontWeight: '500' })}>
                                            {ingredient.name}
                                        </span>
                                        <span className={css({ color: 'text-muted' })}>
                                            {formatAmount(ingredient.amount)} {ingredient.unit}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className={css({ lg: { gridColumn: 'span 8' } })}>
                        <div
                            className={css({
                                bg: 'white',
                                borderRadius: '2xl',
                                p: '6',
                                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                            })}
                        >
                            <h2
                                className={css({
                                    fontFamily: 'heading',
                                    fontSize: '2xl',
                                    fontWeight: '600',
                                    mb: '4',
                                })}
                            >
                                Zubereitung
                            </h2>

                            <RecipeFlow nodes={recipe.flow.nodes} edges={recipe.flow.edges} />
                        </div>
                    </div>
                </div>

                {author && (
                    <div className={css({ mt: '12' })}>
                        <h2
                            className={css({
                                fontFamily: 'heading',
                                fontSize: '2xl',
                                fontWeight: '600',
                                mb: '6',
                            })}
                        >
                            Über den Autor
                        </h2>
                        <div
                            className={css({
                                bg: 'white',
                                borderRadius: '2xl',
                                p: '6',
                                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                            })}
                        >
                            <div
                                className={flex({
                                    gap: '6',
                                    align: 'flex-start',
                                    direction: { base: 'column', sm: 'row' },
                                })}
                            >
                                <Link href={`/user/${author.id}`}>
                                    <div
                                        className={css({
                                            position: 'relative',
                                            width: '80px',
                                            height: '80px',
                                            borderRadius: 'full',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            _hover: { opacity: 0.9 },
                                        })}
                                    >
                                        <SmartImage
                                            src={author.avatar}
                                            alt={author.name}
                                            fill
                                            sizes="80px"
                                            className={css({ objectFit: 'cover' })}
                                        />
                                    </div>
                                </Link>

                                <div className={css({ flex: 1 })}>
                                    <div
                                        className={flex({
                                            justify: 'space-between',
                                            align: 'flex-start',
                                            wrap: 'wrap',
                                            gap: '4',
                                        })}
                                    >
                                        <div>
                                            <Link href={`/user/${author.id}`}>
                                                <h3
                                                    className={css({
                                                        fontFamily: 'heading',
                                                        fontSize: 'xl',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        _hover: { color: 'primary' },
                                                    })}
                                                >
                                                    {author.name}
                                                </h3>
                                            </Link>
                                            <p
                                                className={css({
                                                    fontFamily: 'body',
                                                    color: 'text-muted',
                                                    mt: '2',
                                                    maxW: '600px',
                                                })}
                                            >
                                                {author.bio}
                                            </p>
                                        </div>

                                        <Button
                                            type="button"
                                            variant={isFollowing ? 'secondary' : 'primary'}
                                            size="sm"
                                            onClick={handleFollowToggle}
                                            disabled={isFollowPending || author?.id === viewerId}
                                        >
                                            {isFollowing ? '✓ Folgst du' : '+ Folgen'}
                                        </Button>
                                    </div>

                                    <div className={flex({ gap: '6', mt: '4' })}>
                                        <div className={css({ textAlign: 'center' })}>
                                            <div
                                                className={css({
                                                    fontFamily: 'heading',
                                                    fontWeight: '600',
                                                    fontSize: 'lg',
                                                })}
                                            >
                                                {author.recipeCount}
                                            </div>
                                            <div
                                                className={css({
                                                    fontSize: 'sm',
                                                    color: 'text-muted',
                                                    fontFamily: 'body',
                                                })}
                                            >
                                                Rezepte
                                            </div>
                                        </div>
                                        <div className={css({ textAlign: 'center' })}>
                                            <div
                                                className={css({
                                                    fontFamily: 'heading',
                                                    fontWeight: '600',
                                                    fontSize: 'lg',
                                                })}
                                            >
                                                {authorFollowers.toLocaleString('de-DE')}
                                            </div>
                                            <div
                                                className={css({
                                                    fontSize: 'sm',
                                                    color: 'text-muted',
                                                    fontFamily: 'body',
                                                })}
                                            >
                                                Follower
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {recipeActivities.length > 0 && (
                    <div className={css({ mt: '12' })}>
                        <h2
                            className={css({
                                fontFamily: 'heading',
                                fontSize: '2xl',
                                fontWeight: '600',
                                mb: '6',
                            })}
                        >
                            Aktivitäten
                        </h2>
                        <div
                            className={css({
                                bg: 'white',
                                borderRadius: '2xl',
                                p: '6',
                                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                            })}
                        >
                            <div className={css({ spaceY: '4' })}>
                                {recipeActivities.map((activity) => (
                                    <div
                                        key={activity.id}
                                        className={flex({
                                            gap: '4',
                                            align: 'flex-start',
                                            p: '4',
                                            bg: 'light',
                                            borderRadius: 'xl',
                                        })}
                                    >
                                        <div
                                            className={css({
                                                position: 'relative',
                                                width: '48px',
                                                height: '48px',
                                                borderRadius: 'full',
                                                overflow: 'hidden',
                                                flexShrink: 0,
                                            })}
                                        >
                                            <SmartImage
                                                src={activity.user.avatar}
                                                alt={activity.user.name}
                                                fill
                                                sizes="48px"
                                                className={css({ objectFit: 'cover' })}
                                            />
                                        </div>
                                        <div className={css({ flex: 1 })}>
                                            <p
                                                className={css({
                                                    fontWeight: '600',
                                                    fontFamily: 'heading',
                                                })}
                                            >
                                                {activity.user.name}
                                            </p>
                                            <p
                                                className={css({
                                                    color: 'text-muted',
                                                    fontFamily: 'body',
                                                })}
                                            >
                                                {activity.action}
                                            </p>
                                            {activity.content && (
                                                <p
                                                    className={css({
                                                        mt: '2',
                                                        color: 'text-muted',
                                                    })}
                                                >
                                                    {activity.content}
                                                </p>
                                            )}
                                        </div>
                                        <div
                                            className={css({
                                                fontSize: 'sm',
                                                color: 'text-muted',
                                                fontFamily: 'body',
                                            })}
                                        >
                                            {activity.timestamp}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                index={lightboxIndex}
                slides={heroImages.map((img) => ({
                    src: img.src,
                    title: img.title,
                    description: img.subtitle || undefined,
                }))}
                styles={{
                    container: {
                        backgroundColor: 'rgba(0,0,0,0.95)',
                    },
                }}
                carousel={{ preload: 2 }}
            />
        </div>
    );
}
