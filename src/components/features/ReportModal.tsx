'use client';

import { Flag, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { useState, useTransition } from 'react';

import { submitReport } from '@app/app/actions/reports';
import { css } from 'styled-system/css';


const REASONS = [
    { value: 'spam', label: 'Spam' },
    { value: 'nsfw', label: 'Unangemessener Inhalt (NSFW)' },
    { value: 'hate', label: 'Hassrede' },
    { value: 'misinformation', label: 'Fehlinformationen' },
    { value: 'other', label: 'Sonstiges' },
] as const;

interface ReportModalProps {
    contentType: 'recipe' | 'comment' | 'user' | 'cook_image';
    contentId: string;
    trigger: React.ReactNode;
}

const CONTENT_LABELS: Record<ReportModalProps['contentType'], string> = {
    recipe: 'dieses Rezept',
    comment: 'diesen Kommentar',
    user: 'dieses Profil',
    cook_image: 'dieses Foto',
};

export function ReportModal({ contentType, contentId, trigger }: ReportModalProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);

        if (nextOpen) {
            setResult(null);
            setError(null);
        } else {
            setReason('');
            setDescription('');
            setResult(null);
            setError(null);
        }
    };

    const handleSubmit = () => {
        if (!reason) return;

        startTransition(async () => {
            setError(null);

            try {
                const res = await submitReport(contentType, contentId, reason, description);
                setResult(res.message);
                window.setTimeout(() => handleOpenChange(false), 1800);
            } catch (submitError) {
                if (
                    submitError instanceof Error &&
                    submitError.message.toLowerCase().includes('nicht angemeldet')
                ) {
                    const callbackUrl = window.location.pathname + window.location.search;
                    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
                    return;
                }

                setError('Die Meldung konnte gerade nicht gesendet werden.');
            }
        });
    };

    return (
        <Dialog.Root open={open} onOpenChange={handleOpenChange}>
            <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay
                    className={css({
                        position: 'fixed',
                        inset: '0',
                        bg: 'rgba(0,0,0,0.4)',
                        zIndex: '50',
                    })}
                />
                <Dialog.Content
                    className={css({
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        bg: 'surface',
                        borderRadius: 'xl',
                        p: '6',
                        width: '90vw',
                        maxWidth: '420px',
                        zIndex: '51',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    })}
                >
                    <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '4' })}>
                        <Dialog.Title
                            className={css({
                                fontSize: 'lg',
                                fontWeight: '700',
                                fontFamily: 'heading',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2',
                            })}
                        >
                            <Flag size={18} className={css({ color: 'status.danger' })} />
                            Inhalt melden
                        </Dialog.Title>
                        <Dialog.Close
                            className={css({
                                p: '1',
                                borderRadius: 'lg',
                                cursor: 'pointer',
                                border: 'none',
                                bg: 'transparent',
                                _hover: { bg: 'rgba(0,0,0,0.05)' },
                            })}
                        >
                            <X size={18} />
                        </Dialog.Close>
                    </div>

                    {result ? (
                        <p className={css({ color: 'status.success', fontSize: 'sm', fontWeight: '600' })}>
                            {result}
                        </p>
                    ) : (
                        <>
                            <p className={css({ fontSize: 'sm', color: 'text.muted', mb: '3' })}>
                                Warum möchtest du {CONTENT_LABELS[contentType]} melden?
                            </p>

                            {error && (
                                <p
                                    className={css({
                                        mb: '3',
                                        fontSize: 'sm',
                                        color: 'status.danger',
                                        fontWeight: '600',
                                    })}
                                >
                                    {error}
                                </p>
                            )}

                            <div className={css({ display: 'flex', flexDirection: 'column', gap: '2', mb: '4' })}>
                                {REASONS.map((r) => (
                                    <label
                                        key={r.value}
                                        className={css({
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '2',
                                            px: '3',
                                            py: '2',
                                            borderRadius: 'lg',
                                            cursor: 'pointer',
                                            border: '1px solid',
                                            borderColor: reason === r.value ? 'palette.orange' : 'rgba(0,0,0,0.08)',
                                            bg: reason === r.value ? 'rgba(224,123,83,0.05)' : 'transparent',
                                            fontSize: 'sm',
                                            transition: 'all 0.15s',
                                        })}
                                    >
                                        <input
                                            type="radio"
                                            name="report-reason"
                                            value={r.value}
                                            checked={reason === r.value}
                                            onChange={(e) => setReason(e.target.value)}
                                            className={css({ accentColor: 'palette.orange' })}
                                        />
                                        {r.label}
                                    </label>
                                ))}
                            </div>

                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Beschreibung (optional)"
                                className={css({
                                    width: '100%',
                                    px: '3',
                                    py: '2',
                                    borderRadius: 'xl',
                                    border: '1px solid rgba(224,123,83,0.4)',
                                    fontSize: 'sm',
                                    resize: 'vertical',
                                    minHeight: '60px',
                                    mb: '4',
                                    _focus: {
                                        borderColor: 'palette.orange',
                                        outline: 'none',
                                        boxShadow: '0 0 0 3px rgba(224,123,83,0.15)',
                                    },
                                })}
                            />

                            <div className={css({ display: 'flex', gap: '2', justifyContent: 'flex-end' })}>
                                <Dialog.Close
                                    className={css({
                                        px: '4',
                                        py: '2',
                                        borderRadius: 'xl',
                                        fontSize: 'sm',
                                        fontWeight: '600',
                                        bg: 'transparent',
                                        border: '1px solid rgba(0,0,0,0.1)',
                                        cursor: 'pointer',
                                        _hover: { bg: 'rgba(0,0,0,0.03)' },
                                    })}
                                >
                                    Abbrechen
                                </Dialog.Close>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={!reason || pending}
                                    className={css({
                                        px: '4',
                                        py: '2',
                                        borderRadius: 'xl',
                                        fontSize: 'sm',
                                        fontWeight: '600',
                                        bg: 'status.danger',
                                        color: 'white',
                                        border: 'none',
                                        cursor: 'pointer',
                                        _hover: { bg: '#b91c1c' },
                                        _disabled: { opacity: '0.5', cursor: 'not-allowed' },
                                    })}
                                >
                                    {pending ? 'Wird gesendet...' : 'Melden'}
                                </button>
                            </div>
                        </>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
