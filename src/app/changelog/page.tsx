import { Metadata } from 'next';

import { PageShell } from '@app/components/layouts/PageShell';

import { css } from 'styled-system/css';

import { FadeIn, ScaleIn } from './animations';

export const metadata: Metadata = {
    title: 'Changelog — KüchenTakt',
    description: 'Was gibt es Neues bei KüchenTakt?',
};

type ChangelogItem = {
    text: string;
    tag?: 'spotlight' | 'feat' | 'fix';
};

type ChangelogEntry = {
    date: string;
    version?: string;
    title: string;
    emoji?: string;
    items: ChangelogItem[];
};

const TAG_STYLES: Record<string, { label: string; bg: string }> = {
    spotlight: { label: 'Spotlight', bg: 'linear-gradient(135deg, #e07b53, #f8b500)' },
    feat: { label: 'Neu', bg: '#00b894' },
    fix: { label: 'Fix', bg: '#636e72' },
};

const CHANGELOG: ChangelogEntry[] = [
    {
        date: '19. März 2026',
        version: 'v2026-03-19',
        emoji: '🎬',
        title: 'Twitch-Live, ähnliche Rezepte & neues Theme',
        items: [
            {
                text: 'Twitch-Integration — verbinde deinen Twitch-Account und zeige Live-Streams und geplante Koch-Sessions auf deinem Profil',
                tag: 'spotlight',
            },
            {
                text: 'Ähnliche Rezepte — unter jedem Rezept erscheinen jetzt passende Vorschläge, die wirklich zum Gericht passen',
                tag: 'spotlight',
            },
            {
                text: 'Live-Banner auf der Startseite, wenn jemand gerade auf Twitch kocht',
                tag: 'feat',
            },
            {
                text: 'Twitch-Chat direkt neben dem Stream eingeblendet',
                tag: 'feat',
            },
            {
                text: 'Geplante Streams können mit Rezepten verknüpft und inline bearbeitet werden',
                tag: 'feat',
            },
            {
                text: 'Lila Live-Ring am Avatar, wenn ein Koch gerade streamt',
                tag: 'feat',
            },
            {
                text: 'Neues Retro-Theme als alternative Farbwelt',
                tag: 'feat',
            },
            {
                text: 'Rezeptsuche findet jetzt auch Treffer mitten im Wort, nicht nur am Anfang',
                tag: 'fix',
            },
        ],
    },
    {
        date: '17. März 2026',
        version: 'v2026-03-17',
        emoji: '🧑‍🍳',
        title: 'Smartere Zutateneingabe & Rezept-Import',
        items: [
            {
                text: 'Intelligente Zutateneingabe — tippe z.B. "200g Spaghetti" und Menge, Einheit und Zutat werden automatisch erkannt',
                tag: 'spotlight',
            },
            {
                text: 'Zutaten per Drag-and-Drop umsortieren',
                tag: 'spotlight',
            },
            {
                text: 'Zutat ersetzen — klicke auf den Namen einer Zutat und suche einen Ersatz, ohne Menge und Notizen zu verlieren',
                tag: 'feat',
            },
            {
                text: 'Suchergebnisse zeigen jetzt farbig hervor, warum ein Treffer gefunden wurde',
                tag: 'feat',
            },
            {
                text: 'Besseres Matching — "Hackfleisch" findet jetzt auch "Hackfleisch, Gehacktes"',
                tag: 'feat',
            },
            {
                text: 'In der Schritt-Beschreibung kannst du mit @Zutat jetzt auch neue Zutaten anlegen, nicht nur bestehende verknüpfen',
                tag: 'feat',
            },
            {
                text: 'Rezepte von YouTube und anderen Webseiten importieren — mit automatischer Bilderkennung',
                tag: 'feat',
            },
            {
                text: 'Originalquelle wird beim Import gespeichert und auf der Rezeptseite angezeigt',
                tag: 'feat',
            },
            {
                text: 'Verbindungslinien im Kochablauf weichen jetzt automatisch um Schritte herum aus, statt sie zu überdecken',
                tag: 'feat',
            },
            {
                text: 'Zutaten-Chips unter jedem Schritt im Desktop-Viewer zeigen auf einen Blick, was gebraucht wird',
                tag: 'feat',
            },
            {
                text: 'Tippfehler bei der Zutatensuche werden jetzt besser erkannt und korrigiert',
                tag: 'fix',
            },
            {
                text: 'Enter-Taste im Ersetzen-Dialog schliesst nicht mehr versehentlich das Formular',
                tag: 'fix',
            },
        ],
    },
    {
        date: '16. März 2026',
        version: 'v2026-03-16',
        emoji: '🥦',
        title: 'Nährwerte & neue Kategorien',
        items: [
            {
                text: 'Nährwerte — Rezepte zeigen jetzt automatisch berechnete Kalorien und Nährstoffe pro Zutat',
                tag: 'spotlight',
            },
            {
                text: 'Neue Kategorien — Rezepte werden nach einer verbesserten Lebensmittel-Hierarchie eingeteilt',
                tag: 'spotlight',
            },
            {
                text: 'Tutorial-Abschluss führt direkt zum Flammkuchen-Showcase-Rezept',
                tag: 'feat',
            },
            {
                text: 'Fehlermeldung statt leerer Seite, wenn Berechtigungen fehlen',
                tag: 'fix',
            },
        ],
    },
    {
        date: '15. März 2026',
        version: 'v2026-03-15',
        emoji: '🔑',
        title: 'Passkeys, neue Filter & Social Login',
        items: [
            {
                text: 'Passkey-Anmeldung — mit Fingerabdruck, Gesichtserkennung oder Sicherheitsschlüssel einloggen, ganz ohne Passwort',
                tag: 'spotlight',
            },
            {
                text: 'Erweiterte Filter — Rezepte jetzt nach Kategorie, Schrittanzahl und Kalorien filtern',
                tag: 'spotlight',
            },
            {
                text: 'Anmeldung mit Google und Discord — neben E-Mail jetzt auch mit bestehendem Konto einloggen',
                tag: 'spotlight',
            },
            {
                text: 'KI-Import erkennt das Hauptbild automatisch und lädt es zum Rezept hoch',
                tag: 'feat',
            },
            {
                text: 'Neue Konto-Seite — Profil, Passwort und aktive Sitzungen an einem Ort verwalten',
                tag: 'feat',
            },
            {
                text: 'Aktive Sitzungen einsehen und einzeln abmelden',
                tag: 'feat',
            },
            {
                text: 'Filter-Ergebnisse laden jetzt sanft nach — kein Aufblitzen mehr beim Wechseln',
                tag: 'fix',
            },
            {
                text: 'Profil wird bei erster Google- oder Discord-Anmeldung automatisch angelegt',
                tag: 'fix',
            },
        ],
    },
    {
        date: '14. März 2026',
        version: 'v2026-03-14',
        emoji: '🧑‍🍳',
        title: 'Trophäen, Tutorial & bessere Suche',
        items: [
            {
                text: 'Trophäen-System — Erfolge sammeln, Avatar-Trophäen auswählen und Feier-Animation bei neuen Errungenschaften',
                tag: 'spotlight',
            },
            {
                text: 'Geführtes Tutorial — Schritt-für-Schritt-Anleitung für die Rezepterstellung mit dynamischen Spotlights',
                tag: 'spotlight',
            },
            {
                text: 'Zutaten-Suche findet jetzt auch Pluralformen und Aliase — „Tomaten" findet „Tomate", „Erdäpfel" findet „Kartoffel"',
                tag: 'spotlight',
            },
            {
                text: 'Flow-Editor: Schritttyp und Titel sind jetzt einklappbar, (+)-Button dreht sich beim Öffnen',
                tag: 'feat',
            },
            {
                text: 'Rezept-Fortschritt im Koch-Modus wird gespeichert und beim Wiederöffnen wiederhergestellt',
                tag: 'feat',
            },
            {
                text: 'Zutaten werden beim Erstellen automatisch in die richtige Einzahlform gebracht',
                tag: 'feat',
            },
            {
                text: 'Impressum und Open-Source-Lizenzseite hinzugefügt',
                tag: 'feat',
            },
            {
                text: 'Tags können jetzt direkt per Enter-Taste erstellt werden',
                tag: 'feat',
            },
            {
                text: 'Zusammengesetzte Wörter werden bei der Suche nicht mehr fälschlich zerlegt',
                tag: 'fix',
            },
        ],
    },
    {
        date: '12. März 2026',
        version: 'v2026-03-12',
        emoji: '🚀',
        title: 'Rezeptsuche runderneuert',
        items: [
            {
                text: 'Rezeptsuche komplett überarbeitet — Sortierung, Grid- und Listen-Ansicht, schnelleres Laden',
                tag: 'spotlight',
            },
            {
                text: 'Rezeptkarten zeigen jetzt die Anzahl der Zubereitungsschritte und haben eine kompakte Listen-Variante',
                tag: 'feat',
            },
            {
                text: 'Zuletzt angesehen & Angepinnt laden jetzt deutlich schneller',
                tag: 'feat',
            },
            {
                text: 'Support-Chat erkennt eingeloggte Nutzer automatisch',
                tag: 'feat',
            },
            {
                text: 'Benachrichtigungen werden nicht mehr unnötig geladen wenn du ausgeloggt bist',
                tag: 'fix',
            },
        ],
    },
    {
        date: '11. März 2026',
        version: 'v2026-03-11.4',
        emoji: '🔧',
        title: 'Profilbilder & Performance',
        items: [
            {
                text: 'Profilbilder in „Chef des Monats" und auf Rezept-Detailseiten werden jetzt korrekt angezeigt',
                tag: 'fix',
            },
            {
                text: 'Startseite lädt schneller — Inhalte werden parallel geladen und einzeln eingeblendet',
                tag: 'feat',
            },
            {
                text: 'Tote Links bereinigt',
                tag: 'fix',
            },
        ],
    },
    {
        date: '11. März 2026',
        version: 'v2026-03-11.3',
        emoji: '🎨',
        title: 'Flow-Editor Turbo & erweiterte Suche',
        items: [
            {
                text: 'Flow-Editor mit verstellbaren Seitenleisten — Palette und Bearbeitungs-Panel können per Drag vergrößert/verkleinert werden',
                tag: 'spotlight',
            },
            {
                text: 'Suche findet jetzt auch Profile — Rezepte, Zutaten, Tags und Benutzer in einem einzigen Suchfeld',
                tag: 'spotlight',
            },
            {
                text: 'Gekochte Rezepte auf dem Profil — neue Datenschutz-Einstellung steuert, ob Besucher sehen können was du gekocht hast',
                tag: 'spotlight',
            },
            {
                text: 'Kalorien eintragen — Gesamt-Kalorien beim Rezept hinterlegen, auf der Detail-Seite automatisch auf die gewählte Portionszahl umgerechnet',
                tag: 'feat',
            },
            {
                text: 'Bild-Upload mit Drag-Drop und QR-Code jetzt einheitlich in Profil, Rezept und Koch-Modus',
                tag: 'feat',
            },
            {
                text: 'Buttons auf Rezeptkarten übersichtlicher angeordnet',
                tag: 'fix',
            },
            {
                text: 'Flow-Editor ruckelte bei komplexen Rezepten — behoben',
                tag: 'fix',
            },
            {
                text: 'Favoriten-Icon ist jetzt ein Lesezeichen statt einem Herz — klare Unterscheidung zu „Gekocht"',
                tag: 'fix',
            },
        ],
    },
    {
        date: '11. März 2026',
        version: 'v2026-03-11.2',
        emoji: '🛠️',
        title: 'Feedback-Runde: Bugs & UX-Feinschliff',
        items: [
            {
                text: 'Light/Dark-Toggle ist jetzt im Profil-Menü — nicht mehr im Entdecken-Dropdown',
                tag: 'fix',
            },
            {
                text: 'Favorit-Button blieb nach dem Klick unsichtbar — behoben',
                tag: 'fix',
            },
            {
                text: 'Flow-Scroll hat den Seiten-Scroll übernommen — Scroll-Verhalten korrigiert',
                tag: 'fix',
            },
            {
                text: 'Flow-Kacheln außerhalb des Sichtbereichs sind jetzt durch Herauszoomen erreichbar',
                tag: 'fix',
            },
            {
                text: 'Timer-Reset im Koch-Modus fragt jetzt zur Sicherheit nach',
                tag: 'fix',
            },
            {
                text: 'Kategorie-Beschriftungen waren bei Hover schwer lesbar — Kontrast verbessert',
                tag: 'fix',
            },
            {
                text: 'Kalorien können jetzt beim Rezept eingetragen und angezeigt werden',
                tag: 'feat',
            },
            {
                text: 'Ungespeicherte Änderungen in den Einstellungen werden durch einen visuellen Indikator signalisiert',
                tag: 'feat',
            },
            {
                text: 'Parallele Schritte im Koch-Modus haben jetzt ein Parallel-Badge',
                tag: 'feat',
            },
            {
                text: 'Entwurf-Banner auf Rezept-Detailseiten ist jetzt deutlich sichtbarer',
                tag: 'feat',
            },
            {
                text: 'Chat-Bubble auf Mobile blockiert nicht mehr Inhalte dahinter',
                tag: 'fix',
            },
            {
                text: 'Profil-Bearbeitung: Tipps und Schnellleiste an richtiger Position',
                tag: 'fix',
            },
            {
                text: 'Passwort-Seite: Design ans Profil-Layout angeglichen',
                tag: 'fix',
            },
            {
                text: 'Willkommens-Mail trägt jetzt korrekt den Namen KüchenTakt',
                tag: 'fix',
            },
        ],
    },
    {
        date: '11. März 2026',
        emoji: '🚀',
        title: 'Bulk-Import Turbo & Rebranding',
        items: [
            {
                text: 'Bulk-Import verarbeitet jetzt bis zu 10 Rezepte gleichzeitig statt nacheinander',
                tag: 'spotlight',
            },
            {
                text: 'Neues Branding: KüchenTakt — frischer Name, gleicher Geschmack',
                tag: 'feat',
            },
            {
                text: 'Flow-Editor passt sich automatisch an Fenstergrößenänderungen an',
                tag: 'feat',
            },
            {
                text: 'Bulk-Import konnte nach ca. 5 Rezepten mit leerem Bildschirm abstürzen — behoben',
                tag: 'fix',
            },
        ],
    },
    {
        date: '10. März 2026',
        emoji: '✨',
        title: 'Der große Funktions-Schub',
        items: [
            {
                text: 'KI Rezept-Import — URL eingeben, Zutaten und Schritte werden automatisch erkannt und als Flow aufgebaut',
                tag: 'spotlight',
            },
            {
                text: 'Google Chromecast — Rezeptschritte direkt auf den Fernseher casten, mit Timer-Synchronisation',
                tag: 'spotlight',
            },
            {
                text: 'Echtzeit-Benachrichtigungen — sofortige Updates bei Kommentaren, Bewertungen, neuen Followern und mehr',
                tag: 'spotlight',
            },
            {
                text: 'Dark Mode für die gesamte App',
                tag: 'feat',
            },
            {
                text: 'Kategorie-Landingpages mit Hero-Bannern, Statistiken und Live-Aktivitäts-Sidebar',
                tag: 'feat',
            },
            {
                text: 'Profil-Seiten mit Hero-Banner, Top-Rezepten und Kochhistorie',
                tag: 'feat',
            },
            {
                text: 'Bilder werden automatisch in verschiedenen Größen bereitgestellt — schnelleres Laden auf allen Geräten',
                tag: 'feat',
            },
            {
                text: 'QR-Code Upload — Fotos direkt vom Handy ins Rezept hochladen',
                tag: 'feat',
            },
            {
                text: 'Rezept-Viewer mit Kochmodus, PDF-Export und animierten Verbindungslinien',
                tag: 'feat',
            },
            { text: 'Rezepte teilen per Share-Button', tag: 'feat' },
            { text: 'Push-Benachrichtigungen und Privatsphäre-Einstellungen', tag: 'feat' },
            { text: 'Angepinnte Rezepte in der Navigation', tag: 'feat' },
            {
                text: 'Benachrichtigungs-Dropdown mit farbigen Icons und sanften Übergängen',
                tag: 'feat',
            },
            {
                text: 'Benachrichtigungs-Dropdown schließt sich nicht mehr beim Darüberfahren',
                tag: 'fix',
            },
            { text: 'Chromecast-Verbindungsprobleme behoben', tag: 'fix' },
            {
                text: 'Dark Mode funktioniert jetzt durchgängig in allen Bereichen',
                tag: 'fix',
            },
            { text: 'Mobile Darstellung auf allen öffentlichen Seiten verbessert', tag: 'fix' },
        ],
    },
];

