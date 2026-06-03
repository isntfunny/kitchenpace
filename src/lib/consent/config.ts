import type { CookieConsentConfig } from 'vanilla-cookieconsent';

import { CONSENT_REVISION } from './types';

/**
 * Builds the vanilla-cookieconsent configuration. The visual styling is driven
 * entirely by the --cc-* CSS variables wired to our Panda tokens in
 * globals.css (light + [data-theme="dark"]), so this only declares behaviour,
 * categories and the German microcopy.
 *
 * @param onUpdate fired on first consent, on every load with stored consent,
 *                 and on every change — the single place to mirror state into
 *                 React and (de)activate the gated trackers.
 */
export function buildConsentConfig(onUpdate: () => void): CookieConsentConfig {
    return {
        revision: CONSENT_REVISION,

        guiOptions: {
            consentModal: {
                layout: 'box',
                position: 'middle center',
                equalWeightButtons: true,
                flipButtons: false,
            },
            preferencesModal: {
                layout: 'box',
                position: 'right',
                equalWeightButtons: true,
                flipButtons: false,
            },
        },

        categories: {
            necessary: { enabled: true, readOnly: true },
            analytics: {},
            monitoring: {},
            support: {},
        },

        onFirstConsent: onUpdate,
        onConsent: onUpdate,
        onChange: onUpdate,

        language: {
            default: 'de',
            translations: {
                de: {
                    consentModal: {
                        title: 'Wir respektieren deine Privatsphäre',
                        description:
                            'Wir verwenden notwendige Cookies, damit KochTakt funktioniert. Zusätzlich möchten wir mit deiner Einwilligung die Nutzung analysieren, Fehler eingrenzen und einen Support-Chat anbieten. Du entscheidest frei und kannst deine Auswahl jederzeit über „Cookie-Einstellungen" im Seitenfuß ändern. Mehr dazu in unserer <a href="/datenschutz">Datenschutzerklärung</a>.',
                        acceptAllBtn: 'Alle akzeptieren',
                        acceptNecessaryBtn: 'Nur notwendige',
                        showPreferencesBtn: 'Einstellungen',
                    },
                    preferencesModal: {
                        title: 'Cookie-Einstellungen',
                        acceptAllBtn: 'Alle akzeptieren',
                        acceptNecessaryBtn: 'Nur notwendige',
                        savePreferencesBtn: 'Auswahl speichern',
                        closeIconLabel: 'Schließen',
                        sections: [
                            {
                                title: 'Deine Privatsphäre',
                                description:
                                    'Du entscheidest, welche optionalen Funktionen aktiv sind. Notwendige Cookies sind für den Betrieb erforderlich und immer aktiv. Alle anderen Kategorien sind standardmäßig deaktiviert und werden erst nach deiner Einwilligung geladen. Du kannst deine Auswahl jederzeit ändern.',
                            },
                            {
                                title: 'Notwendig',
                                description:
                                    'Erforderlich für Anmeldung, Sitzungsverwaltung, Sicherheit (Spam- und Bot-Schutz) und das Speichern deiner Anzeige-Einstellungen. Ohne diese funktioniert die Website nicht. Rechtsgrundlage: § 25 Abs. 2 Nr. 2 TDDDG.',
                                linkedCategory: 'necessary',
                            },
                            {
                                title: 'Analyse',
                                description:
                                    'Hilft uns zu verstehen, wie KochTakt genutzt wird (Seitenaufrufe, Interaktionen), um das Angebot zu verbessern. Wird auf eigener Infrastruktur in Deutschland betrieben.',
                                linkedCategory: 'analytics',
                            },
                            {
                                title: 'Fehler- & Sitzungsaufzeichnung',
                                description:
                                    'Erfasst technische Fehler und zeichnet stichprobenartig Sitzungsverläufe auf, um Probleme schneller zu beheben. Reines Fehler-Reporting läuft auch ohne diese Einwilligung; erst mit ihr kommen Sitzungsaufzeichnung und erweiterte Diagnosedaten hinzu.',
                                linkedCategory: 'monitoring',
                            },
                            {
                                title: 'Support-Chat',
                                description:
                                    'Lädt unseren Support-Chat, über den du uns direkt erreichst. Dabei werden Verbindungsdaten und – wenn du angemeldet bist – dein Profilbezug an den Chat übergeben.',
                                linkedCategory: 'support',
                            },
                        ],
                    },
                },
            },
        },
    };
}
