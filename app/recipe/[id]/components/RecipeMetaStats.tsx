'use client';

import { Clock, ChefHat, Flame } from 'lucide-react';

import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

interface RecipeMetaStatsProps {
    prepTime: number;
    cookTime: number;
}

export function RecipeMetaStats({ prepTime, cookTime }: RecipeMetaStatsProps) {
    const totalTime = prepTime + cookTime;

    return (
        <div className={grid({ columns: 3, gap: '3', mb: '4' })}>
            <div
                className={css({
                    textAlign: 'center',
                    p: '3',
                    bg: 'light',
                    borderRadius: 'xl',
                })}
            >
                <div
                    className={css({
                        fontSize: '2xl',
                        mb: '1',
                        color: '#e07b53',
                    })}
                >
                    <Clock size={26} />
                </div>
                <div
                    className={css({
                        fontSize: 'sm',
                        color: 'text-muted',
                        fontFamily: 'body',
                    })}
                >
                    Gesamt
                </div>
                <div
                    className={css({
                        fontWeight: '600',
                        fontFamily: 'heading',
                    })}
                >
                    {totalTime} Min.
                </div>
            </div>
            <div
                className={css({
                    textAlign: 'center',
                    p: '3',
                    bg: 'light',
                    borderRadius: 'xl',
                })}
            >
                <div
                    className={css({
                        fontSize: 'xl',
                        mb: '1',
                        color: '#4caf50',
                    })}
                >
                    <ChefHat size={24} />
                </div>
                <div
                    className={css({
                        fontSize: 'sm',
                        color: 'text-muted',
                        fontFamily: 'body',
                    })}
                >
                    Arbeit
                </div>
                <div
                    className={css({
                        fontWeight: '600',
                        fontFamily: 'heading',
                    })}
                >
                    {prepTime} Min.
                </div>
            </div>
            <div
                className={css({
                    textAlign: 'center',
                    p: '3',
                    bg: 'light',
                    borderRadius: 'xl',
                })}
            >
                <div
                    className={css({
                        fontSize: 'xl',
                        mb: '1',
                        color: '#ff5722',
                    })}
                >
                    <Flame size={24} />
                </div>
                <div
                    className={css({
                        fontSize: 'sm',
                        color: 'text-muted',
                        fontFamily: 'body',
                    })}
                >
                    Kochen
                </div>
                <div
                    className={css({
                        fontWeight: '600',
                        fontFamily: 'heading',
                    })}
                >
                    {cookTime} Min.
                </div>
            </div>
        </div>
    );
}
