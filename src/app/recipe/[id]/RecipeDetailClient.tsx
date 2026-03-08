'use client';

import {
    Bookmark,
    Camera,
    Check,
    CheckCircle,
    ChefHat,
    Clock,
    Flame,
    Heart,
    Printer,
    Star,
} from 'lucide-react';
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
} from '@app/app/actions/social';
import { Badge } from '@app/components/atoms/Badge';
import { Button } from '@app/components/atoms/Button';
import { SmartImage } from '@app/components/atoms/SmartImage';
import { Header } from '@app/components/features/Header';
import { ReportButton } from '@app/components/features/ReportButton';
import { ShareButton } from '@app/components/features/ShareButton';
import { RecipeStepsViewer } from '@app/components/flow/RecipeStepsViewer';
import { useRecipeTabs } from '@app/components/hooks/useRecipeTabs';
import { useIsDark } from '@app/lib/darkMode';
import { buildRecipeFilterHref } from '@app/lib/recipeFilters';
import { css } from 'styled-system/css';
import { flex, grid, container } from 'styled-system/patterns';

import { printRecipe } from './components/PrintRecipe';
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
};

export function RecipeDetailClient({
    recipe,
    author,
    recipeActivities,
    cookImages = [],
    isDraft = false,
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
            subtitle: img.caption || 'Foto',
            reportable: {
                contentType: 'cook_image' as const,
                contentId: img.id,
                ownerId: img.user.id,
            },
        }));
        return [primary, ...extras];
    }, [cookImages, recipe.image, recipe.imageKey, recipe.title]);

    // Only show carousel if there are actual images with src
    const hasImages = heroImages.some((img) => img.src);
    const visibleImages = hasImages ? heroImages : [];
    const heroCount = Math.max(1, visibleImages.length);
    const normalizedHeroIndex = heroCount && hasImages ? heroIndex % heroCount : 0;
    const heroMeta = visibleImages[normalizedHeroIndex];

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
    const _dark = useIsDark();
    const starValues = [1, 2, 3, 4, 5] as const;
    const activeStarValue = viewerRating ?? Math.round(averageRating || 0);

    const formatAmount = (amount: number): string => {
        const scaled = amount * (servings / recipe.servings);
        return Number.isInteger(scaled) ? scaled.toString() : scaled.toFixed(1);
    };

    const handleTagClick = (tag: string) => {
        router.push(buildRecipeFilterHref({ tags: [tag] }));
    };

    const handleCategoryClick = () => {
        if (recipe.categorySlug) {
            router.push(`/category/${recipe.categorySlug}`);
        } else {
            router.push(buildRecipeFilterHref({ mealTypes: [recipe.category] }));
        }
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
            {isDraft && (
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3',
                        px: '4',
                        py: '2.5',
                        backgroundColor: 'rgba(224,123,83,0.1)',
                        borderBottom: '1px solid rgba(224,123,83,0.25)',
                        fontSize: 'sm',
                        color: 'brand.primary',
                        fontWeight: '500',
                    })}
                >
                    <span
                        className={css({
                            display: 'inline-block',
                            px: '2',
                            py: '0.5',
                            borderRadius: 'full',
                            fontSize: 'xs',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            backgroundColor: 'brand.primary',
                            color: 'white',
                        })}
                    >
                        Entwurf
                    </span>
                    Dieses Rezept ist noch nicht veröffentlicht und nur für dich sichtbar.
                    <a
                        href={`/recipe/${recipe.id}/edit`}
                        className={css({
                            fontWeight: '600',
                            textDecoration: 'underline',
                            textUnderlineOffset: '2px',
                            _hover: { opacity: '0.75' },
                        })}
                    >
                        Bearbeiten
                    </a>
                </div>
            )}
            {recipe.viewer?.isAuthor && recipe.moderationStatus === 'PENDING' && (
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3',
                        px: '4',
                        py: '2.5',
                        backgroundColor: 'rgba(217,173,54,0.1)',
                        borderBottom: '1px solid rgba(217,173,54,0.25)',
                        fontSize: 'sm',
                        color: '#b8860b',
                        fontWeight: '500',
                    })}
                >
                    <span
                        className={css({
                            display: 'inline-block',
                            px: '2',
                            py: '0.5',
                            borderRadius: 'full',
                            fontSize: 'xs',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            backgroundColor: '#b8860b',
                            color: 'white',
                        })}
                    >
                        Wird überprüft
                    </span>
                    Dein Rezept wird gerade überprüft und ist noch nicht öffentlich sichtbar. Das dauert in der Regel weniger als 24 Stunden.
                </div>
            )}
            {recipe.viewer?.isAuthor && recipe.moderationStatus === 'REJECTED' && (
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3',
                        px: '4',
                        py: '2.5',
                        backgroundColor: 'rgba(220,38,38,0.08)',
                        borderBottom: '1px solid rgba(220,38,38,0.2)',
                        fontSize: 'sm',
                        color: 'status.danger',
                        fontWeight: '500',
                    })}
                >
                    <span
                        className={css({
                            display: 'inline-block',
                            px: '2',
                            py: '0.5',
                            borderRadius: 'full',
                            fontSize: 'xs',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            backgroundColor: 'status.danger',
                            color: 'white',
                        })}
                    >
                        Abgelehnt
                    </span>
                    {recipe.moderationNote
                        ? `Dein Rezept wurde abgelehnt: ${recipe.moderationNote}. Du kannst es überarbeiten und erneut einreichen.`
                        : 'Dein Rezept wurde abgelehnt. Du kannst es überarbeiten und erneut einreichen.'}
                    <a
                        href={`/recipe/${recipe.id}/edit`}
                        className={css({
                            fontWeight: '600',
                            textDecoration: 'underline',
                            textUnderlineOffset: '2px',
                            _hover: { opacity: '0.75' },
                        })}
                    >
                        Überarbeiten
                    </a>
                </div>
            )}
            <main
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
                    <div className={grid({ columns: { base: 1, lg: 2 }, gap: '5' })}>
                        <div
                            className={css({
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '3',
                            })}
                        >
                            {!hasImages && (
                                <div
                                    className={css({
                                        aspectRatio: '4/3',
                                        borderRadius: '2xl',
                                        overflow: 'hidden',
                                    })}
                                >
                                    <SmartImage
                                        recipeId={recipe.id}
                                        alt={recipe.title}
                                        fill
                                    />
                                </div>
                            )}
                            {hasImages && (<>
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
                                    <SmartImage
                                        src={heroMeta?.src || recipe.image}
                                        alt={heroMeta?.title ?? recipe.title}
                                        fill
                                    />
                                </div>
                                {heroCount > 1 && (<>
                                <button
                                    type="button"
                                    onClick={handleHeroPrev}
                                    aria-label="Vorheriges Bild"
                                    className={css({
                                        position: 'absolute',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        left: '2',
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: 'full',
                                        border: 'none',
                                        bg: 'rgba(0,0,0,0.5)',
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '24px',
                                        transition: 'all 200ms ease',
                                        _hover: { bg: 'rgba(0,0,0,0.7)' },
                                        _active: { transform: 'translateY(-50%) scale(0.95)' },
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
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: 'full',
                                        border: 'none',
                                        bg: 'rgba(0,0,0,0.5)',
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '24px',
                                        transition: 'all 200ms ease',
                                        _hover: { bg: 'rgba(0,0,0,0.7)' },
                                        _active: { transform: 'translateY(-50%) scale(0.95)' },
                                    })}
                                >
                                    ›
                                </button>
                                </>)}
                                {/* Thumbnail strip overlay */}
                                {heroCount > 1 && (
                                    <div className={css({
                                        position: 'absolute',
                                        bottom: '3',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        display: 'flex',
                                        gap: '1.5',
                                        p: '1.5',
                                        borderRadius: 'xl',
                                        bg: 'rgba(0,0,0,0.5)',
                                        backdropFilter: 'blur(8px)',
                                    })}>
                                        {visibleImages.map((img, idx) => {
                                            const thumbUrl = img.thumbKey
                                                ? `/api/thumbnail?key=${encodeURIComponent(img.thumbKey)}&width=100&height=100&fit=cover&quality=60`
                                                : img.src;
                                            return (
                                                <button
                                                    key={`${idx}-${img.src}`}
                                                    type="button"
                                                    onClick={() => setHeroIndex(idx)}
                                                    className={css({
                                                        borderRadius: 'md',
                                                        border: '2px solid',
                                                        borderColor: idx === normalizedHeroIndex ? 'white' : 'transparent',
                                                        padding: 0,
                                                        width: '44px',
                                                        height: '44px',
                                                        overflow: 'hidden',
                                                        cursor: 'pointer',
                                                        opacity: idx === normalizedHeroIndex ? 1 : 0.7,
                                                        transition: 'all 150ms ease',
                                                        _hover: { opacity: 1 },
                                                    })}
                                                >
                                                    <div className={css({ position: 'relative', width: '100%', height: '100%' })}>
                                                        <SmartImage src={thumbUrl} alt={img.title} fill />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {/* Image counter + report */}
                                {heroMeta?.reportable && heroMeta.reportable.ownerId !== viewerId && (
                                    <div className={css({ position: 'absolute', top: '3', right: '3' })}>
                                        <ReportButton
                                            contentType={heroMeta.reportable.contentType}
                                            contentId={heroMeta.reportable.contentId}
                                            variant="icon"
                                        />
                                    </div>
                                )}
                            </div>
                            </>)}
                        </div>

                        <div
                            className={css({
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                            })}
                        >
                            {/* ── Recipe Info Card ── */}
                            <div className={css({ bg: 'surface', borderRadius: '2xl', p: '5', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', mb: '4' })}>
                                {/* Meta strip */}
                                <div className={css({ display: 'flex', alignItems: 'center', gap: '3', flexWrap: 'wrap', fontSize: 'sm', fontFamily: 'body', color: 'text-muted', mb: '3' })}>
                                    <button
                                        onClick={() => handleCategoryClick()}
                                        className={css({ cursor: 'pointer', _hover: { opacity: 0.8 } })}
                                    >
                                        <Badge>{recipe.category}</Badge>
                                    </button>
                                    <span>{recipe.difficulty}</span>
                                </div>

                                {/* Description */}
                                <p className={css({ fontFamily: 'body', color: 'text', lineHeight: 'relaxed', fontSize: { base: 'md', md: 'lg' }, mb: '3' })}>
                                    {recipe.description}
                                </p>

                                {/* Tags */}
                                {recipe.tags.length > 0 && (
                                    <div className={css({ display: 'flex', gap: '2', flexWrap: 'wrap', mb: '3' })}>
                                        {recipe.tags.map((tag) => (
                                            <button
                                                key={tag}
                                                onClick={() => handleTagClick(tag)}
                                                className={css({
                                                    fontSize: 'xs',
                                                    color: 'text-muted',
                                                    fontFamily: 'body',
                                                    cursor: 'pointer',
                                                    px: '2.5',
                                                    py: '1',
                                                    borderRadius: 'full',
                                                    bg: 'light',
                                                    transition: 'all 150ms ease',
                                                    _hover: { color: 'primary' },
                                                })}
                                            >
                                                #{tag}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Divider */}
                                <div className={css({ h: '1px', bg: 'border', mb: '3' })} />

                                {/* Time breakdown */}
                                <div className={css({ display: 'flex', gap: '2', mb: '3' })}>
                                    {[
                                        { icon: <Clock size={16} color="var(--colors-palette-orange, #e07b53)" />, label: 'Gesamt', value: `${totalTime} Min.` },
                                        { icon: <ChefHat size={16} color="#4caf50" />, label: 'Arbeit', value: `${recipe.prepTime} Min.` },
                                        { icon: <Flame size={16} color="#ff5722" />, label: 'Kochen', value: `${recipe.cookTime} Min.` },
                                    ].map(({ icon, label, value }) => (
                                        <div key={label} className={css({ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5', p: '2', bg: 'light', borderRadius: 'xl', minWidth: 0 })}>
                                            {icon}
                                            <span className={css({ fontSize: '2xs', color: 'text-muted', fontFamily: 'body' })}>{label}</span>
                                            <span className={css({ fontWeight: '700', fontFamily: 'heading', fontSize: 'xs', whiteSpace: 'nowrap' })}>{value}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Divider */}
                                <div className={css({ h: '1px', bg: 'border', mb: '3' })} />

                                {/* Rating */}
                                <div className={css({ display: 'flex', alignItems: 'center', gap: '1.5' })}>
                                    {starValues.map((value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => handleRatingSelect(value)}
                                            disabled={isRatingPending}
                                            className={css({
                                                padding: 0,
                                                border: 'none',
                                                background: 'none',
                                                cursor: 'pointer',
                                                transition: 'transform 150ms ease',
                                                _hover: { transform: 'scale(1.2)' },
                                                display: 'inline-flex',
                                            })}
                                        >
                                            <Star
                                                size={22}
                                                fill={value <= activeStarValue ? 'var(--colors-palette-gold, #d9ad36)' : 'none'}
                                                className={css({
                                                    color: value <= activeStarValue ? 'palette.gold' : 'text-muted',
                                                    opacity: value <= activeStarValue ? 1 : 0.35,
                                                })}
                                            />
                                        </button>
                                    ))}
                                    <span className={css({ fontSize: 'sm', color: 'text-muted', fontFamily: 'body', ml: '1' })}>
                                        {ratingCount > 0 ? `${averageRating.toFixed(1)} (${ratingCount})` : 'Bewerten'}
                                    </span>
                                </div>
                            </div>

                            {/* ── Actions ── */}
                            <div className={css({ display: 'flex', gap: '2', mb: '2' })}>
                                <div className={css({ flex: '1' })}>
                                    <Button
                                        type="button"
                                        variant={favoriteState.isFavorite ? 'secondary' : 'primary'}
                                        onClick={handleFavoriteToggle}
                                        disabled={isFavoritePending}
                                        style={{ width: '100%', minWidth: 0 }}
                                    >
                                        <span className={css({ flexShrink: 0 })}>{favoriteState.isFavorite ? <Heart size={16} /> : <Bookmark size={16} />}</span>
                                        <span className={css({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 })}>
                                            {favoriteState.isFavorite ? 'Favorit' : 'Speichern'}
                                        </span>
                                        <span className={css({ opacity: 0.7, fontSize: 'xs', flexShrink: 0 })}>· {favoriteState.count}</span>
                                    </Button>
                                </div>
                                <div className={css({ flex: '1' })}>
                                    <Button
                                        type="button"
                                        variant={hasCooked ? 'secondary' : 'primary'}
                                        onClick={handleMarkCooked}
                                        disabled={isCookPending}
                                        style={{ width: '100%', minWidth: 0 }}
                                    >
                                        <span className={css({ flexShrink: 0 })}>{hasCooked ? <CheckCircle size={16} /> : <ChefHat size={16} />}</span>
                                        <span className={css({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 })}>
                                            Zubereitet
                                        </span>
                                        <span className={css({ opacity: 0.7, fontSize: 'xs', flexShrink: 0 })}>· {cookCount}</span>
                                    </Button>
                                </div>
                            </div>
                            <div className={css({ display: 'flex', gap: '1', alignItems: 'center', justifyContent: 'space-evenly' })}>
                                <Button type="button" variant="ghost" onClick={handlePrint}>
                                    <Printer size={15} />
                                    <span className={css({ fontSize: 'sm' })}>Drucken</span>
                                </Button>
                                <ShareButton
                                    title={recipe.title}
                                    slug={recipe.slug}
                                    imageUrl={recipe.image ?? undefined}
                                />
                                {!recipe.viewer?.isAuthor && (
                                    <ReportButton
                                        contentType="recipe"
                                        contentId={recipe.id}
                                        variant="text"
                                    />
                                )}
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
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                        })}
                                    >
                                        <ChefHat size={20} />
                                        <span>Als zubereitet markieren</span>
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
                                                        color: '#4caf50',
                                                    })}
                                                >
                                                    <CheckCircle size={32} />
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
                                                        color: '#4a5568',
                                                    })}
                                                >
                                                    <Camera size={40} />
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

                        </div>
                    </div>
                </div>

                <div className={grid({ columns: { base: 1, lg: 12 }, gap: '5' })}>
                    <div className={css({ lg: { gridColumn: 'span 4' } })}>
                        <div
                            className={css({
                                bg: 'surface',
                                borderRadius: '2xl',
                                p: '5',
                                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
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
                                Zutaten
                            </h2>

                            <div
                                className={css({
                                    mb: '4',
                                    p: '3',
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
                                            bg: 'surface',
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
                                            bg: 'surface',
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

                            <ul className={css({ spaceY: '2' })}>
                                {recipe.ingredients.map((ingredient, index) => (
                                    <li
                                        key={index}
                                        className={flex({
                                            justify: 'space-between',
                                            align: 'center',
                                            p: '2',
                                            bg: 'light',
                                            borderRadius: 'lg',
                                            fontFamily: 'body',
                                        })}
                                    >
                                        <div>
                                            <span className={css({ fontWeight: '500' })}>
                                                {ingredient.name}
                                            </span>
                                            {ingredient.notes && (
                                                <span
                                                    className={css({
                                                        display: 'block',
                                                        fontSize: 'xs',
                                                        color: 'text-muted',
                                                        fontStyle: 'italic',
                                                    })}
                                                >
                                                    {ingredient.notes}
                                                </span>
                                            )}
                                        </div>
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
                                bg: 'surface',
                                borderRadius: '2xl',
                                p: '5',
                                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
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
                            />
                        </div>
                    </div>
                </div>

                {author && (
                    <div className={css({ mt: '8' })}>
                        <h2
                            className={css({
                                fontFamily: 'heading',
                                fontSize: 'xl',
                                fontWeight: '600',
                                mb: '4',
                            })}
                        >
                            Über den Autor
                        </h2>
                        <div
                            className={css({
                                bg: 'surface',
                                borderRadius: '2xl',
                                p: '5',
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
                                <Link href={`/user/${author.slug}`}>
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
                                            <Link href={`/user/${author.slug}`}>
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
                                            {isFollowing ? (
                                                <span
                                                    className={css({
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '1',
                                                    })}
                                                >
                                                    <Check size={14} />
                                                    Folgst du
                                                </span>
                                            ) : (
                                                '+ Folgen'
                                            )}
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
                                bg: 'surface',
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
