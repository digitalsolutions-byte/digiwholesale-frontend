import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import { getAllTenants, suspendTenant, activateTenant, deleteTenant } from '../../services/tenantService';
import { PATHS } from '../../routes/paths';

export default function TenantList() {
    const navigate = useNavigate();
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state for suspension
    const [suspendModal, setSuspendModal] = useState({ isOpen: false, tenant: null, reason: '' });
    const [actionLoading, setActionLoading] = useState(false);

    const fetchTenants = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAllTenants({
                page,
                limit: 10,
                status: statusFilter,
                search: searchTerm
            });
            if (res.success) {
                setTenants(res.data?.tenants || []);
                setPagination(res.data?.pagination || null);
            } else {
                setTenants([]);
            }
        } catch (error) {
            console.error('Error fetching tenants:', error);
            toast.error(error.message || 'Failed to fetch wholesalers.');
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, searchTerm]);

    useEffect(() => {
        fetchTenants();
    }, [fetchTenants]);

    const handleConfirmSuspend = async () => {
        if (!suspendModal.tenant) return;
        setActionLoading(true);
        try {
            const res = await suspendTenant(suspendModal.tenant._id, suspendModal.reason);
            if (res.success) {
                toast.success(`Wholesaler "${suspendModal.tenant.storeInformation?.storeName}" suspended.`);
                setSuspendModal({ isOpen: false, tenant: null, reason: '' });
                fetchTenants();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to suspend wholesaler.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleActivate = async (tenant) => {
        try {
            const res = await activateTenant(tenant._id);
            if (res.success) {
                toast.success(`Wholesaler "${tenant.storeInformation?.storeName}" reactivated.`);
                fetchTenants();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to activate wholesaler.');
        }
    };

    const handleDelete = async (tenant) => {
        if (!window.confirm(`Are you sure you want to PERMANENTLY delete wholesaler "${tenant.storeInformation?.storeName}"? This action cannot be undone.`)) {
            return;
        }
        try {
            const res = await deleteTenant(tenant._id);
            if (res.success) {
                toast.success('Wholesaler account deleted successfully.');
                fetchTenants();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to delete wholesaler.');
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
                        <Icon icon="lucide:building-2" className="text-[#2980B9] text-2xl" />
                        Wholesaler Directory
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        SaaS multi-tenant administration — view, filter, and manage onboarded wholesalers
                    </p>
                </div>
                <button
                    onClick={() => navigate(PATHS.TENANTS.REGISTER)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#2980B9] hover:bg-[#2471A3] text-white text-xs font-semibold rounded-xl transition-all shadow-xs active:scale-95"
                >
                    <Icon icon="lucide:plus" className="text-base" />
                    + Create Wholesaler
                </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex-1 w-full md:w-auto relative">
                    <Icon icon="lucide:search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                    <input
                        type="text"
                        placeholder="Search by wholesaler name, ID, email, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#2980B9] focus:bg-white transition-all"
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#2980B9] transition-all"
                    >
                        <option value="">All Statuses</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                    <button
                        onClick={fetchTenants}
                        className="p-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-all border border-slate-200"
                        title="Refresh"
                    >
                        <Icon icon="lucide:refresh-cw" className={`text-base ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Wholesalers Container */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
                {/* Mobile View (md:hidden) */}
                <div className="block md:hidden divide-y divide-slate-100">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400 font-medium text-xs flex items-center justify-center gap-2">
                            <Icon icon="lucide:loader-2" className="animate-spin text-lg text-[#2980B9]" />
                            <span>Loading wholesalers...</span>
                        </div>
                    ) : tenants.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs">
                            <Icon icon="lucide:building-2" className="text-3xl mx-auto mb-2 text-slate-300" />
                            <p className="font-semibold text-slate-600">No wholesalers found.</p>
                            <p className="text-[11px] mt-1">Register a new wholesaler using the button above.</p>
                        </div>
                    ) : (
                        tenants.map((t) => {
                            const isSuspended = t.status === 'SUSPENDED';
                            const store = t.storeInformation || {};
                            const owner = t.owner || {};

                            return (
                                <div key={t._id} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-sm leading-snug">{store.storeName || 'N/A'}</h3>
                                            <span className="font-mono text-[11px] text-[#2980B9] font-semibold block mt-0.5">{t.tenantId || 'N/A'}</span>
                                        </div>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border flex-shrink-0 ${
                                            isSuspended ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                        }`}>
                                            {t.status || 'ACTIVE'}
                                        </span>
                                    </div>

                                    {store.address && (
                                        <div className="text-[11px] text-slate-500 font-medium truncate">
                                            {store.address}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-50">
                                        <div className="space-y-0.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Owner Info</span>
                                            <span className="font-semibold text-slate-700 block truncate">{owner.ownerName || 'N/A'}</span>
                                            <span className="text-[11px] text-slate-400 block truncate">{owner.email || ''}</span>
                                            {owner.mobile && <span className="text-[11px] text-slate-400 block truncate">{owner.mobile}</span>}
                                        </div>
                                        <div className="space-y-0.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Plan & Expiry</span>
                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 mt-0.5">
                                                {t.subscription?.planType || 'PRO'}
                                            </span>
                                            <span className="text-[11px] text-slate-500 block mt-1">
                                                Exp: {store.expiryDate ? new Date(store.expiryDate).toLocaleDateString('en-IN') : 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                        <button
                                            onClick={() => navigate(`/tenants/view/${t._id}`)}
                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors"
                                        >
                                            Manage
                                        </button>
                                        {isSuspended ? (
                                            <button
                                                onClick={() => handleActivate(t)}
                                                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 rounded-xl text-xs font-semibold transition-colors"
                                            >
                                                Activate
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setSuspendModal({ isOpen: true, tenant: t, reason: '' })}
                                                className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-xs font-semibold transition-colors"
                                            >
                                                Suspend
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(t)}
                                            className="p-2 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"
                                            title="Delete Wholesaler"
                                        >
                                            <Icon icon="lucide:trash-2" className="text-base" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Desktop View (hidden md:block) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <th className="py-3.5 px-4">Tenant ID</th>
                                <th className="py-3.5 px-4">Wholesaler Name</th>
                                <th className="py-3.5 px-4">Owner Info</th>
                                <th className="py-3.5 px-4">Plan</th>
                                <th className="py-3.5 px-4">Expiry Date</th>
                                <th className="py-3.5 px-4">Status</th>
                                <th className="py-3.5 px-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-slate-400 font-medium">
                                        <div className="flex items-center justify-center gap-2">
                                            <Icon icon="lucide:loader-2" className="animate-spin text-lg text-[#2980B9]" />
                                            <span>Loading wholesalers...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : tenants.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center text-slate-400">
                                        <Icon icon="lucide:building-2" className="text-3xl mx-auto mb-2 text-slate-300" />
                                        <p className="font-semibold text-slate-600">No wholesalers found.</p>
                                        <p className="text-[11px] mt-1">Register a new wholesaler using the button above.</p>
                                    </td>
                                </tr>
                            ) : (
                                tenants.map((t) => {
                                    const isSuspended = t.status === 'SUSPENDED';
                                    const store = t.storeInformation || {};
                                    const owner = t.owner || {};
                                    return (
                                        <tr key={t._id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-4 py-3.5 font-mono font-semibold text-[#2980B9]">
                                                {t.tenantId || 'N/A'}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="font-bold text-slate-800">{store.storeName || 'N/A'}</div>
                                                <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{store.address || 'N/A'}</div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="font-semibold text-slate-700">{owner.ownerName || 'N/A'}</div>
                                                <div className="text-[11px] text-slate-400">{owner.email} &bull; {owner.mobile}</div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                    {t.subscription?.planType || 'PRO'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-600 font-medium">
                                                {store.expiryDate ? new Date(store.expiryDate).toLocaleDateString('en-IN') : 'N/A'}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                                    isSuspended ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                }`}>
                                                    {t.status || 'ACTIVE'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => navigate(`/tenants/view/${t._id}`)}
                                                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px] transition-colors"
                                                        title="View & Edit"
                                                    >
                                                        Manage
                                                    </button>
                                                    {isSuspended ? (
                                                        <button
                                                            onClick={() => handleActivate(t)}
                                                            className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 rounded-lg text-[11px] font-semibold transition-colors"
                                                        >
                                                            Activate
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => setSuspendModal({ isOpen: true, tenant: t, reason: '' })}
                                                            className="px-3 py-1 bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-[11px] font-semibold transition-colors"
                                                        >
                                                            Suspend
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(t)}
                                                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
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

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 text-xs">
                        <span className="text-slate-500 font-medium">
                            Page <strong>{pagination.currentPage}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.totalRecords} total wholesalers)
                        </span>
                        <div className="flex gap-2">
                            <button
                                disabled={!pagination.hasPrev}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold disabled:opacity-40"
                            >
                                Previous
                            </button>
                            <button
                                disabled={!pagination.hasNext}
                                onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Suspend Confirmation Modal */}
            {suspendModal.isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150 border border-slate-100">
                        <div className="flex items-center gap-3 text-slate-800">
                            <Icon icon="lucide:alert-triangle" className="text-2xl text-rose-500" />
                            <div>
                                <h3 className="text-base font-bold">Suspend Wholesaler Account</h3>
                                <p className="text-xs text-slate-500 font-medium">Block workspace access for all tenant users</p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                            You are about to suspend <strong>"{suspendModal.tenant?.storeInformation?.storeName}"</strong>.
                            Employees and customers of this wholesaler will be blocked from logging in immediately.
                        </p>

                        <div>
                            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Reason for Suspension (Optional)</label>
                            <input
                                type="text"
                                placeholder="e.g. Payment overdue"
                                value={suspendModal.reason}
                                onChange={(e) => setSuspendModal(prev => ({ ...prev, reason: e.target.value }))}
                                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-[#2980B9]"
                            />
                        </div>

                        <div className="flex justify-end gap-2.5 pt-2">
                            <button
                                onClick={() => setSuspendModal({ isOpen: false, tenant: null, reason: '' })}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmSuspend}
                                disabled={actionLoading}
                                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-xs disabled:opacity-50"
                            >
                                {actionLoading ? 'Suspending...' : 'Confirm Suspension'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
