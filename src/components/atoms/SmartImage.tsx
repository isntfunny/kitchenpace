'use client';

import { ChefHat } from 'lucide-react';
import { useState } from 'react';


import {
    getThumbnailUrl,
    getThumbnailUrlById,
    extractKeyFromUrl,
    ThumbnailOptions,
} from '@app/lib/thumbnail-client';
import { css, cx } from 'styled-system/css';

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

    let thumbnailSrc: string;

    if (recipeId) {
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

    const currentSrc = !thumbnailSrc || error ? fallback : thumbnailSrc;

    if (error && userId) {
        const iconSize = fill ? '40%' : Math.round(Math.min(width, height) * 0.4);
        return (
            <div
                className={cx(
                    css({
                        background: 'linear-gradient(135deg, #e07b53 0%, #c4623d 100%)',
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

    return (
        <img
            src={currentSrc}
            alt={alt || ''}
            width={fill ? undefined : width}
            height={fill ? undefined : height}
            onLoad={handleLoad}
            onError={handleError}
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
                      }),
                className,
            )}
        />
    );
}
