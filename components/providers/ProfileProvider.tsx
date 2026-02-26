'use client';

import { createContext, useContext, ReactNode } from 'react';

export interface ProfileData {
    photoUrl: string | null;
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
    return <ProfileContext.Provider value={{ profile }}>{children}</ProfileContext.Provider>;
}
