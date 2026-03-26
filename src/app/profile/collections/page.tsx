import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { fetchUserCollections } from '@app/app/actions/collections';
import { UserCollectionTable } from '@app/components/collections/UserCollectionTable';
import { PageShell } from '@app/components/layouts/PageShell';
import { getServerAuthSession, logMissingSession } from '@app/lib/auth';
import { getOrCreateProfile } from '@app/lib/profile';

import { css } from 'styled-system/css';

export const metadata: Metadata = {
    title: 'Meine Sammlungen',
    description: 'Verwalte deine erstellten Sammlungen - Entwürfe und veröffentlichte Sammlungen.',
};

export const dynamic = 'force-dynamic';

export default async function MyCollectionsPage() {
    const session = await getServerAuthSession('my-collections');

    if (!session?.user?.id) {
        logMissingSession(session, 'my-collections');
        redirect('/auth/signin');
    }

    const profile = await getOrCreateProfile(session.user.id);

    if (!profile) {
        redirect('/auth/signin');
    }

    const collections = await fetchUserCollections(session.user.id);

    return (
        <PageShell>
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '6' })}>
                <div>
                    <h1
                        className={css({
                            fontSize: '2xl',
                            fontWeight: 800,
                            color: 'text',
                        })}
                    >
                        Meine Sammlungen
                    </h1>
                    <p className={css({ color: 'foreground.muted', fontSize: 'sm', mt: '1' })}>
                        Verwalte deine Entwürfe und veröffentlichten Sammlungen.
                    </p>
                </div>

                <UserCollectionTable collections={collections} />
            </div>
        </PageShell>
    );
}
