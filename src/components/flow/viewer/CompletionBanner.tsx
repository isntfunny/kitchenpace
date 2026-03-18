import { Sparkles } from 'lucide-react';

import { css } from 'styled-system/css';

export function CompletionBanner() {
    return (
        <div
            className={css({
                mx: '6',
                mb: '6',
                py: '5',
                px: '6',
                bg: 'completion.bg',
                border: '1px solid',
                borderColor: 'completion.border',
                borderRadius: '16px',
                textAlign: 'center',
            })}
        >
            <div className={css({ fontSize: '2xl', mb: '1.5' })}>
                <Sparkles
                    className={css({
                        width: '32px',
                        height: '32px',
                        color: 'palette.emerald',
                        display: 'inline',
                    })}
                />
            </div>
            <div
                className={css({
                    fontSize: 'xl',
                    fontWeight: 800,
                    color: 'palette.emerald',
                    mb: '1',
                })}
            >
                Fertig zubereitet!
            </div>
            <div className={css({ fontSize: 'sm', color: 'completion.text' })}>Guten Appetit!</div>
        </div>
    );
}
