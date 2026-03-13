'use client';

import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

import { SmartImage } from '@app/components/atoms/SmartImage';
import { ReportButton } from '@app/components/features/ReportButton';
import { css } from 'styled-system/css';

type HeroImage = {
    src: string;
    thumbKey?: string | null;
    title: string;
    subtitle?: string;
    reportable?: {
        contentType: 'cook_image';
        contentId: string;
        ownerId: string;
    };
};

interface HeroImageGalleryProps {
    images: HeroImage[];
    currentIndex: number;
    onIndexChange: (index: number) => void;
    lightboxIndex: number;
    onLightboxIndexChange: (index: number) => void;
    lightboxOpen: boolean;
    onLightboxOpenChange: (open: boolean) => void;
    recipeId: string;
    recipeTitle: string;
    viewerId: string | null;
}

export function HeroImageGallery({
    images,
    currentIndex,
    onIndexChange,
    lightboxIndex,
    onLightboxIndexChange,
    lightboxOpen,
    onLightboxOpenChange,
    recipeId,
    recipeTitle,
    viewerId,
}: HeroImageGalleryProps) {
    const hasImages = images.some((image) => image.src);
    const visibleImages = hasImages ? images : [];
    const heroCount = Math.max(1, visibleImages.length);
    const normalizedIndex = heroCount && hasImages ? currentIndex % heroCount : 0;
    const currentImage = visibleImages[normalizedIndex];

    const handleNext = () => onIndexChange((currentIndex + 1) % heroCount);
    const handlePrev = () => onIndexChange((currentIndex - 1 + heroCount) % heroCount);

    if (!hasImages) {
        return (
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
                <div
                    className={css({
                        aspectRatio: '4/3',
                        borderRadius: '2xl',
                        overflow: 'hidden',
                    })}
                >
                    <SmartImage recipeId={recipeId} alt={recipeTitle} fill />
                </div>
            </div>
        );
    }

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
                    onClick={() => {
                        onLightboxIndexChange(normalizedIndex);
                        onLightboxOpenChange(true);
                    }}
                >
                    <SmartImage
                        src={currentImage?.src}
                        alt={currentImage?.title ?? recipeTitle}
                        fill
                    />
                </div>
                {heroCount > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={handlePrev}
                            aria-label="Vorheriges Bild"
                            className={css({
                                position: 'absolute',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                left: '2',
                                width: '48px',
                                height: '48px',
                                borderRadius: 'full',
                                border: 'none',
                                bg: 'rgba(0,0,0,0.5)',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '24px',
                                transition: 'all 200ms ease',
                                _hover: { bg: 'rgba(0,0,0,0.7)' },
                                _active: { transform: 'translateY(-50%) scale(0.95)' },
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
                                width: '48px',
                                height: '48px',
                                borderRadius: 'full',
                                border: 'none',
                                bg: 'rgba(0,0,0,0.5)',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '24px',
                                transition: 'all 200ms ease',
                                _hover: { bg: 'rgba(0,0,0,0.7)' },
                                _active: { transform: 'translateY(-50%) scale(0.95)' },
                            })}
                        >
                            ›
                        </button>
                    </>
                )}
                {heroCount > 1 && (
                    <div
                        className={css({
                            position: 'absolute',
                            bottom: '3',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            gap: '1.5',
                            p: '1.5',
                            borderRadius: 'xl',
                            bg: 'rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(8px)',
                        })}
                    >
                        {visibleImages.map((img, idx) => {
                            const thumbUrl = img.thumbKey
                                ? `/api/thumbnail?key=${encodeURIComponent(img.thumbKey)}&aspect=1:1&w=320`
                                : img.src;
                            return (
                                <button
                                    key={`${idx}-${img.src}`}
                                    type="button"
                                    onClick={() => onIndexChange(idx)}
                                    className={css({
                                        borderRadius: 'md',
                                        border: '2px solid',
                                        borderColor:
                                            idx === normalizedIndex ? 'white' : 'transparent',
                                        padding: 0,
                                        width: '44px',
                                        height: '44px',
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        opacity: idx === normalizedIndex ? 1 : 0.7,
                                        transition: 'all 150ms ease',
                                        _hover: { opacity: 1 },
                                    })}
                                >
                                    <div
                                        className={css({
                                            position: 'relative',
                                            width: '100%',
                                            height: '100%',
                                        })}
                                    >
                                        <SmartImage src={thumbUrl} alt={img.title} fill />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
                {currentImage?.reportable && currentImage.reportable.ownerId !== viewerId && (
                    <div
                        className={css({
                            position: 'absolute',
                            top: '3',
                            right: '3',
                        })}
                    >
                        <ReportButton
                            contentType={currentImage.reportable.contentType}
                            contentId={currentImage.reportable.contentId}
                            variant="icon"
                        />
                    </div>
                )}
            </div>

            <Lightbox
                open={lightboxOpen}
                close={() => onLightboxOpenChange(false)}
                index={lightboxIndex}
                slides={visibleImages.map((img) => ({
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
