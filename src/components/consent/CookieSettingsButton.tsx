'use client';

import * as CookieConsent from 'vanilla-cookieconsent';

import { css } from 'styled-system/css';

/**
 * Persistent entry point to reopen the consent preferences (Art. 7 Abs. 3
 * DSGVO — withdrawal must be as easy as consent). Rendered in the footer next
 * to Impressum/Datenschutz. Uses the global vanilla-cookieconsent API, which is
 * initialized by ConsentProvider on every page.
 */
export function CookieSettingsButton() {
    return (
        <button
            type="button"
            onClick={() => void CookieConsent.showPreferences()}
            className={css({
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: '0',
                font: 'inherit',
                color: 'text.muted',
                _hover: { color: 'palette.orange' },
                transition: 'color 0.15s',
            })}
        >
            Cookie-Einstellungen
        </button>
    );
}
