import Link from 'next/link';

import { PageShell } from '@app/components/layouts/PageShell';
import { css } from 'styled-system/css';

const LAST_UPDATED = 'März 2026';

// ─── Sub-components ────────────────────────────────────────────────────────

function Section({
    id,
    title,
    children,
}: {
    id: string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section
            id={id}
            className={css({
                mb: '10',
                scrollMarginTop: '6',
            })}
        >
            <h2
                className={css({
                    fontFamily: 'heading',
                    fontSize: { base: 'lg', md: 'xl' },
                    fontWeight: '700',
                    mb: '4',
                    pb: '2',
                    borderBottom: '1px solid',
                    borderColor: 'border',
                    color: 'text',
                })}
            >
                {title}
            </h2>
            <div
                className={css({
                    color: 'text-muted',
                    fontSize: 'sm',
                    lineHeight: '1.8',
                    '& p': { mb: '3' },
                    '& ul': {
                        listStyleType: 'disc',
                        pl: '5',
                        mb: '3',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1',
                    },
                    '& strong': { color: 'text', fontWeight: '600' },
                    '& a': {
                        color: 'palette.orange',
                        textDecoration: 'underline',
                        textUnderlineOffset: '2px',
                    },
                })}
            >
                {children}
            </div>
        </section>
    );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className={css({ mb: '5' })}>
            <h3
                className={css({
                    fontSize: 'sm',
                    fontWeight: '700',
                    color: 'text',
                    mb: '2',
                    mt: '4',
                })}
            >
                {title}
            </h3>
            {children}
        </div>
    );
}

