import Link from 'next/link';

import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DifficultyFilterProps {
    counts: Record<string, number>;
    categorySlug: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const DIFFICULTIES = [
    { key: 'EASY', label: 'Einfach', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    { key: 'MEDIUM', label: 'Mittel', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
    { key: 'HARD', label: 'Anspruchsvoll', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8' },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

export function DifficultyFilter({ counts, categorySlug }: DifficultyFilterProps) {
    return (
        <div
            className={css({
                bg: 'surface.card',
                border: '1px solid',
                borderColor: 'border',
                borderRadius: '10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                overflow: 'hidden',
            })}
        >
            <div
                className={css({
                    px: '4',
                    py: '3',
                    borderBottom: '1px solid',
                    borderColor: 'border',
                    fontWeight: '600',
                    fontSize: 'sm',
                    color: 'text.primary',
                })}
            >
                Schwierigkeitsgrad
            </div>
            <div className={flex({ direction: 'column', gap: '0' })}>
                {DIFFICULTIES.map((d, i) => {
                    const count = counts[d.key] ?? 0;
                    return (
                        <Link
                            key={d.key}
                            href={`/recipes?category=${categorySlug}&difficulty=${d.key}`}
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                px: '4',
                                py: '2.5',
                                borderBottom: i < DIFFICULTIES.length - 1 ? '1px solid' : 'none',
                                borderColor: 'border',
                                textDecoration: 'none',
                                transition: 'background 0.15s',
                                _hover: { bg: 'surface.hover' },
                            })}
                        >
                            <span
                                className={css({
                                    fontSize: 'sm',
                                    fontWeight: '500',
                                    color: 'text.primary',
                                })}
                            >
                                {d.label}
                            </span>
                            <span
                                className={css({
                                    fontSize: 'xs',
                                    fontWeight: '600',
                                    px: '2',
                                    py: '0.5',
                                    borderRadius: '999px',
                                    border: '1px solid',
                                })}
                                style={{
                                    color: d.color,
                                    background: d.bg,
                                    borderColor: d.border,
                                }}
                            >
                                {count}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
