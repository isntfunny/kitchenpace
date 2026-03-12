import { Skeleton } from '@app/components/atoms/Skeleton';
import { css } from 'styled-system/css';

interface RecipeCardSkeletonProps {
    variant?: 'default' | 'list';
}

export function RecipeCardSkeleton({ variant = 'default' }: RecipeCardSkeletonProps) {
    if (variant === 'list') {
        return (
            <div
                className={css({
                    bg: 'surface.elevated',
                    borderRadius: 'xl',
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'rgba(0,0,0,0.06)',
                    display: 'flex',
                    flexDirection: 'row',
                })}
            >
                <Skeleton
                    className={css({ flexShrink: '0', width: '120px', aspectRatio: '4/3' })}
                />
                <div
                    className={css({
                        flex: '1',
                        px: '3.5',
                        py: '3',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '2',
                    })}
                >
                    <Skeleton
                        className={css({ height: '14px', width: '40%', borderRadius: 'full' })}
                    />
                    <Skeleton
                        className={css({ height: '16px', width: '80%', borderRadius: 'full' })}
                    />
                    <Skeleton
                        className={css({ height: '12px', width: '55%', borderRadius: 'full' })}
                    />
                </div>
            </div>
        );
    }

    return (
        <div
            className={css({
                bg: 'surface.elevated',
                borderRadius: 'xl',
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'rgba(0,0,0,0.06)',
            })}
        >
            <Skeleton className={css({ width: '100%', aspectRatio: '16/10' })} />
            <div className={css({ p: '4', display: 'flex', flexDirection: 'column', gap: '2.5' })}>
                <Skeleton className={css({ height: '14px', width: '35%', borderRadius: 'full' })} />
                <Skeleton className={css({ height: '18px', width: '85%', borderRadius: 'full' })} />
                <Skeleton className={css({ height: '14px', width: '65%', borderRadius: 'full' })} />
                <div className={css({ display: 'flex', justifyContent: 'space-between', mt: '1' })}>
                    <Skeleton
                        className={css({ height: '12px', width: '25%', borderRadius: 'full' })}
                    />
                    <Skeleton
                        className={css({ height: '12px', width: '20%', borderRadius: 'full' })}
                    />
                </div>
            </div>
        </div>
    );
}
