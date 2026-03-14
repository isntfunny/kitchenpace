type AuthLogLevel = 'debug' | 'info' | 'warn' | 'error';

type OAuthUser = {
    id: string;
    email?: string | null;
    name?: string | null;
};

type OAuthUserPrismaClient = {
    user: {
        update: (args: {
            where: { id: string };
            data: { isActive: boolean; activationToken: null };
        }) => Promise<unknown>;
    };
};

type OAuthUserRegistrationDeps = {
    prismaClient: OAuthUserPrismaClient;
    ensureProfile: (userId: string) => Promise<unknown>;
    emitUserRegistered: (payload: {
        event: 'userRegistered';
        actorId: string;
        recipientId: string;
        data: {
            email: string;
            name?: string;
        };
    }) => Promise<unknown>;
    log?: (level: AuthLogLevel, message: string, meta?: Record<string, unknown>) => void;
};

export async function initializeOAuthUserRegistration(
    user: OAuthUser,
    deps: OAuthUserRegistrationDeps,
) {
    await deps.prismaClient.user.update({
        where: { id: user.id },
        data: { isActive: true, activationToken: null },
    });

    await deps.ensureProfile(user.id);

    await deps.emitUserRegistered({
        event: 'userRegistered',
        actorId: user.id,
        recipientId: user.id,
        data: {
            email: user.email ?? '',
            name: user.name ?? undefined,
        },
    });

    deps.log?.('info', 'initializeOAuthUserRegistration: completed', {
        userId: user.id,
        email: user.email ?? null,
    });
}
