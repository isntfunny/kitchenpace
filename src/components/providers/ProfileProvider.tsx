'use client';

import { createContext, useContext, ReactNode, useEffect, useState } from 'react';

import { useSession } from '@app/lib/auth-client';

export interface ProfileData {
    photoKey: string | null;
    nickname: string | null;
}

interface ProfileContextValue {
    profile: ProfileData | null;
}

const ProfileContext = createContext<ProfileContextValue>({
    profile: null,
});

export function useProfile() {
    return useContext(ProfileContext);
}

interface ProfileProviderProps {
    children: ReactNode;
    profile: ProfileData | null;
}

export function ProfileProvider({ children, profile }: ProfileProviderProps) {
    const { data, isPending } = useSession();
    const [currentProfile, setCurrentProfile] = useState<ProfileData | null>(profile);

    useEffect(() => {
        if (isPending) return;

        let cancelled = false;

        if (!data?.user?.id) {
            setCurrentProfile(null);
            return;
        }

        const loadProfile = async () => {
            try {
                const response = await fetch('/api/auth/profile', { credentials: 'same-origin' });
                if (!response.ok) throw new Error(`Profile request failed: ${response.status}`);
                const payload = (await response.json()) as { profile: ProfileData | null };
                if (!cancelled) setCurrentProfile(payload.profile);
            } catch (error) {
                console.error('Failed to load header profile', error);
                if (!cancelled) setCurrentProfile(null);
            }
        };

        void loadProfile();

        return () => {
            cancelled = true;
        };
    }, [data?.user?.id, isPending]);

    return (
        <ProfileContext.Provider value={{ profile: currentProfile }}>
            {children}
        </ProfileContext.Provider>
    );
}
