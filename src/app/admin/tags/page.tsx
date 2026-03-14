import { PageShell } from '@app/components/layouts/PageShell';
import { prisma } from '@shared/prisma';
import { css } from 'styled-system/css';

import { TagsTable } from './tags-table';

export const dynamic = 'force-dynamic';

async function getTags() {
    const tags = await prisma.tag.findMany({
        select: {
            id: true,
            name: true,
            slug: true,
            _count: {
                select: {
                    recipes: true,
                },
            },
        },
        orderBy: {
            name: 'asc',
        },
    });

    return tags.map(({ _count, ...rest }) => ({
        ...rest,
        recipeCount: _count.recipes,
    }));
}

export default async function TagsPage() {
    const tags = await getTags();

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
                        Admin · Tags
                    </p>
                    <h1
                        className={css({
                            fontSize: '3xl',
                            fontWeight: 'semibold',
                            color: 'foreground',
                            marginTop: '1',
                        })}
                    >
                        Tag-Verwaltung
                    </h1>
                    <p
                        className={css({
                            marginTop: '2',
                            color: 'foreground.muted',
                        })}
                    >
                        Schlagwörter für Rezepte verwalten.
                    </p>
                </header>

                <TagsTable tags={tags} />
            </div>
        </PageShell>
    );
}
