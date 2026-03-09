import { Sparkles } from 'lucide-react';

import { useDarkColors } from '@app/lib/darkMode';
import { PALETTE } from '@app/lib/palette';

export function CompletionBanner() {
    const c = useDarkColors();
    return (
        <div
            style={{
                margin: '0 24px 24px',
                padding: '20px 24px',
                backgroundColor: c.completionBg,
                border: `1px solid ${c.completionBorder}`,
                borderRadius: 16,
                textAlign: 'center',
            }}
        >
            <div style={{ fontSize: 32, marginBottom: 6 }}>
                <Sparkles style={{ width: 32, height: 32, color: PALETTE.emerald, display: 'inline' }} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: PALETTE.emerald, marginBottom: 4 }}>
                Fertig zubereitet!
            </div>
            <div style={{ fontSize: 14, color: c.completionText }}>Guten Appetit!</div>
        </div>
    );
}
