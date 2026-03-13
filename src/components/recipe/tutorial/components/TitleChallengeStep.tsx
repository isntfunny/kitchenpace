import { useOnboarding } from '@onboardjs/react';
import type { StepComponentProps } from '@onboardjs/react';
import { useEffect } from 'react';

import { css } from 'styled-system/css';

import type { InputTutorialPayload } from '../types';

interface TitleChallengeStepProps extends StepComponentProps<InputTutorialPayload> {
    titleValue: string;
    onFocusTitleField: () => void;
}

export function TitleChallengeStep({
    payload,
    titleValue,
    onFocusTitleField,
}: TitleChallengeStepProps) {
    const { next, loading } = useOnboarding();
    const normalizedTitle = titleValue.trim().toLowerCase();
    const normalizedExpected = payload.expectedValue.trim().toLowerCase();
    const isMatch = normalizedTitle === normalizedExpected;

    useEffect(() => {
        onFocusTitleField();
    }, [onFocusTitleField]);

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
            <h2
                className={css({
                    fontSize: { base: '2xl', md: '3xl' },
                    fontWeight: '700',
                    marginBottom: '2',
                    color: 'text.primary',
                })}
            >
                {payload.title}
            </h2>
            <p className={css({ fontSize: 'md', color: 'text.muted', lineHeight: '1.6' })}>
                {payload.description}
            </p>
            <p className={css({ fontSize: 'sm', color: 'text.secondary' })}>
                Erwartete Eingabe: <strong>{payload.expectedValue}</strong>
            </p>
            <p
                className={css({
                    fontSize: 'sm',
                    color: isMatch ? 'palette.emerald' : 'text.primary',
                    fontWeight: isMatch ? '600' : '500',
                })}
            >
                {isMatch
                    ? 'Perfekt. Jetzt kannst du zum naechsten Schritt weiter.'
                    : 'Trage exakt dieses Wort in das Titelfeld ein, um fortzufahren.'}
            </p>

            <button
                type="button"
                className={css({
                    borderRadius: 'xl',
                    px: '5',
                    py: '3',
                    fontWeight: '600',
                    backgroundColor: isMatch ? 'palette.orange' : 'rgba(224,123,83,0.4)',
                    color: 'white',
                    border: 'none',
                    cursor: isMatch ? 'pointer' : 'not-allowed',
                    transition: 'transform 150ms ease',
                    _hover: isMatch ? { transform: 'translateY(-1px)' } : undefined,
                })}
                onClick={() => void next()}
                disabled={!isMatch || loading.isAnyLoading}
            >
                {payload.primaryLabel}
            </button>
        </div>
    );
}
