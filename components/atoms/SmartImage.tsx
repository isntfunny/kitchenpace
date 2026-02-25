'use client';

import Image from 'next/image';
import { useState } from 'react';

import { getThumbnailUrl, extractKeyFromUrl, ThumbnailOptions } from '@/lib/thumbnail';
import { css, cx } from 'styled-system/css';

interface SmartImageProps {
    src: string;
    alt?: string;
    width?: number;
    height?: number;
    fill?: boolean;
    thumbnailOptions?: ThumbnailOptions;
    fallback?: string;
    className?: string;
    onLoad?: () => void;
    onError?: () => void;
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
    fallback = '/placeholder.jpg',
    className,
    onLoad,
    onError,

    sizes: _sizes,

    priority: _priority,
}: SmartImageProps) {
    const [error, setError] = useState(false);

    const key = extractKeyFromUrl(src);
    const thumbnailSrc = key
        ? getThumbnailUrl(key, {
              width: fill ? undefined : width,
              height: fill ? undefined : height,
              ...thumbnailOptions,
          })
        : src;

    const handleError = () => {
        setError(true);
        onError?.();
    };

    const handleLoad = () => {
        onLoad?.();
    };

    const currentSrc = !src || error ? fallback : thumbnailSrc;

    if (fill) {
        return (
            <Image
                src={currentSrc}
                alt={alt || ''}
                fill
                onLoad={handleLoad}
                onError={handleError}
                className={cx(
                    css({
                        objectFit: 'cover',
                    }),
                    className,
                )}
            />
        );
    }

    return (
        <Image
            src={currentSrc}
            alt={alt || ''}
            width={width}
            height={height}
            onLoad={handleLoad}
            onError={handleError}
            className={className}
        />
    );
}
