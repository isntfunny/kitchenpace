import ActivateClient from '@/components/auth/ActivateClient';

type ActivatePageProps = {
    searchParams: { token?: string };
};

export default function ActivatePage({ searchParams }: ActivatePageProps) {
    return <ActivateClient token={searchParams.token ?? null} />;
}
