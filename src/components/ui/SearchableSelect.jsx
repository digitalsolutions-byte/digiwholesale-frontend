import React from 'react';
import { Autocomplete, TextField, InputAdornment, Box, alpha, useTheme } from '@mui/material';

const SearchableSelect = ({
    label,
    options = [],
    value,
    onChange,
    placeholder = 'Search & select...',
    error,
    containerClassName = "",
    icon,
    name,
    loading = false,
    onSearch,
    ...props
}) => {
    const theme = useTheme();
    const accentColor = theme.palette.accent.main;
    const isObjectValue = value && typeof value === 'object' && value !== null;
    const actualValue = isObjectValue ? value.value : value;
    const actualLabel = isObjectValue ? value.label : undefined;

    return (
        <Box sx={{ width: '100%' }} className={`${containerClassName} `}>
            <Autocomplete
                id={name}
                options={options}
                getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    return option?.label || '';
                }}
                value={options.find(opt => opt.value === actualValue) || (actualValue ? { value: actualValue, label: actualLabel || actualValue } : null)}
                loading={loading}
                disablePortal
                fullWidth
                onInputChange={(event, newInputValue, reason) => {
                    if (reason === 'input' || reason === 'clear') {
                        if (onSearch) onSearch(newInputValue);
                    }
                }}
                filterOptions={onSearch ? (x) => x : undefined}
                onChange={(event, newValue) => {
                    let val = '';
                    let label = '';
                    if (newValue) {
                        if (typeof newValue === 'string') {
                            val = newValue;
                            label = newValue;
                        } else {
                            val = newValue.value;
                            label = newValue.label;
                        }
                    }
                    if (onChange) {
                        onChange({
                            target: {
                                name,
                                value: val
                            }
                        });
                    }
                }}
                slotProps={{
                    paper: {
                        sx: {
                            mt: 1,
                            borderRadius: '16px',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                            border: '1px solid rgba(0, 0, 0, 0.05)',
                            '& .MuiAutocomplete-listbox': {
                                padding: '8px',
                                '& .MuiAutocomplete-option': {
                                    borderRadius: '8px',
                                    margin: '2px 0',
                                    fontSize: '0.9rem',
                                    fontWeight: 500,
                                    padding: '10px 14px',
                                    transition: 'all 0.2s ease',
                                    '&[aria-selected="true"]': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.15),
                                        color: theme.palette.primary.dark,
                                        fontWeight: 600,
                                    },
                                    '&.Mui-focused': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                    },
                                    '&:hover': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                                    },
                                },
                            },
                        },
                    },
                }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label={label}
                        placeholder={placeholder}
                        error={!!error}
                        helperText={error ? error.message : null}
                        variant="outlined"
                        className='cursor-pointer'
                        InputLabelProps={{
                            shrink: true,
                        }}
                        InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                                <>
                                    {params.InputProps.endAdornment}
                                    {icon && (
                                        <InputAdornment position="end" sx={{ mr: 1 }}>
                                            {icon}
                                        </InputAdornment>
                                    )}
                                </>
                            ),
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                bgcolor: alpha(theme.palette.primary.main, 0.02),
                                '& fieldset': {
                                    borderColor: alpha(theme.palette.primary.main, 0.1),
                                },
                                '&:hover fieldset': {
                                    borderColor: accentColor,
                                },
                            },
                            '& .MuiInputLabel-root': {
                                fontWeight: 700,
                                fontSize: '0.9rem',
                            }
                        }}
                    />
                )}
                {...props}
            />
        </Box>
    );
};

export default SearchableSelect;


