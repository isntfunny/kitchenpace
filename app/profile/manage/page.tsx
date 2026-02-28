import type { Profile } from '@prisma/client';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PageShell } from '@/components/layouts/PageShell';
import { getServerAuthSession, logMissingSession } from '@/lib/auth';
import { logAuth } from '@/lib/auth-logger';
import { getOrCreateProfile } from '@/lib/profile';
import { css } from 'styled-system/css';

import { EmailSettingsCard } from './EmailSettingsCard';
import { NotificationSettingsCard } from './NotificationSettingsCard';
import { PrivacySettingsCard } from './PrivacySettingsCard';

type PrivacyReadyProfile = Profile & {
    ratingsPublic: boolean;
    followsPublic: boolean;
    favoritesPublic: boolean;
    showInActivity: boolean;
    notifyOnAnonymous: boolean;
    notifyOnNewFollower: boolean;
    notifyOnRecipeLike: boolean;
    notifyOnRecipeComment: boolean;
    notifyOnRecipeRating: boolean;
    notifyOnRecipeCooked: boolean;
    notifyOnRecipePublished: boolean;
    notifyOnWeeklyPlanReminder: boolean;
    notifyOnSystemMessages: boolean;
};

const actions = [
    {
        title: 'Profil bearbeiten',
        description: 'Passe Foto, Nickname und Teaser jederzeit an.',
        href: '/profile/edit',
    },
    {
        title: 'Passwort ändern',
        description: 'Ändere dein Passwort für KüchenTakt.',
        href: '/auth/password/edit',
    },
    {
        title: 'Passwort vergessen',
        description: 'Starte eine sichere Wiederherstellung.',
        href: '/auth/forgot-password',
    },
    {
        title: 'Abmelden',
        description: 'Melde dich auf allen Geräten ab.',
        href: '/auth/signout',
    },
];

const ManageProfilePage = async () => {
    const session = await getServerAuthSession('profile/manage');
    if (!session?.user?.id) {
        logMissingSession(session, 'profile/manage');
        redirect('/auth/signin');
    }

    const profile = await getOrCreateProfile(session.user.id, session.user.email ?? '');

    if (!profile) {
        logAuth('warn', 'profile/manage: profile missing', {
            userId: session.user.id,
        });
        redirect('/auth/signin');
    }

    const privacyReadyProfile = profile as PrivacyReadyProfile;

    return (
        <PageShell>
            <section
                className={css({
                    paddingY: { base: '8', md: '10' },
                    fontFamily: 'body',
                })}
            >
                <div className={css({ maxW: '960px', marginX: 'auto' })}>
                    <header className={css({ textAlign: 'center', mb: '10' })}>
                        <p
                            className={css({
                                textTransform: 'uppercase',
                                color: 'text-muted',
                                mb: '2',
                            })}
                        >
                            Verwaltung
                        </p>
                        <h1 className={css({ fontSize: '4xl', fontWeight: '800' })}>
                            Dein KüchenTakt Konto
                        </h1>
                        <p className={css({ color: 'text-muted', mt: '3' })}>
                            Alle Sicherheits- und Kontoaktionen an einem Ort.
                        </p>
                    </header>

                    <div className={css({ mb: '10' })}>
                        <PrivacySettingsCard
                            profile={{
                                showInActivity: privacyReadyProfile.showInActivity,
                                ratingsPublic: privacyReadyProfile.ratingsPublic,
                                followsPublic: privacyReadyProfile.followsPublic,
                                favoritesPublic: privacyReadyProfile.favoritesPublic,
                            }}
                        />
                    </div>

                    <div className={css({ mb: '10' })}>
                        <NotificationSettingsCard
                            profile={{
                                notifyOnAnonymous: privacyReadyProfile.notifyOnAnonymous,
                                notifyOnNewFollower: privacyReadyProfile.notifyOnNewFollower,
                                notifyOnRecipeLike: privacyReadyProfile.notifyOnRecipeLike,
                                notifyOnRecipeComment: privacyReadyProfile.notifyOnRecipeComment,
                                notifyOnRecipeRating: privacyReadyProfile.notifyOnRecipeRating,
                                notifyOnRecipeCooked: privacyReadyProfile.notifyOnRecipeCooked,
                                notifyOnRecipePublished:
                                    privacyReadyProfile.notifyOnRecipePublished,
                                notifyOnWeeklyPlanReminder:
                                    privacyReadyProfile.notifyOnWeeklyPlanReminder,
                                notifyOnSystemMessages: privacyReadyProfile.notifyOnSystemMessages,
                            }}
                        />
                    </div>

                    <div className={css({ mb: '10' })}>
                        <EmailSettingsCard />
                    </div>

                    <div
                        className={css({
                            display: 'grid',
                            gridTemplateColumns: { base: '1fr', md: 'repeat(2, 1fr)' },
                            gap: '6',
                        })}
                    >
                        {actions.map((action) => (
                            <Link
                                key={action.title}
                                href={action.href}
                                className={css({
                                    borderRadius: '2xl',
                                    padding: '6',
                                    border: '1px solid rgba(224,123,83,0.25)',
                                    background: 'white',
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    transition: 'transform 150ms ease, box-shadow 150ms ease',
                                    _hover: {
                                        transform: 'translateY(-3px)',
                                        boxShadow: '0 20px 50px rgba(224,123,83,0.15)',
                                    },
                                })}
                            >
                                <h2 className={css({ fontSize: 'xl', fontWeight: '700', mb: '2' })}>
                                    {action.title}
                                </h2>
                                <p className={css({ color: 'text-muted' })}>{action.description}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </PageShell>
    );
};

export default ManageProfilePage;
