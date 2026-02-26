'use client';

import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';
import { ChefHat, Clock, Pin } from 'lucide-react';

import { useRecipeTabs } from '@/components/hooks/useRecipeTabs';
import type { RecipeTabItem } from '@/components/providers/RecipeTabsProvider';
import { css } from 'styled-system/css';

interface HoverPreviewProps {
    recipe: RecipeTabItem;
    children: React.ReactNode;
}

function HoverPreview({ recipe, children }: HoverPreviewProps) {
    const [isVisible, setIsVisible] = React.useState(false);
    const [previewSide, setPreviewSide] = React.useState<'left' | 'right'>('left');
    const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const triggerRef = React.useRef<HTMLDivElement>(null);

    const clearHoverTimeout = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
    };

    const determineSide = () => {
        const element = triggerRef.current;
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const midpoint = window.innerWidth / 2;
        setPreviewSide(rect.left < midpoint ? 'left' : 'right');
    };

    const showPreview = (withDelay = true) => {
        clearHoverTimeout();
        hoverTimeoutRef.current = setTimeout(
            () => {
                setIsVisible(true);
            },
            withDelay ? 200 : 0,
        );
    };

    const hidePreview = () => {
        clearHoverTimeout();
        hoverTimeoutRef.current = setTimeout(() => {
            setIsVisible(false);
        }, 100);
    };

    const handlePointerEnter = () => {
        determineSide();
        showPreview();
    };

    const handlePointerLeave = () => {
        hidePreview();
    };

    const handleFocus = () => {
        determineSide();
        showPreview(false);
    };

    const handleBlur = () => {
        hidePreview();
    };

    React.useEffect(() => {
        return () => clearHoverTimeout();
    }, []);

    const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
    const positionStyles = previewSide === 'left' ? { left: 0 } : { right: 0 };

    return (
        <div
            ref={triggerRef}
            className={css({ position: 'relative', flexShrink: 0 })}
            onMouseEnter={handlePointerEnter}
            onMouseLeave={handlePointerLeave}
            onFocusCapture={handleFocus}
            onBlurCapture={handleBlur}
        >
            {children}
            {isVisible && (
                <div
                    aria-hidden
                    className={css({
                        position: 'absolute',
                        top: '100%',
                        ...positionStyles,
                        marginTop: '8px',
                        width: '240px',
                        background: 'white',
                        borderRadius: 'xl',
                        border: '1px solid',
                        borderColor: 'rgba(224,123,83,0.2)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                        padding: '3',
                        zIndex: 110,
                        animation: 'fadeIn 150ms ease',
                        display: { base: 'none', md: 'block' },
                    })}
                >
                    {recipe.imageUrl ? (
                        <Image
                            src={recipe.imageUrl}
                            alt={recipe.title}
                            width={400}
                            height={120}
                            className={css({
                                width: '100%',
                                height: '120px',
                                objectFit: 'cover',
                                borderRadius: 'lg',
                                marginBottom: '2',
                            })}
                        />
                    ) : (
                        <div
                            className={css({
                                width: '100%',
                                height: '120px',
                                borderRadius: 'lg',
                                marginBottom: '2',
                                background: 'linear-gradient(135deg, #f8b500 0%, #e07b53 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            })}
                        >
                            <ChefHat size={42} color="white" />
                        </div>
                    )}
                    <h4
                        className={css({
                            fontSize: 'sm',
                            fontWeight: '600',
                            color: 'text',
                            marginBottom: '1',
                        })}
                    >
                        {recipe.title}
                    </h4>
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2',
                            fontSize: 'xs',
                            color: 'text-muted',
                            marginBottom: '2',
                        })}
                    >
                        {totalTime > 0 && (
                            <>
                                <Clock size={12} />
                                <span>{totalTime} min</span>
                            </>
                        )}
                        {recipe.difficulty && (
                            <>
                                <span>•</span>
                                <span>{recipe.difficulty}</span>
                            </>
                        )}
                    </div>
                    <Link
                        href={recipe.slug ? `/recipe/${recipe.slug}` : `/recipe/${recipe.id}`}
                        className={css({
                            display: 'block',
                            width: '100%',
                            textAlign: 'center',
                            padding: '2',
                            background: 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
                            color: 'white',
                            borderRadius: 'lg',
                            fontSize: 'xs',
                            fontWeight: '600',
                            textDecoration: 'none',
                            transition: 'all 150ms ease',
                            _hover: {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(224,123,83,0.3)',
                            },
                        })}
                    >
                        Öffnen
                    </Link>
                </div>
            )}
        </div>
    );
}

