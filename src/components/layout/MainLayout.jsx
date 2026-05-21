import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Outlet, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import {
    Box,
    Container,
    Fab,
    useTheme,
    useMediaQuery,
    Paper,
    Fade,
    Tooltip
} from '@mui/material';
import GoBackButton from '../navigation/GoBackButton';

const MainLayout = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
    const navigate = useNavigate();

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    useEffect(() => {
        document.documentElement.style.setProperty('--sidebar-width', isSidebarOpen && !isMobile ? '280px' : '0px');
    }, [isSidebarOpen, isMobile]);

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', minWidth: '100vw', bgcolor: '#F8FAFC', position: 'relative', overflow: 'hidden' }}>
            {/* Decorative Background Elements */}
            <Box
                sx={{
                    position: 'absolute',
                    top: -100,
                    right: -100,
                    width: 400,
                    height: 400,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255, 99, 0, 0.05) 0%, transparent 70%)',
                    zIndex: 0
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    bottom: -50,
                    left: -50,
                    width: 300,
                    height: 300,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(0, 0, 0, 0.03) 0%, transparent 70%)',
                    zIndex: 0
                }}
            />

            {/* Sidebar */}
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

            {/* Main Content Area */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: theme.transitions.create(['margin', 'width'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                    width: '100%',
                    position: 'relative',
                    zIndex: 1,
                    p: { xs: 1.5, md: 3 },
                    pt: { xs: 2, md: 4 },
                    overflowX: 'hidden'
                }}
            >
                <Container maxWidth={false} sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%', px: { xs: 0, md: 1 } }}>
                    {/* Topbar Integration */}
                    <Fade in timeout={800}>
                        <Box sx={{ mb: 1 }}>
                            <Topbar onMenuClick={toggleSidebar} />
                        </Box>
                    </Fade>

                    {/* Content Section */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, flexGrow: 1 }}>
                        {/* Navigation / Back Button Row */}
                        <Fade in timeout={1000}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 1.5,
                                    borderRadius: '20px',
                                    border: '1px solid rgba(255,255,255,0.8)',
                                    background: 'rgba(255, 255, 255, 0.7)',
                                    backdropFilter: 'blur(10px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                                }}
                            >
                                <GoBackButton />
                            </Paper>
                        </Fade>

                        {/* Route Content */}
                        <Fade in timeout={1200}>
                            <Paper
                                elevation={0}
                                sx={{
                                    flexGrow: 1,
                                    p: { xs: 1.5, md: 2.5 },
                                    borderRadius: '28px',
                                    border: '1px solid rgba(0,0,0,0.05)',
                                    background: '#FFFFFF',
                                    boxShadow: '0 12px 48px rgba(0,0,0,0.04)',
                                    minHeight: 'calc(100vh - 280px)',
                                    overflow: 'hidden'
                                }}
                            >
                                <Outlet />
                            </Paper>
                        </Fade>
                    </Box>
                </Container>
            </Box>

            {/* Floating Action Button (New Order) */}
            <Tooltip title="Create New Order" placement="left">
                <Fab
                    color="primary"
                    aria-label="add"
                    onClick={() => navigate('/new-order')}
                    sx={{
                        position: 'fixed',
                        bottom: { xs: 20, md: 40 },
                        right: { xs: 20, md: 40 },
                        bgcolor: 'primary.main',
                        '&:hover': {
                            bgcolor: 'accent.dark',
                            transform: 'scale(1.1)',
                        },
                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        boxShadow: '0 8px 32px rgba(0, 140, 255, 0.4)',
                        zIndex: 1000
                    }}
                >
                    <Icon icon="lucide:plus" style={{ fontSize: '28px', color: 'white' }} />
                </Fab>
            </Tooltip>
        </Box>
    );
};

export default MainLayout;
