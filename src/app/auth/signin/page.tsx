import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { AuthPageLayout } from '@app/components/layouts/AuthPageLayout';
import { getServerAuthSession } from '@app/lib/auth';
import { css } from 'styled-system/css';

import { SignInForm } from './SignInForm';

export default async function SignInPage() {
    const session = await getServerAuthSession();
    if (session?.user) {
        redirect('/profile');
    }

    return (
        <AuthPageLayout
            heroTitle="Deine Rezepte warten auf dich"
            heroSubtitle="Melde dich an und greife auf deine angepinnten Rezepte, Favoriten und eigenen Kreationen zu."
            formFooter={
                <>
                    <Link
                        href="/auth/forgot-password"
                        className={css({
                            color: 'text.muted',
                            textDecoration: 'none',
                            _hover: { color: 'accent' },
                        })}
                    >
                        Passwort vergessen?
                    </Link>
                    <Link
                        href="/auth/register"
                        className={css({
                            color: 'text.muted',
                            textDecoration: 'none',
                            _hover: { color: 'accent' },
                        })}
                    >
                        Noch kein Konto?{' '}
                        <span className={css({ color: 'accent', fontWeight: '600' })}>
                            Registrieren
                        </span>
                    </Link>
                </>
            }
        >
            <Suspense
                fallback={
                    <div
                        className={css({
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3',
                            py: '10',
                            alignItems: 'center',
                            justifyContent: 'center',
                        })}
                    >
                        <Loader2
                            size={28}
                            className={css({
                                color: 'primary',
                                animation: 'spin 1s linear infinite',
                            })}
                        />
                        <p className={css({ color: 'text.muted', fontSize: 'sm' })}>
                            Anmeldeformular wird geladen…
                        </p>
                    </div>
                }
            >
                <SignInForm />
            </Suspense>
        </AuthPageLayout>
    );
}
