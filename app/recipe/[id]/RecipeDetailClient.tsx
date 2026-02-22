'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Header } from '@/components/features/Header';
import { RecipeFlow } from '@/components/flow/RecipeFlow';
import { useRecipeTabs } from '@/components/hooks/useRecipeTabs';
import { css } from 'styled-system/css';
import { flex, grid, container } from 'styled-system/patterns';

import type { Recipe, User, Activity } from './data';

type RecipeDetailClientProps = {
    recipe: Recipe;
    author: User | null;
    recipeActivities: Activity[];
};

// Debug: Track component renders
let globalRenderCount = 0;
const renderLog: Array<{ time: number; stack: string }> = [];

export function RecipeDetailClient({ recipe, author, recipeActivities }: RecipeDetailClientProps) {
    // State declarations MUST come first
    const router = useRouter();
    const [servings, setServings] = useState(recipe.servings);
    const [isSaved, setIsSaved] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);

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

    // Debug refs
    const renderCountRef = useRef(0);
    const mountTimeRef = useRef(0);
    const imageLoadCountRef = useRef(0);
    const prevServingsRef = useRef(recipe.servings);
    const prevIsSavedRef = useRef(false);
    const prevIsFollowingRef = useRef(false);
    const globalRenderCountRef = useRef(0);

    // Debug: Log every render
    useEffect(() => {
        renderCountRef.current += 1;

        if (mountTimeRef.current === 0) {
            mountTimeRef.current = Date.now();
        }

        globalRenderCount += 1;
        globalRenderCountRef.current = globalRenderCount;

        const now = Date.now();
        const timeSinceMount = now - mountTimeRef.current;
        const stack = new Error().stack || '';

        console.log(
            `[DEBUG] RecipeDetailClient render #${renderCountRef.current} (global #${globalRenderCountRef.current}) at +${timeSinceMount}ms`,
        );
        renderLog.push({ time: timeSinceMount, stack });

        // Warn if rendering too frequently
        if (renderLog.length > 1) {
            const lastRender = renderLog[renderLog.length - 2];
            const timeSinceLastRender = timeSinceMount - lastRender.time;
            if (timeSinceLastRender < 100) {
                console.warn(
                    `[DEBUG] RAPID RE-RENDER! Only ${timeSinceLastRender}ms since last render`,
                );
                console.warn(
                    '[DEBUG] Previous render stack:',
                    lastRender.stack.split('\n').slice(0, 5).join('\n'),
                );
            }
        }
    });

    // Debug: Monitor DOM mutations on the image container
    useEffect(() => {
        const imgContainer = document.querySelector('[data-debug-image-container]');
        if (!imgContainer) return;

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                console.log('[DEBUG] DOM Mutation:', {
                    type: mutation.type,
                    target: (mutation.target as Element).tagName,
                    attributeName: mutation.attributeName,
                    time: Date.now() - (mountTimeRef.current || Date.now()),
                });

                // Log if an img element was added/removed
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node instanceof HTMLImageElement) {
                            console.warn('[DEBUG] IMG ELEMENT ADDED:', node.src);
                            imageLoadCountRef.current += 1;
                            console.warn(`[DEBUG] Total image loads: ${imageLoadCountRef.current}`);
                        }
                    });
                }
            });
        });

        observer.observe(imgContainer, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeOldValue: true,
        });

        return () => observer.disconnect();
    }, []);

    // Debug: Monitor all image load events on the page
    useEffect(() => {
        const handleImageLoad = (e: Event) => {
            const img = e.target as HTMLImageElement;
            if (img.src?.includes('unsplash')) {
                imageLoadCountRef.current += 1;
                console.log(
                    `[DEBUG] Image loaded: ${img.src?.substring(0, 60)}... (load #${imageLoadCountRef.current})`,
                );
            }
        };

        const handleImageError = (e: Event) => {
            const img = e.target as HTMLImageElement;
            console.error('[DEBUG] Image error:', img.src);
        };

        document.addEventListener('load', handleImageLoad, true);
        document.addEventListener('error', handleImageError, true);

        return () => {
            document.removeEventListener('load', handleImageLoad, true);
            document.removeEventListener('error', handleImageError, true);
        };
    }, []);

    // Debug: Log state changes
    useEffect(() => {
        if (prevServingsRef.current !== servings) {
            console.log(`[DEBUG] servings changed: ${prevServingsRef.current} -> ${servings}`);
        }
        prevServingsRef.current = servings;
    }, [servings]);

    useEffect(() => {
        if (prevIsSavedRef.current !== isSaved) {
            console.log(`[DEBUG] isSaved changed: ${prevIsSavedRef.current} -> ${isSaved}`);
        }
        prevIsSavedRef.current = isSaved;
    }, [isSaved]);

    useEffect(() => {
        if (prevIsFollowingRef.current !== isFollowing) {
            console.log(
                `[DEBUG] isFollowing changed: ${prevIsFollowingRef.current} -> ${isFollowing}`,
            );
        }
        prevIsFollowingRef.current = isFollowing;
    }, [isFollowing]);

    const totalTime = recipe.prepTime + recipe.cookTime;

    const formatAmount = (amount: number): string => {
        const scaled = amount * (servings / recipe.servings);
        return Number.isInteger(scaled) ? scaled.toString() : scaled.toFixed(1);
    };

    const handleTagClick = (tag: string) => {
        router.push(`/?tag=${encodeURIComponent(tag)}`);
    };

    const handleCategoryClick = (category: string) => {
        router.push(`/?category=${encodeURIComponent(category)}`);
    };

    const handleDifficultyClick = (difficulty: string) => {
        router.push(`/?difficulty=${encodeURIComponent(difficulty)}`);
    };

    const handlePrint = () => {
        window.print();
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
                    <div className={grid({ columns: { base: 1, lg: 2 }, gap: '8' })}>
                        <div
                            className={css({
                                position: 'relative',
                                borderRadius: '2xl',
                                overflow: 'hidden',
                            })}
                            data-debug-image-container
                        >
                            <div className={css({ aspectRatio: '4/3', position: 'relative' })}>
                                <Image
                                    src={recipe.image}
                                    alt={recipe.title}
                                    fill
                                    sizes="(max-width: 1024px) 100vw, 50vw"
                                    className={css({ objectFit: 'cover' })}
                                    priority
                                    unoptimized={recipe.image.includes('unsplash.com')}
                                />
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

                            <h1
                                className={css({
                                    fontFamily: 'heading',
                                    fontSize: '4xl',
                                    fontWeight: '700',
                                    mb: '4',
                                })}
                            >
                                {recipe.title}
                            </h1>

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

                            <div className={flex({ gap: '3', flexWrap: 'wrap' })}>
                                <Button
                                    variant={isSaved ? 'secondary' : 'primary'}
                                    onClick={() => setIsSaved(!isSaved)}
                                >
                                    {isSaved ? '📌 Gespeichert' : '📌 Speichern'}
                                </Button>
                                <Button variant="ghost" onClick={handlePrint}>
                                    🖨️ Drucken
                                </Button>
                            </div>

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
                                        <Image
                                            src={author.avatar}
                                            alt={author.name}
                                            fill
                                            sizes="80px"
                                            className={css({ objectFit: 'cover' })}
                                            unoptimized={author.avatar.includes('unsplash.com')}
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
                                            variant={isFollowing ? 'secondary' : 'primary'}
                                            size="sm"
                                            onClick={() => setIsFollowing(!isFollowing)}
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
                                                {author.followerCount.toLocaleString('de-DE')}
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
                                            <Image
                                                src={activity.user.avatar}
                                                alt={activity.user.name}
                                                fill
                                                sizes="48px"
                                                className={css({ objectFit: 'cover' })}
                                                unoptimized={activity.user.avatar.includes(
                                                    'unsplash.com',
                                                )}
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
        </div>
    );
}
