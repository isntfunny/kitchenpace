'use client';

import { useState, useRef, useCallback } from 'react';

import { css } from 'styled-system/css';

type UploadType = 'profile' | 'recipe' | 'comment';

interface FileUploadProps {
    type: UploadType;
    value?: string;
    onChange: (url: string) => void;
    accept?: string;
    maxSize?: number;
}

export function FileUpload({
    type,
    value,
    onChange,
    accept = 'image/jpeg,image/png,image/gif,image/webp',
    maxSize = 5 * 1024 * 1024,
}: FileUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleUpload = useCallback(
        async (file: File) => {
            setUploading(true);
            setError(null);

            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('type', type);

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Upload failed');
                }

                const data = await response.json();
                onChange(data.url);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Upload failed');
            } finally {
                setUploading(false);
            }
        },
        [type, onChange],
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > maxSize) {
            setError('File too large. Maximum size is 5MB.');
            return;
        }

        if (!accept.split(',').some((t) => file.type.includes(t.replace('image/', '')))) {
            setError('Invalid file type. Please upload an image.');
            return;
        }

        handleUpload(file);
    };

    const handleRemove = () => {
        onChange('');
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    return (
        <div className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                onChange={handleChange}
                className={css({ display: 'none' })}
                id={`file-upload-${type}`}
            />

            {value ? (
                <div
                    className={css({
                        position: 'relative',
                        width: 'full',
                        aspectRatio: '16/9',
                        borderRadius: 'xl',
                        overflow: 'hidden',
                    })}
                >
                    <img
                        src={value}
                        alt="Uploaded preview"
                        className={css({
                            width: 'full',
                            height: 'full',
                            objectFit: 'cover',
                        })}
                    />
                    <button
                        type="button"
                        onClick={handleRemove}
                        className={css({
                            position: 'absolute',
                            top: '2',
                            right: '2',
                            background: 'rgba(0,0,0,0.6)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'full',
                            width: '8',
                            height: '8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 'lg',
                            transition: 'background 150ms',
                            _hover: { background: 'rgba(0,0,0,0.8)' },
                        })}
                    >
                        ×
                    </button>
                </div>
            ) : (
                <label
                    htmlFor={`file-upload-${type}`}
                    className={css({
                        display: 'flex',
                        flexDir: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2',
                        padding: '8',
                        border: '2px dashed rgba(224,123,83,0.4)',
                        borderRadius: 'xl',
                        cursor: 'pointer',
                        transition: 'all 150ms',
                        _hover: {
                            borderColor: '#e07b53',
                            background: 'rgba(224,123,83,0.05)',
                        },
                    })}
                >
                    <div
                        className={css({
                            fontSize: '2xl',
                            color: 'rgba(224,123,83,0.7)',
                        })}
                    >
                        +
                    </div>
                    <span
                        className={css({
                            color: 'text-muted',
                            fontSize: 'sm',
                        })}
                    >
                        {uploading ? 'Uploading...' : 'Click to upload an image'}
                    </span>
                    <span
                        className={css({
                            color: 'text-muted',
                            fontSize: 'xs',
                        })}
                    >
                        JPEG, PNG, GIF, WebP (max 5MB)
                    </span>
                </label>
            )}

            {error && (
                <p
                    className={css({
                        color: 'red.500',
                        fontSize: 'sm',
                    })}
                >
                    {error}
                </p>
            )}

            {uploading && (
                <div
                    className={css({
                        position: 'absolute',
                        inset: '0',
                        background: 'rgba(255,255,255,0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    })}
                >
                    <span className={css({ color: 'text' })}>Uploading...</span>
                </div>
            )}
        </div>
    );
}
