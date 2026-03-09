'use client';

import { PALETTE } from '@app/lib/palette';
import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

interface StatCard {
    id: string;
    label: string;
    value: string | number;
    icon: string;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    color: string;
}

interface DashboardStatsProps {
    stats: StatCard[];
}

function StatCard({ stat }: { stat: StatCard }) {
    const changeColor =
        stat.changeType === 'positive'
            ? PALETTE.emerald
            : stat.changeType === 'negative'
              ? '#ff7675'
              : '#9ca3af';

    return (
        <div
            className={css({
                background: 'surface',
                borderRadius: 'xl',
                padding: '5',
                border: '1px solid',
                borderColor: 'border',
                transition: 'all 200ms ease',
                _hover: {
                    transform: 'translateY(-2px)',
                    boxShadow: 'shadow.medium',
                    borderColor: stat.color,
                },
            })}
        >
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    mb: '3',
                })}
            >
                <div
                    className={css({
                        width: '44px',
                        height: '44px',
                        borderRadius: 'lg',
                        background: `${stat.color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 'xl',
                    })}
                >
                    {stat.icon}
                </div>
                {stat.change && (
                    <span
                        className={css({
                            fontSize: 'xs',
                            fontWeight: '600',
                            px: '2',
                            py: '1',
                            borderRadius: 'full',
                        })}
                        style={{
                            color: changeColor,
                            background: `${changeColor}20`,
                        }}
                    >
                        {stat.change}
                    </span>
                )}
            </div>
            <p
                className={css({
                    fontSize: '3xl',
                    fontWeight: '800',
                    color: 'text',
                    lineHeight: 'tight',
                    mb: '1',
                })}
            >
                {stat.value}
            </p>
            <p
                className={css({
                    fontSize: 'sm',
                    color: 'text-muted',
                })}
            >
                {stat.label}
            </p>
        </div>
    );
}

export function DashboardStats({ stats }: DashboardStatsProps) {
    return (
        <div
            className={grid({
                columns: { base: 2, md: 4 },
                gap: '4',
            })}
        >
            {stats.map((stat) => (
                <StatCard key={stat.id} stat={stat} />
            ))}
        </div>
    );
}
