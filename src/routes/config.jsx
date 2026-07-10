import Login from '../pages/Login';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPasswordConfirm from '../pages/ResetPasswordConfirm';
import Welcome from '../pages/Welcome';
import Registration from '../pages/Registration';
import RegisterCustomer from '../pages/RegisterCustomer';
import CustomerList from '../pages/CustomerList';
import ShipTo from '../pages/ShipTo';
import EmployeeList from '../pages/EmployeeList';
import DashboardWizard from '../pages/AddStore';
import OrderWizard from '../pages/OrderWizard';
import DraftsList from '../pages/DraftsList';
import ApprovalsList from '../pages/ApprovalsList';
import CorrectionsList from '../pages/CorrectionsList';
import AllOrdersList from '../pages/AllOrdersList';
import OrderDetails from '../pages/OrderDetails';
import PlaceholderPage from '../pages/PlaceholderPage';
import AuthWrapper from '../components/AuthWrapper';
import MainLayout from '../components/layout/MainLayout';

import AddRepair from '../pages/repair/AddRepair';
import RepairList from '../pages/repair/RepairList';
import ReturnRefund from '../pages/returns/ReturnRefund';
import Exchange from '../pages/returns/Exchange';
import DailyReport from '../pages/reports/DailyReport';
import MainReport from '../pages/reports/MainReport';
import AddVendor from '../pages/vendor/AddVendor';
import VendorList from '../pages/vendor/VendorList';
import VendorOrder from '../pages/vendor/VendorOrder';
import SalesList from '../pages/sales/SalesList';

import CustomerLogin from '../pages/CustomerLogin';
import CustomerLayout from '../components/layout/CustomerLayout';
import CustomerDashboard from '../pages/CustomerDashboard';

import { PATHS } from './paths';
import Inventory from '../pages/Inventory';
import Dashboard from '../components/Dashboard';
import OtherSales from '../pages/OtherSales';

export { PATHS };

/**
 * Route configuration.
 *
 * `page` — the pageAccess[] key that ProtectedRoute checks against
 *           user.pageAccess[].  If absent the route is open to all
 *           authenticated users.
 *
 * NO `requiredPermission` (old user.permissions{} system).
 * NO SUPERADMIN bypass anywhere.
 * Access is determined ONLY by user.pageAccess[].
 */

// ── Staff ─────────────────────────────────────────────────────────────────────
const STAFF_MODULE = [
    { path: 'staff/register', element: Registration, page: 'REGISTER_STAFF', props: { title: 'Register Staff' } },
    { path: 'staff/list',     element: EmployeeList, page: 'STAFF_LIST' },
];

// ── Customer ──────────────────────────────────────────────────────────────────
const CUSTOMER_MODULE = [
    { path: 'customer/register', element: RegisterCustomer, page: 'REGISTER_CUSTOMER' },
    { path: 'customer/list',     element: CustomerList,     page: 'CUSTOMER_LIST' },
    { path: 'customer/ship-to',  element: ShipTo,           page: 'SHIP_TO' },
];

// ── Orders / Customer Care ────────────────────────────────────────────────────
const CUSTOMER_CARE_MODULE = [
    { path: PATHS.CUSTOMER_CARE.NEW_ORDER,        element: OrderWizard,     page: 'NEW_ORDER' },
    { path: PATHS.CUSTOMER_CARE.ALL_ORDERS,       element: AllOrdersList,   page: 'ALL_ORDERS' },
    { path: PATHS.CUSTOMER_CARE.PENDING_ORDERS,   element: PlaceholderPage, page: 'PENDING_ORDERS', props: { title: 'Pending Orders' } },
    { path: PATHS.CUSTOMER_CARE.ORDER_STATUS,     element: PlaceholderPage, page: 'ALL_ORDERS',     props: { title: 'Order Status' } },
    { path: PATHS.CUSTOMER_CARE.SERVICE_GOODS,    element: OtherSales,      page: 'OTHER_SALES' },
    { path: PATHS.CUSTOMER_CARE.VIEW_ORDERS,      element: PlaceholderPage, page: 'ALL_ORDERS',     props: { title: 'View Orders' } },
    { path: PATHS.CUSTOMER_CARE.UPGRADE_ORDERS,   element: PlaceholderPage, page: 'ALL_ORDERS',     props: { title: 'Upgrade Orders' } },
    { path: PATHS.CUSTOMER_CARE.UPDATE_CUSTOMERS, element: CustomerList,    page: 'CUSTOMER_LIST' },
    // Edit / view a specific order — no page key: open to any authenticated
    // user who holds the URL (backend still validates ownership)
    { path: PATHS.CUSTOMER_CARE.EDIT_ORDER,    element: OrderWizard  },
    { path: PATHS.CUSTOMER_CARE.ORDER_DETAILS, element: OrderDetails },
];

