import { Camera, Star } from 'lucide-react';

import type { ActivityFeedItem } from '@app/app/actions/community';
import { Text } from '@app/components/atoms/Typography';
import { css } from 'styled-system/css';

import { ActivityItem, parseActivityDetail } from './ActivityItem';

function StarRating({ rating }: { rating: number }) {
    return (
        <span className={css({ display: 'inline-flex', gap: '0.5' })}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    size={14}
                    className={css({
                        color: star <= rating ? '#f8b500' : '#e0e0e0',
                    })}
                />
            ))}
        </span>
    );
}

export function RatedActivity(props: ActivityFeedItem) {
    const metadata = parseActivityDetail(props.detail);
    const rating = metadata?.rating as number | undefined;

    return (
        <ActivityItem activity={props}>
            {rating && (
                <div className={css({ mt: '1', display: 'flex', alignItems: 'center', gap: '2' })}>
                    <StarRating rating={rating} />
                    <Text size="sm" color="muted" className={css({ fontSize: '0.75rem' })}>
                        {rating}/5
                    </Text>
                </div>
            )}
        </ActivityItem>
    );
}

export function CookedActivity(props: ActivityFeedItem) {
    const metadata = parseActivityDetail(props.detail);
    const hasImage = metadata?.hasImage as boolean | undefined;

    return (
        <ActivityItem activity={props}>
            {hasImage && (
                <Text
                    size="sm"
                    color="muted"
                    className={css({
                        mt: '1',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    })}
                >
                    <Camera size={14} />
                    <span>Mit Bild</span>
                </Text>
            )}
        </ActivityItem>
    );
}

export function CommentedActivity(props: ActivityFeedItem) {
    const metadata = parseActivityDetail(props.detail);
    const comment = (metadata?.comment as string) || props.detail?.replace(/"/g, '') || '';

    return (
        <ActivityItem activity={props}>
            {comment && (
                <Text
                    size="sm"
                    color="muted"
                    className={css({ mt: '1', fontSize: '0.75rem', fontStyle: 'italic' })}
                >
                    &ldquo;{comment.length > 100 ? comment.slice(0, 100) + '…' : comment}&rdquo;
                </Text>
            )}
        </ActivityItem>
    );
}
