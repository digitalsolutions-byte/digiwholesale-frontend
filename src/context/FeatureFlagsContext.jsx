import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectCurrentUser } from '../store/slices/authSlice';
import { getMyFeatureFlags } from '../services/featureFlagService';

const defaultFlags = {
    ecomFramesSunglasses: false,
};

const getInitialFlags = () => {
    try {
        const cached = localStorage.getItem('featureFlags');
        if (cached) {
            return { ...defaultFlags, ...JSON.parse(cached) };
        }
    } catch (e) {
        console.error('Failed to parse cached feature flags:', e);
    }
    return defaultFlags;
};

const FeatureFlagsContext = createContext({
    flags: defaultFlags,
    loading: false,
    refreshFlags: () => {},
});

export const FeatureFlagsProvider = ({ children }) => {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const user = useSelector(selectCurrentUser);

    const isPlatformOwner = user?.EmployeeType === 'PLATFORM_OWNER';
    const shouldFetch = isAuthenticated && !isPlatformOwner;

    const [flags, setFlags] = useState(() => getInitialFlags());
    const [loading, setLoading] = useState(() => {
        const hasCached = !!localStorage.getItem('featureFlags');
        return shouldFetch && !hasCached;
    });

    const fetchFlags = useCallback(async () => {
        if (!shouldFetch) {
            setFlags(defaultFlags);
            setLoading(false);
            try {
                localStorage.removeItem('featureFlags');
            } catch (e) {}
            return;
        }

        if (!localStorage.getItem('featureFlags')) {
            setLoading(true);
        }

        try {
            const res = await getMyFeatureFlags();
            if (res?.success && res?.data?.featureFlags) {
                const newFlags = { ...defaultFlags, ...res.data.featureFlags };
                setFlags(newFlags);
                try {
                    localStorage.setItem('featureFlags', JSON.stringify(newFlags));
                } catch (e) {}
            } else {
                setFlags(defaultFlags);
            }
        } catch {
            setFlags(defaultFlags);
        } finally {
            setLoading(false);
        }
    }, [shouldFetch]);

    useEffect(() => {
        fetchFlags();
    }, [fetchFlags]);

    return (
        <FeatureFlagsContext.Provider value={{ flags, loading, refreshFlags: fetchFlags }}>
            {children}
        </FeatureFlagsContext.Provider>
    );
};

export const useFeatureFlags = () => useContext(FeatureFlagsContext);

export default FeatureFlagsContext;
