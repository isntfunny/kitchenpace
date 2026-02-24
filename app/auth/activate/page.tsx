import ActivateClient from '@/components/auth/ActivateClient';

type ActivatePageProps = {
    searchParams: Promise<{ token?: string }>;
};

export default async function ActivatePage({ searchParams }: ActivatePageProps) {
    const { token } = await searchParams;
    return <ActivateClient token={token ?? null} />;
}
