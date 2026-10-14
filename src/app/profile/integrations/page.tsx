import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Heading } from '@app/components/atoms/Typography';
import { ConnectionCard } from '@app/components/bring/ConnectionCard';
import { PageShell } from '@app/components/layouts/PageShell';
import { ProfileSidebarLayout } from '@app/components/layouts/ProfileSidebarLayout';
import { getServerAuthSession } from '@app/lib/auth';

import { css } from 'styled-system/css';

export const metadata: Metadata = {
    title: 'Verknüpfte Dienste',
    robots: { index: false, follow: false },
};

export default async function IntegrationsPage() {
    const session = await getServerAuthSession('profile/integrations');
    if (!session?.user?.id) redirect('/auth/signin?callbackUrl=/profile/integrations');
    return (
        <PageShell>
            <section className={css({ py: '6' })}>
                <Heading as="h1" size="xl" className={css({ mb: '5' })}>
                    Verknüpfte Dienste
                </Heading>
                <ProfileSidebarLayout>
                    <ConnectionCard />
                </ProfileSidebarLayout>
            </section>
        </PageShell>
    );
}
