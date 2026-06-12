import React from 'react';

/**
 * A reusable toggle/switch component for binary options (e.g., Single/Both, Yes/No).
 */
const CustomToggle = ({
    options = [],
    value,
    onChange,
    label,
    containerClassName = "",
    disabled = false
}) => {
    return (
        <div className={`space-x-2 flex items-center ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${containerClassName}`}>
            {label && (
                <label className="block text-xs whitespace-nowrap font-black uppercase tracking-widest text-erp-accent  px-1">
                    {label}
                </label>
            )}
            <div className="flex bg-gray-100/80 p-1 w-full rounded-2xl border border-gray-200/50">
                {options.map((option) => {
                    const isActive = value === option.value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => !disabled && onChange(option.value)}
                            disabled={disabled}
                            className={`flex-1 py-2.5 px-4 rounded-xl whitespace-nowrap text-xs font-black uppercase transition-all duration-300 ${disabled ? 'cursor-not-allowed' : ''} ${isActive
                                ? 'bg-erp-accent text-white shadow-lg shadow-orange-500/20 scale-[1.02]'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'
                                }`}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default CustomToggle;


