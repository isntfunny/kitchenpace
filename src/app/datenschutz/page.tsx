import { Metadata } from 'next';

import { PageShell } from '@app/components/layouts/PageShell';

import { css } from 'styled-system/css';

export const metadata: Metadata = {
    title: 'Datenschutzerklärung — KochTakt',
    description:
        'Datenschutzerklärung von KochTakt — Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO.',
};

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
                <article
                    className={css({
                        display: 'grid',
                        gap: '6',
                        p: { base: '5', md: '8' },
                        borderRadius: 'lg',
                        border: '1px solid',
                        borderColor: 'border',
                        background: 'surface-raised',
                        color: 'text',
                        lineHeight: '1.75',
                    })}
                >
                    <header>
                        <h1
                            className={css({
                                fontSize: { base: '3xl', md: '4xl' },
                                fontWeight: '800',
                                lineHeight: '1.15',
                                mb: '2',
                            })}
                        >
                            Datenschutzerklaerung
                        </h1>
                        <p className={css({ color: 'text-muted' })}>Stand: 02. Juni 2026</p>
                    </header>

                    <section>
                        <h2 className={sectionHeading}>1. Verantwortlicher</h2>
                        <p>
                            Verantwortlich fuer die Verarbeitung personenbezogener Daten auf dieser
                            Website ist:
                        </p>
                        <p>
                            Sebastian Reuther
                            <br />
                            c/o Impressumservice Dein-Impressum
                            <br />
                            Stettiner Str. 41
                            <br />
                            35410 Hungen
                            <br />
                            E-Mail: info@kochtakt.de
                            <br />
                            Telefon: 0157 9234 1658
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>2. Allgemeine Hinweise</h2>
                        <p>
                            Wir verarbeiten personenbezogene Daten nur, soweit dies fuer den Betrieb
                            von KochTakt, die Bereitstellung der Funktionen, die Sicherheit der
                            Anwendung oder die Erfuellung gesetzlicher Pflichten erforderlich ist.
                            Personenbezogene Daten sind alle Informationen, mit denen eine Person
                            direkt oder indirekt identifiziert werden kann.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>3. Hosting und Server-Logs</h2>
                        <p>
                            Beim Aufruf der Website werden technisch notwendige Daten verarbeitet.
                            Dazu gehoeren insbesondere IP-Adresse, Datum und Uhrzeit des Zugriffs,
                            aufgerufene Seite, uebertragene Datenmenge, Browser- und
                            Geraeteinformationen sowie Referrer-URL. Diese Daten werden zur
                            Auslieferung der Website, zur Fehleranalyse und zur Abwehr von Angriffen
                            verarbeitet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>4. Benutzerkonto und Profil</h2>
                        <p>
                            Wenn du ein Benutzerkonto anlegst, verarbeiten wir die dafuer
                            erforderlichen Angaben, zum Beispiel E-Mail-Adresse, Benutzername,
                            Passwort- beziehungsweise Login-Daten, Profilangaben und Einstellungen.
                            Diese Daten werden benoetigt, um dein Konto anzulegen, dich anzumelden
                            und die Funktionen der Anwendung bereitzustellen. Rechtsgrundlage ist
                            Art. 6 Abs. 1 lit. b DSGVO.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>5. Inhalte, Rezepte und Interaktionen</h2>
                        <p>
                            Wenn du Rezepte, Kommentare, Bewertungen, Favoriten, Kochbilder oder
                            andere Inhalte erstellst, speichern und verarbeiten wir diese Inhalte
                            zusammen mit deinem Benutzerkonto. Oeffentlich freigegebene Inhalte
                            koennen fuer andere Nutzer sichtbar sein. Die Verarbeitung erfolgt zur
                            Bereitstellung der jeweiligen Funktionen auf Grundlage von Art. 6 Abs. 1
                            lit. b DSGVO und, soweit es um den sicheren und geordneten Betrieb der
                            Plattform geht, auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>6. Uploads und Inhaltspruefung</h2>
                        <p>
                            Hochgeladene Bilder und veroeffentlichte Inhalte koennen automatisiert
                            oder manuell auf unzulaessige Inhalte geprueft werden. Dabei koennen
                            Inhalte, technische Metadaten und das zugehoerige Benutzerkonto
                            verarbeitet werden. Dies dient dem Schutz der Nutzer und dem
                            rechtssicheren Betrieb der Plattform. Rechtsgrundlage ist Art. 6 Abs. 1
                            lit. f DSGVO.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>7. KI-gestuetzte Rezeptfunktionen</h2>
                        <p>
                            Wenn du Funktionen zur Analyse oder zum Import von Rezepten nutzt,
                            werden die von dir eingegebenen oder importierten Rezeptdaten
                            verarbeitet, um daraus strukturierte Rezeptdaten und Ablaufplaene zu
                            erstellen. Gib dabei keine sensiblen personenbezogenen Daten ein. Die
                            Verarbeitung erfolgt zur Bereitstellung der von dir angeforderten
                            Funktion auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>8. Kontaktaufnahme</h2>
                        <p>
                            Wenn du uns kontaktierst, verarbeiten wir deine Angaben zur Bearbeitung
                            der Anfrage und fuer moegliche Anschlussfragen. Rechtsgrundlage ist Art.
                            6 Abs. 1 lit. b DSGVO, soweit deine Anfrage mit einem Vertrag oder
                            vorvertraglichen Massnahmen zusammenhaengt, ansonsten Art. 6 Abs. 1 lit.
                            f DSGVO.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>9. Cookies und lokale Speicherung</h2>
                        <p>
                            KochTakt verwendet technisch notwendige Cookies und vergleichbare
                            Speichertechniken, um Anmeldung, Sicherheit, Spracheinstellungen und
                            grundlegende Funktionen bereitzustellen. Ohne diese Speicherungen kann
                            die Website nicht vollstaendig genutzt werden. Rechtsgrundlage ist Art.
                            6 Abs. 1 lit. b DSGVO beziehungsweise Art. 6 Abs. 1 lit. f DSGVO.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>10. Schutz vor Missbrauch</h2>
                        <p>
                            Bei Registrierung und sicherheitsrelevanten Aktionen koennen technische
                            Schutzmassnahmen gegen Spam, Missbrauch und automatisierte Zugriffe
                            eingesetzt werden. Dabei werden technische Daten wie IP-Adresse,
                            Browserinformationen und Pruefergebnisse verarbeitet. Rechtsgrundlage
                            ist Art. 6 Abs. 1 lit. f DSGVO.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>11. Empfaenger und Dienstleister</h2>
                        <p>
                            Wir setzen technische Dienstleister ein, die uns beim Hosting, bei
                            Anmeldung, Datenspeicherung, E-Mail-Versand, Fehleranalyse, Sicherheit,
                            Bildspeicherung und bei KI-gestuetzten Funktionen unterstuetzen. Soweit
                            diese Dienstleister personenbezogene Daten in unserem Auftrag
                            verarbeiten, erfolgt dies auf Grundlage eines Vertrags zur
                            Auftragsverarbeitung gemaess Art. 28 DSGVO.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>12. Speicherdauer</h2>
                        <p>
                            Wir speichern personenbezogene Daten nur so lange, wie es fuer die
                            genannten Zwecke erforderlich ist oder gesetzliche
                            Aufbewahrungspflichten bestehen. Kontodaten und von dir erstellte
                            Inhalte werden grundsaetzlich gespeichert, solange dein Benutzerkonto
                            besteht oder die Inhalte fuer die Plattform erforderlich sind.
                            Server-Logs und Sicherheitsdaten werden regelmaessig geloescht, sofern
                            keine weitere Aufbewahrung zur Fehleranalyse, Sicherheit oder
                            Rechtsverfolgung erforderlich ist.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>13. Deine Rechte</h2>
                        <p>
                            Du hast nach Massgabe der DSGVO das Recht auf Auskunft, Berichtigung,
                            Loeschung, Einschraenkung der Verarbeitung, Datenuebertragbarkeit sowie
                            Widerspruch gegen bestimmte Verarbeitungen. Wenn eine Verarbeitung auf
                            Einwilligung beruht, kannst du diese Einwilligung jederzeit mit Wirkung
                            fuer die Zukunft widerrufen.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>14. Beschwerderecht</h2>
                        <p>
                            Du hast das Recht, dich bei einer Datenschutzaufsichtsbehoerde zu
                            beschweren, wenn du der Ansicht bist, dass die Verarbeitung deiner
                            personenbezogenen Daten gegen Datenschutzrecht verstoesst.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>
                            15. Aenderungen dieser Datenschutzerklaerung
                        </h2>
                        <p>
                            Wir koennen diese Datenschutzerklaerung anpassen, wenn sich Funktionen,
                            rechtliche Vorgaben oder technische Ablaeufe aendern. Es gilt die
                            jeweils auf dieser Seite veroeffentlichte Fassung.
                        </p>
                    </section>
                </article>
            </div>
        </PageShell>
    );
}

const sectionHeading = css({
    fontSize: 'xl',
    fontWeight: '700',
    mb: '2',
});
