import type { Metadata } from 'next';

import { fetchPopularCollections, fetchNewestCollections } from '@app/app/actions/collections';
import { CollectionCard } from '@app/components/collections/CollectionCard';
import { PageShell } from '@app/components/layouts/PageShell';

import { css } from 'styled-system/css';

export const revalidate = 60;

export const metadata: Metadata = {
    title: 'Sammlungen | Kuechentakt',
    description: 'Entdecke kuratierte Rezeptsammlungen der Community.',
};

export default async function CollectionsPage() {
    const [popular, newest] = await Promise.all([
        fetchPopularCollections(12),
        fetchNewestCollections(12),
    ]);

    return (
        <PageShell>
            <div className={css({ maxW: '1200px', mx: 'auto', px: '4', py: '8' })}>
                <h1 className={css({ fontSize: '3xl', fontWeight: 'bold', mb: '8' })}>
                    Sammlungen
                </h1>

                {popular.length > 0 && (
                    <section className={css({ mb: '10' })}>
                        <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', mb: '4' })}>
                            Beliebt
                        </h2>
                        <div
                            className={css({
                                display: 'grid',
                                gridTemplateColumns: {
                                    base: '1fr',
                                    sm: 'repeat(2, 1fr)',
                                    lg: 'repeat(3, 1fr)',
                                },
                                gap: '6',
                            })}
                        >
                            {popular.map((c) => (
                                <CollectionCard key={c.id} collection={c} />
                            ))}
                        </div>
                    </section>
                )}

                {newest.length > 0 && (
                    <section>
                        <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', mb: '4' })}>
                            Neueste
                        </h2>
                        <div
                            className={css({
                                display: 'grid',
                                gridTemplateColumns: {
                                    base: '1fr',
                                    sm: 'repeat(2, 1fr)',
                                    lg: 'repeat(3, 1fr)',
                                },
                                gap: '6',
                            })}
                        >
                            {newest.map((c) => (
                                <CollectionCard key={c.id} collection={c} />
                            ))}
                        </div>
                    </section>
                )}

                {popular.length === 0 && newest.length === 0 && (
                    <p className={css({ color: 'gray.500', textAlign: 'center', py: '16' })}>
                        Noch keine Sammlungen vorhanden. Erstelle die erste!
                    </p>
                )}
            </div>
        </PageShell>
    );
}
