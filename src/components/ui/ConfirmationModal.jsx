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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-8 pb-10 flex flex-col items-center text-center">
                    <div className={`w-20 h-20 ${theme.bg} rounded-full flex items-center justify-center mb-6`}>
                        <Icon icon={theme.icon} className={`text-4xl ${theme.color}`} />
                    </div>
                    
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight mb-2">
                        {title}
                    </h2>
                    
                    <p className="text-gray-500 font-medium leading-relaxed px-4">
                        {message}
                    </p>
                    
                    {children && (
                        <div className="w-full mt-6 px-4">
                            {children}
                        </div>
                    )}
                </div>

                <div className="flex gap-4 p-8 pt-0">
                    <Button 
                        variant="outlined" 
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-2xl border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300"
                    >
                        {cancelText}
                    </Button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`w-full py-3 px-6 font-bold rounded-2xl text-white transition-all focus:outline-none flex items-center justify-center gap-2 ${theme.button} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading && <Icon icon="mdi:loading" className="animate-spin text-xl" />}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmationModal;


