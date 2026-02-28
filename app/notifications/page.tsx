import { PageShell } from '@/components/layouts/PageShell';
import { NotificationsPageContent } from '@/components/notifications/NotificationsPageContent';
import { css } from 'styled-system/css';

export const metadata = {
    title: 'Benachrichtigungen | KüchenTakt',
};

export default function NotificationsPage() {
    return (
        <PageShell>
            <section
                className={css({
                    paddingY: { base: '8', md: '10' },
                    fontFamily: 'body',
                })}
            >
                <div
                    className={css({
                        maxW: '960px',
                        marginX: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6',
                    })}
                >
                    <NotificationsPageContent />
                </div>
            </section>
        </PageShell>
    );
}
