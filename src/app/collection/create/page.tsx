import { redirect } from 'next/navigation';

import { CollectionEditor } from '@app/components/collections/CollectionEditor';
import { PageShell } from '@app/components/layouts/PageShell';
import { getServerAuthSession } from '@app/lib/auth';

export default async function CreateCollectionPage() {
    const session = await getServerAuthSession('collection-create');
    if (!session?.user?.id) redirect('/auth/login');

    return (
        <PageShell>
            <CollectionEditor />
        </PageShell>
    );
}
