import AuthErrorClient from '@/components/auth/AuthErrorClient';
import { PageShell } from '@/components/layouts/PageShell';
import { css } from 'styled-system/css';

type AuthErrorPageProps = {
    searchParams: { error?: string };
};

export default function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
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
                        background: 'white',
                        borderRadius: '2xl',
                        padding: { base: '8', md: '10' },
                        boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
                        maxWidth: '520px',
                        width: '100%',
                        textAlign: 'center',
                    })}
                >
                    <AuthErrorClient error={searchParams.error ?? null} />
                </div>
            </section>
        </PageShell>
    );
}
