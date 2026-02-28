'use client';

import { ArrowLeft, Camera, Save, User } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { Heading, Text } from '@/components/atoms/Typography';
import { FileUpload } from '@/components/features/FileUpload';
import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

const MAX_NICKNAME_LENGTH = 32;
const MAX_TEASER_LENGTH = 160;

const clamp = (value: string | null, maxLength: number) => {
    if (!value) {
        return null;
    }
    return value.slice(0, maxLength);
};

interface ProfileData {
    id: string;
    userId: string;
    email: string;
    nickname: string | null;
    teaser: string | null;
    photoUrl: string | null;
}

interface ProfileEditClientProps {
    profile: ProfileData;
}

export function ProfileEditClient({ profile }: ProfileEditClientProps) {
    const [photoUrl, setPhotoUrl] = useState(profile.photoUrl || '');
    const [nickname, setNickname] = useState(profile.nickname || '');
    const [teaser, setTeaser] = useState(profile.teaser || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nickname: clamp(nickname, MAX_NICKNAME_LENGTH),
                    teaser: clamp(teaser, MAX_TEASER_LENGTH),
                    photoUrl: clamp(photoUrl, 2048),
                }),
            });

            if (response.ok) {
                window.location.href = '/profile';
            } else {
                setError('Fehler beim Speichern. Bitte versuche es erneut.');
            }
        } catch (err) {
            console.error('Error saving profile:', err);
            setError('Fehler beim Speichern. Bitte versuche es erneut.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <section
            className={css({
                py: { base: '4', md: '6' },
            })}
        >
            {/* Back Link */}
            <Link
                href="/profile"
                className={css({
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2',
                    color: 'text-muted',
                    textDecoration: 'none',
                    mb: '4',
                    transition: 'color 150ms ease',
                    _hover: { color: 'text' },
                })}
            >
                <ArrowLeft size={18} />
                <Text size="sm">Zurück zum Profil</Text>
            </Link>

            <div
                className={grid({
                    columns: { base: 1, lg: 12 },
                    gap: '4',
                })}
            >
                {/* Main Form */}
                <div className={css({ lg: { gridColumn: 'span 8' } })}>
                    <div
                        className={css({
                            p: { base: '4', md: '6' },
                            borderRadius: '2xl',
                            bg: 'surface',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                        })}
                    >
                        <div className={css({ mb: '6' })}>
                            <div
                                className={css({
                                    w: '12',
                                    h: '12',
                                    borderRadius: 'xl',
                                    bg: 'primary',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    mb: '4',
                                })}
                            >
                                <User size={24} />
                            </div>
                            <Heading as="h1" size="xl" className={css({ mb: '2' })}>
                                Profil bearbeiten
                            </Heading>
                            <Text color="muted">
                                Teile deine Persönlichkeit mit der KüchenTakt Community.
                            </Text>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className={css({ display: 'flex', flexDir: 'column', gap: '6' })}
                        >
                            {error && (
                                <div
                                    className={css({
                                        p: '3',
                                        bg: 'red.50',
                                        color: 'red.600',
                                        borderRadius: 'lg',
                                        border: '1px solid',
                                        borderColor: 'red.200',
                                    })}
                                >
                                    <Text size="sm">{error}</Text>
                                </div>
                            )}

                            {/* Profile Photo */}
                            <div>
                                <label
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2',
                                        fontWeight: '600',
                                        mb: '3',
                                    })}
                                >
                                    <Camera size={18} />
                                    Profilfoto
                                </label>
                                <FileUpload
                                    type="profile"
                                    value={photoUrl}
                                    onChange={setPhotoUrl}
                                />
                            </div>

                            {/* Nickname */}
                            <label
                                className={css({ display: 'flex', flexDir: 'column', gap: '2' })}
                            >
                                <span className={css({ fontWeight: '600' })}>Nickname</span>
                                <input
                                    type="text"
                                    name="nickname"
                                    maxLength={32}
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    placeholder="Dein öffentlicher Name"
                                    className={css({
                                        borderRadius: 'xl',
                                        border: '1px solid',
                                        borderColor: 'border',
                                        p: '3',
                                        fontSize: 'md',
                                        outline: 'none',
                                        bg: 'background',
                                        transition: 'all 150ms ease',
                                        _focus: {
                                            borderColor: 'primary',
                                            boxShadow: '0 0 0 3px rgba(224,123,83,0.15)',
                                        },
                                    })}
                                    required
                                />
                                <Text size="sm" color="muted">
                                    Maximal {MAX_NICKNAME_LENGTH} Zeichen
                                </Text>
                            </label>

                            {/* Teaser */}
                            <label
                                className={css({ display: 'flex', flexDir: 'column', gap: '2' })}
                            >
                                <span className={css({ fontWeight: '600' })}>Teaser Text</span>
                                <textarea
                                    name="teaser"
                                    maxLength={160}
                                    value={teaser}
                                    onChange={(e) => setTeaser(e.target.value)}
                                    placeholder="Beschreibe deine Koch-DNA in wenigen Worten"
                                    className={css({
                                        borderRadius: 'xl',
                                        border: '1px solid',
                                        borderColor: 'border',
                                        p: '3',
                                        minH: '28',
                                        fontSize: 'md',
                                        resize: 'vertical',
                                        outline: 'none',
                                        bg: 'background',
                                        transition: 'all 150ms ease',
                                        _focus: {
                                            borderColor: 'primary',
                                            boxShadow: '0 0 0 3px rgba(224,123,83,0.15)',
                                        },
                                    })}
                                />
                                <Text size="sm" color="muted">
                                    Maximal {MAX_TEASER_LENGTH} Zeichen
                                </Text>
                            </label>

                            <div className={css({ display: 'flex', gap: '3', mt: '2' })}>
                                <Button type="submit" variant="primary" disabled={saving}>
                                    <Save size={18} />
                                    {saving ? 'Speichern...' : 'Änderungen speichern'}
                                </Button>
                                <Link href="/profile">
                                    <Button type="button" variant="ghost">
                                        Abbrechen
                                    </Button>
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Sidebar - Tips */}
                <div className={css({ lg: { gridColumn: 'span 4' } })}>
                    <div
                        className={css({
                            p: { base: '4', md: '5' },
                            borderRadius: '2xl',
                            bg: 'surface',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                        })}
                    >
                        <Heading as="h2" size="md" className={css({ mb: '4' })}>
                            Tipps für dein Profil
                        </Heading>
                        <div
                            className={css({
                                display: 'flex',
                                flexDir: 'column',
                                gap: '3',
                            })}
                        >
                            <div
                                className={css({
                                    p: '3',
                                    borderRadius: 'xl',
                                    bg: 'background',
                                })}
                            >
                                <Text size="sm" className={css({ fontWeight: '600', mb: '1' })}>
                                    Wähle ein ansprechendes Foto
                                </Text>
                                <Text size="sm" color="muted">
                                    Ein freundliches Profilbild hilft anderen, sich mit dir zu
                                    verbinden.
                                </Text>
                            </div>
                            <div
                                className={css({
                                    p: '3',
                                    borderRadius: 'xl',
                                    bg: 'background',
                                })}
                            >
                                <Text size="sm" className={css({ fontWeight: '600', mb: '1' })}>
                                    Schreib einen kurzen Teaser
                                </Text>
                                <Text size="sm" color="muted">
                                    Beschreibe deine kulinarischen Vorlieben in wenigen Worten.
                                </Text>
                            </div>
                            <div
                                className={css({
                                    p: '3',
                                    borderRadius: 'xl',
                                    bg: 'background',
                                })}
                            >
                                <Text size="sm" className={css({ fontWeight: '600', mb: '1' })}>
                                    Bleib authentisch
                                </Text>
                                <Text size="sm" color="muted">
                                    Dein Nickname sollte deine Persönlichkeit widerspiegeln.
                                </Text>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
