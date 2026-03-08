'use client';

/**
 * Google Cast Web Receiver — loaded on Chromecast / Nest Hub.
 *
 * Receives only the recipe slug from the phone, then loads
 * `/recipe/[slug]/mobile` in a fullscreen iframe. All interaction
 * (swipe, tap, timers) is handled by the mobile page itself.
 *
 * Touch-capable Cast devices (Google Nest Hub etc.):
 *  The Cast framework injects a <touch-controls> overlay that blocks
 *  all pointer/touch events. We apply the Home Assistant hack: remove
 *  the overlay after ctx.start() and restore overflow-y so the iframe
 *  can receive touch events natively.
 */

import { useEffect, useState } from 'react';

import { CAST_NAMESPACE } from '@app/hooks/useCast';
import type { CastMessage } from '@app/hooks/useCast';
import { PALETTE } from '@app/lib/palette';

// ── Cast Receiver SDK types ─────────────────────────────────────────────
interface CastReceiverOptions {
    touchScreenOptimizedApp?: boolean;
    maxInactivity?: number;
}

interface CastReceiverContext {
    start: (options?: CastReceiverOptions) => void;
    addCustomMessageListener: (ns: string, handler: (ev: { data: string }) => void) => void;
    getDeviceCapabilities: () => { touch_input_supported?: boolean } | null;
}

interface CastReceiverFramework {
    CastReceiverContext: { getInstance: () => CastReceiverContext };
}
// ───────────────────────────────────────────────────────────────────────

export default function CastReceiverPage() {
    const [recipeUrl, setRecipeUrl] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const script = document.createElement('script');
        script.src = '//www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js';
        script.onload = () => {
            // The receiver SDK exposes CastReceiverContext on window.cast.framework.
            // We access it via an untyped cast to avoid conflicting with the sender SDK's
            // global Window augmentation (which declares a different shape for window.cast).
             
            const framework = (window as any).cast?.framework as CastReceiverFramework | undefined;
            const ctx = framework?.CastReceiverContext.getInstance();
            if (!ctx) return;

            ctx.addCustomMessageListener(CAST_NAMESPACE, ({ data }: { data: string }) => {
                let msg: CastMessage;
                try { msg = JSON.parse(data) as CastMessage; } catch { return; }

                if (msg.type === 'LOAD_RECIPE') {
                    setRecipeUrl(`/recipe/${msg.slug}/mobile`);
                }
            });

            ctx.start({ touchScreenOptimizedApp: true, maxInactivity: 3600 });

            // ── Home Assistant touch hack ─────────────────────────────
            // The Cast framework injects a <touch-controls> element that
            // intercepts all pointer/touch events on Nest Hub etc.
            // Remove it and restore scrolling so the iframe works.
            const caps = ctx.getDeviceCapabilities?.();
            if (caps?.touch_input_supported) {
                const breakFree = () => {
                    document.body.querySelector('touch-controls')?.remove();
                    document.body.setAttribute('style', 'overflow-y: auto !important');
                };
                breakFree();
                setTimeout(breakFree, 500);
                setTimeout(breakFree, 1500);
            }
        };
        document.head.appendChild(script);
    }, []);

    // ── Waiting screen ──────────────────────────────────────────────────
    if (!recipeUrl) {
        return (
            <div style={{
                minHeight: '100vh',
                background: '#111',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
                fontFamily: '-apple-system, Inter, sans-serif',
            }}>
                <div style={{
                    width: 88, height: 88, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${PALETTE.orange} 0%, #f8b500 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40,
                }}>
                    🍳
                </div>
                <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>
                    KüchenTakt
                </div>
                <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.38)' }}>
                    Warte auf Rezept vom Sender…
                </div>
                <div style={{ display: 'flex', gap: 7, marginTop: 6 }}>
                    {[0, 1, 2].map((i) => (
                        <div key={i} style={{
                            width: 9, height: 9, borderRadius: '50%',
                            backgroundColor: PALETTE.orange,
                            animation: `w 1.4s ease-in-out ${i * 0.22}s infinite`,
                            opacity: 0.6,
                        }} />
                    ))}
                </div>
                <style>{`
                    @keyframes w{0%,80%,100%{transform:scale(.65);opacity:.35}40%{transform:scale(1.1);opacity:1}}
                    *{box-sizing:border-box;margin:0;padding:0}
                    body{background:#111;overflow:hidden}
                `}</style>
            </div>
        );
    }

    // ── Recipe loaded — fullscreen iframe to /recipe/[slug]/mobile ────
    return (
        <>
            <style>{`*{margin:0;padding:0}body{overflow:hidden}`}</style>
            <iframe
                src={recipeUrl}
                title="Rezept"
                style={{
                    width: '100vw',
                    height: '100vh',
                    border: 'none',
                }}
                allow="autoplay"
            />
        </>
    );
}
