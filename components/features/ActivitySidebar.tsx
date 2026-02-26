import type { ActivityFeedItem } from '@/app/actions/community';
import { css } from 'styled-system/css';

import { Heading, Text } from '../atoms/Typography';
import { Activity } from 'lucide-react';

import {
    RatedActivity,
    CookedActivity,
    FavoritedActivity,
    CommentedActivity,
    CreatedActivity,
    FollowedActivity,
} from './activity';

interface ActivitySidebarProps {
    activities: ActivityFeedItem[];
}

function getActivityComponent(activity: ActivityFeedItem) {
    if (activity.targetUserName) {
        return <FollowedActivity {...activity} />;
    }

    if (activity.actionLabel.includes('bewertet')) {
        return <RatedActivity {...activity} />;
    }

    if (activity.actionLabel.includes('gekocht')) {
        return <CookedActivity {...activity} />;
    }

    if (activity.actionLabel.includes('gespeichert')) {
        return <FavoritedActivity {...activity} />;
    }

    if (activity.actionLabel.includes('kommentiert')) {
        return <CommentedActivity {...activity} />;
    }

    if (
        activity.actionLabel.includes('erstellt') ||
        activity.actionLabel.includes('Einkaufsliste') ||
        activity.actionLabel.includes('Plan')
    ) {
        return <CreatedActivity {...activity} />;
    }

    return <CreatedActivity {...activity} />;
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
                <Heading
                    as="h3"
                    size="md"
                    className={css({
                        color: 'primary',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    })}
                >
                    <Activity size={18} />
                    <span>Aktivität</span>
                </Heading>
                <Text size="sm" color="muted" className={css({ fontSize: '0.75rem' })}>
                    Was passiert gerade in der Community
                </Text>
            </div>

            <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
                {activities.map((activity) => (
                    <div key={activity.id}>{getActivityComponent(activity)}</div>
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
