export function resolveNotificationHref(notification: {
    data: Record<string, unknown> | null;
    type: string;
}) {
    const data = notification.data ?? {};
    if (typeof data.recipeId === 'string') {
        return `/recipe/${data.recipeId}`;
    }
    if (notification.type === 'NEW_FOLLOWER' && typeof data.followerId === 'string') {
        return `/user/${data.followerId}`;
    }
    return '/notifications';
}
