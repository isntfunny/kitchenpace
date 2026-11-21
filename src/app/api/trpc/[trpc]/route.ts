import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

import { createTRPCContext } from '@app/trpc/init';
import { appRouter } from '@app/trpc/routers/_app';
import { recordError } from '@shared/telemetry/tracing';

const handler = (req: Request) =>
    fetchRequestHandler({
        endpoint: '/api/trpc',
        req,
        router: appRouter,
        createContext: () => createTRPCContext({ headers: req.headers }),
        onError({ error, path, type }) {
            if (error.code === 'INTERNAL_SERVER_ERROR') {
                recordError(
                    'trpc.error',
                    error,
                    {
                        ...(path ? { path } : {}),
                        type,
                    },
                    { module: 'trpc' },
                );
            }
        },
    });

export { handler as GET, handler as POST };
