'use client';

import { Clock, ChefHat, Flame } from 'lucide-react';

import { css } from 'styled-system/css';

interface RecipeMetaStatsProps {
    prepTime: number;
    cookTime: number;
}

export function RecipeMetaStats({ prepTime, cookTime }: RecipeMetaStatsProps) {
    const totalTime = prepTime + cookTime;

    const statStyle = css({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5',
        p: '2',
        bg: 'light',
        borderRadius: 'xl',
        flex: '1',
        minWidth: 0,
    });

    const labelStyle = css({
        fontSize: 'xs',
        color: 'text-muted',
        fontFamily: 'body',
    });

    const valueStyle = css({
        fontWeight: '700',
        fontFamily: 'heading',
        fontSize: 'sm',
        whiteSpace: 'nowrap',
    });

    return (
        <div
            className={css({
                display: 'flex',
                gap: '2',
                mb: '3',
            })}
        >
            <div className={statStyle}>
                <Clock size={16} color="var(--colors-palette-orange, #e07b53)" />
                <span className={labelStyle}>Gesamt</span>
                <span className={valueStyle}>{totalTime} Min.</span>
            </div>
            <div className={statStyle}>
                <ChefHat size={16} color="#4caf50" />
                <span className={labelStyle}>Arbeit</span>
                <span className={valueStyle}>{prepTime} Min.</span>
            </div>
            <div className={statStyle}>
                <Flame size={16} color="#ff5722" />
                <span className={labelStyle}>Kochen</span>
                <span className={valueStyle}>{cookTime} Min.</span>
            </div>
        </div>
    );
}
