'use client';

import {
    AlertCircle,
    CheckCircle2,
    Megaphone,
    Send,
    Shield,
    ShieldCheck,
    User,
    Users,
} from 'lucide-react';
import { useCallback, useState, useTransition } from 'react';

import { SearchableSelect } from '@app/components/ui/SearchableSelect';
import { searchUsers } from '@app/lib/admin/search-users';
import { getThumbnailUrl } from '@app/lib/thumbnail-client';
import { css } from 'styled-system/css';

import type { RoleStats, SendMessageInput, TargetRole } from './actions';
import { sendMessage } from './actions';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOAST_TYPES = [
    { value: 'success', label: 'Erfolg', color: '#00b894', icon: '✓' },
    { value: 'info', label: 'Info', color: '#0984e3', icon: 'i' },
    { value: 'warning', label: 'Warnung', color: '#f8b500', icon: '!' },
    { value: 'error', label: 'Fehler', color: '#e05353', icon: '✕' },
] as const;

const ROLE_TARGETS: {
    value: TargetRole;
    label: string;
    desc: string;
    icon: typeof Users;
    color: string;
}[] = [
    {
        value: 'ALL',
        label: 'Alle Benutzer',
        desc: 'Alle nicht gesperrten Konten',
        icon: Users,
        color: '#0984e3',
    },
    {
        value: 'user',
        label: 'Benutzer',
        desc: 'Nur normale Benutzer',
        icon: User,
        color: '#636e72',
    },
    {
        value: 'moderator',
        label: 'Moderatoren',
        desc: 'Nur Moderatoren',
        icon: Shield,
        color: '#a855f7',
    },
    {
        value: 'admin',
        label: 'Administratoren',
        desc: 'Nur Admins',
        icon: ShieldCheck,
        color: '#0984e3',
    },
];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const fieldLabelStyle = css({
    fontSize: 'sm',
    fontWeight: '500',
    color: 'foreground',
});

