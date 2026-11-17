export const hasAccess = (pageKey, user) => {
    if (!pageKey) return true;
    if (!user) return false;
    if (user.EmployeeType === 'SUPERADMIN' || user.EmployeeType === 'PLATFORM_OWNER') return true;
    return Array.isArray(user.pageAccess) && user.pageAccess.includes(pageKey);
};

export const PERMISSIONS_CONFIG = {};
