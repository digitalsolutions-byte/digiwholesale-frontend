import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { PATHS } from '../../routes/paths';

export const VENDOR_TAB_GROUPS = {
    DIRECTORY: [
        { label: 'Vendor Directory', path: PATHS.VENDOR.LIST, icon: 'lucide:users' },
        { label: 'Add Vendor', path: PATHS.VENDOR.ADD, icon: 'lucide:user-plus' },
    ],
    PURCHASES_INWARD: [
        { label: 'Purchase Orders', path: PATHS.VENDOR.PURCHASE_ITEMS, icon: 'lucide:shopping-bag' },
        { label: 'Pending Inward', path: PATHS.VENDOR.PENDING_INWARD, icon: 'lucide:clock' },
        { label: 'All Inwarded Items', path: PATHS.VENDOR.ALL_INWARDED_ITEMS, icon: 'lucide:package-check' },
    ],
    QC: [
        { label: 'QC Pending', path: PATHS.VENDOR.QC_PENDING, icon: 'lucide:shield-alert' },
        { label: 'QC Passed', path: PATHS.VENDOR.QC_PASSED, icon: 'lucide:shield-check' },
        { label: 'QC Failed (Awaiting Replacement)', path: PATHS.VENDOR.PURCHASE_RETURNS, icon: 'lucide:shield-x' },
    ],
    REPLACEMENTS_LOSSES: [
        { label: 'Replacement Orders', path: PATHS.VENDOR.REPLACEMENT_ORDERS, icon: 'lucide:repeat' },
        { label: 'Damaged Items', path: PATHS.VENDOR.DAMAGED_ITEMS, icon: 'lucide:alert-triangle' },
        { label: 'Shrinkage Items', path: PATHS.VENDOR.SHRINKAGE_ITEMS, icon: 'lucide:trending-down' },
    ],
};

const VendorTabNav = ({ groupKey, activePath }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = VENDOR_TAB_GROUPS[groupKey] || [];
    const currentPath = activePath || location.pathname;

    return (
        <div className="w-full bg-slate-50/90 border border-slate-200/80 p-1.5 mb-5 rounded-2xl shadow-xs">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => {
                    const isActive = currentPath === tab.path || (tab.path === PATHS.VENDOR.LIST && currentPath.includes('/vendor/list'));
                    return (
                        <button
                            key={tab.path}
                            type="button"
                            onClick={() => navigate(tab.path)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
                                isActive
                                    ? 'bg-[#2980B9] text-white shadow-sm ring-2 ring-[#2980B9]/20'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 bg-white/40 border border-transparent'
                            }`}
                        >
                            {tab.icon && <Icon icon={tab.icon} className={`text-base ${isActive ? 'text-white' : 'text-slate-400'}`} />}
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default VendorTabNav;
