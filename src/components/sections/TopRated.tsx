'use client';

import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

import { RecipeCard } from '../features/RecipeCard';
import { Section } from '../features/Section';

const topRatedRecipes = [
    {
        id: '5',
        slug: 'klassisches-tiramisu',
        title: 'Klassisches Tiramisu',
        description: 'Das Original-Rezept aus Italien',
        image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&q=80',
        category: 'Dessert',
        rating: 5.0,
        time: '45 Min.',
    },
    {
        id: '6',
        slug: 'sushi-platter',
        title: 'Sushi Platter',
        description: 'Selbstgemachte Maki und Nigiri Variationen',
        image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&q=80',
        category: 'Hauptgericht',
        rating: 4.9,
        time: '60 Min.',
    },
    {
        id: '7',
        slug: 'steak-mit-gemuese',
        title: 'Steak mit Gemüse',
        description: 'Perfekt gebratenes Steak mit saisonalem Gemüse',
        image: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=400&q=80',
        category: 'Hauptgericht',
        rating: 4.9,
        time: '40 Min.',
    },
    {
        id: '8',
        slug: 'matcha-latte',
        title: 'Matcha Latte',
        description: 'Cremiger Matcha mit Hafermilch',
        image: 'https://images.unsplash.com/photo-1515825838458-f2a94b20105a?w=400&q=80',
        category: 'Getränk',
        rating: 4.8,
        time: '5 Min.',
    },
];

export function TopRated() {
    const actionClass = css({
        fontFamily: 'body',
        fontSize: 'sm',
        fontWeight: '500',
        color: 'primary',
        letterSpacing: 'wide',
        _hover: {
            color: 'primary-dark',
        },
    });

    return (
        <Section
            title="Top Bewertet"
            description="Gib den beliebtesten Rezepten Raum – mit klarer Struktur und minimalem Dekor."
            action={
                <a href="#" className={actionClass}>
                    Alle anzeigen →
                </a>
            }
        >
            <div
                className={grid({
                    columns: { base: 1, sm: 2, md: 4 },
                    gap: '6',
                })}
            >
                {topRatedRecipes.map((recipe) => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
            </div>
        </Section>
    );
}
