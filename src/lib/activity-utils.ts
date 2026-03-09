export type ActivityIconName =
    | 'edit3'
    | 'flame'
    | 'star'
    | 'message-square'
    | 'bookmark'
    | 'handshake'
    | 'shopping-cart'
    | 'calendar'
    | 'user-plus'
    | 'user-check';

export interface ActivityFeedItem {
    id: string;
    type: string;
    icon: ActivityIconName;
    iconBg: string;
    template: string;
    userName: string;
    userId?: string;
    userSlug?: string;
    recipeTitle?: string;
    recipeId?: string;
    recipeSlug?: string;
    detail?: string;
    timeAgo: string;
    createdAt: string;
    targetUserName?: string;
    targetUserId?: string;
    targetUserSlug?: string;
}

import { PALETTE } from './palette';

/** Template placeholders: {recipe} = linked recipe title, {target} = linked target user */
export const ACTIVITY_DECOR: Record<
    string,
    { icon: ActivityIconName; bg: string; template: string }
> = {
    RECIPE_CREATED: { icon: 'edit3', bg: PALETTE.purple, template: 'hat {recipe} erstellt' },
    RECIPE_COOKED: { icon: 'flame', bg: PALETTE.orange, template: 'hat {recipe} zubereitet' },
    RECIPE_RATED: { icon: 'star', bg: PALETTE.gold, template: 'hat {recipe} bewertet' },
    RECIPE_COMMENTED: {
        icon: 'message-square',
        bg: PALETTE.pink,
        template: 'hat {recipe} kommentiert',
    },
    RECIPE_FAVORITED: { icon: 'bookmark', bg: PALETTE.blue, template: 'hat {recipe} gespeichert' },
    USER_FOLLOWED: { icon: 'handshake', bg: PALETTE.emerald, template: 'hat {target} gefolgt' },
    USER_REGISTERED: { icon: 'user-plus', bg: PALETTE.emerald, template: 'hat sich registriert' },
    SHOPPING_LIST_CREATED: {
        icon: 'shopping-cart',
        bg: PALETTE.gold,
        template: 'hat eine Einkaufsliste erstellt',
    },
    MEAL_PLAN_CREATED: {
        icon: 'calendar',
        bg: PALETTE.purple,
        template: 'hat einen Essensplan erstellt',
    },
};

export function formatTimeAgo(
    date: Date | string,
    options?: { prefix?: boolean; fallbackToDate?: boolean },
): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const diff = Date.now() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const p = options?.prefix;

    if (minutes < 1) return p ? 'Gerade eben' : 'Jetzt';
    if (minutes < 60) return p ? `Vor ${minutes} Min.` : `${minutes} Min.`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return p ? `Vor ${hours} Std.` : `${hours} Std.`;
    const days = Math.floor(hours / 24);
    if (options?.fallbackToDate && days >= 7) {
        return d.toLocaleDateString('de-DE', { dateStyle: 'medium' });
    }
    if (p) return `Vor ${days} Tag${days === 1 ? '' : 'en'}`;
    return `${days} Tg.`;
}

export interface UserWithProfile {
    id: string;
    name: string | null;
    profile?: { nickname: string; slug: string; showInActivity?: boolean } | null;
}

/** Shared mapper: converts a single ActivityLog row into an ActivityFeedItem */
export function mapLogToFeedItem(
    log: {
        id: string;
        userId: string;
        type: string;
        targetType: string | null;
        targetId: string | null;
        metadata: unknown;
        createdAt: Date;
    },
    userMap: Map<string, UserWithProfile>,
    recipeMap: Map<string, { id: string; title: string; slug: string }>,
    targetUserMap: Map<string, UserWithProfile>,
    options?: { respectShowInActivity?: boolean },
): ActivityFeedItem | null {
    const base = ACTIVITY_DECOR[log.type];
    if (!base) return null;

    const user = userMap.get(log.userId);
    const recipeId = log.targetType === 'recipe' ? log.targetId : null;
    const recipe = recipeId ? recipeMap.get(recipeId) : null;

    let template = base.template;
    let targetUserName: string | undefined;
    let targetUserId: string | undefined;
    let targetUserSlug: string | undefined;

    if (log.type === 'USER_FOLLOWED' && log.targetId) {
        const targetUser = targetUserMap.get(log.targetId);
        if (options?.respectShowInActivity && targetUser?.profile?.showInActivity === false) {
            template = 'hat jemandem gefolgt';
        } else {
            targetUserName = targetUser?.name || targetUser?.profile?.nickname || undefined;
            if (!targetUserName) template = 'hat jemandem gefolgt';
            targetUserId = targetUser?.id;
            targetUserSlug = targetUser?.profile?.slug ?? targetUserId;
        }
    }

    return {
        id: log.id,
        type: log.type,
        icon: base.icon,
        iconBg: base.bg,
        template,
        userName: user?.name || user?.profile?.nickname || 'Küchenfreund',
        userId: user?.id,
        userSlug: user?.profile?.slug ?? user?.id,
        recipeTitle: recipe?.title,
        recipeId: recipe?.id,
        recipeSlug: recipe?.slug,
        detail: log.metadata ? JSON.stringify(log.metadata) : undefined,
        timeAgo: formatTimeAgo(log.createdAt),
        createdAt: log.createdAt.toISOString(),
        targetUserName,
        targetUserId,
        targetUserSlug,
    };
}
