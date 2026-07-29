import React, { forwardRef } from 'react';
import { TextField, InputAdornment, Box, alpha, useTheme, Typography } from '@mui/material';

const Input = forwardRef(({ 
    label, 
    type = 'text', 
    placeholder, 
    value, 
    onChange, 
    icon, 
    error, 
    containerClassName = "", 
    variant = "default", 
    isVerificationMode = false, 
    isRejected = false, 
    onToggleRejection, 
    name, 
    labelPlacement = "default",
    ...props 
}, ref) => {
    const theme = useTheme();
    const isOrange = variant === "orange";
    const accentColor = theme.palette.accent.main;

    // Check if the current page is one of the auth screens
    const isAuthPage = typeof window !== 'undefined' && 
        (['/login', '/customer-login', '/forgot-password', '/reset-password'].some(p => window.location.pathname.startsWith(p)));
    
    // Default to 'top' placement everywhere except on auth screens (unless explicitly overridden)
    const showLabelTop = labelPlacement === 'top' || (!isAuthPage && labelPlacement !== 'floating');

    return (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.75 }} className={containerClassName}>
            {showLabelTop && label && (
                <Typography 
                    component="label" 
                    sx={{ 
                        fontWeight: 700, 
                        fontSize: '0.825rem', // Highly readable font size
                        color: 'text.secondary', 
                        textTransform: 'uppercase', 
                        tracking: '0.05em',
                        ml: 0.5,
                        display: 'block'
                    }}
                >
                    {label}
                </Typography>
            )}
            <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {isVerificationMode && (
                    <Box
                        onClick={() => onToggleRejection?.(name)}
                        sx={{
                            width: 20,
                            height: 20,
                            minWidth: 20,
                            borderRadius: '6px',
                            border: '2px solid',
                            borderColor: isRejected ? 'error.main' : 'divider',
                            bgcolor: isRejected ? 'error.main' : 'background.paper',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            '&:hover': {
                                borderColor: isRejected ? 'error.dark' : 'accent.main',
                            }
                        }}
                    >
                        {isRejected && <Box sx={{ width: 8, height: 8, bgcolor: 'white', borderRadius: '50%' }} />}
                    </Box>
                )}
                <TextField
                    inputRef={ref}
                    fullWidth
                    label={showLabelTop ? "" : label}
                    name={name}
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder || (showLabelTop ? label?.replace('*', '') : '')}
                    error={!!error || isRejected}
                    helperText={error ? error.message : null}
                    variant="outlined"
                    InputLabelProps={{
                        shrink: true,
                    }}
                    InputProps={{
                        endAdornment: icon ? (
                            <InputAdornment position="end" sx={{ cursor: 'pointer' }}>
                                {icon}
                            </InputAdornment>
                        ) : null,
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            bgcolor: isOrange ? alpha(accentColor, 0.1) : alpha(theme.palette.primary.main, 0.02),
                            '& fieldset': {
                                borderColor: isOrange ? accentColor : alpha(theme.palette.primary.main, 0.1),
                            },
                            '&:hover fieldset': {
                                borderColor: accentColor,
                            },
                        },
                        '& .MuiInputLabel-root': {
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            transform: 'translate(14px, -9px) scale(0.75)', // Fix for shrink label positioning with custom padding
                        }
                    }}
                    {...props}
                />
            </Box>
        </Box>
    );
});

Input.displayName = 'Input';

export default Input;


