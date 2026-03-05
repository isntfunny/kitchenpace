'use client';

import { signOut } from 'next-auth/react';

export function handleSignIn() {
    window.location.href = '/auth/signin';
}

export async function handleSignOut() {
    await signOut({ redirect: true, callbackUrl: '/' });
}
