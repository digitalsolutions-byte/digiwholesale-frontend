import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectIsAuthenticated, selectCurrentUser, selectCurrentTenant, logOut } from '../store/slices/authSlice';
import SubscriptionExpiredBarrier from './subscription/SubscriptionExpiredBarrier';

/**
 * AuthWrapper Component
 * 
 * Protects child routes by checking authentication status.
 * If not authenticated, redirects to /login.
 * If authenticated but workspace subscription has expired, renders SubscriptionExpiredBarrier
 * completely preventing access to any wholesaler operations or panel views.
 */
const AuthWrapper = () => {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const user = useSelector(selectCurrentUser);
    const tenant = useSelector(selectCurrentTenant);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Check workspace subscription expiry (PLATFORM_OWNER is exempt)
    const isPlatformOwner = user?.EmployeeType === 'PLATFORM_OWNER';
    if (!isPlatformOwner && tenant) {
        const rawExpiry = tenant.storeInformation?.expiryDate || tenant.subscription?.expiresAt;
        if (rawExpiry) {
            const expDate = new Date(rawExpiry);
            if (!isNaN(expDate.getTime()) && new Date() > expDate) {
                return (
                    <SubscriptionExpiredBarrier
                        tenant={tenant}
                        user={user}
                        onLogout={() => dispatch(logOut())}
                    />
                );
            }
        }
    }

    return <Outlet />;
};

export default AuthWrapper;
