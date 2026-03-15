'use client';

import { Star, User } from 'lucide-react';
import { useState } from 'react';
import { useTransition } from 'react';

import { SmartImage } from '@app/components/atoms/SmartImage';
import { SearchableSelect } from '@app/components/ui/SearchableSelect';
import { getThumbnailUrl } from '@app/lib/thumbnail-client';

import { css } from 'styled-system/css';

import { setFeaturedRecipe, setTopUser } from './actions';
import { searchRecipesForAdmin } from './search-recipes';
import { searchUsers } from './search-users';

interface CurrentRecipe {
    id: string;
    title: string;
    slug: string;
    imageKey: string | null;
}

interface CurrentUser {
    id: string;
    name: string;
    photoKey: string | null;
    avatar: string | null;
}

interface ContentModerationFormProps {
    currentFeatured: CurrentRecipe | null;
    currentTopUser: CurrentUser | null;
}

export function ContentModerationForm({
    currentFeatured,
    currentTopUser,
}: ContentModerationFormProps) {
    const [selectedRecipeId, setSelectedRecipeId] = useState<string>(currentFeatured?.id ?? '');
    const [selectedRecipeLabel, setSelectedRecipeLabel] = useState<string>(
        currentFeatured?.title ?? '',
    );
    const [selectedUserId, setSelectedUserId] = useState<string>(currentTopUser?.id ?? '');
    const [selectedUserLabel, setSelectedUserLabel] = useState<string>(currentTopUser?.name ?? '');
    const [isPending, startTransition] = useTransition();

    const handleSaveFeatured = () => {
        if (!selectedRecipeId) return;
        startTransition(async () => {
            await setFeaturedRecipe(selectedRecipeId || null);
        });
    };

    const handleSaveTopUser = () => {
        if (!selectedUserId) return;
        startTransition(async () => {
            await setTopUser(selectedUserId || null);
        });
    };

    return (
        <div
            className={css({
                display: 'grid',
                gap: '4',
                gridTemplateColumns: { base: '1fr', lg: 'repeat(2, 1fr)' },
            })}
        >
            <div
                className={css({
                    borderRadius: '2xl',
                    borderWidth: '1px',
                    borderColor: 'border.muted',
                    background: 'surface.elevated',
                    padding: '5',
                })}
            >
                <div className={css({ display: 'flex', alignItems: 'center', gap: '2', mb: '4' })}>
                    <Star className={css({ color: 'palette.orange' })} size={20} />
                    <h2 className={css({ fontSize: 'lg', fontWeight: 'semibold' })}>
                        Highlight-Rezept
                    </h2>
                </div>

                {currentFeatured && (
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3',
                            p: '3',
                            borderRadius: 'xl',
                            background: 'surface',
                            mb: '4',
                        })}
                    >
                        <div
                            className={css({
                                width: '12',
                                height: '12',
                                borderRadius: 'lg',
                                background: 'gray.100',
                                overflow: 'hidden',
                            })}
                        >
                            {currentFeatured.imageKey && (
                                <img
                                    src={getThumbnailUrl(currentFeatured.imageKey, '1:1', 320)}
                                    alt={currentFeatured.title}
                                    className={css({
                                        width: 'full',
                                        height: 'full',
                                        objectFit: 'cover',
                                    })}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            )}
                        </div>
                        <div>
                            <p className={css({ fontWeight: '600' })}>{currentFeatured.title}</p>
                            <p className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                                Aktuell ausgewählt
                            </p>
                        </div>
                    </div>
                )}

                <SearchableSelect
                    valueId={selectedRecipeId}
                    valueLabel={selectedRecipeLabel}
                    onSelect={(id, label) => {
                        setSelectedRecipeId(id);
                        setSelectedRecipeLabel(label);
                    }}
                    searchFn={searchRecipesForAdmin}
                    placeholder="Rezept suchen..."
                    renderOption={(item) => {
                        const title = String(item.title || '');
                        const rating = item.rating as number | null | undefined;
                        const imageKey = item.imageKey as string | null | undefined;
                        return {
                            label: title,
                            sublabel: rating ? `${rating.toFixed(1)} ★` : undefined,
                            avatar: imageKey ? getThumbnailUrl(imageKey, '1:1', 320) : undefined,
                        };
                    }}
                    emptyMessage="Keine Rezepte gefunden"
                />

                <input type="hidden" value={selectedRecipeId} />

                <button
                    onClick={handleSaveFeatured}
                    disabled={isPending || !selectedRecipeId}
                    className={css({
                        width: 'full',
                        marginTop: '3',
                        paddingY: '2',
                        borderRadius: 'lg',
                        background: isPending || !selectedRecipeId ? 'gray.400' : 'palette.orange',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: 'sm',
                        cursor: isPending || !selectedRecipeId ? 'not-allowed' : 'pointer',
                        transition: 'background 150ms',
                    })}
                >
                    {isPending ? 'Speichern...' : 'Speichern'}
                </button>
            </div>

            <div
                className={css({
                    borderRadius: '2xl',
                    borderWidth: '1px',
                    borderColor: 'border.muted',
                    background: 'surface.elevated',
                    padding: '5',
                })}
            >
                <div className={css({ display: 'flex', alignItems: 'center', gap: '2', mb: '4' })}>
                    <User className={css({ color: 'palette.emerald' })} size={20} />
                    <h2 className={css({ fontSize: 'lg', fontWeight: 'semibold' })}>Top User</h2>
                </div>

                {currentTopUser && (
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3',
                            p: '3',
                            borderRadius: 'xl',
                            background: 'surface',
                            mb: '4',
                        })}
                    >
                        <div
                            className={css({
                                width: '12',
                                height: '12',
                                borderRadius: 'full',
                                background: 'gray.100',
                                overflow: 'hidden',
                            })}
                        >
                            {currentTopUser.photoKey || currentTopUser.avatar ? (
                                <SmartImage
                                    imageKey={currentTopUser.photoKey ?? undefined}
                                    src={
                                        !currentTopUser.photoKey
                                            ? (currentTopUser.avatar ?? undefined)
                                            : undefined
                                    }
                                    alt={currentTopUser.name}
                                    aspect="1:1"
                                    sizes="48px"
                                    fill
                                />
                            ) : (
                                <div
                                    className={css({
                                        width: 'full',
                                        height: 'full',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'palette.emerald',
                                        color: 'white',
                                    })}
                                >
                                    <User size={24} />
                                </div>
                            )}
                        </div>
                        <div>
                            <p className={css({ fontWeight: '600' })}>{currentTopUser.name}</p>
                            <p className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                                Aktuell ausgewählt
                            </p>
                        </div>
                    </div>
                )}

                <SearchableSelect
                    valueId={selectedUserId}
                    valueLabel={selectedUserLabel}
                    onSelect={(id, label) => {
                        setSelectedUserId(id);
                        setSelectedUserLabel(label);
                    }}
                    searchFn={
                        searchUsers as (query: string) => Promise<
                            {
                                id: string;
                                title?: string;
                                name?: string;
                                imageKey?: string | null;
                                rating?: number | null;
                                avatar?: string | null;
                                recipeCount?: number;
                            }[]
                        >
                    }
                    placeholder="User suchen..."
                    renderOption={(item) => {
                        const name = String(item.name || item.title || '');
                        const recipeCount = item.recipeCount as number | undefined;
                        const photoKey = (item as { photoKey?: string | null }).photoKey;
                        const avatar = item.avatar as string | null | undefined;
                        return {
                            label: name,
                            sublabel: recipeCount ? `${recipeCount} Rezepte` : undefined,
                            avatar: photoKey
                                ? getThumbnailUrl(photoKey, '1:1', 72)
                                : (avatar ?? undefined),
                        };
                    }}
                    emptyMessage="Keine User gefunden"
                />

                <button
                    onClick={handleSaveTopUser}
                    disabled={isPending || !selectedUserId}
                    className={css({
                        width: 'full',
                        marginTop: '3',
                        paddingY: '2',
                        borderRadius: 'lg',
                        background: isPending || !selectedUserId ? 'gray.400' : 'palette.emerald',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: 'sm',
                        cursor: isPending || !selectedUserId ? 'not-allowed' : 'pointer',
                        transition: 'background 150ms',
                    })}
                >
                    {isPending ? 'Speichern...' : 'Speichern'}
                </button>
            </div>
        </div>
    );
}
