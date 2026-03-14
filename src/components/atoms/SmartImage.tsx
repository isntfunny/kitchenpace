'use client';

import { ChefHat } from 'lucide-react';
import { useState } from 'react';

import { PALETTE } from '@app/lib/palette';
import {
    getThumbnailUrl,
    getThumbnailUrlById,
    getSrcSet,
    getSrcSetById,
    extractKeyFromUrl,
} from '@app/lib/thumbnail-client';
import type { AspectRatio } from '@app/lib/thumbnail-client';
import { css, cx } from 'styled-system/css';

const RECIPE_PLACEHOLDER = '/recipe_placeholder.jpg';

interface SmartImageProps {
    src?: string;
    alt?: string;
    aspect?: AspectRatio;
    sizes?: string;
    fill?: boolean;
    className?: string;
    onLoad?: () => void;
    onError?: () => void;
    recipeId?: string;
    userId?: string;
    fallback?: string;
    /** Direct S3 key — preferred over src */
    imageKey?: string | null;
    /** @deprecated Use aspect instead */
    width?: number;
    /** @deprecated Use aspect instead */
    height?: number;
}

export function SmartImage({
    src,
    alt = '',
    aspect = 'original',
    sizes = '(max-width: 768px) 100vw, 50vw',
    fill,
    className,
    onLoad,
    onError,
    recipeId,
    userId,
    fallback = '/kitchenpace_icon.png',
    imageKey,
    width,
    height,
}: SmartImageProps) {
    const [error, setError] = useState(false);

    // If recipeId is provided but no src, render placeholder immediately
    const noImage = recipeId && !src && !imageKey;

    let thumbnailSrc: string;
    let srcSet: string | undefined;

    if (noImage) {
        thumbnailSrc = RECIPE_PLACEHOLDER;
    } else if (recipeId) {
        thumbnailSrc = getThumbnailUrlById(recipeId, 'recipe', aspect, 960);
        srcSet = getSrcSetById(recipeId, 'recipe', aspect);
    } else if (userId) {
        thumbnailSrc = getThumbnailUrlById(userId, 'user', aspect, 960);
        srcSet = getSrcSetById(userId, 'user', aspect);
    } else {
        const key = imageKey || (src ? extractKeyFromUrl(src) : null);
        if (key) {
            thumbnailSrc = getThumbnailUrl(key, aspect, 960);
            srcSet = getSrcSet(key, aspect);
        } else {
            thumbnailSrc = src || fallback;
        }
    }

    const handleError = () => {
        setError(true);
        onError?.();
    };

    const handleLoad = () => {
        onLoad?.();
    };

    // User fallback: gradient with ChefHat icon
    if (error && userId) {
        const iconSize = fill ? '40%' : Math.round(Math.min(width ?? 80, height ?? 80) * 0.4);
        return (
            <div
                className={cx(
                    css({
                        background: `linear-gradient(135deg, ${PALETTE.orange} 0%, #c4623d 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                    }),
                    fill
                        ? css({ width: '100%', height: '100%' })
                        : css({
                              width: width ? `${width}px` : '100%',
                              height: height ? `${height}px` : '100%',
                          }),
                    className,
                )}
            >
                <ChefHat size={iconSize} />
            </div>
        );
    }

    // Recipe fallback on error: swap to placeholder
    const resolvedSrc =
        error && recipeId ? RECIPE_PLACEHOLDER : !thumbnailSrc || error ? fallback : thumbnailSrc;
    const isShowingFallback = noImage || error;

    return (
        <img
            src={resolvedSrc}
            srcSet={isShowingFallback ? undefined : srcSet}
            sizes={isShowingFallback ? undefined : sizes}
            alt={alt || ''}
            width={fill ? undefined : width}
            height={fill ? undefined : height}
            onLoad={isShowingFallback ? undefined : handleLoad}
            onError={isShowingFallback ? undefined : handleError}
            className={cx(
                fill
                    ? css({
                          objectFit: 'cover',
                          width: '100%',
                          height: '100%',
                      })
                    : width && height
                      ? css({
                            width: `${width}px`,
                            height: `${height}px`,
                            objectFit: 'cover',
                        })
                      : css({
                            objectFit: 'cover',
                        }),
                className,
            )}
        />
    );
}
