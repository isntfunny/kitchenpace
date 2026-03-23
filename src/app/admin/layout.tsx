import { Metadata } from 'next';

import { FullWidthShell } from '@app/components/layouts/FullWidthShell';
import { ensureModeratorSessionWithRole } from '@app/lib/admin/ensure-moderator';

import { AdminSidebar, adminContentClass } from './admin-sidebar';

export const metadata: Metadata = {
    title: 'Administration',
    robots: {
        index: false,
        follow: false,
    },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const { role } = await ensureModeratorSessionWithRole('admin-layout');

    return (
        <FullWidthShell>
            <AdminSidebar role={role} />
            <div className={adminContentClass}>{children}</div>
        </FullWidthShell>
    );
}
