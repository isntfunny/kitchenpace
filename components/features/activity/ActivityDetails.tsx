import { Camera, Calendar, ShoppingCart } from 'lucide-react';

import { Text } from '@/components/atoms/Typography';
import { css } from 'styled-system/css';

import { ActivityItem, ActivityRecipeLink, parseActivityDetail } from './ActivityItem';

interface ActivityDetailProps {
    id: string;
    detail?: string;
    recipeId?: string;
    recipeTitle?: string;
    userName: string;
    actionLabel: string;
    timeAgo: string;
    icon: string;
    iconBg: string;
    targetUserName?: string;
}

function StarRating({ rating }: { rating: number }) {
    return (
        <span className={css({ display: 'inline-flex', gap: '0.5' })}>
            {[1, 2, 3, 4, 5].map((star) => (
                <span
                    key={star}
                    className={css({
                        color: star <= rating ? '#f8b500' : '#e0e0e0',
                        fontSize: '0.75rem',
                    })}
                >
                    ★
                </span>
            ))}
        </span>
    );
}

export function RatedActivity(props: ActivityDetailProps) {
    const metadata = parseActivityDetail(props.detail);
    const rating = metadata?.rating as number | undefined;

    return (
        <ActivityItem activity={props}>
            <ActivityRecipeLink recipeId={props.recipeId} recipeTitle={props.recipeTitle} />
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

export function CookedActivity(props: ActivityDetailProps) {
    const metadata = parseActivityDetail(props.detail);
    const hasImage = metadata?.hasImage as boolean | undefined;

    return (
        <ActivityItem activity={props}>
            <ActivityRecipeLink recipeId={props.recipeId} recipeTitle={props.recipeTitle} />
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

export function FavoritedActivity(props: ActivityDetailProps) {
    return (
        <ActivityItem activity={props}>
            <ActivityRecipeLink recipeId={props.recipeId} recipeTitle={props.recipeTitle} />
        </ActivityItem>
    );
}

export function CommentedActivity(props: ActivityDetailProps) {
    const comment = props.detail?.replace(/"/g, '') || '';

    return (
        <ActivityItem activity={props}>
            <ActivityRecipeLink recipeId={props.recipeId} recipeTitle={props.recipeTitle} />
            {comment && (
                <Text
                    size="sm"
                    color="muted"
                    className={css({ mt: '1', fontSize: '0.75rem', fontStyle: 'italic' })}
                >
                    "{comment.length > 100 ? comment.slice(0, 100) + '...' : comment}"
                </Text>
            )}
        </ActivityItem>
    );
}

export function CreatedActivity(props: ActivityDetailProps) {
    const isRecipe = props.actionLabel.includes('Rezept');
    const isShoppingList = props.actionLabel.includes('Einkaufsliste');
    const isMealPlan = props.actionLabel.includes('Plan');

    return (
        <ActivityItem activity={props}>
            {isRecipe && (
                <ActivityRecipeLink recipeId={props.recipeId} recipeTitle={props.recipeTitle} />
            )}
            {!isRecipe && !isShoppingList && !isMealPlan && (
                <Text size="sm" color="muted" className={css({ mt: '1', fontSize: '0.75rem' })}>
                    {props.actionLabel}
                </Text>
            )}
            {isShoppingList && (
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
                    <ShoppingCart size={14} />
                    <span>Einkaufsliste</span>
                </Text>
            )}
            {isMealPlan && (
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
                    <Calendar size={14} />
                    <span>Meal Plan</span>
                </Text>
            )}
        </ActivityItem>
    );
}

export function FollowedActivity(props: ActivityDetailProps) {
    return (
        <ActivityItem activity={props}>
            <Text size="sm" color="muted" className={css({ mt: '1', fontSize: '0.75rem' })}>
                Dir gefolgt
            </Text>
        </ActivityItem>
    );
}
