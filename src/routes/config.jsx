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

import AuthLayout from '../components/layout/AuthLayout';
import Dashboard from '../components/Dashboard';
import OtherSales from '../pages/OtherSales';

export { PATHS };

/**
 * Route Modules - Grouped for clear editability
 */

const STAFF_MODULE = [
    {
        path: 'staff/register',
        element: Registration,
        props: { title: 'Register Employee' },
        requiredPermission: 'CanCreateEmployee'
    },
    {
        path: 'staff/list',
        element: EmployeeList,
        requiredPermission: 'CanManageEmployee'
    }
];

const CUSTOMER_MODULE = [
    {
        path: 'customer/register',
        element: RegisterCustomer,
        requiredPermission: 'CanCreateCustomers'
    },
    {
        path: 'customer/list',
        element: CustomerList,
        requiredPermission: 'CanManageCustomers'
    },
    {
        path: 'customer/ship-to',
        element: ShipTo,
        requiredPermission: 'CanManageCustomers'
    }
];

const CUSTOMER_CARE_MODULE = [
    { path: PATHS.CUSTOMER_CARE.NEW_ORDER, element: OrderWizard },
    { path: PATHS.CUSTOMER_CARE.ALL_ORDERS, element: AllOrdersList },
    { path: PATHS.CUSTOMER_CARE.PENDING_ORDERS, element: PlaceholderPage, props: { title: 'Pending Orders' } },
    { path: PATHS.CUSTOMER_CARE.ORDER_STATUS, element: PlaceholderPage, props: { title: 'Order Status' } },
    { path: PATHS.CUSTOMER_CARE.SERVICE_GOODS, element: OtherSales },
    { path: PATHS.CUSTOMER_CARE.VIEW_ORDERS, element: PlaceholderPage, props: { title: 'View Orders' } },
    { path: PATHS.CUSTOMER_CARE.UPGRADE_ORDERS, element: PlaceholderPage, props: { title: 'Upgrade Orders' } },
    { path: PATHS.CUSTOMER_CARE.UPDATE_CUSTOMERS, element: CustomerList, requiredPermission: 'CanManageCustomers' },
    { path: PATHS.CUSTOMER_CARE.EDIT_ORDER, element: OrderWizard },
    { path: PATHS.CUSTOMER_CARE.ORDER_DETAILS, element: OrderDetails },
];

const OPERATIONS_MODULE = [
    { path: 'surfacing', element: PlaceholderPage, props: { title: 'Surfacing' } },
    { path: 'inventory', element: Inventory, props: { title: 'Inventory' } },
    { path: 'process-1', element: PlaceholderPage, props: { title: 'Process 1' } },
    { path: 'process-2', element: PlaceholderPage, props: { title: 'Process 2' } },
    { path: 'process-3', element: PlaceholderPage, props: { title: 'Process 3' } },
    { path: 'qc', element: PlaceholderPage, props: { title: 'QC' } },
    { path: 'fitting', element: PlaceholderPage, props: { title: 'Fitting' } },
    { path: 'dispatch', element: PlaceholderPage, props: { title: 'Dispatch' } },
    { path: 'dms', element: PlaceholderPage, props: { title: 'DMS' } },
    { path: 'finance', element: PlaceholderPage, props: { title: 'F&A' }, requiredPermission: 'CanViewFinancials' },
    { path: 'reports', element: PlaceholderPage, props: { title: 'Reports' }, requiredPermission: 'CanViewReports' },
    { path: 'stores', element: DashboardWizard, requiredPermission: 'CanManageProducts' },
    { path: 'new-order', element: OrderWizard },
];

const REPAIR_MODULE = [
    { path: PATHS.REPAIR.ADD, element: AddRepair },
    { path: PATHS.REPAIR.LIST, element: RepairList }
];

const RETURNS_MODULE = [
    { path: PATHS.RETURNS.RETURN_REFUND, element: ReturnRefund },
    { path: PATHS.RETURNS.EXCHANGE, element: Exchange }
];

const VENDOR_MODULE = [
    { path: PATHS.VENDOR.ADD, element: AddVendor },
    { path: PATHS.VENDOR.LIST, element: VendorList },
    { path: PATHS.VENDOR.ORDER, element: VendorOrder }
];

const SALES_MODULE = [
    { path: PATHS.SALES.LIST, element: SalesList, requiredPermission: 'CanManageSales' }
];

const REPORTS_MODULE = [
    { path: PATHS.REPORTS.DAILY, element: DailyReport },
    { path: PATHS.REPORTS.MAIN, element: MainReport }
];

/**
 * Combined Routes Configuration
 */
export const routesConfig = [
    {
        path: PATHS.LOGIN,
        element: Login,
        isPublic: true
    },
    {
        path: PATHS.CUSTOMER_LOGIN,
        element: CustomerLogin,
        isPublic: true
    },
    {
        path: PATHS.FORGOT_PASSWORD,
        element: ForgotPassword,
        isPublic: true
    },
    {
        path: PATHS.CUSTOMER_FORGOT_PASSWORD,
        element: ForgotPassword,
        props: { type: 'customer' },
        isPublic: true
    },
    {
        path: PATHS.RESET_PASSWORD_CONFIRM,
        element: ResetPasswordConfirm,
        isPublic: true
    },
    {
        element: AuthWrapper,
        isProtected: true,
        children: [
            {
                path: PATHS.CUSTOMER_PORTAL,
                element: CustomerLayout,
                children: [
                    { index: true, element: CustomerDashboard }
                ]
            },
            {
                path: PATHS.WELCOME,
                element: Welcome
            },
            {
                path: PATHS.ROOT,
                element: MainLayout,
                children: [
                    {
                        index: true,
                        element: Dashboard,
                        props: { title: 'Dashboard' }
                    },
                    {
                        path: PATHS.DRAFTS,
                        element: DraftsList
                    },
                    {
                        path: PATHS.APPROVALS,
                        element: ApprovalsList,
                        requiredPermission: 'CanManageCustomers'
                    },
                    {
                        path: PATHS.CORRECTIONS,
                        element: CorrectionsList,
                        requiredPermission: 'CanCreateCustomers'
                    },
                    ...STAFF_MODULE,
                    ...CUSTOMER_MODULE,
                    ...CUSTOMER_CARE_MODULE,
                    ...OPERATIONS_MODULE,
                    ...REPAIR_MODULE,
                    ...RETURNS_MODULE,
                    ...VENDOR_MODULE,
                    ...SALES_MODULE,
                    ...REPORTS_MODULE
                ]
            }
        ]
    }
];


