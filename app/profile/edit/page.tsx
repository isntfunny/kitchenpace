import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PageShell } from '@/components/layouts/PageShell';
import { getOrCreateProfile, upsertProfile } from '@/lib/profile';
import { css } from 'styled-system/css';

const MAX_NICKNAME_LENGTH = 32;
const MAX_TEASER_LENGTH = 160;
const MAX_PHOTO_URL_LENGTH = 2048;

const clamp = (value: string | null, maxLength: number) => {
    if (!value) {
        return null;
    }

    return value.slice(0, maxLength);
};

const ProfileEditPage = async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/auth/signin');
    }

    const profile = await getOrCreateProfile(session.user.id, session.user.email ?? '');

    const handleSubmit = async (formData: FormData) => {
        'use server';

        const currentSession = await getServerSession(authOptions);
        if (!currentSession?.user?.id) {
            redirect('/auth/signin');
        }

        const nickname = clamp(
            (formData.get('nickname') as string)?.trim() ?? null,
            MAX_NICKNAME_LENGTH,
        );
        const teaser = clamp((formData.get('teaser') as string)?.trim() ?? null, MAX_TEASER_LENGTH);
        const photoUrl = clamp(
            (formData.get('photoUrl') as string)?.trim() ?? null,
            MAX_PHOTO_URL_LENGTH,
        );

        await upsertProfile({
            userId: currentSession.user.id,
            email: currentSession.user.email ?? '',
            data: {
                nickname,
                teaser,
                photoUrl,
            },
        });

        revalidatePath('/profile');
        redirect('/profile');
    };

    return (
        <PageShell>
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
                        action={handleSubmit}
                        className={css({ display: 'flex', flexDir: 'column', gap: '6' })}
                    >
                        <label className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
                            <span className={css({ fontWeight: '600' })}>Profilfoto URL</span>
                            <input
                                type="url"
                                name="photoUrl"
                                defaultValue={profile.photoUrl ?? ''}
                                placeholder="https://..."
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
                            />
                        </label>

                        <label className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
                            <span className={css({ fontWeight: '600' })}>Nickname</span>
                            <input
                                type="text"
                                name="nickname"
                                maxLength={32}
                                defaultValue={profile.nickname ?? ''}
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
                                defaultValue={profile.teaser ?? ''}
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
                                cursor: 'pointer',
                                transition: 'transform 150ms ease',
                                _hover: { transform: 'translateY(-1px)' },
                            })}
                        >
                            Änderungen speichern
                        </button>
                    </form>
                </div>
            </section>
        </PageShell>
    );
};

export default ProfileEditPage;
