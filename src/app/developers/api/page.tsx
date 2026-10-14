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
                    <code>imports:create</code>, <code>bring:read</code> oder{' '}
                    <code>bring:write</code>. Schreibrechte sind standardmäßig ausgeschaltet.
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
                    Für Schreibzugriffe genügen dein API-Key und ein JSON-Body. Jeder POST auf
                    /cooks erstellt einen neuen Kocheintrag, jeder POST auf /imports einen neuen
                    Importauftrag. Favoriten setzen und entfernen ist wiederholbar.
                </p>
                <p>
                    KI-Importe aus Text oder öffentlich erreichbaren HTML/Text-Seiten laufen im
                    Hintergrund. JavaScript-Seiten und Bildübernahmen werden nicht unterstützt. Das
                    Ergebnis bleibt ein privater Entwurf und kann nur in der Website veröffentlicht
                    werden. Der Start liefert HTTP 202 und die Task-ID im Feld <code>id</code>.
                    Frage den Status unter <code>GET /api/v1/imports/&#123;id&#125;</code> ab. Bei
                    Erfolg enthält <code>recipeId</code> den privaten Entwurf, bei Fehlern steht der
                    Code in <code>errorCode</code>.
                </p>
                <p>
                    Limits: 60 Anfragen pro Minute je Schlüssel; 10 Importaufträge pro UTC-Tag und
                    höchstens 2 offene Aufträge je Nutzer. Aufträge laufen nach 30 Minuten ab. Bei
                    429 beachte <code>Retry-After</code>. Fehler enthalten einen Code und eine
                    Request-ID. „Gekocht“-Einträge über die API erzeugen keine öffentliche
                    Aktivitätsmeldung.
                </p>
                <p>
                    Bring!: Verknüpfe dein Konto zuerst unter{' '}
                    <Link href="/profile/integrations">Verknüpfte Dienste</Link>.
                    <code> GET /api/v1/bring/lists</code> liefert verfügbare Listen;
                    <code> GET /api/v1/bring/lists/&#123;id&#125;</code> deren offene und zuletzt
                    gekaufte Artikel. Mit{' '}
                    <code>POST /api/v1/bring/lists/&#123;id&#125;/recipes</code> fügst du
                    Rezeptzutaten hinzu. Sende <code>recipeId</code>, optional <code>servings</code>{' '}
                    und <code>ingredientIds</code>
                    aus dem Rezeptdetail. Ohne Auswahl werden alle Zutaten übernommen (maximal 50).
                    Alltagszutaten wie Salz, Pfeffer und Öl werden nicht automatisch ausgefiltert.
                    Prüfe im Ergebnis jede Zutat auf <code>added</code>, <code>existing</code> oder
                    <code>failed</code>. Bestehende Artikel bleiben unverändert. Bei Teilerfolgen
                    nur fehlgeschlagene Zutaten nach Prüfung der Liste erneut übertragen.
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
