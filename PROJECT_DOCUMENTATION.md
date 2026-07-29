# DigiOptics Wholesale ERP System — Technical Documentation

## Executive Overview
The **DigiOptics Wholesale ERP System** is an end-to-end B2B enterprise multi-tenant SaaS application designed for managing optical goods distribution, customer onboarding, order fulfillment, purchase inwarding, quality checks, return/exchange processing, vendor management, and platform-wide wholesaler workspace administration.

---

## 1. System Architecture & Core Mechanics

### Tech Stack & Foundations
- **Frontend Framework**: React 18, Vite
- **State Management**: Redux Toolkit (auth, user session)
- **UI Components & Styling**: Vanilla CSS, Tailwind CSS, Material UI (MUI Date Pickers & Inputs), Iconify icons
- **Form Management & Validation**: Formik, Yup
- **HTTP Client**: Axios with custom interceptors (`src/services/apiInstance.js`)

### Multi-Tenant Architecture & Roles (RBAC)
- **Multi-Tenant Data Isolation**: Every wholesaler onboarded onto the system is treated as an independent **tenant** identified by a unique `tenantId` (e.g. `TEN-DIGOPT-A3X7K`). All products, customers, orders, employees, settings, brands, categories, and resources belong exclusively to that tenant.
- **Allowed Roles**:
  - `PLATFORM_OWNER`: Platform Super-Administrator managing all tenant wholesalers. Has full access to tenant management APIs (`/api/tenants`).
  - `SUPERADMIN`: Wholesaler business owner with complete access to all pages and permissions within their tenant workspace.
  - `ADMIN` / `SALES_HEAD`: Regional or team leads managing orders, customers, and approvals.
  - `STAFF`: Operational users with page-level & permission-level access control.
  - `VENDOR`: External vendors processing purchase requisitions.

---

## 2. Comprehensive Business Flows

```
  ┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │                                    0. SAAS TENANT MANAGEMENT                                           │
  │  Platform Owner Login ──> Register Wholesaler Tenant ──> Auto-Create SUPERADMIN ──> Tenant Workspace    │
  └────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                       │
                                                       ▼
                          ┌─────────────────────────────────────────────────────────┐
                          │                1. CUSTOMER ONBOARDING                   │
                          │  Form Wizard ──> Approval Queue ──> Account Activation │
                          └─────────────────────────────────────────────────────────┘
                                                       │
                                                       ▼
  ┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │                                           2. ORDER LIFECYCLE                                           │
  │  Order Wizard ──> Draft ──> Submitted ──> Processing ──> QC ──> Ready to Dispatch ──> Dispatched ──> Delivered  │
  └────────────────────────────────────────────────────────────────────────────────────────────────────────┘
            │                                          │                                          │
            ▼                                          ▼                                          ▼
┌───────────────────────┐                  ┌───────────────────────┐                  ┌───────────────────────┐
│   3. VENDOR & QC      │                  │ 4. RETURNS & EXCHANGES│                  │ 5. REPAIRS & REFUNDS  │
│ PO ─> Inward ─> QC    │                  │ Request ─> Processing │                  │ Ticket ─> Resolution  │
└───────────────────────┘                  └───────────────────────┘                  └───────────────────────┘
```

---

### Flow 0: Tenant Registration & Workspace Lifecycle (Platform Owner)
1. **Registration**: Platform Owner registers a wholesaler (`POST /api/tenants/register`).
2. **Auto SUPERADMIN Creation**: A `SUPERADMIN` employee account is created using the provided owner details, email, mobile, and password.
3. **Plan Types**:
   - `PRO`: All 27 pages & 25 action permissions automatically assigned.
   - `PREMIUM`: Default page set assigned.
   - `CUSTOM`: Custom `selectedPages` & `autoPermissions` arrays specified by Platform Owner.
4. **Tenant Status Progression**: `ACTIVE` $\leftrightarrow$ `SUSPENDED` $\rightarrow$ `DELETED`.
   - `SUSPENDED`: Workspace blocked (`403 TENANT_SUSPENDED`); all logins for that tenant are prevented immediately.

### Flow 1: Customer Onboarding & Management
1. **Registration Wizard**: Multi-step registration collecting Firm/Company details, Address, GST/PAN credentials, Credit terms, and Zone/Salesperson mapping.
2. **Approval Lifecycle**: Draft entries go into approval queues (`Pending` -> `Approved` / `Rejected`).

### Flow 2: Order Creation & Fulfillment Lifecycle
1. **Order Wizard**: Multi-category order creation supporting Stock orders and RX (prescription lens) orders.
2. **Dynamic Field Rules**: Automatically enables/disables fields based on selected category (e.g. Lens vs Frame vs Accessories).
3. **Status Transitions**: `Draft` $\rightarrow$ `Submitted` $\rightarrow$ `Processing` $\rightarrow$ `QC` $\rightarrow$ `ReadyToDispatch` $\rightarrow$ `Dispatched` $\rightarrow$ `Delivered` $\rightarrow$ `Completed` (or `Cancelled`).
4. **Public Order Tracker**: Dedicated public route (`/orders/status?orderId=...`) enabling unauthenticated live tracking.

---

