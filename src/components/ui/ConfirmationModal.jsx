import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import Button from './Button';

const ConfirmationModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = "Are you sure?", 
    message = "This action cannot be undone.", 
    confirmText = "Delete", 
    cancelText = "Cancel", 
    type = "danger", // danger, warning, info
    loading = false,
    children
}) => {
    if (!isOpen) return null;

    const themes = {
        danger: {
            icon: "mdi:alert-circle",
            color: "text-red-500",
            bg: "bg-red-50",
            button: "bg-red-500 hover:bg-red-600 shadow-red-500/30"
        },
        warning: {
            icon: "mdi:alert-outline",
            color: "text-erp-accent",
            bg: "bg-erp-accent/5",
            button: "bg-erp-accent hover:bg-amber-600 shadow-erp-accent/30"
        },
        info: {
            icon: "mdi:information-outline",
            color: "text-blue-500",
            bg: "bg-blue-50",
            button: "bg-blue-500 hover:bg-blue-600 shadow-blue-500/30"
        }
    };

    const theme = themes[type] || themes.danger;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
            <div 
                className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-[92vw] sm:max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-5 sm:p-8 pb-6 flex flex-col items-center text-center">
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 ${theme.bg} rounded-2xl flex items-center justify-center mb-4 sm:mb-5 shadow-xs`}>
                        <Icon icon={theme.icon} className={`text-3xl sm:text-4xl ${theme.color}`} />
                    </div>
                    
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight mb-1.5">
                        {title}
                    </h2>
                    
                    <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed px-1 sm:px-4">
                        {message}
                    </p>
                    
                    {children && (
                        <div className="w-full mt-4 sm:mt-5 text-left">
                            {children}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 p-4 sm:p-6 pt-0">
                    <button 
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 py-2.5 px-4 text-xs sm:text-sm font-semibold rounded-xl text-white transition-all focus:outline-none flex items-center justify-center gap-2 ${theme.button} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading && <Icon icon="mdi:loading" className="animate-spin text-lg" />}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmationModal;


