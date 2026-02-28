'use client';

import { useState } from 'react';

import { css } from 'styled-system/css';

type NotificationSettingKey =
    | 'notifyOnAnonymous'
    | 'notifyOnNewFollower'
    | 'notifyOnRecipeLike'
    | 'notifyOnRecipeComment'
    | 'notifyOnRecipeRating'
    | 'notifyOnRecipeCooked'
    | 'notifyOnRecipePublished'
    | 'notifyOnWeeklyPlanReminder'
    | 'notifyOnSystemMessages';

const SETTING_COPY: Record<
    NotificationSettingKey,
    { title: string; description: string; labelOn: string; labelOff: string }
> = {
    notifyOnAnonymous: {
        title: 'Anonyme Aktivitäten zulassen',
        description:
            'Erlaube, dass deine Aktionen auch in anonymisierter Form Benachrichtigungen auslösen.',
        labelOn: 'Anonyme Benachrichtigungen aktiv',
        labelOff: 'Nur echte Namen',
    },
    notifyOnNewFollower: {
        title: 'Neue Follower',
        description: 'Erhalte eine Übersicht, wenn dir jemand folgt.',
        labelOn: 'Follower melden',
        labelOff: 'Follower stumm',
    },
    notifyOnRecipeLike: {
        title: 'Gespeicherte Rezepte',
        description: 'Wir zeigen dir automatisch, wenn eine Person dein Rezept speichert.',
        labelOn: 'Liebesbekundungen erlauben',
        labelOff: 'Nur kritische Updates',
    },
    notifyOnRecipeComment: {
        title: 'Kommentare',
        description: 'Du wirst benachrichtigt, sobald jemand dein Rezept kommentiert.',
        labelOn: 'Kommentare melden',
        labelOff: 'Kommentare ignorieren',
    },
    notifyOnRecipeRating: {
        title: 'Bewertungen',
        description: 'Jeder neue Stern auf deinem Rezept wird dir angezeigt.',
        labelOn: 'Bewertungen verfolgen',
        labelOff: 'Nur Durchschnittswerte',
    },
    notifyOnRecipeCooked: {
        title: 'Rezept gekocht',
        description: 'Wenn jemand dein Rezept ausprobiert und teilt, bekommst du Bescheid.',
        labelOn: 'Kochgeschichten empfangen',
        labelOff: 'Nur kritische Meldungen',
    },
    notifyOnRecipePublished: {
        title: 'Neue Rezepte von dir',
        description: 'Erhalte eine Bestätigung, wenn du ein Rezept veröffentlichst.',
        labelOn: 'Veröffentlichungen melden',
        labelOff: 'Stille Bestätigung',
    },
    notifyOnWeeklyPlanReminder: {
        title: 'Wochenplan-Erinnerung',
        description: 'Erhalte Tipps zu deinem Wochenplan und Erinnerungen bevor es losgeht.',
        labelOn: 'Planerinnerungen aktiv',
        labelOff: 'Nur manuell informieren',
    },
    notifyOnSystemMessages: {
        title: 'Systemmeldungen',
        description: 'Wichtige Hinweise von KüchenTakt (Wartung, Updates) kommen hier rein.',
        labelOn: 'Systemmeldungen annehmen',
        labelOff: 'Nur kritische Mails',
    },
};

interface NotificationSettingsCardProps {
    profile: Record<NotificationSettingKey, boolean>;
}

export function NotificationSettingsCard({ profile }: NotificationSettingsCardProps) {
    const [settings, setSettings] = useState(profile);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const toggleSetting = (key: NotificationSettingKey) => {
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
                throw new Error('Failed to update notification settings');
            }

            setStatus('success');
        } catch (error) {
            console.error('Notification settings update failed', error);
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
                    Benachrichtigungen
                </p>
                <h2 className={css({ fontSize: '2xl', fontWeight: '800', mb: '2' })}>
                    Nachrichten- und Reminder-Einstellungen
                </h2>
                <p className={css({ color: 'text-muted' })}>
                    Wähle, welche Benachrichtigungen dir als Push, Browser oder in der App angezeigt
                    werden sollen.
                </p>
            </div>

            <div className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
                {(Object.keys(SETTING_COPY) as NotificationSettingKey[]).map((key) => {
                    const copy = SETTING_COPY[key];
                    const isEnabled = settings[key];
                    return (
                        <div
                            key={key}
                            className={css({
                                padding: '4',
                                borderRadius: '2xl',
                                border: '1px solid rgba(224,123,83,0.25)',
                                background: 'surfaceElevated',
                                display: 'flex',
                                flexDirection: { base: 'column', md: 'row' },
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
                                    flexDirection: 'column',
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
                    flexDirection: { base: 'column', md: 'row' },
                    gap: '4',
                    alignItems: { base: 'stretch', md: 'center' },
                    marginTop: '6',
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
                        opacity: saving ? 0.7 : 1,
                        transition: 'transform 150ms ease',
                        _hover: { transform: saving ? 'none' : 'translateY(-1px)' },
                    })}
                >
                    {saving ? 'Speichern…' : 'Benachrichtigungen speichern'}
                </button>

                {status === 'success' && (
                    <span className={css({ color: '#15803d', fontWeight: '600' })}>
                        Aktualisiert. Dein Feed bleibt dabei wie gewünscht.
                    </span>
                )}

                {status === 'error' && (
                    <span className={css({ color: '#dc2626', fontWeight: '600' })}>
                        Speichern fehlgeschlagen. Bitte versuche es später.
                    </span>
                )}
            </div>
        </form>
    );
}
