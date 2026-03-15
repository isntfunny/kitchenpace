import { Shield } from 'lucide-react';
import { redirect } from 'next/navigation';

import { Heading, Text } from '@app/components/atoms/Typography';
import { PageShell } from '@app/components/layouts/PageShell';
import { ProfileSidebarLayout } from '@app/components/layouts/ProfileSidebarLayout';
import { getServerAuthSession, logMissingSession } from '@app/lib/auth';
import { logAuth } from '@app/lib/auth-logger';
import { getOrCreateProfile } from '@app/lib/profile';
import { prisma } from '@shared/prisma';
import { css } from 'styled-system/css';

import { AccountSettingsCard } from '../settings/AccountSettingsCard';
import { ActiveSessionsCard } from '../settings/ActiveSessionsCard';
import { PasskeySettingsCard } from '../settings/PasskeySettingsCard';

export default async function AccountPage() {
    const session = await getServerAuthSession('profile/account');
    if (!session?.user?.id) {
        logMissingSession(session, 'profile/account');
        redirect('/auth/signin');
    }

    const [profile, credentialAccount] = await Promise.all([
        getOrCreateProfile(session.user.id),
        prisma.account.findFirst({
            where: { userId: session.user.id, providerId: 'credential' },
            select: { id: true },
        }),
    ]);

    if (!profile) {
        logAuth('warn', 'profile/account: profile missing', {
            userId: session.user.id,
        });
        redirect('/auth/signin');
    }

    return (
        <PageShell>
            <section
                className={css({
                    py: { base: '4', md: '6' },
                })}
            >
                {/* Header */}
                <div className={css({ mb: '6' })}>
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
                                    Verwalte deine Zugangsdaten, Passkeys und aktive Sitzungen.
                                </Text>
                            </div>
                        </div>
                    </div>
                </div>

                <ProfileSidebarLayout userSlug={profile.slug}>
                    {/* Account (Email + Password) */}
                    <AccountSettingsCard
                        email={session.user.email ?? ''}
                        hasPassword={!!credentialAccount}
                    />

                    {/* Passkeys */}
                    <PasskeySettingsCard />

                    {/* Active Sessions */}
                    <ActiveSessionsCard />
                </ProfileSidebarLayout>
            </section>
        </PageShell>
    );
}
