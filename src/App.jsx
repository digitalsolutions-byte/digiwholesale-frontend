import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectCurrentUser } from './store/slices/authSlice';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

import { PATHS, routesConfig } from './routes/config';
import ProtectedRoute from './components/ProtectedRoute';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import { useTheme } from '@mui/material/styles';
import { useEffect } from 'react';

// ── MUI → CSS variable sync ───────────────────────────────────────────────────
const ThemeVariableSync = ({ children }) => {
    const theme = useTheme();
    useEffect(() => {
        const root = document.documentElement;
        const erpColors = theme.palette.erp || {};
        Object.entries(erpColors).forEach(([k, v]) => root.style.setProperty(`--mui-erp-${k}`, v));
        root.style.setProperty('--mui-primary-main',        theme.palette.primary.main);
        root.style.setProperty('--mui-secondary-main',      theme.palette.secondary.main);
        root.style.setProperty('--mui-background-default',  theme.palette.background.default);
        root.style.setProperty('--mui-background-paper',    theme.palette.background.paper);
        root.style.setProperty('--mui-text-primary',        theme.palette.text.primary);
        root.style.setProperty('--mui-text-secondary',      theme.palette.text.secondary);
    }, [theme]);
    return children;
};

// ── Unauthorized page ─────────────────────────────────────────────────────────
const UnauthorizedPage = () => (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 bg-gray-50 animate-in fade-in duration-500">
        <div className="p-6 bg-red-50 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-red-400" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874
                    1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
        </div>
        <div className="text-center space-y-3 max-w-md">
            <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-800">Access Denied</h1>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                You don't have permission to view this page.
            </p>
            <p className="text-xs text-gray-300 font-medium">
                Contact your administrator if you believe this is an error.
            </p>
        </div>
        <a href={PATHS.ROOT}
            className="px-8 py-3 rounded-full bg-erp-accent text-white text-xs font-black uppercase tracking-widest
                       hover:bg-erp-accent/90 transition-all shadow-md">
            Go to Dashboard
        </a>
    </div>
);

// ── Route renderer ────────────────────────────────────────────────────────────
function App() {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const user            = useSelector(selectCurrentUser);

    /**
     * renderRoutes — recursive React Router builder.
     *
     * Per-route processing order:
     *  1. Build base element: <Component {...props} />
     *  2. Redirect logged-in users away from Login screens (public routes only).
     *  3. If route has a `page` key → wrap in <ProtectedRoute page={page}>.
     *     ProtectedRoute checks user.pageAccess[] and redirects to
     *     /unauthorized on failure. No SUPERADMIN bypass, no role check.
     *  4. Emit <Route> — with nested children if present.
     *
     * The guard (step 3) is applied to the element BEFORE the children
     * branch, so layout wrapper routes never skip their own page check.
     */
    const renderRoutes = (routes) => routes.map((route, index) => {
        const {
            element: Component,
            props: routeProps = {},
            children,
            isPublic,
            index: isIndexRoute,
            path,
            page,   // pageAccess key — the ONLY access signal used
        } = route;

        // Step 1 — base element
        let element = <Component {...routeProps} />;

        // Step 2 — redirect already-authed users away from login pages
        if (isPublic && (path === PATHS.LOGIN || path === PATHS.CUSTOMER_LOGIN)) {
            element = !isAuthenticated
                ? <Component />
                : <Navigate
                    to={user?.EmployeeType === 'CUSTOMER' ? PATHS.CUSTOMER_PORTAL : PATHS.WELCOME}
                    state={{ from: 'login' }}
                    replace
                />;
        }

        // Step 3 — page-access guard (applied regardless of children)
        if (!isPublic && page) {
            element = (
                <ProtectedRoute page={page}>
                    <Component {...routeProps} />
                </ProtectedRoute>
            );
        }

        // Step 4 — emit route
        if (isIndexRoute) {
            return <Route key={`index-${index}`} index element={element} />;
        }

        if (children) {
            return (
                <Route key={path || `wrapper-${index}`} path={path} element={element}>
                    {renderRoutes(children)}
                </Route>
            );
        }

        return <Route key={path} path={path} element={element} />;
    });

    return (
        <ThemeProvider theme={theme}>
            <ThemeVariableSync>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <BrowserRouter>
                        <div className="app-root min-h-screen bg-gray-50 text-gray-900 font-sans">
                            <Routes>
                                {renderRoutes(routesConfig)}
                                <Route path={PATHS.UNAUTHORIZED} element={<UnauthorizedPage />} />
                            </Routes>
                        </div>
                        <ToastContainer position="top-right" autoClose={3000} style={{ zIndex: 99999 }} />
                    </BrowserRouter>
                </LocalizationProvider>
            </ThemeVariableSync>
        </ThemeProvider>
    );
}

export default App;
