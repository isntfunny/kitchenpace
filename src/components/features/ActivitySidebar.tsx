import type { ActivityFeedItem } from '@app/app/actions/community';
import { css } from 'styled-system/css';

import { Heading, Text } from '../atoms/Typography';

import { ActivityItem } from './activity';

/** Reusable list of activity items — no wrapper card or heading. */
export function ActivityList({ activities }: { activities: ActivityFeedItem[] }) {
    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '1' })}>
            {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
            ))}
        </div>
    );
}

export function ActivitySidebar({
    activities,
    showMore = false,
}: {
    activities: ActivityFeedItem[];
    showMore?: boolean;
}) {
    return (
        <aside
            className={css({
                p: '5',
                borderRadius: '2xl',
                bg: 'surface',
                boxShadow: 'shadow.medium',
                height: 'fit-content',
                position: 'sticky',
                top: '100px',
            })}
        >
            <div className={css({ mb: '4' })}>
                <Heading
                    as="h3"
                    size="md"
                    className={css({ color: 'primary' })}
                >
                    Aktivität
                </Heading>
                <Text size="sm" color="muted" className={css({ fontSize: '0.75rem' })}>
                    Was passiert gerade in der Community
                </Text>
            </div>

            <ActivityList activities={activities} />

            {showMore && (
                <button
                    className={css({
                        width: '100%',
                        mt: '4',
                        py: '2.5',
                        textAlign: 'center',
                        fontSize: 'sm',
                        fontWeight: '600',
                        color: 'white',
                        background: 'palette.orange',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: 'xl',
                        _hover: {
                            background: 'button.primary-hover',
                            transform: 'translateY(-2px)',
                        },
                        transition: 'all 200ms ease',
                    })}
                >
                    Mehr Aktivitäten →
                </button>
            )}
        </aside>
    );
}
