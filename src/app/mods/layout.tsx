import { Metadata } from 'next';

import { AdminSidebar, adminContentClass } from '@app/app/admin/admin-sidebar';
import { FullWidthShell } from '@app/components/layouts/FullWidthShell';
import { ensureModeratorSession } from '@app/lib/admin/ensure-moderator';

export const metadata: Metadata = {
    title: 'Moderation',
    robots: { index: false, follow: false },
};

export default async function ModsLayout({ children }: { children: React.ReactNode }) {
    await ensureModeratorSession('mods-layout');

    return (
        <FullWidthShell>
            <AdminSidebar />
            <div className={adminContentClass}>{children}</div>
        </FullWidthShell>
    );
}
