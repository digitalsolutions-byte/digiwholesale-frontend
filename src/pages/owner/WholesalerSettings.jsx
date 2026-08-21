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

// ── Status Badge ─────────────────────────────────────────────────────────────
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

// ── Feature Row Component ─────────────────────────────────────────────────────
const FeatureRow = ({ label, description, enabled, onToggle, toggling }) => (
    <div className="flex items-center justify-between gap-6 py-5">
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                <StatusBadge active={enabled} />
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{description}</p>
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WholesalerSettings() {
    const { id } = useParams();
    const navigate = useNavigate();
    const user = useSelector(selectCurrentUser);

    // Access guard — only Platform Owner
    if (user?.EmployeeType !== 'PLATFORM_OWNER') {
        return <Navigate to={PATHS.UNAUTHORIZED} replace />;
    }

    const [pageLoading, setPageLoading] = useState(true);
    const [storeName, setStoreName] = useState('');
    const [tenantId, setTenantId] = useState('');
    const [flags, setFlags] = useState({ ecomFramesSunglasses: false });
    const [toggling, setToggling] = useState({});

    // Fetch settings on mount
    useEffect(() => {
        const load = async () => {
            setPageLoading(true);
            try {
                const res = await getTenantSettings(id);
                if (res?.success && res?.data) {
                    setStoreName(res.data.storeName || 'Wholesaler');
                    setTenantId(res.data.tenantId || '');
                    setFlags({ ...{ ecomFramesSunglasses: false }, ...(res.data.featureFlags || {}) });
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

    // Optimistic toggle handler
    const handleToggle = async (flagKey) => {
        const previousValue = flags[flagKey];
        const newValue = !previousValue;

        // Optimistic update
        setFlags(prev => ({ ...prev, [flagKey]: newValue }));
        setToggling(prev => ({ ...prev, [flagKey]: true }));

        try {
            const res = await updateTenantSettings(id, { [flagKey]: newValue });
            if (res?.success && res?.data?.featureFlags) {
                setFlags({ ...{ ecomFramesSunglasses: false }, ...res.data.featureFlags });
                toast.success('Feature updated successfully');
            } else {
                throw new Error(res?.message || 'Update failed');
            }
        } catch (err) {
            // Rollback on error
            setFlags(prev => ({ ...prev, [flagKey]: previousValue }));
            toast.error(err?.message || 'Failed to update feature. Please try again.');
        } finally {
            setToggling(prev => ({ ...prev, [flagKey]: false }));
        }
    };

    // ── Loading skeleton ────────────────────────────────────────────────────
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

            {/* Breadcrumb */}
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

            {/* Page Header */}
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

            {/* Feature Toggles Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
                {/* Card Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                    <Icon icon="lucide:toggle-right" className="text-[#2980B9] text-lg" />
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                        Feature Toggles
                    </h2>
                </div>

                {/* Feature Rows */}
                <div className="px-6 divide-y divide-slate-50">
                    <FeatureRow
                        label="E-com Frames-Sunglasses Page"
                        description="When enabled, this wholesaler can access the Frames & Sunglasses e-commerce catalogue page."
                        enabled={flags.ecomFramesSunglasses ?? false}
                        onToggle={() => handleToggle('ecomFramesSunglasses')}
                        toggling={toggling['ecomFramesSunglasses'] ?? false}
                    />
                    {/* Future feature rows can be added here */}
                </div>

                {/* Card Footer note */}
                <div className="px-6 py-3 bg-slate-50/60 border-t border-slate-100">
                    <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                        <Icon icon="lucide:info" className="text-slate-300 text-sm flex-shrink-0" />
                        Changes take effect immediately. The wholesaler must refresh their session to see updated access.
                    </p>
                </div>
            </div>

            {/* Back button */}
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