function RecipeChip({
    recipe,
    isPinned,
    onPinToggle,
}: {
    recipe: RecipeTabItem;
    isPinned: boolean;
    onPinToggle: () => void;
}) {
    const handlePinClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onPinToggle();
    };

    const href = recipe.slug ? `/recipe/${recipe.slug}` : `/recipe/${recipe.id}`;

    return (
        <HoverPreview recipe={recipe}>
            <Link
                href={href}
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2',
                    px: '3',
                    py: '1.5',
                    borderRadius: 'full',
                    bg: isPinned ? 'rgba(248,181,0,0.15)' : 'transparent',
                    border: '1px solid',
                    borderColor: isPinned ? 'rgba(248,181,0,0.3)' : 'transparent',
                    fontSize: 'sm',
                    fontWeight: isPinned ? '500' : '400',
                    color: isPinned ? 'text' : 'text-muted',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    textDecoration: 'none',
                    _hover: {
                        bg: isPinned ? 'rgba(248,181,0,0.25)' : 'rgba(0,0,0,0.03)',
                        borderColor: isPinned ? '#f8b500' : 'transparent',
                        color: 'text',
                    },
                })}
            >
                <span className={css({ whiteSpace: 'nowrap' })}>{recipe.title}</span>
                <span
                    onClick={handlePinClick}
                    className={css({
                        fontSize: 'xs',
                        color: 'text-muted',
                        marginLeft: '1',
                        padding: '2px',
                        borderRadius: 'full',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        _hover: {
                            bg: 'rgba(224,123,83,0.2)',
                            color: 'primary',
                        },
                    })}
                >
                    <Pin size={14} />
                </span>
            </Link>
        </HoverPreview>
    );
}

const RECENT_DISPLAY_LIMIT = 5;

export function RecipeTabs() {
    const { pinned, recent, pinRecipe, unpinRecipe, isLoading } = useRecipeTabs();

    const handlePinToggle = (recipe: RecipeTabItem, currentlyPinned: boolean) => {
        if (isLoading) return;
        if (currentlyPinned) {
            unpinRecipe(recipe.id);
        } else {
            pinRecipe(recipe);
        }
    };

    const hasPinned = pinned.length > 0;
    const hasRecent = recent.length > 0;

    const unpinnedRecent = recent
        .filter((r) => !pinned.some((p) => p.id === r.id))
        .slice(0, RECENT_DISPLAY_LIMIT);
    const hasEntries = hasPinned || unpinnedRecent.length > 0;

    return (
        <div
            className={css({
                maxW: '1400px',
                marginX: 'auto',
                width: '100%',
                px: { base: '4', md: '6' },
                py: '2',
                display: 'flex',
                alignItems: 'center',
                gap: '3',
                overflowX: 'auto',
                overflowY: 'visible',
                scrollbarWidth: 'none',
                '&::-webkitScrollbar': {
                    display: 'none',
                },
                background: '#fff',
                borderTop: '1px solid rgba(0,0,0,0.08)',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
            })}
        >
            <span
                className={css({
                    fontSize: 'xs',
                    fontWeight: '600',
                    color: 'text-muted',
                    textTransform: 'uppercase',
                    letterSpacing: 'wide',
                    flexShrink: 0,
                })}
            >
                Zuletzt
            </span>

            {hasPinned && (
                <>
                    {pinned.map((recipe) => (
                        <RecipeChip
                            key={recipe.id}
                            recipe={recipe}
                            isPinned={true}
                            onPinToggle={() => handlePinToggle(recipe, true)}
                        />
                    ))}

                    {(hasRecent || pinned.length < 3) && (
                        <div
                            className={css({
                                width: '1px',
                                height: '20px',
                                bg: 'rgba(0,0,0,0.1)',
                                flexShrink: 0,
                            })}
                        />
                    )}
                </>
            )}

            {hasEntries ? (
                unpinnedRecent.map((recipe) => (
                    <RecipeChip
                        key={recipe.id}
                        recipe={recipe}
                        isPinned={false}
                        onPinToggle={() => handlePinToggle(recipe, false)}
                    />
                ))
            ) : (
                <span
                    className={css({
                        fontSize: 'sm',
                        color: 'text-muted',
                        opacity: 0.7,
                        whiteSpace: 'nowrap',
                    })}
                >
                    Noch keine letzten Rezepte – öffne ein Rezept, um es hier abzulegen
                </span>
            )}
        </div>
    );
}
