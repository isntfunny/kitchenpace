'use client';

import { useState } from 'react';

import { FileUpload } from '@/components/features/FileUpload';
import { css } from 'styled-system/css';

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
                paddingY: { base: '8', md: '10' },
                display: 'flex',
                justifyContent: 'center',
                fontFamily: 'body',
            })}
        >
            <div
                className={css({
                    width: '100%',
                    maxWidth: '760px',
                    background: 'white',
                    padding: { base: '6', md: '10' },
                    borderRadius: '3xl',
                    boxShadow: '0 35px 90px rgba(224,123,83,0.25)',
                })}
            >
                <h1 className={css({ fontSize: '3xl', fontWeight: '800', mb: '2' })}>
                    Profil bearbeiten
                </h1>
                <p className={css({ color: 'text-muted', mb: '8' })}>
                    Teile deine Persönlichkeit mit der KüchenTakt Community.
                </p>

                <form
                    onSubmit={handleSubmit}
                    className={css({ display: 'flex', flexDir: 'column', gap: '6' })}
                >
                    {error && (
                        <div
                            className={css({
                                padding: '3',
                                background: '#fee2e2',
                                color: '#dc2626',
                                borderRadius: 'lg',
                            })}
                        >
                            {error}
                        </div>
                    )}

                    <div>
                        <span className={css({ fontWeight: '600', display: 'block', mb: '2' })}>
                            Profilfoto
                        </span>
                        <FileUpload type="profile" value={photoUrl} onChange={setPhotoUrl} />
                    </div>

                    <label className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
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
                                border: '1px solid rgba(224,123,83,0.4)',
                                padding: '3',
                                fontSize: 'md',
                                outline: 'none',
                                _focus: {
                                    borderColor: '#e07b53',
                                    boxShadow: '0 0 0 3px rgba(224,123,83,0.15)',
                                },
                            })}
                            required
                        />
                    </label>

                    <label className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
                        <span className={css({ fontWeight: '600' })}>Teaser Text</span>
                        <textarea
                            name="teaser"
                            maxLength={160}
                            value={teaser}
                            onChange={(e) => setTeaser(e.target.value)}
                            placeholder="Beschreibe deine Koch-DNA in wenigen Worten"
                            className={css({
                                borderRadius: 'xl',
                                border: '1px solid rgba(224,123,83,0.4)',
                                padding: '3',
                                minH: '32',
                                fontSize: 'md',
                                resize: 'vertical',
                                outline: 'none',
                                _focus: {
                                    borderColor: '#e07b53',
                                    boxShadow: '0 0 0 3px rgba(224,123,83,0.15)',
                                },
                            })}
                        />
                    </label>

                    <button
                        type="submit"
                        disabled={saving}
                        className={css({
                            marginTop: '4',
                            alignSelf: 'flex-start',
                            borderRadius: 'full',
                            px: '8',
                            py: '3',
                            background: 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
                            color: 'white',
                            fontWeight: '700',
                            border: 'none',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.7 : 1,
                            transition: 'transform 150ms ease',
                            _hover: { transform: saving ? 'none' : 'translateY(-1px)' },
                        })}
                    >
                        {saving ? 'Speichern...' : 'Änderungen speichern'}
                    </button>
                </form>
            </div>
        </section>
    );
}
