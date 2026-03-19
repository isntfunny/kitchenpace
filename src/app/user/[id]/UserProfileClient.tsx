'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import type { ActivityFeedItem } from '@app/app/actions/community';
import { toggleFollowAction } from '@app/app/actions/social';
import type { EarnedTrophy } from '@app/components/features/TrophySection';
import { useFeatureFlag } from '@app/components/providers/FeatureFlagsProvider';

import { css } from 'styled-system/css';

import { ProfileActivitySidebar } from './components/ProfileActivitySidebar';
import { ProfileHeader } from './components/ProfileHeader';
import { ProfileRecipeGrid } from './components/ProfileRecipeGrid';
import { ProfileTwitchSection } from './components/ProfileTwitchSection';

// ── Shared Types ────────────────────────────────────────────────────────

export interface UserProfileRecipe {
    id: string;
    slug: string;
    title: string;
    description: string;
    image: string | null;
    category: string;
    rating: number;
    prepTime: number;
    cookTime: number;
}

export interface UserProfileData {
    id: string;
    slug: string;
    name: string;
    avatar: string | null;
    bio: string | null;
    recipeCount: number;
    followerCount: number;
    showFollowerCount?: boolean;
    showFavorites?: boolean;
    showCooked?: boolean;
    recipes: UserProfileRecipe[];
    favorites?: UserProfileRecipe[];
    cooked?: UserProfileRecipe[];
    activities: ActivityFeedItem[];
    trophies?: EarnedTrophy[];
    currentPage?: number;
    totalPages?: number;
    twitchUsername?: string | null;
    twitchStream?: {
        isLive: boolean;
        title: string | null;
    } | null;
    nextPlannedStream?: {
        plannedAt: string | null;
        plannedTimezone: string | null;
        recipe: { title: string; slug: string };
    } | null;
}

interface UserProfileClientProps {
    user: UserProfileData;
    viewer?: {
        id: string;
        isSelf: boolean;
        isFollowing: boolean;
    };
}

// ── Main Component ──────────────────────────────────────────────────────

const SIMULATE_TWITCH_CHANNEL = 'twitchfarming';

export function UserProfileClient({ user, viewer }: UserProfileClientProps) {
    const router = useRouter();
    const simulateLive = useFeatureFlag('simulateTwitchLive');
    const { recipes, activities } = user;
    const [followerTotal, setFollowerTotal] = useState(user.followerCount);
    const [isFollowing, setIsFollowing] = useState(viewer?.isFollowing ?? false);
    const [isPending, startTransition] = useTransition();
    const viewerId = viewer?.id ?? null;
    const showFollowButton = !viewer?.isSelf;

    const requireAuth = () => {
        if (viewerId) {
            return true;
        }
        const callback = typeof window !== 'undefined' ? window.location.pathname : '/profile';
        router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callback)}`);
        return false;
    };

    const handleFollowToggle = () => {
        if (!showFollowButton) return;
        if (!requireAuth()) return;

        startTransition(async () => {
            try {
                const result = await toggleFollowAction(user.id);
                setIsFollowing(result.isFollowing);
                setFollowerTotal(result.followerCount);
            } catch (error) {
                console.error(error);
            }
        });
    };

    const effectiveIsLive = simulateLive || (user.twitchStream?.isLive ?? false);
    const effectiveTwitchUsername = simulateLive
        ? (user.twitchUsername ?? SIMULATE_TWITCH_CHANNEL)
        : user.twitchUsername;
    const showTwitchSection = effectiveTwitchUsername && (user.twitchStream || simulateLive);

    return (
        <div id="user-profile-page">
            {/* Hero Banner */}
            <ProfileHeader
                user={user}
                recipes={recipes}
                followerTotal={followerTotal}
                isFollowing={isFollowing}
                isPending={isPending}
                showFollowButton={showFollowButton}
                isSelf={viewer?.isSelf ?? false}
                isLive={effectiveIsLive}
                onFollowToggle={handleFollowToggle}
            />

            {/* Twitch Section */}
            {showTwitchSection && (
                <div
                    className={css({
                        px: { base: '4', md: '6' },
                        pt: '4',
                        maxW: '1600px',
                        mx: 'auto',
                    })}
                >
                    <ProfileTwitchSection
                        twitchUsername={effectiveTwitchUsername!}
                        isLive={effectiveIsLive}
                        streamTitle={user.twitchStream?.title}
                        nextRecipeTitle={user.nextPlannedStream?.recipe.title}
                        nextRecipeSlug={user.nextPlannedStream?.recipe.slug}
                        plannedAt={user.nextPlannedStream?.plannedAt}
                        plannedTimezone={user.nextPlannedStream?.plannedTimezone}
                    />
                </div>
            )}

            {/* Main Content */}
            <main
                className={css({
                    width: '100%',
                    px: { base: '4', md: '6' },
                    py: { base: '6', md: '8' },
                })}
            >
                <div
                    className={css({
                        display: 'grid',
                        gridTemplateColumns: { base: '1fr', lg: '1fr 320px' },
                        gap: { base: '8', lg: '10' },
                        maxW: '1600px',
                        mx: 'auto',
                    })}
                >
                    {/* Recipes Section */}
                    <ProfileRecipeGrid user={user} recipes={recipes} />

                    {/* Activity Sidebar */}
                    <ProfileActivitySidebar activities={activities} trophies={user.trophies} />
                </div>
            </main>
        </div>
    );
}
