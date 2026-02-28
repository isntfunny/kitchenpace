import type { Profile } from '@prisma/client';
import { ArrowLeft, Bell, Lock, Mail, Shield, User } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Heading, Text } from '@/components/atoms/Typography';
import { PageShell } from '@/components/layouts/PageShell';
import { getServerAuthSession, logMissingSession } from '@/lib/auth';
import { logAuth } from '@/lib/auth-logger';
import { getOrCreateProfile } from '@/lib/profile';
import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

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
                            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
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

                {/* Main Content Grid */}
                <div
                    className={grid({
                        columns: { base: 1, lg: 12 },
                        gap: '4',
                    })}
                >
                    {/* Left Column - Settings */}
                    <div
                        className={css({
                            lg: { gridColumn: 'span 8' },
                            display: 'flex',
                            flexDir: 'column',
                            gap: '4',
                        })}
                    >
                        {/* Privacy Settings */}
                        <PrivacySettingsCard
                            profile={{
                                showInActivity: privacyReadyProfile.showInActivity,
                                ratingsPublic: privacyReadyProfile.ratingsPublic,
                                followsPublic: privacyReadyProfile.followsPublic,
                                favoritesPublic: privacyReadyProfile.favoritesPublic,
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
                            }}
                        />

                        {/* Email Settings */}
                        <EmailSettingsCard />
                    </div>

                    {/* Right Column - Quick Actions */}
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
                                Schnellzugriff
                            </Heading>
                            <div
                                className={css({
                                    display: 'flex',
                                    flexDir: 'column',
                                    gap: '2',
                                })}
                            >
                                <Link
                                    href="/profile/edit"
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3',
                                        p: '3',
                                        borderRadius: 'xl',
                                        bg: 'background',
                                        textDecoration: 'none',
                                        color: 'text',
                                        transition: 'all 150ms ease',
                                        _hover: {
                                            bg: 'primary',
                                            color: 'white',
                                        },
                                    })}
                                >
                                    <User size={20} />
                                    <Text size="sm">Profil bearbeiten</Text>
                                </Link>
                                <Link
                                    href="/auth/password/edit"
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3',
                                        p: '3',
                                        borderRadius: 'xl',
                                        bg: 'background',
                                        textDecoration: 'none',
                                        color: 'text',
                                        transition: 'all 150ms ease',
                                        _hover: {
                                            bg: 'primary',
                                            color: 'white',
                                        },
                                    })}
                                >
                                    <Lock size={20} />
                                    <Text size="sm">Passwort ändern</Text>
                                </Link>
                                <Link
                                    href="/auth/forgot-password"
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3',
                                        p: '3',
                                        borderRadius: 'xl',
                                        bg: 'background',
                                        textDecoration: 'none',
                                        color: 'text',
                                        transition: 'all 150ms ease',
                                        _hover: {
                                            bg: 'primary',
                                            color: 'white',
                                        },
                                    })}
                                >
                                    <Mail size={20} />
                                    <Text size="sm">Passwort vergessen</Text>
                                </Link>
                                <Link
                                    href="/auth/signout"
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3',
                                        p: '3',
                                        borderRadius: 'xl',
                                        bg: 'background',
                                        textDecoration: 'none',
                                        color: 'text',
                                        transition: 'all 150ms ease',
                                        _hover: {
                                            bg: 'red.500',
                                            color: 'white',
                                        },
                                    })}
                                >
                                    <Bell size={20} />
                                    <Text size="sm">Abmelden</Text>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </PageShell>
    );
};

export default ManageProfilePage;
