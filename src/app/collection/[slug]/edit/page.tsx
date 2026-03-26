import { redirect, notFound } from 'next/navigation';

import { CollectionEditor } from '@app/components/collections/CollectionEditor';
import { PageShell } from '@app/components/layouts/PageShell';
import { isAdmin } from '@app/lib/admin/check-admin';
import { getServerAuthSession } from '@app/lib/auth';
import type { TiptapJSON } from '@app/lib/collections/types';
import { prisma } from '@shared/prisma';

interface EditCollectionPageProps {
    params: Promise<{ slug: string }>;
}

export default async function EditCollectionPage({ params }: EditCollectionPageProps) {
    const resolvedParams = await params;
    const session = await getServerAuthSession('collection-edit');
    if (!session?.user?.id) redirect('/auth/login');

    const userIsAdmin = await isAdmin(session.user.id);

    const collection = await prisma.collection.findFirst({
        where: { OR: [{ slug: resolvedParams.slug }, { id: resolvedParams.slug }] },
        include: {
            tags: { select: { tagId: true } },
            categories: { select: { categoryId: true } },
        },
    });

    if (!collection) notFound();
    if (collection.authorId !== session.user.id && !userIsAdmin) notFound();

    return (
        <PageShell>
            <CollectionEditor
                initialData={{
                    id: collection.id,
                    slug: collection.slug,
                    title: collection.title,
                    description: collection.description,
                    blocks: (collection.blocks ?? null) as TiptapJSON | null,
                    template: collection.template,
                    coverImageKey: collection.coverImageKey,
                    categoryIds: collection.categories.map((c) => c.categoryId),
                    tagIds: collection.tags.map((t) => t.tagId),
                    published: collection.published,
                }}
            />
        </PageShell>
    );
}
