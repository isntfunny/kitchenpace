/**
 * Shared user display helpers.
 *
 * Profile.nickname is the canonical display name — User.name is a stale
 * NextAuth field that is never synced after registration.
 */

type UserWithOptionalProfile = {
    id: string;
    name?: string | null;
    image?: string | null;
    profile?: {
        nickname?: string | null;
        photoUrl?: string | null;
        slug?: string | null;
        bio?: string | null;
        recipeCount?: number;
        followerCount?: number;
    } | null;
};

export function getUserDisplayName(
    user: Pick<UserWithOptionalProfile, 'profile'>,
): string {
    return user.profile?.nickname ?? 'Unbekannt';
}

export function getUserAvatarUrl(userId: string): string {
    return `/api/thumbnail?type=user&id=${encodeURIComponent(userId)}`;
}

export function getUserSlugOrId(
    user: Pick<UserWithOptionalProfile, 'id' | 'profile'>,
): string {
    return user.profile?.slug ?? user.id;
}

export function getInitials(name: string): string {
    return name.slice(0, 2).toUpperCase();
}

export interface FollowUser {
    id: string;
    name: string | null;
    nickname: string | null;
    avatar: string | null;
    bio: string | null;
    recipeCount: number;
    followerCount: number;
}

export function mapUserToFollowDisplay(user: UserWithOptionalProfile): FollowUser {
    return {
        id: user.id,
        name: user.name ?? null,
        nickname: user.profile?.nickname ?? null,
        avatar: user.profile?.photoUrl ?? user.image ?? null,
        bio: user.profile?.bio ?? null,
        recipeCount: user.profile?.recipeCount ?? 0,
        followerCount: user.profile?.followerCount ?? 0,
    };
}
