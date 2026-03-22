import { Metadata } from 'next';

import { FullWidthShell } from '@app/components/layouts/FullWidthShell';
import { ensureAdminSession } from '@app/lib/admin/ensure-admin';

import { AdminSidebar, adminContentClass } from './admin-sidebar';

export const metadata: Metadata = {
    title: 'Administration',
    robots: {
        index: false,
        follow: false,
    },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    await ensureAdminSession('admin-layout');

    return (
        <FullWidthShell>
            <AdminSidebar />
            <div className={adminContentClass}>{children}</div>
        </FullWidthShell>
    );
}
