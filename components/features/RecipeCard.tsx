'use client';

import Link from 'next/link';

import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

import { Badge } from '../atoms/Badge';
import { Card, CardImage, CardContent, CardTitle, CardDescription } from '../atoms/Card';

interface Recipe {
    id: string;
    slug: string;
    title: string;
    description?: string;
    image: string;
    category: string;
    rating?: number;
    time?: string;
}

interface RecipeCardProps {
    recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
    return (
        <Link href={`/recipe/${recipe.slug}`} className={css({ textDecoration: 'none' })}>
            <Card>
                <CardImage src={recipe.image} alt={recipe.title} />
                <CardContent>
                    <Badge>{recipe.category}</Badge>
                    <div className={css({ mt: '2' })}>
                        <CardTitle>{recipe.title}</CardTitle>
                        <CardDescription>{recipe.description ?? ''}</CardDescription>
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
                        {recipe.rating && (
                            <span className={flex({ align: 'center', gap: '1' })}>
                                <span>★</span>
                                <span>{recipe.rating}</span>
                            </span>
                        )}
                        {recipe.time && <span>{recipe.time}</span>}
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
