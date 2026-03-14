import { Metadata } from 'next';

import { ensureAdminSession } from '@app/lib/admin/ensure-admin';

export const metadata: Metadata = {
    title: 'Administration',
    robots: {
        index: false,
        follow: false,
    },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    await ensureAdminSession('admin-layout');

    return children;
}
