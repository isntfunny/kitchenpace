import type { LucideIcon } from 'lucide-react';

import type { RecipeCardData } from '@app/app/actions/recipes';

import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

import { HorizontalRecipeScroll } from './HorizontalRecipeScroll';

interface RecipeScrollProps {
    title: string;
    recipes: RecipeCardData[];
    icon?: LucideIcon;
    accentColor?: string;
}

export function RecipeScrollServer({ title, recipes, icon: Icon, accentColor }: RecipeScrollProps) {
    if (recipes.length === 0) {
        return (
            <div
                className={css({
                    p: '5',
                    borderRadius: '2xl',
                    bg: 'surface',
                    boxShadow: 'shadow.medium',
                    textAlign: 'center',
                })}
            >
                Keine Rezepte gefunden.
            </div>
        );
    }

    return (
        <section
            className={css({
                display: 'flex',
                flexDirection: 'column',
                gap: '3',
                p: '4',
                borderRadius: '2xl',
                bg: 'surface',
                boxShadow: 'shadow.medium',
            })}
        >
            <div className={flex({ align: 'center', gap: '3' })}>
                {Icon && accentColor && (
                    <div
                        className={css({
                            width: '36px',
                            height: '36px',
                            borderRadius: 'lg',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        })}
                        style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                    >
                        <Icon size={20} />
                    </div>
                )}
                <h2
                    className={css({
                        fontFamily: 'heading',
                        fontSize: { base: 'xl', md: '2xl' },
                        color: 'foreground',
                        lineHeight: '1.2',
                    })}
                >
                    {title}
                </h2>
            </div>
            <HorizontalRecipeScroll recipes={recipes} />
        </section>
    );
}
