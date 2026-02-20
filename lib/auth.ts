import { getServerSession } from 'next-auth/next';
import { signIn, signOut } from 'next-auth/react';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const auth = {
    getSession: () => getServerSession(authOptions),
    signIn,
    signOut,
};
