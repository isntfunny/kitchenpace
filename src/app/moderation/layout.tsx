import { Shield } from 'lucide-react';
import Link from 'next/link';

import { PageShell } from '@app/components/layouts/PageShell';
import { ensureModeratorSession } from '@app/lib/admin/ensure-moderator';
import { css } from 'styled-system/css';

export default async function ModerationLayout({ children }: { children: React.ReactNode }) {
    await ensureModeratorSession('moderation-layout');

    return (
        <PageShell>
            <div className={css({ maxWidth: '1200px', mx: 'auto', px: { base: '4', md: '6' } })}>
                <div className={css({ mb: '6' })}>
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3',
                            mb: '2',
                        })}
                    >
                        <Shield
                            size={28}
                            className={css({ color: 'primary', flexShrink: '0' })}
                        />
                        <h1
                            className={css({
                                fontSize: '2xl',
                                fontWeight: '800',
                                fontFamily: 'heading',
                            })}
                        >
                            Moderation
                        </h1>
                    </div>
                    <nav className={css({ display: 'flex', gap: '4', mt: '3' })}>
                        <Link
                            href="/moderation"
                            className={css({
                                fontSize: 'sm',
                                fontWeight: '600',
                                color: 'text.muted',
                                _hover: { color: 'primary' },
                            })}
                        >
                            Warteschlange
                        </Link>
                        <Link
                            href="/moderation?tab=reports"
                            className={css({
                                fontSize: 'sm',
                                fontWeight: '600',
                                color: 'text.muted',
                                _hover: { color: 'primary' },
                            })}
                        >
                            Meldungen
                        </Link>
                    </nav>
                </div>
                {children}
            </div>
        </PageShell>
    );
}
