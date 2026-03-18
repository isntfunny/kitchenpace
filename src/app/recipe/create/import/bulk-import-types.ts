import type { AnalyzedRecipe } from './actions';

export type BulkStep = 'urls' | 'processing' | 'review' | 'done';

export type UrlStatus = 'pending' | 'scraping' | 'analyzing' | 'done' | 'error';

export interface BulkItem {
    url: string;
    status: UrlStatus;
    error?: string;
    recipe?: AnalyzedRecipe;
    /** Set after saving */
    savedId?: string;
    savedSlug?: string;
    /** Set if user skipped */
    skipped?: boolean;
}
