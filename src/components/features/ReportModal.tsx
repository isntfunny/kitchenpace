'use client';

import { Flag, X } from 'lucide-react';
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
    contentType: string; // "recipe" | "comment" | "user"
    contentId: string;
    trigger: React.ReactNode;
}

export function ReportModal({ contentType, contentId, trigger }: ReportModalProps) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [result, setResult] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const handleSubmit = () => {
        if (!reason) return;
        startTransition(async () => {
            const res = await submitReport(contentType, contentId, reason, description);
            setResult(res.message);
            setTimeout(() => setOpen(false), 2000);
        });
    };

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
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
                            <Flag size={18} className={css({ color: '#dc2626' })} />
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
                        <p className={css({ color: '#16a34a', fontSize: 'sm', fontWeight: '600' })}>
                            {result}
                        </p>
                    ) : (
                        <>
                            <p className={css({ fontSize: 'sm', color: 'text.muted', mb: '3' })}>
                                Warum möchtest du diesen Inhalt melden?
                            </p>

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
                                            borderColor: reason === r.value ? '#e07b53' : 'rgba(0,0,0,0.08)',
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
                                            className={css({ accentColor: '#e07b53' })}
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
                                        borderColor: '#e07b53',
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
                                    onClick={handleSubmit}
                                    disabled={!reason || pending}
                                    className={css({
                                        px: '4',
                                        py: '2',
                                        borderRadius: 'xl',
                                        fontSize: 'sm',
                                        fontWeight: '600',
                                        bg: '#dc2626',
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
