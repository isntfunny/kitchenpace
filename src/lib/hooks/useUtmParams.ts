'use client';

import { useMemo } from 'react';

export type UtmParams = {
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    landingPage?: string;
};

/**
 * Hook to capture UTM parameters and referrer from URL
 * Captures on first render and persists for the session
 */
export function useUtmParams(): UtmParams {
    return useMemo(() => {
        if (typeof window === 'undefined') return {};

        const urlParams = new URLSearchParams(window.location.search);

        return {
            referrer: document.referrer || undefined,
            utmSource: urlParams.get('utm_source') || undefined,
            utmMedium: urlParams.get('utm_medium') || undefined,
            utmCampaign: urlParams.get('utm_campaign') || undefined,
            utmTerm: urlParams.get('utm_term') || undefined,
            utmContent: urlParams.get('utm_content') || undefined,
            landingPage: window.location.pathname + window.location.search,
        };
    }, []);
}
