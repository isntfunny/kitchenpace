import type { AnalyzedRecipe } from './actions';

export type BulkStep = 'urls' | 'processing' | 'review' | 'done';

export type UrlStatus = 'pending' | 'scraping' | 'scraped' | 'analyzing' | 'done' | 'error';

export interface BulkItem {
    url: string;
    status: UrlStatus;
    error?: string;
    /** Raw markdown from scraper (stored after scraping, before AI analysis) */
    scrapedMarkdown?: string;
    /** Image URL from scraper */
    scrapedImageUrl?: string;
    recipe?: AnalyzedRecipe;
    /** Set after saving */
    savedId?: string;
    savedSlug?: string;
    /** Set if user skipped */
    skipped?: boolean;
}
