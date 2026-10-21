import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from '@iconify/react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';

import {
    Box,
    Typography,
    Stack,
    useTheme,
    alpha,
    IconButton,
    Container,
    Paper
} from '@mui/material';
import { loginUser } from '../services/authService';
import { setCredentials } from '../store/slices/authSlice';
import { PATHS } from '../routes/paths';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

// Assets
import loginImage from '../assets/login-image.png';
import mascot from '../assets/login-mascot.gif';
import logo from '../assets/logo.png';

const Login = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [subscriptionExpiredMessage, setSubscriptionExpiredMessage] = useState(null);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const theme = useTheme();

    // Check if user was redirected from an expired active session
    useEffect(() => {
        const storedMsg = sessionStorage.getItem('digioptics_expired_login_message');
        if (storedMsg) {
            setSubscriptionExpiredMessage(storedMsg);
            sessionStorage.removeItem('digioptics_expired_login_message');
        }
    }, []);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Hi, Good morning';
        if (hour < 18) return 'Hi, Good afternoon';
        return 'Hi, Good evening';
    }, []);

    const validationSchema = Yup.object({
        loginId: Yup.string().required('Email or Username is required'),
        password: Yup.string().required('Password is required'),
    });

    const formik = useFormik({
        initialValues: { loginId: '', password: '' },
        validationSchema: validationSchema,
        onSubmit: async (values) => {
            try {
                setSubscriptionExpiredMessage(null);
                const response = await loginUser({ loginId: values.loginId, password: values.password });
                if (response.success) {
                    dispatch(setCredentials({
                        user: response.data.user,
                        tenant: response.data.tenant,
                        token: response.data.tokens?.accessToken,
                        refreshToken: response.data.tokens?.refreshToken
                    }));
                    localStorage.removeItem('digioptics_demo_acknowledged');
                    sessionStorage.removeItem('digioptics_login_expiry_dismissed');

                    if (response.data?.tenant?.demoMode || response.data?.tenant?.featureFlags?.demoMode || response.data?.user?.demoMode) {
                        localStorage.setItem('digioptics_demo_mode', 'true');
                    } else {
                        localStorage.removeItem('digioptics_demo_mode');
                    }

                    toast.success('Login Successful');
                    navigate(PATHS.WELCOME, { state: { from: 'login' } });
                } else {
                    toast.error(response.message || 'Login failed');
                }
            } catch (err) {
                const errMsg = err.message || 'An error occurred during login';
                if (errMsg.toLowerCase().includes('expired') || err.response?.data?.error?.code === 'SUBSCRIPTION_EXPIRED') {
                    setSubscriptionExpiredMessage(errMsg);
                }
                toast.error(errMsg);
            }
        },
    });

    return (
        <>
        <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: "radial-gradient(circle, #e8e4dc 1px, transparent 1px)",
            backgroundSize: "28px 28px"
        }}>
            <Container maxWidth="lg" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: { xs: 3, sm: 6 }, px: { xs: 2, sm: 3 } }}>
                <Paper
                    elevation={0}
                    sx={{
                        display: 'flex',
                        width: '100%',
                        maxWidth: 1000,
                        minHeight: { xs: 'auto', md: 600 },
                        borderRadius: { xs: '24px', sm: '32px' },
                        overflow: 'hidden',
                        boxShadow: '0 20px 80px rgba(0,0,0,0.06)',
                        border: '1px solid rgba(0,0,0,0.05)'
                    }}
                >
                    {/* Left Side: Image & Mascot */}
                    <Box
                        sx={{
                            width: '50%',
                            display: { xs: 'none', md: 'flex' },
                            bgcolor: '#fff',
                            position: 'relative',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: 6,
                            backgroundImage: `url(${loginImage})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'top'
                        }}
                    >
                        <Box sx={{ position: 'absolute', inset: 0 }} />

                        {/* Speech Bubble */}
                        <Box
                            sx={{
                                position: 'absolute',
                                bottom: '10%',
                                right: '25%',
                                bgcolor: 'white',
                                p: 2,
                                borderRadius: '24px 24px 24px 0',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                                zIndex: 10,
                                maxWidth: '80%'
                            }}
                        >
                            <Typography variant="h6" fontWeight={500} color="primary.main">
                                {greeting}!
                            </Typography>
                        </Box>

                        <Box
                            component="img"
                            src={mascot}
                            sx={{
                                width: '50%',
                                position: 'relative',
                                zIndex: 5,
                                transform: 'translateY(200px) translateX(-180px)'
                            }}
                        />
                    </Box>

                    {/* Right Side: Form */}
                    <Box
                        sx={{
                            width: { xs: '100%', md: '50%' },
                            p: { xs: 3, sm: 5, md: 8 },
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                        }}
                    >
                        <Box sx={{ mb: { xs: 3, sm: 5 }, textAlign: 'center' }}>
                            <Box
                                component="img"
                                src={logo}
                                alt="Logo"
                                sx={{
                                    height: { xs: '100px', sm: '130px', md: '150px' },
                                    width: 'auto',
                                    mx: 'auto',
                                    display: 'block'
                                }}
                            />
                        </Box>

                        <Stack component="form" onSubmit={formik.handleSubmit} spacing={3}>
                            {subscriptionExpiredMessage && (
                                <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 space-y-2.5 animate-in fade-in duration-300">
                                    <div className="flex items-start gap-2.5">
                                        <Icon icon="lucide:lock" className="text-xl text-rose-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-wide text-rose-800">
                                                Panel Access Disabled
                                            </p>
                                            <p className="text-xs text-rose-900 font-medium leading-relaxed mt-0.5">
                                                {subscriptionExpiredMessage}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="pt-1 flex items-center gap-2 flex-wrap">
                                        <a
                                            href="https://wa.me/919876543210?text=Hi%20DigiBySR%2C%20our%20wholesaler%20subscription%20has%20expired%20and%20panel%20access%20is%20blocked.%20Please%20help%20us%20renew."
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 text-[11px] font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg inline-flex items-center gap-1 shadow-2xs transition-colors"
                                        >
                                            <Icon icon="lucide:message-circle" className="text-xs" />
                                            Renew on WhatsApp
                                        </a>
                                        <a
                                            href="tel:+919876543210"
                                            className="px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1 shadow-2xs transition-colors"
                                        >
                                            <Icon icon="lucide:phone-call" className="text-xs text-blue-600" />
                                            Call Desk
                                        </a>
                                    </div>
                                </div>
                            )}

                            <Input
                                label="Email or Username"
                                name="loginId"
                                value={formik.values.loginId}
                                onChange={formik.handleChange}
                                error={formik.touched.loginId && formik.errors.loginId ? { message: formik.errors.loginId } : null}
                            />

                            <Input
                                label="Password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                value={formik.values.password}
                                onChange={formik.handleChange}
                                error={formik.touched.password && formik.errors.password ? { message: formik.errors.password } : null}
                                icon={
                                    <IconButton onClick={() => setShowPassword(!showPassword)} size="small">
                                        <Icon icon={showPassword ? "lucide:eye-off" : "lucide:eye"} />
                                    </IconButton>
                                }
                            />

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1 }}>
                                <Typography
                                    component={Link}
                                    to="/forgot-password"
                                    variant="caption"
                                    sx={{ color: 'accent.main', textDecoration: 'none', fontWeight: 800 }}
                                >
                                    Forgot Password?
                                </Typography>
                            </Box>

                            <Button
                                type="submit"
                                variant="primary"
                                className="w-full"
                                disabled={formik.isSubmitting}
                                sx={{ py: 1.8 }}
                            >
                                {formik.isSubmitting ? 'Loading...' : 'Login'}
                            </Button>
                        </Stack>
                    </Box>
                </Paper>
                <Typography variant="h6" sx={{ mt: 3, textAlign: 'center', color: '#666', fontWeight: 400, fontSize: { xs: '0.9rem', sm: '1.15rem' }, zIndex: 1 }}>
                    India's <Box component="span" sx={{ color: '#3498db', fontWeight: 600 }}>Premier AI - Enabled</Box> Optical Software
                </Typography>
            </Container>
        </Box>
        </>
    );
};

export default Login;
