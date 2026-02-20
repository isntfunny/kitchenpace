import Link from 'next/link';

import { PageShell } from '@/components/layouts/PageShell';
import { css } from 'styled-system/css';

const EditPasswordPage = () => {
    return (
        <PageShell>
            <section
                className={css({
                    paddingY: { base: '8', md: '12' },
                    display: 'flex',
                    justifyContent: 'center',
                    fontFamily: 'body',
                    color: 'text',
                })}
            >
                <div
                    className={css({
                        background: 'white',
                        borderRadius: '3xl',
                        padding: { base: '8', md: '12' },
                        boxShadow: '0 30px 80px rgba(224,123,83,0.3)',
                        width: '100%',
                        maxWidth: '640px',
                    })}
                >
                    <p
                        className={css({
                            fontSize: 'sm',
                            textTransform: 'uppercase',
                            color: 'text-muted',
                        })}
                    >
                        Sicherheit
                    </p>
                    <h1 className={css({ fontSize: '3xl', fontWeight: '800', mt: '2', mb: '4' })}>
                        Passwort ändern
                    </h1>
                    <p className={css({ color: 'text-muted', mb: '8', lineHeight: '1.8' })}>
                        Ändere dein Passwort, um dein Konto zu schützen.
                    </p>
                    <div
                        className={css({
                            padding: '4',
                            background: 'brand.light',
                            borderRadius: 'xl',
                            color: 'text-muted',
                        })}
                    >
                        <p>Diese Funktion ist bald verfügbar.</p>
                        <Link
                            href="/profile"
                            className={css({ color: 'primary', mt: '2', display: 'inline-block' })}
                        >
                            ← Zurück zum Profil
                        </Link>
                    </div>
                </div>
            </section>
        </PageShell>
    );
};

export default EditPasswordPage;
