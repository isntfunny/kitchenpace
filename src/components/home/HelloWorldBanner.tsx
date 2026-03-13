'use client';

import { Sparkles } from 'lucide-react';

import { useFeatureFlag } from '@app/components/providers/FeatureFlagsProvider';
import { css } from 'styled-system/css';

export function HelloWorldBanner() {
    const isEnabled = useFeatureFlag('helloWorldBanner');

    if (!isEnabled) {
        return null;
    }

    return (
        <section className={bannerShellClass}>
            <div className={bannerGlowClass} />
            <div className={bannerContentClass}>
                <div className={bannerEyebrowClass}>
                    <Sparkles size={14} />
                    Feature Flag Aktiv
                </div>
                <h2 className={bannerTitleClass}>Hello World</h2>
                <p className={bannerTextClass}>
                    Dieser Banner wird nur angezeigt, wenn der Feature Switch aktiv ist.
                </p>
            </div>
        </section>
    );
}

const bannerShellClass = css({
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '2xl',
    border: '1px solid',
    borderColor: 'rgba(249,115,22,0.22)',
    background:
        'linear-gradient(135deg, rgba(255,248,235,0.98) 0%, rgba(255,232,214,0.96) 48%, rgba(255,245,238,0.98) 100%)',
    boxShadow: '0 16px 40px rgba(180, 83, 9, 0.12)',
    _dark: {
        background:
            'linear-gradient(135deg, rgba(56,30,12,0.9) 0%, rgba(120,53,15,0.82) 52%, rgba(41,24,10,0.92) 100%)',
        borderColor: 'rgba(251,146,60,0.24)',
        boxShadow: '0 18px 44px rgba(0, 0, 0, 0.28)',
    },
});

const bannerGlowClass = css({
    position: 'absolute',
    inset: 'auto -10% -45% auto',
    width: '220px',
    height: '220px',
    borderRadius: 'full',
    background: 'radial-gradient(circle, rgba(251,146,60,0.28) 0%, rgba(251,146,60,0) 70%)',
});

const bannerContentClass = css({
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2',
    px: { base: '4', md: '5' },
    py: { base: '4', md: '5' },
});

const bannerEyebrowClass = css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1.5',
    width: 'fit-content',
    px: '2.5',
    py: '1',
    borderRadius: 'full',
    background: 'rgba(255,255,255,0.6)',
    color: 'palette.orange',
    fontSize: 'xs',
    fontWeight: '700',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    _dark: {
        background: 'rgba(255,255,255,0.08)',
    },
});

const bannerTitleClass = css({
    fontFamily: 'heading',
    fontSize: { base: '2xl', md: '3xl' },
    lineHeight: '1.05',
    fontWeight: '700',
    color: 'text',
});

const bannerTextClass = css({
    maxW: '48rem',
    fontSize: { base: 'sm', md: 'md' },
    color: 'text.muted',
    lineHeight: '1.6',
});
