import { Sparkles } from 'lucide-react';

import { css } from 'styled-system/css';

interface CompletionMessageProps {
    show: boolean;
}

export function CompletionMessage({ show }: CompletionMessageProps) {
    if (!show) return null;

    return (
        <div
            className={css({
                padding: '16px',
                backgroundColor: '#e8f5e9',
                borderTop: '2px solid #4caf50',
                textAlign: 'center',
                flexShrink: 0,
            })}
        >
            <div className={css({ fontSize: '24px', marginBottom: '4px', color: '#4caf50' })}>
                <Sparkles size={32} />
            </div>
            <div className={css({ fontSize: '16px', fontWeight: '700', color: '#2e7d32' })}>
                Fertig! Guten Appetit!
            </div>
        </div>
    );
}
