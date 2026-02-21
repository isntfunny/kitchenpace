import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PageShell } from '@/components/layouts/PageShell';
import { getAllCategories, getAllTags } from '@/components/recipe/actions';
import { RecipeForm } from '@/components/recipe/RecipeForm';

export default async function CreateRecipePage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/auth/signin');
    }

    const [categories, tags] = await Promise.all([getAllCategories(), getAllTags()]);

    return (
        <PageShell>
            <div
                style={{
                    maxWidth: '800px',
                    margin: '0 auto',
                    padding: '2rem 1rem',
                }}
            >
                <h1
                    style={{
                        fontSize: '2rem',
                        fontWeight: '800',
                        marginBottom: '0.5rem',
                    }}
                >
                    Neues Rezept erstellen
                </h1>
                <p
                    style={{
                        color: '#666',
                        marginBottom: '2rem',
                    }}
                >
                    Teile dein Rezept mit der KüchenTakt Community.
                </p>

                <RecipeForm categories={categories} tags={tags} authorId={session.user.id} />
            </div>
        </PageShell>
    );
}
