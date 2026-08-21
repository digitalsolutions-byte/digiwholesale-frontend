import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectCurrentUser } from '../store/slices/authSlice';
import { getMyFeatureFlags } from '../services/featureFlagService';

const defaultFlags = {
    ecomFramesSunglasses: false,
};

const FeatureFlagsContext = createContext({
    flags: defaultFlags,
    loading: false,
    refreshFlags: () => {},
});


export const FeatureFlagsProvider = ({ children }) => {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const user = useSelector(selectCurrentUser);

    const [flags, setFlags] = useState(defaultFlags);
    const [loading, setLoading] = useState(false);

    const isPlatformOwner = user?.EmployeeType === 'PLATFORM_OWNER';
    const shouldFetch = isAuthenticated && !isPlatformOwner;

    const fetchFlags = useCallback(async () => {
        if (!shouldFetch) {
            setFlags(defaultFlags);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await getMyFeatureFlags();
            if (res?.success && res?.data?.featureFlags) {
                setFlags({ ...defaultFlags, ...res.data.featureFlags });
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
