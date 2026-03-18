'use client';

import { FileText } from 'lucide-react';

import type { ActivityFeedItem } from '@app/app/actions/community';
import { ActivityItem } from '@app/components/features/activity';
import { TrophySection, type EarnedTrophy } from '@app/components/features/TrophySection';

import { css } from 'styled-system/css';

interface ProfileActivitySidebarProps {
    activities: ActivityFeedItem[];
    trophies?: EarnedTrophy[];
}

export function ProfileActivitySidebar({ activities, trophies }: ProfileActivitySidebarProps) {
    return (
        <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
            {trophies && trophies.length > 0 && <TrophySection trophies={trophies} />}
            <h2
                className={css({
                    fontSize: 'lg',
                    fontWeight: '700',
                    color: 'text',
                    fontFamily: 'heading',
                })}
            >
                Aktivitäten
            </h2>

            {activities.length > 0 ? (
                <div
                    className={css({
                        bg: 'surface.elevated',
                        borderRadius: 'xl',
                        boxShadow: {
                            base: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)',
                            _dark: '0 1px 3px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.1)',
                        },
                        overflow: 'hidden',
                    })}
                >
                    <div
                        className={css({
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1',
                        })}
                    >
                        {activities.map((activity) => (
                            <ActivityItem key={activity.id} activity={activity} />
                        ))}
                    </div>
                </div>
            ) : (
                <div
                    className={css({
                        bg: 'surface.elevated',
                        borderRadius: 'xl',
                        p: '6',
                        textAlign: 'center',
                        border: '1px dashed',
                        borderColor: 'border',
                    })}
                >
                    <div
                        className={css({
                            fontSize: '2xl',
                            mb: '2',
                            color: 'foreground.muted',
                        })}
                    >
                        <FileText size={36} />
                    </div>
                    <p className={css({ color: 'text-muted', fontSize: 'sm' })}>
                        Noch keine Aktivitäten.
                    </p>
                </div>
            )}
        </div>
    );
}
