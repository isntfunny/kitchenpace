'use client';

import { useState, useEffect, useRef } from 'react';

import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

import { getRecipesByTime, type RecipeCardData } from '../features/actions';
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

        getRecipesByTime(selectedTime).then((data) => {
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
            title="🎯 Passt zu jetzt"
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
                    className={grid({
                        columns: { base: 1, md: 2, xl: 3 },
                        gap: '6',
                    })}
                >
                    {recipes.map((recipe) => (
                        <RecipeCard
                            key={recipe.id}
                            recipe={{
                                id: recipe.id,
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
