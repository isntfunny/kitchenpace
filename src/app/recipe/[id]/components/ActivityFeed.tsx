'use client';

import { Avatar } from '@app/components/atoms/Avatar';

import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

import type { Activity } from '../data';

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
                    bg: 'surface',
                    borderRadius: '2xl',
                    p: '6',
                    boxShadow: 'shadow.medium',
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
                            <Avatar
                                src={activity.user.avatar}
                                name={activity.user.name}
                                size="md"
                            />
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
