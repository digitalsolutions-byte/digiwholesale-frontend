import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice';
import { PATHS } from '../routes/paths';

/**
 * ProtectedRoute
 *
 * Hard route-level gate. Reads user directly from Redux.
 *
 * Decision tree:
 *  1. No user in store              → /login
 *  2. No `page` prop on route       → open route, allow any authenticated user
 *  3. user.EmployeeType === 'SUPERADMIN' → allow (full access)
 *  4. user.pageAccess[] includes page   → allow
 *  5. otherwise                     → /unauthorized
 *
 * Usage:
 *   <ProtectedRoute page="STAFF_LIST">
 *     <EmployeeList />
 *   </ProtectedRoute>
 */
const ProtectedRoute = ({ page, children }) => {
    const user = useSelector(selectCurrentUser);

    const isSuperAdmin = user?.EmployeeType === 'SUPERADMIN';
    const isPlatformOwner = user?.EmployeeType === 'PLATFORM_OWNER';
    const hasFullBypass = isSuperAdmin || isPlatformOwner;

    // ── DEV diagnostic ─────────────────────────────────────────────────────
    if (import.meta.env.DEV) {
        const granted = !page
            ? true
            : !user
            ? false
            : hasFullBypass
            ? true
            : Array.isArray(user.pageAccess) && user.pageAccess.includes(page);

        console.groupCollapsed(
            `%c[ProtectedRoute] ${page ?? '(open)'}  →  ${granted ? '✅ ALLOW' : '🚫 DENY'}`,
            `color:${granted ? '#10b981' : '#ef4444'};font-weight:bold`
        );
        console.log('Required page     :', page ?? '— none (open route)');
        console.log('EmployeeType      :', user?.EmployeeType ?? 'NOT LOGGED IN');
        console.log('Admin/Owner bypass:', hasFullBypass ? 'YES — full access' : 'no');
        console.log('pageAccess[]      :',
            hasFullBypass
                ? '— skipped (SUPERADMIN / PLATFORM_OWNER)'
                : user?.pageAccess?.length
                ? user.pageAccess.join(', ')
                : user
                ? '⚠️  EMPTY — check login API response includes pageAccess'
                : '⚠️  NO USER IN STORE'
        );
        console.groupEnd();
    }
    // ───────────────────────────────────────────────────────────────────────

    // 1. Not logged in
    if (!user) return <Navigate to={PATHS.LOGIN} replace />;

    // 2. TENANTS page (Wholesaler Tenant Management) — strictly PLATFORM_OWNER only!
    if (page === 'TENANTS') {
        return isPlatformOwner ? children : <Navigate to={PATHS.UNAUTHORIZED} replace />;
    }

    // 3. No page restriction on this route
    if (!page) return children;

    // 4. SUPERADMIN or PLATFORM_OWNER — unrestricted access to all standard pages
    if (hasFullBypass) return children;

    // 5. Check pageAccess[]
    const allowed = Array.isArray(user.pageAccess) && user.pageAccess.includes(page);
    return allowed ? children : <Navigate to={PATHS.UNAUTHORIZED} replace />;
};

export default ProtectedRoute;
