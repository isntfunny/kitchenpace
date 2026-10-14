import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

import { css } from 'styled-system/css';

const detailText = css({
    fontFamily: 'body',
    fontSize: 'sm',
    lineHeight: '1.8',
    color: 'text-muted',
    '& p + p': { mt: '3' },
    '& code': {
        color: 'text',
        fontFamily: 'monospace',
        fontSize: '0.9em',
        overflowWrap: 'anywhere',
    },
});
export function ApiGuide({
    title,
    hint,
    icon,
    children,
}: {
    title: string;
    hint: string;
    icon: ReactNode;
    children: ReactNode;
}) {
    return (
        <details
            className={css({
                bg: 'surface',
                border: '1px solid',
                borderColor: 'border',
                borderRadius: 'lg',
                alignSelf: 'start',
                '&[open] .guide-chevron': { transform: 'rotate(180deg)' },
            })}
        >
            <summary
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3',
                    p: '4',
                    cursor: 'pointer',
                    listStyle: 'none',
                    '&::-webkit-details-marker': { display: 'none' },
                    _focusVisible: {
                        outline: '2px solid',
                        outlineColor: 'primary',
                        outlineOffset: '3px',
                        borderRadius: 'lg',
                    },
                })}
            >
                <span className={css({ color: 'primary', flexShrink: '0' })}>{icon}</span>
                <span className={css({ flex: '1', minW: '0', fontFamily: 'body' })}>
                    <span
                        className={css({
                            display: 'block',
                            fontWeight: '600',
                            color: 'text',
                            fontSize: 'sm',
                        })}
                    >
                        {title}
                    </span>
                    <span
                        className={css({
                            display: 'block',
                            color: 'text-muted',
                            fontSize: 'xs',
                            mt: '1',
                        })}
                    >
                        {hint}
                    </span>
                </span>
                <ChevronDown className="guide-chevron" size={17} aria-hidden="true" />
            </summary>
            <div className={css({ px: '4', pb: '4' })}>
                <div className={detailText}>{children}</div>
            </div>
        </details>
    );
}