## 3. Complete API Endpoint Catalog

### 🏢 Tenant & Multi-Tenant Management (`tenantService.js`)
| Method | Endpoint | Service Function | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/tenants/register` | `registerTenant` | Register new wholesaler & auto-create `SUPERADMIN` |
| `GET` | `/api/tenants` | `getAllTenants` | List all wholesalers with pagination, search & status filters |
| `GET` | `/api/tenants/:id` | `getTenantById` | Fetch complete details of a single tenant |
| `PUT` | `/api/tenants/:id` | `updateTenant` | Update tenant store, owner, loyalty & subscription settings |
| `PATCH`| `/api/tenants/:id/suspend` | `suspendTenant` | Suspend wholesaler workspace (`403 TENANT_SUSPENDED`) |
| `PATCH`| `/api/tenants/:id/activate` | `activateTenant` | Reactivate suspended wholesaler workspace |
| `DELETE`| `/api/tenants/:id` | `deleteTenant` | Permanently delete tenant & associated employee accounts |

---

### 🔑 Authentication (`authService.js`)
| Method | Endpoint | Service Function | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/employee/auth/login` | `login` | Authenticate user (Supports `PLATFORM_OWNER`, `SUPERADMIN`, `STAFF`) |
| `GET` | `/api/user/me` | `getCurrentUser` | Fetch current user session details |
| `POST` | `/api/user/logout` | `logout` | Clear server session / invalidate token |

---

### 👤 Customer Management (`customerService.js`)
| Method | Endpoint | Service Function | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/customer/get-all-customers` | `getAllCustomers` | List all customers with pagination & filters |
| `GET` | `/api/customer/:id` | `getCustomerById` | Fetch customer detail profile |
| `POST` | `/api/customer/create` | `createCustomer` | Register new customer |
| `PUT` | `/api/customer/update/:id` | `updateCustomer` | Update customer information |
| `DELETE`| `/api/customer/delete/:id` | `deleteCustomer` | Delete customer account |
| `POST` | `/api/customer/approve/:id` | `approveCustomer` | Approve pending customer registration |
| `POST` | `/api/customer/reject/:id` | `rejectCustomer` | Reject pending customer registration |

---

### 📦 Order & Product Engine (`orderService.js`)
| Method | Endpoint | Service Function | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/order/get-all-orders` | `getAllOrders` | List all bulk orders with pagination & status filters |
| `GET` | `/api/order/:id` | `getOrderById` | Fetch full order details including sub-orders |
| `POST` | `/api/order/create-bulk-orders` | `createBulkOrder` | Submit bulk order with multiple categories & items |
| `PATCH` | `/api/order/bulk-orders/:orderId/status` | `updateBulkOrderStatus` | Transition order status with remarks & completion date |
| `GET` | `/api/order/rx-orders` | `getRxOrders` | Retrieve list of RX prescription orders |
| `GET` | `/api/order/draft-orders` | `getDraftOrders` | List draft orders for current user |
| `POST` | `/api/order/resolve-product` | `resolveProduct` | Dynamic product matrix lookup |
| `GET` | `/api/order/status/public` | Unauthenticated public search | Get public order status by Order ID |

---

### 🏭 Vendor, Purchase & Quality Control (`vendorOrderService.js`)
| Method | Endpoint | Service Function | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/vendor` | `createVendor` | Create vendor master record |
| `GET` | `/api/vendor` | `getAllVendors` | List registered vendors |
| `POST` | `/api/purchase/create-vendor-purchase-items` | `createVendorPurchaseItems` | Create purchase order to vendor |
| `GET` | `/api/purchase/get-all-purchase-items` | `getAllPurchaseItems` | List purchase items across vendors |
| `POST` | `/api/purchase-inward/create` | `createPurchaseInward` | Record goods inward arrival & item condition |
| `GET` | `/api/purchase-inward/get-all-items` | `getAllInwardItems` | List inward entries |
| `POST` | `/api/purchase-qc/create` | `createPurchaseQC` | Submit Quality Check inspection report |
| `GET` | `/api/purchase-qc/get-all-items` | `getAllQCItems` | List completed Quality Check records |
| `PATCH`| `/api/purchase-return/:returnId/items-status` | `updatePurchaseReturnItemStatus` | Update return resolution status |

---

## 4. Front-End Project Layout Reference

```
src/
├── components/          # Reusable UI components & modals
│   ├── CustomerRegistration/  # Multi-step customer registration wizard
│   ├── Dashboard.jsx          # Executive dashboard & metrics
│   ├── layout/                # Sidebar, Header, and Auth containers
│   └── ui/                    # Confirmation modals, SearchableSelect, Buttons
├── hooks/               # Custom hooks (e.g. usePermissions)
├── pages/               # Primary route views (Orders, Customers, Reports, Staff)
│   ├── tenants/         # Platform Owner Tenant Management (Register, List, Details)
│   ├── vendor/          # Purchase, Inward, QC & Vendor modules
│   └── PublicOrderStatus.jsx # Public tracking view (unauthenticated)
├── routes/              # Route config, ProtectedRoute, PublicRoute rules
├── services/            # API service integration layers (Axios)
└── store/               # Redux slices (authSlice, etc.)
```
