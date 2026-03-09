'use client';

import * as React from 'react';

import { css, cx } from 'styled-system/css';

import { SmartImage } from './SmartImage';

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

const baseCardClass = css({
    borderRadius: '2xl',
    overflow: 'hidden',
    transition: 'transform 180ms ease',
    cursor: 'pointer',
    _hover: {
        transform: 'translateY(-4px)',
    },
});

export function Card({ children, className }: CardProps) {
    return <div className={cx(baseCardClass, className)}>{children}</div>;
}

export function CardImage({
    src,
    alt,
    recipeId,
}: {
    src?: string;
    alt: string;
    recipeId?: string;
}) {
    return (
        <div
            className={css({
                position: 'relative',
                aspectRatio: '16/10',
                overflow: 'hidden',
            })}
        >
            <SmartImage
                src={src}
                alt={alt}
                fill
                recipeId={recipeId}
                sizes="(max-width: 768px) 100vw, 400px"
                className={css({
                    objectFit: 'cover',
                })}
            />
        </div>
    );
}

export function CardContent({ children }: { children: React.ReactNode }) {
    return (
        <div
            className={css({
                p: '4',
            })}
        >
            {children}
        </div>
    );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
    return (
        <h3
            className={css({
                fontFamily: 'heading',
                fontSize: 'xl',
                fontWeight: '600',
                color: 'text',
                lineHeight: 'tight',
            })}
        >
            {children}
        </h3>
    );
}

export function CardDescription({ children }: { children: React.ReactNode }) {
    return (
        <p
            className={css({
                fontFamily: 'body',
                fontSize: 'sm',
                color: 'text-muted',
                mt: '1',
            })}
        >
            {children}
        </p>
    );
}
