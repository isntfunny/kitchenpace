import { ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { PageShell } from '@app/components/layouts/PageShell';
import { getServerAuthSession } from '@app/lib/auth';
import { prisma } from '@shared/prisma';

import { css } from 'styled-system/css';

export const metadata: Metadata = {
    title: 'Gesperrt | KüchenTakt',
    robots: { index: false, follow: false },
};

export default async function BannedPage() {
    const session = await getServerAuthSession('banned');

    let banReason: string | null = null;
    let banExpires: Date | null = null;

    if (session?.user?.id) {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { banReason: true, banExpires: true, banned: true },
        });

        if (!user?.banned) {
            // Not actually banned — redirect home
            return <meta httpEquiv="refresh" content="0;url=/" />;
        }

        banReason = user.banReason;
        banExpires = user.banExpires;
    }

    return (
        <PageShell>
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minH: '60vh',
                    px: '4',
                })}
            >
                <div
                    className={css({
                        textAlign: 'center',
                        maxWidth: '480px',
                    })}
                >
                    <ShieldAlert
                        size={64}
                        className={css({ color: 'status.danger', mx: 'auto', mb: '4' })}
                    />
                    <h1
                        className={css({
                            fontSize: '2xl',
                            fontWeight: '800',
                            fontFamily: 'heading',
                            mb: '3',
                        })}
                    >
                        Konto gesperrt
                    </h1>

                    {banReason && (
                        <p
                            className={css({
                                fontSize: 'md',
                                color: 'text',
                                mb: '4',
                                p: '4',
                                bg: 'rgba(239,68,68,0.06)',
                                borderRadius: 'xl',
                                border: '1px solid rgba(239,68,68,0.2)',
                            })}
                        >
                            <strong>Grund:</strong> {banReason}
                        </p>
                    )}

                    {banExpires && (
                        <p className={css({ fontSize: 'sm', color: 'text.muted', mb: '4' })}>
                            Die Sperre endet am{' '}
                            <strong>
                                {new Date(banExpires).toLocaleDateString('de-DE', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </strong>
                            .
                        </p>
                    )}

                    {!banExpires && banReason && (
                        <p className={css({ fontSize: 'sm', color: 'text.muted', mb: '4' })}>
                            Diese Sperre ist dauerhaft.
                        </p>
                    )}

                    <Link
                        href="mailto:support@kuechentakt.de"
                        className={css({
                            display: 'inline-block',
                            mt: '4',
                            px: '6',
                            py: '3',
                            borderRadius: 'xl',
                            fontWeight: '600',
                            fontSize: 'sm',
                            color: 'white',
                            bg: 'status.danger',
                            textDecoration: 'none',
                            _hover: { bg: { base: '#b91c1c', _dark: '#dc2626' } },
                        })}
                    >
                        Support kontaktieren
                    </Link>
                </div>
            </div>
        </PageShell>
    );
}
