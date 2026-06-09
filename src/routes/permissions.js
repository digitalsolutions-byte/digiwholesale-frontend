import { PATHS } from './paths';

/**
 * Centrally defined permission rules for each path.
 * rules can be:
 * - permission: a specific flag in user.permissions (e.g., 'CanCreateCustomers')
 * - allowedRoles: specific employee types that have override access (e.g., 'SUPERADMIN')
 * - allowedDepartments: department names (optional fallback)
 */
export const PERMISSIONS_CONFIG = {
    // CUSTOMER MODULE
    [PATHS.CUSTOMER.REGISTER]: {
        permission: 'CanCreateCustomers',
        allowedRoles: ['SUPERADMIN']
    },
    [PATHS.CUSTOMER.LIST]: {
        permission: 'CanManageCustomers',
        allowedRoles: ['SUPERADMIN']
    },

    // STAFF MODULE
    [PATHS.STAFF.REGISTER]: {
        permission: 'CanCreateEmployee',
        allowedRoles: ['SUPERADMIN']
    },
    [PATHS.STAFF.LIST]: {
        permission: 'CanManageEmployee',
        allowedRoles: ['SUPERADMIN']
    },

    // OPERATIONS / FINANCE
    [PATHS.OPERATIONS.FINANCE]: {
        permission: 'CanViewFinancials',
        allowedRoles: ['SUPERADMIN']
    },

    // REPORTS
    [PATHS.OPERATIONS.REPORTS]: {
        permission: 'CanViewReports',
        allowedRoles: ['SUPERADMIN']
    },

    // DRAFTS
    [PATHS.DRAFTS]: {
        allowedRoles: ['SUPERADMIN'],
        allowedDepartments: ['SALES', 'FINANCE', 'F&A', 'F&A CFO', 'ACCOUNTING', 'ADMIN']
    },

    // APPROVALS
    [PATHS.APPROVALS]: {
        allowedRoles: ['SUPERADMIN'],
        allowedDepartments: ['SALES', 'FINANCE', 'F&A', 'F&A CFO', 'ACCOUNTING', 'ADMIN']
    },

    // OPERATIONS MODULE
    [PATHS.OPERATIONS.TINT]: { allowedDepartments: ['TINTING', 'PRODUCTION'], allowedRoles: ['SUPERADMIN'] },
    [PATHS.OPERATIONS.HARD_COAT]: { allowedDepartments: ['COATING', 'PRODUCTION'], allowedRoles: ['SUPERADMIN'] },
    [PATHS.OPERATIONS.ARC]: { allowedDepartments: ['ARC', 'PRODUCTION'], allowedRoles: ['SUPERADMIN'] },
    [PATHS.OPERATIONS.QC]: { allowedDepartments: ['QC', 'QUALITY', 'PRODUCTION'], allowedRoles: ['SUPERADMIN'] },
    [PATHS.OPERATIONS.FITTING]: { allowedDepartments: ['FITTING', 'PRODUCTION'], allowedRoles: ['SUPERADMIN'] },
    [PATHS.OPERATIONS.DISPATCH]: { allowedDepartments: ['DISPATCH', 'LOGISTICS'], allowedRoles: ['SUPERADMIN'] },
    [PATHS.OPERATIONS.DMS]: { allowedRoles: ['SUPERADMIN'] },
    
    // CUSTOMER CARE / ORDERS
    [PATHS.CUSTOMER_CARE.NEW_ORDER]: { allowedDepartments: ['SALES', 'ADMIN'], allowedRoles: ['SUPERADMIN'] },
    [PATHS.CUSTOMER_CARE.ALL_ORDERS]: { allowedDepartments: ['SALES', 'ADMIN'], allowedRoles: ['SUPERADMIN'] },
    [PATHS.CUSTOMER_CARE.PENDING_ORDERS]: { allowedDepartments: ['SALES', 'ADMIN'], allowedRoles: ['SUPERADMIN'] },
    [PATHS.CUSTOMER_CARE.ORDER_STATUS]: { allowedDepartments: ['SALES', 'ADMIN'], allowedRoles: ['SUPERADMIN'] },
    [PATHS.CUSTOMER_CARE.SERVICE_GOODS]: { allowedDepartments: ['SALES', 'ADMIN'], allowedRoles: ['SUPERADMIN'] },
    [PATHS.CUSTOMER_CARE.VIEW_ORDERS]: { allowedDepartments: ['SALES', 'ADMIN'], allowedRoles: ['SUPERADMIN'] },
    [PATHS.CUSTOMER_CARE.UPGRADE_ORDERS]: { allowedDepartments: ['SALES', 'ADMIN'], allowedRoles: ['SUPERADMIN'] },
    [PATHS.CUSTOMER_CARE.UPDATE_CUSTOMERS]: { allowedDepartments: ['SALES', 'ADMIN'], allowedRoles: ['SUPERADMIN'], permission: 'CanManageCustomers' },

    // SETUP / SETTINGS
    [PATHS.STORES]: {
        permission: 'CanManageSettings',
        allowedRoles: ['SUPERADMIN'],
        allowedDepartments: ['INVENTORY', 'STORES']
    },

    // REPAIR MODULE
    [PATHS.REPAIR.ADD]: { allowedRoles: ['SUPERADMIN'], allowedDepartments: ['REPAIR', 'PRODUCTION', 'ADMIN'] },
    [PATHS.REPAIR.LIST]: { allowedRoles: ['SUPERADMIN'], allowedDepartments: ['REPAIR', 'PRODUCTION', 'ADMIN'] },

    // VENDOR MODULE
    [PATHS.VENDOR.ADD]: { allowedRoles: ['SUPERADMIN'], allowedDepartments: ['INVENTORY', 'PROCUREMENT', 'ADMIN'] },
    [PATHS.VENDOR.LIST]: { allowedRoles: ['SUPERADMIN'], allowedDepartments: ['INVENTORY', 'PROCUREMENT', 'ADMIN'] },
    [PATHS.VENDOR.ORDER]: { allowedRoles: ['SUPERADMIN'], allowedDepartments: ['INVENTORY', 'PROCUREMENT', 'ADMIN'] },

    // DETAILED REPORTS
    [PATHS.REPORTS.DAILY]: { allowedRoles: ['SUPERADMIN'], allowedDepartments: ['ADMIN', 'FINANCE', 'MANAGEMENT'] },
    [PATHS.REPORTS.MAIN]: { allowedRoles: ['SUPERADMIN'], allowedDepartments: ['ADMIN', 'FINANCE', 'MANAGEMENT'] },

    // RETURNS & EXCHANGES
    [PATHS.RETURNS.RETURN_REFUND]: { allowedRoles: ['SUPERADMIN'], allowedDepartments: ['SALES', 'ADMIN'] },
    [PATHS.RETURNS.EXCHANGE]: { allowedRoles: ['SUPERADMIN'], allowedDepartments: ['SALES', 'ADMIN'] },
};

/**
 * Helper to check if a user has access to a specific path
 */
export const hasAccess = (path, user) => {
    if (!user) return false;

    // Role override
    if (user.EmployeeType === 'SUPERADMIN') return true;

    const config = PERMISSIONS_CONFIG[path];
    if (!config) return true; // Default to public if no config (internal routes like Dashboard)

    // Check specific permission flag
    if (config.permission && user.permissions?.[config.permission]) {
        return true;
    }

    // Check department fallback if needed
    if (config.allowedDepartments && config.allowedDepartments.includes(user.Department?.name)) {
        return true;
    }

    // Check specific role override defined in config
    if (config.allowedRoles && config.allowedRoles.includes(user.EmployeeType)) {
        return true;
    }

    return false;
};
