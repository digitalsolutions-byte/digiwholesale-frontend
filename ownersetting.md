# Frontend Implementation Prompt
## Feature: Wholesaler Settings Page — E-com Frames-Sunglasses Toggle

---

## Context

This is a **multi-tenant wholesale management system** built with React (Vite). There are two separate frontend portals:

1. **Admin/Owner Portal** — used by the Platform Owner (`EmployeeType: "PLATFORM_OWNER"`) to manage all wholesalers.
2. **Wholesaler Portal** — used by each wholesaler's SUPERADMIN and staff.

The backend now exposes three new API endpoints:

| Method | URL | Who can call |
|--------|-----|-------------|
| `GET` | `/api/tenants/:id/settings` | Platform Owner only |
| `PATCH` | `/api/tenants/:id/settings` | Platform Owner only |
| `GET` | `/api/settings/features` | Any authenticated wholesaler user |

---

## What to Build

### Part A — Platform Owner Portal (Admin Settings Page)

#### 1. Wholesaler Settings Page (`/owner/wholesalers/:id/settings`)

Create a new page accessible only when `user.EmployeeType === "PLATFORM_OWNER"`.

**Page Layout:**
- Header: `"Settings — <StoreName>"` (fetch store name from the API response)
- A settings card/section titled **"Feature Toggles"**
- One row inside for **"E-com Frames-Sunglasses Page"**:
  - Label: `"E-com Frames-Sunglasses Page"`
  - Sub-label: `"When enabled, this wholesaler can access the Frames & Sunglasses e-commerce catalogue page."`
  - A toggle switch (on/off) showing the current value
  - Status badge: `"Active"` (green) or `"Disabled"` (grey)

**API Integration:**

```js
// Fetch current settings
GET /api/tenants/:id/settings
Authorization: Bearer <owner_token>

// Response shape:
{
  "success": true,
  "data": {
    "tenantId": "TEN-STORE-XXXXX",
    "storeName": "Wholesaler Shop Name",
    "featureFlags": {
      "ecomFramesSunglasses": false
    }
  }
}
```

```js
// Toggle a flag
PATCH /api/tenants/:id/settings
Authorization: Bearer <owner_token>
Content-Type: application/json

{
  "featureFlags": {
    "ecomFramesSunglasses": true   // or false
  }
}

// Response shape:
{
  "success": true,
  "data": {
    "tenantId": "TEN-STORE-XXXXX",
    "storeName": "Wholesaler Shop Name",
    "featureFlags": {
      "ecomFramesSunglasses": true
    }
  },
  "message": "Tenant feature flags updated successfully"
}
```

**UX behaviour:**
- On toggle click → call `PATCH` immediately (optimistic update + rollback on error)
- Show a loading spinner on the toggle while the request is in-flight
- Show a success toast `"Feature updated successfully"` on success
- Show an error toast with the server message on failure (and rollback the toggle)
- Disable the toggle while request is in-flight to prevent double-clicks

**Access guard:**
```js
// In the route definition
if (user.EmployeeType !== "PLATFORM_OWNER") {
  return <Navigate to="/unauthorized" />;
}
```

---

#### 2. Wholesaler List Page — Settings Button

On the existing wholesaler list page (where all tenants are shown), add a **"Settings"** button/icon for each row that navigates to `/owner/wholesalers/:id/settings`.

---

### Part B — Wholesaler Portal (Conditional Page Visibility)

#### 1. Fetch Feature Flags on App Load

When the wholesaler portal initialises (after login), call the features endpoint and store the result in global state (Context / Redux / Zustand):

```js
// Call once after login / on app bootstrap
GET /api/settings/features
Authorization: Bearer <wholesaler_token>

// Response:
{
  "success": true,
  "data": {
    "featureFlags": {
      "ecomFramesSunglasses": false   // or true
    }
  }
}
```

Store this in your auth/app context:
```js
{
  featureFlags: {
    ecomFramesSunglasses: false
  }
}
```

#### 2. Conditionally Show the "E-com Frames-Sunglasses" Page

In the sidebar navigation and routing:

```jsx
// Sidebar nav item — only render if flag is true
{featureFlags?.ecomFramesSunglasses && (
  <NavItem to="/ecom/frames-sunglasses" icon={<SunglassesIcon />}>
    Frames & Sunglasses
  </NavItem>
)}

// Route guard
<Route
  path="/ecom/frames-sunglasses"
  element={
    featureFlags?.ecomFramesSunglasses
      ? <EcomFramesSunglassesPage />
      : <Navigate to="/dashboard" replace />
  }
/>
```

**If the flag is `false`:**
- The nav item is not rendered at all
- Direct URL access redirects to dashboard
- No API data is fetched for that page

**If the flag is `true`:**
- Nav item appears
- Page is accessible
- Page loads its data normally

---

## State Management Pattern

```js
// featureFlagsContext.js (or add to your existing AppContext)

const FeatureFlagsContext = createContext({ ecomFramesSunglasses: false });

export const FeatureFlagsProvider = ({ children }) => {
  const [flags, setFlags] = useState({ ecomFramesSunglasses: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const res = await api.get("/settings/features");
        setFlags(res.data.data.featureFlags || {});
      } catch {
        // fail silently — all pages default to hidden
      } finally {
        setLoading(false);
      }
    };
    fetchFlags();
  }, []);

  return (
    <FeatureFlagsContext.Provider value={{ flags, loading }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

export const useFeatureFlags = () => useContext(FeatureFlagsContext);
```

---

## File Structure to Create / Modify

```
src/
├── pages/
│   ├── owner/
│   │   └── WholesalerSettings.jsx          ← NEW: Platform Owner toggle page
│   └── ecom/
│       └── EcomFramesSunglassesPage.jsx     ← NEW (or existing): The actual page
├── context/
│   └── FeatureFlagsContext.jsx              ← NEW: Global feature flags state
├── components/
│   └── FeatureToggle.jsx                    ← NEW: Reusable toggle component
└── routes/
    └── AppRoutes.jsx                        ← MODIFY: Add conditional route
```

---

## API Axios Call Examples

```js
// services/tenantSettingsService.js

export const getTenantSettings = (tenantId) =>
  api.get(`/tenants/${tenantId}/settings`);

export const updateTenantSettings = (tenantId, featureFlags) =>
  api.patch(`/tenants/${tenantId}/settings`, { featureFlags });

export const getMyFeatureFlags = () =>
  api.get("/settings/features");
```

---

## Notes

- The `/api/tenants/:id/settings` routes require the **Platform Owner's JWT token** in the `Authorization: Bearer` header.
- The `/api/settings/features` route requires the **wholesaler user's JWT token**.
- `ecomFramesSunglasses` is the only flag for now. The backend `ALLOWED_FEATURE_FLAGS` array can be extended later if more features are added — just add a new key and create a new toggle card in the settings page.
- Existing tenants in the database will automatically have `featureFlags.ecomFramesSunglasses = false` because Mongoose applies the schema default on first read (the field is written lazily on next save, but `lean()` queries will return `{}` — handle this with `|| {}` and `?? false`).
