'use client';

import { type ReactNode, useEffect, useRef } from 'react';

import { signOut, useSession } from '@app/lib/auth-client';

function SessionValidator({ children }: { children: ReactNode }) {
    const { data, isPending } = useSession();
    const signingOut = useRef(false);

    useEffect(() => {
        if (!isPending && data?.session && !data?.user?.id && !signingOut.current) {
            signingOut.current = true;
            console.warn('[auth] Session has no valid user ID — signing out');
            signOut({
                fetchOptions: {
                    onSuccess: () => {
                        signingOut.current = false;
                    },
                },
            });
        }
    }, [isPending, data?.session, data?.user?.id]);

    return <>{children}</>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    return <SessionValidator>{children}</SessionValidator>;
}
