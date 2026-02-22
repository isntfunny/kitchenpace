'use server';

import { signOut } from 'next-auth/react';
import { redirect } from 'next/navigation';

export async function handleSignIn() {
    redirect('/auth/signin');
}

export async function handleSignOut() {
    await signOut({ redirect: true, callbackUrl: '/' });
}
