import React from 'react';
import { Icon } from '@iconify/react';
import { useSelector } from 'react-redux';
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

const Topbar = ({ onMenuClick }) => {
    const user = useSelector((state) => state.auth.user);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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

                {/* Notifications */}
                <Tooltip title="Notifications" placement="bottom">
                    <IconButton
                        size="small"
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                            color: theme.palette.text.secondary,
                            '&:hover': {
                                bgcolor: alpha(theme.palette.warning.main, 0.06),
                                borderColor: alpha(theme.palette.warning.main, 0.25),
                                color: theme.palette.warning.main,
                            },
                            transition: 'all .15s',
                        }}
                    >
                        <Badge
                            color="warning"
                            variant="dot"
                            sx={{
                                '& .MuiBadge-badge': {
                                    width: 7,
                                    height: 7,
                                    minWidth: 7,
                                    borderRadius: '50%',
                                    border: '1.5px solid white',
                                    top: 2,
                                    right: 2,
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
                        bgcolor: alpha(theme.palette.divider, 0.15),
                        flexShrink: 0,
                    }}
                />

                {/* Settings */}
                <Tooltip title="Settings" placement="bottom">
                    <IconButton
                        size="small"
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                            color: theme.palette.text.secondary,
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.06),
                                borderColor: alpha(theme.palette.primary.main, 0.2),
                                color: theme.palette.primary.main,
                            },
                            transition: 'all .15s',
                        }}
                    >
                        <Icon icon="lucide:settings" style={{ fontSize: '17px' }} />
                    </IconButton>
                </Tooltip>
            </Stack>
        </Paper>
    );
};

export default Topbar;



