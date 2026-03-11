'use client';

import { Upload, Loader2 } from 'lucide-react';
import { useRef, useState, useCallback } from 'react';

import { css } from 'styled-system/css';

import { QRUploadButton } from './QRUploadButton';

type UploadType = 'profile' | 'recipe' | 'comment' | 'step' | 'cook';

interface UploadAreaProps {
    uploadType: UploadType;
    onUploaded: (key: string) => void;
    recipeId?: string;
    stepId?: string;
    label?: string;
}

/**
 * Unified dashed-border upload zone: tall file-pick button + QR mobile option.
 * Uploads to /api/upload and calls onUploaded(key) on success.
 */
export function UploadArea({ uploadType, onUploaded, recipeId, stepId, label }: UploadAreaProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            setIsUploading(true);
            setError(null);

            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', uploadType);

            try {
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                if (!res.ok) {
                    const json = await res.json().catch(() => ({}));
                    throw new Error((json as { error?: string }).error ?? 'Upload fehlgeschlagen');
                }
                const { key } = (await res.json()) as { key: string };
                onUploaded(key);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
            } finally {
                setIsUploading(false);
                if (inputRef.current) inputRef.current.value = '';
            }
        },
        [uploadType, onUploaded],
    );

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '1' })}>
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className={css({ display: 'none' })}
                onChange={handleFileChange}
            />

            <div
                className={css({
                    display: 'flex',
                    flexDirection: 'column',
                    border: {
                        base: '1.5px dashed rgba(0,0,0,0.12)',
                        _dark: '1.5px dashed rgba(255,255,255,0.12)',
                    },
                    borderRadius: 'xl',
                    overflow: 'hidden',
                })}
            >
                {/* Primary upload button */}
                <button
                    type="button"
                    className={uploadButtonClass}
                    onClick={() => inputRef.current?.click()}
                    disabled={isUploading}
                >
                    {isUploading ? (
                        <Loader2
                            className={css({
                                width: '16px',
                                height: '16px',
                                animation: 'spin 0.7s linear infinite',
                            })}
                        />
                    ) : (
                        <Upload style={{ width: 16, height: 16 }} />
                    )}
                    <span>{isUploading ? 'Wird hochgeladen...' : 'Foto hinzufügen'}</span>
                </button>

                {/* QR mobile upload */}
                <QRUploadButton
                    uploadType={uploadType}
                    recipeId={recipeId}
                    stepId={stepId}
                    label={label}
                    onImageUploaded={onUploaded}
                />
            </div>

            {error && (
                <p className={css({ fontSize: 'xs', color: 'red.500', mt: '0.5' })}>{error}</p>
            )}
        </div>
    );
}

const uploadButtonClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2',
    width: '100%',
    minHeight: '72px',
    py: '2.5',
    border: 'none',
    borderRadius: '0',
    backgroundColor: 'transparent',
    color: 'text.muted',
    fontSize: 'sm',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: {
        color: 'brand.primary',
        backgroundColor: { base: 'rgba(224,123,83,0.04)', _dark: 'rgba(224,123,83,0.08)' },
    },
    _disabled: { opacity: '0.6', cursor: 'not-allowed' },
});
