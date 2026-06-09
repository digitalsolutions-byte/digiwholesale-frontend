import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import logo from '../assets/logo.png';
import { useNavigate, useLocation } from 'react-router-dom';
import { PATHS } from '../routes/paths';
import {
    Box,
    Typography,
    Button,
    Paper,
    Fade,
    useTheme,
    alpha,
    CircularProgress,
    Stack
} from '@mui/material';

const Welcome = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const [message] = useState(() => {
        if (location.state?.from === 'register') return 'User Registered Successfully!';
        if (location.state?.from === 'customer-register') return 'Registration Complete!';
        if (location.state?.from === 'login') return 'Login Successful!';
        return 'Welcome Back!';
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            const redirectPath = location.state?.from === 'register'
                ? PATHS.STAFF.LIST
                : location.state?.from === 'customer-register'
                    ? PATHS.CUSTOMER.LIST
                    : PATHS.ROOT;
            navigate(redirectPath);
        }, 3000);

        return () => clearTimeout(timer);
    }, [navigate, location]);

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    top: -150,
                    right: -150,
                    width: 500,
                    height: 500,
                    borderRadius: '50%',
                    background: alpha(theme.palette.accent.main, 0.05),
                    filter: 'blur(100px)'
                }}
            />

            <Fade in timeout={1000}>
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 6, md: 10 },
                        borderRadius: '48px',
                        width: '100%',
                        maxWidth: 700,
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        bgcolor: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 40px 100px rgba(0,0,0,0.05)',
                        position: 'relative',
                        zIndex: 10
                    }}
                >
                    <Box sx={{ mb: 2 }}>
                        <img src={logo} alt="DigiOptics" style={{ height: '150px', objectFit: 'contain' }} />
                    </Box>

                    <Box>
                        <Typography variant="h3" color="text.primary" fontWeight={900} gutterBottom sx={{ letterSpacing: '-1px' }}>
                            {message}
                        </Typography>
                        <Typography variant="h5" color="text.secondary" fontWeight={500}>
                            Wishing You A <Box component="span" sx={{ color: 'accent.main', fontWeight: 800 }}>Great</Box> Day!
                        </Typography>
                    </Box>

                    <Stack spacing={2} alignItems="center">
                        <CircularProgress
                            size={40}
                            thickness={4}
                            sx={{ color: 'accent.main', mb: 2 }}
                        />
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>
                            Loading...
                        </Typography>
                    </Stack>

                    {location.state?.from === 'customer-register' && (
                        <Box sx={{ mt: 2, display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                            <Button
                                variant="contained"
                                onClick={() => navigate(PATHS.CUSTOMER.LIST)}
                                sx={{
                                    bgcolor: 'accent.main',
                                    '&:hover': { bgcolor: 'accent.dark' },
                                    borderRadius: '50px',
                                    px: 4,
                                    py: 1.5,
                                    fontWeight: 800
                                }}
                            >
                                View Customer List
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={() => navigate(PATHS.ROOT)}
                                sx={{
                                    borderColor: 'accent.main',
                                    color: 'accent.main',
                                    borderRadius: '50px',
                                    px: 4,
                                    py: 1.5,
                                    fontWeight: 800,
                                    '&:hover': { borderColor: 'accent.dark', bgcolor: alpha(theme.palette.accent.main, 0.05) }
                                }}
                            >
                                Go to Home
                            </Button>
                        </Box>
                    )
                    }

                </Paper>
            </Fade>
        </Box>
    );
};

export default Welcome;


