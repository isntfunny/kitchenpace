'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { makeQueryClient } from '@app/trpc/query-client';

// react-query is only needed on routes that actually query client-side
// (currently /recipes infinite search) — scope the provider there instead of
// shipping it app-wide in the root layout.
let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
    if (typeof window === 'undefined') return makeQueryClient();
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>;
}
