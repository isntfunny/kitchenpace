import Link from 'next/link';

import { PageShell } from '@app/components/layouts/PageShell';

import { css } from 'styled-system/css';

const LAST_UPDATED = 'März 2026';

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

const TOC_ITEMS = [
    { id: 'anbieter', label: '1. Anbieterkennzeichnung' },
    { id: 'vertretung', label: '2. Vertretungsberechtigte Person' },
    { id: 'weitere-angaben', label: '3. Weitere Pflichtangaben' },
    { id: 'redaktion', label: '4. Inhaltlich verantwortlich' },
    { id: 'streitbeilegung', label: '5. Streitbeilegung' },
    { id: 'haftung-inhalte', label: '6. Haftung für Inhalte' },
    { id: 'haftung-links', label: '7. Haftung für Links' },
    { id: 'urheberrecht', label: '8. Urheberrecht' },
    { id: 'geltung', label: '9. Geltungsbereich' },
];

export default function ImpressumPage() {
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
                <div className={css({ mb: '10' })}>
                    <h1
                        className={css({
                            fontFamily: 'heading',
                            fontSize: { base: '2xl', md: '3xl' },
                            fontWeight: '700',
                            mb: '2',
                        })}
                    >
                        Impressum
                    </h1>
                    <p className={css({ color: 'text-muted', fontSize: 'sm', mb: '4' })}>
                        Stand: {LAST_UPDATED} · Anbieterkennzeichnung für{' '}
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
                            p: '4',
                            borderRadius: 'md',
                            border: '1px solid',
                            borderColor: 'border',
                            background: 'surface-raised',
                            color: 'text-muted',
                            fontSize: 'sm',
                            lineHeight: '1.7',
                        })}
                    >
                        Bitte ersetzen Sie die gekennzeichneten Platzhalter vor der Veröffentlichung
                        durch die tatsächlichen Angaben. Bei juristischen Personen,
                        Registereinträgen, Umsatzsteuer-ID oder erlaubnispflichtigen Tätigkeiten
                        sind die zusätzlichen Pflichtangaben ebenfalls zu ergänzen.
                    </div>
                </div>

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

                <Section id="anbieter" title="1. Anbieterkennzeichnung gemäß § 5 DDG">
                    <p>
                        Angaben zum Diensteanbieter dieser Website. Bitte die Platzhalter durch die
                        tatsächlichen Daten des Betreibers ersetzen:
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
                            color: 'text',
                        })}
                    >
                        <strong>KüchenTakt</strong>
                        <br />
                        [Vor- und Nachname / Firmenname]
                        <br />
                        [Straße und Hausnummer]
                        <br />
                        [PLZ Ort]
                        <br />
                        Deutschland
                        <br />
                        E-Mail:{' '}
                        <a href="mailto:impressum@kuechentakt.de">impressum@kuechentakt.de</a>
                    </div>
                    <p>
                        Wenn KüchenTakt nicht von einer natürlichen Person, sondern z. B. durch eine
                        GmbH, UG oder ein Einzelunternehmen betrieben wird, sollte hier die
                        vollständige offizielle Firmierung inklusive Rechtsform stehen.
                    </p>
                </Section>

                <Section id="vertretung" title="2. Vertretungsberechtigte Person">
                    <p>
                        Sofern die Website von einer juristischen Person oder Gesellschaft betrieben
                        wird, ist die vertretungsberechtigte Person anzugeben:
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
                            color: 'text',
                        })}
                    >
                        Vertreten durch: [Vor- und Nachname]
                    </div>
                    <p>
                        Bei einer natürlichen Person als Betreiber kann dieser Abschnitt entfallen,
                        sofern die Angaben bereits vollständig in Abschnitt 1 enthalten sind.
                    </p>
                </Section>

                <Section id="weitere-angaben" title="3. Weitere Pflichtangaben, falls einschlägig">
                    <p>
                        Je nach Unternehmensform und Tätigkeit können zusätzliche Angaben gesetzlich
                        erforderlich sein. Nicht zutreffende Punkte können weggelassen werden.
                    </p>
                    <ul>
                        <li>
                            <strong>Handelsregister:</strong> [Registergericht und Registernummer]
                        </li>
                        <li>
                            <strong>Umsatzsteuer-ID:</strong> [USt-IdNr. nach § 27a UStG]
                        </li>
                        <li>
                            <strong>Wirtschafts-Identifikationsnummer:</strong> [falls vorhanden]
                        </li>
                        <li>
                            <strong>Aufsichtsbehörde:</strong> [nur bei erlaubnispflichtiger
                            Tätigkeit]
                        </li>
                        <li>
                            <strong>Berufsrechtliche Angaben:</strong> [Kammer, Berufsbezeichnung,
                            Staat der Verleihung, berufsrechtliche Regelungen]
                        </li>
                    </ul>
                    <p>
                        Diese ergänzenden Punkte orientieren sich an den gesetzlichen
                        Informationspflichten für digitale Dienste und typischen Best Practices für
                        leicht nachvollziehbare Impressen.
                    </p>
                </Section>

                <Section
                    id="redaktion"
                    title="4. Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV"
                >
                    <p>
                        Für redaktionelle oder journalistisch gestaltete Inhalte ist in der Regel
                        eine inhaltlich verantwortliche Person anzugeben:
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
                            color: 'text',
                        })}
                    >
                        [Vor- und Nachname]
                        <br />
                        [Straße und Hausnummer]
                        <br />
                        [PLZ Ort]
                    </div>
                    <p>
                        Da KüchenTakt redaktionelle Inhalte wie Rezeptbeschreibungen, redaktionell
                        kuratierte Seiten oder Community-Inhalte enthalten kann, ist dieser
                        Abschnitt als sinnvolle Standardergänzung aufgenommen.
                    </p>
                </Section>

                <Section id="streitbeilegung" title="5. Verbraucherstreitbeilegung">
                    <p>
                        Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren
                        vor einer Verbraucherschlichtungsstelle teilzunehmen.
                    </p>
                </Section>

                <Section id="haftung-inhalte" title="6. Haftung für Inhalte">
                    <p>
                        Als Diensteanbieter sind wir gemäß den allgemeinen Gesetzen für eigene
                        Inhalte auf diesen Seiten verantwortlich. Wir sind jedoch nicht
                        verpflichtet, übermittelte oder gespeicherte fremde Informationen zu
                        überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
                        Tätigkeit hinweisen.
                    </p>
                    <p>
                        Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen
                        nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche
                        Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten
                        Rechtsverletzung möglich. Bei Bekanntwerden entsprechender
                        Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
                    </p>
                </Section>

                <Section id="haftung-links" title="7. Haftung für Links">
                    <p>
                        Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte
                        wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch
                        keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der
                        jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
                    </p>
                    <p>
                        Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche
                        Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der
                        Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der
                        verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer
                        Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen
                        werden wir derartige Links umgehend entfernen.
                    </p>
                </Section>

                <Section id="urheberrecht" title="8. Urheberrecht">
                    <p>
                        Die durch die Seitenbetreiber erstellten Inhalte und Werke auf dieser
                        Website unterliegen dem deutschen Urheberrecht. Beiträge Dritter sind als
                        solche gekennzeichnet, soweit dies möglich und zumutbar ist.
                    </p>
                    <p>
                        Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung
                        außerhalb der Grenzen des Urheberrechts bedürfen der vorherigen
                        schriftlichen Zustimmung des jeweiligen Autors oder Erstellers. Downloads
                        und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen
                        Gebrauch gestattet.
                    </p>
                </Section>

                <Section id="geltung" title="9. Geltungsbereich dieses Impressums">
                    <p>
                        Dieses Impressum gilt für die Website{' '}
                        <Link
                            href="/"
                            className={css({
                                color: 'palette.orange',
                                textDecoration: 'underline',
                            })}
                        >
                            kuechentakt.de
                        </Link>{' '}
                        sowie für zugehörige Online-Präsenzen von KüchenTakt, sofern dort auf dieses
                        Impressum verwiesen wird.
                    </p>
                    <p>
                        Informationen zur Verarbeitung personenbezogener Daten finden Sie in unserer{' '}
                        <Link
                            href="/datenschutz"
                            className={css({
                                color: 'palette.orange',
                                textDecoration: 'underline',
                            })}
                        >
                            Datenschutzerklärung
                        </Link>
                        .
                    </p>
                </Section>
            </div>
        </PageShell>
    );
}
