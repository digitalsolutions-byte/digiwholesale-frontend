import React, { useState, useEffect } from 'react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import logo from '../assets/logo.png';
import loginImage from '../assets/login-image.png';
import { Icon } from '@iconify/react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { employeeResetPassword, customerResetPassword } from '../services/authService';
import { PATHS } from '../routes/paths';

const ResetPasswordConfirm = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const uidb36 = searchParams.get('uidb36');
    const token = searchParams.get('token');
    const type = searchParams.get('type'); // "employee" | "customer"

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pageState, setPageState] = useState('form'); // 'form' | 'success' | 'expired' | 'invalid'

    const isCustomer = type === 'customer';
    const forgotPasswordPath = isCustomer ? PATHS.CUSTOMER_FORGOT_PASSWORD : PATHS.FORGOT_PASSWORD;
    const loginPath = isCustomer ? PATHS.CUSTOMER_LOGIN : PATHS.LOGIN;

    useEffect(() => {
        if (!uidb36 || !token || !type) {
            navigate(PATHS.FORGOT_PASSWORD, { replace: true });
        }
    }, [uidb36, token, type, navigate]);

    const formik = useFormik({
        initialValues: { password: '', confirmPassword: '' },
        validationSchema: Yup.object({
            password: Yup.string()
                .min(8, 'Password must be at least 8 characters')
                .required('New password is required'),
            confirmPassword: Yup.string()
                .oneOf([Yup.ref('password')], 'Passwords do not match')
                .required('Please confirm your password'),
        }),
        onSubmit: async (values, { setSubmitting }) => {
            try {
                const fn = isCustomer ? customerResetPassword : employeeResetPassword;
                const res = await fn({ uidb36, token, password: values.password, confirmPassword: values.confirmPassword });

                if (res.success) {
                    setPageState('success');
                    setTimeout(() => navigate(loginPath), 2500);
                } else {
                    handleErrorCode(res.error?.code, res.error?.message);
                }
            } catch (err) {
                const code = err?.error?.code;
                const msg = err?.error?.message || err?.message || 'Something went wrong.';
                handleErrorCode(code, msg);
            } finally {
                setSubmitting(false);
            }
        },
    });

    const handleErrorCode = (code, message) => {
        if (code === 'TOKEN_EXPIRED') {
            setPageState('expired');
        } else if (code === 'INVALID_TOKEN') {
            setPageState('invalid');
        } else {
            toast.error(message || 'Something went wrong. Please try again.');
        }
    };

    const renderContent = () => {
        if (pageState === 'success') {
            return (
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p className="text-gray-700 font-medium">Password reset successfully.</p>
                    <p className="text-gray-500 text-sm">Redirecting you to login...</p>
                    <Link to={loginPath} className="inline-block text-erp-accent hover:underline text-sm">
                        Go to Login now
                    </Link>
                </div>
            );
        }

        if (pageState === 'expired') {
            return (
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-erp-accent/80 rounded-full flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-erp-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-gray-700 font-medium">This link has expired.</p>
                    <p className="text-gray-500 text-sm">Reset links are valid for 30 minutes only.</p>
                    <Button onClick={() => navigate(forgotPasswordPath)} className="mx-auto">
                        Request New Link
                    </Button>
                </div>
            );
        }

        if (pageState === 'invalid') {
            return (
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <p className="text-gray-700 font-medium">This link is invalid or has already been used.</p>
                    <Button onClick={() => navigate(forgotPasswordPath)} className="mx-auto">
                        Request New Link
                    </Button>
                </div>
            );
        }

        return (
            <form onSubmit={formik.handleSubmit} className="space-y-6">
                <Input
                    label="New Password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.password && formik.errors.password ? { message: formik.errors.password } : null}
                    icon={
                        <Icon
                            icon={showPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'}
                            className="text-gray-500 w-5 h-5 cursor-pointer hover:text-erp-accent transition-colors"
                            onClick={() => setShowPassword(!showPassword)}
                        />
                    }
                />

                <Input
                    label="Confirm New Password"
                    name="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={formik.values.confirmPassword}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.confirmPassword && formik.errors.confirmPassword ? { message: formik.errors.confirmPassword } : null}
                    icon={
                        <Icon
                            icon={showConfirm ? 'mdi:eye-off-outline' : 'mdi:eye-outline'}
                            className="text-gray-500 w-5 h-5 cursor-pointer hover:text-erp-accent transition-colors"
                            onClick={() => setShowConfirm(!showConfirm)}
                        />
                    }
                />

                <Button
                    type="submit"
                    disabled={formik.isSubmitting}
                    className="mt-4 shadow-lg w-full max-w-[220px] mx-auto shadow-erp-accent/30 flex items-center justify-center gap-2"
                >
                    {formik.isSubmitting ? (
                        <>
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            Resetting...
                        </>
                    ) : 'Reset Password'}
                </Button>

                <div className="text-center">
                    <Link to={loginPath} className="text-erp-accent text-sm hover:underline">
                        Back to Login
                    </Link>
                </div>
            </form>
        );
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <div className="rounded-3xl shadow-2xl overflow-hidden max-w-5xl w-full flex flex-col md:flex-row min-h-[500px]">

                {/* Left Side - Image */}
                <div className="w-full md:w-1/2 relative">
                    <img
                        src={loginImage}
                        alt="Visual Lens"
                        className="absolute inset-0 w-full h-full rounded-3xl object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
                </div>

                {/* Right Side */}
                <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white">
                    <div className="flex justify-center mb-8">
                        <img src={logo} alt="DigiOptics" className="h-20 object-contain" />
                    </div>

                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Reset Password</h1>
                        <p className="text-sm text-gray-400 mt-1">Enter your new password below.</p>
                    </div>

                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordConfirm;


