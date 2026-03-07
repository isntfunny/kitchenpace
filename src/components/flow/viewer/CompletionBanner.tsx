import { Sparkles } from 'lucide-react';

import { PALETTE } from '@app/lib/palette';

export function CompletionBanner() {
    return (
        <div
            style={{
                margin: '0 24px 24px',
                padding: '20px 24px',
                backgroundColor: '#e8faf4',
                border: '1px solid rgba(0,184,148,0.25)',
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
            <div style={{ fontSize: 14, color: '#55b89a' }}>Guten Appetit!</div>
        </div>
    );
}
