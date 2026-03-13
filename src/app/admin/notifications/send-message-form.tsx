'use client';

import { AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { useState, useTransition } from 'react';

import { css } from 'styled-system/css';

import { sendSystemMessage, type SendSystemMessageInput } from './actions';

const TOAST_TYPES = [
    { value: 'success', label: 'Erfolg', color: '#00b894' },
    { value: 'info', label: 'Info', color: '#0984e3' },
    { value: 'warning', label: 'Warnung', color: '#f8b500' },
    { value: 'error', label: 'Fehler', color: '#e05353' },
] as const;

type UserOption = {
    id: string;
    label: string;
    email: string | null;
};

type SendMessageFormProps = {
    users: UserOption[];
};

export function SendMessageForm({ users }: SendMessageFormProps) {
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const [formData, setFormData] = useState<SendSystemMessageInput>({
        userId: '',
        title: '',
        message: '',
        sendToast: true,
        toastType: 'info',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setResult(null);

        startTransition(async () => {
            try {
                const res = await sendSystemMessage(formData);
                setResult({
                    success: true,
                    message: `Nachricht an "${res.userName}" gesendet`,
                });
                setFormData((prev) => ({
                    ...prev,
                    title: '',
                    message: '',
                }));
            } catch (error) {
                setResult({
                    success: false,
                    message: error instanceof Error ? error.message : 'Unbekannter Fehler',
                });
            }
        });
    };

    return (
        <form
            onSubmit={handleSubmit}
            className={css({
                display: 'flex',
                flexDirection: 'column',
                gap: '4',
            })}
        >
            <div
                className={css({
                    display: 'grid',
                    gap: '4',
                    gridTemplateColumns: { base: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                })}
            >
                <div className={css({ display: 'grid', gap: '2' })}>
                    <label
                        htmlFor="user"
                        className={css({
                            fontSize: 'sm',
                            fontWeight: '500',
                            color: 'foreground',
                        })}
                    >
                        Benutzer
                    </label>
                    <select
                        id="user"
                        value={formData.userId}
                        onChange={(e) =>
                            setFormData((prev) => ({ ...prev, userId: e.target.value }))
                        }
                        className={css({
                            width: '100%',
                            padding: '3',
                            borderRadius: 'xl',
                            borderWidth: '1px',
                            borderColor: 'border',
                            background: 'surface',
                            fontSize: 'sm',
                            color: 'foreground',
                            outline: 'none',
                            cursor: 'pointer',
                            _focus: {
                                borderColor: 'primary',
                                boxShadow: '0 0 0 3px rgba(224,123,83,0.15)',
                            },
                        })}
                        required
                    >
                        <option value="">Benutzer auswählen...</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={css({ display: 'grid', gap: '2' })}>
                    <label
                        htmlFor="toastType"
                        className={css({
                            fontSize: 'sm',
                            fontWeight: '500',
                            color: 'foreground',
                        })}
                    >
                        Toast-Typ
                    </label>
                    <select
                        id="toastType"
                        value={formData.toastType}
                        onChange={(e) =>
                            setFormData((prev) => ({
                                ...prev,
                                toastType: e.target.value as SendSystemMessageInput['toastType'],
                            }))
                        }
                        className={css({
                            width: '100%',
                            padding: '3',
                            borderRadius: 'xl',
                            borderWidth: '1px',
                            borderColor: 'border',
                            background: 'surface',
                            fontSize: 'sm',
                            color: 'foreground',
                            outline: 'none',
                            cursor: 'pointer',
                            _focus: {
                                borderColor: 'primary',
                                boxShadow: '0 0 0 3px rgba(224,123,83,0.15)',
                            },
                        })}
                    >
                        {TOAST_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className={css({ display: 'grid', gap: '2' })}>
                <label
                    htmlFor="title"
                    className={css({
                        fontSize: 'sm',
                        fontWeight: '500',
                        color: 'foreground',
                    })}
                >
                    Titel
                </label>
                <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="z.B. Wartungsarbeiten"
                    className={css({
                        width: '100%',
                        padding: '3',
                        borderRadius: 'xl',
                        borderWidth: '1px',
                        borderColor: 'border',
                        background: 'surface',
                        fontSize: 'sm',
                        color: 'foreground',
                        outline: 'none',
                        _focus: {
                            borderColor: 'primary',
                            boxShadow: '0 0 0 3px rgba(224,123,83,0.15)',
                        },
                        _placeholder: {
                            color: 'foreground.muted',
                        },
                    })}
                    required
                />
            </div>

            <div className={css({ display: 'grid', gap: '2' })}>
                <label
                    htmlFor="message"
                    className={css({
                        fontSize: 'sm',
                        fontWeight: '500',
                        color: 'foreground',
                    })}
                >
                    Nachricht
                </label>
                <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                    placeholder="Details zur Nachricht..."
                    rows={4}
                    className={css({
                        width: '100%',
                        padding: '3',
                        borderRadius: 'xl',
                        borderWidth: '1px',
                        borderColor: 'border',
                        background: 'surface',
                        fontSize: 'sm',
                        color: 'foreground',
                        resize: 'vertical',
                        outline: 'none',
                        _focus: {
                            borderColor: 'primary',
                            boxShadow: '0 0 0 3px rgba(224,123,83,0.15)',
                        },
                        _placeholder: {
                            color: 'foreground.muted',
                        },
                    })}
                />
            </div>

            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3',
                    padding: '3',
                    borderRadius: 'xl',
                    background: 'surface.elevated',
                })}
            >
                <label
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2.5',
                        cursor: 'pointer',
                    })}
                >
                    <input
                        type="checkbox"
                        checked={formData.sendToast}
                        onChange={(e) =>
                            setFormData((prev) => ({
                                ...prev,
                                sendToast: e.target.checked,
                            }))
                        }
                        className={css({
                            width: '18px',
                            height: '18px',
                            accentColor: 'primary',
                        })}
                    />
                    <span
                        className={css({
                            fontSize: 'sm',
                            color: 'foreground',
                        })}
                    >
                        Auch als Toast anzeigen (Echtzeit)
                    </span>
                </label>
            </div>

            {result && (
                <div
                    className={css({
                        padding: '3',
                        borderRadius: 'xl',
                        background: result.success
                            ? 'rgba(0,184,148,0.08)'
                            : 'rgba(224,83,83,0.08)',
                        border: '1px solid',
                        borderColor: result.success ? 'rgba(0,184,148,0.2)' : 'rgba(224,83,83,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2',
                    })}
                >
                    {result.success ? (
                        <CheckCircle2 size={18} color="#00b894" />
                    ) : (
                        <AlertCircle size={18} color="#e05353" />
                    )}
                    <span
                        className={css({
                            fontSize: 'sm',
                            color: result.success ? 'green.600' : 'red.600',
                        })}
                    >
                        {result.message}
                    </span>
                </div>
            )}

            <button
                type="submit"
                disabled={isPending || !formData.userId || !formData.title.trim()}
                className={css({
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2',
                    paddingX: '5',
                    paddingY: '3',
                    borderRadius: 'full',
                    border: 'none',
                    fontSize: 'sm',
                    fontWeight: '600',
                    color: 'white',
                    background: 'linear-gradient(135deg, rgba(224,123,83,1), rgba(248,181,0,1))',
                    cursor: isPending ? 'wait' : 'pointer',
                    opacity: isPending || !formData.userId || !formData.title.trim() ? 0.6 : 1,
                    transition: 'all 150ms ease',
                    _hover: {
                        opacity: 0.9,
                        transform: 'translateY(-1px)',
                    },
                })}
            >
                <Send size={16} />
                {isPending ? 'Wird gesendet...' : 'SYSTEM-Nachricht senden'}
            </button>
        </form>
    );
}
