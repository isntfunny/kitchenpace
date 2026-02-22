'use client';

import { useState } from 'react';

import { css } from 'styled-system/css';

type SettingKey = 'ratingsPublic' | 'followsPublic' | 'favoritesPublic' | 'showInActivity';

const SETTING_COPY: Record<
    SettingKey,
    { title: string; description: string; labelOn: string; labelOff: string }
> = {
    showInActivity: {
        title: 'In Aktivitäts-Feed anzeigen',
        description:
            'Bestimme, ob deine Aktivitäten (z.B. Rezepte erstellt, gekocht, bewertet) im Community-Feed sichtbar sind.',
        labelOn: 'Aktivitäten sichtbar',
        labelOff: 'Aktivitäten verborgen',
    },
    ratingsPublic: {
        title: 'Bewertungen öffentlich',
        description:
            'Steuere, ob andere sehen dürfen, welche Rezepte du bewertet hast und welche Note du vergeben hast.',
        labelOn: 'Bewertungen sichtbar',
        labelOff: 'Bewertungen verborgen',
    },
    followsPublic: {
        title: 'Follower sichtbar',
        description:
            'Bestimme, ob dein Folgen-Feed öffentlich ist – also wer dir folgt und wem du folgst.',
        labelOn: 'Follower sichtbar',
        labelOff: 'Follower verborgen',
    },
    favoritesPublic: {
        title: 'Favoriten öffentlich',
        description:
            'Lege fest, ob deine gespeicherten Rezepte (Favoriten) für andere Nutzer*innen sichtbar sind.',
        labelOn: 'Favoriten sichtbar',
        labelOff: 'Favoriten verborgen',
    },
};

interface PrivacySettingsCardProps {
    profile: Record<SettingKey, boolean>;
}

export function PrivacySettingsCard({ profile }: PrivacySettingsCardProps) {
    const [settings, setSettings] = useState(profile);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const toggleSetting = (key: SettingKey) => {
        setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
        setStatus('idle');
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        setStatus('idle');

        try {
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });

            if (!response.ok) {
                throw new Error('Failed to update privacy settings');
            }

            setStatus('success');
        } catch (error) {
            console.error('Privacy settings update failed', error);
            setStatus('error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className={css({
                borderRadius: '3xl',
                padding: { base: '6', md: '8' },
                background: 'white',
                boxShadow: '0 30px 90px rgba(224,123,83,0.18)',
                border: '1px solid rgba(224,123,83,0.2)',
                fontFamily: 'body',
            })}
        >
            <div className={css({ mb: '6' })}>
                <p
                    className={css({
                        textTransform: 'uppercase',
                        letterSpacing: 'widest',
                        color: 'text-muted',
                        fontSize: 'sm',
                        mb: '2',
                    })}
                >
                    Privatsphäre
                </p>
                <h2 className={css({ fontSize: '2xl', fontWeight: '800', mb: '2' })}>
                    Sichtbarkeit deiner Aktivitäten
                </h2>
                <p className={css({ color: 'text-muted' })}>
                    Entscheide, welche Aktivitäten für andere KüchenTakt-Mitglieder sichtbar sein
                    sollen.
                </p>
            </div>

            <div className={css({ display: 'flex', flexDir: 'column', gap: '4' })}>
                {(Object.keys(SETTING_COPY) as SettingKey[]).map((key) => {
                    const copy = SETTING_COPY[key];
                    const isEnabled = settings[key];

                    return (
                        <div
                            key={key}
                            className={css({
                                padding: '4',
                                borderRadius: '2xl',
                                border: '1px solid rgba(224,123,83,0.25)',
                                background: 'surface.elevated',
                                display: 'flex',
                                flexDir: { base: 'column', md: 'row' },
                                gap: '4',
                                alignItems: 'stretch',
                            })}
                        >
                            <div className={css({ flex: 1 })}>
                                <p className={css({ fontWeight: '700', mb: '1' })}>{copy.title}</p>
                                <p className={css({ color: 'text-muted', fontSize: 'sm' })}>
                                    {copy.description}
                                </p>
                            </div>
                            <div
                                className={css({
                                    display: 'flex',
                                    flexDir: 'column',
                                    gap: '2',
                                    alignItems: { base: 'flex-start', md: 'flex-end' },
                                })}
                            >
                                <button
                                    type="button"
                                    onClick={() => toggleSetting(key)}
                                    aria-pressed={isEnabled}
                                    className={css({
                                        width: '64px',
                                        height: '32px',
                                        borderRadius: 'full',
                                        border: 'none',
                                        position: 'relative',
                                        background: isEnabled
                                            ? 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)'
                                            : '#f3f4f6',
                                        transition: 'background 150ms ease',
                                        cursor: 'pointer',
                                    })}
                                >
                                    <span
                                        className={css({
                                            position: 'absolute',
                                            top: '4px',
                                            left: isEnabled ? '34px' : '4px',
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: 'full',
                                            background: 'white',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                            transition: 'left 150ms ease',
                                        })}
                                    />
                                </button>
                                <span
                                    className={css({
                                        fontSize: 'xs',
                                        color: 'text-muted',
                                        fontWeight: '600',
                                    })}
                                >
                                    {isEnabled ? copy.labelOn : copy.labelOff}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div
                className={css({
                    display: 'flex',
                    flexDir: { base: 'column', md: 'row' },
                    gap: '4',
                    alignItems: { base: 'stretch', md: 'center' },
                    mt: '6',
                })}
            >
                <button
                    type="submit"
                    disabled={saving}
                    className={css({
                        borderRadius: 'full',
                        px: '6',
                        py: '3',
                        border: 'none',
                        background: 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
                        color: 'white',
                        fontWeight: '700',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        opacity: saving ? 0.75 : 1,
                        transition: 'transform 150ms ease',
                        _hover: { transform: saving ? 'none' : 'translateY(-1px)' },
                    })}
                >
                    {saving ? 'Speichern…' : 'Einstellungen speichern'}
                </button>

                {status === 'success' && (
                    <span className={css({ color: '#15803d', fontWeight: '600' })}>
                        Aktualisiert. Deine Privatsphäre ist up to date.
                    </span>
                )}

                {status === 'error' && (
                    <span className={css({ color: '#dc2626', fontWeight: '600' })}>
                        Speichern fehlgeschlagen. Bitte versuche es erneut.
                    </span>
                )}
            </div>
        </form>
    );
}
