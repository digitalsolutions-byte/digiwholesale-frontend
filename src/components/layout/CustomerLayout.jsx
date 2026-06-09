import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logOut, selectCurrentUser, setCredentials } from '../../store/slices/authSlice';
import { Icon } from '@iconify/react';
import logo from '../../assets/logo.png';
import { acceptTermsConditions } from '../../services/customerService';
import { toast } from 'react-toastify';
import GoBackButton from '../navigation/GoBackButton';
import {
    Box,
    AppBar,
    Toolbar,
    Typography,
    Button,
    Container,
    Paper,
    Avatar,
    Stack,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    useTheme,
    alpha,
    Fade
} from '@mui/material';

const CustomerLayout = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const user = useSelector(selectCurrentUser);
    const token = useSelector((state) => state.auth.token);
    const theme = useTheme();

    const [showTermsModal, setShowTermsModal] = useState(false);
    const [termsAccepting, setTermsAccepting] = useState(false);

    useEffect(() => {
        if (user && !user?.termsAndConditionsAccepted) {
            setShowTermsModal(true);
        }
    }, [user]);

    const handleLogout = () => {
        dispatch(logOut());
        navigate('/customer-login', { replace: true });
    };

    const handleAcceptTerms = async () => {
        setTermsAccepting(true);
        try {
            const res = await acceptTermsConditions();
            if (res?.success) {
                toast.success('Terms & Conditions accepted successfully');
                dispatch(setCredentials({ user: { ...user, termsAndConditionsAccepted: true }, token }));
                setShowTermsModal(false);
            } else {
                toast.error(res?.message || 'Failed to accept terms');
            }
        } catch (err) {
            toast.error(err?.message || err?.error?.message || 'Something went wrong');
        } finally {
            setTermsAccepting(false);
        }
    };

    const handleDeclineTerms = () => {
        toast.info('You must accept the Terms & Conditions to continue.');
        handleLogout();
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#FDFCFB', display: 'flex', flexDirection: 'column' }}>
            {/* Elegant Header */}
            <AppBar
                position="sticky"
                elevation={0}
                sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(12px)',
                    borderBottom: '1px solid',
                    borderColor: alpha(theme.palette.accent.main, 0.1)
                }}
            >
                <Container maxWidth="xl">
                    <Toolbar disableGutters sx={{ py: 1.5, justifyContent: 'space-between' }}>
                        <Stack direction="row" spacing={3} alignItems="center">
                            <Box
                                sx={{
                                    p: 1.2,
                                    borderRadius: '16px',
                                    bgcolor: 'white',
                                    boxShadow: '0 4px 12px rgba(255, 99, 0, 0.08)',
                                    display: 'flex',
                                    border: '1px solid rgba(255, 99, 0, 0.1)'
                                }}
                            >
                                <img src={logo} alt="DigiOptics" style={{ height: '34px' }} />
                            </Box>

                            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                                <Typography variant="caption" sx={{ color: 'accent.main', fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }}>
                                    Customer Portal
                                </Typography>
                                <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700, lineHeight: 1.2 }}>
                                    {user?.shopName || user?.ownerName || 'Welcome'}
                                </Typography>
                            </Box>
                        </Stack>

                        <Stack direction="row" spacing={2} alignItems="center">
                            <Chip
                                label={user?.customerCode || 'GUEST'}
                                size="small"
                                sx={{
                                    bgcolor: alpha(theme.palette.accent.main, 0.1),
                                    color: 'accent.main',
                                    fontWeight: 800,
                                    borderRadius: '8px'
                                }}
                            />
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={handleLogout}
                                startIcon={<Icon icon="mdi:logout" />}
                                sx={{
                                    borderRadius: '50px',
                                    borderWidth: '1.5px',
                                    px: 3,
                                    '&:hover': { borderWidth: '1.5px', bgcolor: alpha(theme.palette.error.main, 0.05) }
                                }}
                            >
                                Logout
                            </Button>
                        </Stack>
                    </Toolbar>
                </Container>
            </AppBar>

            {/* Main Content Area */}
            <Box component="main" sx={{ flexGrow: 1, py: { xs: 3, md: 5 } }}>
                <Container maxWidth="xl">
                    <Fade in timeout={800}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 1.5,
                                    borderRadius: '20px',
                                    bgcolor: 'rgba(255, 255, 255, 0.6)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255,255,255,0.8)',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                                }}
                            >
                                <GoBackButton />
                            </Paper>

                            <Paper
                                elevation={0}
                                sx={{
                                    p: { xs: 2, md: 5 },
                                    borderRadius: '32px',
                                    bgcolor: 'white',
                                    border: '1px solid rgba(255, 99, 0, 0.05)',
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.05)',
                                    minHeight: '60vh'
                                }}
                            >
                                <Outlet />
                            </Paper>
                        </Box>
                    </Fade>
                </Container>
            </Box>

            {/* Terms & Conditions Dialog */}
            <Dialog
                open={showTermsModal}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: '24px', p: 1 }
                }}
            >
                <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
                    <Typography variant="h5" fontWeight={800} color="accent.main">
                        Terms & Conditions
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Please review and accept to continue
                    </Typography>
                </DialogTitle>
                <DialogContent dividers sx={{ border: 'none', px: 4 }}>
                    <Typography variant="body2" component="div" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle1" fontWeight={700} color="text.primary">Digi-Optics Customer Agreement</Typography>
                            By accessing and using the Digi-Optics Customer Portal, you agree to be bound by the following terms and conditions.
                        </Box>

                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" fontWeight={700} color="text.primary">1. Account Responsibility</Typography>
                            You are responsible for maintaining the confidentiality of your account credentials.
                        </Box>

                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" fontWeight={700} color="text.primary">2. Order & Payment Terms</Typography>
                            All orders placed through the portal are subject to acceptance and availability.
                        </Box>
                        {/* More terms could be added here or scrollable */}
                        <Box sx={{ fontStyle: 'italic', mt: 2, p: 2, bgcolor: '#F8FAFC', borderRadius: '12px' }}>
                            Full terms and conditions apply as per company policy.
                        </Box>
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 3, justifyContent: 'center', gap: 2 }}>
                    <Button
                        onClick={handleDeclineTerms}
                        sx={{ color: 'text.secondary', fontWeight: 700 }}
                    >
                        Decline & Logout
                    </Button>
                    <Button
                        onClick={handleAcceptTerms}
                        variant="contained"
                        disabled={termsAccepting}
                        sx={{
                            bgcolor: 'accent.main',
                            '&:hover': { bgcolor: 'accent.dark' },
                            px: 5,
                            borderRadius: '50px',
                            fontWeight: 700,
                            boxShadow: '0 8px 24px rgba(255, 99, 0, 0.3)'
                        }}
                    >
                        {termsAccepting ? 'Accepting...' : 'I Accept'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CustomerLayout;


