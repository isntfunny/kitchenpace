'use client';

import { ChefHat } from 'lucide-react';
import { useState } from 'react';


import { PALETTE } from '@app/lib/palette';
import {
    getThumbnailUrl,
    getThumbnailUrlById,
    extractKeyFromUrl,
    ThumbnailOptions,
} from '@app/lib/thumbnail-client';
import { css, cx } from 'styled-system/css';

export const RECIPE_PLACEHOLDER = '/recipe_placeholder.jpg';

interface SmartImageProps {
    src?: string;
    alt?: string;
    width?: number;
    height?: number;
    fill?: boolean;
    thumbnailOptions?: ThumbnailOptions;
    fallback?: string;
    className?: string;
    onLoad?: () => void;
    onError?: () => void;
    recipeId?: string;
    userId?: string;
    /** @deprecated Ignored - kept for backwards compatibility */
    imageKey?: string | null;
    /** @deprecated Ignored - kept for backwards compatibility */
    sizes?: string;
    /** @deprecated Ignored - kept for backwards compatibility */
    priority?: boolean;
}

export function SmartImage({
    src,
    alt = '',
    width = 400,
    height = 300,
    fill,
    thumbnailOptions,
    fallback = '/kitchenpace_icon.png',
    className,
    onLoad,
    onError,
    recipeId,
    userId,
    imageKey: _imageKey,
    sizes: _sizes,
    priority: _priority,
}: SmartImageProps) {
    const [error, setError] = useState(false);

    // If recipeId is provided but there's no src, skip the network round-trip
    // and render the placeholder immediately
    const noImage = recipeId && !src;

    let thumbnailSrc: string;

    if (noImage) {
        thumbnailSrc = RECIPE_PLACEHOLDER;
    } else if (recipeId) {
        thumbnailSrc = getThumbnailUrlById(recipeId, 'recipe', {
            width: fill ? undefined : width,
            height: fill ? undefined : height,
            ...thumbnailOptions,
        });
    } else if (userId) {
        thumbnailSrc = getThumbnailUrlById(userId, 'user', {
            width: fill ? undefined : width,
            height: fill ? undefined : height,
            ...thumbnailOptions,
        });
    } else {
        const key = _imageKey || (src ? extractKeyFromUrl(src) : null);
        thumbnailSrc = key
            ? getThumbnailUrl(key, {
                  width: fill ? undefined : width,
                  height: fill ? undefined : height,
                  ...thumbnailOptions,
              })
            : src || fallback;
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
        const iconSize = fill ? '40%' : Math.round(Math.min(width, height) * 0.4);
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
                        : css({ width: `${width}px`, height: `${height}px` }),
                    className,
                )}
            >
                <ChefHat size={iconSize} />
            </div>
        );
    }

    // Recipe fallback on error: swap to placeholder
    const resolvedSrc = error && recipeId ? RECIPE_PLACEHOLDER : (!thumbnailSrc || error ? fallback : thumbnailSrc);
    // Don't attach error handler if we're already showing a fallback
    const isShowingFallback = noImage || error;

    return (
        <img
            src={resolvedSrc}
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
                    : css({
                          width: `${width}px`,
                          height: `${height}px`,
                          objectFit: 'cover',
                      }),
                className,
            )}
        />
    );
}
