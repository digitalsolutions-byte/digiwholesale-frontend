import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice';

/**
 * Helper to determine if user can edit customer details:
 * Allowed: Super Admin, Admin, Accounts/Finance Department, and Sales Head Department
 */
export const canEditCustomer = (user) => {
    if (!user) return false;

    const empType = (user.EmployeeType?.name || user.EmployeeType || user.employeeType || user.role || user.Role || '').toUpperCase();
    const dept = (user.Department?.name || user.Department || user.department?.name || user.department || '').toUpperCase();
    const subRole = (user.SubRole?.name || user.SubRole || user.subRole || user.designation || '').toUpperCase();
    const subRoles = Array.isArray(user.subRoles) ? user.subRoles : [];
    const hasSalesHeadSubRole = subRoles.some(r => (r.code || r.name || '').toUpperCase().includes('SALES_HEAD')) 
        || subRole.includes('SALES_HEAD') 
        || subRole.includes('HEAD') 
        || subRole.includes('MANAGER');

    // 1. Super Admin / Platform Owner
    if (['SUPERADMIN', 'SUPER_ADMIN', 'PLATFORM_OWNER'].includes(empType) || user.isPlatformOwner || user.isSuperAdmin) {
        return true;
    }

    // 2. Admin
    if (empType === 'ADMIN') {
        return true;
    }

    // 3. Accounts / Finance department
    if (['ACCOUNTS', 'ACCOUNTING', 'FINANCE'].includes(dept)) {
        return true;
    }

    // 4. Sales Head department
    if (dept.includes('SALES') && (['HEAD', 'MANAGER', 'SALES_HEAD'].includes(empType) || hasSalesHeadSubRole)) {
        return true;
    }

    // 5. Fallback if explicit UPDATE_CUSTOMER permission is assigned
    if (Array.isArray(user.accessPermissions) && user.accessPermissions.includes('UPDATE_CUSTOMER')) {
        return true;
    }

    return false;
};

/**
 * usePermissions
 *
 * Single source of truth for all frontend access checks.
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
    const isPlatformOwner = user?.EmployeeType === 'PLATFORM_OWNER';

    const hasPageAccess = (pageName) => {
        if (!pageName) return true;
        if (!user) return false;
        if (isSuperAdmin || isPlatformOwner) return true;
        return Array.isArray(user.pageAccess) && user.pageAccess.includes(pageName);
    };

    const hasPermission = (permissionName) => {
        if (!permissionName) return true;
        if (!user) return false;
        if (isSuperAdmin || isPlatformOwner) return true;
        return Array.isArray(user.accessPermissions) && user.accessPermissions.includes(permissionName);
    };

    const canEditCustomerDetails = canEditCustomer(user);

    return { user, isSuperAdmin, isPlatformOwner, hasPageAccess, hasPermission, canEditCustomerDetails };
};

export default usePermissions;
