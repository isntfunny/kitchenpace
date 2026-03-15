import { Camera } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { fetchUserOwnCookImages } from '@app/app/actions/cooks';
import { Heading, Text } from '@app/components/atoms/Typography';
import { PageShell } from '@app/components/layouts/PageShell';
import { ProfileSidebarLayout } from '@app/components/layouts/ProfileSidebarLayout';
import { getServerAuthSession, logMissingSession } from '@app/lib/auth';
import { getOrCreateProfile } from '@app/lib/profile';

import { css } from 'styled-system/css';

import { UserCookImagesClient } from './UserCookImagesClient';

export const metadata: Metadata = {
    title: 'Meine Zubereitet-Bilder',
    description: 'Verwalte deine hochgeladenen Fotos von zubereiteten Rezepten.',
};

export const dynamic = 'force-dynamic';

export default async function MyImagesPage() {
    const session = await getServerAuthSession('profile/images');

    if (!session?.user?.id) {
        logMissingSession(session, 'profile/images');
        redirect('/auth/signin');
    }

    const [images, profile] = await Promise.all([
        fetchUserOwnCookImages(session.user.id),
        getOrCreateProfile(session.user.id),
    ]);

    return (
        <PageShell>
            <section className={css({ py: { base: '4', md: '6' } })}>
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
                                    bg: 'palette.gold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                })}
                            >
                                <Camera size={24} />
                            </div>
                            <div>
                                <Heading as="h1" size="xl">
                                    Meine Zubereitet-Bilder
                                </Heading>
                                <Text color="muted">
                                    {images.length === 0
                                        ? 'Noch keine Bilder hochgeladen.'
                                        : `${images.length} Bild${images.length === 1 ? '' : 'er'} hochgeladen`}
                                </Text>
                            </div>
                        </div>
                    </div>
                </div>

                <ProfileSidebarLayout userSlug={profile?.slug ?? undefined}>
                    <UserCookImagesClient images={images} />
                </ProfileSidebarLayout>
            </section>
        </PageShell>
    );
}
