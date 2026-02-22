import type { ChefSpotlightData } from '@/app/actions/community';
import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

import { Heading, Text } from '../atoms/Typography';
import { SmartImage } from '../atoms/SmartImage';

interface ChefSpotlightProps {
    chef: ChefSpotlightData | null;
}

export function ChefSpotlight({ chef }: ChefSpotlightProps) {
    if (!chef) {
        return (
            <div
                className={css({
                    p: '5',
                    borderRadius: '2xl',
                    bg: '#fffcf9',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                })}
            >
                <div className={css({ mb: '2', fontWeight: '600', color: 'text' })}>
                    Chef des Monats
                </div>
                <Text size="sm" color="muted">
                    Wir sammeln gerade noch Daten – bald zeigen wir dir einen Kochhelden aus der
                    Community.
                </Text>
            </div>
        );
    }

    const displayName = chef.name || chef.nickname || 'Chef des Monats';
    const avatar =
        chef.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80';

    return (
        <div
            className={css({
                p: '5',
                borderRadius: '2xl',
                bg: '#fffcf9',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            })}
        >
            <div
                className={css({
                    mb: '3',
                    display: 'inline-flex',
                    bg: '#f8b500',
                    borderRadius: 'full',
                    px: '3',
                    py: '1',
                })}
            >
                <Text size="sm" className={css({ fontWeight: '600', color: 'white' })}>
                    ⭐ Chef des Monats
                </Text>
            </div>

            <div className={flex({ gap: '3', align: 'center', mb: '3' })}>
                <div
                    className={css({
                        position: 'relative',
                        width: '56px',
                        height: '56px',
                        borderRadius: 'full',
                        overflow: 'hidden',
                        border: '2px solid',
                        borderColor: '#f8b500',
                    })}
                >
                    <SmartImage
                        src={avatar}
                        alt={displayName}
                        fill
                        className={css({ objectFit: 'cover' })}
                    />
                </div>
                <div>
                    <Heading as="h4" size="sm">
                        {displayName}
                    </Heading>
                    <Text size="sm" color="muted">
                        {chef.followerCount} Follower · {chef.recipeCount} Rezepte
                    </Text>
                </div>
            </div>

            {chef.bio && (
                <Text size="sm" color="muted" className={css({ mb: '3', fontStyle: 'italic' })}>
                    &ldquo;{chef.bio}&rdquo;
                </Text>
            )}

            <div
                className={css({
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '2',
                })}
            >
                {chef.topRecipes.map((recipe) => (
                    <a href={`/recipe/${recipe.slug}`} key={recipe.id}>
                        <div
                            className={css({
                                position: 'relative',
                                aspectRatio: '1',
                                borderRadius: 'lg',
                                overflow: 'hidden',
                            })}
                        >
                            <SmartImage
                                src={recipe.image}
                                alt={recipe.title}
                                fill
                                className={css({ objectFit: 'cover' })}
                            />
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
}
