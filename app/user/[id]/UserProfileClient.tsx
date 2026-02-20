'use client';

import Image from 'next/image';
import Link from 'next/link';

import { User, Recipe, Activity } from '@/app/recipe/[id]/data';
import { Badge } from '@/components/atoms/Badge';
import { Card, CardImage, CardContent, CardTitle, CardDescription } from '@/components/atoms/Card';
import { css } from 'styled-system/css';
import { flex, grid } from 'styled-system/patterns';

interface UserProfileClientProps {
    user: User;
    recipes: Recipe[];
    activities: Activity[];
}

export function UserProfileClient({ user, recipes, activities }: UserProfileClientProps) {
    return (
        <div className={css({ minH: '100vh', bg: '#fffcf9' })}>
            <div
                className={css({
                    background: 'linear-gradient(180deg, #fff7f1 0%, #fffcf9 100%)',
                    pt: { base: '8', md: '12' },
                    pb: '12',
                })}
            >
                <div
                    className={css({
                        maxW: '1000px',
                        mx: 'auto',
                        px: { base: '4', md: '6' },
                    })}
                >
                    <div
                        className={flex({
                            direction: { base: 'column', md: 'row' },
                            align: { base: 'center', md: 'flex-start' },
                            gap: { base: '6', md: '10' },
                            textAlign: { base: 'center', md: 'left' },
                        })}
                    >
                        <div>
                            {user.avatar ? (
                                <Image
                                    src={user.avatar}
                                    alt={user.name}
                                    width={160}
                                    height={160}
                                    unoptimized
                                    className={css({
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: '6px solid #fff',
                                        boxShadow: '0 15px 40px rgba(0,0,0,0.15)',
                                    })}
                                />
                            ) : (
                                <div
                                    className={css({
                                        width: '160px',
                                        height: '160px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #ffe5d1, #ffc89e)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '4xl',
                                        fontWeight: '700',
                                    })}
                                >
                                    {user.name.slice(0, 2).toUpperCase()}
                                </div>
                            )}
                        </div>

                        <div className={css({ flex: 1, maxW: '600px' })}>
                            <p
                                className={css({
                                    color: 'text-muted',
                                    letterSpacing: 'widest',
                                    fontSize: 'sm',
                                    mb: '1',
                                })}
                            >
                                Koch-Profil
                            </p>
                            <h1
                                className={css({
                                    fontSize: { base: '3xl', md: '4xl' },
                                    fontWeight: '800',
                                    mb: '3',
                                })}
                            >
                                {user.name}
                            </h1>
                            <p
                                className={css({
                                    color: 'text-muted',
                                    mb: '4',
                                    lineHeight: '1.8',
                                    fontSize: 'lg',
                                })}
                            >
                                {user.bio}
                            </p>
                            <div
                                className={flex({
                                    gap: '6',
                                    justify: { base: 'center', md: 'flex-start' },
                                    color: 'text-muted',
                                    fontSize: 'sm',
                                })}
                            >
                                <span className={css({ fontWeight: '600', color: 'text' })}>
                                    {user.recipeCount} Rezepte
                                </span>
                                <span className={css({ fontWeight: '600', color: 'text' })}>
                                    {user.followerCount} Follower
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main
                className={css({
                    maxW: '1000px',
                    mx: 'auto',
                    px: { base: '4', md: '6' },
                    py: '8',
                })}
            >
                <div
                    className={css({
                        display: 'grid',
                        gridTemplateColumns: { base: '1fr', lg: '2fr 1fr' },
                        gap: '8',
                    })}
                >
                    <div>
                        <h2
                            className={css({
                                fontSize: 'xl',
                                fontWeight: '700',
                                mb: '4',
                            })}
                        >
                            Rezepte von {user.name}
                        </h2>
                        {recipes.length > 0 ? (
                            <div
                                className={grid({
                                    columns: { base: 1, sm: 2 },
                                    gap: '4',
                                })}
                            >
                                {recipes.map((recipe) => (
                                    <Link
                                        key={recipe.id}
                                        href={`/recipe/${recipe.id}`}
                                        className={css({
                                            textDecoration: 'none',
                                            color: 'inherit',
                                        })}
                                    >
                                        <Card>
                                            <CardImage src={recipe.image} alt={recipe.title} />
                                            <CardContent>
                                                <Badge>{recipe.category}</Badge>
                                                <div className={css({ mt: '2' })}>
                                                    <CardTitle>{recipe.title}</CardTitle>
                                                    <CardDescription>
                                                        {recipe.description}
                                                    </CardDescription>
                                                </div>
                                                <div
                                                    className={flex({
                                                        justify: 'space-between',
                                                        align: 'center',
                                                        mt: '3',
                                                        fontFamily: 'body',
                                                        fontSize: 'sm',
                                                        color: 'text-muted',
                                                    })}
                                                >
                                                    <span>★ {recipe.rating}</span>
                                                    <span>
                                                        {recipe.prepTime + recipe.cookTime} Min.
                                                    </span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className={css({ color: 'text-muted' })}>
                                Noch keine Rezepte veröffentlicht.
                            </p>
                        )}
                    </div>

                    <div>
                        <h2
                            className={css({
                                fontSize: 'xl',
                                fontWeight: '700',
                                mb: '4',
                            })}
                        >
                            Letzte Aktivitäten
                        </h2>
                        <div
                            className={css({
                                bg: 'white',
                                borderRadius: '2xl',
                                p: '4',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                            })}
                        >
                            {activities.length > 0 ? (
                                <div
                                    className={flex({
                                        direction: 'column',
                                        gap: '4',
                                    })}
                                >
                                    {activities.map((activity) => (
                                        <div
                                            key={activity.id}
                                            className={css({
                                                pb: '4',
                                                borderBottom: '1px solid',
                                                borderColor: 'gray.100',
                                                '&:last-child': {
                                                    pb: '0',
                                                    borderBottom: 'none',
                                                },
                                            })}
                                        >
                                            <div
                                                className={flex({
                                                    align: 'center',
                                                    gap: '3',
                                                    mb: '2',
                                                })}
                                            >
                                                <Image
                                                    src={activity.user.avatar}
                                                    alt={activity.user.name}
                                                    width={32}
                                                    height={32}
                                                    unoptimized
                                                    className={css({
                                                        borderRadius: '50%',
                                                        objectFit: 'cover',
                                                    })}
                                                />
                                                <div
                                                    className={css({
                                                        fontSize: 'sm',
                                                        fontFamily: 'body',
                                                    })}
                                                >
                                                    <span
                                                        className={css({
                                                            fontWeight: '600',
                                                        })}
                                                    >
                                                        {activity.user.name}
                                                    </span>{' '}
                                                    {activity.action}
                                                </div>
                                            </div>
                                            {activity.content && (
                                                <p
                                                    className={css({
                                                        fontSize: 'sm',
                                                        color: 'text-muted',
                                                        pl: '11',
                                                        fontFamily: 'body',
                                                    })}
                                                >
                                                    {activity.content}
                                                </p>
                                            )}
                                            <p
                                                className={css({
                                                    fontSize: 'xs',
                                                    color: 'text-muted',
                                                    pl: '11',
                                                    mt: '1',
                                                    fontFamily: 'body',
                                                })}
                                            >
                                                {activity.timestamp}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className={css({ color: 'text-muted', fontSize: 'sm' })}>
                                    Keine Aktivitäten.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
