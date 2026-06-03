'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as CookieConsent from 'vanilla-cookieconsent';

import 'vanilla-cookieconsent/dist/cookieconsent.css';

import { buildConsentConfig } from '@app/lib/consent/config';
import { disableReplay, enableReplay } from '@app/lib/consent/sentryReplay';
import { DEFAULT_CONSENT, type ConsentState } from '@app/lib/consent/types';

interface ConsentContextValue {
    /** Accepted categories, kept in sync with the banner. */
    categories: ConsentState;
    /** Reopen the preferences dialog (used by the footer link). */
    openSettings: () => void;
}

const ConsentContext = createContext<ConsentContextValue>({
    categories: DEFAULT_CONSENT,
    openSettings: () => {},
});

/** Read accepted categories from the consent banner for tracker gating. */
export function useConsent(): ConsentContextValue {
    return useContext(ConsentContext);
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
    const [categories, setCategories] = useState<ConsentState>(DEFAULT_CONSENT);
    const started = useRef(false);

    const sync = useCallback(() => {
        const next: ConsentState = {
            necessary: true,
            analytics: CookieConsent.acceptedCategory('analytics'),
            monitoring: CookieConsent.acceptedCategory('monitoring'),
            support: CookieConsent.acceptedCategory('support'),
        };
        setCategories(next);

        if (next.monitoring) {
            enableReplay();
        } else {
            disableReplay();
        }
    }, []);

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        void CookieConsent.run(buildConsentConfig(sync));
    }, [sync]);

    const openSettings = useCallback(() => {
        void CookieConsent.showPreferences();
    }, []);

    return (
        <ConsentContext.Provider value={{ categories, openSettings }}>
            {children}
        </ConsentContext.Provider>
    );
}