export default function ChangelogPage() {
    return (
        <PageShell>
            <div className={css({ maxW: '720px', mx: 'auto', py: { base: '4', md: '8' } })}>
                <FadeIn y={-10}>
                    <h1
                        className={css({
                            fontFamily: 'heading',
                            fontSize: { base: '2xl', md: '3xl' },
                            fontWeight: '700',
                            mb: '2',
                        })}
                    >
                        Changelog
                    </h1>
                </FadeIn>
                <FadeIn delay={0.1}>
                    <p className={css({ color: 'text-muted', fontSize: 'sm', mb: '8' })}>
                        Was gibt es Neues bei KüchenTakt?
                    </p>
                </FadeIn>

                <div className={css({ display: 'flex', flexDirection: 'column', gap: '8' })}>
                    {CHANGELOG.map((entry, entryIndex) => (
                        <FadeIn
                            key={entry.version ?? entry.date}
                            x={-20}
                            delay={0.2 + entryIndex * 0.15}
                        >
                            <article
                                className={css({
                                    position: 'relative',
                                    pl: '6',
                                    borderLeft: '2px solid',
                                    borderColor: 'border',
                                })}
                            >
                                {/* Timeline dot */}
                                <ScaleIn
                                    delay={0.3 + entryIndex * 0.15}
                                    className={css({
                                        position: 'absolute',
                                        left: '-7px',
                                        top: '2px',
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: 'full',
                                        background: 'linear-gradient(135deg, #e07b53, #f8b500)',
                                        border: '2px solid',
                                        borderColor: 'surface',
                                    })}
                                />

                                <div
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'baseline',
                                        gap: '2',
                                        mb: '1',
                                        flexWrap: 'wrap',
                                    })}
                                >
                                    <span
                                        className={css({
                                            fontSize: 'xs',
                                            color: 'text-muted',
                                            fontWeight: '500',
                                        })}
                                    >
                                        {entry.date}
                                    </span>
                                    {entry.version && (
                                        <span
                                            className={css({
                                                fontSize: '2xs',
                                                fontWeight: '700',
                                                color: 'white',
                                                background:
                                                    'linear-gradient(135deg, #e07b53, #f8b500)',
                                                px: '2',
                                                py: '0.5',
                                                borderRadius: 'full',
                                            })}
                                        >
                                            v{entry.version}
                                        </span>
                                    )}
                                </div>

                                <h2
                                    className={css({
                                        fontFamily: 'heading',
                                        fontSize: 'lg',
                                        fontWeight: '700',
                                        mb: '2',
                                    })}
                                >
                                    {entry.emoji && (
                                        <span className={css({ mr: '2' })}>{entry.emoji}</span>
                                    )}
                                    {entry.title}
                                </h2>

                                <ul
                                    className={css({
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1.5',
                                        listStyle: 'none',
                                        p: 0,
                                        m: 0,
                                    })}
                                >
                                    {entry.items.map((item, itemIndex) => {
                                        const tagStyle = item.tag ? TAG_STYLES[item.tag] : null;
                                        return (
                                            <FadeIn
                                                key={item.text}
                                                as="li"
                                                x={-10}
                                                delay={0.4 + entryIndex * 0.15 + itemIndex * 0.04}
                                                className={css({
                                                    fontSize: 'sm',
                                                    color: 'text-muted',
                                                    lineHeight: '1.5',
                                                    display: 'flex',
                                                    alignItems: 'baseline',
                                                    gap: '2',
                                                })}
                                            >
                                                {tagStyle ? (
                                                    <span
                                                        className={css({
                                                            fontSize: '2xs',
                                                            fontWeight: '700',
                                                            color: 'white',
                                                            px: '1.5',
                                                            py: '0.5',
                                                            borderRadius: 'full',
                                                            whiteSpace: 'nowrap',
                                                            flexShrink: 0,
                                                        })}
                                                        style={{ background: tagStyle.bg }}
                                                    >
                                                        {tagStyle.label}
                                                    </span>
                                                ) : (
                                                    <span
                                                        className={css({
                                                            color: 'palette.orange',
                                                            fontWeight: '700',
                                                            flexShrink: 0,
                                                        })}
                                                    >
                                                        →
                                                    </span>
                                                )}
                                                <span>{item.text}</span>
                                            </FadeIn>
                                        );
                                    })}
                                </ul>
                            </article>
                        </FadeIn>
                    ))}
                </div>
            </div>
        </PageShell>
    );
}
