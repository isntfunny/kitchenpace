import type { ShelfLifeSummary } from '@shared/ingredient-shelf-life/describe';

import { css } from 'styled-system/css';

const URGENCY: Partial<Record<NonNullable<ShelfLifeSummary['perishability']>, string>> = {
    IMMEDIATE: 'Schnell verbrauchen',
    HIGH: 'Bald verbrauchen',
};

/** Typical household shelf life of a raw ingredient per storage type (KUC-94). */
export function ShelfLifeHint({ name, summary }: { name: string; summary: ShelfLifeSummary }) {
    const urgency = summary.perishability ? URGENCY[summary.perishability] : undefined;

    return (
        <section
            aria-label={`Haltbarkeit von ${name}`}
            className={css({
                mt: '5',
                p: '4',
                maxW: '720px',
                borderWidth: '1px',
                borderColor: 'border',
                borderRadius: 'lg',
                bg: 'surface',
            })}
        >
            <div className={css({ display: 'flex', alignItems: 'center', gap: '2', mb: '2' })}>
                <h2 className={css({ fontWeight: 'semibold', fontSize: 'md' })}>
                    So lange hält sich {name}
                </h2>
                {urgency && (
                    <span
                        className={css({
                            fontSize: 'xs',
                            px: '2',
                            py: '0.5',
                            borderRadius: 'full',
                            bg: 'accent.soft',
                        })}
                    >
                        {urgency}
                    </span>
                )}
            </div>
            <ul
                className={css({
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '2',
                    listStyle: 'none',
                    p: '0',
                    m: '0',
                })}
            >
                {summary.entries.map((entry) => (
                    <li
                        key={entry.storage}
                        className={css({
                            px: '3',
                            py: '1',
                            borderRadius: 'md',
                            bg: 'surface.muted',
                            fontSize: 'sm',
                        })}
                    >
                        <span className={css({ color: 'text-muted' })}>{entry.label}: </span>
                        <span
                            className={css({ fontWeight: entry.isDefault ? 'semibold' : 'normal' })}
                        >
                            {entry.duration}
                        </span>
                    </li>
                ))}
                {summary.opened && (
                    <li
                        className={css({
                            px: '3',
                            py: '1',
                            borderRadius: 'md',
                            bg: 'surface.muted',
                            fontSize: 'sm',
                        })}
                    >
                        <span className={css({ color: 'text-muted' })}>Angebrochen: </span>
                        {summary.opened}
                    </li>
                )}
            </ul>
            <p className={css({ mt: '2', fontSize: 'xs', color: 'text-muted' })}>
                Richtwerte für frisch gekaufte Ware im Haushalt.
            </p>
        </section>
    );
}
