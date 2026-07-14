import React, { useState } from 'react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import logo from '../assets/logo.png';
import loginImage from '../assets/login-image.png';
import { Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { employeeForgotPassword, customerForgotPassword } from '../services/authService';
import { PATHS } from '../routes/paths';

const ForgotPassword = ({ type = 'employee' }) => {
    const [submitted, setSubmitted] = useState(false);
    const isCustomer = type === 'customer';

    const formik = useFormik({
        initialValues: { email: '' },
        validationSchema: Yup.object({
            email: Yup.string().email('Enter a valid email').required('Email is required'),
        }),
        onSubmit: async (values, { setSubmitting }) => {
            try {
                const fn = isCustomer ? customerForgotPassword : employeeForgotPassword;
                const res = await fn(values.email);
                if (res?.success === false) {
                    const code = res?.error?.code;
                    const msg = res?.error?.message || 'Something went wrong. Please try again.';
                    if (code === 'USER_NOT_FOUND') {
                        toast.error('No account found with that email address.');
                    } else {
                        toast.error(msg);
                    }
                    return;
                }
                setSubmitted(true);
            } catch (err) {
                const code = err?.error?.code;
                const msg = err?.error?.message || err?.message || 'Something went wrong. Please try again.';
                if (code === 'USER_NOT_FOUND') {
                    toast.error('No account found with that email address.');
                } else {
                    toast.error(msg);
                }
            } finally {
                setSubmitting(false);
            }
        },
    });

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <div className="rounded-3xl shadow-2xl overflow-hidden max-w-5xl w-full flex flex-col md:flex-row min-h-[500px]">

                {/* Left Side - Image */}
                <div className="w-full md:w-1/2 relative">
                    <img
                        src={loginImage}
                        alt="DigiWholesale"
                        className="absolute inset-0 w-full h-full rounded-3xl object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
                    {isCustomer && (
                        <div className="absolute bottom-8 left-8 text-white z-10">
                            <h2 className="text-3xl font-black mb-2">Customer Portal</h2>
                            <p className="text-amber-100 font-medium">Reset your customer account password.</p>
                        </div>
                    )}
                </div>

                {/* Right Side - Form */}
                <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white">
                    <div className="flex justify-center mb-8">
                        <img src={logo} alt="DigiOptics" className="h-16 object-contain" />
                    </div>

                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Forgot Password</h1>
                        <p className="text-sm text-gray-400 mt-1">
                            {isCustomer ? 'Enter your business email to receive a reset link.' : 'Enter your email to receive a reset link.'}
                        </p>
                    </div>

                    {submitted ? (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                                <svg className="w-8 h-8 text-erp-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <p className="text-gray-700 font-medium">Check your inbox.</p>
                            <p className="text-gray-500 text-sm">A reset link has been sent to your email. The link is valid for 30 minutes.</p>
                            <Link
                                to={isCustomer ? PATHS.CUSTOMER_LOGIN : PATHS.LOGIN}
                                className="inline-block text-erp-accent hover:underline text-sm mt-2"
                            >
                                Back to Login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={formik.handleSubmit} className="space-y-6">
                            <Input
                                label={isCustomer ? 'Business Email' : 'Email Address'}
                                name="email"
                                type="email"
                                placeholder={isCustomer ? 'Enter your business email' : 'Enter your email address'}
                                value={formik.values.email}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                error={formik.touched.email && formik.errors.email ? { message: formik.errors.email } : null}
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
                                        Sending...
                                    </>
                                ) : 'Send Reset Link'}
                            </Button>

                            <div className="text-center">
                                <Link
                                    to={isCustomer ? PATHS.CUSTOMER_LOGIN : PATHS.LOGIN}
                                    className="text-erp-accent text-sm hover:underline"
                                >
                                    Back to Login
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;


