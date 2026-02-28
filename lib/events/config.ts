type BaseRecipeEvent = {
    recipeId: string;
    recipeTitle: string;
};

type RecipeRatedEvent = BaseRecipeEvent & {
    rating: number;
};

type RecipeCookedEvent = BaseRecipeEvent & {
    hasImage?: boolean;
    servings?: number;
    notes?: string;
};

type UserFollowedEvent = Record<string, never>;

type UserRegisteredEvent = {
    email: string;
    name?: string;
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    landingPage?: string;
};

type UserActivatedEvent = {
    email: string;
    name?: string;
};

export type EventDataMap = {
    recipeFavorited: BaseRecipeEvent;
    recipeUnfavorited: BaseRecipeEvent;
    recipeRated: RecipeRatedEvent;
    recipeCooked: RecipeCookedEvent;
    recipePublished: BaseRecipeEvent;
    userFollowed: UserFollowedEvent;
    userRegistered: UserRegisteredEvent;
    userActivated: UserActivatedEvent;
};

export type EventName = keyof EventDataMap;

type ActivityTypeValue =
    | 'RECIPE_FAVORITED'
    | 'RECIPE_UNFAVORITED'
    | 'RECIPE_RATED'
    | 'RECIPE_COOKED'
    | 'RECIPE_CREATED'
    | 'USER_FOLLOWED'
    | 'USER_REGISTERED'
    | 'USER_ACTIVATED';

type NotificationTypeValue =
    | 'NEW_FOLLOWER'
    | 'RECIPE_LIKE'
    | 'RECIPE_RATING'
    | 'RECIPE_COOKED'
    | 'RECIPE_PUBLISHED'
    | 'SYSTEM';

export type NotificationPreferenceKey =
    | 'notifyOnNewFollower'
    | 'notifyOnRecipeLike'
    | 'notifyOnRecipeComment'
    | 'notifyOnRecipeRating'
    | 'notifyOnRecipeCooked'
    | 'notifyOnRecipePublished'
    | 'notifyOnWeeklyPlanReminder'
    | 'notifyOnSystemMessages';

export const NOTIFICATION_PREFERENCE_DEFAULTS: Record<NotificationPreferenceKey, boolean> = {
    notifyOnNewFollower: true,
    notifyOnRecipeLike: true,
    notifyOnRecipeComment: true,
    notifyOnRecipeRating: true,
    notifyOnRecipeCooked: true,
    notifyOnRecipePublished: true,
    notifyOnWeeklyPlanReminder: true,
    notifyOnSystemMessages: true,
};

export type NotificationProfile = Partial<Record<NotificationPreferenceKey, boolean>> & {
    showInActivity?: boolean;
    notifyOnAnonymous?: boolean;
};

export type NotificationContext<T extends EventName> = {
    actorLabel: string;
    actorAnonymized: boolean;
    actorId: string;
    data: EventDataMap[T];
    recipientId?: string;
    recipientProfile?: NotificationProfile | null;
};

type ActivityDefinition<T extends EventName> = {
    type: ActivityTypeValue;
    targetType: 'recipe' | 'user';
    getTargetId: (context: NotificationContext<T>) => string | undefined;
    getMetadata?: (context: NotificationContext<T>) => Record<string, unknown> | undefined;
};

export type NotificationDefinition<T extends EventName> = {
    type: NotificationTypeValue;
    preference: NotificationPreferenceKey;
    template: (context: NotificationContext<T>) => { title: string; message: string };
    getData?: (context: NotificationContext<T>) => Record<string, unknown> | undefined;
};

type TrackingDefinition<T extends EventName> = {
    name: string;
    getProperties?: (
        context: NotificationContext<T>,
    ) => Record<string, string | number | boolean> | undefined;
};

type EventDefinition<T extends EventName> = {
    activity: ActivityDefinition<T>;
    notification?: NotificationDefinition<T>;
    tracking?: TrackingDefinition<T>;
};

type EventDefinitionsMap = {
    [K in EventName]: EventDefinition<K>;
};

