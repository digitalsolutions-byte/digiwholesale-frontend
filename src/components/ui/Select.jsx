import React from 'react';
import { TextField, MenuItem, InputAdornment, Box, alpha, useTheme, Typography } from '@mui/material';

const Select = ({
    label,
    options = [],
    value,
    onChange,
    placeholder = 'Select option',
    error,
    containerClassName = "",
    variant = "default",
    multiple = false,
    icon,
    isVerificationMode = false,
    isRejected = false,
    onToggleRejection,
    name,
    labelPlacement = "default",
    ...props
}) => {
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
                    select
                    fullWidth
                    label={showLabelTop ? "" : label}
                    name={name}
                    value={value}
                    onChange={onChange}
                    error={!!error || isRejected}
                    helperText={error ? error.message : null}
                    variant="outlined"
                    SelectProps={{
                        multiple: multiple,
                        displayEmpty: true,
                        renderValue: (selected) => {
                            if (multiple) {
                                if (!selected || selected.length === 0) return <Box component="span" sx={{ color: 'text.secondary', opacity: 0.7 }}>{placeholder}</Box>;
                                const selectedLabels = (Array.isArray(selected) ? selected : [selected]).map(val => {
                                    const option = options.find(opt => opt.value === val);
                                    return option ? option.label : val;
                                });
                                return selectedLabels.join(', ');
                            }
                            return options.find(opt => opt.value === selected)?.label || <Box component="span" sx={{ color: 'text.secondary', opacity: 0.7 }}>{placeholder}</Box>;
                        }
                    }}
                    InputLabelProps={{
                        shrink: true,
                    }}
                    InputProps={{
                        endAdornment: icon ? (
                            <InputAdornment position="end" sx={{ mr: 2 }}>
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
                            '& .MuiSelect-select': {
                                paddingLeft: '14px',
                            },
                            '& .MuiSvgIcon-root': {
                                display: icon ? 'none' : 'block'
                            }
                        },
                        '& .MuiInputLabel-root': {
                            fontWeight: 700,
                            fontSize: '0.9rem',
                        }
                    }}
                    {...props}
                >
                    {options.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value} sx={{ fontWeight: 500 }}>
                            {opt.label}
                        </MenuItem>
                    ))}
                </TextField>
            </Box>
        </Box>
    );
};

export default Select;


