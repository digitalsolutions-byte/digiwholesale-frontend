import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectCurrentTenant } from '../store/slices/authSlice';

/**
 * useSubscriptionExpiry Hook
 * Single source of truth for plan expiry metadata, urgency levels, warning flags,
 * and aesthetic themes across the wholesaler user dashboard and application layout.
 */
export function useSubscriptionExpiry() {
    const user = useSelector(selectCurrentUser);
    const tenant = useSelector(selectCurrentTenant);

    return useMemo(() => {
        // Platform owner has no subscription expiry on their own platform control panel
        const isPlatformOwner = user?.EmployeeType === 'PLATFORM_OWNER';
        const isCustomer = user?.EmployeeType === 'CUSTOMER' || user?.AccountType === 'CUSTOMER';

        if (isPlatformOwner || isCustomer) {
            return {
                hasExpiry: false,
                isPlatformOwner,
                isCustomer,
                showBanner: false,
                showRedBorder: false,
                isCriticalRed: false,
                isWarningYellow: false,
                daysRemaining: null,
                formattedDate: '',
                status: 'NOT_APPLICABLE'
            };
        }

        // Determine expiry date:
        // 1. tenant.storeInformation.expiryDate
        // 2. tenant.subscription.expiresAt
        // 3. (if demo mode) user.demoExpiry || tenant.demoExpiry || tenant.featureFlags?.demoExpiry
        const rawDate = tenant?.storeInformation?.expiryDate ||
                        tenant?.subscription?.expiresAt ||
                        (user?.demoExpiry || tenant?.demoExpiry || tenant?.featureFlags?.demoExpiry);

        if (!rawDate) {
            return {
                hasExpiry: false,
                isPlatformOwner: false,
                isCustomer: false,
                showBanner: false,
                showRedBorder: false,
                isCriticalRed: false,
                isWarningYellow: false,
                daysRemaining: null,
                formattedDate: 'No Expiry Set',
                status: 'NO_EXPIRY'
            };
        }

        const expDate = new Date(rawDate);
        if (isNaN(expDate.getTime())) {
            return {
                hasExpiry: false,
                isPlatformOwner: false,
                isCustomer: false,
                showBanner: false,
                showRedBorder: false,
                isCriticalRed: false,
                isWarningYellow: false,
                daysRemaining: null,
                formattedDate: 'Invalid Date',
                status: 'INVALID_DATE'
            };
        }

        const now = new Date();
        const diffTime = expDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const formattedDate = expDate.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

        const storeName = tenant?.storeInformation?.storeName || tenant?.storeName || 'Wholesaler Workspace';
        const tenantId = tenant?.tenantId || '';
        const planType = (tenant?.subscription?.planType || 'PRO').toUpperCase();

        const isExpired = daysRemaining < 0;
        const isCritical = daysRemaining >= 0 && daysRemaining <= 7;
        const isWarning = daysRemaining > 7 && daysRemaining <= 15;
        const isSafe = daysRemaining > 15;

        // User requested:
        // - 15 days till 7 days (8-15 days): Yellow warning banner ("plan is about to expire, please renew for uninterrupted experience")
        // - <= 7 days or expired: Red warning banner according to time + red border around dashboard and container
        const isWarningYellow = isWarning;
        const isCriticalRed = isCritical || isExpired;
        const showBanner = isWarningYellow || isCriticalRed;
        const showRedBorder = isCriticalRed;

        let status = 'SAFE';
        let urgency = 'safe';
        let alertTitle = '';
        let alertMessage = '';
        let badgeClass = '';

        if (isExpired) {
            status = 'EXPIRED';
            urgency = 'critical';
            const absDays = Math.abs(daysRemaining);
            alertTitle = 'Subscription Expired';
            alertMessage = `Your DigiOptics plan expired ${absDays} day${absDays === 1 ? '' : 's'} ago on ${formattedDate}. Please renew immediately to prevent service interruption.`;
            badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
        } else if (isCritical) {
            status = 'CRITICAL';
            urgency = 'critical';
            alertTitle = daysRemaining === 0 ? 'Plan Expires Today' : `Plan Expiring in ${daysRemaining} Day${daysRemaining === 1 ? '' : 's'}`;
            alertMessage = `Urgent: Your DigiOptics plan expires on ${formattedDate} (${daysRemaining === 0 ? 'today' : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`}). Immediate renewal required to prevent service cutoff.`;
            badgeClass = 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
        } else if (isWarning) {
            status = 'WARNING';
            urgency = 'warning';
            alertTitle = `Plan Expiring in ${daysRemaining} Days`;
            alertMessage = `Your plan is about to expire in ${daysRemaining} days (${formattedDate}). Please renew for an uninterrupted experience.`;
            badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
        } else {
            status = 'SAFE';
            urgency = 'safe';
            alertTitle = 'Plan Active';
            alertMessage = `Your plan is active with ${daysRemaining} days remaining (${formattedDate}).`;
            badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        }

        return {
            hasExpiry: true,
            rawDate,
            expiryDate: expDate,
            daysRemaining,
            formattedDate,
            storeName,
            tenantId,
            planType,
            status,
            urgency,
            isExpired,
            isCritical,
            isWarning,
            isSafe,
            isWarningYellow,
            isCriticalRed,
            showBanner,
            showRedBorder,
            alertTitle,
            alertMessage,
            badgeClass
        };
    }, [user, tenant]);
}

export default useSubscriptionExpiry;
