import { CircleAlert, CircleCheck, ShoppingBasket } from 'lucide-react';
import type { ReactNode } from 'react';

import { Skeleton } from '@app/components/atoms/Skeleton';
import { Text } from '@app/components/atoms/Typography';

import { css } from 'styled-system/css';

import { stack } from './styles';

export function Feedback({ children, error = false }: { children: ReactNode; error?: boolean }) {
    const Icon = error ? CircleAlert : CircleCheck;
    return (
        <div
            role={error ? 'alert' : 'status'}
            className={css({
                display: 'flex',
                alignItems: 'flex-start',
                gap: '3',
                p: '4',
                borderRadius: 'xl',
                bg: 'surface.muted',
                overflowWrap: 'anywhere',
            })}
        >
            <Icon
                size={20}
                aria-hidden
                className={css({
                    flexShrink: 0,
                    mt: '0.5',
                    color: error ? 'status.danger' : 'status.success',
                })}
            />
            <Text size="sm">{children}</Text>
        </div>
    );
}

export function LoadingState({ children }: { children: ReactNode }) {
    return (
        <div role="status" className={stack}>
            <Text size="sm" color="muted">
                {children}
            </Text>
            <Skeleton style={{ height: 44, width: '100%' }} />
            <Skeleton style={{ height: 44, width: '70%' }} />
        </div>
    );
}

export function EmptyState({ children }: { children: ReactNode }) {
    return (
        <div
            className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '3',
                p: '5',
                bg: 'background',
                border: '1px dashed',
                borderColor: 'border',
                borderRadius: 'xl',
            })}
        >
            <ShoppingBasket
                size={24}
                aria-hidden
                className={css({ color: 'primary', flexShrink: 0 })}
            />
            <Text color="muted" size="sm">
                {children}
            </Text>
        </div>
    );
}
