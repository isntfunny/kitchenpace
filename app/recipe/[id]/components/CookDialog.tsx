'use client';

import { Camera, CheckCircle, ChefHat } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

interface CookDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { notes: string; image: File | null }) => void;
    isPending: boolean;
}

export function CookDialog({ isOpen, onClose, onSubmit, isPending }: CookDialogProps) {
    const [uploadedImage, setUploadedImage] = useState<File | null>(null);
    const [cookNotes, setCookNotes] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        onSubmit({ notes: cookNotes, image: uploadedImage });
        setUploadedImage(null);
        setCookNotes('');
    };

    const handleCancel = () => {
        setUploadedImage(null);
        setCookNotes('');
        onClose();
    };

    return (
        <div
            className={css({
                mt: '4',
                p: '5',
                bg: 'surface.elevated',
                borderRadius: 'xl',
                border: '1px solid',
                borderColor: 'gray.200',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            })}
        >
            <h3
                className={css({
                    fontSize: 'base',
                    fontWeight: '700',
                    fontFamily: 'heading',
                    mb: '3',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                })}
            >
                <ChefHat size={20} />
                <span>Als gekocht markieren</span>
            </h3>

            <div
                className={css({
                    border: '2px dashed',
                    borderColor: 'gray.300',
                    borderRadius: 'lg',
                    p: '6',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    bg: 'gray.50',
                    _hover: {
                        borderColor: 'primary',
                        bg: 'rgba(224,123,83,0.05)',
                    },
                })}
                onClick={() => document.getElementById('cook-image-input')?.click()}
            >
                <input
                    id="cook-image-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setUploadedImage(e.target.files?.[0] ?? null)}
                    className={css({ display: 'none' })}
                />
                {uploadedImage ? (
                    <div>
                        <div
                            className={css({
                                fontSize: 'xl',
                                mb: '2',
                                color: '#4caf50',
                            })}
                        >
                            <CheckCircle size={32} />
                        </div>
                        <p
                            className={css({
                                fontSize: 'sm',
                                fontWeight: '500',
                            })}
                        >
                            {uploadedImage.name}
                        </p>
                        <p
                            className={css({
                                fontSize: 'xs',
                                color: 'text-muted',
                                mt: '1',
                            })}
                        >
                            Klicken zum Ändern
                        </p>
                    </div>
                ) : (
                    <div>
                        <div
                            className={css({
                                fontSize: '2xl',
                                mb: '2',
                                color: '#4a5568',
                            })}
                        >
                            <Camera size={40} />
                        </div>
                        <p
                            className={css({
                                fontSize: 'sm',
                                fontWeight: '500',
                            })}
                        >
                            Bild hierher ziehen oder klicken
                        </p>
                        <p
                            className={css({
                                fontSize: 'xs',
                                color: 'text-muted',
                                mt: '1',
                            })}
                        >
                            Optional - du kannst auch ohne Bild fortfahren
                        </p>
                    </div>
                )}
            </div>

            <div className={flex({ gap: '3', mt: '4' })}>
                <Button type="button" variant="ghost" onClick={handleCancel}>
                    Abbrechen
                </Button>
                <Button type="button" variant="primary" onClick={handleSubmit} disabled={isPending}>
                    {isPending ? 'Speichern...' : 'Absenden'}
                </Button>
            </div>
        </div>
    );
}