function ProcessorTable({
    rows,
}: {
    rows: { provider: string; purpose: string; location: string; basis: string }[];
}) {
    return (
        <div
            className={css({
                overflowX: 'auto',
                mb: '3',
                borderRadius: 'md',
                border: '1px solid',
                borderColor: 'border',
            })}
        >
            <table className={css({ width: '100%', fontSize: 'xs', borderCollapse: 'collapse' })}>
                <thead>
                    <tr
                        className={css({
                            background: 'surface-raised',
                            borderBottom: '1px solid',
                            borderColor: 'border',
                        })}
                    >
                        {['Dienstleister', 'Zweck', 'Speicherort', 'Grundlage'].map((h) => (
                            <th
                                key={h}
                                className={css({
                                    textAlign: 'left',
                                    px: '3',
                                    py: '2',
                                    fontWeight: '600',
                                    color: 'text',
                                    whiteSpace: 'nowrap',
                                })}
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr
                            key={i}
                            className={css({
                                borderBottom: '1px solid',
                                borderColor: 'border',
                                _last: { borderBottom: 'none' },
                            })}
                        >
                            <td
                                className={css({
                                    px: '3',
                                    py: '2',
                                    color: 'text',
                                    whiteSpace: 'nowrap',
                                    fontWeight: '500',
                                })}
                            >
                                {row.provider}
                            </td>
                            <td className={css({ px: '3', py: '2' })}>{row.purpose}</td>
                            <td className={css({ px: '3', py: '2', whiteSpace: 'nowrap' })}>
                                {row.location}
                            </td>
                            <td className={css({ px: '3', py: '2' })}>{row.basis}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── TOC ───────────────────────────────────────────────────────────────────

const TOC_ITEMS = [
    { id: 'verantwortlicher', label: '1. Verantwortlicher' },
    { id: 'grundlagen', label: '2. Allgemeines zur Datenverarbeitung' },
    { id: 'hosting', label: '3. Webhosting & Infrastruktur' },
    { id: 'server', label: '4. Server-Logs' },
    { id: 'konto', label: '5. Nutzerkonto & Registrierung' },
    { id: 'ugc', label: '6. Nutzergenerierte Inhalte' },
    { id: 'ki-moderation', label: '7. KI-gestützte Inhaltsmoderation' },
    { id: 'captcha', label: '8. Spam-Schutz (Cloudflare Turnstile)' },
    { id: 'analytics', label: '9. Analyse & Statistik (OpenPanel)' },
    { id: 'chat', label: '10. Live-Chat (Chatwoot)' },
    { id: 'push', label: '11. Push-Benachrichtigungen' },
    { id: 'email', label: '12. E-Mail-Kommunikation (Notifuse)' },
    { id: 'sentry', label: '13. Fehlerüberwachung (GlitchTip)' },
    { id: 'bilder', label: '14. Bildspeicherung (MinIO)' },
    { id: 'cookies', label: '15. Cookies & lokaler Speicher' },
    { id: 'kontakt', label: '16. Kontaktaufnahme' },
    { id: 'rechte', label: '17. Ihre Rechte' },
    { id: 'dienstleister', label: '18. Übersicht Dienstleister' },
    { id: 'sicherheit', label: '19. Datensicherheit' },
    { id: 'aenderungen', label: '20. Änderungen dieser Erklärung' },
];

// ─── Page ──────────────────────────────────────────────────────────────────

export default function DatenschutzPage() {
    return (
        <PageShell>
            <div
                className={css({
                    maxW: '800px',
                    mx: 'auto',
                    py: { base: '6', md: '10' },
                    px: { base: '0', md: '4' },
                })}
            >
                {/* Header */}
                <div className={css({ mb: '10' })}>
                    <h1
                        className={css({
                            fontFamily: 'heading',
                            fontSize: { base: '2xl', md: '3xl' },
                            fontWeight: '700',
                            mb: '2',
                        })}
                    >
                        Datenschutzerklärung
                    </h1>
                    <p className={css({ color: 'text-muted', fontSize: 'sm' })}>
                        Stand: {LAST_UPDATED} · Gültig für{' '}
                        <strong className={css({ color: 'text' })}>KüchenTakt</strong> unter{' '}
                        <Link
                            href="/"
                            className={css({
                                color: 'palette.orange',
                                textDecoration: 'underline',
                            })}
                        >
                            kuechentakt.de
                        </Link>
                    </p>
                    <div
                        className={css({
                            mt: '4',
                            p: '4',
                            borderRadius: 'md',
                            border: '1px solid',
                            borderColor: 'border',
                            background: 'surface-raised',
                            fontSize: 'sm',
                            color: 'text-muted',
                            lineHeight: '1.7',
                        })}
                    >
                        Die vollständigen Anbieter- und Kontaktdaten finden Sie in unserem{' '}
                        <Link
                            href="/impressum"
                            className={css({
                                color: 'palette.orange',
                                textDecoration: 'underline',
                            })}
                        >
                            Impressum
                        </Link>
                        .
                    </div>
                </div>

                {/* TOC */}
                <div
                    className={css({
                        mb: '10',
                        p: '5',
                        borderRadius: 'lg',
                        border: '1px solid',
                        borderColor: 'border',
                        background: 'surface-raised',
                    })}
                >
                    <p
                        className={css({
                            fontSize: 'xs',
                            fontWeight: '700',
                            color: 'text-muted',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            mb: '3',
                        })}
                    >
                        Inhalt
                    </p>
                    <ol
                        className={css({
                            display: 'grid',
                            gridTemplateColumns: { base: '1fr', md: '1fr 1fr' },
                            gap: '1',
                            listStyle: 'none',
                            p: 0,
                            m: 0,
                        })}
                    >
                        {TOC_ITEMS.map((item) => (
                            <li key={item.id}>
                                <a
                                    href={`#${item.id}`}
                                    className={css({
                                        fontSize: 'xs',
                                        color: 'text-muted',
                                        _hover: { color: 'palette.orange' },
                                        textDecoration: 'none',
                                        transition: 'color 0.15s',
                                    })}
                                >
                                    {item.label}
                                </a>
                            </li>
                        ))}
                    </ol>
                </div>

                {/* ── 1. Verantwortlicher ── */}
                <Section id="verantwortlicher" title="1. Verantwortlicher">
                    <p>
                        Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) und
                        sonstiger datenschutzrechtlicher Bestimmungen ist:
                    </p>
                    <div
                        className={css({
                            p: '4',
                            borderRadius: 'md',
                            border: '1px solid',
                            borderColor: 'border',
                            background: 'surface-raised',
                            fontSize: 'sm',
                            lineHeight: '1.8',
                            mb: '3',
                        })}
                    >
                        <strong>KüchenTakt</strong>
                        <br />
                        Angaben gemäß Impressum
                        <br />
                        E-Mail:{' '}
                        <a href="mailto:datenschutz@kuechentakt.de">datenschutz@kuechentakt.de</a>
                        <br />
                        Website:{' '}
                        <Link
                            href="/"
                            className={css({
                                color: 'palette.orange',
                                textDecoration: 'underline',
                            })}
                        >
                            kuechentakt.de
                        </Link>
                    </div>
                    <p>
                        Die vollständigen Kontaktdaten entnehmen Sie bitte unserem{' '}
                        <Link
                            href="/impressum"
                            className={css({
                                color: 'palette.orange',
                                textDecoration: 'underline',
                            })}
                        >
                            Impressum
                        </Link>
                        .
                    </p>
                </Section>

                {/* ── 2. Allgemeines ── */}
                <Section id="grundlagen" title="2. Allgemeines zur Datenverarbeitung">
                    <SubSection title="2.1 Umfang der Verarbeitung">
                        <p>
                            Wir verarbeiten personenbezogene Daten unserer Nutzer grundsätzlich nur,
                            soweit dies zur Bereitstellung einer funktionsfähigen Website sowie
                            unserer Inhalte und Leistungen erforderlich ist. Die Verarbeitung
                            personenbezogener Daten unserer Nutzer erfolgt regelmäßig nur nach deren
                            Einwilligung. Eine Ausnahme gilt, wenn eine vorherige Einholung einer
                            Einwilligung nicht möglich ist und die Verarbeitung durch gesetzliche
                            Vorschriften gestattet ist.
                        </p>
                    </SubSection>
                    <SubSection title="2.2 Rechtsgrundlagen">
                        <ul>
                            <li>
                                <strong>Art. 6 Abs. 1 lit. a DSGVO</strong> — Einwilligung der
                                betroffenen Person
                            </li>
                            <li>
                                <strong>Art. 6 Abs. 1 lit. b DSGVO</strong> — Erfüllung eines
                                Vertrags oder vorvertraglicher Maßnahmen
                            </li>
                            <li>
                                <strong>Art. 6 Abs. 1 lit. c DSGVO</strong> — Erfüllung einer
                                rechtlichen Verpflichtung
                            </li>
                            <li>
                                <strong>Art. 6 Abs. 1 lit. f DSGVO</strong> — Wahrung berechtigter
                                Interessen des Verantwortlichen
                            </li>
                        </ul>
                    </SubSection>
                    <SubSection title="2.3 Datenlöschung und Speicherdauer">
                        <p>
                            Personenbezogene Daten werden gelöscht oder gesperrt, sobald der Zweck
                            der Speicherung entfällt. Eine darüber hinausgehende Speicherung erfolgt
                            nur, wenn dies durch europäische oder nationale Rechtsvorschriften
                            vorgesehen ist. Daten werden auch dann gesperrt oder gelöscht, wenn eine
                            durch die genannten Normen vorgeschriebene Speicherfrist abläuft.
                        </p>
                    </SubSection>
                </Section>

                {/* ── 3. Hosting ── */}
                <Section id="hosting" title="3. Webhosting & Infrastruktur">
                    <p>
                        Diese Website sowie alle darauf betriebenen Dienste werden auf Servern der{' '}
                        <strong>netcup GmbH</strong>, Emmy-Noether-Straße 10, 76131 Karlsruhe,
                        Deutschland, gehostet. Die Server befinden sich im Rechenzentrum{' '}
                        <strong>Nürnberg, Deutschland</strong>. Alle Daten werden ausschließlich
                        innerhalb der Europäischen Union verarbeitet und gespeichert — es findet
                        kein Datentransfer in Drittländer statt.
                    </p>
                    <p>
                        netcup GmbH ist nach <strong>ISO 27001</strong> (Informationssicherheit) und{' '}
                        <strong>ISO 27701</strong> (Datenschutzmanagementsystem) zertifiziert (TÜV
                        Nord / CIS, jährliches Audit). Mit netcup GmbH wurde ein
                        Auftragsverarbeitungsvertrag gemäß Art. 28 DSGVO abgeschlossen.
                    </p>
                    <p>
                        Weitere Informationen zur Datenverarbeitung durch netcup finden Sie unter:{' '}
                        <a
                            href="https://www.netcup.com/de/kontakt/datenschutzerklaerung"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            netcup.com/de/kontakt/datenschutzerklaerung
                        </a>
                    </p>
                    <p>
                        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigte
                        Interessen — Bereitstellung und Betrieb der Website) sowie Art. 6 Abs. 1
                        lit. b DSGVO (Vertragserfüllung).
                    </p>
                </Section>

                {/* ── 4. Server-Logs ── */}
                <Section id="server" title="4. Server-Logs">
                    <p>
                        Bei jedem Aufruf unserer Website erfasst unser System automatisiert Daten
                        vom aufrufenden Rechner. Folgende Daten werden dabei erhoben:
                    </p>
                    <ul>
                        <li>IP-Adresse des Nutzers (anonymisiert)</li>
                        <li>Datum und Uhrzeit des Zugriffs</li>
                        <li>Name und URL der abgerufenen Ressource</li>
                        <li>Referrer-URL (Herkunftsseite)</li>
                        <li>Verwendeter Browser, Betriebssystem und Access-Provider</li>
                    </ul>
                    <p>
                        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO. Unser
                        berechtigtes Interesse liegt in der Gewährleistung des Betriebs und der
                        Sicherheit der Website. Logfiles werden nach spätestens 14 Tagen automatisch
                        gelöscht.
                    </p>
                </Section>

                {/* ── 4. Nutzerkonto ── */}
                <Section id="konto" title="5. Nutzerkonto & Registrierung">
                    <p>
                        Für die Nutzung aller Funktionen von KüchenTakt ist eine Registrierung
                        erforderlich. Dabei erheben wir folgende Daten:
                    </p>
                    <ul>
                        <li>E-Mail-Adresse (Pflichtfeld)</li>
                        <li>Benutzername / Anzeigename (Pflichtfeld)</li>
                        <li>Passwort (wird ausschließlich verschlüsselt gespeichert)</li>
                        <li>Datum und Uhrzeit der Registrierung</li>
                        <li>Optionale Profilangaben (Profilbild, Kurzbeschreibung)</li>
                    </ul>
                    <p>
                        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)
                        sowie Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung). Daten werden gelöscht,
                        wenn das Konto aufgelöst wird. Nutzer können ihr Konto jederzeit in den
                        Kontoeinstellungen löschen. Personenbezogene Daten werden innerhalb von 30
                        Tagen nach Kontolöschung vollständig entfernt, sofern keine gesetzlichen
                        Aufbewahrungspflichten entgegenstehen.
                    </p>
                </Section>

                {/* ── 5. UGC ── */}
                <Section id="ugc" title="6. Nutzergenerierte Inhalte">
                    <p>
                        KüchenTakt ist eine Community-Plattform. Registrierte Nutzer können Rezepte
                        erstellen, Fotos hochladen, kommentieren und mit anderen interagieren. Im
                        Rahmen dieser Funktionen werden folgende Daten verarbeitet:
                    </p>
                    <SubSection title="Rezepte">
                        <ul>
                            <li>Rezepttitel, Zutaten, Zubereitungsschritte, Kategorien, Tags</li>
                            <li>Veröffentlichungsstatus und Zeitstempel</li>
                            <li>Kalorienangaben (optional)</li>
                            <li>Verknüpfung mit dem Nutzerkonto des Erstellers</li>
                        </ul>
                    </SubSection>
                    <SubSection title="Fotos und Bilder">
                        <ul>
                            <li>
                                Hochgeladene Bilder werden auf unseren eigenen Servern bei der
                                netcup GmbH gespeichert
                            </li>
                            <li>
                                Metadaten (Dateigröße, Format) werden bei der Verarbeitung erhoben
                            </li>
                        </ul>
                    </SubSection>
                    <SubSection title="Soziale Interaktionen">
                        <ul>
                            <li>Kommentare (Inhalt, Zeitstempel, Nutzerzuordnung)</li>
                            <li>Bewertungen und Favoriten</li>
                            <li>Follower-/Following-Beziehungen</li>
                            <li>
                                Aktivitätsfeed (öffentliche Aktivitäten je nach
                                Privatsphäreeinstellung)
                            </li>
                            <li>
                                Kochhistorie (sichtbar/unsichtbar per Privatsphäreeinstellung
                                steuerbar)
                            </li>
                        </ul>
                    </SubSection>
                    <p>
                        Öffentlich veröffentlichte Rezepte, Fotos und Kommentare sind für alle
                        Website-Besucher sichtbar. Als privat markierte Inhalte sind ausschließlich
                        für Sie einsehbar. Nutzer können eigene Inhalte jederzeit löschen. Nach der
                        Löschung werden Inhalte innerhalb von 24&nbsp;Stunden von aktiven Servern
                        und innerhalb von 30&nbsp;Tagen aus Backup-Systemen entfernt.
                    </p>
                    <p>
                        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
                        (Vertragserfüllung — Bereitstellung der Plattformfunktionen) sowie Art. 6
                        Abs. 1 lit. a DSGVO (Einwilligung bei der aktiven Veröffentlichung von
                        Inhalten).
                    </p>
                </Section>

                {/* ── 6. KI-Moderation ── */}
                <Section id="ki-moderation" title="7. KI-gestützte Inhaltsmoderation">
                    <p>
                        Zum Schutz unserer Community vor rechtswidrigen oder unangemessenen Inhalten
                        setzen wir automatisierte Verfahren zur Inhaltsmoderation ein. Hierfür
                        nutzen wir die Moderation API von <strong>OpenAI, LLC</strong> (3180 18th
                        Street, San Francisco, CA 94110, USA).
                    </p>
                    <p>
                        Bei der Veröffentlichung von Rezepten und dem Hochladen von Fotos werden die
                        betreffenden Texte und Bilder zur Prüfung auf Richtlinienkonformität an die
                        OpenAI-API übermittelt.{' '}
                        <strong>
                            OpenAI verwendet API-Daten nicht zum Training seiner Modelle
                        </strong>{' '}
                        (gemäß den OpenAI API-Nutzungsrichtlinien). Anfragen werden von OpenAI für
                        bis zu 30&nbsp;Tage zu Sicherheitszwecken gespeichert, danach gelöscht.
                    </p>
                    <p>
                        Die Datenübertragung erfolgt in die USA. Es liegen geeignete Garantien in
                        Form von Standarddatenschutzklauseln (SCCs) gemäß Art. 46 Abs. 2 lit. c
                        DSGVO vor. Datenschutzerklärung von OpenAI:{' '}
                        <a
                            href="https://openai.com/policies/privacy-policy"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            openai.com/policies/privacy-policy
                        </a>
                    </p>
                    <p>
                        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO. Unser
                        berechtigtes Interesse liegt im Schutz der Community vor rechtswidrigen,
                        belästigenden oder anstößigen Inhalten sowie in der Einhaltung unserer
                        Pflichten als Plattformbetreiber.
                    </p>
                    <p>
                        <strong>Hinweis zur automatisierten Entscheidungsfindung:</strong> Die
                        KI-Moderation kann zu einer vorläufigen Ablehnung von Inhalten führen. Alle
                        automatisierten Entscheidungen können durch unser Moderationsteam manuell
                        überprüft und revidiert werden. Es findet keine ausschließlich
                        automatisierte Entscheidung mit rechtlicher Außenwirkung im Sinne von Art.
                        22 DSGVO statt.
                    </p>
                </Section>

                {/* ── 7. Turnstile ── */}
                <Section id="captcha" title="8. Spam-Schutz — Cloudflare Turnstile">
                    <p>
                        Zum Schutz unserer Registrierungsformulare vor Bots und automatisierten
                        Zugriffen setzen wir <strong>Cloudflare Turnstile</strong> von Cloudflare,
                        Inc., 101 Townsend St., San Francisco, CA 94107, USA, ein.
                    </p>
                    <p>
                        Cloudflare Turnstile prüft automatisch im Hintergrund, ob es sich bei einem
                        Besucher um einen Menschen oder ein automatisiertes Skript handelt. Im
                        Unterschied zu herkömmlichen CAPTCHAs ist Turnstile visuell nicht sichtbar
                        und erfordert in der Regel keine aktive Nutzerinteraktion. Es werden{' '}
                        <strong>keine dauerhaften Tracking-Cookies</strong> gesetzt und kein
                        Surfverhalten über verschiedene Websites hinweg verfolgt.
                    </p>
                    <p>Folgende Daten werden an Cloudflare übermittelt:</p>
                    <ul>
                        <li>IP-Adresse</li>
                        <li>Referrer-URL</li>
                        <li>Browser-Informationen (Typ, Spracheinstellungen)</li>
                    </ul>
                    <p>
                        Die Datenübertragung erfolgt in die USA. Cloudflare nimmt am EU-US Data
                        Privacy Framework teil (Angemessenheitsbeschluss der EU-Kommission
                        2023/1795). Datenschutzerklärung von Cloudflare:{' '}
                        <a
                            href="https://www.cloudflare.com/privacypolicy/"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            cloudflare.com/privacypolicy
                        </a>
                    </p>
                    <p>
                        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO. Unser
                        berechtigtes Interesse besteht im Schutz vor missbräuchlichen
                        automatisierten Zugriffen und betrügerischen Registrierungen.
                    </p>
                </Section>

                {/* ── 8. OpenPanel ── */}
                <Section id="analytics" title="9. Analyse & Statistik — OpenPanel">
                    <p>
                        Wir verwenden <strong>OpenPanel</strong> (openpanel.dev), einen
                        datenschutzfreundlichen Web-Analysedienst, um die Nutzung unserer Website
                        statistisch auszuwerten und unser Angebot zu verbessern.
                    </p>
                    <p>
                        OpenPanel arbeitet vollständig <strong>ohne Cookies</strong>. IP-Adresse und
                        User-Agent-Informationen werden ausschließlich zur anonymisierten
                        Herkunftsbestimmung (Städte-/Länderebene) verwendet. Es findet keine
                        dauerhafte Nutzeridentifikation statt und es werden keine
                        seitenübergreifenden Nutzerprofile erstellt.
                    </p>
                    <p>Folgende Informationen werden anonymisiert erfasst:</p>
                    <ul>
                        <li>Aufgerufene Seiten (URL, Seitentitel)</li>
                        <li>Referrer / Herkunftsseite</li>
                        <li>Gerätekategorie (Desktop/Mobile), Betriebssystem, Browser</li>
                        <li>Ungefähre geografische Herkunft (Städteebene, danach verworfen)</li>
                        <li>Verweildauer und Navigation</li>
                        <li>Technische Ereignisse (z.&nbsp;B. Nutzung bestimmter Funktionen)</li>
                    </ul>
                    <p>
                        Die Analysesoftware wird auf Servern betrieben, die wir bei der{' '}
                        <strong>netcup GmbH in Nürnberg, Deutschland</strong> betreiben. Alle
                        erfassten Daten verbleiben ausschließlich auf unseren Servern innerhalb der
                        EU und werden nicht an Dritte weitergegeben oder verkauft.
                    </p>
                    <p>
                        <strong>Rechtsgrundlage:</strong> Da OpenPanel ohne Cookies und ohne
                        persistente Nutzeridentifikation arbeitet und ausschließlich anonymisierte,
                        aggregierte Daten erhebt, ist keine gesonderte Einwilligung erforderlich.
                        Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse
                        liegt in der statistischen Analyse der Website-Nutzung zur Verbesserung
                        unseres Angebots.
                    </p>
                </Section>

                {/* ── 9. Chatwoot ── */}
                <Section id="chat" title="10. Live-Chat — Chatwoot">
                    <p>
                        Auf unserer Website betreiben wir einen Live-Chat-Service auf Basis der
                        Open-Source-Software <strong>Chatwoot</strong>. Die Chat-Software läuft auf{' '}
                        <strong>
                            unseren eigenen Servern bei der netcup GmbH in Nürnberg, Deutschland
                        </strong>
                        . Es findet keine Datenübertragung an externe Chatwoot-Server oder sonstige
                        Dritte statt.
                    </p>
                    <p>
                        Wenn Sie den Live-Chat nutzen, werden folgende Daten auf unseren Servern
                        verarbeitet:
                    </p>
                    <ul>
                        <li>Inhalt Ihrer Chat-Nachrichten</li>
                        <li>Zeitstempel der Nachrichten</li>
                        <li>Technische Verbindungsdaten (IP-Adresse, Browser-Informationen)</li>
                        <li>
                            Freiwillig angegebene Kontaktdaten (Name, E-Mail) — sofern Sie diese im
                            Chat mitteilen
                        </li>
                    </ul>
                    <p>
                        Wenn Sie als registrierter Nutzer angemeldet sind, wird das Gespräch
                        automatisch Ihrem Konto zugeordnet. Die Nutzung des Live-Chats ist
                        freiwillig.
                    </p>
                    <p>
                        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
                        (Vertragserfüllung / Durchführung vorvertraglicher Maßnahmen) sowie Art. 6
                        Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Bereitstellung von
                        Nutzersupport). Chat-Verläufe werden für 12 Monate gespeichert und danach
                        gelöscht.
                    </p>
                </Section>

                {/* ── 10. Push ── */}
                <Section id="push" title="11. Push-Benachrichtigungen">
                    <p>
                        Wir bieten die Möglichkeit, Web-Push-Benachrichtigungen über Neuigkeiten auf
                        KüchenTakt zu abonnieren (z.&nbsp;B. neue Kommentare, Follower,
                        Rezept-Empfehlungen).
                    </p>
                    <p>
                        Wenn Sie Push-Benachrichtigungen aktivieren, wird ein gerätebezogenes Token
                        an unsere Server übermittelt, damit wir Ihnen Benachrichtigungen senden
                        können. Die Verwaltung der Push-Benachrichtigungen erfolgt über unsere
                        eigene Notifuse-Instanz auf unseren Servern bei der netcup GmbH — es findet
                        keine Datenübertragung an Dritte statt.
                    </p>
                    <p>
                        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung
                        durch aktive Bestätigung der Browser-Berechtigungsanfrage). Sie können Ihre
                        Einwilligung jederzeit widerrufen, indem Sie die Push-Berechtigung in den
                        Einstellungen Ihres Browsers deaktivieren oder Push-Benachrichtigungen in
                        Ihren KüchenTakt-Kontoeinstellungen abbestellen.
                    </p>
                </Section>

                {/* ── 11. E-Mail / Notifuse ── */}
                <Section id="email" title="12. E-Mail-Kommunikation — Notifuse">
                    <p>
                        Für den Versand von transaktionalen E-Mails und unserem optionalen
                        wöchentlichen Newsletter betreiben wir eine Instanz der Software{' '}
                        <strong>Notifuse</strong> auf{' '}
                        <strong>
                            unseren eigenen Servern bei der netcup GmbH in Nürnberg, Deutschland
                        </strong>
                        . Es findet keine Datenübertragung an externe Notifuse-Server oder Dritte
                        statt. Folgende E-Mails werden über diesen Dienst versendet:
                    </p>
                    <ul>
                        <li>
                            <strong>Aktivierungsmail</strong> — nach der Registrierung zur
                            Bestätigung der E-Mail-Adresse (Pflicht für Kontoaktivierung)
                        </li>
                        <li>
                            <strong>Willkommensmail</strong> — einmalig nach erfolgreicher
                            Aktivierung
                        </li>
                        <li>
                            <strong>Passwort-Zurücksetzen</strong> — auf Anfrage des Nutzers
                        </li>
                        <li>
                            <strong>Wöchentlicher Newsletter</strong> — mit neuen Rezepten und
                            Highlights (nur bei Einwilligung, jederzeit abbestellbar)
                        </li>
                    </ul>
                    <p>
                        Da der E-Mail-Dienst auf unseren eigenen Servern betrieben wird, verbleiben
                        E-Mail-Adresse und Name ausschließlich in unserer Infrastruktur und werden
                        nicht an Dritte weitergegeben.
                    </p>
                    <p>
                        <strong>Rechtsgrundlage transaktionale E-Mails:</strong> Art. 6 Abs. 1 lit.
                        b DSGVO (Vertragserfüllung — z.&nbsp;B. Kontoaktivierung, Passwort-Reset).
                    </p>
                    <p>
                        <strong>Rechtsgrundlage Newsletter:</strong> Art. 6 Abs. 1 lit. a DSGVO
                        (Einwilligung). Der Newsletter kann jederzeit über den Abmeldelink in jeder
                        E-Mail oder in den Kontoeinstellungen abbestellt werden.
                    </p>
                </Section>

                {/* ── 12. GlitchTip ── */}
                <Section id="sentry" title="13. Fehlerüberwachung — GlitchTip">
                    <p>
                        Zur Überwachung und Behebung technischer Fehler betreiben wir eine Instanz
                        der Open-Source-Software <strong>GlitchTip</strong> auf{' '}
                        <strong>
                            unseren eigenen Servern bei der netcup GmbH in Nürnberg, Deutschland
                        </strong>
                        . Alle Fehlerdaten verbleiben ausschließlich auf unseren Servern — es findet
                        keine Datenübertragung an externe Dienstleister oder Server außerhalb der EU
                        statt.
                    </p>
                    <p>
                        Wenn ein technischer Fehler in der Anwendung auftritt, kann GlitchTip
                        automatisch einen Fehlerbericht erstellen, der folgende Daten enthalten
                        kann:
                    </p>
                    <ul>
                        <li>Technische Details des Fehlers (Stack-Trace, Fehlermeldung)</li>
                        <li>URL der aufgerufenen Seite</li>
                        <li>Browser-Typ und -Version, Betriebssystem</li>
                        <li>IP-Adresse (anonymisiert)</li>
                        <li>
                            Nutzer-ID des angemeldeten Nutzers (sofern vorhanden, ohne weitere
                            personenbezogene Daten)
                        </li>
                    </ul>
                    <p>
                        Wir haben GlitchTip so konfiguriert, dass personenbezogene
                        Nutzerinformationen (Name, E-Mail) vor der Speicherung herausgefiltert
                        werden (PII-Scrubbing).
                    </p>
                    <p>
                        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO. Unser
                        berechtigtes Interesse besteht in der Fehlerverfolgung zur Gewährleistung
                        der Stabilität und Sicherheit der Plattform.
                    </p>
                </Section>

                {/* ── 13. MinIO ── */}
                <Section id="bilder" title="14. Bildspeicherung — MinIO">
                    <p>
                        Für die Speicherung nutzergenerierter Bilder (Rezeptfotos, Profilbilder,
                        Koch-Fotos) betreiben wir eine Instanz der
                        Open-Source-Objektspeicher-Software <strong>MinIO</strong> auf{' '}
                        <strong>
                            unseren eigenen Servern bei der netcup GmbH in Nürnberg, Deutschland
                        </strong>
                        . MinIO ist eine S3-kompatible Speicherlösung. Es findet keine
                        Datenübertragung an externe Cloud-Anbieter oder Server außerhalb der EU
                        statt.
                    </p>
                    <p>
                        Alle hochgeladenen Bilder verbleiben ausschließlich auf unseren Servern.
                        Bilder werden in drei Kategorien verwaltet: Uploads (Zwischenspeicher bis
                        zur Freigabe), freigegebene Bilder und abgelehnte Inhalte.
                    </p>
                    <p>
                        Hochgeladene Bilder durchlaufen vor der Veröffentlichung eine automatisierte
                        Inhaltsmoderation (siehe Abschnitt 7). Bilder, die gegen unsere Richtlinien
                        verstoßen, werden nicht veröffentlicht und innerhalb von 24 Stunden aus dem
                        Aktivspeicher entfernt.
                    </p>
                    <p>
                        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
                        (Vertragserfüllung — Bereitstellung der Bilderspeicherfunktion).
                    </p>
                </Section>

                {/* ── 14. Cookies ── */}
                <Section id="cookies" title="15. Cookies & lokaler Speicher">
                    <p>
                        Unsere Website verwendet Cookies und ähnliche Technologien. Cookies sind
                        kleine Textdateien, die auf Ihrem Endgerät gespeichert werden. Wir verwenden
                        ausschließlich technisch notwendige Cookies — keine Marketing- oder
                        Tracking-Cookies.
                    </p>
                    <p>
                        <strong>
                            Technisch notwendige Cookies (keine Einwilligung erforderlich):
                        </strong>
                    </p>
                    <ul>
                        <li>
                            Authentifizierungs-Cookies (halten Sie eingeloggt, Session bis 30 Tage)
                        </li>
                        <li>CSRF-Schutz-Cookie (Sicherheit bei Formularen, Sitzungsdauer)</li>
                        <li>Theme-Präferenz (Light/Dark-Mode, im Local Storage auf Ihrem Gerät)</li>
                    </ul>
                    <p>
                        Darüber hinaus nutzen wir den Browser-Local Storage für technisch notwendige
                        Zwecke (z.&nbsp;B. Zwischenspeichern von Editor-Entwürfen). Diese Daten
                        verbleiben ausschließlich auf Ihrem Gerät und werden nicht an unsere Server
                        übermittelt.
                    </p>
                    <p>
                        Da wir keine Marketing-, Werbe- oder Analyse-Cookies setzen, ist für unsere
                        Cookie-Nutzung keine gesonderte Einwilligung erforderlich.
                    </p>
                    <p>
                        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigte
                        Interessen — Betrieb und Sicherheit der Website) sowie Art. 6 Abs. 1 lit. b
                        DSGVO (Vertragserfüllung bei Authentifizierungs-Cookies).
                    </p>
                </Section>

                {/* ── 16. Kontakt ── */}
                <Section id="kontakt" title="16. Kontaktaufnahme">
                    <p>
                        Bei der Kontaktaufnahme per E-Mail werden die übermittelten Daten (Name,
                        E-Mail, Nachrichteninhalt) zur Bearbeitung der Anfrage gespeichert. Wir
                        geben diese Daten nicht ohne Ihre Einwilligung weiter.
                    </p>
                    <p>
                        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)
                        bzw. Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Bearbeitung
                        von Anfragen). Kontaktdaten werden spätestens nach 3 Jahren gelöscht, sofern
                        kein laufender Vorgang dies erfordert.
                    </p>
                </Section>

                {/* ── 17. Rechte ── */}
                <Section id="rechte" title="17. Ihre Rechte als betroffene Person">
                    <p>
                        Hinsichtlich der Sie betreffenden personenbezogenen Daten stehen Ihnen
                        gegenüber uns folgende Rechte zu:
                    </p>

                    <SubSection title="Recht auf Auskunft (Art. 15 DSGVO)">
                        <p>
                            Sie können Auskunft darüber verlangen, ob und welche personenbezogenen
                            Daten wir über Sie verarbeiten, sowie eine Kopie dieser Daten anfordern.
                        </p>
                    </SubSection>

                    <SubSection title="Recht auf Berichtigung (Art. 16 DSGVO)">
                        <p>
                            Sie haben das Recht, unrichtige personenbezogene Daten unverzüglich
                            berichtigen zu lassen. Viele Angaben können Sie direkt in Ihren
                            Kontoeinstellungen korrigieren.
                        </p>
                    </SubSection>

                    <SubSection title='Recht auf Löschung ("Recht auf Vergessenwerden", Art. 17 DSGVO)'>
                        <p>
                            Sie können die Löschung Ihrer personenbezogenen Daten verlangen, wenn
                            einer der gesetzlich vorgesehenen Gründe zutrifft — z.&nbsp;B. wenn die
                            Daten nicht mehr für die Zwecke benötigt werden, für die sie erhoben
                            wurden. Ihr Konto können Sie jederzeit in den Einstellungen löschen.
                        </p>
                    </SubSection>

                    <SubSection title="Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)">
                        <p>
                            Sie können unter bestimmten Voraussetzungen die Einschränkung der
                            Verarbeitung Ihrer Daten verlangen.
                        </p>
                    </SubSection>

                    <SubSection title="Recht auf Datenübertragbarkeit (Art. 20 DSGVO)">
                        <p>
                            Sie haben das Recht, Ihre personenbezogenen Daten in einem
                            strukturierten, gängigen, maschinenlesbaren Format zu erhalten. Auf
                            Anfrage stellen wir einen Datenexport Ihrer Inhalte bereit.
                        </p>
                    </SubSection>

                    <SubSection title="Widerspruchsrecht (Art. 21 DSGVO)">
                        <p>
                            Sie können jederzeit der Verarbeitung Ihrer personenbezogenen Daten
                            widersprechen, die auf Basis unserer berechtigten Interessen (Art. 6
                            Abs. 1 lit. f DSGVO) erfolgt. Wir verarbeiten die Daten dann nicht mehr,
                            es sei denn, wir können zwingende schutzwürdige Gründe nachweisen, die
                            Ihre Interessen überwiegen.
                        </p>
                    </SubSection>

                    <SubSection title="Widerruf von Einwilligungen (Art. 7 Abs. 3 DSGVO)">
                        <p>
                            Soweit die Verarbeitung auf einer Einwilligung beruht, können Sie diese
                            jederzeit mit Wirkung für die Zukunft widerrufen. Die Rechtmäßigkeit der
                            bis zum Widerruf erfolgten Verarbeitung bleibt davon unberührt.
                        </p>
                    </SubSection>

                    <SubSection title="Beschwerderecht bei einer Aufsichtsbehörde (Art. 77 DSGVO)">
                        <p>
                            Sie haben das Recht, sich bei einer Datenschutzaufsichtsbehörde zu
                            beschweren, wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer Daten
                            gegen die DSGVO verstößt. Zuständig ist die Aufsichtsbehörde Ihres
                            gewöhnlichen Aufenthaltsorts oder Arbeitsplatzes sowie die für uns
                            zuständige Landesbehörde. Die Bundesbeauftragte für den Datenschutz und
                            die Informationsfreiheit (BfDI) ist unter{' '}
                            <a
                                href="https://www.bfdi.bund.de"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                bfdi.bund.de
                            </a>{' '}
                            erreichbar.
                        </p>
                    </SubSection>

                    <div
                        className={css({
                            mt: '4',
                            p: '4',
                            borderRadius: 'md',
                            border: '1px solid',
                            borderColor: 'border',
                            background: 'surface-raised',
                        })}
                    >
                        <p className={css({ mb: '0 !important' })}>
                            Zur Ausübung Ihrer Rechte wenden Sie sich bitte per E-Mail an:{' '}
                            <a href="mailto:datenschutz@kuechentakt.de">
                                datenschutz@kuechentakt.de
                            </a>
                        </p>
                    </div>
                </Section>

                {/* ── 18. Dienstleister-Übersicht ── */}
                <Section id="dienstleister" title="18. Übersicht der eingesetzten Dienstleister">
                    <p>
                        <strong>Auftragsverarbeiter gemäß Art. 28 DSGVO</strong> — mit folgenden
                        Dienstleistern wurde ein Auftragsverarbeitungsvertrag (AVV) gemäß Art. 28
                        DSGVO geschlossen:
                    </p>
                    <ProcessorTable
                        rows={[
                            {
                                provider: 'netcup GmbH',
                                purpose: 'Webhosting & Serverinfrastruktur',
                                location: 'Deutschland (Nürnberg)',
                                basis: 'AVV geschlossen',
                            },
                        ]}
                    />

                    <p className={css({ mt: '4', mb: '2', fontSize: 'xs', color: 'text-muted' })}>
                        Folgende Dienste laufen auf den bei netcup GmbH betriebenen Servern und
                        fallen damit unter den o.g. AVV mit netcup. Es findet kein Datentransfer an
                        weitere Dritte statt:
                    </p>
                    <ProcessorTable
                        rows={[
                            {
                                provider: 'OpenPanel',
                                purpose: 'Web-Analyse',
                                location: 'Deutschland (Nürnberg)',
                                basis: 'Eigene Server (netcup AVV)',
                            },
                            {
                                provider: 'Chatwoot',
                                purpose: 'Live-Chat / Support',
                                location: 'Deutschland (Nürnberg)',
                                basis: 'Eigene Server (netcup AVV)',
                            },
                            {
                                provider: 'Notifuse',
                                purpose: 'E-Mail-Versand, Push-Benachrichtigungen',
                                location: 'Deutschland (Nürnberg)',
                                basis: 'Eigene Server (netcup AVV)',
                            },
                            {
                                provider: 'MinIO',
                                purpose: 'Bildspeicherung',
                                location: 'Deutschland (Nürnberg)',
                                basis: 'Eigene Server (netcup AVV)',
                            },
                            {
                                provider: 'GlitchTip',
                                purpose: 'Fehlerüberwachung',
                                location: 'Deutschland (Nürnberg)',
                                basis: 'Eigene Server (netcup AVV)',
                            },
                        ]}
                    />

                    <p className={css({ mt: '5' })}>
                        <strong>Eigenständige Verantwortliche</strong> — diese Dienstleister
                        verarbeiten Daten in eigener datenschutzrechtlicher Verantwortung:
                    </p>
                    <ProcessorTable
                        rows={[
                            {
                                provider: 'Cloudflare, Inc.',
                                purpose: 'CAPTCHA (Turnstile)',
                                location: 'USA (DPF)',
                                basis: 'cloudflare.com/privacypolicy',
                            },
                            {
                                provider: 'OpenAI, LLC',
                                purpose: 'Inhaltsmoderation',
                                location: 'USA (SCCs)',
                                basis: 'openai.com/policies/privacy-policy',
                            },
                        ]}
                    />
                </Section>

                {/* ── 19. Sicherheit ── */}
                <Section id="sicherheit" title="19. Datensicherheit">
                    <p>
                        Wir verwenden für alle Verbindungen SSL/TLS-Verschlüsselung (erkennbar am
                        Schloss-Symbol und <code>https://</code> in der Adresszeile). Darüber hinaus
                        treffen wir geeignete technische und organisatorische Sicherheitsmaßnahmen,
                        um Ihre Daten gegen Manipulation, Verlust, Zerstörung und unbefugten Zugriff
                        zu schützen. Unsere Sicherheitsmaßnahmen werden fortlaufend verbessert.
                    </p>
                    <p>
                        Passwörter werden ausschließlich verschlüsselt gespeichert — weder wir noch
                        unsere Mitarbeiter haben Zugriff auf Ihr Klartext-Passwort.
                    </p>
                </Section>

                {/* ── 20. Änderungen ── */}
                <Section id="aenderungen" title="20. Änderungen dieser Datenschutzerklärung">
                    <p>
                        Diese Datenschutzerklärung ist aktuell gültig und hat den Stand{' '}
                        <strong>{LAST_UPDATED}</strong>. Durch die Weiterentwicklung unserer
                        Plattform oder aufgrund geänderter gesetzlicher Anforderungen kann es
                        notwendig werden, diese Datenschutzerklärung anzupassen. Die jeweils
                        aktuelle Fassung ist jederzeit unter{' '}
                        <Link
                            href="/datenschutz"
                            className={css({
                                color: 'palette.orange',
                                textDecoration: 'underline',
                            })}
                        >
                            kuechentakt.de/datenschutz
                        </Link>{' '}
                        abrufbar. Bei wesentlichen Änderungen werden registrierte Nutzer per E-Mail
                        informiert.
                    </p>
                </Section>

                {/* Footer Nav */}
                <div
                    className={css({
                        pt: '8',
                        mt: '8',
                        borderTop: '1px solid',
                        borderColor: 'border',
                        display: 'flex',
                        gap: '6',
                        flexWrap: 'wrap',
                        fontSize: 'xs',
                        color: 'text-muted',
                    })}
                >
                    <Link
                        href="/impressum"
                        className={css({
                            _hover: { color: 'palette.orange' },
                            transition: 'color 0.15s',
                        })}
                    >
                        Impressum
                    </Link>
                    <Link
                        href="/"
                        className={css({
                            _hover: { color: 'palette.orange' },
                            transition: 'color 0.15s',
                        })}
                    >
                        Zurück zur Startseite
                    </Link>
                    <span className={css({ ml: 'auto' })}>
                        © {new Date().getFullYear()} KüchenTakt
                    </span>
                </div>
            </div>
        </PageShell>
    );
}
