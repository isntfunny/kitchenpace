'use client';

import { css } from 'styled-system/css';

type Props = {
    onSignIn: () => Promise<void>;
    label?: string;
};

const SignInButton = ({ onSignIn, label = 'Sign In' }: Props) => {
    return (
        <button
            type="button"
            className={css({
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2',
                px: '6',
                py: '3',
                borderRadius: 'full',
                fontFamily: 'body',
                fontWeight: '600',
                fontSize: 'md',
                color: 'white',
                background: 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
                border: 'none',
                cursor: 'pointer',
                transition: 'transform 150ms ease, box-shadow 150ms ease',
                _hover: {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 10px 30px rgba(224,123,83,0.35)',
                },
            })}
            onClick={() => {
                onSignIn();
            }}
        >
            {label}
        </button>
    );
};

export default SignInButton;
