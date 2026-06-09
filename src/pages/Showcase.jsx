import React from 'react';
import {
    Box,
    Container,
    Typography,
    Button,
    Grid,
    Stack,
    IconButton,
    Paper,
    alpha
} from '@mui/material';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

const Showcase = () => {
    // Neumorphic Design Tokens based on light blue background
    const bg = '#E6EEF8';
    const shadowLight = 'rgba(255, 255, 255, 0.8)';
    const shadowDark = 'rgba(180, 195, 215, 0.7)';
    const primaryBlue = '#2980B9';
    const textPrimary = '#3D4852';
    const textMuted = '#6B7280';

    const neumorphicStyles = {
        extruded: {
            bgcolor: bg,
            borderRadius: '32px',
            boxShadow: `9px 9px 16px ${shadowDark}, -9px -9px 16px ${shadowLight}`,
            transition: 'all 0.3s ease-out',
            border: 'none'
        },
        extrudedHover: {
            boxShadow: `12px 12px 20px ${shadowDark}, -12px -12px 20px ${shadowLight}`,
            transform: 'translateY(-2px)'
        },
        inset: {
            bgcolor: bg,
            borderRadius: '16px',
            boxShadow: `inset 6px 6px 10px ${shadowDark}, inset -6px -6px 10px ${shadowLight}`,
            border: 'none'
        },
        insetDeep: {
            bgcolor: bg,
            borderRadius: '24px',
            boxShadow: `inset 10px 10px 20px ${shadowDark}, inset -10px -10px 20px ${shadowLight}`,
            border: 'none'
        }
    };

    const FeatureCard = ({ icon, title, description }) => (
        <Box
            sx={{
                ...neumorphicStyles.extruded,
                p: 5,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                '&:hover': neumorphicStyles.extrudedHover
            }}
        >
            <Box
                sx={{
                    ...neumorphicStyles.insetDeep,
                    width: 64,
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: primaryBlue
                }}
            >
                <Icon icon={icon} style={{ fontSize: '32px' }} />
            </Box>
            <Box>
                <Typography
                    variant="h5"
                    sx={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 700,
                        color: textPrimary,
                        mb: 1
                    }}
                >
                    {title}
                </Typography>
                <Typography
                    variant="body1"
                    sx={{
                        fontFamily: "'DM Sans', sans-serif",
                        color: textMuted,
                        lineHeight: 1.6
                    }}
                >
                    {description}
                </Typography>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ bgcolor: bg, minHeight: '100vh', pb: 10 }}>
            {/* Navigation */}
            <Box
                sx={{
                    py: 3,
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    backdropFilter: 'blur(8px)',
                    bgcolor: alpha(bg, 0.8)
                }}
            >
                <Container maxWidth="lg">
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <img src={logo} alt="DigiOptics" style={{ height: '50px' }} />
                        <Stack direction="row" spacing={3} alignItems="center">
                            <Button
                                component={Link}
                                to="/login"
                                sx={{
                                    ...neumorphicStyles.extruded,
                                    borderRadius: '16px',
                                    px: 4,
                                    py: 1.5,
                                    color: primaryBlue,
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    '&:hover': neumorphicStyles.extrudedHover,
                                    '&:active': neumorphicStyles.inset
                                }}
                            >
                                Sign In
                            </Button>
                        </Stack>
                    </Stack>
                </Container>
            </Box>

            {/* Hero Section */}
            <Container maxWidth="lg" sx={{ py: { xs: 8, md: 15 }, position: 'relative' }}>
                {/* Background Decorations */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: '10%',
                        left: '-5%',
                        width: 300,
                        height: 300,
                        ...neumorphicStyles.insetDeep,
                        borderRadius: '50%',
                        zIndex: -1,
                        opacity: 0.3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <Box sx={{ ...neumorphicStyles.extruded, width: '60%', height: '60%', borderRadius: '50%' }} />
                </Box>

                <Grid container spacing={8} alignItems="center">
                    <Grid item xs={12} md={7}>
                        <Box sx={{ position: 'relative' }}>
                            <Typography
                                variant="overline"
                                sx={{
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    fontWeight: 800,
                                    color: primaryBlue,
                                    letterSpacing: '0.2em',
                                    mb: 2,
                                    display: 'block'
                                }}
                            >
                                INTRODUCING DIGIOPTICS 2.0
                            </Typography>
                            <Typography
                                variant="h1"
                                sx={{
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    fontWeight: 800,
                                    fontSize: { xs: '3.5rem', md: '5rem' },
                                    color: textPrimary,
                                    lineHeight: 1,
                                    letterSpacing: '-0.05em',
                                    mb: 4
                                }}
                            >
                                Precision <br />
                                <span style={{ color: primaryBlue }}>Redefined.</span>
                            </Typography>
                            <Typography
                                variant="h5"
                                sx={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    color: textMuted,
                                    mb: 6,
                                    maxWidth: '90%',
                                    fontWeight: 400,
                                    lineHeight: 1.6,
                                    fontSize: '1.25rem'
                                }}
                            >
                                A tactical ecosystem for optical wholesalers. Experience software that feels as premium as the products you manage.
                            </Typography>
                            <Stack direction="row" spacing={3} alignItems="center">
                                <Button
                                    component={Link}
                                    to="/login"
                                    sx={{
                                        bgcolor: primaryBlue,
                                        color: 'white',
                                        px: 6,
                                        py: 2.5,
                                        borderRadius: '20px',
                                        fontWeight: 700,
                                        fontSize: '1.1rem',
                                        textTransform: 'none',
                                        boxShadow: `8px 8px 24px ${alpha(primaryBlue, 0.4)}, -8px -8px 24px ${shadowLight}`,
                                        '&:hover': {
                                            bgcolor: alpha(primaryBlue, 0.9),
                                            transform: 'translateY(-3px)',
                                            boxShadow: `12px 12px 30px ${alpha(primaryBlue, 0.5)}, -12px -12px 30px ${shadowLight}`,
                                        },
                                        '&:active': {
                                            transform: 'translateY(1px)',
                                            boxShadow: 'inset 4px 4px 10px rgba(0,0,0,0.2)'
                                        }
                                    }}
                                >
                                    Enter Platform
                                </Button>
                                <Box
                                    sx={{
                                        ...neumorphicStyles.extruded,
                                        width: 64,
                                        height: 64,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        '&:hover': neumorphicStyles.extrudedHover
                                    }}
                                >
                                    <Icon icon="lucide:play" style={{ color: primaryBlue, fontSize: '28px', marginLeft: '4px' }} />
                                </Box>
                            </Stack>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={5}>
                        <Box
                            sx={{
                                ...neumorphicStyles.extruded,
                                p: 3,
                                borderRadius: '48px',
                                position: 'relative',
                                animation: 'float 6s ease-in-out infinite',
                                '@keyframes float': {
                                    '0%, 100%': { transform: 'translateY(0) rotate(0)' },
                                    '50%': { transform: 'translateY(-30px) rotate(2deg)' }
                                }
                            }}
                        >
                            <Box
                                sx={{
                                    ...neumorphicStyles.insetDeep,
                                    p: 4,
                                    borderRadius: '40px',
                                    height: 450,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    position: 'relative'
                                }}
                            >
                                {/* Concentric circles inside */}
                                <Box sx={{ ...neumorphicStyles.extruded, width: 300, height: 300, borderRadius: '50%', opacity: 0.1, position: 'absolute' }} />
                                <Box sx={{ ...neumorphicStyles.inset, width: 200, height: 200, borderRadius: '50%', opacity: 0.1, position: 'absolute' }} />

                                <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                                    <Box
                                        sx={{
                                            ...neumorphicStyles.extruded,
                                            width: 140,
                                            height: 140,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            mb: 3,
                                            mx: 'auto',
                                            borderRadius: '50%',
                                            transform: 'scale(1.1)'
                                        }}
                                    >
                                        <Icon icon="lucide:sparkles" style={{ fontSize: '64px', color: primaryBlue }} />
                                    </Box>
                                    <Typography variant="h5" sx={{ fontWeight: 800, color: textPrimary, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                        Tactile Control
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: textMuted }}>Version 2.0.4 - Stable</Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Grid>
                </Grid>
            </Container>

            {/* Features Section */}
            <Container maxWidth="lg" sx={{ py: 10 }}>
                <Box sx={{ textAlign: 'center', mb: 10 }}>
                    <Typography
                        variant="h2"
                        sx={{
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontWeight: 800,
                            color: textPrimary,
                            mb: 2
                        }}
                    >
                        Molded for Excellence
                    </Typography>
                    <Typography variant="h6" sx={{ color: textMuted, fontWeight: 400 }}>
                        Every pixel is crafted to provide a tangible, intuitive experience.
                    </Typography>
                </Box>

                <Grid container spacing={6}>
                    <Grid item xs={12} md={4}>
                        <FeatureCard
                            icon="lucide:shield-check"
                            title="Advanced QC"
                            description="Multi-stage quality checks integrated into your workflow, ensuring zero-defect dispatches."
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <FeatureCard
                            icon="lucide:bar-chart-3"
                            title="Smart Insights"
                            description="Real-time analytics and predictive reporting to stay ahead of market demands."
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <FeatureCard
                            icon="lucide:truck"
                            title="Fluid Logistics"
                            description="Automated dispatch and shipment tracking from warehouse to customer doorstep."
                        />
                    </Grid>
                </Grid>
            </Container>

            {/* Newsletter / CTA */}
            <Container maxWidth="md" sx={{ py: 10 }}>
                <Box
                    sx={{
                        ...neumorphicStyles.extruded,
                        p: { xs: 4, md: 8 },
                        textAlign: 'center'
                    }}
                >
                    <Typography variant="h4" sx={{ fontWeight: 800, color: textPrimary, mb: 2 }}>
                        Stay in the Loop
                    </Typography>
                    <Typography variant="body1" sx={{ color: textMuted, mb: 4 }}>
                        Get the latest updates on our product evolution.
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
                        <Box
                            component="input"
                            placeholder="Enter your email"
                            sx={{
                                ...neumorphicStyles.inset,
                                border: 'none',
                                outline: 'none',
                                px: 3,
                                py: 2,
                                width: { xs: '100%', sm: 300 },
                                fontFamily: "'DM Sans', sans-serif",
                                color: textPrimary,
                                '&::placeholder': { color: alpha(textMuted, 0.5) }
                            }}
                        />
                        <Button
                            sx={{
                                ...neumorphicStyles.extruded,
                                borderRadius: '16px',
                                px: 4,
                                py: 1.5,
                                bgcolor: primaryBlue,
                                color: 'white',
                                fontWeight: 700,
                                textTransform: 'none',
                                '&:hover': {
                                    bgcolor: alpha(primaryBlue, 0.9),
                                    ...neumorphicStyles.extrudedHover
                                }
                            }}
                        >
                            Subscribe
                        </Button>
                    </Stack>
                </Box>
            </Container>
        </Box>
    );
};

export default Showcase;
