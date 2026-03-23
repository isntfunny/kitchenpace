import { Star } from 'lucide-react';

import { ensureAdminSession } from '@app/lib/admin/ensure-admin';

import { css } from 'styled-system/css';

import { getContentSettings } from './actions';
import { ContentModerationForm } from './content-moderation-form';

export const dynamic = 'force-dynamic';

export default async function ContentModerationPage() {
    await ensureAdminSession('admin-content');
    const settings = await getContentSettings();

    return (
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
                <div className={css({ display: 'flex', alignItems: 'center', gap: '3', mb: '2' })}>
                    <div
                        className={css({
                            p: '2',
                            borderRadius: 'lg',
                            bg: 'surface.elevated',
                            borderWidth: '1px',
                            borderColor: 'border.muted',
                        })}
                    >
                        <Star size={20} className={css({ color: 'palette.orange' })} />
                    </div>
                    <div>
                        <p
                            className={css({
                                fontSize: 'xs',
                                textTransform: 'uppercase',
                                letterSpacing: '0.4em',
                                color: 'foreground.muted',
                            })}
                        >
                            Admin · Startseite
                        </p>
                        <h1 className={css({ fontSize: '2xl', fontWeight: 'semibold' })}>
                            Spotlight
                        </h1>
                    </div>
                </div>
                <p className={css({ color: 'foreground.muted', maxWidth: '3xl' })}>
                    Wähle das Highlight-Rezept und den Top-User aus. Diese Auswahl wird prominent
                    auf der Startseite angezeigt.
                </p>
            </header>

            <ContentModerationForm
                currentFeatured={settings.featuredRecipe}
                currentTopUser={settings.topUser}
            />
        </div>
    );
}
