'use client';

import { handleSignOut } from '@app/components/auth/actions';
import { css } from 'styled-system/css';

type Props = {
    label?: string;
};

const SignOutButton = ({ label = 'Sign Out' }: Props) => {
    return (
        <button
            type="button"
            className={css({
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2',
                px: '5',
                py: '2.5',
                borderRadius: 'full',
                fontFamily: 'body',
                fontWeight: '600',
                fontSize: 'sm',
                color: 'text',
                background: 'surface',
                border: '1px solid',
                borderColor: { base: 'rgba(224,123,83,0.4)', _dark: 'rgba(240,144,112,0.5)' },
                cursor: 'pointer',
                transition: 'all 150ms ease',
                _hover: {
                    background: 'accent.soft',
                    color: 'palette.orange',
                },
            })}
            onClick={() => {
                handleSignOut();
            }}
        >
            {label}
        </button>
    );
};

export default SignOutButton;
