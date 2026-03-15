'use client';

import { signOut } from '@app/lib/auth-client';

export function handleSignIn() {
    window.location.href = '/auth/signin';
}

export async function handleSignOut() {
    await signOut({
        fetchOptions: {
            onSuccess: () => {
                window.location.href = '/';
            },
        },
    });
}
