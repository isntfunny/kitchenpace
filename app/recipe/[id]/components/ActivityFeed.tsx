'use client';

import { SmartImage } from '@/components/atoms/SmartImage';
import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

interface Activity {
    id: string;
    user: {
        name: string | null;
        avatar: string | null;
    };
    action: string;
    content: string | null;
    timestamp: string;
}

interface ActivityFeedProps {
    activities: Activity[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
    if (activities.length === 0) return null;

    return (
        <div className={css({ mt: '12' })}>
            <h2
                className={css({
                    fontFamily: 'heading',
                    fontSize: '2xl',
                    fontWeight: '600',
                    mb: '6',
                })}
            >
                Aktivitäten
            </h2>
            <div
                className={css({
                    bg: 'white',
                    borderRadius: '2xl',
                    p: '6',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                })}
            >
                <div className={css({ spaceY: '4' })}>
                    {activities.map((activity) => (
                        <div
                            key={activity.id}
                            className={flex({
                                gap: '4',
                                align: 'flex-start',
                                p: '4',
                                bg: 'light',
                                borderRadius: 'xl',
                            })}
                        >
                            <div
                                className={css({
                                    position: 'relative',
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: 'full',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                })}
                            >
                                <SmartImage
                                    src={activity.user.avatar ?? '/placeholder.jpg'}
                                    alt={activity.user.name ?? 'Benutzer'}
                                    fill
                                    sizes="48px"
                                    className={css({ objectFit: 'cover' })}
                                />
                            </div>
                            <div className={css({ flex: 1 })}>
                                <p
                                    className={css({
                                        fontWeight: '600',
                                        fontFamily: 'heading',
                                    })}
                                >
                                    {activity.user.name}
                                </p>
                                <p
                                    className={css({
                                        color: 'text-muted',
                                        fontFamily: 'body',
                                    })}
                                >
                                    {activity.action}
                                </p>
                                {activity.content && (
                                    <p
                                        className={css({
                                            mt: '2',
                                            color: 'text-muted',
                                        })}
                                    >
                                        {activity.content}
                                    </p>
                                )}
                            </div>
                            <div
                                className={css({
                                    fontSize: 'sm',
                                    color: 'text-muted',
                                    fontFamily: 'body',
                                })}
                            >
                                {activity.timestamp}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
