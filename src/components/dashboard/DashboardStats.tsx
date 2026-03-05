'use client';

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
    const changeColors = {
        positive: '#00b894',
        negative: '#ff7675',
        neutral: 'text-muted',
    };

    return (
        <div
            className={css({
                background: 'white',
                borderRadius: 'xl',
                padding: '5',
                border: '1px solid',
                borderColor: 'rgba(0,0,0,0.06)',
                transition: 'all 200ms ease',
                _hover: {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
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
                            color: changeColors[stat.changeType || 'neutral'],
                            background: `${changeColors[stat.changeType || 'neutral']}15`,
                            px: '2',
                            py: '1',
                            borderRadius: 'full',
                        })}
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
