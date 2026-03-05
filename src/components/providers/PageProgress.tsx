'use client';

import { AppProgressBar } from 'next-nprogress-bar';

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
