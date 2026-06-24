
export const PATHS = {
    ROOT: '/',
    LOGIN: '/login',
    WELCOME: '/welcome',
    UNAUTHORIZED: '/unauthorized',

    // PASSWORD RESET
    FORGOT_PASSWORD: '/forgot-password',
    CUSTOMER_FORGOT_PASSWORD: '/customer-forgot-password',
    RESET_PASSWORD_CONFIRM: '/reset-password/confirm',

    // CUSTOMER PORTAL
    CUSTOMER_LOGIN: '/customer-login',
    CUSTOMER_PORTAL: '/customer-portal',

    // STAFF MODULE
    STAFF: {
        REGISTER: '/staff/register',
        LIST: '/staff/list',
    },

    // CUSTOMER MODULE
    CUSTOMER: {
        REGISTER: '/customer/register',
        LIST: '/customer/list',
        SHIP_TO: '/customer/ship-to',
    },

    // CUSTOMER CARE / ORDERS
    CUSTOMER_CARE: {
        NEW_ORDER: '/new-order',
        ALL_ORDERS: '/orders/all',
        PENDING_ORDERS: '/orders/pending',
        ORDER_STATUS: '/orders/status',
        SERVICE_GOODS: '/orders/service-goods',
        VIEW_ORDERS: '/orders/view',
        UPGRADE_ORDERS: '/orders/upgrade',
        UPDATE_CUSTOMERS: '/customer/list',
        EDIT_ORDER: '/order/edit/:id',
        ORDER_DETAILS: '/order/view/:id',
    },

    STORES: '/stores',
    INVENTORY: '/inventory',
    NEW_ORDER: '/new-order',
    DRAFTS: '/drafts',
    APPROVALS: '/approvals',
    CORRECTIONS: '/corrections',

    // OPERATIONS MODULE
    OPERATIONS: {
        SURFACING: '/surfacing',
        TINT: '/process-1',
        HARD_COAT: '/process-2',
        ARC: '/process-3',
        QC: '/qc',
        FITTING: '/fitting',
        DISPATCH: '/dispatch',
        DMS: '/dms',
        FINANCE: '/finance',
        REPORTS: '/reports',
    },

    // REPAIR MODULE
    REPAIR: {
        ADD: '/repair/add',
        LIST: '/repair/list',
    },

    // RETURNS & EXCHANGES
    RETURNS: {
        RETURN_REFUND: '/return-refund',
        EXCHANGE: '/exchange',
    },

    // VENDOR MODULE
    VENDOR: {
        ADD: '/vendor/add',
        LIST: '/vendor/list',
        ORDER: '/vendor/order',
    },

    // SALES MODULE
    SALES: {
        LIST: '/sales/list',
    },

    // DETAILED REPORTS
    REPORTS: {
        DAILY: '/reports/daily',
        MAIN: '/reports/main',
    }
};
