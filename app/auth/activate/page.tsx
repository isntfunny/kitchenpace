import ActivateClient from '@/components/auth/ActivateClient';
import { PageShell } from '@/components/layouts/PageShell';

type ActivatePageProps = {
    searchParams: Promise<{ token?: string }>;
};

export default async function ActivatePage({ searchParams }: ActivatePageProps) {
    const { token } = await searchParams;
    return (
        <PageShell>
            <ActivateClient token={token ?? null} />
        </PageShell>
    );
}
