'use client';

import { Bookmark, ChefHat, CheckCircle, Printer } from 'lucide-react';

import { Button } from '@app/components/atoms/Button';
import { SparkleEffect } from '@app/components/atoms/SparkleEffect';
import { ReportButton } from '@app/components/features/ReportButton';
import { ShareButton } from '@app/components/features/ShareButton';
import { css } from 'styled-system/css';

interface RecipeActionButtonsProps {
    recipeId: string;
    recipeTitle: string;
    recipeSlug: string;
    recipeImageKey?: string | null;
    isFavorite: boolean;
    favoriteCount: number;
    hasCooked: boolean;
    cookCount: number;
    isFavoritePending: boolean;
    isCookPending: boolean;
    isAuthor: boolean;
    onFavoriteToggle: () => void;
    onCookToggle: () => void;
    onPrint: () => void;
}

export function RecipeActionButtons({
    recipeId,
    recipeTitle,
    recipeSlug,
    recipeImageKey,
    isFavorite,
    favoriteCount,
    hasCooked,
    cookCount,
    isFavoritePending,
    isCookPending,
    isAuthor,
    onFavoriteToggle,
    onCookToggle,
    onPrint,
}: RecipeActionButtonsProps) {
    return (
        <div>
            <div className={css({ display: 'flex', gap: '2', mb: '2' })}>
                <div className={css({ flex: '1' })}>
                    <SparkleEffect>
                        {(triggerSparkle) => (
                            <Button
                                type="button"
                                variant={isFavorite ? 'secondary' : 'primary'}
                                onClick={() => {
                                    if (!isFavorite) triggerSparkle();
                                    onFavoriteToggle();
                                }}
                                disabled={isFavoritePending}
                                style={{ width: '100%', minWidth: 0 }}
                            >
                                <span className={css({ flexShrink: 0 })}>
                                    {isFavorite ? (
                                        <Bookmark size={16} fill="currentColor" />
                                    ) : (
                                        <Bookmark size={16} />
                                    )}
                                </span>
                                <span
                                    className={css({
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        minWidth: 0,
                                    })}
                                >
                                    {isFavorite ? 'Favorisiert' : 'Favorisieren'}
                                </span>
                                <span
                                    className={css({
                                        opacity: 0.7,
                                        fontSize: 'xs',
                                        flexShrink: 0,
                                    })}
                                >
                                    · {favoriteCount}
                                </span>
                            </Button>
                        )}
                    </SparkleEffect>
                </div>
                <div className={css({ flex: '1' })}>
                    <Button
                        type="button"
                        variant="primary"
                        onClick={onCookToggle}
                        disabled={isCookPending}
                        style={{ width: '100%', minWidth: 0 }}
                    >
                        <span className={css({ flexShrink: 0 })}>
                            {hasCooked ? <CheckCircle size={16} /> : <ChefHat size={16} />}
                        </span>
                        <span
                            className={css({
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                minWidth: 0,
                            })}
                        >
                            Zubereitet
                        </span>
                        <span
                            className={css({
                                opacity: 0.7,
                                fontSize: 'xs',
                                flexShrink: 0,
                            })}
                        >
                            · {cookCount}
                        </span>
                    </Button>
                </div>
            </div>
            <div
                className={css({
                    display: 'flex',
                    gap: '1',
                    alignItems: 'center',
                    justifyContent: 'space-evenly',
                })}
            >
                <Button type="button" variant="ghost" onClick={onPrint}>
                    <Printer size={16} />
                    Drucken
                </Button>
                <ShareButton
                    title={recipeTitle}
                    slug={recipeSlug}
                    imageKey={recipeImageKey ?? undefined}
                />
                {!isAuthor && (
                    <ReportButton contentType="recipe" contentId={recipeId} variant="text" />
                )}
            </div>
        </div>
    );
}
