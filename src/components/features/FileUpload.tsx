'use client';

import { X } from 'lucide-react';

import { SmartImage } from '@app/components/atoms/SmartImage';
import { css } from 'styled-system/css';

import { UploadArea } from './UploadArea';

type UploadType = 'profile' | 'recipe' | 'comment';

interface FileUploadProps {
    type: UploadType;
    value?: string;
    onChange: (url: string) => void;
    recipeId?: string;
    label?: string;
}

export function FileUpload({ type, value, onChange, recipeId, label }: FileUploadProps) {
    const handleRemove = () => {
        onChange('');
    };

    return (
        <div className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
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
                <UploadArea
                    uploadType={type}
                    recipeId={recipeId}
                    label={label}
                    onUploaded={onChange}
                />
            )}
        </div>
    );
}
