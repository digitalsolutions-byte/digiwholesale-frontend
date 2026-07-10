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
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const theme = useTheme();

    const validationSchema = Yup.object({
        loginId: Yup.string().required('Email or Username is required'),
        password: Yup.string().required('Password is required'),
    });

    const formik = useFormik({
        initialValues: { loginId: '', password: '' },
        validationSchema: validationSchema,
        onSubmit: async (values) => {
            try {
                const response = await loginUser({ loginId: values.loginId, password: values.password });
                if (response.success) {
                    dispatch(setCredentials({
                        user: response.data.user,
                        token: response.data.tokens.accessToken,
                        refreshToken: response.data.tokens.refreshToken
                    }));
                    toast.success('Login Successful');
                    navigate(PATHS.WELCOME, { state: { from: 'login' } });
                } else {
                    toast.error(response.message || 'Login failed');
                }
            } catch (err) {
                toast.error(err.message || 'An error occurred during login');
            }
        },
    });

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', backgroundImage: "radial-gradient(circle, #e8e4dc 1px, transparent 1px)", backgroundSize: " 28px 28px" }}>
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
                        <Box sx={{ position: 'absolute', inset: 0, }} />

                        {/* Speech Bubble */}
                        <Box
                            sx={{
                                position: 'absolute',
                                bottom: '10%',
                                right: '57%',
                                bgcolor: 'white',
                                p: 2,
                                borderRadius: '24px 24px 24px 0',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                                zIndex: 10,
                                maxWidth: '80%'
                            }}
                        >
                            <Typography variant="h6" fontWeight={500} color="primary.main">
                                Hello!
                            </Typography>
                            {/* <Typography variant="body2" fontWeight={600} color="text.secondary">
                                We've been expecting you.
                            </Typography> */}
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
                            p: { xs: 4, md: 8 },
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                        }}
                    >
                        <Box sx={{ mb: 6, textAlign: 'center' }}>
                            <img src={logo} className='mx-auto' alt="Logo" style={{ height: '170px', marginBottom: '4px' }} />

                        </Box>

                        <Stack component="form" onSubmit={formik.handleSubmit} spacing={3}>
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
                                sx={{ py: 2 }}
                            >
                                {formik.isSubmitting ? 'Loading...' : 'Login'}
                            </Button>
                        </Stack>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
};

export default Login;


