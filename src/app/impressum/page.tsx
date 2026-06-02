import { Metadata } from 'next';

import { PageShell } from '@app/components/layouts/PageShell';

import { css } from 'styled-system/css';

export const metadata: Metadata = {
    title: 'Impressum — KochTakt',
    description: 'Impressum von KochTakt mit Angaben gemaess § 5 DDG.',
};

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
                            Impressum
                        </h1>
                        <p className={css({ color: 'text-muted' })}>Angaben gemaess § 5 DDG</p>
                    </header>

                    <section>
                        <h2 className={sectionHeading}>Anbieter</h2>
                        <p>
                            Sebastian Reuther
                            <br />
                            c/o Impressumservice Dein-Impressum
                            <br />
                            Stettiner Str. 41
                            <br />
                            35410 Hungen
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>Kontakt</h2>
                        <p>
                            E-Mail: info@kochtakt.de
                            <br />
                            Telefon: 0157 9234 1658
                            <br />
                            <span className={css({ color: 'text-muted' })}>
                                Die Telefonnummer wird von Dein Impressum betreut.
                            </span>
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>Verantwortlich fuer den Inhalt</h2>
                        <p>
                            Sebastian Reuther
                            <br />
                            c/o Impressumservice Dein-Impressum
                            <br />
                            Stettiner Str. 41
                            <br />
                            35410 Hungen
                        </p>
                    </section>

                    <section>
                        <h2 className={sectionHeading}>Streitbeilegung</h2>
                        <p>
                            Wir sind nicht bereit und nicht verpflichtet, an
                            Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
                            teilzunehmen.
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
