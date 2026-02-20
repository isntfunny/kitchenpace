import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PageShell } from '@/components/layouts/PageShell';
import { css } from 'styled-system/css';

const actions = [
    {
        title: 'Profil bearbeiten',
        description: 'Passe Foto, Nickname und Teaser jederzeit an.',
        href: '/profile/edit',
    },
    {
        title: 'Passwort ändern',
        description: 'Ändere dein Passwort für KüchenTakt.',
        href: '/auth/password/edit',
    },
    {
        title: 'Passwort vergessen',
        description: 'Starte eine sichere Wiederherstellung.',
        href: '/auth/forgot-password',
    },
    {
        title: 'Abmelden',
        description: 'Melde dich auf allen Geräten ab.',
        href: '/auth/signout',
    },
];

const ManageProfilePage = async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/auth/signin');
    }

    return (
        <PageShell>
            <section
                className={css({
                    paddingY: { base: '8', md: '10' },
                    fontFamily: 'body',
                })}
            >
                <div className={css({ maxW: '960px', marginX: 'auto' })}>
                    <header className={css({ textAlign: 'center', mb: '10' })}>
                        <p
                            className={css({
                                textTransform: 'uppercase',
                                color: 'text-muted',
                                mb: '2',
                            })}
                        >
                            Verwaltung
                        </p>
                        <h1 className={css({ fontSize: '4xl', fontWeight: '800' })}>
                            Dein KüchenTakt Konto
                        </h1>
                        <p className={css({ color: 'text-muted', mt: '3' })}>
                            Alle Sicherheits- und Kontoaktionen an einem Ort.
                        </p>
                    </header>

                    <div
                        className={css({
                            display: 'grid',
                            gridTemplateColumns: { base: '1fr', md: 'repeat(2, 1fr)' },
                            gap: '6',
                        })}
                    >
                        {actions.map((action) => (
                            <Link
                                key={action.title}
                                href={action.href}
                                className={css({
                                    borderRadius: '2xl',
                                    padding: '6',
                                    border: '1px solid rgba(224,123,83,0.25)',
                                    background: 'white',
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    transition: 'transform 150ms ease, box-shadow 150ms ease',
                                    _hover: {
                                        transform: 'translateY(-3px)',
                                        boxShadow: '0 20px 50px rgba(224,123,83,0.15)',
                                    },
                                })}
                            >
                                <h2 className={css({ fontSize: 'xl', fontWeight: '700', mb: '2' })}>
                                    {action.title}
                                </h2>
                                <p className={css({ color: 'text-muted' })}>{action.description}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </PageShell>
    );
};

export default ManageProfilePage;
