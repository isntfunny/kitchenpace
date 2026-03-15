'use client';

import { KeyRound, Mail, UserCog } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@app/components/atoms/Button';
import { Heading, Text } from '@app/components/atoms/Typography';
import { authClient } from '@app/lib/auth-client';

import { css } from 'styled-system/css';

interface AccountSettingsCardProps {
    email: string;
    /** Whether the user signed up with email/password (not OAuth-only) */
    hasPassword: boolean;
}

export function AccountSettingsCard({ email, hasPassword }: AccountSettingsCardProps) {
    // Email change
    const [newEmail, setNewEmail] = useState('');
    const [emailSaving, setEmailSaving] = useState(false);
    const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [emailError, setEmailError] = useState('');

    // Password change
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordStatus, setPasswordStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [passwordError, setPasswordError] = useState('');

    const handleEmailChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailSaving(true);
        setEmailStatus('idle');
        setEmailError('');

        try {
            const result = await authClient.changeEmail({
                newEmail: newEmail.trim(),
            });

            if (result.error) {
                setEmailError(result.error.message ?? 'E-Mail konnte nicht geändert werden.');
                setEmailStatus('error');
            } else {
                setEmailStatus('success');
                setNewEmail('');
            }
        } catch {
            setEmailError('E-Mail konnte nicht geändert werden.');
            setEmailStatus('error');
        } finally {
            setEmailSaving(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordSaving(true);
        setPasswordStatus('idle');
        setPasswordError('');

        if (newPassword !== confirmPassword) {
            setPasswordError('Die Passwörter stimmen nicht überein.');
            setPasswordStatus('error');
            setPasswordSaving(false);
            return;
        }

        if (newPassword.length < 8) {
            setPasswordError('Das Passwort muss mindestens 8 Zeichen lang sein.');
            setPasswordStatus('error');
            setPasswordSaving(false);
            return;
        }

        try {
            const result = await authClient.changePassword({
                currentPassword,
                newPassword,
                revokeOtherSessions: false,
            });

            if (result.error) {
                setPasswordError(result.error.message ?? 'Passwort konnte nicht geändert werden.');
                setPasswordStatus('error');
            } else {
                setPasswordStatus('success');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch {
            setPasswordError('Passwort konnte nicht geändert werden.');
            setPasswordStatus('error');
        } finally {
            setPasswordSaving(false);
        }
    };

    const inputStyles = css({
        width: '100%',
        borderRadius: 'xl',
        border: '1px solid',
        borderColor: 'border',
        p: '3',
        fontSize: 'md',
        outline: 'none',
        bg: 'background',
        transition: 'all 150ms ease',
        _focus: {
            borderColor: 'primary',
            boxShadow: {
                base: '0 0 0 3px rgba(224,123,83,0.15)',
                _dark: '0 0 0 3px rgba(224,123,83,0.2)',
            },
        },
    });

    return (
        <div
            className={css({
                p: { base: '4', md: '5' },
                borderRadius: '2xl',
                bg: 'surface',
                boxShadow: 'shadow.medium',
            })}
        >
            <div className={css({ mb: '5' })}>
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3',
                        mb: '3',
                    })}
                >
                    <div
                        className={css({
                            w: '10',
                            h: '10',
                            borderRadius: 'lg',
                            bg: 'accent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                        })}
                    >
                        <UserCog size={20} />
                    </div>
                    <Heading as="h2" size="lg">
                        Konto
                    </Heading>
                </div>
                <Text color="muted" size="sm">
                    Verwalte deine E-Mail-Adresse und dein Passwort.
                </Text>
            </div>

            {/* Email Change */}
            <form
                onSubmit={handleEmailChange}
                className={css({
                    p: '4',
                    borderRadius: 'xl',
                    border: '1px solid',
                    borderColor: 'border',
                    bg: 'background',
                    display: 'flex',
                    flexDir: 'column',
                    gap: '3',
                    mb: '3',
                })}
            >
                <div className={css({ display: 'flex', alignItems: 'center', gap: '2', mb: '1' })}>
                    <Mail size={16} />
                    <Text className={css({ fontWeight: '600' })}>E-Mail-Adresse ändern</Text>
                </div>
                <Text size="sm" color="muted">
                    Aktuelle Adresse: <strong>{email}</strong>
                </Text>

                {emailStatus === 'success' && (
                    <Text size="sm" className={css({ color: 'green.600' })}>
                        E-Mail-Adresse erfolgreich geändert.
                    </Text>
                )}
                {emailStatus === 'error' && (
                    <Text size="sm" className={css({ color: 'red.600' })}>
                        {emailError}
                    </Text>
                )}

                <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => {
                        setNewEmail(e.target.value);
                        setEmailStatus('idle');
                    }}
                    placeholder="neue@adresse.de"
                    required
                    className={inputStyles}
                />
                <div>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={emailSaving || !newEmail.trim()}
                    >
                        <Mail size={16} />
                        {emailSaving ? 'Speichern...' : 'E-Mail ändern'}
                    </Button>
                </div>
            </form>

            {/* Password Change */}
            {hasPassword && (
                <form
                    onSubmit={handlePasswordChange}
                    className={css({
                        p: '4',
                        borderRadius: 'xl',
                        border: '1px solid',
                        borderColor: 'border',
                        bg: 'background',
                        display: 'flex',
                        flexDir: 'column',
                        gap: '3',
                    })}
                >
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2',
                            mb: '1',
                        })}
                    >
                        <KeyRound size={16} />
                        <Text className={css({ fontWeight: '600' })}>Passwort ändern</Text>
                    </div>

                    {passwordStatus === 'success' && (
                        <Text size="sm" className={css({ color: 'green.600' })}>
                            Passwort erfolgreich geändert.
                        </Text>
                    )}
                    {passwordStatus === 'error' && (
                        <Text size="sm" className={css({ color: 'red.600' })}>
                            {passwordError}
                        </Text>
                    )}

                    <label className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
                        <Text size="sm" className={css({ fontWeight: '500' })}>
                            Aktuelles Passwort
                        </Text>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => {
                                setCurrentPassword(e.target.value);
                                setPasswordStatus('idle');
                            }}
                            required
                            autoComplete="current-password"
                            className={inputStyles}
                        />
                    </label>

                    <label className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
                        <Text size="sm" className={css({ fontWeight: '500' })}>
                            Neues Passwort
                        </Text>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => {
                                setNewPassword(e.target.value);
                                setPasswordStatus('idle');
                            }}
                            required
                            minLength={8}
                            autoComplete="new-password"
                            className={inputStyles}
                        />
                    </label>

                    <label className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
                        <Text size="sm" className={css({ fontWeight: '500' })}>
                            Neues Passwort bestätigen
                        </Text>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                setPasswordStatus('idle');
                            }}
                            required
                            minLength={8}
                            autoComplete="new-password"
                            className={inputStyles}
                        />
                    </label>

                    <div>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={
                                passwordSaving ||
                                !currentPassword ||
                                !newPassword ||
                                !confirmPassword
                            }
                        >
                            <KeyRound size={16} />
                            {passwordSaving ? 'Speichern...' : 'Passwort ändern'}
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
}
