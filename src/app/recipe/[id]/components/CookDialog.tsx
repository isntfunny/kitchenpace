'use client';

import { Camera, CheckCircle, ChefHat, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

import { Button } from '@app/components/atoms/Button';
import { css } from 'styled-system/css';

interface CookDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { notes: string; image: File | null }) => void;
    isPending: boolean;
}

export function CookDialog({ isOpen, onClose, onSubmit, isPending }: CookDialogProps) {
    const [uploadedImage, setUploadedImage] = useState<File | null>(null);
    const [cookNotes, setCookNotes] = useState('');

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

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
        <AnimatePresence>
            {isOpen && (
                <div
                    className={css({
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4',
                    })}
                >
                    {/* Backdrop */}
                    <motion.div
                        className={css({
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(4px)',
                        })}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={handleCancel}
                    />

                    {/* Dialog card */}
                    <motion.div
                        className={css({
                            position: 'relative',
                            zIndex: 1,
                            width: '100%',
                            maxWidth: '480px',
                            bg: 'surface.elevated',
                            borderRadius: '2xl',
                            boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
                            overflow: 'hidden',
                        })}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 10 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                px: '5',
                                py: '4',
                                borderBottom: '1px solid',
                                borderColor: 'border.muted',
                            })}
                        >
                            <h3
                                className={css({
                                    fontSize: 'base',
                                    fontWeight: '700',
                                    fontFamily: 'heading',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    margin: 0,
                                })}
                            >
                                <ChefHat size={20} />
                                Als zubereitet markieren
                            </h3>
                            <button
                                onClick={handleCancel}
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    w: '8',
                                    h: '8',
                                    borderRadius: 'full',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    color: 'foreground.muted',
                                    transition: 'all 120ms ease',
                                    _hover: { background: 'gray.100', color: 'foreground' },
                                })}
                                aria-label="Schließen"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div
                            className={css({
                                p: '5',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4',
                            })}
                        >
                            <div
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                })}
                            >
                                <span className={css({ fontSize: 'sm', fontWeight: '600', color: 'foreground' })}>
                                    Foto
                                </span>
                                <span
                                    className={css({
                                        fontSize: 'xs',
                                        fontWeight: '600',
                                        color: 'foreground.muted',
                                        bg: 'gray.100',
                                        px: '2',
                                        py: '0.5',
                                        borderRadius: 'full',
                                        textTransform: 'uppercase',
                                        letterSpacing: 'wide',
                                    })}
                                >
                                    Optional
                                </span>
                            </div>

                            {/* File upload zone */}
                            <div
                                className={css({
                                    border: '2px dashed',
                                    borderColor: 'border',
                                    borderRadius: 'xl',
                                    p: '6',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 150ms ease',
                                    bg: 'surface',
                                    _hover: {
                                        borderColor: 'accent',
                                        bg: 'rgba(224,123,83,0.06)',
                                    },
                                })}
                                onClick={() => document.getElementById('cook-image-input-modal')?.click()}
                            >
                                <input
                                    id="cook-image-input-modal"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setUploadedImage(e.target.files?.[0] ?? null)}
                                    className={css({ display: 'none' })}
                                />
                                {uploadedImage ? (
                                    <div>
                                        <div
                                            className={css({
                                                mb: '2',
                                                color: 'green.500',
                                                display: 'flex',
                                                justifyContent: 'center',
                                            })}
                                        >
                                            <CheckCircle size={32} />
                                        </div>
                                        <p className={css({ fontSize: 'sm', fontWeight: '500', m: 0 })}>
                                            {uploadedImage.name}
                                        </p>
                                        <p
                                            className={css({
                                                fontSize: 'xs',
                                                color: 'foreground.muted',
                                                mt: '1',
                                                m: 0,
                                            })}
                                        >
                                            Klicken zum Ändern
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <div
                                            className={css({
                                                mb: '2',
                                                color: 'foreground.muted',
                                                display: 'flex',
                                                justifyContent: 'center',
                                            })}
                                        >
                                            <Camera size={40} />
                                        </div>
                                        <p className={css({ fontSize: 'sm', fontWeight: '500', m: 0 })}>
                                            Foto hinzufügen
                                        </p>
                                        <p
                                            className={css({
                                                fontSize: 'xs',
                                                color: 'foreground.muted',
                                                mt: '1',
                                                m: 0,
                                            })}
                                        >
                                            Freiwillig — kein Foto? Einfach unten bestätigen.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div
                                className={css({
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '3',
                                })}
                            >
                                <Button
                                    type="button"
                                    variant="primary"
                                    onClick={handleSubmit}
                                    disabled={isPending}
                                    style={{ width: '100%' }}
                                >
                                    {isPending ? 'Speichern...' : 'Als zubereitet markieren'}
                                </Button>
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className={css({
                                        fontSize: 'sm',
                                        color: 'foreground.muted',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '0',
                                        textAlign: 'center',
                                        _hover: { color: 'foreground' },
                                    })}
                                >
                                    Abbrechen
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
