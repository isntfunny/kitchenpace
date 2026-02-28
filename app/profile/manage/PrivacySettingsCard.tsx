'use client';

import { Eye, Save } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { Heading, Text } from '@/components/atoms/Typography';
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
                            bg: 'primary',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                        })}
                    >
                        <Eye size={20} />
                    </div>
                    <Heading as="h2" size="lg">
                        Privatsphäre
                    </Heading>
                </div>
                <Text color="muted" size="sm">
                    Entscheide, welche Aktivitäten für andere KüchenTakt-Mitglieder sichtbar sein
                    sollen.
                </Text>
            </div>

            <div className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
                {(Object.keys(SETTING_COPY) as SettingKey[]).map((key) => {
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
                    {saving ? 'Speichern...' : 'Einstellungen speichern'}
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
