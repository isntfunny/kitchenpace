'use client';

import { IdentifyComponent, OpenPanelComponent } from '@openpanel/nextjs';

import { useConsent } from '@app/components/providers/ConsentProvider';

interface IdentifyProps {
    profileId: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    properties?: Record<string, unknown>;
}

interface AnalyticsScriptsProps {
    clientId: string;
    globalProperties: Record<string, unknown>;
    identify: IdentifyProps | null;
}

/**
 * OpenPanel analytics, gated behind the "analytics" consent category. The
 * @openpanel/nextjs components inject op1.js on mount, so they are only
 * rendered after opt-in — nothing is fetched pre-consent, and revoking consent
 * unmounts them.
 */
export function AnalyticsScripts({ clientId, globalProperties, identify }: AnalyticsScriptsProps) {
    const { categories } = useConsent();

    if (!clientId || !categories.analytics) return null;

    return (
        <>
            <OpenPanelComponent
                clientId={clientId}
                apiUrl="/api/op"
                cdnUrl="/api/op/op1.js"
                trackScreenViews={true}
                trackAttributes={true}
                waitForProfile={Boolean(identify)}
                globalProperties={globalProperties}
            />
            {identify && <IdentifyComponent {...identify} />}
        </>
    );
}
