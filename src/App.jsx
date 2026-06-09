
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectCurrentUser } from './store/slices/authSlice';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

import { PATHS, routesConfig } from './routes/config';

import PermissionGuard from './components/PermissionGuard';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import { useTheme } from '@mui/material/styles';
import { useEffect } from 'react';

// Sync MUI theme colors with Tailwind CSS variables
const ThemeVariableSync = ({ children }) => {
  const theme = useTheme();
  
  useEffect(() => {
    const root = document.documentElement;
    const erpColors = theme.palette.erp || {};
    
    // Sync ERP specific colors
    Object.entries(erpColors).forEach(([key, value]) => {
      root.style.setProperty(`--mui-erp-${key}`, value);
    });
    
    // Sync main palette colors
    root.style.setProperty('--mui-primary-main', theme.palette.primary.main);
    root.style.setProperty('--mui-secondary-main', theme.palette.secondary.main);
    root.style.setProperty('--mui-background-default', theme.palette.background.default);
    root.style.setProperty('--mui-background-paper', theme.palette.background.paper);
    root.style.setProperty('--mui-text-primary', theme.palette.text.primary);
    root.style.setProperty('--mui-text-secondary', theme.palette.text.secondary);
  }, [theme]);

  return children;
};

function App() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectCurrentUser);

  // Dynamic Route Renderer
  const renderRoutes = (routes) => {
    return routes.map((route, index) => {
      const {
        element: Component,
        props = {},
        children,
        isPublic,
        index: isIndexRoute,
        path,
        requiredPermission
      } = route;

      let element = <Component {...props} />;

      // Authentication logic for public routes (e.g., redirect from Login if already logged in)
      if (isPublic && (path === PATHS.LOGIN || path === PATHS.CUSTOMER_LOGIN)) {
        element = !isAuthenticated ? (
          <Component />
        ) : (
          <Navigate to={user?.EmployeeType === 'CUSTOMER' ? PATHS.CUSTOMER_PORTAL : PATHS.WELCOME} state={{ from: 'login' }} replace />
        );
      } else if (requiredPermission) {
        // Enforce permission checks for protected routes
        element = (
          <PermissionGuard requiredPermission={requiredPermission}>
            <Component {...props} />
          </PermissionGuard>
        );
      }

      // Index routes
      if (isIndexRoute) {
        return <Route key={`index-${index}`} index element={element} />;
      }

      // Nested routes (Wrappers like AuthWrapper, MainLayout, or module groups)
      if (children) {
        return (
          <Route key={path || `wrapper-${index}`} path={path} element={element}>
            {renderRoutes(children)}
          </Route>
        );
      }

      // Standard routes
      return <Route key={path} path={path} element={element} />;
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <ThemeVariableSync>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <BrowserRouter>
            <div className="app-root min-h-screen bg-gray-50 text-gray-900 font-sans">
              <Routes>
                {renderRoutes(routesConfig)}
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


