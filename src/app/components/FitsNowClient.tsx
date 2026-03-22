'use client';

import { Target } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useTransition } from 'react';

import {
    fetchFitsNowRecipes,
    type FitsNowContext,
    type RecipeCardData,
} from '@app/app/actions/recipes';
import { RecipeCard } from '@app/components/features/RecipeCard';
import { Section } from '@app/components/features/Section';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@app/components/features/Select';

import { css } from 'styled-system/css';
import { token } from 'styled-system/tokens';

const timeOptions = [
    { value: 'fruehstueck', label: 'Frühstück' },
    { value: 'brunch', label: 'Brunch' },
    { value: 'mittag', label: 'Mittagessen' },
    { value: 'nachmittag', label: 'Kaffee & Kuchen' },
    { value: 'abend', label: 'Abendessen' },
    { value: 'spaet', label: 'Später Snack' },
];

interface FitsNowClientProps {
    initialRecipes: RecipeCardData[];
    initialContext: FitsNowContext;
}

export function FitsNowClient({ initialRecipes, initialContext }: FitsNowClientProps) {
    const [recipes, setRecipes] = useState(initialRecipes);
    const [context, setContext] = useState(initialContext);
    const [isPending, startTransition] = useTransition();

    const handleTimeChange = (value: string) => {
        startTransition(async () => {
            const result = await fetchFitsNowRecipes(value, 3);
            setRecipes(result.recipes);
            setContext(result.context);
        });
    };

    return (
        <Section
            title="Passt zu jetzt"
            titleIcon={<Target size={20} color={token('colors.period.accent')} />}
            description={context.description}
            action={
                <div className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
                    {context.isHolidayOverride && (
                        <span
                            className={css({
                                fontSize: 'xs',
                                color: 'period.accent',
                                bg: 'period.accent.soft',
                                px: '2',
                                py: '0.5',
                                borderRadius: 'md',
                                whiteSpace: 'nowrap',
                                fontWeight: '600',
                            })}
                        >
                            {context.label}
                        </span>
                    )}
                    <Select value={context.timeSlot} onValueChange={handleTimeChange}>
                        <SelectTrigger style={{ width: '100%' }}>
                            <SelectValue placeholder="Tageszeit" />
                        </SelectTrigger>
                        <SelectContent>
                            {timeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            }
        >
            {isPending ? (
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
                            base: '1fr',
                            md: 'repeat(2, 1fr)',
                            xl: 'repeat(3, 1fr)',
                        },
                        gap: '6',
                    })}
                >
                    {recipes.map((recipe, index) => (
                        <motion.div
                            key={recipe.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.08 }}
                        >
                            <RecipeCard
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
                        </motion.div>
                    ))}
                </div>
            )}
        </Section>
    );
}
