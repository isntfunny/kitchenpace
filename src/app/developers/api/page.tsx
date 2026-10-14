import Link from 'next/link';

import { PageShell } from '@app/components/layouts/PageShell';

import { css } from 'styled-system/css';

import { ApiReference } from './ApiReference';

export const metadata = {
    title: 'API-Dokumentation – KüchenTakt',
    description: 'Rezepte für eigene Anwendungen abrufen und privat importieren.',
};
export default function ApiDocsPage() {
    return (
        <PageShell>
            <section
                className={css({
                    py: '6',
                    fontFamily: 'body',
                    display: 'flex',
                    flexDir: 'column',
                    gap: '4',
                })}
            >
                <h1 className={css({ fontFamily: 'heading', fontSize: '3xl' })}>
                    Deine Küche. Deine Integrationen.
                </h1>
                <p>
                    Verbinde deine Anwendungen mit Rezepten, Favoriten und deiner Kochhistorie.
                    Erstelle zuerst einen persönlichen Schlüssel unter{' '}
                    <Link href="/profile/api-keys">API & Integrationen</Link>.
                </p>
                <p>
                    Sende ihn im Header <code>x-api-key</code>. Jeder Endpoint benötigt das passende
                    Recht: <code>recipes:read</code>, <code>favorites:read/write</code>,{' '}
                    <code>collections:read</code>, <code>cooks:read/write</code> oder{' '}
                    <code>imports:create</code>. Schreibrechte sind standardmäßig ausgeschaltet.
                </p>
                <pre
                    className={css({
                        p: '4',
                        bg: 'surface',
                        borderRadius: 'lg',
                        overflowX: 'auto',
                    })}
                >
                    {
                        'curl "$KUECHENTAKT_URL/api/v1/recipes?limit=20" \\\n  -H "x-api-key: $KUECHENTAKT_API_KEY"'
                    }
                </pre>
                <p>
                    Listen enthalten <code>items</code> und <code>nextCursor</code>. Übergebe diesen
                    als <code>cursor</code>, um weiterzublättern. Standard: 20, maximal 100
                    Einträge.
                </p>
                <p>
                    Für POST /cooks und POST /imports ist ein eigener <code>Idempotency-Key</code>{' '}
                    pro Vorgang erforderlich. Wiederhole denselben Vorgang mit demselben Schlüssel;
                    ein veränderter Inhalt liefert 409. Favoriten setzen/entfernen ist ebenfalls
                    wiederholbar.
                </p>
                <p>
                    KI-Importe aus Text oder öffentlich erreichbaren HTML/Text-Seiten laufen im
                    Hintergrund. JavaScript-Seiten und Bildübernahmen werden nicht unterstützt. Das
                    Ergebnis bleibt ein privater Entwurf und kann nur in der Website veröffentlicht
                    werden. Frage den Status unter <code>GET /api/v1/imports/&#123;id&#125;</code>{' '}
                    ab.
                </p>
                <p>
                    Limits: 60 Anfragen pro Minute je Schlüssel; 10 Importaufträge pro UTC-Tag und
                    höchstens 2 offene Aufträge je Nutzer. Aufträge laufen nach 30 Minuten ab. Bei
                    429 beachte <code>Retry-After</code>. Fehler enthalten einen Code und eine
                    Request-ID. „Gekocht“-Einträge über die API erzeugen keine öffentliche
                    Aktivitätsmeldung.
                </p>
                <p>
                    Hier eingegebene Schlüssel werden nicht dauerhaft gespeichert.{' '}
                    <a href="/api/v1/openapi.json">OpenAPI herunterladen</a>
                </p>
            </section>
            <ApiReference />
        </PageShell>
    );
}
