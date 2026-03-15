import Link from 'next/link';

import { PageShell } from '@app/components/layouts/PageShell';
import { ensureModeratorSession } from '@app/lib/admin/ensure-moderator';

import { css } from 'styled-system/css';

export default async function ModerationLayout({ children }: { children: React.ReactNode }) {
    await ensureModeratorSession('moderation-layout');

    return (
        <PageShell>
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '6' })}>
                <header
                    className={css({
                        borderRadius: '2xl',
                        borderWidth: '1px',
                        borderColor: 'border.muted',
                        background: 'surface',
                        padding: { base: '4', md: '5' },
                    })}
                >
                    <p
                        className={css({
                            fontSize: 'xs',
                            textTransform: 'uppercase',
                            letterSpacing: '0.4em',
                            color: 'foreground.muted',
                        })}
                    >
                        Admin · Moderation
                    </p>
                    <h1
                        className={css({
                            fontSize: '3xl',
                            fontWeight: 'semibold',
                            color: 'foreground',
                            marginTop: '1',
                        })}
                    >
                        Inhaltsprüfung
                    </h1>
                    <p
                        className={css({
                            marginTop: '2',
                            color: 'foreground.muted',
                        })}
                    >
                        Inhalte prüfen, freigeben oder ablehnen. Meldungen bearbeiten und
                        Moderationsverlauf einsehen.
                    </p>
                    <nav
                        className={css({
                            display: 'flex',
                            gap: '1',
                            mt: '4',
                            borderTop: '1px solid',
                            borderColor: 'border.muted',
                            pt: '3',
                        })}
                    >
                        <NavTab href="/moderation">Warteschlange</NavTab>
                        <NavTab href="/moderation?tab=reports">Meldungen</NavTab>
                        <NavTab href="/moderation?tab=history">Verlauf</NavTab>
                    </nav>
                </header>

                {children}
            </div>
        </PageShell>
    );
}

function NavTab({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className={css({
                px: '3',
                py: '1.5',
                borderRadius: 'lg',
                fontSize: 'sm',
                fontWeight: '600',
                color: 'foreground.muted',
                textDecoration: 'none',
                transition: 'all 150ms ease',
                _hover: { bg: 'accent.soft', color: 'foreground' },
            })}
        >
            {children}
        </Link>
    );
}
