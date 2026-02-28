'use client';

import Image from 'next/image';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

type HeroImage = {
    src: string;
    thumbKey?: string | null;
    title: string;
    subtitle?: string;
};

interface HeroImageGalleryProps {
    images: HeroImage[];
    currentIndex: number;
    onIndexChange: (index: number) => void;
    lightboxOpen: boolean;
    onLightboxOpenChange: (open: boolean) => void;
}

export function HeroImageGallery({
    images,
    currentIndex,
    onIndexChange,
    lightboxOpen,
    onLightboxOpenChange,
}: HeroImageGalleryProps) {
    const heroCount = Math.max(1, images.length);
    const normalizedIndex = heroCount ? currentIndex % heroCount : 0;
    const currentImage = images[normalizedIndex];

    const handleNext = () => onIndexChange((currentIndex + 1) % heroCount);
    const handlePrev = () => onIndexChange((currentIndex - 1 + heroCount) % heroCount);

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
            <div
                className={css({
                    position: 'relative',
                    borderRadius: '2xl',
                    overflow: 'hidden',
                    bg: 'black',
                })}
            >
                <div
                    className={css({
                        aspectRatio: '4/3',
                        position: 'relative',
                        cursor: 'pointer',
                    })}
                    onClick={() => onLightboxOpenChange(true)}
                >
                    <Image
                        src={currentImage?.src || images[0]?.src}
                        alt={currentImage?.title ?? images[0]?.title}
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        style={{ objectFit: 'cover' }}
                    />
                </div>
                <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Vorheriges Bild"
                    className={css({
                        position: 'absolute',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        left: '2',
                        width: '40px',
                        height: '40px',
                        borderRadius: 'full',
                        border: 'none',
                        bg: 'rgba(0,0,0,0.4)',
                        color: 'white',
                        cursor: 'pointer',
                    })}
                >
                    ‹
                </button>
                <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Nächstes Bild"
                    className={css({
                        position: 'absolute',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        right: '2',
                        width: '40px',
                        height: '40px',
                        borderRadius: 'full',
                        border: 'none',
                        bg: 'rgba(0,0,0,0.4)',
                        color: 'white',
                        cursor: 'pointer',
                    })}
                >
                    ›
                </button>
            </div>

            <div className={css({ mt: '1' })}>
                <div
                    className={flex({
                        justify: 'space-between',
                        align: 'center',
                        mb: '2',
                        gap: '2',
                    })}
                >
                    <span
                        className={css({
                            fontSize: 'sm',
                            color: 'text-muted',
                            fontFamily: 'body',
                        })}
                    >
                        {currentImage?.subtitle ?? 'Galerie'} ({normalizedIndex + 1}/{heroCount})
                    </span>
                    {heroCount > 1 && (
                        <span
                            className={css({
                                fontSize: 'xs',
                                color: 'text-muted',
                            })}
                        >
                            Tippe oder swipere über das Bild
                        </span>
                    )}
                </div>
                <div
                    className={css({
                        display: 'flex',
                        gap: '2',
                        overflowX: 'auto',
                        pb: '2',
                        maxW: '100%',
                        lg: {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                            overflowX: 'visible',
                        },
                    })}
                >
                    {images.map((img, idx) => {
                        const thumbUrl = img.thumbKey
                            ? `/api/thumbnail?key=${encodeURIComponent(img.thumbKey)}&width=200&height=200&fit=cover&quality=75`
                            : img.src;
                        return (
                            <button
                                key={`${idx}-${img.src}`}
                                type="button"
                                onClick={() => onIndexChange(idx)}
                                className={css({
                                    borderRadius: 'lg',
                                    border: '2px solid',
                                    borderColor:
                                        idx === normalizedIndex ? 'primary' : 'transparent',
                                    padding: 0,
                                    minWidth: { base: '72px', lg: 'auto' },
                                    width: '72px',
                                    height: '72px',
                                    flex: { base: '0 0 auto', lg: 'initial' },
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                })}
                            >
                                <div
                                    className={css({
                                        position: 'relative',
                                        width: '100%',
                                        height: '100%',
                                    })}
                                >
                                    <Image
                                        src={thumbUrl}
                                        alt={img.title}
                                        fill
                                        sizes="72px"
                                        style={{ objectFit: 'cover' }}
                                    />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <Lightbox
                open={lightboxOpen}
                close={() => onLightboxOpenChange(false)}
                index={currentIndex}
                slides={images.map((img) => ({
                    src: img.src,
                    title: img.title,
                    description: img.subtitle || undefined,
                }))}
                styles={{
                    container: {
                        backgroundColor: 'rgba(0,0,0,0.95)',
                    },
                }}
                carousel={{ preload: 2 }}
            />
        </div>
    );
}
