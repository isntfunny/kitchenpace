import { Metadata } from 'next';

import { getUserById, getRecipesByAuthor, getUserActivities } from '@/app/recipe/[id]/data';
import { css } from 'styled-system/css';
import { container } from 'styled-system/patterns';

import { UserProfileClient } from './UserProfileClient';

type UserProfileParams = {
    id: string;
};

type UserProfileProps = {
    params: UserProfileParams | Promise<UserProfileParams>;
};

const buildUserMetadata = (name: string): Metadata => ({
    title: `${name} | KüchenTakt`,
    description: `Entdecke die Rezepte von ${name} auf KüchenTakt.`,
});

export async function generateMetadata({ params }: UserProfileProps): Promise<Metadata> {
    const resolvedParams = await params;
    const user = getUserById(resolvedParams.id);
    if (!user) {
        return {
            title: 'Benutzer nicht gefunden | KüchenTakt',
        };
    }
    return buildUserMetadata(user.name);
}

export async function generateStaticParams() {
    const { users } = await import('@/app/recipe/[id]/data');
    return Object.keys(users).map((id) => ({ id }));
}

export default async function UserProfilePage({ params }: UserProfileProps) {
    const resolvedParams = await params;
    const user = getUserById(resolvedParams.id);

    if (!user) {
        return (
            <div className={css({ minH: '100vh', color: 'text' })}>
                <main className={container({ maxW: '1400px', mx: 'auto', px: '4', py: '8' })}>
                    <div className={css({ textAlign: 'center', py: '20' })}>
                        <h1 className={css({ fontFamily: 'heading', fontSize: '3xl', mb: '4' })}>
                            Benutzer nicht gefunden
                        </h1>
                        <p className={css({ color: 'text-muted' })}>
                            Der gesuchte Benutzer existiert leider nicht.
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    const recipes = getRecipesByAuthor(resolvedParams.id);
    const activities = getUserActivities(resolvedParams.id);

    return <UserProfileClient user={user} recipes={recipes} activities={activities} />;
}
