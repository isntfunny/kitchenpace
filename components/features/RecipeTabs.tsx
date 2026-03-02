'use client';

import { ChefHat, Clock, Pin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';
import { createPortal } from 'react-dom';

import { useRecipeTabs } from '@/components/hooks/useRecipeTabs';
import type { RecipeTabItem } from '@/components/providers/RecipeTabsProvider';
import { css } from 'styled-system/css';

const DROPDOWN_WIDTH = 240;
const DROPDOWN_OFFSET = 8;
const VIEWPORT_PADDING = 16;

type PopupPosition = {
    top: number;
    left?: number;
    right?: number;
    align: 'left' | 'right';
};

interface HoverPreviewProps {
    recipe: RecipeTabItem;
    children: React.ReactNode;
}

function HoverPreview({ recipe, children }: HoverPreviewProps) {
    const [isVisible, setIsVisible] = React.useState(false);
    const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const triggerRef = React.useRef<HTMLDivElement>(null);
    const [popupPosition, setPopupPosition] = React.useState<PopupPosition | null>(null);
    const [portalElement] = React.useState(() => document.createElement('div'));

    const clearHoverTimeout = React.useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
    }, []);

    const updatePopupPosition = React.useCallback(() => {
        const element = triggerRef.current;
        if (!element || typeof window === 'undefined') return;
        const rect = element.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const align: PopupPosition['align'] =
            rect.left + rect.width / 2 < viewportWidth / 2 ? 'left' : 'right';
        const maxSideOffset = Math.max(
            VIEWPORT_PADDING,
            viewportWidth - DROPDOWN_WIDTH - VIEWPORT_PADDING,
        );
        const clampedLeft = Math.min(Math.max(rect.left, VIEWPORT_PADDING), maxSideOffset);
        const clampedRight = Math.min(
            Math.max(viewportWidth - rect.right, VIEWPORT_PADDING),
            maxSideOffset,
        );
        setPopupPosition({
            top: rect.bottom + DROPDOWN_OFFSET,
            align,
            left: align === 'left' ? clampedLeft : undefined,
            right: align === 'right' ? clampedRight : undefined,
        });
    }, []);

    const showPreview = React.useCallback(
        (withDelay = true) => {
            clearHoverTimeout();
            hoverTimeoutRef.current = setTimeout(
                () => {
                    updatePopupPosition();
                    setIsVisible(true);
                },
                withDelay ? 200 : 0,
            );
        },
        [clearHoverTimeout, updatePopupPosition],
    );

    const hidePreview = React.useCallback(() => {
        clearHoverTimeout();
        hoverTimeoutRef.current = setTimeout(() => {
            setIsVisible(false);
            setPopupPosition(null);
        }, 100);
    }, [clearHoverTimeout]);

    const handlePointerEnter = () => {
        updatePopupPosition();
        showPreview();
    };

    const handlePointerLeave = () => {
        hidePreview();
    };

    const handleFocus = () => {
        updatePopupPosition();
        showPreview(false);
    };

    const handleBlur = () => {
        hidePreview();
    };

    const handlePreviewPointerEnter = () => {
        clearHoverTimeout();
        setIsVisible(true);
    };

    const handlePreviewPointerLeave = () => {
        hidePreview();
    };

    React.useEffect(() => {
        return () => clearHoverTimeout();
    }, [clearHoverTimeout]);

    React.useEffect(() => {
        if (typeof document === 'undefined') return;
        document.body.appendChild(portalElement);
        return () => {
            document.body.removeChild(portalElement);
        };
    }, [portalElement]);

    React.useEffect(() => {
        if (!isVisible) return;
        updatePopupPosition();
        if (typeof window === 'undefined') return;
        const handleViewportChange = () => updatePopupPosition();
        window.addEventListener('scroll', handleViewportChange, true);
        window.addEventListener('resize', handleViewportChange);
        return () => {
            window.removeEventListener('scroll', handleViewportChange, true);
            window.removeEventListener('resize', handleViewportChange);
        };
    }, [isVisible, updatePopupPosition]);

    const dropdownStyle = popupPosition
        ? {
              top: popupPosition.top,
              left: popupPosition.left,
              right: popupPosition.right,
          }
        : undefined;

    const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

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
            {isVisible &&
                popupPosition &&
                portalElement &&
                createPortal(
                    <div
                        aria-hidden
                        className={css({
                            position: 'fixed',
                            marginTop: '0',
                            width: '240px',
                            background: 'surface.elevated',
                            borderRadius: 'xl',
                            border: '1px solid',
                            borderColor: 'rgba(224,123,83,0.2)',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                            padding: '3',
                            zIndex: 110,
                            animation: 'fadeIn 150ms ease',
                            display: { base: 'none', md: 'block' },
                        })}
                        style={dropdownStyle}
                        onMouseEnter={handlePreviewPointerEnter}
                        onMouseLeave={handlePreviewPointerLeave}
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
                                color: 'foreground.muted',
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
                    </div>,
                    portalElement,
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
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    },
                })}
            >
                <span className={css({ whiteSpace: 'nowrap' })}>{recipe.title}</span>
                <span
                    onClick={handlePinClick}
                    className={css({
                        fontSize: 'xs',
                        color: 'foreground.muted',
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
                position: 'relative',
                scrollbarWidth: 'none',
                '&::-webkitScrollbar': {
                    display: 'none',
                },
                background: 'surface',
                borderTop: '1px solid',
                borderColor: 'border',
            })}
        >
            <span
                className={css({
                    fontSize: 'xs',
                    fontWeight: '600',
                    color: 'foreground.muted',
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
                        color: 'foreground.muted',
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
