import { Carrot } from 'lucide-react';
import Link from 'next/link';

import type { PopularIngredientData } from '@app/app/actions/community';

import { css } from 'styled-system/css';

import { Heading } from '../atoms/Typography';

interface PopularIngredientsProps {
    ingredients: PopularIngredientData[];
}

export function PopularIngredients({ ingredients }: PopularIngredientsProps) {
    return (
        <div
            className={css({
                p: 'card',
                borderRadius: 'surface',
                bg: 'surface',
                boxShadow: 'shadow.medium',
            })}
        >
            <div className={css({ mb: '2' })}>
                <Heading
                    as="h3"
                    size="md"
                    className={css({
                        color: 'primary',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    })}
                >
                    <Carrot size={18} strokeWidth={2.5} />
                    <span>Beliebte Zutaten</span>
                </Heading>
            </div>

            {ingredients.length === 0 ? (
                <p className={css({ color: 'foreground.muted', fontSize: 'sm' })}>
                    Aktuell keine Zutaten verfügbar.
                </p>
            ) : (
                <div
                    className={css({
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '2',
                    })}
                >
                    {ingredients.map((item) => (
                        <Link
                            key={item.slug}
                            href={`/zutat/${item.slug}`}
                            className={css({
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '1.5',
                                px: '3',
                                py: '1.5',
                                borderRadius: 'full',
                                fontSize: 'sm',
                                fontFamily: 'body',
                                fontWeight: '500',
                                bg: 'transparent',
                                color: 'foreground',
                                border: '1px solid',
                                borderColor: 'border',
                                cursor: 'pointer',
                                _hover: {
                                    bg: item.color,
                                    color: 'white',
                                    borderColor: item.color,
                                },
                                transition: 'all 150ms ease',
                                textDecoration: 'none',
                            })}
                        >
                            <span>{item.name}</span>
                            <span
                                className={css({
                                    fontSize: '0.65rem',
                                    bg: 'border',
                                    px: '1.5',
                                    py: '0.5',
                                    borderRadius: 'full',
                                })}
                            >
                                {item.count}
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
