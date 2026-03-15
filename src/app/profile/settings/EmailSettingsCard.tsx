'use client';

import { Check, Mail, Save } from 'lucide-react';
import { Checkbox } from 'radix-ui';
import { useState } from 'react';

import { Button } from '@app/components/atoms/Button';
import { Heading, Text } from '@app/components/atoms/Typography';
import { useBeforeUnload } from '@app/lib/hooks/useBeforeUnload';

import { css } from 'styled-system/css';

interface CheckboxItemProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

function CheckboxItem({ label, checked, onChange }: CheckboxItemProps) {
    return (
        <label
            className={css({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: '3',
                borderRadius: 'xl',
                border: '1px solid',
                borderColor: 'border',
                bg: 'background',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                _hover: {
                    borderColor: 'primary',
                },
            })}
        >
            <Text size="sm" className={css({ fontWeight: '500' })}>
                {label}
            </Text>
            <Checkbox.Root
                checked={checked}
                onCheckedChange={(val) => onChange(val === true)}
                className={css({
                    width: '20px',
                    height: '20px',
                    bg: 'background',
                    borderRadius: '6px',
                    border: '2px solid',
                    borderColor: 'border',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    _hover: {
                        borderColor: 'primary',
                    },
                    '&[data-state="checked"]': {
                        bg: 'primary',
                        borderColor: 'primary',
                    },
                })}
            >
                <Checkbox.Indicator>
                    <Check color="white" size={14} />
                </Checkbox.Indicator>
            </Checkbox.Root>
        </label>
    );
}

interface EmailSettingsCardProps {
    profile: {
        notifyOnRecipePublished: boolean;
        notifyOnNewsletter: boolean;
        notifyOnWeeklyPlanReminder: boolean;
    };
}

export function EmailSettingsCard({ profile }: EmailSettingsCardProps) {
    const [settings, setSettings] = useState(profile);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [isDirty, setIsDirty] = useState(false);

    useBeforeUnload(isDirty);

    const toggle = (key: keyof typeof settings) => {
        setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
        setStatus('idle');
        setIsDirty(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setStatus('idle');
        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (!res.ok) throw new Error('Failed');
            setStatus('success');
            setIsDirty(false);
        } catch {
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
                boxShadow: 'shadow.medium',
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
                            bg: 'palette.purple',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                        })}
                    >
                        <Mail size={20} />
                    </div>
                    <Heading as="h2" size="lg">
                        E-Mail-Einstellungen
                    </Heading>
                </div>
                <Text color="muted" size="sm">
                    Wähle, welche Benachrichtigungen du per E-Mail erhalten möchtest.
                </Text>
            </div>

            <div
                className={css({
                    display: 'flex',
                    flexDir: 'column',
                    gap: '2',
                    mb: '4',
                })}
            >
                <CheckboxItem
                    label="Neue Rezepte von Köchen, denen du folgst"
                    checked={settings.notifyOnRecipePublished}
                    onChange={() => toggle('notifyOnRecipePublished')}
                />
                <CheckboxItem
                    label="Wöchentlicher Koch-Newsletter"
                    checked={settings.notifyOnNewsletter}
                    onChange={() => toggle('notifyOnNewsletter')}
                />
                <CheckboxItem
                    label="Erinnerungen an geplante Mahlzeiten"
                    checked={settings.notifyOnWeeklyPlanReminder}
                    onChange={() => toggle('notifyOnWeeklyPlanReminder')}
                />
            </div>

            <div className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
                <Button type="submit" variant="primary" disabled={saving}>
                    <Save size={16} />
                    {saving ? 'Speichern...' : isDirty ? 'Änderungen speichern ●' : 'Speichern'}
                </Button>
                {status === 'success' && (
                    <span className={css({ fontSize: 'sm', color: 'palette.emerald' })}>
                        Gespeichert ✓
                    </span>
                )}
                {status === 'error' && (
                    <span className={css({ fontSize: 'sm', color: 'red.500' })}>
                        Fehler beim Speichern
                    </span>
                )}
            </div>
        </form>
    );
}
