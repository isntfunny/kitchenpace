import { syncOpenSearch, syncRecipeToOpenSearch } from '@/trigger/jobs/opensearch';

export const trigger = {
    syncOpenSearch: async (payload: { batchSize?: number } = {}) => {
        return syncOpenSearch.trigger(payload);
    },

    syncRecipeToOpenSearch: async (recipeId: string) => {
        return syncRecipeToOpenSearch.trigger({ recipeId });
    },
};
