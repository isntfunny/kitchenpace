import { Metadata } from 'next';

import { PageShell } from '@app/components/layouts/PageShell';

import { css } from 'styled-system/css';

export const metadata: Metadata = {
    title: 'Datenschutzerklärung',
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
                            Datenschutzerklärung
                        </h1>
                        <p className={css({ color: 'text-muted' })}>Stand: 03. Juni 2026</p>
                    </header>

                    <section>
                        <h2 className={sectionHeading}>1. Verantwortlicher</h2>
                        <p>
                            Verantwortlich für die Verarbeitung personenbezogener Daten auf dieser
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
                        <p className={css({ mt: '2', color: 'text-muted' })}>
                            Wir sind gesetzlich nicht zur Bestellung eines Datenschutzbeauftragten
                            verpflichtet.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>2. Allgemeine Hinweise</h2>
                        <p>
                            Wir verarbeiten personenbezogene Daten nur, soweit dies für den Betrieb
                            von KochTakt, die Bereitstellung der Funktionen, die Sicherheit der
                            Anwendung oder die Erfüllung gesetzlicher Pflichten erforderlich ist.
                            Personenbezogene Daten sind alle Informationen, mit denen eine Person
                            direkt oder indirekt identifiziert werden kann.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>3. Hosting und Server-Logs</h2>
                        <p>
                            Beim Aufruf der Website werden technisch notwendige Daten verarbeitet.
                            Dazu gehören insbesondere IP-Adresse, Datum und Uhrzeit des Zugriffs,
                            aufgerufene Seite, übertragene Datenmenge, Browser- und
                            Geräteinformationen sowie Referrer-URL. Diese Daten werden zur
                            Auslieferung der Website, zur Fehleranalyse und zur Abwehr von Angriffen
                            verarbeitet. Unsere Anwendung und die zugehörige Infrastruktur werden
                            auf Servern in Deutschland betrieben. Rechtsgrundlage ist Art. 6 Abs. 1
                            lit. f DSGVO.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>4. Benutzerkonto, Anmeldung und Profil</h2>
                        <p>
                            Wenn du ein Benutzerkonto anlegst, verarbeiten wir die dafür
                            erforderlichen Angaben, zum Beispiel E-Mail-Adresse, Benutzername,
                            Anmelde- und Sicherheitsdaten (einschließlich Passwort beziehungsweise
                            gegebenenfalls von dir eingerichteter Passkeys), Profilangaben und
                            Einstellungen. Diese Daten werden benötigt, um dein Konto anzulegen,
                            dich anzumelden und die Funktionen der Anwendung bereitzustellen.
                            Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
                        </p>
                        <p className={css({ mt: '2' })}>
                            Wenn du dich über einen externen Anbieter anmeldest (zum Beispiel Google
                            oder Twitch), verarbeiten wir die von dort übermittelten Anmeldedaten
                            (etwa Name, E-Mail-Adresse, Profilbild) sowie die für die Verbindung
                            erforderlichen Zugangsdaten. Hierbei kann eine Übermittlung in die USA
                            erfolgen; siehe hierzu den Abschnitt „Datenübermittlung in Drittländer".
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>5. Inhalte, Rezepte und Interaktionen</h2>
                        <p>
                            Wenn du Rezepte, Kommentare, Bewertungen, Favoriten, Kochbilder oder
                            andere Inhalte erstellst, speichern und verarbeiten wir diese Inhalte
                            zusammen mit deinem Benutzerkonto. Öffentlich freigegebene Inhalte
                            können für andere Nutzer sichtbar sein. Die Verarbeitung erfolgt zur
                            Bereitstellung der jeweiligen Funktionen auf Grundlage von Art. 6 Abs. 1
                            lit. b DSGVO und, soweit es um den sicheren und geordneten Betrieb der
                            Plattform geht, auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>6. Uploads und Inhaltsprüfung</h2>
                        <p>
                            Hochgeladene Bilder und veröffentlichte Inhalte können automatisiert
                            oder manuell auf unzulässige Inhalte geprüft werden. Dabei können
                            Inhalte, technische Metadaten und das zugehörige Benutzerkonto
                            verarbeitet werden. Für die automatisierte Prüfung von Texten und
                            Bildern setzen wir einen externen KI-Dienst ein; hierbei kann eine
                            Übermittlung in die USA erfolgen (siehe Abschnitt „Datenübermittlung in
                            Drittländer"). Dies dient dem Schutz der Nutzer und dem rechtssicheren
                            Betrieb der Plattform. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>7. KI-gestützte Rezeptfunktionen</h2>
                        <p>
                            Wenn du Funktionen zur Analyse oder zum Import von Rezepten nutzt,
                            werden die von dir eingegebenen oder importierten Rezeptdaten
                            verarbeitet, um daraus strukturierte Rezeptdaten und Ablaufpläne zu
                            erstellen. Gibst du eine Quelladresse zum Import an, verarbeiten wir
                            diese Adresse und die abgerufenen Inhalte. Für diese Funktionen setzen
                            wir einen externen KI-Dienst ein, wobei eine Übermittlung in die USA
                            erfolgen kann (siehe Abschnitt „Datenübermittlung in Drittländer"). Gib
                            dabei keine sensiblen personenbezogenen Daten ein. Die Verarbeitung
                            erfolgt zur Bereitstellung der von dir angeforderten Funktion auf
                            Grundlage von Art. 6 Abs. 1 lit. b DSGVO.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>8. Kontaktaufnahme und Support</h2>
                        <p>
                            Wenn du uns kontaktierst oder eine bereitgestellte Support-Funktion
                            nutzt, verarbeiten wir deine Angaben sowie technische Daten zur
                            Bearbeitung der Anfrage und für mögliche Anschlussfragen.
                            Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, soweit deine Anfrage mit
                            einem Vertrag oder vorvertraglichen Maßnahmen zusammenhängt, ansonsten
                            Art. 6 Abs. 1 lit. f DSGVO.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>9. Benachrichtigungen und E-Mails</h2>
                        <p>
                            Wir versenden system- und kontobezogene E-Mails (zum Beispiel zur
                            Aktivierung, zu Sicherheitshinweisen oder zum Zurücksetzen des
                            Passworts), die für die Bereitstellung des Dienstes erforderlich sind
                            (Art. 6 Abs. 1 lit. b DSGVO). Soweit du dem Erhalt weiterer
                            Benachrichtigungen, eines Newsletters oder von Push-Mitteilungen
                            zustimmst beziehungsweise diese in deinen Einstellungen aktiviert sind,
                            verarbeiten wir die hierfür erforderlichen Daten (etwa E-Mail-Adresse
                            oder Push-Endpunkt). Du kannst dieser Verarbeitung jederzeit für die
                            Zukunft in deinen Einstellungen oder über den Abmeldelink widersprechen.
                            Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)
                            beziehungsweise unser berechtigtes Interesse (Art. 6 Abs. 1 lit. f
                            DSGVO).
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>
                            10. Cookies, lokale Speicherung und Reichweitenmessung
                        </h2>
                        <p>
                            KochTakt verwendet technisch notwendige Cookies und vergleichbare
                            Speichertechniken (zum Beispiel lokale Speicherung), die für den Betrieb
                            und die Bereitstellung der von dir ausdrücklich angeforderten Dienste
                            unbedingt erforderlich sind — etwa zur Anmeldung, zur
                            Sitzungsverwaltung, zur Sicherheit und zur Speicherung deiner
                            Anzeige-Einstellungen. Für den Zugriff auf beziehungsweise die
                            Speicherung dieser Informationen auf deinem Endgerät ist nach § 25 Abs.
                            2 Nr. 2 TDDDG keine Einwilligung erforderlich. Die nachfolgende
                            Verarbeitung der so erlangten Daten stützen wir auf Art. 6 Abs. 1 lit. b
                            DSGVO beziehungsweise Art. 6 Abs. 1 lit. f DSGVO.
                        </p>
                        <p className={css({ mt: '2' })}>
                            Darüber hinaus nutzen wir Funktionen zur Reichweitenmessung und Analyse
                            der Nutzung, zur Fehler- und Stabilitätsanalyse (einschließlich einer
                            stichprobenartigen Aufzeichnung von Sitzungsverläufen zur Eingrenzung
                            technischer Fehler) sowie eine Support-Chat-Funktion. Diese Dienste
                            werden auf eigener Infrastruktur in Deutschland betrieben. Soweit
                            hierbei nicht zwingend erforderliche Informationen auf deinem Endgerät
                            gespeichert oder ausgelesen werden, erfolgt dies auf Grundlage deiner
                            Einwilligung nach § 25 Abs. 1 TDDDG in Verbindung mit Art. 6 Abs. 1 lit.
                            a DSGVO. Diese Kategorien (Analyse, Fehler- &amp; Sitzungsaufzeichnung,
                            Support-Chat) sind standardmäßig deaktiviert und werden erst nach deiner
                            Einwilligung geladen. Deine Auswahl kannst du jederzeit mit Wirkung für
                            die Zukunft über den Link „Cookie-Einstellungen" im Seitenfuß ändern
                            oder widerrufen.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>11. Empfänger und Auftragsverarbeiter</h2>
                        <p>
                            Wir setzen sorgfältig ausgewählte Dienstleister ein, die uns beim
                            Hosting, bei der Anmeldung und Kontoverwaltung, der Datenspeicherung,
                            dem E-Mail-Versand, der Fehleranalyse, der Sicherheit, der
                            Bildspeicherung und bei KI-gestützten Funktionen unterstützen. Der weit
                            überwiegende Teil dieser Verarbeitungen findet auf eigenen Servern in
                            Deutschland statt. Soweit Dienstleister personenbezogene Daten in
                            unserem Auftrag verarbeiten, erfolgt dies auf Grundlage eines Vertrags
                            zur Auftragsverarbeitung gemäß Art. 28 DSGVO. Soweit einzelne dieser
                            Dienstleister ihren Sitz außerhalb der EU beziehungsweise des EWR haben,
                            gelten ergänzend die Hinweise im folgenden Abschnitt.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>
                            12. Datenübermittlung in Drittländer (insbesondere USA)
                        </h2>
                        <p>
                            Ein Teil der von uns genutzten Dienste verarbeitet Daten in den USA.
                            Eine Übermittlung personenbezogener Daten in die USA findet insbesondere
                            in folgenden Fällen statt:
                        </p>
                        <ul className={listStyle}>
                            <li>
                                <strong>KI-gestützte Funktionen</strong> (Inhaltsprüfung,
                                semantische Suche, Rezeptanalyse und -import): Wir nutzen OpenAI,
                                L.L.C. (San Francisco, USA). Dabei können Rezept- und
                                Kommentartexte, Profilangaben, von dir hochgeladene Bildinhalte
                                sowie von dir zum Import angegebene Quelladressen und deren Inhalte
                                übermittelt werden.
                            </li>
                            <li>
                                <strong>Schutz vor Missbrauch (Captcha)</strong>: Bei der
                                Registrierung setzen wir einen Sicherheitsdienst der Cloudflare,
                                Inc. (San Francisco, USA) ein. Dabei werden insbesondere deine
                                IP-Adresse, Browsermerkmale und ein Prüf-Token verarbeitet.
                            </li>
                            <li>
                                <strong>Optionale Anmeldung über externe Anbieter</strong> (nur bei
                                aktiver Auswahl durch dich): Bei einer Anmeldung über Google erfolgt
                                ein Anmeldevorgang mit Google LLC (USA); bei einer Anmeldung über
                                Twitch beziehungsweise einer Verknüpfung deines Twitch-Kontos
                                erfolgt ein Anmeldevorgang mit Twitch Interactive, Inc. / Amazon
                                (USA).
                            </li>
                        </ul>
                        <p className={css({ mt: '2' })}>
                            Soweit diese Anbieter unter dem EU-US Data Privacy Framework
                            zertifiziert sind, erfolgt die Übermittlung auf Grundlage des
                            Angemessenheitsbeschlusses der Europäischen Kommission vom 10. Juli 2023
                            (Art. 45 DSGVO). Ob ein Anbieter zertifiziert ist, kannst du unter
                            https://www.dataprivacyframework.gov einsehen. Soweit keine
                            Zertifizierung vorliegt, stützen wir die Übermittlung auf die
                            Standardvertragsklauseln der Europäischen Kommission gemäß Art. 46 Abs.
                            2 lit. c DSGVO und treffen ergänzende Schutzmaßnahmen. Eine Kopie der
                            jeweiligen Garantien kannst du über die unter Punkt 1 genannten
                            Kontaktdaten anfordern.
                        </p>
                        <p className={css({ mt: '2', color: 'text-muted' })}>
                            Wir weisen darauf hin, dass in den USA kein dem europäischen Recht
                            vollständig entsprechendes Datenschutzniveau garantiert werden kann und
                            insbesondere ein Zugriff durch US-Behörden nicht vollständig
                            ausgeschlossen werden kann.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>13. Speicherdauer</h2>
                        <p>
                            Wir speichern personenbezogene Daten nur so lange, wie es für die
                            genannten Zwecke erforderlich ist oder gesetzliche
                            Aufbewahrungspflichten bestehen. Im Einzelnen gilt:
                        </p>
                        <ul className={listStyle}>
                            <li>
                                Konto- und Profildaten: bis zur Löschung deines Kontos; danach
                                Löschung beziehungsweise Anonymisierung, soweit keine gesetzlichen
                                Aufbewahrungspflichten entgegenstehen.
                            </li>
                            <li>
                                Von dir erstellte Inhalte (Rezepte, Kommentare, Bewertungen,
                                Favoriten, Bilder): bis zu deren Löschung durch dich oder bis zur
                                Löschung deines Kontos.
                            </li>
                            <li>
                                Sitzungsdaten (einschließlich gespeicherter IP-Adresse und
                                Browserkennung): bis zum Ablauf der Sitzung (in der Regel sieben
                                Tage) beziehungsweise bis zur Abmeldung.
                            </li>
                            <li>
                                Server- und Anwendungs-Logs sowie Sicherheitsdaten: regelmäßige
                                Löschung, sobald sie für die genannten Zwecke nicht mehr
                                erforderlich sind, soweit nicht zur Aufklärung von
                                Sicherheitsvorfällen länger erforderlich.
                            </li>
                            <li>
                                Moderations- und Sicherheitsprotokolle sowie Meldungen: bis zur
                                abschließenden Bearbeitung sowie für einen angemessenen Zeitraum zur
                                Beweissicherung und Abwehr von Missbrauch.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>
                            14. Automatisierte Prüfung von Inhalten und Entscheidungen
                        </h2>
                        <p>
                            Zum Schutz unserer Nutzerinnen und Nutzer prüfen wir hochgeladene und
                            veröffentlichte Inhalte (Texte, Rezepte, Kommentare, Profilangaben und
                            Bilder) teilautomatisiert auf möglicherweise rechtswidrige oder
                            unzulässige Inhalte. Dabei kommt eine automatisierte Klassifizierung zum
                            Einsatz, die Inhalte mit hoher Verstoßwahrscheinlichkeit zur Prüfung
                            markiert, vorläufig zurückhalten oder ablehnen kann. Mehrfach gemeldete
                            Inhalte werden automatisiert zur Prüfung eskaliert.
                        </p>
                        <p className={css({ mt: '2' })}>
                            Eine abschließende, für dich nachteilige Entscheidung (etwa die
                            endgültige Löschung von Inhalten oder die Sperrung eines Kontos) treffen
                            wir nicht ausschließlich automatisiert; in diesen Fällen erfolgt eine
                            Prüfung durch unsere Moderation (menschliches Eingreifen). Soweit im
                            Einzelfall dennoch eine ausschließlich automatisierte Entscheidung mit
                            rechtlicher oder ähnlich erheblicher Wirkung getroffen werden sollte
                            (Art. 22 DSGVO), hast du das Recht, das Eingreifen einer Person
                            unsererseits zu erwirken, deinen eigenen Standpunkt darzulegen und die
                            Entscheidung anzufechten. Rechtsgrundlage ist unser berechtigtes
                            Interesse an einer sicheren, missbrauchsfreien Plattform (Art. 6 Abs. 1
                            lit. f DSGVO).
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>15. Deine Rechte</h2>
                        <p>
                            Du hast nach Maßgabe der DSGVO das Recht auf Auskunft, Berichtigung,
                            Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit sowie
                            Widerspruch gegen bestimmte Verarbeitungen. Wenn eine Verarbeitung auf
                            Einwilligung beruht, kannst du diese Einwilligung jederzeit mit Wirkung
                            für die Zukunft widerrufen.
                        </p>
                    </section>

                    <section className={highlightBox}>
                        <h2 className={sectionHeading}>16. Widerspruchsrecht nach Art. 21 DSGVO</h2>
                        <p className={css({ fontWeight: '700' })}>
                            Widerspruchsrecht bei Verarbeitungen auf Grundlage berechtigter
                            Interessen
                        </p>
                        <p className={css({ mt: '2' })}>
                            Soweit wir personenbezogene Daten auf Grundlage von Art. 6 Abs. 1 lit. f
                            DSGVO (berechtigtes Interesse) verarbeiten — etwa zur Auslieferung und
                            Sicherheit der Website, zum sicheren Betrieb der Plattform, zur
                            Inhaltsprüfung sowie zur Abwehr von Missbrauch —, hast du das Recht, aus
                            Gründen, die sich aus deiner besonderen Situation ergeben, jederzeit
                            gegen diese Verarbeitung Widerspruch einzulegen; dies gilt auch für ein
                            auf diese Bestimmung gestütztes Profiling (zum Beispiel zur Erstellung
                            von Geschmacks- beziehungsweise Empfehlungsprofilen).
                        </p>
                        <p className={css({ mt: '2' })}>
                            Legst du Widerspruch ein, verarbeiten wir die betroffenen
                            personenbezogenen Daten nicht mehr, es sei denn, wir können zwingende
                            schutzwürdige Gründe für die Verarbeitung nachweisen, die deine
                            Interessen, Rechte und Freiheiten überwiegen, oder die Verarbeitung
                            dient der Geltendmachung, Ausübung oder Verteidigung von
                            Rechtsansprüchen (Art. 21 Abs. 1 DSGVO). Deinen Widerspruch kannst du
                            formlos an die unter Punkt 1 genannten Kontaktdaten richten.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>
                            17. Beschwerderecht und zuständige Aufsichtsbehörde
                        </h2>
                        <p>
                            Du hast das Recht, dich bei einer Datenschutzaufsichtsbehörde zu
                            beschweren, wenn du der Ansicht bist, dass die Verarbeitung deiner
                            personenbezogenen Daten gegen Datenschutzrecht verstößt (Art. 77 DSGVO).
                            Die für uns zuständige Aufsichtsbehörde ist:
                        </p>
                        <p className={css({ mt: '2' })}>
                            Der Hessische Beauftragte für Datenschutz und Informationsfreiheit
                            <br />
                            Wilhelmstraße 7, 65185 Wiesbaden
                            <br />
                            Postfach 31 63, 65021 Wiesbaden
                            <br />
                            Telefon: 0611 1408-0
                            <br />
                            E-Mail: poststelle@datenschutz.hessen.de
                            <br />
                            Website: https://www.datenschutz.hessen.de
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>18. SSL-/TLS-Verschlüsselung</h2>
                        <p>
                            Diese Website nutzt aus Sicherheitsgründen und zum Schutz der
                            Übertragung vertraulicher Inhalte eine SSL- beziehungsweise
                            TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennst du daran,
                            dass die Adresszeile des Browsers von „http://" auf „https://" wechselt.
                            Bei aktivierter Verschlüsselung können die Daten, die du an uns
                            übermittelst, nicht von Dritten mitgelesen werden.
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>
                            19. Änderungen dieser Datenschutzerklärung
                        </h2>
                        <p>
                            Wir können diese Datenschutzerklärung anpassen, wenn sich Funktionen,
                            rechtliche Vorgaben oder technische Abläufe ändern. Es gilt die jeweils
                            auf dieser Seite veröffentlichte Fassung.
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

const listStyle = css({
    display: 'grid',
    gap: '2',
    pl: '5',
    listStyleType: 'disc',
    mt: '2',
});

const highlightBox = css({
    border: '2px solid',
    borderColor: 'border',
    borderRadius: 'md',
    p: { base: '4', md: '5' },
    background: 'surface',
});
