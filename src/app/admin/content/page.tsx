import { Settings, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { PageShell } from '@app/components/layouts/PageShell';

import { getContentSettings } from './actions';
import { ContentModerationForm } from './content-moderation-form';

export const dynamic = 'force-dynamic';

export default async function ContentModerationPage() {
    const [settings] = await Promise.all([getContentSettings()]);

    return (
        <PageShell>
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin"
                        className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Zurück zum Admin
                    </Link>
                </div>

                <div className="rounded-2xl border border-border bg-surface p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-surface-elevated border border-border">
                            <Settings size={20} />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-widest text-muted">
                                Admin Center
                            </p>
                            <h1 className="text-2xl font-semibold">Content Moderation</h1>
                        </div>
                    </div>
                    <p className="text-muted max-w-xl">
                        Verwalte die Startseite: Wähle das Highlight-Rezept und den Top-User aus.
                        Diese Auswahl wird auf der Startseite angezeigt.
                    </p>
                </div>

                <ContentModerationForm
                    currentFeatured={settings.featuredRecipe}
                    currentTopUser={settings.topUser}
                />
            </div>
        </PageShell>
    );
}
