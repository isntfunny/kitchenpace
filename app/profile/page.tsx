import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { fetchUserDraftRecipes, fetchUserStats } from '@/app/actions/user';
import { Button } from '@/components/atoms/Button';
import { SmartImage } from '@/components/atoms/SmartImage';
import SignOutButton from '@/components/auth/SignOutButton';
import { PageShell } from '@/components/layouts/PageShell';
import { getServerAuthSession, logMissingSession } from '@/lib/auth';
import { getOrCreateProfile } from '@/lib/profile';
import { css } from 'styled-system/css';

export const metadata: Metadata = {
    title: 'Mein Profil',
    description:
        'Dein persönliches KüchenTakt Profil. Verwalte deine Favoriten, erstellte Rezepte und Kontoeinstellungen.',
};

export const dynamic = 'force-dynamic';

const ProfilePage = async () => {
    const session = await getServerAuthSession('profile/page');

    if (!session?.user?.id) {
        logMissingSession(session, 'profile/page');
        redirect('/auth/signin');
    }

    const profile = await getOrCreateProfile(session.user.id, session.user.email ?? '');

    if (!profile) {
        redirect('/auth/signin');
    }

    const stats = await fetchUserStats(session.user.id);
    const draftRecipes = await fetchUserDraftRecipes(session.user.id);

    return (
        <PageShell>
            <section
                className={css({
                    paddingY: { base: '8', md: '10' },
                    fontFamily: 'body',
                    color: 'text',
                })}
            >
                <div
                    className={css({
                        maxWidth: '5xl',
                        margin: '0 auto',
                        background: 'surface.elevated',
                        borderRadius: '3xl',
                        boxShadow: '0 40px 120px rgba(224,123,83,0.25)',
                        padding: { base: '8', md: '14' },
                    })}
                >
                    <div
                        className={css({
                            display: 'flex',
                            flexDir: { base: 'column', md: 'row' },
                            gap: '8',
                            alignItems: { base: 'flex-start', md: 'center' },
                        })}
                    >
                        <div>
                            {profile.photoUrl ? (
                                <SmartImage
                                    src={profile.photoUrl}
                                    alt={profile.nickname ?? 'Profilfoto'}
                                    width={160}
                                    height={160}
                                    className={css({
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: '6px solid #fff7f1',
                                        boxShadow: '0 15px 40px rgba(0,0,0,0.15)',
                                    })}
                                />
                            ) : (
                                <div
                                    className={css({
                                        width: '160px',
                                        height: '160px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #ffe5d1, #ffc89e)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '4xl',
                                        fontWeight: '700',
                                    })}
                                >
                                    {(profile.nickname ?? 'KT').slice(0, 2).toUpperCase()}
                                </div>
                            )}
                        </div>

                        <div className={css({ flex: 1 })}>
                            <p
                                className={css({
                                    color: 'text-muted',
                                    letterSpacing: 'widest',
                                    mb: '1',
                                })}
                            >
                                KüchenTakt Profil
                            </p>
                            <h1 className={css({ fontSize: '4xl', fontWeight: '800', mb: '3' })}>
                                {profile.nickname ?? 'Neuer KüchenFan'}
                            </h1>
                            <p className={css({ color: 'text-muted', mb: '4', lineHeight: '1.8' })}>
                                {profile.teaser ??
                                    'Lass andere wissen, was dich in der Küche begeistert.'}
                            </p>
                            <div
                                className={css({
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '3',
                                    color: 'text-muted',
                                    fontSize: 'sm',
                                })}
                            >
                                <span>Nickname: {profile.nickname ?? '–'}</span>
                                <span>•</span>
                                <span>Email: {session.user.email ?? '–'}</span>
                            </div>
                        </div>

                        <SignOutButton label="Abmelden" />

                        {profile.userId && (
                            <Link href={`/user/${profile.userId}`}>
                                <Button type="button" variant="ghost">
                                    Öffentliches Profil ansehen →
                                </Button>
                            </Link>
                        )}
                    </div>

                    <div
                        className={css({
                            marginTop: '10',
                            display: 'grid',
                            gridTemplateColumns: { base: '1fr', md: 'repeat(2, 1fr)' },
                            gap: '6',
                        })}
                    >
                        <Link
                            href="/profile/edit"
                            className={css({
                                borderRadius: '2xl',
                                padding: '6',
                                border: '1px solid rgba(224,123,83,0.3)',
                                textDecoration: 'none',
                                color: 'inherit',
                                transition: 'transform 150ms ease',
                                _hover: { transform: 'translateY(-2px)', borderColor: '#e07b53' },
                            })}
                        >
                            <h2 className={css({ fontSize: 'xl', fontWeight: '700', mb: '2' })}>
                                Profil bearbeiten
                            </h2>
                            <p className={css({ color: 'text-muted' })}>
                                Foto, Teaser oder Nickname aktualisieren.
                            </p>
                        </Link>

                        <Link
                            href="/profile/manage"
                            className={css({
                                borderRadius: '2xl',
                                padding: '6',
                                border: '1px solid rgba(224,123,83,0.3)',
                                textDecoration: 'none',
                                color: 'inherit',
                                transition: 'transform 150ms ease',
                                _hover: { transform: 'translateY(-2px)', borderColor: '#e07b53' },
                            })}
                        >
                            <h2 className={css({ fontSize: 'xl', fontWeight: '700', mb: '2' })}>
                                Konto & Sicherheit
                            </h2>
                            <p className={css({ color: 'text-muted' })}>
                                Passwort ändern, Recovery und Accountverwaltung.
                            </p>
                        </Link>
                    </div>

                    {draftRecipes.length > 0 && (
                        <div
                            className={css({
                                marginTop: '10',
                            })}
                        >
                            <div
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    mb: '4',
                                })}
                            >
                                <h2
                                    className={css({
                                        fontSize: 'xl',
                                        fontWeight: '700',
                                    })}
                                >
                                    Meine Entwürfe
                                </h2>
                                <span
                                    className={css({
                                        background: '#6c5ce7',
                                        color: 'white',
                                        borderRadius: 'full',
                                        px: '3',
                                        py: '1',
                                        fontSize: 'sm',
                                        fontWeight: '600',
                                    })}
                                >
                                    {stats.draftCount}
                                </span>
                            </div>
                            <div
                                className={css({
                                    display: 'grid',
                                    gridTemplateColumns: {
                                        base: '1fr',
                                        sm: 'repeat(2, 1fr)',
                                        md: 'repeat(3, 1fr)',
                                    },
                                    gap: '4',
                                })}
                            >
                                {draftRecipes.map((draft) => (
                                    <Link
                                        key={draft.id}
                                        href={`/recipe/${draft.id}`}
                                        className={css({
                                            borderRadius: 'xl',
                                            padding: '4',
                                            border: '1px solid rgba(108,92,231,0.3)',
                                            background: 'rgba(108,92,231,0.05)',
                                            textDecoration: 'none',
                                            color: 'inherit',
                                            transition: 'all 150ms ease',
                                            _hover: {
                                                transform: 'translateY(-2px)',
                                                borderColor: '#6c5ce7',
                                                background: 'rgba(108,92,231,0.1)',
                                            },
                                        })}
                                    >
                                        <p
                                            className={css({
                                                fontWeight: '600',
                                                mb: '1',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            })}
                                        >
                                            {draft.title}
                                        </p>
                                        <p
                                            className={css({
                                                fontSize: 'sm',
                                                color: 'text-muted',
                                            })}
                                        >
                                            Entwurf
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </PageShell>
    );
};

export default ProfilePage;
