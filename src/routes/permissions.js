/**
 * permissions.js
 *
 * Thin adapter so existing code that imports hasAccess() continues to
 * work without changes.  All logic now delegates to user.pageAccess[].
 *
 * REMOVED:
 *  - user.permissions{} checks
 *  - EmployeeType === 'SUPERADMIN' bypass
 *  - Department name string comparisons
 *  - PERMISSIONS_CONFIG map (was based on old system)
 *
 * The sidebar, route config, and App.jsx should migrate to
 * usePermissions() / ProtectedRoute.  hasAccess() is kept only as a
 * compatibility shim for any code that hasn't been migrated yet.
 */

/**
 * hasAccess(pageKey, user)
 *
 * Returns true when user.pageAccess[] contains `pageKey`.
 * No role bypass, no department check.
 *
 * @param {string} pageKey  — pageAccess key e.g. 'STAFF_LIST'
 * @param {object} user     — Redux user object
 */
export const hasAccess = (pageKey, user) => {
    if (!pageKey) return true;   // no restriction
    if (!user) return false;     // not logged in
    return Array.isArray(user.pageAccess) && user.pageAccess.includes(pageKey);
};

// Legacy export — kept so existing imports don't break at build time.
// Nothing should add new entries here; use routes/config.jsx `page` keys instead.
export const PERMISSIONS_CONFIG = {};
