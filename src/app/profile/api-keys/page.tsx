import { redirect } from 'next/navigation';

import { PageShell } from '@app/components/layouts/PageShell';
import { ProfileSidebarLayout } from '@app/components/layouts/ProfileSidebarLayout';
import { getServerAuthSession } from '@app/lib/auth';

import { listApiKeys } from './actions';
import { ApiKeysClient } from './ApiKeysClient';

export const metadata = { title: 'API & Integrationen', robots: { index: false, follow: false } };
export default async function ApiKeysPage() {
    if (!(await getServerAuthSession('api-keys-page'))?.user.id) redirect('/auth/signin');
    return (
        <PageShell>
            <ProfileSidebarLayout>
                <ApiKeysClient initialKeys={await listApiKeys()} />
            </ProfileSidebarLayout>
        </PageShell>
    );
}
