'use client';

import { Target } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

import { fetchRecipesByTime, type RecipeCardData } from '@/app/actions/recipes';
import { css } from 'styled-system/css';

import { RecipeCard } from '../features/RecipeCard';
import { Section } from '../features/Section';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../features/Select';

const timeOptions = [
    { value: 'frueh', label: 'Frühstück' },
    { value: 'mittag', label: 'Mittagessen' },
    { value: 'abend', label: 'Abendessen' },
    { value: 'brunch', label: 'Brunch' },
    { value: 'fingerfood', label: 'Fingerfood' },
];

export function FitsNow() {
    const [selectedTime, setSelectedTime] = useState('frueh');
    const [recipes, setRecipes] = useState<RecipeCardData[]>([]);
    const [loading, setLoading] = useState(true);
    const fetchKeyRef = useRef(0);

    useEffect(() => {
        let cancelled = false;

        // Load 3 recipes for responsive display
        fetchRecipesByTime(selectedTime, 3).then((data: RecipeCardData[]) => {
            if (!cancelled) {
                setRecipes(data);
                setLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [selectedTime]);

    const handleTimeChange = (value: string) => {
        setSelectedTime(value);
        setLoading(true);
        fetchKeyRef.current += 1;
    };

    return (
        <Section
            title="Passt zu jetzt"
            titleIcon={<Target size={20} color="#e07b53" />}
            description="Tagesgefühl trifft Rezept – sofort, schnell, perfekt abgestimmt."
            action={
                <Select value={selectedTime} onValueChange={handleTimeChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Wähle eine Zeit" />
                    </SelectTrigger>
                    <SelectContent>
                        {timeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            }
        >
            {loading ? (
                <div className={css({ py: '8', textAlign: 'center' })}>Lädt...</div>
            ) : recipes.length === 0 ? (
                <div className={css({ py: '8', textAlign: 'center', color: 'text-muted' })}>
                    Keine Rezepte für diese Zeit gefunden.
                </div>
            ) : (
                <div
                    className={css({
                        display: 'grid',
                        gridTemplateColumns: {
                            base: '1fr', // 1 on mobile
                            sm: 'repeat(2, 1fr)', // 2 on small screens
                            lg: 'repeat(3, 1fr)', // 3 on desktop
                        },
                        gap: '6',
                    })}
                >
                    {recipes.map((recipe) => (
                        <RecipeCard
                            key={recipe.id}
                            recipe={{
                                id: recipe.id,
                                slug: recipe.slug,
                                title: recipe.title,
                                description: recipe.description || '',
                                image: recipe.image,
                                category: recipe.category,
                                rating: recipe.rating,
                                time: recipe.time,
                            }}
                        />
                    ))}
                </div>
            )}
        </Section>
    );
}
