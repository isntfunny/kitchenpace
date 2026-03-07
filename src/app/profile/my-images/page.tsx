import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { fetchUserOwnCookImages } from '@app/app/actions/cooks';
import { PageShell } from '@app/components/layouts/PageShell';
import { getServerAuthSession, logMissingSession } from '@app/lib/auth';
import { css } from 'styled-system/css';

import { UserCookImagesClient } from './UserCookImagesClient';

export const metadata: Metadata = {
    title: 'Meine Zubereitet-Bilder',
    description: 'Verwalte deine hochgeladenen Fotos von zubereiteten Rezepten.',
};

export const dynamic = 'force-dynamic';

export default async function MyImagesPage() {
    const session = await getServerAuthSession('profile/my-images');

    if (!session?.user?.id) {
        logMissingSession(session, 'profile/my-images');
        redirect('/auth/signin');
    }

    const images = await fetchUserOwnCookImages(session.user.id);

    return (
        <PageShell>
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '6', pb: '12' })}>
                {/* Header */}
                <div>
                    <p className={css({ fontSize: 'xs', color: 'foreground.muted', mb: '1' })}>
                        <Link href="/profile" className={css({ color: 'foreground.muted', textDecoration: 'none', _hover: { color: 'primary' } })}>
                            Profil
                        </Link>
                        {' · '}Zubereitet-Bilder
                    </p>
                    <h1 className={css({ fontSize: '2xl', fontWeight: '800', color: 'foreground', mb: '1' })}>
                        Meine Zubereitet-Bilder
                    </h1>
                    <p className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                        {images.length === 0
                            ? 'Noch keine Bilder hochgeladen.'
                            : `${images.length} Bild${images.length === 1 ? '' : 'er'} hochgeladen`}
                    </p>
                </div>

                <UserCookImagesClient images={images} />
            </div>
        </PageShell>
    );
}
