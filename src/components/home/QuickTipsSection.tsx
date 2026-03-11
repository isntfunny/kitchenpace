import { fetchQuickTips } from '@app/app/actions/community';
import { QuickTips } from '@app/components/features/QuickTips';

export async function QuickTipsSection() {
    const tips = await fetchQuickTips();
    return <QuickTips tips={tips} />;
}
