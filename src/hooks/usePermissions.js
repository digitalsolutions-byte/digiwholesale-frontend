import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice';

/**
 * usePermissions
 *
 * Single source of truth for all frontend access checks.
 *
 * Access rules:
 *  - EmployeeType === 'SUPERADMIN'  →  full access to everything, always
 *  - Everyone else:
 *      user.pageAccess[]        controls page / route visibility
 *      user.accessPermissions[] controls button / action visibility
 *  - user.permissions{}  is NEVER read (old system, ignore completely)
 */
const usePermissions = () => {
    const reduxUser = useSelector(selectCurrentUser);

    // Fallback: read from localStorage on the very first render before
    // Redux has re-hydrated from the persisted store.
    const user = reduxUser ?? (() => {
        try { return JSON.parse(localStorage.getItem('user')); }
        catch { return null; }
    })();

    const isSuperAdmin = user?.EmployeeType === 'SUPERADMIN';

    /**
     * hasPageAccess('STAFF_LIST')
     *
     * Returns true when:
     *   - no key is provided (open route), OR
     *   - user is SUPERADMIN, OR
     *   - user.pageAccess[] contains the key
     */
    const hasPageAccess = (pageName) => {
        if (!pageName) return true;       // no restriction — open route
        if (!user) return false;          // not logged in
        if (isSuperAdmin) return true;    // SUPERADMIN: full access
        return Array.isArray(user.pageAccess) && user.pageAccess.includes(pageName);
    };

    /**
     * hasPermission('DELETE_CUSTOMER')
     *
     * Returns true when:
     *   - no key is provided, OR
     *   - user is SUPERADMIN, OR
     *   - user.accessPermissions[] contains the key
     *
     * Backend validates independently — this only controls UI visibility.
     */
    const hasPermission = (permissionName) => {
        if (!permissionName) return true; // no restriction
        if (!user) return false;
        if (isSuperAdmin) return true;    // SUPERADMIN: full access
        return Array.isArray(user.accessPermissions) && user.accessPermissions.includes(permissionName);
    };

    return { user, isSuperAdmin, hasPageAccess, hasPermission };
};

export default usePermissions;
