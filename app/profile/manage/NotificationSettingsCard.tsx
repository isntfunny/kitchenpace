'use client';

import { Bell, Save } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { Heading, Text } from '@/components/atoms/Typography';
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
                p: { base: '4', md: '5' },
                borderRadius: '2xl',
                bg: 'surface',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            })}
        >
            <div className={css({ mb: '5' })}>
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3',
                        mb: '3',
                    })}
                >
                    <div
                        className={css({
                            w: '10',
                            h: '10',
                            borderRadius: 'lg',
                            bg: 'accent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'text',
                        })}
                    >
                        <Bell size={20} />
                    </div>
                    <Heading as="h2" size="lg">
                        Benachrichtigungen
                    </Heading>
                </div>
                <Text color="muted" size="sm">
                    Wähle, welche Benachrichtigungen dir als Push, Browser oder in der App angezeigt
                    werden sollen.
                </Text>
            </div>

            <div className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
                {(Object.keys(SETTING_COPY) as NotificationSettingKey[]).map((key) => {
                    const copy = SETTING_COPY[key];
                    const isEnabled = settings[key];
                    return (
                        <div
                            key={key}
                            className={css({
                                p: '4',
                                borderRadius: 'xl',
                                border: '1px solid',
                                borderColor: 'border',
                                bg: 'background',
                                display: 'flex',
                                flexDir: { base: 'column', sm: 'row' },
                                gap: '4',
                                alignItems: { base: 'flex-start', sm: 'center' },
                                justifyContent: 'space-between',
                            })}
                        >
                            <div className={css({ flex: 1 })}>
                                <Text className={css({ fontWeight: '600', mb: '1' })}>
                                    {copy.title}
                                </Text>
                                <Text size="sm" color="muted">
                                    {copy.description}
                                </Text>
                            </div>
                            <button
                                type="button"
                                onClick={() => toggleSetting(key)}
                                aria-pressed={isEnabled}
                                className={css({
                                    width: '56px',
                                    height: '28px',
                                    borderRadius: 'full',
                                    border: 'none',
                                    position: 'relative',
                                    flexShrink: 0,
                                    background: isEnabled ? 'primary' : 'border',
                                    transition: 'background 150ms ease',
                                    cursor: 'pointer',
                                })}
                            >
                                <span
                                    className={css({
                                        position: 'absolute',
                                        top: '3px',
                                        left: isEnabled ? '30px' : '3px',
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: 'full',
                                        background: 'white',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                        transition: 'left 150ms ease',
                                    })}
                                />
                            </button>
                        </div>
                    );
                })}
            </div>

            <div
                className={css({
                    display: 'flex',
                    flexDir: { base: 'column', sm: 'row' },
                    gap: '3',
                    alignItems: { base: 'stretch', sm: 'center' },
                    mt: '5',
                })}
            >
                <Button type="submit" variant="primary" disabled={saving}>
                    <Save size={18} />
                    {saving ? 'Speichern...' : 'Benachrichtigungen speichern'}
                </Button>

                {status === 'success' && (
                    <Text size="sm" color="muted">
                        Erfolgreich aktualisiert!
                    </Text>
                )}

                {status === 'error' && (
                    <Text size="sm" className={css({ color: 'red.600' })}>
                        Fehler beim Speichern. Bitte erneut versuchen.
                    </Text>
                )}
            </div>
        </form>
    );
}
