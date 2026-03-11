import type { Profile } from '@prisma/client';
import { Shield } from 'lucide-react';
import { redirect } from 'next/navigation';

import { Heading, Text } from '@app/components/atoms/Typography';
import { PageShell } from '@app/components/layouts/PageShell';
import { ProfileSidebarLayout } from '@app/components/layouts/ProfileSidebarLayout';
import { getServerAuthSession, logMissingSession } from '@app/lib/auth';
import { logAuth } from '@app/lib/auth-logger';
import { getOrCreateProfile } from '@app/lib/profile';
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
    notifyOnNewsletter: boolean;
};

const ManageProfilePage = async () => {
    const session = await getServerAuthSession('profile/settings');
    if (!session?.user?.id) {
        logMissingSession(session, 'profile/settings');
        redirect('/auth/signin');
    }

    const profile = await getOrCreateProfile(session.user.id);

    if (!profile) {
        logAuth('warn', 'profile/settings: profile missing', {
            userId: session.user.id,
        });
        redirect('/auth/signin');
    }

    const privacyReadyProfile = profile as PrivacyReadyProfile;

    return (
        <PageShell>
            <section
                className={css({
                    py: { base: '4', md: '6' },
                })}
            >
                {/* Header */}
                <div
                    className={css({
                        mb: '6',
                    })}
                >
                    <div
                        className={css({
                            p: { base: '4', md: '6' },
                            borderRadius: '2xl',
                            bg: 'surface',
                            boxShadow: 'shadow.medium',
                        })}
                    >
                        <div
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4',
                            })}
                        >
                            <div
                                className={css({
                                    w: '12',
                                    h: '12',
                                    borderRadius: 'xl',
                                    bg: 'secondary',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                })}
                            >
                                <Shield size={24} />
                            </div>
                            <div>
                                <Heading as="h1" size="xl">
                                    Konto & Sicherheit
                                </Heading>
                                <Text color="muted">
                                    Verwalte deine Privatsphäre, Benachrichtigungen und
                                    Kontoeinstellungen.
                                </Text>
                            </div>
                        </div>
                    </div>
                </div>

                <ProfileSidebarLayout userSlug={profile.slug}>
                    {/* Privacy Settings */}
                    <PrivacySettingsCard
                        profile={{
                            showInActivity: privacyReadyProfile.showInActivity,
                            ratingsPublic: privacyReadyProfile.ratingsPublic,
                            followsPublic: privacyReadyProfile.followsPublic,
                            favoritesPublic: privacyReadyProfile.favoritesPublic,
                            cookedPublic: privacyReadyProfile.cookedPublic,
                        }}
                    />

                    {/* Notification Settings */}
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
                            notifyOnNewsletter: privacyReadyProfile.notifyOnNewsletter,
                        }}
                    />

                    {/* Email Settings */}
                    <EmailSettingsCard
                        profile={{
                            notifyOnRecipePublished:
                                privacyReadyProfile.notifyOnRecipePublished,
                            notifyOnNewsletter: privacyReadyProfile.notifyOnNewsletter,
                            notifyOnWeeklyPlanReminder:
                                privacyReadyProfile.notifyOnWeeklyPlanReminder,
                        }}
                    />
                </ProfileSidebarLayout>
            </section>
        </PageShell>
    );
};

export default ManageProfilePage;
