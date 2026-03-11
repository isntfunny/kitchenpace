'use client';

import { motion } from 'motion/react';

import { PageShell } from '@app/components/layouts/PageShell';
import { css } from 'styled-system/css';

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
        date: '11. März 2026',
        version: 'v2026-03-11.4',
        emoji: '🔧',
        title: 'Profilbilder & Performance',
        items: [
            {
                text: 'Profilbilder in „Chef des Monats" und auf Rezept-Detailseiten werden jetzt korrekt aus dem eigenen Upload-Speicher geladen',
                tag: 'fix',
            },
            {
                text: 'Startseite lädt Sektionen parallel und streamt sie einzeln — schnellerer erster Seitenaufbau',
                tag: 'feat',
            },
            {
                text: 'E2E-Smoke-Tests laufen jetzt automatisch in der CI-Pipeline als Deployment-Gate',
                tag: 'feat',
            },
            {
                text: 'Tote Links und robots.txt bereinigt',
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
            // ── Spotlight ──
            {
                text: 'Flow-Editor mit verstellbaren Seitenleisten — Palette und Bearbeitungs-Panel können per Drag vergrößert/verkleinert werden, Größen bleiben gespeichert',
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

            // ── Features ──
            {
                text: 'Kalorien eintragen — Gesamt-Kalorien beim Rezept hinterlegen, auf der Detail-Seite automatisch auf die gewählte Portionszahl umgerechnet',
                tag: 'feat',
            },
            {
                text: 'Bild-Upload mit Drag-Drop und QR-Code jetzt einheitlich in Profil, Rezept und Koch-Modus',
                tag: 'feat',
            },

            // ── Fixes ──
            {
                text: 'Buttons auf Rezeptkarten neu ausgerichtet — Veröffentlichen-Button full-width, Bearbeiten und Löschen gleichmäßig darunter',
                tag: 'fix',
            },
            {
                text: 'Flow-Editor ruckelte bei komplexen Rezepten — Render-Loop-Bug behoben',
                tag: 'fix',
            },
            {
                text: 'Favoriten-Icon ist jetzt ein Lesezeichen statt einem Herz — klare Unterscheidung zu "Gekocht"',
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
                text: 'Favorit-Button blieb nach dem Klick unsichtbar — Styling-Bug behoben',
                tag: 'fix',
            },
            {
                text: 'Graph-Scroll hat den Seiten-Scroll übernommen — Scroll-Verhalten korrigiert',
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
                text: 'Kategorie-Hover: Beschriftungen waren schwer lesbar — Kontrast verbessert',
                tag: 'fix',
            },
            {
                text: 'Kalorien können jetzt beim Rezept eingetragen und angezeigt werden',
                tag: 'feat',
            },
            {
                text: 'Ungespeicherte Änderungen in den Einstellungen werden durch Browser-Dialog und visuellen Indikator am Speichern-Button signalisiert',
                tag: 'feat',
            },
            {
                text: 'Parallele Schritte im Koch-Flow haben jetzt ein ⚡ Parallel-Badge',
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
                text: 'Welcome-Mail trägt jetzt korrekt den Namen KüchenTakt',
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
                text: 'Flow-Editor passt sich automatisch an Fenstergrößenänderungen an (fitView)',
                tag: 'feat',
            },
            {
                text: 'Bulk-Import Review-Wizard konnte nach ca. 5 Rezepten mit leerem Bildschirm abstürzen',
                tag: 'fix',
            },
        ],
    },
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
                <motion.h1
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className={css({
                        fontFamily: 'heading',
                        fontSize: { base: '2xl', md: '3xl' },
                        fontWeight: '700',
                        mb: '2',
                    })}
                >
                    Changelog
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className={css({ color: 'text-muted', fontSize: 'sm', mb: '8' })}
                >
                    Was gibt es Neues bei KüchenTakt?
                </motion.p>

                <div className={css({ display: 'flex', flexDirection: 'column', gap: '8' })}>
                    {CHANGELOG.map((entry, entryIndex) => (
                        <motion.article
                            key={entry.version ?? entry.date}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 + entryIndex * 0.15 }}
                            className={css({
                                position: 'relative',
                                pl: '6',
                                borderLeft: '2px solid',
                                borderColor: 'border',
                            })}
                        >
                            {/* Timeline dot */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 400,
                                    damping: 15,
                                    delay: 0.3 + entryIndex * 0.15,
                                }}
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
                                {entry.items.map((item, itemIndex) => {
                                    const tagStyle = item.tag ? TAG_STYLES[item.tag] : null;
                                    return (
                                        <motion.li
                                            key={item.text}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{
                                                duration: 0.3,
                                                delay: 0.4 + entryIndex * 0.15 + itemIndex * 0.04,
                                            }}
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
                                        </motion.li>
                                    );
                                })}
                            </ul>
                        </motion.article>
                    ))}
                </div>
            </div>
        </PageShell>
    );
}
