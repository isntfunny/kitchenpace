import {
    ArrowDown,
    ArrowUpRight,
    BookOpen,
    Download,
    KeyRound,
    ShoppingBasket,
    Sparkles,
    Timer,
} from 'lucide-react';
import Link from 'next/link';

import { Heading, Text } from '@app/components/atoms/Typography';
import { PageShell } from '@app/components/layouts/PageShell';
import { SCOPES, SCOPE_LABELS } from '@app/lib/api/permissions';

import { css } from 'styled-system/css';

import { ApiGuide } from './ApiGuide';
import { ApiReference } from './ApiReference';
import { CodeExample } from './CodeExample';

export const metadata = {
    title: 'API-Dokumentation – KüchenTakt',
    description: 'Rezepte für eigene Anwendungen abrufen und privat importieren.',
};
const textLink = css({
    color: 'primary',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
    _hover: { color: 'primary-dark' },
});
export default function ApiDocsPage() {
    return (
        <PageShell>
            <div
                id="api-documentation"
                className={css({
                    maxW: '1120px',
                    mx: 'auto',
                    py: { base: '4', md: '8' },
                    minW: '0',
                })}
            >
                <header className={css({ mb: { base: '8', md: '10' } })}>
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2',
                            fontFamily: 'body',
                            color: 'primary',
                            fontSize: 'xs',
                            fontWeight: '600',
                            mb: '3',
                        })}
                    >
                        <BookOpen size={16} aria-hidden="true" /> FÜR DEINE INTEGRATIONEN
                        <span
                            className={css({
                                ml: '1',
                                px: '2',
                                py: '0.5',
                                borderRadius: 'full',
                                bg: 'accent.soft',
                                color: 'text-muted',
                            })}
                        >
                            API v1
                        </span>
                    </div>
                    <Heading
                        as="h1"
                        size="xl"
                        className={css({ fontSize: { base: '3xl', md: '4xl' }, mb: '3' })}
                    >
                        Deine Rezepte. Auch in deinen Apps.
                    </Heading>
                    <Text color="muted" className={css({ maxW: '640px' })}>
                        Verbinde eigene Skripte und Anwendungen mit KüchenTakt. Lies deine Rezepte,
                        importiere neue Ideen und fülle deine Bring!-Einkaufsliste.
                    </Text>
                    <nav
                        aria-label="API-Dokumentation"
                        className={css({
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '3',
                            mt: '6',
                            fontFamily: 'body',
                            fontSize: 'sm',
                        })}
                    >
                        <Link
                            href="/profile/api-keys"
                            className={css({
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2',
                                px: '4',
                                py: '2.5',
                                bg: 'primary',
                                color: 'white',
                                borderRadius: 'lg',
                                fontWeight: '600',
                                _hover: { bg: 'primary-dark' },
                            })}
                        >
                            <KeyRound size={16} aria-hidden="true" /> API-Key erstellen{' '}
                            <ArrowUpRight size={15} aria-hidden="true" />
                        </Link>
                        <a
                            href="#referenz"
                            className={css({
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2',
                                px: '4',
                                py: '2.5',
                                color: 'text',
                                border: '1px solid',
                                borderColor: 'border',
                                borderRadius: 'lg',
                                _hover: { bg: 'accent.soft' },
                            })}
                        >
                            Zur Referenz <ArrowDown size={15} aria-hidden="true" />
                        </a>
                        <a
                            href="/api/v1/openapi.json"
                            className={css({
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2',
                                px: '2',
                                py: '2.5',
                                color: 'text-muted',
                                _hover: { color: 'primary' },
                            })}
                        >
                            <Download size={16} aria-hidden="true" /> OpenAPI JSON
                        </a>
                    </nav>
                </header>

                <section
                    aria-labelledby="quickstart-title"
                    className={css({
                        display: 'grid',
                        gridTemplateColumns: { base: '1fr', lg: '0.8fr 1.2fr' },
                        gap: { base: '5', lg: '10' },
                        mb: '8',
                    })}
                >
                    <div>
                        <Heading
                            as="h2"
                            size="md"
                            id="quickstart-title"
                            className={css({ mb: '4' })}
                        >
                            Dein erster Aufruf
                        </Heading>
                        <ol
                            className={css({
                                display: 'flex',
                                flexDir: 'column',
                                gap: '4',
                                listStyle: 'none',
                                p: '0',
                                m: '0',
                                fontFamily: 'body',
                                fontSize: 'sm',
                                lineHeight: 'relaxed',
                                color: 'text-muted',
                            })}
                        >
                            {[
                                <>
                                    Erstelle einen{' '}
                                    <Link href="/profile/api-keys" className={textLink}>
                                        API-Key
                                    </Link>
                                    . Neue Schlüssel dürfen zunächst nur Rezepte lesen.
                                </>,
                                <>
                                    Sende den Schlüssel im Header{' '}
                                    <code
                                        className={css({ color: 'text', fontFamily: 'monospace' })}
                                    >
                                        x-api-key
                                    </code>
                                    .
                                </>,
                                <>
                                    Rufe deine Rezepte ab – einschließlich deiner privaten Entwürfe.
                                </>,
                            ].map((step, i) => (
                                <li
                                    key={i}
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'baseline',
                                        gap: '3',
                                    })}
                                >
                                    <span
                                        className={css({
                                            color: 'primary',
                                            fontWeight: '600',
                                            fontSize: 'xs',
                                            flexShrink: '0',
                                        })}
                                    >
                                        0{i + 1}
                                    </span>
                                    <span>{step}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                    <CodeExample />
                </section>

                <section
                    aria-label="Hinweise zur API"
                    className={css({
                        display: 'grid',
                        gridTemplateColumns: { base: '1fr', md: '1fr 1fr' },
                        gap: '3',
                        mb: { base: '10', md: '14' },
                    })}
                >
                    <ApiGuide
                        title="Berechtigungen"
                        hint="Du entscheidest, was deine Integration darf"
                        icon={<KeyRound size={19} aria-hidden="true" />}
                    >
                        <p>
                            Zusätzliche Lese- und Schreibrechte wählst du beim Erstellen des
                            Schlüssels. Deine Zugangsdaten und die Veröffentlichung von Rezepten
                            bleiben in der Website. Für Sammlungen gibt es nur Lesen und Verwalten;
                            Verwalten umfasst Erstellen, Bearbeiten und Löschen.
                        </p>
                        <dl className={css({ mt: '3', display: 'grid', gap: '2' })}>
                            {SCOPES.map((scope) => (
                                <div key={scope}>
                                    <dt>
                                        <code>{scope}</code>
                                    </dt>
                                    <dd>{SCOPE_LABELS[scope]}</dd>
                                </div>
                            ))}
                        </dl>
                    </ApiGuide>
                    <ApiGuide
                        title="KI-Importe"
                        hint="Starten, Status abfragen, privaten Entwurf erhalten"
                        icon={<Sparkles size={19} aria-hidden="true" />}
                    >
                        <p>
                            <code>POST /api/v1/imports</code> nimmt Text oder eine URL entgegen und
                            liefert HTTP 202 mit der Task-ID <code>id</code>. Mit{' '}
                            <code>GET /api/v1/imports/&#123;id&#125;</code> fragst du den
                            Fortschritt ab.
                        </p>
                        <p>
                            Status: <code>queued</code>, <code>processing</code>,{' '}
                            <code>completed</code> oder <code>failed</code>. Bei Erfolg enthält{' '}
                            <code>recipeId</code> den privaten Entwurf, bei Fehlern steht der Code
                            in <code>errorCode</code>.
                        </p>
                        <p>
                            Die API unterstützt derzeit HTML-/Text-Seiten, keine
                            Video-Transkription, JavaScript-Seiten oder Bildübernahme.
                            Veröffentlichen kannst du den Entwurf auf der Website.
                        </p>
                    </ApiGuide>
                    <ApiGuide
                        title="Bring!-Einkaufslisten"
                        hint="Alle Rezeptzutaten oder eine eigene Auswahl"
                        icon={<ShoppingBasket size={19} aria-hidden="true" />}
                    >
                        <p>
                            Verknüpfe zuerst dein Konto unter{' '}
                            <Link href="/profile/integrations" className={textLink}>
                                Verknüpfte Dienste
                            </Link>
                            . <code>GET /api/v1/bring/lists</code> liefert deine Listen;{' '}
                            <code>GET /api/v1/bring/lists/&#123;id&#125;</code> deren Artikel.
                        </p>
                        <p>
                            Mit <code>POST /api/v1/bring/lists/&#123;id&#125;/recipes</code> und{' '}
                            <code>recipeId</code> fügst du alle Zutaten hinzu (maximal 50).
                            Optional: <code>servings</code> für die Portionen und{' '}
                            <code>ingredientIds</code> für eine Auswahl. Salz, Öl und andere
                            Alltagszutaten werden mitgenommen.
                        </p>
                        <p>
                            Bestehende Artikel bleiben unverändert. Prüfe pro Zutat{' '}
                            <code>added</code>, <code>existing</code> oder <code>failed</code>. Nach
                            einem Teilerfolg nur fehlgeschlagene Zutaten erneut übertragen.
                        </p>
                        <p>
                            <code>DELETE /api/v1/bring/lists/&#123;id&#125;/items?name=Tomate</code>{' '}
                            entfernt einen Artikel mit dem Recht <code>bring:write</code>. Verwende
                            den exakten <code>name</code> aus der Listenantwort und kodiere ihn als
                            URL-Parameter, nicht den <code>displayName</code>. Die Antwort enthält
                            den aktualisierten Listeninhalt. Fehlt der Artikel bereits, erhältst du{' '}
                            <code>409 BRING_CONFLICT</code>.
                        </p>
                    </ApiGuide>
                    <ApiGuide
                        title="Sammlungen"
                        hint="Eigene Rezeptsammlungen lesen und verwalten"
                        icon={<BookOpen size={19} aria-hidden="true" />}
                    >
                        <p>
                            <code>GET /api/v1/collections</code> listet deine Sammlungen.{' '}
                            <code>GET /api/v1/collections/&#123;id&#125;</code> liefert Details und
                            Rezept-IDs; <code>/recipes</code> die Rezeptdaten.
                        </p>
                        <p>
                            <code>POST /api/v1/collections</code> erstellt eine private Sammlung mit{' '}
                            <code>title</code>, optionaler <code>description</code> und bis zu 50{' '}
                            <code>recipeIds</code>.
                        </p>
                        <p>
                            <code>PATCH /api/v1/collections/&#123;id&#125;</code> ändert angegebene
                            Felder. Eine übergebene Rezeptliste ersetzt den gesamten Inhalt; ohne
                            sie bleibt der Editor-Inhalt erhalten. Änderungen setzen die Sammlung
                            auf privat, auch wenn sie zuvor veröffentlicht war.
                        </p>
                        <p>
                            <code>DELETE /api/v1/collections/&#123;id&#125;</code> löscht nur die
                            Sammlung, nicht ihre Rezepte. Alle drei Schreibaktionen brauchen das
                            gemeinsame Recht <code>collections:write</code>.
                        </p>
                    </ApiGuide>
                    <ApiGuide
                        title="Limits & Antworten"
                        hint="Seitenweise lesen und Fehler richtig behandeln"
                        icon={<Timer size={19} aria-hidden="true" />}
                    >
                        <p>
                            <strong>60 Anfragen pro Minute</strong> je Schlüssel. Bei HTTP 429
                            beachte <code>Retry-After</code>. Fehler enthalten einen Code und eine
                            Request-ID.
                        </p>
                        <p>
                            Rezept-, Favoriten-, Sammlungs- und Kochlisten enthalten{' '}
                            <code>items</code> und <code>nextCursor</code>. Sende diesen als{' '}
                            <code>cursor</code> für die nächste Seite. Standard: 20, maximal 100
                            Einträge.
                        </p>
                        <p>
                            Importe: 10 Aufträge pro UTC-Tag, höchstens 2 gleichzeitig je Nutzer.
                            Aufträge laufen nach 30 Minuten ab. Jeder POST startet einen neuen
                            Import bzw. Kocheintrag. „Gekocht“ erzeugt keine öffentliche
                            Aktivitätsmeldung.
                        </p>
                    </ApiGuide>
                </section>

                <section
                    id="referenz"
                    aria-labelledby="reference-title"
                    className={css({ scrollMarginTop: '120px', minW: '0' })}
                >
                    <div
                        className={css({
                            borderBottomWidth: '1px',
                            borderBottomStyle: 'solid',
                            borderColor: 'border',
                            pb: '4',
                            mb: '2',
                        })}
                    >
                        <Heading
                            as="h2"
                            size="lg"
                            id="reference-title"
                            className={css({ mb: '2' })}
                        >
                            API-Referenz
                        </Heading>
                        <Text color="muted" size="sm">
                            Wähle einen Endpunkt für Parameter, Beispiele und Antworten. Hier
                            eingegebene Schlüssel werden nicht dauerhaft gespeichert.
                        </Text>
                    </div>
                    <ApiReference />
                </section>
            </div>
        </PageShell>
    );
}
