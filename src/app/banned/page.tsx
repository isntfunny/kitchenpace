import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

import { getServerAuthSession } from '@app/lib/auth';
import { prisma } from '@shared/prisma';
import { css } from 'styled-system/css';

export default async function BannedPage() {
    const session = await getServerAuthSession('banned');

    let banReason: string | null = null;
    let banExpiresAt: Date | null = null;

    if (session?.user?.id) {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { banReason: true, banExpiresAt: true, role: true },
        });

        if (user?.role !== 'BANNED') {
            // Not actually banned — redirect home
            return (
                <meta httpEquiv="refresh" content="0;url=/" />
            );
        }

        banReason = user.banReason;
        banExpiresAt = user.banExpiresAt;
    }

    return (
        <div
            className={css({
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(180deg, #fff8f4 0%, #fef0e8 40%, #fceadd 100%)',
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
                    className={css({ color: '#dc2626', mx: 'auto', mb: '4' })}
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

                {banExpiresAt && (
                    <p className={css({ fontSize: 'sm', color: 'text.muted', mb: '4' })}>
                        Die Sperre endet am{' '}
                        <strong>
                            {new Date(banExpiresAt).toLocaleDateString('de-DE', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                            })}
                        </strong>
                        .
                    </p>
                )}

                {!banExpiresAt && banReason && (
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
                        bg: '#dc2626',
                        textDecoration: 'none',
                        _hover: { bg: '#b91c1c' },
                    })}
                >
                    Support kontaktieren
                </Link>
            </div>
        </div>
    );
}
