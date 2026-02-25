import { Metadata } from 'next';

import { PageShell } from '@/components/layouts/PageShell';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { css } from 'styled-system/css';
import { container } from 'styled-system/patterns';

import { UserProfileClient, type UserProfileData } from './UserProfileClient';

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

async function getUserProfile(userId: string): Promise<UserProfileData | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            profile: true,
            recipes: {
                where: { publishedAt: { not: null } },
                orderBy: { createdAt: 'desc' },
                take: 12,
                select: {
                    id: true,
                    title: true,
                    description: true,
                    imageUrl: true,
                    rating: true,
                    prepTime: true,
                    cookTime: true,
                    category: {
                        select: { name: true },
                    },
                },
            },
            activities: {
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: {
                    id: true,
                    type: true,
                    createdAt: true,
                    targetId: true,
                    targetType: true,
                    metadata: true,
                },
            },
        },
    });

    if (!user) return null;

    // Fetch recipe details for recipe-related activities
    const recipeIds = user.activities
        .filter((a) => a.targetType === 'recipe' && a.targetId)
        .map((a) => a.targetId as string);

    const recipes =
        recipeIds.length > 0
            ? await prisma.recipe.findMany({
                  where: { id: { in: recipeIds } },
                  select: { id: true, title: true, slug: true },
              })
            : [];

    const recipeMap = new Map(recipes.map((r) => [r.id, r]));

    // Format time ago on server side
    const formatTimeAgo = (date: Date): string => {
        const diff = Date.now() - new Date(date).getTime();
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return 'Jetzt';
        if (minutes < 60) return `${minutes} Min.`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} Std.`;
        const days = Math.floor(hours / 24);
        return `${days} Tg.`;
    };

    return {
        id: user.id,
        name: user.name ?? user.profile?.nickname ?? 'Unbekannt',
        avatar: user.profile?.photoUrl ?? user.image ?? null,
        bio: user.profile?.bio ?? null,
        recipeCount: user.profile?.recipeCount ?? user.recipes.length,
        followerCount: user.profile?.followerCount ?? 0,
        recipes: user.recipes.map((recipe) => ({
            id: recipe.id,
            title: recipe.title,
            description: recipe.description ?? '',
            image:
                recipe.imageUrl ??
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
            category: recipe.category?.name ?? 'Allgemein',
            rating: recipe.rating ?? 0,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
        })),
        activities: user.activities.map((activity) => {
            const recipe = activity.targetId ? recipeMap.get(activity.targetId) : null;
            return {
                id: activity.id,
                type: activity.type,
                timeAgo: formatTimeAgo(activity.createdAt),
                targetId: activity.targetId,
                targetType: activity.targetType,
                recipeTitle: recipe?.title ?? null,
                recipeSlug: recipe?.slug ?? null,
                metadata: activity.metadata as Record<string, unknown> | null,
            };
        }),
    };
}

export async function generateMetadata({ params }: UserProfileProps): Promise<Metadata> {
    const resolvedParams = await params;
    const user = await getUserProfile(resolvedParams.id);
    if (!user) {
        return {
            title: 'Benutzer nicht gefunden | KüchenTakt',
        };
    }
    return buildUserMetadata(user.name);
}

export default async function UserProfilePage({ params }: UserProfileProps) {
    const resolvedParams = await params;
    const [session, user] = await Promise.all([
        getServerAuthSession('user-profile-page'),
        getUserProfile(resolvedParams.id),
    ]);

    if (!user) {
        return (
            <PageShell>
                <div className={css({ minH: '100vh', color: 'text' })}>
                    <main className={container({ maxW: '1400px', mx: 'auto', px: '4', py: '8' })}>
                        <div className={css({ textAlign: 'center', py: '20' })}>
                            <h1
                                className={css({ fontFamily: 'heading', fontSize: '3xl', mb: '4' })}
                            >
                                Benutzer nicht gefunden
                            </h1>
                            <p className={css({ color: 'text-muted' })}>
                                Der gesuchte Benutzer existiert leider nicht.
                            </p>
                        </div>
                    </main>
                </div>
            </PageShell>
        );
    }

    let viewer: { id: string; isSelf: boolean; isFollowing: boolean } | undefined;

    if (session?.user?.id) {
        const viewerId = session.user.id;
        if (viewerId === user.id) {
            viewer = { id: viewerId, isSelf: true, isFollowing: false };
        } else {
            const follow = await prisma.follow.findUnique({
                where: {
                    followerId_followingId: {
                        followerId: viewerId,
                        followingId: user.id,
                    },
                },
            });
            viewer = { id: viewerId, isSelf: false, isFollowing: Boolean(follow) };
        }
    }

    return (
        <PageShell>
            <UserProfileClient user={user} viewer={viewer} />
        </PageShell>
    );
}
