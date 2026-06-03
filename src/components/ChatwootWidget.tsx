'use client';

import Script from 'next/script';
import { useEffect } from 'react';

import { useConsent } from '@app/components/providers/ConsentProvider';

interface ChatwootUser {
    id: string;
    name?: string;
    email?: string;
    identifierHash?: string;
}

interface ChatwootWidgetProps {
    user?: ChatwootUser | null;
}

type ChatwootApi = {
    reset?: () => void;
    toggleBubbleVisibility?: (state: 'show' | 'hide') => void;
};

/**
 * Chatwoot live-chat widget, gated behind the "support" consent category. The
 * remote SDK (support.tecfriends.de/packs/js/sdk.js) is only injected after the
 * user opts into support. On revoke we best-effort reset the session and hide
 * the bubble (a full unload requires a page reload).
 */
export function ChatwootWidgetComponent({ user }: ChatwootWidgetProps) {
    const { categories } = useConsent();

    useEffect(() => {
        if (categories.support) return;
        const api = (window as unknown as { $chatwoot?: ChatwootApi }).$chatwoot;
        try {
            api?.reset?.();
            api?.toggleBubbleVisibility?.('hide');
        } catch {
            // widget not loaded yet — nothing to clean up
        }
    }, [categories.support]);

    if (!categories.support) return null;

    const userScript = user
        ? `
                window.addEventListener('chatwoot:ready', function() {
                    window.$chatwoot.setUser(${JSON.stringify(user.id)}, {
                        ${user.name ? `name: ${JSON.stringify(user.name)},` : ''}
                        ${user.email ? `email: ${JSON.stringify(user.email)},` : ''}
                        ${user.identifierHash ? `identifier_hash: ${JSON.stringify(user.identifierHash)},` : ''}
                    });
                });`
        : '';

    return (
        <Script id="chatwoot-init" strategy="afterInteractive">
            {`
                window.chatwootSettings = {"position":"right","type":"standard","launcherTitle":"Chatten Sie mit uns"};
                (function(d,t){
                    var BASE_URL="https://support.tecfriends.de";
                    var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
                    g.src=BASE_URL+"/packs/js/sdk.js";
                    g.defer=true;g.async=true;
                    s.parentNode.insertBefore(g,s);
                    g.onload=function(){window.chatwootSDK.run({websiteToken:"dLTD67hVUwRWU9TRVstPsjBD",baseUrl:BASE_URL})}
                })(document,"script");
                ${userScript}
            `}
        </Script>
    );
}
