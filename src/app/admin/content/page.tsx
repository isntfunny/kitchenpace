import { ensureAdminSession } from '@app/lib/admin/ensure-admin';

import { css } from 'styled-system/css';

import { getContentSettings } from './actions';
import { ContentModerationForm } from './content-moderation-form';

export const dynamic = 'force-dynamic';

export default async function ContentModerationPage() {
    await ensureAdminSession('admin-content');
    const settings = await getContentSettings();

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '6' })}>
            <ContentModerationForm
                currentFeatured={settings.featuredRecipe}
                currentTopUser={settings.topUser}
            />
        </div>
    );
}
