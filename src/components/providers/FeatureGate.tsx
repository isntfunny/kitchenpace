'use client';

import type { ReactNode } from 'react';

import type { FeatureFlagName } from '@app/lib/flags/definitions';

import { useFeatureFlag } from './FeatureFlagsProvider';

interface FeatureGateProps {
    flag: FeatureFlagName;
    children: ReactNode;
    fallback?: ReactNode;
}

export function FeatureGate({ flag, children, fallback = null }: FeatureGateProps) {
    return useFeatureFlag(flag) ? <>{children}</> : <>{fallback}</>;
}
