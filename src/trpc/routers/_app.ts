import { router } from '../init';

import { filtersRouter } from './filters';

export const appRouter = router({
    filters: filtersRouter,
});

export type AppRouter = typeof appRouter;
