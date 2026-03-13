import { useOnboarding } from '@onboardjs/react';
import type { StepComponentProps } from '@onboardjs/react';
import { Sparkles } from 'lucide-react';

import { PALETTE } from '@app/lib/palette';
import { css } from 'styled-system/css';

import type { WelcomeTutorialPayload } from '../types';

export function WelcomeStep({ payload }: StepComponentProps<WelcomeTutorialPayload>) {
    const { next, loading } = useOnboarding();

    return (
        <div className={css({ textAlign: 'center' })}>
            <div
                className={css({
                    width: '72px',
                    height: '72px',
                    borderRadius: 'full',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 6',
                    boxShadow: '0 8px 30px rgba(224, 123, 83, 0.4)',
                })}
                style={{
                    background: `linear-gradient(135deg, ${PALETTE.orange}, ${PALETTE.gold})`,
                }}
            >
                <Sparkles className={css({ width: '36px', height: '36px', color: 'white' })} />
            </div>

            <h2
                className={css({
                    fontSize: { base: '2xl', md: '3xl' },
                    fontWeight: '700',
                    marginBottom: '3',
                    color: 'text.primary',
                })}
            >
                {payload.title}
            </h2>
            <p
                className={css({
                    fontSize: 'md',
                    color: 'text.muted',
                    marginBottom: '6',
                    lineHeight: '1.7',
                    maxWidth: '400px',
                    marginX: 'auto',
                })}
            >
                {payload.description}
            </p>

            <button
                type="button"
                className={css({
                    backgroundColor: 'palette.orange',
                    color: 'white',
                    fontWeight: '600',
                    borderRadius: 'xl',
                    px: '6',
                    py: '3.5',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    fontSize: 'md',
                    boxShadow: '0 4px 15px rgba(224, 123, 83, 0.4)',
                    _hover: {
                        filter: 'brightness(1.05)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 20px rgba(224, 123, 83, 0.5)',
                    },
                    _disabled: { filter: 'brightness(0.9)', cursor: 'not-allowed' },
                })}
                onClick={() => void next()}
                disabled={loading.isAnyLoading}
            >
                {payload.primaryLabel}
            </button>
        </div>
    );
}
