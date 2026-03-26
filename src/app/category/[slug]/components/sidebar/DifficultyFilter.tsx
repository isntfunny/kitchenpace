import { SignalLow, SignalMedium, SignalHigh } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DifficultyFilterProps {
    counts: Record<string, number>;
    categorySlug: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const DIFFICULTIES: Array<{
    key: string;
    label: string;
    color: string;
    bg: string;
    icon: LucideIcon;
}> = [
    { key: 'EASY', label: 'Einfach', color: '#16a34a', bg: '#f0fdf4', icon: SignalLow },
    { key: 'MEDIUM', label: 'Mittel', color: '#ea580c', bg: '#fff7ed', icon: SignalMedium },
    { key: 'HARD', label: 'Schwer', color: '#db2777', bg: '#fdf2f8', icon: SignalHigh },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function DifficultyFilter({ counts, categorySlug }: DifficultyFilterProps) {
    return (
        <div
            className={css({
                p: 'card',
                bg: 'surface',
                borderRadius: 'surface',
                boxShadow: 'shadow.medium',
            })}
        >
            <div className={flex({ gap: '2' })}>
                {DIFFICULTIES.map((d) => {
                    const count = counts[d.key] ?? 0;
                    const Icon = d.icon;
                    return (
                        <Link
                            key={d.key}
                            href={`/recipes?category=${categorySlug}&difficulty=${d.key}`}
                            className={css({
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '1',
                                py: '3',
                                px: '2',
                                borderRadius: 'xl',
                                textDecoration: 'none',
                                transition: 'all 0.15s ease',
                                _hover: {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                },
                            })}
                            style={{ backgroundColor: d.bg }}
                        >
                            <Icon size={22} style={{ color: d.color }} />
                            <span
                                className={css({
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                })}
                                style={{ color: d.color }}
                            >
                                {d.label}
                            </span>
                            <span
                                className={css({
                                    fontSize: '0.65rem',
                                    fontWeight: '700',
                                })}
                                style={{ color: `${d.color}bb` }}
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
