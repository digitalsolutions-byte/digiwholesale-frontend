/**
 * PermissionGuard — backward-compatibility shim.
 *
 * The old system checked user.permissions?.[requiredPermission] (boolean flags).
 * The new system uses user.pageAccess[] via ProtectedRoute.
 *
 * Any remaining code that still imports PermissionGuard will silently
 * pass through without blocking — the real gate is ProtectedRoute which
 * is applied at the route level in App.jsx via the `page` key in config.
 *
 * Do NOT add new usages of PermissionGuard.  Use ProtectedRoute instead.
 */
const PermissionGuard = ({ children }) => children;

export default PermissionGuard;
