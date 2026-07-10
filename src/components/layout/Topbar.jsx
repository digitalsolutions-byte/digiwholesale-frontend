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
    useMediaQuery
} from '@mui/material';

const Topbar = ({ onMenuClick }) => {
    const user = useSelector((state) => state.auth.user);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <Paper
            elevation={0}
            sx={{
                width: '100%',
                borderRadius: '20px',
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                color: theme.palette.primary.contrastText,
                p: { xs: 1.5, md: 2 },
                boxShadow: `0 10px 30px ${alpha(theme.palette.primary.main, 0.15)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Background pattern */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    opacity: 0.1,
                    background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.4) 0%, transparent 50%)',
                    pointerEvents: 'none'
                }}
            />

            <Stack direction="row" alignItems="center" spacing={2} sx={{ flexGrow: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
                {isMobile && (
                    <IconButton
                        onClick={onMenuClick}
                        sx={{
                            color: 'inherit',
                            bgcolor: alpha(theme.palette.common.white, 0.1),
                            '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.2) }
                        }}
                    >
                        <Icon icon="lucide:menu" />
                    </IconButton>
                )}

                <Avatar
                    sx={{
                        bgcolor: alpha(theme.palette.common.white, 0.2),
                        width: { xs: 40, md: 48 },
                        height: { xs: 40, md: 48 },
                        border: `2px solid ${alpha(theme.palette.common.white, 0.3)}`,
                        boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.1)}`
                    }}
                >
                    <Icon icon="lucide:user" style={{ fontSize: '24px', color: 'white' }} />
                </Avatar>

                <Box sx={{ minWidth: 0 }}>
                    <Typography
                        variant="caption"
                        sx={{
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '1.5px',
                            opacity: 0.8,
                            fontSize: '0.65rem',
                            display: 'block',
                            mb: 0.2
                        }}
                    >
                        Account
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Typography
                            variant="h6"
                            noWrap
                            sx={{
                                fontSize: { xs: '0.95rem', md: '1.25rem' },
                                fontWeight: 800,
                                letterSpacing: '-0.02em'
                            }}
                        >
                            {user?.employeeName || 'Team Member'}
                        </Typography>
                        {!isMobile && (
                            <Box
                                sx={{
                                    px: 1.5,
                                    py: 0.5,
                                    borderRadius: '12px',
                                    bgcolor: alpha(theme.palette.common.white, 0.15),
                                    border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
                                    color: "white",
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}
                            >
                                {user?.Department?.name || 'Operations'}
                            </Box>
                        )}
                    </Stack>
                </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} sx={{ position: 'relative', zIndex: 1 }}>
                <IconButton
                    sx={{
                        bgcolor: alpha(theme.palette.common.white, 0.1),
                        color: 'white',
                        '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.2) }
                    }}
                >
                    <Badge
                        color="warning"
                        variant="dot"
                        sx={{ '& .MuiBadge-badge': { width: 10, height: 10, borderRadius: '50%' } }}
                    >
                        <Icon icon="lucide:bell" style={{ fontSize: '20px' }} />
                    </Badge>
                </IconButton>
                <IconButton
                    sx={{
                        bgcolor: alpha(theme.palette.common.white, 0.1),
                        color: 'white',
                        '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.2) }
                    }}
                >
                    <Icon icon="lucide:settings" style={{ fontSize: '20px' }} />
                </IconButton>
            </Stack>
        </Paper>
    );
};

export default Topbar;



