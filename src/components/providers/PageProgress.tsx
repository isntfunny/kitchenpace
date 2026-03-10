'use client';

import dynamic from 'next/dynamic';

const AppProgressBar = dynamic(() => import('next-nprogress-bar').then((m) => m.AppProgressBar), {
    ssr: false,
});

export function PageProgress() {
    return (
        <AppProgressBar
            height="4px"
            color="#f97316"
            options={{ showSpinner: false }}
            shallowRouting
        />
    );
}
