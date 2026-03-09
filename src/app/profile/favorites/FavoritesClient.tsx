'use client';

import { Heart, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { AlertDialog } from 'radix-ui';
import { useTransition } from 'react';

import { toggleFavoriteAction } from '@app/app/actions/social';
import { Button } from '@app/components/atoms/Button';
import { Heading, Text } from '@app/components/atoms/Typography';
import { RecipeCard } from '@app/components/features/RecipeCard';
import { formatTimeAgo } from '@app/lib/activity-utils';
import { css } from 'styled-system/css';
import { flex, grid } from 'styled-system/patterns';

export interface FavoriteRecipeCard {
    id: string;
    slug: string;
    title: string;
    category: string;
    rating: number;
    time: string;
    image: string | null;
    description?: string;
    savedAt: Date | string;
}

interface FavoritesClientProps {
    initialFavorites: FavoriteRecipeCard[];
}

export function FavoritesClient({ initialFavorites }: FavoritesClientProps) {
    const [isPending, startTransition] = useTransition();

    const handleRemove = (recipeId: string) => {
        startTransition(async () => {
            try {
                await toggleFavoriteAction(recipeId);
            } catch (error) {
                console.error(error);
            }
        });
    };

    return (
        <section className={css({ py: { base: '6', md: '8' } })}>
            {/* Page header */}
            <div className={css({ mb: '8' })}>
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3',
                        mb: '1',
                    })}
                >
                    <div
                        className={css({
                            w: '10',
                            h: '10',
                            borderRadius: 'xl',
                            bg: 'primary',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            flexShrink: '0',
                        })}
                    >
                        <Heart size={20} />
                    </div>
                    <Heading as="h1" size="xl">
                        Meine Favoriten
                    </Heading>
                </div>
                <Text color="muted" className={css({ pl: '13' })}>
                    {initialFavorites.length === 0
                        ? 'Noch keine gespeicherten Rezepte'
                        : initialFavorites.length === 1
                          ? '1 gespeichertes Rezept'
                          : `${initialFavorites.length} gespeicherte Rezepte`}
                </Text>
            </div>

            {initialFavorites.length > 0 ? (
                <div
                    className={grid({
                        columns: { base: 1, sm: 2, lg: 3 },
                        gap: '6',
                    })}
                >
                    {initialFavorites.map((recipe, index) => (
                        <motion.div
                            key={recipe.id}
                            initial={{ opacity: 0, y: 14 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-30px' }}
                            transition={{ duration: 0.35, delay: Math.min(index, 5) * 0.06 }}
                        >
                        <RecipeCard
                            recipe={recipe}
                            footer={
                                <div
                                    className={flex({
                                        justify: 'space-between',
                                        align: 'center',
                                        px: '1',
                                    })}
                                >
                                    <Text size="sm" color="muted">
                                        Gespeichert {formatTimeAgo(recipe.savedAt, { prefix: true, fallbackToDate: true })}
                                    </Text>
                                    <RemoveButton
                                        title={recipe.title}
                                        onRemove={() => handleRemove(recipe.id)}
                                        isRemoving={isPending}
                                    />
                                </div>
                            }
                        />
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div
                    className={css({
                        textAlign: 'center',
                        py: '16',
                        px: '4',
                        bg: 'surface',
                        borderRadius: '2xl',
                        boxShadow: 'shadow.medium',
                    })}
                >
                    <div
                        className={css({
                            w: '16',
                            h: '16',
                            borderRadius: 'full',
                            bg: { base: 'red.50', _dark: 'rgba(239,68,68,0.1)' },
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'red.400',
                            mx: 'auto',
                            mb: '4',
                        })}
                    >
                        <Heart size={32} />
                    </div>
                    <Heading as="h2" size="lg" className={css({ mb: '2' })}>
                        Noch keine Favoriten
                    </Heading>
                    <Text color="muted" className={css({ mb: '6' })}>
                        Speichere Rezepte, die du später kochen möchtest.
                    </Text>
                    <Link href="/">
                        <Button variant="primary">Rezepte entdecken</Button>
                    </Link>
                </div>
            )}
        </section>
    );
}

function RemoveButton({
    title,
    onRemove,
    isRemoving,
}: {
    title: string;
    onRemove: () => void;
    isRemoving: boolean;
}) {
    return (
        <AlertDialog.Root>
            <AlertDialog.Trigger asChild>
                <button
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1',
                        fontSize: 'xs',
                        color: 'text-muted',
                        cursor: 'pointer',
                        bg: 'transparent',
                        border: 'none',
                        p: '0',
                        transition: 'color 150ms ease',
                        _hover: { color: 'red.500' },
                    })}
                >
                    <Trash2 size={12} />
                    Entfernen
                </button>
            </AlertDialog.Trigger>
            <AlertDialog.Portal>
                <AlertDialog.Overlay
                    className={css({
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'surface.overlay',
                        zIndex: '40',
                    })}
                />
                <AlertDialog.Content
                    className={css({
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '90vw',
                        maxWidth: '420px',
                        bg: 'surface',
                        borderRadius: '2xl',
                        p: '6',
                        boxShadow: { base: '0 10px 40px rgba(0,0,0,0.2)', _dark: '0 10px 40px rgba(0,0,0,0.5)' },
                        zIndex: '50',
                    })}
                >
                    <AlertDialog.Title asChild>
                        <Heading as="h3" size="lg" className={css({ mb: '2' })}>
                            Rezept entfernen?
                        </Heading>
                    </AlertDialog.Title>
                    <AlertDialog.Description asChild>
                        <Text color="muted" className={css({ mb: '6', lineHeight: '1.6' })}>
                            Möchtest du „{title}" wirklich aus deinen Favoriten entfernen? Du kannst
                            es später jederzeit wieder hinzufügen.
                        </Text>
                    </AlertDialog.Description>
                    <div className={flex({ gap: '3', justify: 'flex-end' })}>
                        <AlertDialog.Cancel asChild>
                            <Button variant="ghost">Abbrechen</Button>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action asChild>
                            <Button
                                variant="primary"
                                disabled={isRemoving}
                                onClick={(e) => {
                                    e.preventDefault();
                                    onRemove();
                                }}
                                className={css({
                                    bg: 'red.500',
                                    _hover: { bg: 'red.600' },
                                })}
                            >
                                <Trash2 size={16} />
                                {isRemoving ? 'Entferne...' : 'Entfernen'}
                            </Button>
                        </AlertDialog.Action>
                    </div>
                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
}
