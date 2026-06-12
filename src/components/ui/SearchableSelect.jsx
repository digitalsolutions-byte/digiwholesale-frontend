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
    const [inputValue, setInputValue] = React.useState('');
    const accentColor = theme.palette.accent.main;

    const isObjectValue = value && typeof value === 'object' && value !== null;
    const actualValue = isObjectValue ? value.value : value;
    const actualLabel = isObjectValue ? value.label : undefined;

    React.useEffect(() => {
        const selectedOption = options.find(opt => opt.value === actualValue);
        if (selectedOption) {
            setInputValue(selectedOption.label || '');
        } else if (actualValue) {
            setInputValue(actualLabel || (typeof actualValue === 'string' ? actualValue : ''));
        } else {
            setInputValue('');
        }
    }, [actualValue, actualLabel, options]);

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
                inputValue={inputValue}
                onInputChange={(event, newInputValue, reason) => {
                    if (reason === 'input' || reason === 'clear') {
                        setInputValue(newInputValue);
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
                    setInputValue(label);
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


