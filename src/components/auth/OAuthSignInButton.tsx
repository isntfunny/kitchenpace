'use client';

import { SiDiscord, SiGoogle, SiTwitch } from '@icons-pack/react-simple-icons';
import { KeyRound } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { authClient, signIn } from '@app/lib/auth-client';
import { SOCIAL } from '@app/lib/themes/palette';

import { css } from 'styled-system/css';
import type { SystemStyleObject } from 'styled-system/types';

interface OAuthButtonStyle {
    color: string;
    background: string;
    border: string;
    borderColor: string;
    hoverEffect: SystemStyleObject;
}

const OUTLINED_STYLE: OAuthButtonStyle = {
    color: 'foreground',
    background: 'surface',
    border: '1px solid',
    borderColor: 'border',
    hoverEffect: {
        borderColor: 'border.hover',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        transform: 'translateY(-1px)',
    },
};

function brandStyle(bg: string): OAuthButtonStyle {
    return {
        color: 'white',
        background: bg,
        border: 'none',
        borderColor: 'transparent',
        hoverEffect: {
            filter: 'brightness(1.1)',
            transform: 'translateY(-1px)',
            boxShadow: `0 8px 24px ${bg}44`,
        },
    };
}

interface OAuthSignInButtonProps {
    provider: 'google' | 'discord' | 'twitch';
    label: string;
    icon: ReactNode;
    callbackUrl?: string;
    style?: OAuthButtonStyle;
}

export function OAuthSignInButton({
    provider,
    label,
    icon,
    callbackUrl = '/',
    style = OUTLINED_STYLE,
}: OAuthSignInButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleClick = () => {
        setLoading(true);
        signIn.social({ provider, callbackURL: callbackUrl });
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={loading}
            className={css({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2.5',
                width: '100%',
                padding: '3',
                borderRadius: 'xl',
                border: style.border,
                borderColor: style.borderColor,
                fontFamily: 'body',
                fontSize: 'md',
                fontWeight: '600',
                color: style.color,
                background: style.background,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 150ms ease',
                _hover: loading ? {} : style.hoverEffect,
            })}
        >
            {icon}
            {loading ? 'Weiterleitung…' : label}
        </button>
    );
}

export function OAuthDivider() {
    return (
        <div
            className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '3',
                marginY: '1',
            })}
        >
            <div className={css({ flex: 1, height: '1px', background: 'border.muted' })} />
            <span
                className={css({
                    fontSize: 'xs',
                    fontWeight: '600',
                    color: 'foreground.muted',
                    textTransform: 'uppercase',
                    letterSpacing: 'wide',
                })}
            >
                oder
            </span>
            <div className={css({ flex: 1, height: '1px', background: 'border.muted' })} />
        </div>
    );
}

// --- Provider-specific buttons ---

const DISCORD_STYLE = brandStyle(SOCIAL.discord);
const TWITCH_STYLE = brandStyle(SOCIAL.twitch);

export function GoogleSignInButton({ callbackUrl }: { callbackUrl?: string }) {
    return (
        <OAuthSignInButton
            provider="google"
            label="Mit Google fortfahren"
            icon={<SiGoogle size={20} />}
            callbackUrl={callbackUrl}
        />
    );
}

export function DiscordSignInButton({ callbackUrl }: { callbackUrl?: string }) {
    return (
        <OAuthSignInButton
            provider="discord"
            label="Mit Discord fortfahren"
            icon={<SiDiscord size={20} />}
            callbackUrl={callbackUrl}
            style={DISCORD_STYLE}
        />
    );
}

export function TwitchSignInButton({ callbackUrl }: { callbackUrl?: string }) {
    return (
        <OAuthSignInButton
            provider="twitch"
            label="Mit Twitch fortfahren"
            icon={<SiTwitch size={20} />}
            callbackUrl={callbackUrl}
            style={TWITCH_STYLE}
        />
    );
}

export function PasskeySignInButton({ callbackUrl = '/' }: { callbackUrl?: string }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleClick = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await authClient.signIn.passkey();
            if (result?.error) {
                setError('Passkey-Anmeldung fehlgeschlagen.');
            } else {
                window.location.href = callbackUrl;
            }
        } catch {
            setError('Passkey-Anmeldung fehlgeschlagen.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <button
                type="button"
                onClick={handleClick}
                disabled={loading}
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2.5',
                    width: '100%',
                    padding: '3',
                    borderRadius: 'xl',
                    border: '1px solid',
                    borderColor: 'border',
                    fontFamily: 'body',
                    fontSize: 'md',
                    fontWeight: '600',
                    color: 'foreground',
                    background: 'surface',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    transition: 'all 150ms ease',
                    _hover: loading
                        ? {}
                        : {
                              borderColor: 'border.hover',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                              transform: 'translateY(-1px)',
                          },
                })}
            >
                <KeyRound size={20} />
                {loading ? 'Weiterleitung…' : 'Mit Passkey anmelden'}
            </button>
            {error && <p className={css({ color: 'red.500', fontSize: 'sm', mt: '1' })}>{error}</p>}
        </div>
    );
}
