'use client';

import type { Session } from 'next-auth';
import { signOut, SessionProvider, useSession } from 'next-auth/react';
import { ReactNode, useEffect, useRef } from 'react';

interface AuthProviderProps {
    children: ReactNode;
    session?: Session | null;
}

function SessionValidator({ children }: { children: ReactNode }) {
    const { data: session, status } = useSession();
    const signingOut = useRef(false);

    useEffect(() => {
        if (status === 'authenticated' && !session?.user?.id && !signingOut.current) {
            signingOut.current = true;
            console.warn('[auth] Session has no valid user ID — signing out');
            signOut({ redirect: false }).then(() => {
                signingOut.current = false;
            });
        }
    }, [status, session?.user?.id]);

    return <>{children}</>;
}

export function AuthProvider({ children, session }: AuthProviderProps) {
    return (
        <SessionProvider session={session}>
            <SessionValidator>{children}</SessionValidator>
        </SessionProvider>
    );
}
