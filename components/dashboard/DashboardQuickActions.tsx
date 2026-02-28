'use client';

import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

interface QuickAction {
    id: string;
    label: string;
    icon: string;
    href?: string;
    color: string;
    description: string;
}

interface DashboardQuickActionsProps {
    actions: QuickAction[];
}

function QuickActionButton({ action }: { action: QuickAction }) {
    return (
        <a
            href={action.href || '#'}
            className={css({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3',
                padding: '6',
                background: 'surface.elevated',
                borderRadius: 'xl',
                border: '1px solid',
                borderColor: 'border.muted',
                textDecoration: 'none',
                transition: 'all 200ms ease',
                cursor: 'pointer',
                _hover: {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 24px ${action.color}25`,
                    borderColor: action.color,
                },
            })}
        >
            <div
                className={css({
                    width: '56px',
                    height: '56px',
                    borderRadius: 'xl',
                    background: `linear-gradient(135deg, ${action.color}15, ${action.color}05)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2xl',
                })}
            >
                {action.icon}
            </div>
            <div
                className={css({
                    textAlign: 'center',
                })}
            >
                <p
                    className={css({
                        fontWeight: '600',
                        color: 'text',
                        fontSize: 'sm',
                    })}
                >
                    {action.label}
                </p>
                <p
                    className={css({
                        fontSize: 'xs',
                        color: 'text-muted',
                        mt: '1',
                    })}
                >
                    {action.description}
                </p>
            </div>
        </a>
    );
}

export function DashboardQuickActions({ actions }: DashboardQuickActionsProps) {
    return (
        <div
            className={grid({
                columns: { base: 2, sm: 3, md: 6 },
                gap: '3',
            })}
        >
            {actions.map((action) => (
                <QuickActionButton key={action.id} action={action} />
            ))}
        </div>
    );
}
