import usePermissions from '../hooks/usePermissions';

/**
 * PermissionWrapper
 *
 * Hides children when the user lacks the required action-level permission.
 * Use around buttons, menu items, table actions — anything interactive.
 *
 * Access rules:
 *   - SUPERADMIN always sees everything
 *   - Everyone else: user.accessPermissions[] must contain the key
 *
 * Props:
 *   permission  — single accessPermissions key e.g. "DELETE_CUSTOMER"
 *   anyOf       — array: renders if user has ANY of these keys
 *   fallback    — optional JSX rendered when access is denied (default: null)
 *
 * Usage:
 *   <PermissionWrapper permission="ADD_CUSTOMER">
 *     <button>Add Customer</button>
 *   </PermissionWrapper>
 *
 *   <PermissionWrapper anyOf={['UPDATE_ORDER', 'DELETE_ORDER']}>
 *     <ActionsMenu />
 *   </PermissionWrapper>
 */
const PermissionWrapper = ({ permission, anyOf, children, fallback = null }) => {
    const { hasPermission } = usePermissions();

    let allowed = false;

    if (anyOf?.length > 0) {
        allowed = anyOf.some(p => hasPermission(p));
    } else if (permission) {
        allowed = hasPermission(permission);
    } else {
        allowed = true; // no restriction specified — always show
    }

    return allowed ? children : fallback;
};

export default PermissionWrapper;
