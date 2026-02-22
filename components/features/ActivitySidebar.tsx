import type { ActivityFeedItem } from '@/app/actions/community';
import { css } from 'styled-system/css';

import { Heading, Text } from '../atoms/Typography';

interface ActivitySidebarProps {
    activities: ActivityFeedItem[];
}

export function ActivitySidebar({ activities }: ActivitySidebarProps) {
    return (
        <aside
            className={css({
                p: '5',
                borderRadius: '2xl',
                bg: '#fffcf9',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                height: 'fit-content',
                position: 'sticky',
                top: '100px',
            })}
        >
            <div className={css({ mb: '4' })}>
                <Heading as="h3" size="md" className={css({ color: 'primary' })}>
                    Aktivität 🔥
                </Heading>
                <Text size="sm" color="muted" className={css({ fontSize: '0.75rem' })}>
                    Was passiert gerade in der Community
                </Text>
            </div>

            <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
                {activities.map((activity) => (
                    <div
                        key={activity.id}
                        className={css({
                            display: 'flex',
                            gap: '3',
                            p: '3',
                            borderRadius: 'xl',
                            _hover: { bg: 'rgba(224,123,83,0.05)' },
                            transition: 'background 150ms ease',
                        })}
                    >
                        <span
                            className={css({
                                fontSize: 'md',
                                display: 'grid',
                                placeItems: 'center',
                                width: '40px',
                                height: '40px',
                                borderRadius: 'full',
                                background: activity.iconBg,
                                color: 'white',
                                flexShrink: 0,
                            })}
                        >
                            {activity.icon}
                        </span>
                        <div className={css({ flex: 1 })}>
                            <Text size="sm" className={css({ fontWeight: '600', color: 'text' })}>
                                {activity.userName}{' '}
                                <span className={css({ fontWeight: '400', color: 'text-muted' })}>
                                    {activity.actionLabel}
                                </span>
                                {activity.targetUserName && (
                                    <>
                                        {' '}
                                        <span
                                            className={css({ color: 'primary', fontWeight: '600' })}
                                        >
                                            {activity.targetUserName}
                                        </span>
                                        <span
                                            className={css({
                                                fontWeight: '400',
                                                color: 'text-muted',
                                            })}
                                        >
                                            {' '}
                                            gefolgt
                                        </span>
                                    </>
                                )}
                            </Text>
                            {activity.recipeTitle && (
                                <Text
                                    size="sm"
                                    className={css({ color: 'primary', fontWeight: '600' })}
                                >
                                    {activity.recipeTitle}
                                </Text>
                            )}
                            {activity.detail && (
                                <Text
                                    size="sm"
                                    color="muted"
                                    className={css({ mt: '1', fontSize: '0.75rem' })}
                                >
                                    {`“${activity.detail}”`}
                                </Text>
                            )}
                            <Text
                                size="sm"
                                color="muted"
                                className={css({ mt: '1', fontSize: '0.75rem' })}
                            >
                                {activity.timeAgo}
                            </Text>
                        </div>
                    </div>
                ))}
            </div>

            <button
                className={css({
                    width: '100%',
                    mt: '4',
                    py: '2.5',
                    textAlign: 'center',
                    fontSize: 'sm',
                    fontWeight: '600',
                    color: 'white',
                    background: '#e07b53',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: 'xl',
                    _hover: {
                        background: '#c4623d',
                        transform: 'translateY(-2px)',
                    },
                    transition: 'all 200ms ease',
                })}
            >
                Mehr Aktivitäten →
            </button>
        </aside>
    );
}
