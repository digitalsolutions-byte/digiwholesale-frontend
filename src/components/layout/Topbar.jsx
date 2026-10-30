import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    IconButton,
    Badge,
    Avatar,
    Stack,
    useTheme,
    alpha,
    Paper,
    useMediaQuery,
    Tooltip
} from '@mui/material';

import { selectCurrentUser, selectCurrentTenant } from '../../store/slices/authSlice';
import { PATHS } from '../../routes/paths';
import { getAllSystemNotifications } from '../../services/notificationService';
import NotificationsPopover from './NotificationsPopover';

const Topbar = ({ onMenuClick }) => {
    const navigate = useNavigate();
    const user = useSelector(selectCurrentUser);
    const tenant = useSelector(selectCurrentTenant);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Notification Popover state
    const [notificationAnchor, setNotificationAnchor] = useState(null);
    const [notificationsData, setNotificationsData] = useState({
        summary: { total: 0, urgentCount: 0 },
        notifications: []
    });
    const totalCount = notificationsData.summary?.total || notificationsData.notifications?.length || 0;
    const urgentCount = notificationsData.summary?.urgentCount || 0;
    const [loadingNotifications, setLoadingNotifications] = useState(false);

    const fetchNotifications = async () => {
        try {
            setLoadingNotifications(true);
            const res = await getAllSystemNotifications();
            if (res?.data) {
                setNotificationsData(res.data);
            }
        } catch (err) {
            // Background polling catch
        } finally {
            setLoadingNotifications(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        const handleNotificationUpdated = () => fetchNotifications();
        window.addEventListener('notification-updated', handleNotificationUpdated);
        return () => {
            clearInterval(interval);
            window.removeEventListener('notification-updated', handleNotificationUpdated);
        };
    }, []);

    // Demo NDA button: only show for non-PLATFORM_OWNER users
    // when either the employee OR their tenant has demoMode: true
    const isPlatformOwner = user?.EmployeeType === 'PLATFORM_OWNER';
    const showDemoNdaButton = !isPlatformOwner && Boolean(
        user?.demoMode ||
        tenant?.demoMode ||
        tenant?.featureFlags?.demoMode
    );

    // ── Derive initials for avatar ───────────────────────────────────────────
    const initials = (user?.employeeName || '')
        .split(' ')
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase() || '')
        .join('') || <Icon icon="lucide:user" style={{ fontSize: '18px', color: 'white' }} />;

    return (
        <Paper
            elevation={0}
            sx={{
                width: '100%',
                borderRadius: '16px',
                background: ' #1f618d ',
                border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                boxShadow: '0 1px 4px 0 rgba(0,0,0,0.06)',
                p: { xs: '10px 14px', md: '10px 20px' },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* ── Left: menu + identity ─────────────────────────────────── */}
            <Stack
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{ flexGrow: 1, minWidth: 0 }}
            >
                {isMobile && (
                    <IconButton
                        onClick={onMenuClick}
                        size="small"
                        sx={{
                            color: theme.palette.text.secondary,
                            borderRadius: '10px',
                            border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.06),
                                borderColor: alpha(theme.palette.primary.main, 0.2),
                            },
                        }}
                    >
                        <Icon icon="lucide:menu" style={{ fontSize: '18px' }} />
                    </IconButton>
                )}

                {/* Avatar */}
                <Avatar
                    sx={{
                        width: { xs: 36, md: 40 },
                        height: { xs: 36, md: 40 },
                        bgcolor: theme.palette.primary.main,
                        fontSize: '13px',
                        fontWeight: 800,
                        flexShrink: 0,
                        letterSpacing: '0.03em',
                    }}
                >
                    {initials}
                </Avatar>

                {/* Name + department */}
                <Box sx={{ minWidth: 0 }}>
                    <Typography
                        sx={{
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: 'white',
                            lineHeight: 1,
                            mb: '3px',
                        }}
                    >
                        Logged in
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography
                            noWrap
                            sx={{
                                fontSize: { xs: '13px', md: '14px' },
                                fontWeight: 800,
                                color: "white",
                                letterSpacing: '-0.01em',
                                lineHeight: 1.2,
                            }}
                        >
                            {user?.employeeName || 'Team Member'}
                        </Typography>

                        {!isMobile && tenant?.storeInformation?.storeName && (
                            <Box
                                sx={{
                                    px: 1.2,
                                    py: '3px',
                                    borderRadius: '8px',
                                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5
                                }}
                            >
                                <Icon icon="lucide:building-2" style={{ fontSize: '12px' }} />
                                <span>{tenant.storeInformation.storeName}</span>
                            </Box>
                        )}
                        {!isMobile && user?.Department?.name && (
                            <Box
                                sx={{
                                    px: 1.2,
                                    py: '3px',
                                    borderRadius: '8px',
                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                    color: theme.palette.primary.light,
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                }}
                            >
                                {user.Department.name}
                            </Box>
                        )}
                    </Stack>
                </Box>
            </Stack>

            {/* ── Right: actions ────────────────────────────────────────── */}
            <Stack direction="row" alignItems="center" spacing={1}>

                {/* Confidential Demo Access NDA Button — only visible for demo-mode users */}
                {showDemoNdaButton && (
                    <Tooltip title="View Confidential Demo Access Agreement" placement="bottom">
                        <Box
                            onClick={() => window.dispatchEvent(new Event('open-demo-modal'))}
                            sx={{
                                px: 1.2,
                                py: '4px',
                                borderRadius: '10px',
                                bgcolor: 'rgba(255, 193, 7, 0.2)',
                                color: '#FFD54F',
                                border: '1px solid rgba(255, 193, 7, 0.4)',
                                fontSize: '11px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.8,
                                transition: 'all .2s',
                                '&:hover': {
                                    bgcolor: 'rgba(255, 193, 7, 0.35)',
                                    transform: 'scale(1.02)'
                                }
                            }}
                        >
                            <Icon icon="mdi:shield-lock-outline" style={{ fontSize: '15px' }} />
                            <span>Demo NDA</span>
                        </Box>
                    </Tooltip>
                )}

                {/* Notifications */}
                <Tooltip
                    title={
                        urgentCount > 0
                            ? `🚨 ${urgentCount} Urgent Action(s) Required (${totalCount} Total Notifications)`
                            : totalCount > 0
                                ? `${totalCount} Notification(s)`
                                : "Notifications"
                    }
                    placement="bottom"
                >
                    <IconButton
                        size="small"
                        onClick={(e) => setNotificationAnchor(e.currentTarget)}
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            border: `1px solid ${
                                urgentCount > 0
                                    ? '#F59E0B'
                                    : totalCount > 0
                                        ? 'rgba(255, 255, 255, 0.35)'
                                        : 'rgba(255, 255, 255, 0.2)'
                            }`,
                            color: urgentCount > 0 ? '#FEF08A' : '#FFFFFF',
                            bgcolor: urgentCount > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                            boxShadow: urgentCount > 0 ? '0 0 10px rgba(245, 158, 11, 0.45)' : 'none',
                            animation: urgentCount > 0 ? 'pulse 2s infinite' : 'none',
                            '@keyframes pulse': {
                                '0%': { transform: 'scale(1)' },
                                '50%': { transform: 'scale(1.08)' },
                                '100%': { transform: 'scale(1)' }
                            },
                            '&:hover': {
                                bgcolor: urgentCount > 0 ? 'rgba(245, 158, 11, 0.45)' : 'rgba(255, 255, 255, 0.18)',
                                borderColor: urgentCount > 0 ? '#FBBF24' : 'rgba(255, 255, 255, 0.4)',
                                color: '#FFFFFF',
                            },
                            transition: 'all .15s',
                        }}
                    >
                        <Badge
                            badgeContent={urgentCount > 0 ? urgentCount : (totalCount > 0 ? totalCount : undefined)}
                            color="error"
                            variant="standard"
                            invisible={totalCount === 0}
                            sx={{
                                '& .MuiBadge-badge': {
                                    fontSize: '0.62rem',
                                    fontWeight: 800,
                                    height: 17,
                                    minWidth: 17,
                                    px: 0.4,
                                    borderRadius: '9px',
                                    border: '1.5px solid #1f618d',
                                    backgroundColor: urgentCount > 0 ? '#E74C3C' : '#3498DB',
                                    color: '#FFFFFF',
                                },
                            }}
                        >
                            <Icon icon="lucide:bell" style={{ fontSize: '17px' }} />
                        </Badge>
                    </IconButton>
                </Tooltip>

                {/* Divider */}
                <Box
                    sx={{
                        width: '1px',
                        height: '22px',
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                        flexShrink: 0,
                    }}
                />

                {/* Settings */}
                <Tooltip title="Settings" placement="bottom">
                    <IconButton
                        size="small"
                        onClick={() => navigate(PATHS.SETTINGS)}
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#FFFFFF',
                            bgcolor: 'rgba(255, 255, 255, 0.08)',
                            '&:hover': {
                                bgcolor: 'rgba(255, 255, 255, 0.18)',
                                borderColor: 'rgba(255, 255, 255, 0.4)',
                                color: '#FFFFFF',
                            },
                            transition: 'all .15s',
                        }}
                    >
                        <Icon icon="lucide:settings" style={{ fontSize: '17px' }} />
                    </IconButton>
                </Tooltip>
            </Stack>

            {/* Notifications Popover */}
            <NotificationsPopover
                open={Boolean(notificationAnchor)}
                anchorEl={notificationAnchor}
                onClose={() => setNotificationAnchor(null)}
                notificationsData={notificationsData}
                loading={loadingNotifications}
                onRefresh={fetchNotifications}
            />
        </Paper>
    );
};

export default Topbar;



