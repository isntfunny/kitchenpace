'use client';

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';

import { getThumbnailUrl, extractKeyFromUrl, ThumbnailOptions } from '@/lib/thumbnail';

interface SmartImageProps extends Omit<ImageProps, 'src' | 'width' | 'height'> {
    src: string;
    width?: number;
    height?: number;
    thumbnailOptions?: ThumbnailOptions;
    fallback?: string;
}

export function SmartImage({
    src,
    width = 400,
    height = 300,
    thumbnailOptions,
    fallback = '/placeholder.jpg',
    alt,
    fill,
    ...props
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
    };

    if (!src || error) {
        return fill ? (
            <Image src={fallback} alt={alt || ''} fill {...props} />
        ) : (
            <Image src={fallback} width={width} height={height} alt={alt || ''} {...props} />
        );
    }

    const isExternal = src.startsWith('http') && !thumbnailSrc.includes('/api/thumbnail');

    if (fill) {
        return (
            <Image
                src={isExternal ? src : thumbnailSrc}
                alt={alt || ''}
                fill
                onError={handleError}
                unoptimized={isExternal}
                {...props}
            />
        );
    }

    return (
        <Image
            src={isExternal ? src : thumbnailSrc}
            width={width}
            height={height}
            alt={alt || ''}
            onError={handleError}
            unoptimized={isExternal}
            {...props}
        />
    );
}
