import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Typography, Paper, Stack, alpha, useTheme } from '@mui/material';
import logo from '../../assets/logo.svg';
import futuristicBg from '../../assets/futuristic-bg.png';

const AuthLayout = () => {
    const theme = useTheme();

    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: '#121212',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Background Glows */}
            <Box
                sx={{
                    position: 'absolute',
                    top: -200,
                    right: -200,
                    width: 600,
                    height: 600,
                    bgcolor: alpha(theme.palette.accent.main, 0.15),
                    borderRadius: '50%',
                    filter: 'blur(150px)',
                    zIndex: 0
                }}
            />

            {/* Header */}
            <Box
                component="header"
                sx={{
                    position: 'relative',
                    zIndex: 20,
                    px: { xs: 3, md: 6 },
                    py: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(10px)'
                }}
            >
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            bgcolor: 'accent.main',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 8px 24px ${alpha(theme.palette.accent.main, 0.4)}`,
                            transform: 'rotate(-5deg)'
                        }}
                    >
                        <img src={logo} alt="Logo" style={{ height: '34px', filter: 'brightness(0) invert(1)' }} />
                    </Box>
                    <Typography
                        variant="h5"
                        sx={{
                            color: 'white',
                            fontWeight: 900,
                            letterSpacing: '-0.5px',
                            textTransform: 'uppercase',
                            fontStyle: 'italic'
                        }}
                    >
                        Digi<Box component="span" sx={{ color: 'accent.main' }}>Optics</Box>
                    </Typography>
                </Stack>

                <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 3 }}>
                    <Box sx={{ h: 2, w: 60, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }} />
                    <Typography
                        variant="caption"
                        sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800, letterSpacing: '4px', textTransform: 'uppercase' }}
                    >
                        Enterprise System v5.0
                    </Typography>
                </Box>
            </Box>

            {/* Main Content */}
            <Box component="main" sx={{ flexGrow: 1, display: 'flex', position: 'relative' }}>
                {/* Left Side: Visuals */}
                <Box
                    sx={{
                        display: { xs: 'none', md: 'flex' },
                        width: '50%',
                        position: 'relative',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 6
                    }}
                >
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '20%',
                            left: '-10%',
                            width: 500,
                            height: 500,
                            bgcolor: alpha(theme.palette.accent.main, 0.08),
                            borderRadius: '50%',
                            filter: 'blur(120px)'
                        }}
                    />

                    <Box sx={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 600 }}>
                        <Box
                            component="img"
                            src={futuristicBg}
                            alt="Futuristic Optics"
                            sx={{
                                width: '100%',
                                height: 'auto',
                                borderRadius: '40px',
                                boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
                                transform: 'perspective(1000px) rotateY(-5deg) rotateX(2deg)',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}
                        />
                        <Paper
                            elevation={24}
                            sx={{
                                position: 'absolute',
                                bottom: -30,
                                left: 40,
                                p: 4,
                                borderRadius: '24px',
                                background: 'rgba(20, 20, 20, 0.8)',
                                backdropFilter: 'blur(20px)',
                                borderLeft: `6px solid ${theme.palette.accent.main}`,
                                border: '1px solid rgba(255,255,255,0.05)',
                                maxWidth: 380
                            }}
                        >
                            <Typography variant="h5" color="white" fontWeight={900} gutterBottom>
                                Precision Lens Manufacturing
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500, lineHeight: 1.6 }}>
                                Advanced AI-powered ERP for modern optical labs. Scale your production with intelligent workflow automation.
                            </Typography>
                        </Paper>
                    </Box>
                </Box>

                {/* Right Side: Form */}
                <Box
                    sx={{
                        width: { xs: '100%', md: '50%' },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 4,
                        position: 'relative'
                    }}
                >
                    <Box sx={{ position: 'absolute', inset: 0, bgcolor: alpha(theme.palette.accent.main, 0.02), blur: '100px', pointerEvents: 'none' }} />

                    <Box sx={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 10 }}>
                        <Paper
                            elevation={24}
                            sx={{
                                p: { xs: 4, md: 6 },
                                borderRadius: '48px',
                                background: 'rgba(26, 26, 26, 0.6)',
                                backdropFilter: 'blur(25px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 50px 100px rgba(0,0,0,0.5)',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Decorative corner */}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: -20,
                                    right: -20,
                                    width: 100,
                                    height: 100,
                                    bgcolor: 'accent.main',
                                    transform: 'rotate(45deg)',
                                    opacity: 0.1
                                }}
                            />

                            <Outlet />
                        </Paper>
                    </Box>
                </Box>
            </Box>

            {/* Footer */}
            <Box
                component="footer"
                sx={{
                    position: 'relative',
                    zIndex: 20,
                    px: 6,
                    py: 3,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(10px)'
                }}
            >
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.2)', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    © 2026 DigiOptics Industrial. All Rights Reserved.
                </Typography>
                <Stack direction="row" spacing={4}>
                    {['Privacy', 'Terms', 'Support'].map((link) => (
                        <Typography
                            key={link}
                            variant="caption"
                            sx={{
                                color: 'rgba(255,255,255,0.2)',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'color 0.2s',
                                '&:hover': { color: 'accent.main' }
                            }}
                        >
                            {link}
                        </Typography>
                    ))}
                </Stack>
            </Box>
        </Box>
    );
};

export default AuthLayout;