const inputStyle = css({
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
    _placeholder: { color: 'foreground.muted' },
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type SendMessageFormProps = {
    roleStats: RoleStats;
};

export function SendMessageForm({ roleStats }: SendMessageFormProps) {
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<{
        success: boolean;
        message: string;
    } | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [selectedUserLabel, setSelectedUserLabel] = useState('');

    const handleSearchUsers = useCallback(
        (query: string) =>
            searchUsers(query) as Promise<
                {
                    id: string;
                    name?: string;
                    avatar?: string | null;
                    recipeCount?: number;
                }[]
            >,
        [],
    );

    const [formData, setFormData] = useState<SendMessageInput>({
        recipientMode: 'user',
        userId: '',
        targetRole: 'ALL',
        title: '',
        message: '',
        sendToast: true,
        toastType: 'info',
    });

    const recipientCount =
        formData.recipientMode === 'role'
            ? formData.targetRole === 'ALL'
                ? roleStats.total
                : formData.targetRole === 'moderator'
                  ? roleStats.moderators
                  : formData.targetRole === 'admin'
                    ? roleStats.admins
                    : roleStats.users
            : 1;

    const canSubmit =
        formData.title.trim() && (formData.recipientMode === 'user' ? !!formData.userId : true);

    const doSend = () => {
        setResult(null);
        setShowConfirm(false);

        startTransition(async () => {
            try {
                const res = await sendMessage(formData);
                setResult({
                    success: true,
                    message:
                        res.recipientCount === 1
                            ? `Nachricht an "${res.recipientLabel}" gesendet`
                            : `Nachricht an ${res.recipientCount} Empfänger gesendet (${res.recipientLabel})`,
                });
                setFormData((prev) => ({ ...prev, title: '', message: '' }));
            } catch (error) {
                setResult({
                    success: false,
                    message: error instanceof Error ? error.message : 'Unbekannter Fehler',
                });
            }
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        // Require confirmation for broadcasts
        if (formData.recipientMode === 'role' && recipientCount > 1) {
            setShowConfirm(true);
            return;
        }

        doSend();
    };

    return (
        <form
            onSubmit={handleSubmit}
            className={css({ display: 'flex', flexDirection: 'column', gap: '5' })}
        >
            {/* ── Recipient mode toggle ── */}
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
                <span className={fieldLabelStyle}>Empfänger</span>
                <div
                    className={css({
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '2',
                    })}
                >
                    <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, recipientMode: 'user' }))}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2',
                            padding: '3',
                            borderRadius: 'xl',
                            border: '1px solid',
                            borderColor: formData.recipientMode === 'user' ? 'primary' : 'border',
                            background:
                                formData.recipientMode === 'user'
                                    ? 'rgba(224,123,83,0.08)'
                                    : 'surface',
                            color:
                                formData.recipientMode === 'user' ? 'primary' : 'foreground.muted',
                            fontWeight: '600',
                            fontSize: 'sm',
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                        })}
                    >
                        <User size={16} />
                        Einzelner Benutzer
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, recipientMode: 'role' }))}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2',
                            padding: '3',
                            borderRadius: 'xl',
                            border: '1px solid',
                            borderColor: formData.recipientMode === 'role' ? 'primary' : 'border',
                            background:
                                formData.recipientMode === 'role'
                                    ? 'rgba(224,123,83,0.08)'
                                    : 'surface',
                            color:
                                formData.recipientMode === 'role' ? 'primary' : 'foreground.muted',
                            fontWeight: '600',
                            fontSize: 'sm',
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                        })}
                    >
                        <Megaphone size={16} />
                        Benutzergruppe
                    </button>
                </div>
            </div>

            {/* ── Single user selector ── */}
            {formData.recipientMode === 'user' && (
                <div className={css({ display: 'grid', gap: '2' })}>
                    <span className={fieldLabelStyle}>Benutzer suchen</span>
                    <SearchableSelect
                        valueId={formData.userId ?? ''}
                        valueLabel={selectedUserLabel}
                        onSelect={(id, label) => {
                            setFormData((p) => ({ ...p, userId: id }));
                            setSelectedUserLabel(label);
                        }}
                        searchFn={handleSearchUsers}
                        placeholder="Name eingeben..."
                        renderOption={(item) => {
                            const name = String(item.name || '');
                            const role = (item as { role?: string }).role;
                            const photoKey = (item as { photoKey?: string | null }).photoKey;
                            const avatar = item.avatar as string | null | undefined;
                            return {
                                label: name,
                                sublabel: role && role !== 'user' ? role : undefined,
                                avatar: photoKey
                                    ? getThumbnailUrl(photoKey, '1:1', 72)
                                    : (avatar ?? undefined),
                            };
                        }}
                        emptyMessage="Kein Benutzer gefunden"
                    />
                </div>
            )}

            {/* ── Role group selector ── */}
            {formData.recipientMode === 'role' && (
                <div className={css({ display: 'grid', gap: '2' })}>
                    <span className={fieldLabelStyle}>Zielgruppe</span>
                    <div
                        className={css({
                            display: 'grid',
                            gridTemplateColumns: {
                                base: '1fr 1fr',
                                md: 'repeat(4, 1fr)',
                            },
                            gap: '2',
                        })}
                    >
                        {ROLE_TARGETS.map((role) => {
                            const Icon = role.icon;
                            const isActive = formData.targetRole === role.value;
                            const count =
                                role.value === 'ALL'
                                    ? roleStats.total
                                    : role.value === 'moderator'
                                      ? roleStats.moderators
                                      : role.value === 'admin'
                                        ? roleStats.admins
                                        : roleStats.users;

                            return (
                                <button
                                    key={role.value}
                                    type="button"
                                    onClick={() =>
                                        setFormData((p) => ({
                                            ...p,
                                            targetRole: role.value,
                                        }))
                                    }
                                    className={css({
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '1.5',
                                        padding: '3',
                                        borderRadius: 'xl',
                                        border: '1px solid',
                                        borderColor: isActive ? 'primary' : 'border',
                                        background: isActive ? 'rgba(224,123,83,0.08)' : 'surface',
                                        cursor: 'pointer',
                                        transition: 'all 150ms ease',
                                        _hover: {
                                            borderColor: isActive ? 'primary' : 'border.muted',
                                        },
                                    })}
                                >
                                    <Icon
                                        size={20}
                                        style={{
                                            color: isActive ? role.color : undefined,
                                        }}
                                        className={css({
                                            color: isActive ? undefined : 'foreground.muted',
                                        })}
                                    />
                                    <span
                                        className={css({
                                            fontSize: 'xs',
                                            fontWeight: '600',
                                            color: isActive ? 'foreground' : 'foreground.muted',
                                        })}
                                    >
                                        {role.label}
                                    </span>
                                    <span
                                        className={css({
                                            fontSize: 'xs',
                                            fontWeight: '700',
                                            fontFamily: 'mono',
                                            color: isActive ? 'primary' : 'foreground.muted',
                                        })}
                                    >
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Title ── */}
            <div className={css({ display: 'grid', gap: '2' })}>
                <label htmlFor="title" className={fieldLabelStyle}>
                    Titel
                </label>
                <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                    placeholder="z.B. Wartungsarbeiten, Neue Funktion, Willkommen"
                    className={inputStyle}
                    required
                    maxLength={120}
                />
            </div>

            {/* ── Message ── */}
            <div className={css({ display: 'grid', gap: '2' })}>
                <label htmlFor="message" className={fieldLabelStyle}>
                    Nachricht{' '}
                    <span className={css({ color: 'foreground.muted', fontWeight: '400' })}>
                        (optional)
                    </span>
                </label>
                <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                    placeholder="Details zur Nachricht..."
                    rows={3}
                    className={`${inputStyle} ${css({ resize: 'vertical' })}`}
                    maxLength={500}
                />
                {formData.message.length > 0 && (
                    <span
                        className={css({
                            fontSize: 'xs',
                            color: 'foreground.muted',
                            textAlign: 'right',
                        })}
                    >
                        {formData.message.length}/500
                    </span>
                )}
            </div>

            {/* ── Toast options ── */}
            <div
                className={css({
                    padding: '4',
                    borderRadius: 'xl',
                    background: 'surface',
                    border: '1px solid',
                    borderColor: 'border.muted',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3',
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
                            setFormData((p) => ({
                                ...p,
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
                        className={css({ fontSize: 'sm', fontWeight: '600', color: 'foreground' })}
                    >
                        Auch als Toast-Popup anzeigen
                    </span>
                </label>

                {formData.sendToast && (
                    <div
                        className={css({
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '2',
                        })}
                    >
                        {TOAST_TYPES.map((t) => {
                            const isActive = formData.toastType === t.value;
                            return (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() =>
                                        setFormData((p) => ({
                                            ...p,
                                            toastType: t.value,
                                        }))
                                    }
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '2',
                                        padding: '2',
                                        borderRadius: 'lg',
                                        border: '1px solid',
                                        borderColor: isActive ? 'border' : 'transparent',
                                        background: isActive ? 'surface.elevated' : 'transparent',
                                        fontSize: 'xs',
                                        fontWeight: isActive ? '700' : '500',
                                        cursor: 'pointer',
                                        transition: 'all 100ms ease',
                                        color: isActive ? 'foreground' : 'foreground.muted',
                                    })}
                                >
                                    <span
                                        className={css({
                                            width: '10px',
                                            height: '10px',
                                            borderRadius: 'full',
                                            flexShrink: 0,
                                        })}
                                        style={{ background: t.color }}
                                    />
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Confirmation dialog for broadcasts ── */}
            {showConfirm && (
                <div
                    className={css({
                        padding: '4',
                        borderRadius: 'xl',
                        background: 'rgba(248,181,0,0.08)',
                        border: '1px solid rgba(248,181,0,0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3',
                    })}
                >
                    <p className={css({ fontSize: 'sm', fontWeight: '600', color: 'foreground' })}>
                        Nachricht an {recipientCount} Empfänger senden?
                    </p>
                    <p className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                        &bdquo;{formData.title}&ldquo; wird an alle{' '}
                        {ROLE_TARGETS.find((r) => r.value === formData.targetRole)?.label ??
                            'Benutzer'}{' '}
                        gesendet. Diese Aktion kann nicht rückgängig gemacht werden.
                    </p>
                    <div className={css({ display: 'flex', gap: '2' })}>
                        <button
                            type="button"
                            onClick={doSend}
                            disabled={isPending}
                            className={css({
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2',
                                paddingX: '4',
                                paddingY: '2.5',
                                borderRadius: 'full',
                                border: 'none',
                                fontSize: 'sm',
                                fontWeight: '700',
                                color: 'white',
                                background:
                                    'linear-gradient(135deg, rgba(224,123,83,1), rgba(248,181,0,1))',
                                cursor: isPending ? 'wait' : 'pointer',
                                opacity: isPending ? 0.6 : 1,
                                transition: 'all 150ms ease',
                                _hover: { opacity: 0.9 },
                            })}
                        >
                            <Send size={14} />
                            {isPending ? 'Wird gesendet...' : 'Ja, jetzt senden'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowConfirm(false)}
                            className={css({
                                paddingX: '4',
                                paddingY: '2.5',
                                borderRadius: 'full',
                                border: '1px solid',
                                borderColor: 'border',
                                background: 'surface',
                                fontSize: 'sm',
                                fontWeight: '600',
                                color: 'foreground.muted',
                                cursor: 'pointer',
                                transition: 'all 150ms ease',
                                _hover: { borderColor: 'foreground.muted' },
                            })}
                        >
                            Abbrechen
                        </button>
                    </div>
                </div>
            )}

            {/* ── Result ── */}
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

            {/* ── Submit ── */}
            {!showConfirm && (
                <button
                    type="submit"
                    disabled={isPending || !canSubmit}
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
                        background:
                            'linear-gradient(135deg, rgba(224,123,83,1), rgba(248,181,0,1))',
                        cursor: isPending || !canSubmit ? 'not-allowed' : 'pointer',
                        opacity: isPending || !canSubmit ? 0.6 : 1,
                        transition: 'all 150ms ease',
                        _hover: {
                            opacity: isPending || !canSubmit ? 0.6 : 0.9,
                            transform: isPending || !canSubmit ? 'none' : 'translateY(-1px)',
                        },
                    })}
                >
                    <Send size={16} />
                    {isPending
                        ? 'Wird gesendet...'
                        : formData.recipientMode === 'role'
                          ? `An ${recipientCount} Empfänger senden`
                          : 'Nachricht senden'}
                </button>
            )}
        </form>
    );
}
