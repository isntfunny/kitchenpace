'use client';

import debounce from 'lodash/debounce';
import { ArrowLeft, Camera, Check, Loader2, Mail, Save, User, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@app/components/atoms/Button';
import { Heading, Text } from '@app/components/atoms/Typography';
import { FileUpload } from '@app/components/features/FileUpload';
import { ProfileSidebarLayout } from '@app/components/layouts/ProfileSidebarLayout';
import { css } from 'styled-system/css';

const MAX_NICKNAME_LENGTH = 32;
const MAX_TEASER_LENGTH = 160;

const clamp = (value: string | null, maxLength: number) => {
    if (!value) {
        return null;
    }
    return value.slice(0, maxLength);
};

type NicknameStatus = 'idle' | 'checking' | 'available' | 'taken';

interface ProfileData {
    id: string;
    userId: string;
    nickname: string | null;
    teaser: string | null;
    photoKey: string | null;
    slug: string | null;
}

interface ProfileEditClientProps {
    profile: ProfileData;
    email: string;
}

export function ProfileEditClient({ profile, email }: ProfileEditClientProps) {
    const [photoKey, setPhotoKey] = useState(profile.photoKey || '');
    const [nickname, setNickname] = useState(profile.nickname || '');
    const [teaser, setTeaser] = useState(profile.teaser || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nicknameStatus, setNicknameStatus] = useState<NicknameStatus>('idle');

    const [newEmail, setNewEmail] = useState('');
    const [emailSaving, setEmailSaving] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [emailSuccess, setEmailSuccess] = useState(false);

    const originalNickname = profile.nickname || '';

    const checkNickname = useMemo(
        () =>
            debounce(async (trimmed: string) => {
                try {
                    const res = await fetch(
                        `/api/profile/check-nickname?nickname=${encodeURIComponent(trimmed)}`,
                    );
                    const data = await res.json();
                    setNicknameStatus(data.available ? 'available' : 'taken');
                } catch {
                    setNicknameStatus('idle');
                }
            }, 500),
        [],
    );

    useEffect(() => {
        const trimmed = nickname.trim();

        if (!trimmed || trimmed === originalNickname || trimmed.length < 2) {
            setNicknameStatus('idle');
            return;
        }

        setNicknameStatus('checking');
        checkNickname(trimmed);

        return () => checkNickname.cancel();
    }, [nickname, originalNickname, checkNickname]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (nicknameStatus === 'taken') return;

        setSaving(true);
        setError(null);

        try {
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nickname: clamp(nickname, MAX_NICKNAME_LENGTH),
                    teaser: clamp(teaser, MAX_TEASER_LENGTH),
                    photoKey: photoKey || null,
                }),
            });

            if (response.ok) {
                window.location.href = '/profile';
            } else {
                const data = await response.json().catch(() => ({}));
                setError(data.message ?? 'Fehler beim Speichern. Bitte versuche es erneut.');
            }
        } catch (err) {
            console.error('Error saving profile:', err);
            setError('Fehler beim Speichern. Bitte versuche es erneut.');
        } finally {
            setSaving(false);
        }
    };

    const handleEmailSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailSaving(true);
        setEmailError(null);
        setEmailSuccess(false);

        try {
            const response = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail }),
            });

            if (response.ok) {
                setEmailSuccess(true);
                setNewEmail('');
            } else {
                const data = await response.json().catch(() => ({}));
                setEmailError(data.message ?? 'Fehler beim Speichern der E-Mail.');
            }
        } catch {
            setEmailError('Fehler beim Speichern der E-Mail.');
        } finally {
            setEmailSaving(false);
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

            <ProfileSidebarLayout
                userSlug={profile.slug ?? profile.userId}
                sidebarExtra={
                    <div
                        className={css({
                            p: { base: '4', md: '5' },
                            borderRadius: '2xl',
                            bg: 'surface',
                            boxShadow: 'shadow.medium',
                        })}
                    >
                        <Heading as="h2" size="md" className={css({ mb: '4' })}>
                            Tipps für dein Profil
                        </Heading>
                        <div className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
                            {[
                                {
                                    title: 'Wähle ein ansprechendes Foto',
                                    desc: 'Ein freundliches Profilbild hilft anderen, sich mit dir zu verbinden.',
                                },
                                {
                                    title: 'Schreib einen kurzen Teaser',
                                    desc: 'Beschreibe deine kulinarischen Vorlieben in wenigen Worten.',
                                },
                                {
                                    title: 'Bleib authentisch',
                                    desc: 'Dein Nickname sollte deine Persönlichkeit widerspiegeln.',
                                },
                            ].map(({ title, desc }) => (
                                <div
                                    key={title}
                                    className={css({
                                        p: '3',
                                        borderRadius: 'xl',
                                        bg: 'background',
                                    })}
                                >
                                    <Text size="sm" className={css({ fontWeight: '600', mb: '1' })}>
                                        {title}
                                    </Text>
                                    <Text size="sm" color="muted">
                                        {desc}
                                    </Text>
                                </div>
                            ))}
                        </div>
                    </div>
                }
            >
                {/* Main Form */}
                <div>
                    <div
                        className={css({
                            p: { base: '4', md: '6' },
                            borderRadius: '2xl',
                            bg: 'surface',
                            boxShadow: 'shadow.medium',
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
                                    value={photoKey}
                                    onChange={setPhotoKey}
                                    label="Profilfoto"
                                />
                            </div>

                            {/* Nickname */}
                            <div
                                className={css({
                                    display: 'flex',
                                    flexDir: 'column',
                                    gap: '2',
                                })}
                            >
                                <span className={css({ fontWeight: '600' })}>Nickname</span>
                                <div className={css({ position: 'relative' })}>
                                    <input
                                        type="text"
                                        name="nickname"
                                        maxLength={32}
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        placeholder="Dein öffentlicher Name"
                                        className={css({
                                            w: '100%',
                                            borderRadius: 'xl',
                                            border: '1px solid',
                                            borderColor:
                                                nicknameStatus === 'taken'
                                                    ? 'red.400'
                                                    : nicknameStatus === 'available'
                                                      ? 'green.400'
                                                      : 'border',
                                            p: '3',
                                            pr: '10',
                                            fontSize: 'md',
                                            outline: 'none',
                                            bg: 'background',
                                            transition: 'all 150ms ease',
                                            _focus: {
                                                borderColor:
                                                    nicknameStatus === 'taken'
                                                        ? 'red.400'
                                                        : nicknameStatus === 'available'
                                                          ? 'green.400'
                                                          : 'primary',
                                                boxShadow: {
                                                    base: '0 0 0 3px rgba(224,123,83,0.15)',
                                                    _dark: '0 0 0 3px rgba(224,123,83,0.2)',
                                                },
                                            },
                                        })}
                                        required
                                    />
                                    {nicknameStatus === 'checking' && (
                                        <Loader2
                                            size={16}
                                            className={css({
                                                position: 'absolute',
                                                right: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                color: 'text-muted',
                                                animation: 'spin 1s linear infinite',
                                            })}
                                        />
                                    )}
                                    {nicknameStatus === 'available' && (
                                        <Check
                                            size={16}
                                            className={css({
                                                position: 'absolute',
                                                right: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                color: 'green.500',
                                            })}
                                        />
                                    )}
                                    {nicknameStatus === 'taken' && (
                                        <X
                                            size={16}
                                            className={css({
                                                position: 'absolute',
                                                right: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                color: 'red.500',
                                            })}
                                        />
                                    )}
                                </div>
                                {nicknameStatus === 'taken' && (
                                    <Text size="sm" className={css({ color: 'red.500' })}>
                                        Dieser Nickname ist bereits vergeben.
                                    </Text>
                                )}
                                {nicknameStatus === 'available' && (
                                    <Text size="sm" className={css({ color: 'green.600' })}>
                                        Nickname ist verfügbar.
                                    </Text>
                                )}
                                {nicknameStatus !== 'taken' && nicknameStatus !== 'available' && (
                                    <Text size="sm" color="muted">
                                        Maximal {MAX_NICKNAME_LENGTH} Zeichen
                                    </Text>
                                )}
                            </div>

                            {/* Teaser */}
                            <label
                                className={css({
                                    display: 'flex',
                                    flexDir: 'column',
                                    gap: '2',
                                })}
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
                                            boxShadow: {
                                                base: '0 0 0 3px rgba(224,123,83,0.15)',
                                                _dark: '0 0 0 3px rgba(224,123,83,0.2)',
                                            },
                                        },
                                    })}
                                />
                                <Text size="sm" color="muted">
                                    Maximal {MAX_TEASER_LENGTH} Zeichen
                                </Text>
                            </label>

                            <div className={css({ display: 'flex', gap: '3', mt: '2' })}>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={saving || nicknameStatus === 'taken'}
                                >
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

                {/* Email Change Card */}
                <div>
                    <div
                        className={css({
                            p: { base: '4', md: '6' },
                            borderRadius: '2xl',
                            bg: 'surface',
                            boxShadow: 'shadow.medium',
                        })}
                    >
                        <div className={css({ mb: '5' })}>
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
                                <Mail size={24} />
                            </div>
                            <Heading as="h2" size="lg" className={css({ mb: '1' })}>
                                E-Mail-Adresse ändern
                            </Heading>
                            <Text color="muted" size="sm">
                                Aktuelle Adresse: <strong>{email || '–'}</strong>
                            </Text>
                        </div>

                        <form
                            onSubmit={handleEmailSave}
                            className={css({ display: 'flex', flexDir: 'column', gap: '4' })}
                        >
                            {emailError && (
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
                                    <Text size="sm">{emailError}</Text>
                                </div>
                            )}
                            {emailSuccess && (
                                <div
                                    className={css({
                                        p: '3',
                                        bg: 'green.50',
                                        color: 'green.700',
                                        borderRadius: 'lg',
                                        border: '1px solid',
                                        borderColor: 'green.200',
                                    })}
                                >
                                    <Text size="sm">E-Mail-Adresse erfolgreich geändert.</Text>
                                </div>
                            )}
                            <label
                                className={css({
                                    display: 'flex',
                                    flexDir: 'column',
                                    gap: '2',
                                })}
                            >
                                <span className={css({ fontWeight: '600' })}>
                                    Neue E-Mail-Adresse
                                </span>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="neue@adresse.de"
                                    required
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
                                            boxShadow: {
                                                base: '0 0 0 3px rgba(224,123,83,0.15)',
                                                _dark: '0 0 0 3px rgba(224,123,83,0.2)',
                                            },
                                        },
                                    })}
                                />
                            </label>
                            <div>
                                <Button type="submit" variant="primary" disabled={emailSaving}>
                                    <Mail size={18} />
                                    {emailSaving ? 'Speichern...' : 'E-Mail ändern'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </ProfileSidebarLayout>
        </section>
    );
}
