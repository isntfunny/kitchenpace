export function resolveNotificationHref(notification: {
    data: Record<string, unknown> | null;
    type: string;
}) {
    const data = notification.data ?? {};
    // Internal target set by the sender (e.g. meal plan reminders)
    if (typeof data.href === 'string' && /^\/(?!\/)/.test(data.href)) {
        return data.href;
    }
    if (typeof data.recipeSlug === 'string') {
        return `/recipe/${data.recipeSlug}`;
    }
    if (typeof data.recipeId === 'string') {
        return `/recipe/${data.recipeId}`;
    }
    if (notification.type === 'NEW_FOLLOWER' && typeof data.followerSlug === 'string') {
        return `/user/${data.followerSlug}`;
    }
    if (notification.type === 'NEW_FOLLOWER' && typeof data.followerId === 'string') {
        return `/user/${data.followerId}`;
    }
    return '/notifications';
}
