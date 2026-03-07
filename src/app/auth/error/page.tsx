import AuthErrorClient from '@app/components/auth/AuthErrorClient';
import { PageShell } from '@app/components/layouts/PageShell';
import { css } from 'styled-system/css';

type AuthErrorPageProps = {
    searchParams: Promise<{ error?: string }>;
};

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
    const { error } = await searchParams;

    return (
        <PageShell>
            <section
                className={css({
                    paddingY: { base: '8', md: '12' },
                    display: 'flex',
                    justifyContent: 'center',
                    fontFamily: 'body',
                    color: 'text',
                })}
            >
                <div
                    className={css({
                        background: 'surface',
                        borderRadius: '2xl',
                        padding: { base: '8', md: '10' },
                        boxShadow: 'shadow.large',
                        maxWidth: '520px',
                        width: '100%',
                        textAlign: 'center',
                    })}
                >
                    <AuthErrorClient error={error ?? null} />
                </div>
            </section>
        </PageShell>
    );
}
