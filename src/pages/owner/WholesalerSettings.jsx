import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import { selectCurrentUser } from '../../store/slices/authSlice';
import { getTenantSettings, updateTenantSettings } from '../../services/tenantService';
import { PATHS } from '../../routes/paths';

const ToggleSwitch = ({ checked, onChange, disabled, loading }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled || loading}
        onClick={onChange}
        className={`
            relative inline-flex items-center h-7 w-[52px] rounded-full border-2 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
            ${checked
                ? 'bg-emerald-500 border-emerald-500'
                : 'bg-slate-200 border-slate-200'
            }
            ${(disabled || loading) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}
        `}
    >
        <span
            className={`
                inline-flex items-center justify-center w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300
                ${checked ? 'translate-x-[26px]' : 'translate-x-[2px]'}
            `}
        >
            {loading && (
                <Icon
                    icon="lucide:loader-2"
                    className="animate-spin text-slate-400"
                    style={{ fontSize: '12px' }}
                />
            )}
        </span>
    </button>
);

const StatusBadge = ({ active }) => (
    <span
        className={`
            inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border
            ${active
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }
        `}
    >
        <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
        {active ? 'Active' : 'Disabled'}
    </span>
);

const FeatureRow = ({ label, description, enabled, onToggle, toggling, badgeText, badgeColor }) => (
    <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">{label}</span>
                {badgeText ? (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                        {badgeText}
                    </span>
                ) : (
                    <StatusBadge active={enabled} />
                )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
        </div>
        <div className="flex-shrink-0">
            <ToggleSwitch
                checked={enabled}
                onChange={onToggle}
                disabled={false}
                loading={toggling}
            />
        </div>
    </div>
);

export default function WholesalerSettings() {
    const { id } = useParams();
    const navigate = useNavigate();
    const user = useSelector(selectCurrentUser);

    if (user?.EmployeeType !== 'PLATFORM_OWNER') {
        return <Navigate to={PATHS.UNAUTHORIZED} replace />;
    }

    const [pageLoading, setPageLoading] = useState(true);
    const [storeName, setStoreName] = useState('');
    const [tenantId, setTenantId] = useState('');
    const [flags, setFlags] = useState({ ecomFramesSunglasses: false, demoMode: false, demoExpiry: null });
    const [expiryInput, setExpiryInput] = useState('');
    const [savingExpiry, setSavingExpiry] = useState(false);
    const [toggling, setToggling] = useState({});

    useEffect(() => {
        const load = async () => {
            setPageLoading(true);
            try {
                const res = await getTenantSettings(id);
                if (res?.success && res?.data) {
                    setStoreName(res.data.storeName || 'Wholesaler');
                    setTenantId(res.data.tenantId || '');
                    const isDemoOn = Boolean(res.data.featureFlags?.demoMode || res.data.demoMode);
                    const demoExpVal = res.data.featureFlags?.demoExpiry || res.data.demoExpiry || null;
                    const fetchedFlags = { 
                        ecomFramesSunglasses: false, 
                        ...(res.data.featureFlags || {}), 
                        demoMode: isDemoOn, 
                        demoExpiry: demoExpVal 
                    };
                    setFlags(fetchedFlags);
                    
                    if (fetchedFlags.demoExpiry) {
                        const dateObj = new Date(fetchedFlags.demoExpiry);
                        if (!isNaN(dateObj.getTime())) {
                            const formatted = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                            setExpiryInput(formatted);
                        }
                    } else {
                        setExpiryInput('');
                    }
                } else {
                    toast.error('Failed to load settings.');
                }
            } catch (err) {
                toast.error(err?.message || 'Failed to load wholesaler settings.');
            } finally {
                setPageLoading(false);
            }
        };
        load();
    }, [id]);

    const handleToggle = async (flagKey) => {
        const previousValue = flags[flagKey];
        const newValue = !previousValue;

        setFlags(prev => ({ ...prev, [flagKey]: newValue }));
        setToggling(prev => ({ ...prev, [flagKey]: true }));

        try {
            const res = await updateTenantSettings(id, { [flagKey]: newValue });
            if (res?.success && res?.data?.featureFlags) {
                setFlags(prev => ({ ...prev, ...res.data.featureFlags }));
                toast.success('Feature updated successfully');
            } else {
                throw new Error(res?.message || 'Update failed');
            }
        } catch (err) {
            setFlags(prev => ({ ...prev, [flagKey]: previousValue }));
            toast.error(err?.message || 'Failed to update feature. Please try again.');
        } finally {
            setToggling(prev => ({ ...prev, [flagKey]: false }));
        }
    };

    const handleSaveExpiry = async (valueToSave = expiryInput) => {
        setSavingExpiry(true);
        try {
            const isoVal = valueToSave ? new Date(valueToSave).toISOString() : null;
            const res = await updateTenantSettings(id, { demoExpiry: isoVal });
            if (res?.success && res?.data?.featureFlags) {
                setFlags(prev => ({ ...prev, ...res.data.featureFlags }));
                if (!valueToSave) setExpiryInput('');
                toast.success(valueToSave ? 'Demo expiry date saved successfully' : 'Demo expiry cleared');
            } else {
                throw new Error(res?.message || 'Failed to update expiry');
            }
        } catch (err) {
            toast.error(err?.message || 'Failed to update demo expiry date');
        } finally {
            setSavingExpiry(false);
        }
    };

    const isExpired = flags.demoExpiry ? new Date() > new Date(flags.demoExpiry) : false;

    if (pageLoading) {
        return (
            <div className="p-4 md:p-8 space-y-6 max-w-3xl mx-auto animate-pulse">
                <div className="h-8 bg-slate-100 rounded-xl w-64" />
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4">
                    <div className="h-5 bg-slate-100 rounded-lg w-40" />
                    <div className="h-px bg-slate-100" />
                    <div className="flex items-center justify-between py-4">
                        <div className="space-y-2 flex-1">
                            <div className="h-4 bg-slate-100 rounded-lg w-56" />
                            <div className="h-3 bg-slate-50 rounded-lg w-80" />
                        </div>
                        <div className="h-7 w-[52px] bg-slate-100 rounded-full ml-6" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-3xl mx-auto font-sans animate-in fade-in duration-200">
            <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <button
                    onClick={() => navigate(PATHS.TENANTS.LIST)}
                    className="hover:text-slate-600 transition-colors flex items-center gap-1.5"
                >
                    <Icon icon="lucide:building-2" className="text-sm" />
                    Wholesalers
                </button>
                <Icon icon="lucide:chevron-right" className="text-slate-300" />
                <span className="text-slate-600 font-semibold">{storeName}</span>
                <Icon icon="lucide:chevron-right" className="text-slate-300" />
                <span className="text-[#2980B9] font-semibold">Settings</span>
            </nav>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Icon icon="lucide:settings-2" className="text-[#2980B9] text-2xl" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                            Settings — {storeName}
                        </h1>
                        {tenantId && (
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{tenantId}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                    <Icon icon="lucide:toggle-right" className="text-[#2980B9] text-lg" />
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                        Feature Toggles
                    </h2>
                </div>

                <div className="px-6 divide-y divide-slate-50">
                    <FeatureRow
                        label="E-com Frames-Sunglasses Page"
                        description="When enabled, this wholesaler can access the Frames & Sunglasses e-commerce catalogue page."
                        enabled={flags.ecomFramesSunglasses ?? false}
                        onToggle={() => handleToggle('ecomFramesSunglasses')}
                        toggling={toggling['ecomFramesSunglasses'] ?? false}
                    />

                    <FeatureRow
                        label="Demo Mode & Watermark Access"
                        description="When enabled, users of this wholesaler see the confidential demo watermark & popup. Login is allowed until demo expiry date."
                        enabled={flags.demoMode ?? false}
                        onToggle={() => handleToggle('demoMode')}
                        toggling={toggling['demoMode'] ?? false}
                        badgeText={flags.demoMode ? (isExpired ? 'DEMO EXPIRED' : 'DEMO ACTIVE') : null}
                        badgeColor={isExpired ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}
                    />
                </div>

                {flags.demoMode && (
                    <div className="px-6 py-4 bg-amber-50/40 border-t border-amber-100 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Icon icon="lucide:clock-4" className="text-amber-600 text-base" />
                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                    Demo Access Expiry Date & Time
                                </span>
                            </div>
                            {isExpired && (
                                <span className="text-[11px] font-black text-red-600 bg-red-100 px-2.5 py-0.5 rounded-full border border-red-200">
                                    Access Expired (Logins Blocked)
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500">
                            Set the deadline until which demo access remains valid. Once expired, users will be blocked from logging into this wholesaler account.
                        </p>
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                            <input
                                type="datetime-local"
                                value={expiryInput}
                                onChange={e => setExpiryInput(e.target.value)}
                                className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#2980B9] focus:ring-2 focus:ring-blue-100 shadow-xs"
                            />
                            <button
                                type="button"
                                onClick={() => handleSaveExpiry()}
                                disabled={savingExpiry}
                                className="px-4 py-2 bg-[#2980B9] hover:bg-[#1F618D] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                {savingExpiry ? <Icon icon="lucide:loader-2" className="animate-spin text-sm" /> : <Icon icon="lucide:save" className="text-sm" />}
                                Save Expiry
                            </button>
                            {expiryInput && (
                                <button
                                    type="button"
                                    onClick={() => handleSaveExpiry('')}
                                    disabled={savingExpiry}
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition flex items-center gap-1 cursor-pointer"
                                >
                                    <Icon icon="lucide:trash-2" className="text-xs text-red-500" />
                                    Clear Limit
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="px-6 py-3 bg-slate-50/60 border-t border-slate-100">
                    <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                        <Icon icon="lucide:info" className="text-slate-300 text-sm flex-shrink-0" />
                        Changes take effect immediately upon next login or session refresh.
                    </p>
                </div>
            </div>

            <button
                onClick={() => navigate(PATHS.TENANTS.LIST)}
                className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            >
                <Icon icon="lucide:arrow-left" className="text-sm" />
                Back to Wholesalers List
            </button>
        </div>
    );
}
