/**
 * Lightweight, shared type for displaying a user in cards, avatars, and spotlights.
 * Use this instead of creating one-off interfaces with the same fields.
 */
export interface UserCardData {
    /** User ID */
    id: string;
    /** Profile slug (for links) */
    slug: string;
    /** Display name */
    name: string;
    /** S3 photo key for avatar */
    photoKey?: string | null;
    /** Short bio / teaser */
    bio?: string | null;
    /** Highest trophy tier (e.g. 'BRONZE', 'GOLD') */
    trophyTier?: string | null;
    /** Published recipe count */
    recipeCount: number;
    /** Follower count */
    followerCount: number;
}
