
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
        RX_ORDERS: '/orders/rx',
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
        PURCHASE_ITEMS: '/vendor/purchase-items',
        PURCHASE_ITEM_DETAILS: '/vendor/purchase-items/:id',
        INWARD_LIST: '/vendor/inward',
        INWARD_DETAILS: '/vendor/inward/:id',
        QC_LIST: '/vendor/qc',
        QC_DETAILS: '/vendor/qc/:id',
        PURCHASE_RETURNS: '/vendor/purchase-returns',
        QC_FAILED_REPORT: '/vendor/qc-failed-report',
        ALL_INWARDED_ITEMS: '/vendor/all-inwarded-items',
        PENDING_INWARD: '/vendor/pending-inward',
        QC_PENDING: '/vendor/qc-pending',
        QC_PASSED: '/vendor/qc-passed',
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