// ── Operations ────────────────────────────────────────────────────────────────
const OPERATIONS_MODULE = [
    { path: 'inventory',  element: Inventory,       page: 'INVENTORY' },
    { path: 'qc',         element: PlaceholderPage, page: 'QUALITY',  props: { title: 'QC' } },
    { path: 'fitting',    element: PlaceholderPage, page: 'FITTING',  props: { title: 'Fitting' } },
    { path: 'dispatch',   element: PlaceholderPage, page: 'SHIPPING', props: { title: 'Shipping' } },
    { path: 'surfacing',  element: PlaceholderPage, page: 'INVENTORY', props: { title: 'Surfacing' } },
    { path: 'process-1',  element: PlaceholderPage, page: 'QUALITY',  props: { title: 'Process 1' } },
    { path: 'process-2',  element: PlaceholderPage, page: 'QUALITY',  props: { title: 'Process 2' } },
    { path: 'process-3',  element: PlaceholderPage, page: 'QUALITY',  props: { title: 'Process 3' } },
    { path: 'dms',        element: PlaceholderPage, page: 'INVENTORY', props: { title: 'DMS' } },
    { path: 'finance',    element: PlaceholderPage, page: 'MAIN_REPORT', props: { title: 'F&A' } },
    { path: 'reports',    element: PlaceholderPage, page: 'MAIN_REPORT', props: { title: 'Reports' } },
    { path: 'stores',     element: DashboardWizard, page: 'INVENTORY' },
    { path: 'new-order',  element: OrderWizard,     page: 'NEW_ORDER' },
];

// ── Repair ────────────────────────────────────────────────────────────────────
const REPAIR_MODULE = [
    { path: PATHS.REPAIR.ADD,  element: AddRepair,  page: 'ADD_REPAIR' },
    { path: PATHS.REPAIR.LIST, element: RepairList, page: 'REPAIR_LIST' },
];

// ── Returns & Exchanges ───────────────────────────────────────────────────────
const RETURNS_MODULE = [
    { path: PATHS.RETURNS.RETURN_REFUND, element: ReturnRefund, page: 'RETURN_REFUND' },
    { path: PATHS.RETURNS.EXCHANGE,      element: Exchange,     page: 'EXCHANGE_REQUESTS' },
];

// ── Vendor ────────────────────────────────────────────────────────────────────
const VENDOR_MODULE = [
    { path: PATHS.VENDOR.ADD,   element: AddVendor,   page: 'ADD_VENDOR' },
    { path: PATHS.VENDOR.LIST,  element: VendorList,  page: 'VENDOR_LIST' },
    { path: PATHS.VENDOR.ORDER, element: VendorOrder, page: 'VENDOR_ORDER' },
];

// ── Sales ─────────────────────────────────────────────────────────────────────
const SALES_MODULE = [
    { path: PATHS.SALES.LIST, element: SalesList, page: 'SALES_LIST' },
];

// ── Reports ───────────────────────────────────────────────────────────────────
const REPORTS_MODULE = [
    { path: PATHS.REPORTS.DAILY, element: DailyReport, page: 'DAILY_REPORT' },
    { path: PATHS.REPORTS.MAIN,  element: MainReport,  page: 'MAIN_REPORT' },
];

// ── Full config ───────────────────────────────────────────────────────────────
export const routesConfig = [
    // Public routes
    { path: PATHS.LOGIN,                    element: Login,                isPublic: true },
    { path: PATHS.CUSTOMER_LOGIN,           element: CustomerLogin,        isPublic: true },
    { path: PATHS.FORGOT_PASSWORD,          element: ForgotPassword,       isPublic: true },
    { path: PATHS.CUSTOMER_FORGOT_PASSWORD, element: ForgotPassword,       isPublic: true, props: { type: 'customer' } },
    { path: PATHS.RESET_PASSWORD_CONFIRM,   element: ResetPasswordConfirm, isPublic: true },

    // Authenticated scope
    {
        element: AuthWrapper,
        isProtected: true,
        children: [
            // Customer-facing portal — no pageAccess check needed
            {
                path: PATHS.CUSTOMER_PORTAL,
                element: CustomerLayout,
                children: [{ index: true, element: CustomerDashboard }],
            },

            // Splash / welcome — open to all authenticated users
            { path: PATHS.WELCOME, element: Welcome },

            // Main ERP shell
            {
                path: PATHS.ROOT,
                element: MainLayout,
                children: [
                    { index: true, element: Dashboard, page: 'DASHBOARD', props: { title: 'Dashboard' } },

                    { path: PATHS.DRAFTS,      element: DraftsList,      page: 'DRAFTS' },
                    { path: PATHS.APPROVALS,   element: ApprovalsList,   page: 'APPROVALS' },
                    { path: PATHS.CORRECTIONS, element: CorrectionsList, page: 'CORRECTIONS' },

                    ...STAFF_MODULE,
                    ...CUSTOMER_MODULE,
                    ...CUSTOMER_CARE_MODULE,
                    ...OPERATIONS_MODULE,
                    ...REPAIR_MODULE,
                    ...RETURNS_MODULE,
                    ...VENDOR_MODULE,
                    ...SALES_MODULE,
                    ...REPORTS_MODULE,
                ],
            },
        ],
    },
];
