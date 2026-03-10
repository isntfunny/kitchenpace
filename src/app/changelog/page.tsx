import { PageShell } from '@app/components/layouts/PageShell';
import { css } from 'styled-system/css';

export const metadata = {
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
        date: '10. März 2026',
        emoji: '✨',
        title: 'Quality of Life — alles wird besser!',
        items: [
            // ── Spotlight ──
            {
                text: 'AI Rezept-Import — URL eingeben, Scraper holt den Inhalt, OpenAI analysiert Zutaten & Schritte und baut automatisch den Flow',
                tag: 'spotlight',
            },
            {
                text: 'Google Chromecast — Rezeptschritte direkt auf den Fernseher casten, mit Timer-Synchronisation und Idle-Timeout',
                tag: 'spotlight',
            },
            {
                text: 'Echtzeit-Benachrichtigungen — SSE-basierte Push-Updates für Kommentare, Bewertungen, Follower und mehr',
                tag: 'spotlight',
            },
            {
                text: 'Content-Moderation — KI-gestützte Bild- und Textprüfung, Moderations-Queue, Ban-System und Meldungen',
                tag: 'spotlight',
            },

            // ── Features ──
            {
                text: 'Dark Mode mit durchgängigen semantischen Tokens für alle Komponenten',
                tag: 'feat',
            },
            {
                text: 'Kategorie-Landingpages mit Hero-Bannern, Statistiken und Live-Aktivitäts-Sidebar',
                tag: 'feat',
            },
            {
                text: 'Profil-Seiten mit Hero-Banner, Top-Rezepten, Kochhistorie und Slug-basierten URLs',
                tag: 'feat',
            },
            {
                text: 'S3-Bildverwaltung mit Aspektverhältnis-Thumbnails, On-Demand-Generierung und 5 Breakpoints',
                tag: 'feat',
            },
            {
                text: 'QR-Code Upload — Fotos direkt vom Handy über QR-Code ins Rezept hochladen',
                tag: 'feat',
            },
            {
                text: 'Rezept-Viewer mit Kochmodus, PDF-Export und animierten Flow-Kanten',
                tag: 'feat',
            },
            { text: 'ShareButton für Rezepte (native Web Share API)', tag: 'feat' },
            { text: 'Web Push Notifications und Privatsphäre-Einstellungen', tag: 'feat' },
            { text: 'Angepinnte Rezept-Tabs in der Navigation mit API-Persistenz', tag: 'feat' },
            { text: 'Onboarding-Flow, modaler Koch-Dialog und Sparkle-Effekte', tag: 'feat' },
            {
                text: 'Admin-Bereich: Kategorien-Verwaltung, Zutaten-Moderation, Import-Dashboard',
                tag: 'feat',
            },
            {
                text: 'SEO-Audit: OG-Images für Kategorien mit dynamischen Lucide-Icons, strukturierte Daten',
                tag: 'feat',
            },
            {
                text: 'OpenSearch-Integration mit inkrementeller Synchronisation und Einzelrezept-Sync',
                tag: 'feat',
            },
            {
                text: 'Benachrichtigungs-Dropdown mit farbigen Typ-Icons, Fade-Übergängen und Gradient-Button',
                tag: 'feat',
            },
            {
                text: 'Zutatenverwaltung neu gebaut mit kompakter Liste und Sticky-Autosave-Leiste',
                tag: 'feat',
            },
            {
                text: 'Unified 6-Farben-Palette (Orange, Gold, Emerald, Purple, Blue, Pink)',
                tag: 'feat',
            },

            // ── Fixes ──
            {
                text: 'Benachrichtigungs-Dropdown schließt sich nicht mehr beim Hovern (Popover statt DropdownMenu)',
                tag: 'fix',
            },
            { text: 'Chromecast Race-Condition und Idle-Timeout behoben', tag: 'fix' },
            {
                text: 'Dark Mode für Flow-Editor, Admin-Tabellen und alle Feature-Komponenten',
                tag: 'fix',
            },
            {
                text: 'Deployment-Zeit um ~50% reduziert durch optimierten Docker-Build',
                tag: 'fix',
            },
            {
                text: 'Scraper-Healthcheck, Prisma-Client-Generierung und Registry-Fixes',
                tag: 'fix',
            },
            { text: 'Mobile-Friendliness auf allen öffentlichen Seiten verbessert', tag: 'fix' },
            { text: 'Rezeptkarten: kein verschachtelter Anchor-Hydration-Fehler mehr', tag: 'fix' },
        ],
    },
];

export default function ChangelogPage() {
    return (
        <PageShell>
            <div className={css({ maxW: '720px', mx: 'auto', py: { base: '4', md: '8' } })}>
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
                <p className={css({ color: 'text-muted', fontSize: 'sm', mb: '8' })}>
                    Was gibt es Neues bei KüchenTakt?
                </p>

                <div className={css({ display: 'flex', flexDirection: 'column', gap: '8' })}>
                    {CHANGELOG.map((entry) => (
                        <article
                            key={entry.date}
                            className={css({
                                position: 'relative',
                                pl: '6',
                                borderLeft: '2px solid',
                                borderColor: 'border',
                            })}
                        >
                            {/* Timeline dot */}
                            <div
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
                                            background: 'linear-gradient(135deg, #e07b53, #f8b500)',
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
                                {entry.items.map((item) => {
                                    const tagStyle = item.tag ? TAG_STYLES[item.tag] : null;
                                    return (
                                        <li
                                            key={item.text}
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
                                        </li>
                                    );
                                })}
                            </ul>
                        </article>
                    ))}
                </div>
            </div>
        </PageShell>
    );
}
