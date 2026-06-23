import { PATHS } from '../../routes/paths';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, NavLink } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { Icon } from '@iconify/react';
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    useMediaQuery,
    ListItemIcon,
    ListItemText,
    Collapse,
    Typography,
    IconButton,
    Tooltip,
    Divider,
    Avatar,
    useTheme,
    alpha
} from '@mui/material';
import { logoutUser } from '../../services/authService';
import { logOut, selectCurrentUser } from '../../store/slices/authSlice';
import usePermissions from '../../hooks/usePermissions';
import { resetRegistration } from '../../store/slices/customerRegistrationSlice';
import logo from '../../assets/logo.png';

// ── Nav item definitions ─────────────────────────────────────────────────────
// `page` must match a pageAccess[] key from the backend login response.
// Items without a `page` key are visible to all authenticated users.
const navItems = [
    { label: 'Dashboard', icon: 'lucide:layout-dashboard', path: PATHS.ROOT, page: 'DASHBOARD' },
    {
        label: 'Add New',
        icon: 'lucide:square-pen',
        subItems: [
            { label: 'Register Customer', path: PATHS.CUSTOMER.REGISTER, page: 'REGISTER_CUSTOMER' },
            { label: 'Register Staff',    path: PATHS.STAFF.REGISTER,    page: 'REGISTER_STAFF' },
        ],
    },
    {
        label: 'Staff',
        icon: 'lucide:users',
        subItems: [
            { label: 'Staff List', path: PATHS.STAFF.LIST, page: 'STAFF_LIST' },
        ],
    },
    {
        label: 'Customer',
        icon: 'lucide:user-round',
        subItems: [
            { label: 'Customer List', path: PATHS.CUSTOMER.LIST,    page: 'CUSTOMER_LIST' },
            { label: 'Ship To',       path: PATHS.CUSTOMER.SHIP_TO, page: 'SHIP_TO' },
            { label: 'Approvals',     path: PATHS.APPROVALS,        page: 'APPROVALS' },
            { label: 'Corrections',   path: PATHS.CORRECTIONS,      page: 'CORRECTIONS' },
        ],
    },
    {
        label: 'Orders',
        icon: 'lucide:headphones',
        subItems: [
            { label: 'New Order',      path: PATHS.CUSTOMER_CARE.NEW_ORDER,      page: 'NEW_ORDER',      isBold: true },
            { label: 'All Orders',     path: PATHS.CUSTOMER_CARE.ALL_ORDERS,     page: 'ALL_ORDERS' },
            { label: 'Pending Orders', path: PATHS.CUSTOMER_CARE.PENDING_ORDERS, page: 'PENDING_ORDERS' },
            { label: 'Other Sales',    path: PATHS.CUSTOMER_CARE.SERVICE_GOODS,  page: 'OTHER_SALES' },
            { label: 'Sales List',     path: PATHS.SALES.LIST,                   page: 'SALES_LIST' },
        ],
    },
    {
        label: 'Returns & Exchanges',
        icon: 'lucide:undo-2',
        subItems: [
            { label: 'Return & Refund',   path: PATHS.RETURNS.RETURN_REFUND, page: 'RETURN_REFUND' },
            { label: 'Exchange Requests', path: PATHS.RETURNS.EXCHANGE,      page: 'EXCHANGE_REQUESTS' },
        ],
    },
    { label: 'Drafts', icon: 'lucide:file-text', path: PATHS.DRAFTS, page: 'DRAFTS' },
    {
        label: 'Reports',
        icon: 'lucide:chart-column',
        subItems: [
            { label: 'Daily Report', path: PATHS.REPORTS.DAILY, page: 'DAILY_REPORT' },
            { label: 'Main Report',  path: PATHS.REPORTS.MAIN,  page: 'MAIN_REPORT' },
        ],
    },
    {
        label: 'Repair',
        icon: 'lucide:tool-case',
        subItems: [
            { label: 'Add Repair',  path: PATHS.REPAIR.ADD,  page: 'ADD_REPAIR' },
            { label: 'Repair List', path: PATHS.REPAIR.LIST, page: 'REPAIR_LIST' },
        ],
    },
    {
        label: 'Vendor',
        icon: 'lucide:truck',
        subItems: [
            { label: 'Add Vendor',   path: PATHS.VENDOR.ADD,   page: 'ADD_VENDOR' },
            { label: 'Vendor List',  path: PATHS.VENDOR.LIST,  page: 'VENDOR_LIST' },
            { label: 'Vendor Order', path: PATHS.VENDOR.ORDER, page: 'VENDOR_ORDER' },
        ],
    },
    { label: 'Quality',   icon: 'lucide:badge-check',   path: PATHS.OPERATIONS.QC,       page: 'QUALITY' },
    { label: 'Fitting',   icon: 'lucide:ruler',          path: PATHS.OPERATIONS.FITTING,  page: 'FITTING' },
    { label: 'Shipping',  icon: 'lucide:send',           path: PATHS.OPERATIONS.DISPATCH, page: 'SHIPPING' },
    { label: 'Inventory', icon: 'lucide:package-search', path: PATHS.INVENTORY,           page: 'INVENTORY' },
];

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const dispatch = useDispatch();
    const location = useLocation();
    const user = useSelector(selectCurrentUser);
    const { hasPageAccess } = usePermissions();
    const theme = useTheme();
    const [openSubmenus, setOpenSubmenus] = useState({});

    // Filter nav items using user.pageAccess[] only.
    // Items without a `page` key are always shown.
    // Parent groups are hidden when ALL their children are hidden.
    const filteredNavItems = useMemo(() => {
        return navItems
            .map(item => {
                if (item.subItems) {
                    const filteredSubs = item.subItems.filter(sub =>
                        sub.page ? hasPageAccess(sub.page) : true
                    );
                    if (filteredSubs.length === 0) return null;
                    return { ...item, subItems: filteredSubs };
                }
                return (item.page ? hasPageAccess(item.page) : true) ? item : null;
            })
            .filter(Boolean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);  // re-filter whenever the stored user changes

    useEffect(() => {
        const newOpenSubmenus = {};
        filteredNavItems.forEach(item => {
            if (item.subItems?.some(sub => sub.path === location.pathname)) {
                newOpenSubmenus[item.label] = true;
            }
        });
        setOpenSubmenus(prev => ({ ...prev, ...newOpenSubmenus }));
    }, [location.pathname, filteredNavItems]);

    const toggleSubmenu = (label) => {
        setOpenSubmenus(prev => ({
            ...prev,
            [label]: !prev[label]
        }));
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.error('Logout failed', error);
        } finally {
            dispatch(resetRegistration());
            dispatch(logOut());
        }
    };

    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const isParentActive = (item) => {
        return item.subItems?.some(sub => sub.path === location.pathname);
    };

    const drawerWidth = 280;

    const renderNavIcon = (icon, active) => (
        <ListItemIcon sx={{ minWidth: 40 }}>
            <Icon
                icon={icon}
                style={{
                    fontSize: '22px',
                    color: active ? '#FFFFFF' : '#636e72'
                }}
            />
        </ListItemIcon>
    );

    return (
        <>
            <Drawer
                variant={isMobile ? "temporary" : "persistent"}
                anchor="left"
                open={isOpen}
                onClose={toggleSidebar}
                sx={{
                    width: isOpen && !isMobile ? drawerWidth : 0,
                    flexShrink: 0,
                    transition: theme.transitions.create('width', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                        borderRight: '1px solid rgba(0,0,0,0.06)',
                        boxShadow: '4px 0 24px rgba(0,0,0,0.02)',
                        background: '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                    },
                }}
            >
                {/* Logo Area */}
                <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <img src={logo} alt="DigiOptics" style={{ width: '100%', maxWidth: '160px', objectFit: 'contain' }} />
                </Box>

                {/* Nav Items */}
                <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 2, pb: 2 }} className="custom-scrollbar">
                    <List component="nav" sx={{ gap: 0.5, display: 'flex', flexDirection: 'column' }}>
                        {filteredNavItems.map((item) => {
                            const hasSub = !!item.subItems;
                            const isActive = hasSub ? isParentActive(item) : location.pathname === item.path;
                            const isOpenSub = openSubmenus[item.label];

                            return (
                                <Box key={item.label}>
                                    <ListItem disablePadding sx={{ mb: 0.5 }}>
                                        {hasSub ? (
                                            <ListItemButton
                                                onClick={() => toggleSubmenu(item.label)}
                                                sx={{
                                                    borderRadius: '12px',
                                                    py: 1.5,
                                                    px: 2,
                                                    backgroundColor: isActive ? 'primary.dark' : 'transparent',
                                                    color: isActive ? 'white' : 'text.primary',
                                                    '&:hover': {
                                                        backgroundColor: isActive ? 'primary.dark' : alpha(theme.palette.primary.main, 0.05),
                                                        opacity: 0.9
                                                    },
                                                }}
                                            >
                                                {renderNavIcon(item.icon, isActive)}
                                                <ListItemText
                                                    primary={item.label}


                                                    primaryTypographyProps={{
                                                        fontWeight: isActive ? 700 : 500,
                                                        fontSize: '0.95rem',
                                                        color: isActive ? "white" : "text.primary"
                                                    }}
                                                />
                                                <Icon
                                                    icon="lucide:chevron-down"
                                                    style={{
                                                        transition: 'transform 0.2s',
                                                        transform: isOpenSub ? 'rotate(180deg)' : 'rotate(0)',
                                                        fontSize: '18px',
                                                        opacity: 0.7
                                                    }}
                                                />
                                            </ListItemButton>
                                        ) : (
                                            <ListItemButton
                                                component={NavLink}
                                                to={item.path}
                                                onClick={() => isMobile && toggleSidebar()}
                                                sx={{
                                                    borderRadius: '12px',
                                                    py: 1.5,
                                                    px: 2,
                                                    backgroundColor: isActive ? 'primary.main' : 'transparent',
                                                    color: isActive ? 'white' : 'text.primary',
                                                    '&:hover': {
                                                        backgroundColor: isActive ? 'primary.dark' : alpha(theme.palette.primary.main, 0.05),
                                                    },
                                                    '&.active': {
                                                        backgroundColor: 'primary.main',
                                                        color: 'white',
                                                        '& .MuiListItemIcon-root .iconify': {
                                                            color: 'white'
                                                        }
                                                    }
                                                }}
                                            >
                                                {renderNavIcon(item.icon, isActive)}
                                                <ListItemText
                                                    primary={item.label}
                                                    primaryTypographyProps={{
                                                        fontWeight: isActive ? 700 : 500,
                                                        fontSize: '0.95rem',
                                                        color: isActive ? "white" : "text.primary"
                                                    }}
                                                />
                                            </ListItemButton>
                                        )}
                                    </ListItem>

                                    {hasSub && (
                                        <Collapse in={isOpenSub} timeout="auto" unmountOnExit>
                                            <List component="div" disablePadding sx={{ ml: 2, borderLeft: '1px solid', borderColor: 'divider', my: 1 }}>
                                                {item.subItems.map((sub) => {
                                                    const isSubActive = location.pathname === sub.path;
                                                    return (
                                                        <ListItemButton
                                                            key={sub.path}
                                                            component={NavLink}
                                                            to={sub.path}
                                                            onClick={() => isMobile && toggleSidebar()}
                                                            sx={{
                                                                borderRadius: '0 12px 12px 0',
                                                                ml: 0,
                                                                pl: 4,
                                                                py: 1,
                                                                color: isSubActive ? 'accent.main' : 'text.secondary',
                                                                '&:hover': {
                                                                    backgroundColor: alpha(theme.palette.accent.main, 0.05),
                                                                    color: 'accent.main'
                                                                },
                                                                '&.active': {
                                                                    color: 'accent.main',
                                                                    fontWeight: 700
                                                                }
                                                            }}
                                                        >
                                                            <ListItemText
                                                                primary={sub.label}
                                                                primaryTypographyProps={{
                                                                    fontSize: '0.85rem',
                                                                    fontWeight: isSubActive ? 700 : 500
                                                                }}
                                                            />
                                                        </ListItemButton>
                                                    );
                                                })}
                                            </List>
                                        </Collapse>
                                    )}
                                </Box>
                            );
                        })}
                    </List>
                </Box>

                {/* Logout Section */}
                <Box sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <ListItemButton
                        onClick={handleLogout}
                        sx={{
                            borderRadius: '12px',
                            color: 'error.main',
                            '&:hover': { backgroundColor: alpha(theme.palette.error.main, 0.1) }
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                            <Icon icon="lucide:log-out" style={{ fontSize: '20px', color: theme.palette.error.main }} />
                        </ListItemIcon>
                        <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }} />
                    </ListItemButton>
                </Box>
            </Drawer>

            {/* Edge Toggle Button - Only show on desktop */}
            {!isMobile && (
                <IconButton
                    onClick={toggleSidebar}
                    sx={{
                        position: 'fixed',
                        top: '50%',
                        left: isOpen ? drawerWidth - 12 : 0,
                        zIndex: 1300,
                        backgroundColor: 'primary.main',
                        color: 'white',
                        width: 32,
                        height: 48,
                        borderRadius: '0 12px 12px 0',
                        transform: 'translateY(-50%)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '4px 0 12px rgba(0, 162, 255, 0.3)',
                        '&:hover': {
                            backgroundColor: 'accent.dark',
                            width: 40,
                            left: isOpen ? drawerWidth - 8 : 0,
                        }
                    }}
                >
                    <Icon icon={isOpen ? 'lucide:chevron-left' : 'lucide:chevron-right'} style={{ fontSize: '20px' }} />
                </IconButton>
            )}
        </>
    );
};

export default Sidebar;
