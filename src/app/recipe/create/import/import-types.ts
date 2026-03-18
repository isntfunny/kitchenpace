export type ImportStep = 'url' | 'scraping' | 'analyzing' | 'preview' | 'edit';

export interface ProcessingStatus {
    step: ImportStep;
    message: string;
    progress: number;
    liveData?: {
        url?: string;
        markdownLength?: number;
        tokensUsed?: number;
        nodesFound?: number;
        edgesFound?: number;
    };
}

export interface StreamEvent {
    type: 'progress' | 'data' | 'error' | 'complete';
    message?: string;
    progress?: number;
    data?: Record<string, unknown>;
    timestamp?: string;
    detail?: string;
}
