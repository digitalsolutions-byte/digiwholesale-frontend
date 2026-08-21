import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import { getAllTenants, suspendTenant, activateTenant, deleteTenant } from '../services/tenantService';
import { PATHS } from '../routes/paths';

export default function PlatformOwnerDashboard() {
    const navigate = useNavigate();
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        suspended: 0,
        avgCommission: 0
    });

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const res = await getAllTenants({ page: 1, limit: 100 });
                if (res.success && res.data?.tenants) {
                    const list = res.data.tenants;
                    setTenants(list);
                    
                    const activeCount = list.filter(t => t.status === 'ACTIVE').length;
                    const suspendedCount = list.filter(t => t.status === 'SUSPENDED').length;
                    const commSum = list.reduce((acc, t) => acc + (t.storeInformation?.commissionPercentage || 0), 0);
                    
                    setStats({
                        total: res.data?.pagination?.totalRecords || list.length,
                        active: activeCount,
                        suspended: suspendedCount,
                        avgCommission: list.length > 0 ? (commSum / list.length).toFixed(1) : 0
                    });
                }
            } catch (error) {
                console.error('Platform Dashboard Fetch Error:', error);
                toast.error('Failed to fetch platform metrics.');
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const handleToggleStatus = async (tenant) => {
        try {
            if (tenant.status === 'SUSPENDED') {
                const res = await activateTenant(tenant._id);
                if (res.success) {
                    toast.success(`Wholesaler "${tenant.storeInformation?.storeName}" activated.`);
                }
            } else {
                const res = await suspendTenant(tenant._id, 'Platform Owner action');
                if (res.success) {
                    toast.success(`Wholesaler "${tenant.storeInformation?.storeName}" suspended.`);
                }
            }
            // Refresh list
            const refreshRes = await getAllTenants({ page: 1, limit: 100 });
            if (refreshRes.success) setTenants(refreshRes.data?.tenants || []);
        } catch (err) {
            toast.error(err.message || 'Status update failed.');
        }
    };

    const handleDelete = async (tenant) => {
        if (window.confirm(`Are you sure you want to delete wholesaler "${tenant.storeInformation?.storeName}"?`)) {
            try {
                await deleteTenant(tenant._id);
                toast.success('Wholesaler deleted');
                const refreshRes = await getAllTenants({ page: 1, limit: 100 });
                if (refreshRes.success) setTenants(refreshRes.data?.tenants || []);
            } catch (err) {
                toast.error(err.message || 'Failed to delete wholesaler');
            }
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
                        <Icon icon="lucide:building-2" className="text-[#2980B9] text-2xl" />
                        Wholesaler Platform Overview
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        Platform Owner Control Panel — Manage wholesaler accounts, plan subscriptions, and status.
                    </p>
                </div>
                <button
                    onClick={() => navigate(PATHS.TENANTS.REGISTER)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#2980B9] hover:bg-[#2471A3] text-white font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-95"
                >
                    <Icon icon="lucide:plus" className="text-base" />
                    + Create Wholesaler
                </button>
            </div>

            {/* Clean Minimal Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1.5 sm:space-y-2 overflow-hidden">
                    <div className="flex items-center justify-between gap-1 text-slate-400">
                        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">Total Wholesalers</span>
                        <div className="p-1.5 sm:p-2 bg-slate-100 text-slate-600 rounded-xl flex-shrink-0">
                            <Icon icon="lucide:building-2" className="text-base sm:text-lg" />
                        </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-800">{stats.total}</div>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block truncate">Registered workspaces</span>
                </div>

                <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1.5 sm:space-y-2 overflow-hidden">
                    <div className="flex items-center justify-between gap-1 text-slate-400">
                        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">Active</span>
                        <div className="p-1.5 sm:p-2 bg-slate-100 text-emerald-600 rounded-xl flex-shrink-0">
                            <Icon icon="lucide:check-circle" className="text-base sm:text-lg" />
                        </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-emerald-600">{stats.active}</div>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block truncate">Operational workspaces</span>
                </div>

                <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1.5 sm:space-y-2 overflow-hidden">
                    <div className="flex items-center justify-between gap-1 text-slate-400">
                        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">Suspended</span>
                        <div className="p-1.5 sm:p-2 bg-slate-100 text-slate-500 rounded-xl flex-shrink-0">
                            <Icon icon="lucide:ban" className="text-base sm:text-lg" />
                        </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-rose-600">{stats.suspended}</div>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block truncate">Blocked from access</span>
                </div>

                <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1.5 sm:space-y-2 overflow-hidden">
                    <div className="flex items-center justify-between gap-1 text-slate-400">
                        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">Avg Commission</span>
                        <div className="p-1.5 sm:p-2 bg-slate-100 text-[#2980B9] rounded-xl flex-shrink-0">
                            <Icon icon="lucide:percent" className="text-base sm:text-lg" />
                        </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-800">{stats.avgCommission}%</div>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block truncate">Platform revenue share</span>
                </div>
            </div>

            {/* Wholesaler List Section */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            Recent Wholesalers
                        </h2>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">Overview of registered wholesaler accounts & plan subscriptions</p>
                    </div>
                    <button
                        onClick={() => navigate(PATHS.TENANTS.LIST)}
                        className="text-xs font-semibold text-[#2980B9] hover:underline flex items-center gap-1 self-end sm:self-auto"
                    >
                        <span>View All Wholesalers</span>
                        <Icon icon="lucide:arrow-right" />
                    </button>
                </div>

                {/* Mobile Cards View (md:hidden) */}
                <div className="block md:hidden divide-y divide-slate-100">
                    {loading ? (
                        <div className="p-6 text-center text-slate-400 text-xs font-medium">
                            Loading platform data...
                        </div>
                    ) : tenants.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-xs font-medium">
                            No wholesalers registered yet. Click "+ Create Wholesaler" to register your first tenant!
                        </div>
                    ) : (
                        tenants.slice(0, 8).map((t) => {
                            const store = t.storeInformation || {};
                            const owner = t.owner || {};
                            const isSuspended = t.status === 'SUSPENDED';

                            return (
                                <div key={t._id} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-sm leading-snug">{store.storeName || 'N/A'}</h3>
                                            <span className="font-mono text-[11px] text-[#2980B9] font-medium block mt-0.5">{t.tenantId}</span>
                                        </div>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${
                                            isSuspended ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                        }`}>
                                            {t.status || 'ACTIVE'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-50">
                                        <div className="space-y-0.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Owner Info</span>
                                            <span className="font-semibold text-slate-700 block truncate">{owner.ownerName || 'N/A'}</span>
                                            <span className="text-[11px] text-slate-400 block truncate">{owner.email || ''}</span>
                                        </div>
                                        <div className="space-y-0.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Plan & Comm.</span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                    {t.subscription?.planType || 'PRO'}
                                                </span>
                                                <span className="font-semibold text-slate-700 text-xs">{store.commissionPercentage || 0}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                                        <div className="text-[11px] text-slate-500">
                                            <span className="text-slate-400">Expires: </span>
                                            <span className="font-medium text-slate-700">{store.expiryDate ? new Date(store.expiryDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => navigate(`/owner/wholesalers/${t._id}/settings`)}
                                                className="p-1.5 text-slate-400 hover:text-[#2980B9] rounded-xl transition-colors"
                                                title="Feature Settings"
                                            >
                                                <Icon icon="lucide:settings-2" className="text-base" />
                                            </button>
                                            <button
                                                onClick={() => navigate(`/tenants/view/${t._id}`)}
                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors"
                                            >
                                                Manage
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(t)}
                                                className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors ${
                                                    isSuspended
                                                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600'
                                                }`}
                                            >
                                                {isSuspended ? 'Activate' : 'Suspend'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(t)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"
                                                title="Delete Wholesaler"
                                            >
                                                <Icon icon="lucide:trash-2" className="text-base" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Desktop Table View (hidden md:block) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                                <th className="py-3.5 px-4">Wholesaler Name</th>
                                <th className="py-3.5 px-4">Owner Info</th>
                                <th className="py-3.5 px-4">Commission</th>
                                <th className="py-3.5 px-4">Plan Type</th>
                                <th className="py-3.5 px-4">Expiry Date</th>
                                <th className="py-3.5 px-4">Status</th>
                                <th className="py-3.5 px-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-slate-400 font-medium">
                                        Loading platform data...
                                    </td>
                                </tr>
                            ) : tenants.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-10 text-center text-slate-400 font-medium">
                                        No wholesalers registered yet. Click "+ Create Wholesaler" to register your first tenant!
                                    </td>
                                </tr>
                            ) : (
                                tenants.slice(0, 8).map((t) => {
                                    const store = t.storeInformation || {};
                                    const owner = t.owner || {};
                                    const isSuspended = t.status === 'SUSPENDED';

                                    return (
                                        <tr key={t._id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-4 py-3.5">
                                                <div className="font-bold text-slate-800">{store.storeName || 'N/A'}</div>
                                                <span className="font-mono text-[10px] text-[#2980B9] font-medium">{t.tenantId}</span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="font-semibold text-slate-700">{owner.ownerName || 'N/A'}</div>
                                                <div className="text-[11px] text-slate-400">{owner.email}</div>
                                            </td>
                                            <td className="px-4 py-3.5 font-semibold text-slate-700">
                                                {store.commissionPercentage || 0}%
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                    {t.subscription?.planType || 'PRO'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-600 font-medium">
                                                {store.expiryDate ? new Date(store.expiryDate).toLocaleDateString('en-IN') : 'N/A'}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                                    isSuspended ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                }`}>
                                                    {t.status || 'ACTIVE'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => navigate(`/owner/wholesalers/${t._id}/settings`)}
                                                        className="p-1.5 text-slate-400 hover:text-[#2980B9] rounded-lg transition-colors"
                                                        title="Feature Settings"
                                                    >
                                                        <Icon icon="lucide:settings-2" className="text-base" />
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/tenants/view/${t._id}`)}
                                                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px] transition-colors"
                                                    >
                                                        Manage
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleStatus(t)}
                                                        className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition-colors ${
                                                            isSuspended
                                                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                                : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600'
                                                        }`}
                                                    >
                                                        {isSuspended ? 'Activate' : 'Suspend'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(t)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                                        title="Delete Wholesaler"
                                                    >
                                                        <Icon icon="lucide:trash-2" className="text-base" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
