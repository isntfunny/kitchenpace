import { Bell } from 'lucide-react';
import { redirect } from 'next/navigation';

import { Heading, Text } from '@app/components/atoms/Typography';
import { PageShell } from '@app/components/layouts/PageShell';
import { ProfileSidebarLayout } from '@app/components/layouts/ProfileSidebarLayout';
import { NotificationsPageContent } from '@app/components/notifications/NotificationsPageContent';
import { getServerAuthSession, logMissingSession } from '@app/lib/auth';
import { getOrCreateProfile } from '@app/lib/profile';
import { css } from 'styled-system/css';

export const metadata = {
    title: 'Benachrichtigungen | KüchenTakt',
};

export default async function NotificationsPage() {
    const session = await getServerAuthSession('notifications');
    if (!session?.user?.id) {
        logMissingSession(session, 'notifications');
        redirect('/auth/signin');
    }

    const profile = await getOrCreateProfile(session.user.id);

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
                                <Bell size={24} />
                            </div>
                            <div>
                                <Heading as="h1" size="xl">
                                    Benachrichtigungen
                                </Heading>
                                <Text color="muted">
                                    Deine aktuellen Aktivitäten und Neuigkeiten.
                                </Text>
                            </div>
                        </div>
                    </div>
                </div>

                <ProfileSidebarLayout userSlug={profile?.slug}>
                    <NotificationsPageContent />
                </ProfileSidebarLayout>
            </section>
        </PageShell>
    );
}
