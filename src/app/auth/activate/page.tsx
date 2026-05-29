import ActivateClient from './ActivateClient';

type ActivatePageProps = {
    searchParams: Promise<{ verified?: string; error?: string }>;
};

export default async function ActivatePage({ searchParams }: ActivatePageProps) {
    // better-auth handles verification at /api/auth/verify-email and redirects here.
    // On failure it appends `&error=<code>` to the callbackURL.
    const { error } = await searchParams;
    return <ActivateClient error={error ?? null} />;
}
