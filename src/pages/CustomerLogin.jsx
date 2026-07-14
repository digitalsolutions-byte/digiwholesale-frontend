import React, { useState } from 'react';
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
import { userCustomerLogin } from '../services/customerService';
import { setCredentials } from '../store/slices/authSlice';
import { PATHS } from '../routes/paths';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

// Assets
import loginImage from '../assets/login-image.png';
import mascot from '../assets/login-mascot.gif';
import logo from '../assets/logo.png';

const CustomerLogin = () => {
    const [showPassword, setShowPassword] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const theme = useTheme();

    const validationSchema = Yup.object({
        loginId: Yup.string().required('Customer ID or Email is required'),
        password: Yup.string().required('Password is required'),
    });

    const formik = useFormik({
        initialValues: { loginId: '', password: '' },
        validationSchema: validationSchema,
        onSubmit: async (values) => {
            try {
                const response = await userCustomerLogin({ loginId: values.loginId, password: values.password });
                if (response.success) {
                    dispatch(setCredentials({
                        user: response.data.user,
                        token: response.data.tokens.accessToken
                    }));
                    toast.success('Login Successful');
                    navigate('/customer-portal', { replace: true });
                } else {
                    toast.error(response.message || 'Login failed');
                }
            } catch (err) {
                toast.error(err.message || 'An error occurred during login');
            }
        },
    });

    return (
        <Box sx={{ 
            minHeight: '100vh', 
            display: 'flex', 
            background: 'linear-gradient(135deg, #eaf2f8 0%, #d4e6f1 100%)',
            position: 'relative'
        }}>
            <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
                <Paper
                    elevation={0}
                    sx={{
                        display: 'flex',
                        width: '100%',
                        maxWidth: 1000,
                        minHeight: 600,
                        borderRadius: '32px',
                        overflow: 'hidden',
                        boxShadow: '0 20px 80px rgba(31, 97, 141, 0.12)',
                        border: '1px solid rgba(31, 97, 141, 0.08)'
                    }}
                >
                    {/* Left Side: Image & Mascot */}
                    <Box
                        sx={{
                            width: '50%',
                            display: { xs: 'none', md: 'flex' },
                            bgcolor: '#EBF5FB',
                            position: 'relative',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: 6,
                            backgroundImage: `url(${loginImage})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        }}
                    >
                        <Box sx={{ position: 'absolute', inset: 0, right: 0 }} />
 
                        {/* Speech Bubble */}
                        <Box
                            sx={{
                                position: 'absolute',
                                top: '10%',
                                left: '10%',
                                bgcolor: 'white',
                                p: 3,
                                borderRadius: '24px 24px 24px 0',
                                boxShadow: '0 10px 30px rgba(31, 97, 141, 0.1)',
                                zIndex: 10,
                                maxWidth: '80%',
                                border: '1px solid rgba(31, 97, 141, 0.1)'
                            }}
                        >
                            <Typography variant="h6" fontWeight={800} sx={{ color: '#1f618d' }}>
                                Customer Portal
                            </Typography>
                            <Typography variant="body2" fontWeight={600} color="text.secondary">
                                Access your orders & history.
                            </Typography>
                        </Box>
 
                        <Box
                            component="img"
                            src={mascot}
                            sx={{
                                width: '80%',
                                position: 'relative',
                                zIndex: 5,
                                transform: 'translateY(149px) translateX(190px)'
                            }}
                        />
                    </Box>
 
                    {/* Right Side: Form */}
                    <Box
                        sx={{
                            width: { xs: '100%', md: '50%' },
                            p: { xs: 4, md: 8 },
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            bgcolor: '#ffffff'
                        }}
                    >
                        <Box sx={{ mb: 4, textAlign: 'center' }}>
                            <img src={logo} alt="Logo" style={{ height: '160px', marginBottom: '12px' }} className='mx-auto' />
                            <Typography variant="h5" fontWeight={800} sx={{ color: '#1f618d', mt: 1, letterSpacing: '0.03em', textTransform: 'uppercase', fontSize: '1.25rem' }}>
                                Customer Login
                            </Typography>
                        </Box>

                        <Stack component="form" onSubmit={formik.handleSubmit} spacing={3}>
                            <Input
                                label="Customer ID or Email"
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
                                    to={PATHS.CUSTOMER_FORGOT_PASSWORD}
                                    variant="caption"
                                    sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 800 }}
                                >
                                    Forgot Password?
                                </Typography>
                            </Box>

                            <Button
                                type="submit"
                                variant="primary"
                                className="w-full"
                                disabled={formik.isSubmitting}
                                sx={{ py: 2 }}
                            >
                                {formik.isSubmitting ? 'Verifying...' : 'Portal Login'}
                            </Button>
                        </Stack>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
};

export default CustomerLogin;


