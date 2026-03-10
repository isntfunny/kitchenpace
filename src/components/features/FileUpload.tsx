'use client';

import { X } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';

import { SmartImage } from '@app/components/atoms/SmartImage';
import { css } from 'styled-system/css';

import { QRUploadButton } from './QRUploadButton';

type UploadType = 'profile' | 'recipe' | 'comment';

interface FileUploadProps {
    type: UploadType;
    value?: string;
    onChange: (url: string) => void;
    accept?: string;
    maxSize?: number;
    recipeId?: string;
    label?: string;
}

export function FileUpload({
    type,
    value,
    onChange,
    accept = 'image/jpeg,image/png,image/gif,image/webp',
    maxSize = 5 * 1024 * 1024,
    recipeId,
    label,
}: FileUploadProps) {
    const [progress, setProgress] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const uploading = progress !== null;

    const handleUpload = useCallback(
        (file: File) => {
            setProgress(0);
            setError(null);

            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', type);

            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    setProgress(Math.round((e.loaded / e.total) * 100));
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const data = JSON.parse(xhr.responseText) as { key: string };
                    onChange(data.key);
                } else {
                    const data = JSON.parse(xhr.responseText) as { error?: string };
                    setError(data.error || 'Upload fehlgeschlagen');
                }
                setProgress(null);
            });

            xhr.addEventListener('error', () => {
                setError('Verbindungsfehler – bitte nochmal versuchen.');
                setProgress(null);
            });

            xhr.open('POST', '/api/upload');
            xhr.send(formData);
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
                    <SmartImage
                        imageKey={value}
                        alt="Uploaded preview"
                        aspect="16:9"
                        fill
                        sizes="100vw"
                        className={css({
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
                        <X size={16} />
                    </button>
                </div>
            ) : (
                <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
                <label
                    htmlFor={`file-upload-${type}`}
                    className={css({
                        display: 'flex',
                        flexDir: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2',
                        padding: '8',
                        border: '2px dashed',
                        borderColor: uploading
                            ? 'palette.orange'
                            : {
                                  base: 'rgba(224,123,83,0.4)',
                                  _dark: 'rgba(224,123,83,0.45)',
                              },
                        borderRadius: 'xl',
                        cursor: uploading ? 'default' : 'pointer',
                        transition: 'all 150ms',
                        position: 'relative',
                        overflow: 'hidden',
                        _hover: uploading
                            ? {}
                            : {
                                  borderColor: 'palette.orange',
                                  background: {
                                      base: 'rgba(224,123,83,0.05)',
                                      _dark: 'rgba(224,123,83,0.08)',
                                  },
                              },
                    })}
                >
                    {/* Progress fill — grows left to right */}
                    {uploading && (
                        <div
                            style={{ width: `${progress ?? 0}%` }}
                            className={css({
                                position: 'absolute',
                                insetY: '0',
                                left: '0',
                                background: {
                                    base: 'rgba(224,123,83,0.15)',
                                    _dark: 'rgba(224,123,83,0.2)',
                                },
                                transition: 'width 200ms ease-out',
                                pointerEvents: 'none',
                            })}
                        />
                    )}
                    <div
                        className={css({
                            fontSize: '2xl',
                            color: uploading ? 'palette.orange' : 'rgba(224,123,83,0.7)',
                            transition: 'color 150ms',
                        })}
                    >
                        +
                    </div>
                    <span
                        className={css({
                            color: 'text-muted',
                            fontSize: 'sm',
                            position: 'relative',
                        })}
                    >
                        {uploading ? `${progress ?? 0} %` : 'Klicken zum Hochladen'}
                    </span>
                    <span
                        className={css({
                            color: 'text-muted',
                            fontSize: 'xs',
                            position: 'relative',
                        })}
                    >
                        {uploading ? 'Wird hochgeladen…' : 'JPEG, PNG, GIF, WebP (max 5 MB)'}
                    </span>
                </label>
                <QRUploadButton
                    uploadType={type}
                    recipeId={recipeId}
                    label={label}
                    onImageUploaded={onChange}
                />
                </div>
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

        </div>
    );
}
