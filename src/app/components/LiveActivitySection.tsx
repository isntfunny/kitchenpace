import { fetchRecentActivities } from '@app/app/actions/community';
import { LiveActivitySidebar } from '@app/components/features/LiveActivityFeed';

export async function LiveActivitySection() {
    const activities = await fetchRecentActivities();
    return <LiveActivitySidebar initialActivities={activities} />;
}
