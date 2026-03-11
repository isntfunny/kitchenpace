import type { ReactNode } from 'react';

import { QuickLinksCard } from '@app/components/features/QuickLinksCard';
import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

interface ProfileSidebarLayoutProps {
    children: ReactNode;
    userSlug?: string;
    /** Extra content rendered inside the sidebar below QuickLinksCard */
    sidebarExtra?: ReactNode;
}

export function ProfileSidebarLayout({
    children,
    userSlug,
    sidebarExtra,
}: ProfileSidebarLayoutProps) {
    return (
        <div className={grid({ columns: { base: 1, lg: 12 }, gap: '4' })}>
            {/* Main content */}
            <div
                className={css({
                    lg: { gridColumn: 'span 8' },
                    display: 'flex',
                    flexDir: 'column',
                    gap: '4',
                })}
            >
                {children}
            </div>

            {/* Sidebar */}
            <div
                className={css({
                    lg: { gridColumn: 'span 4' },
                    display: 'flex',
                    flexDir: 'column',
                    gap: '4',
                    order: { base: -1, lg: 1 },
                    position: { lg: 'sticky' },
                    top: { lg: '8rem' },
                    alignSelf: { lg: 'start' },
                })}
            >
                <QuickLinksCard userSlug={userSlug} />
                {sidebarExtra}
            </div>
        </div>
    );
}