export const EVENT_DEFINITIONS: EventDefinitionsMap = {
    recipeFavorited: {
        activity: {
            type: 'RECIPE_FAVORITED',
            targetType: 'recipe',
            getTargetId: (context) => context.data.recipeId,
        },
        notification: {
            type: 'RECIPE_LIKE',
            preference: 'notifyOnRecipeLike',
            template: ({ actorLabel, data }) => ({
                title: 'Neues Lieblingsrezept',
                message: `${actorLabel} hat ${data.recipeTitle} gespeichert`,
            }),
            getData: ({ actorId, data }) => ({ recipeId: data.recipeId, actorId }),
        },
        tracking: {
            name: 'favorite',
            getProperties: ({ data }) => ({ recipeId: data.recipeId }),
        },
    },
    recipeUnfavorited: {
        activity: {
            type: 'RECIPE_UNFAVORITED',
            targetType: 'recipe',
            getTargetId: (context) => context.data.recipeId,
        },
    },
    recipeRated: {
        activity: {
            type: 'RECIPE_RATED',
            targetType: 'recipe',
            getTargetId: (context) => context.data.recipeId,
            getMetadata: (context) => ({ rating: context.data.rating }),
        },
        notification: {
            type: 'RECIPE_RATING',
            preference: 'notifyOnRecipeRating',
            template: ({ actorLabel, data }) => ({
                title: 'Neue Rezeptbewertung',
                message: `${actorLabel} hat ${data.rating}★ für ${data.recipeTitle} vergeben`,
            }),
            getData: ({ actorId, data }) => ({
                recipeId: data.recipeId,
                actorId,
                rating: data.rating,
            }),
        },
        tracking: {
            name: 'rate_recipe',
            getProperties: ({ data }) => ({ recipeId: data.recipeId, rating: data.rating }),
        },
    },
    recipeCooked: {
        activity: {
            type: 'RECIPE_COOKED',
            targetType: 'recipe',
            getTargetId: (context) => context.data.recipeId,
            getMetadata: (context) => ({
                hasImage: Boolean(context.data.hasImage),
                servings: context.data.servings,
                notes: context.data.notes,
            }),
        },
        notification: {
            type: 'RECIPE_COOKED',
            preference: 'notifyOnRecipeCooked',
            template: ({ actorLabel, data }) => ({
                title: 'Rezept gekocht',
                message: `${actorLabel} hat ${data.recipeTitle} gekocht${
                    data.hasImage ? ' und ein Foto geteilt' : ''
                }`,
            }),
            getData: ({ actorId, data }) => ({
                recipeId: data.recipeId,
                actorId,
                hasImage: Boolean(data.hasImage),
                servings: data.servings,
            }),
        },
        tracking: {
            name: 'cook_recipe',
            getProperties: ({ data }) => ({
                recipeId: data.recipeId,
                servings: data.servings ?? 1,
                hasImage: Boolean(data.hasImage),
            }),
        },
    },
    recipePublished: {
        activity: {
            type: 'RECIPE_CREATED',
            targetType: 'recipe',
            getTargetId: (context) => context.data.recipeId,
        },
        notification: {
            type: 'RECIPE_PUBLISHED',
            preference: 'notifyOnRecipePublished',
            template: ({ actorLabel, data }) => ({
                title: 'Neues Rezept veröffentlicht',
                message: `${actorLabel} hat ein neues Rezept veröffentlicht: ${data.recipeTitle}`,
            }),
            getData: ({ actorId, data }) => ({
                recipeId: data.recipeId,
                authorId: actorId,
            }),
        },
        tracking: {
            name: 'publish_recipe',
            getProperties: ({ data }) => ({ recipeId: data.recipeId }),
        },
    },
    userFollowed: {
        activity: {
            type: 'USER_FOLLOWED',
            targetType: 'user',
            getTargetId: (context) => context.recipientId,
        },
        notification: {
            type: 'NEW_FOLLOWER',
            preference: 'notifyOnNewFollower',
            template: ({ actorLabel }) => ({
                title: 'Neuer Follower',
                message: `${actorLabel} folgt dir jetzt`,
            }),
            getData: ({ actorId }) => ({ followerId: actorId }),
        },
        tracking: {
            name: 'follow',
            getProperties: ({ recipientId }) => ({ targetUserId: recipientId ?? '' }),
        },
    },
    userRegistered: {
        activity: {
            type: 'USER_REGISTERED',
            targetType: 'user',
            getTargetId: (context) => context.actorId,
            getMetadata: (context) => ({ email: context.data.email }),
        },
        notification: {
            type: 'SYSTEM',
            preference: 'notifyOnSystemMessages',
            template: () => ({
                title: 'Willkommen bei KüchenTakt!',
                message:
                    'Dein Konto wurde erfolgreich erstellt. Entdecke jetzt dein Dashboard und starte deine kulinarische Reise.',
            }),
            getData: () => ({
                link: '/dashboard',
                linkText: 'Zum Dashboard',
            }),
        },
        tracking: {
            name: 'user_registered',
            getProperties: ({ data }) => ({
                email: data.email,
                ...(data.referrer && { referrer: data.referrer }),
                ...(data.utmSource && { utm_source: data.utmSource }),
                ...(data.utmMedium && { utm_medium: data.utmMedium }),
                ...(data.utmCampaign && { utm_campaign: data.utmCampaign }),
                ...(data.utmTerm && { utm_term: data.utmTerm }),
                ...(data.utmContent && { utm_content: data.utmContent }),
                ...(data.landingPage && { landing_page: data.landingPage }),
            }),
        },
    },
    userActivated: {
        activity: {
            type: 'USER_ACTIVATED',
            targetType: 'user',
            getTargetId: (context) => context.actorId,
            getMetadata: (context) => ({ email: context.data.email }),
        },
        tracking: {
            name: 'user_activated',
            getProperties: ({ data }) => ({ email: data.email }),
        },
    },
};
