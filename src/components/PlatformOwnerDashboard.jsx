import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import { getAllTenants, suspendTenant, activateTenant, deleteTenant } from '../services/tenantService';
import { PATHS } from '../routes/paths';
import { generateTenantInvoice } from '../utils/generateTenantInvoice';

/**
 * Calculate detailed expiry metadata for accountant subscription management
 */
function getTenantExpiryMeta(tenant) {
    const rawDate = tenant.storeInformation?.expiryDate || tenant.subscription?.expiresAt;
    if (!rawDate) {
        return {
            hasExpiry: false,
            formattedDate: 'No Expiry Set',
            daysRemaining: null,
            status: 'UNKNOWN',
            badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
            barColor: 'bg-slate-300',
            label: 'No Expiry',
            percentRemaining: 100,
            urgency: 'unknown'
        };
    }

    const expDate = new Date(rawDate);
    const now = new Date();
    const diffTime = expDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Approximate percent remaining based on a standard 365-day subscription window
    const createdDate = tenant.createdAt ? new Date(tenant.createdAt) : new Date(expDate.getTime() - 365 * 24 * 60 * 60 * 1000);
    const totalDuration = Math.max(1, expDate.getTime() - createdDate.getTime());
    const elapsed = Math.max(0, now.getTime() - createdDate.getTime());
    const percentRemaining = Math.max(0, Math.min(100, Math.round(((totalDuration - elapsed) / totalDuration) * 100)));

    const formattedDate = expDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    if (daysRemaining < 0) {
        const absDays = Math.abs(daysRemaining);
        return {
            hasExpiry: true,
            formattedDate,
            daysRemaining,
            status: 'EXPIRED',
            badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
            barColor: 'bg-rose-500',
            label: `Expired ${absDays}d ago`,
            percentRemaining: 0,
            urgency: 'critical'
        };
    } else if (daysRemaining <= 7) {
        return {
            hasExpiry: true,
            formattedDate,
            daysRemaining,
            status: 'CRITICAL',
            badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
            barColor: 'bg-rose-500',
            label: daysRemaining === 0 ? 'Expires Today' : `Expires in ${daysRemaining}d`,
            percentRemaining: Math.max(6, percentRemaining),
            urgency: 'critical'
        };
    } else if (daysRemaining <= 30) {
        return {
            hasExpiry: true,
            formattedDate,
            daysRemaining,
            status: 'EXPIRING_SOON',
            badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
            barColor: 'bg-amber-500',
            label: `Expires in ${daysRemaining}d`,
            percentRemaining: Math.max(12, percentRemaining),
            urgency: 'warning'
        };
    } else {
        return {
            hasExpiry: true,
            formattedDate,
            daysRemaining,
            status: 'ACTIVE_SAFE',
            badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            barColor: 'bg-emerald-500',
            label: `${daysRemaining}d left`,
            percentRemaining,
            urgency: 'safe'
        };
    }
}

/**
 * Format subscription pricing & revenue data
 */
function getTenantSubscriptionPricing(tenant) {
    const inv = tenant.invoiceDetails || {};
    const sub = tenant.subscription || {};
    const subAmt = Number(inv.subscriptionAmount || 0);
    const srvAmt = Number(inv.serverCostAmount || 0);
    const total = subAmt + srvAmt;

    let displayTotal = total;
    if (displayTotal === 0) {
        if (sub.planType === 'PREMIUM') displayTotal = 6000;
        else if (sub.planType === 'CUSTOM') displayTotal = 4800;
        else displayTotal = 3000;
    }

    return {
        subscriptionAmount: subAmt,
        serverCostAmount: srvAmt,
        totalAmount: displayTotal,
        hasExplicitPricing: total > 0,
        formattedTotal: `₹${displayTotal.toLocaleString('en-IN')}`
    };
}

export default function PlatformOwnerDashboard() {
    const navigate = useNavigate();
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filters and sorting state
    const [searchTerm, setSearchTerm] = useState('');
    const [expiryFilter, setExpiryFilter] = useState('ALL'); // ALL, CRITICAL, EXPIRING_SOON, ACTIVE_SAFE, EXPIRED
    const [planFilter, setPlanFilter] = useState('ALL');     // ALL, PRO, CUSTOM, PREMIUM
    const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, SUSPENDED
    const [sortBy, setSortBy] = useState('EXPIRY_ASC');      // EXPIRY_ASC, EXPIRY_DESC, NAME_ASC, FEE_DESC, NEWEST

    const fetchDashboardData = async (isManualRefresh = false) => {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const res = await getAllTenants({ page: 1, limit: 150 });
            if (res.success && res.data?.tenants) {
                setTenants(res.data.tenants);
                if (isManualRefresh) toast.success('Dashboard metrics updated');
            }
        } catch (error) {
            console.error('Platform Dashboard Fetch Error:', error);
            toast.error('Failed to fetch platform metrics.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleToggleStatus = async (tenant) => {
        try {
            const storeName = tenant.storeInformation?.storeName || 'Wholesaler';
            if (tenant.status === 'SUSPENDED') {
                const res = await activateTenant(tenant._id);
                if (res.success) {
                    toast.success(`Wholesaler "${storeName}" activated.`);
                }
            } else {
                const res = await suspendTenant(tenant._id, 'Platform Owner action');
                if (res.success) {
                    toast.success(`Wholesaler "${storeName}" suspended.`);
                }
            }
            fetchDashboardData(true);
        } catch (err) {
            toast.error(err.message || 'Status update failed.');
        }
    };

    const handleDelete = async (tenant) => {
        const storeName = tenant.storeInformation?.storeName || 'Wholesaler';
        if (window.confirm(`Are you sure you want to permanently delete wholesaler "${storeName}" (${tenant.tenantId})? This action cannot be undone.`)) {
            try {
                await deleteTenant(tenant._id);
                toast.success(`Wholesaler "${storeName}" deleted`);
                fetchDashboardData(true);
            } catch (err) {
                toast.error(err.message || 'Failed to delete wholesaler');
            }
        }
    };

    const handleCopy = (text, label) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard!`);
    };

    // Calculate aggregated metrics for Platform Owner & Accountant
    const metrics = useMemo(() => {
        let active = 0;
        let suspended = 0;
        let safe = 0;
        let expiringSoon = 0;
        let critical = 0;
        let expired = 0;
        let totalMonthlyRevenue = 0;

        const planCounts = { PRO: 0, CUSTOM: 0, PREMIUM: 0, OTHER: 0 };
        const planRevenue = { PRO: 0, CUSTOM: 0, PREMIUM: 0, OTHER: 0 };

        tenants.forEach((t) => {
            if (t.status === 'SUSPENDED') suspended++;
            else active++;

            const expMeta = getTenantExpiryMeta(t);
            if (expMeta.status === 'EXPIRED') expired++;
            else if (expMeta.status === 'CRITICAL') critical++;
            else if (expMeta.status === 'EXPIRING_SOON') expiringSoon++;
            else safe++;

            const pricing = getTenantSubscriptionPricing(t);
            totalMonthlyRevenue += pricing.totalAmount;

            const pType = (t.subscription?.planType || 'PRO').toUpperCase();
            if (planCounts[pType] !== undefined) {
                planCounts[pType]++;
                planRevenue[pType] += pricing.totalAmount;
            } else {
                planCounts.OTHER++;
                planRevenue.OTHER += pricing.totalAmount;
            }
        });

        const total = tenants.length;
        const totalExpiringCohort = expiringSoon + critical;

        return {
            total,
            active,
            suspended,
            safe,
            expiringSoon,
            critical,
            totalExpiringCohort,
            expired,
            totalMonthlyRevenue,
            planCounts,
            planRevenue,
            pctSafe: total > 0 ? (safe / total) * 100 : 0,
            pctExpiringSoon: total > 0 ? (expiringSoon / total) * 100 : 0,
            pctCritical: total > 0 ? (critical / total) * 100 : 0,
            pctExpired: total > 0 ? (expired / total) * 100 : 0,
            pctSuspended: total > 0 ? (suspended / total) * 100 : 0,
        };
    }, [tenants]);

    // Filter and Sort tenants dynamically
    const filteredTenants = useMemo(() => {
        return tenants
            .filter((t) => {
                const store = t.storeInformation || {};
                const owner = t.owner || {};
                const inv = t.invoiceDetails || {};
                const expMeta = getTenantExpiryMeta(t);

                // Search term match across multiple fields
                if (searchTerm.trim()) {
                    const q = searchTerm.toLowerCase();
                    const matchesName = (store.storeName || '').toLowerCase().includes(q);
                    const matchesTenantId = (t.tenantId || '').toLowerCase().includes(q);
                    const matchesOwner = (owner.ownerName || '').toLowerCase().includes(q);
                    const matchesEmail = (owner.email || '').toLowerCase().includes(q);
                    const matchesPhone = (owner.mobile || store.phone || '').toLowerCase().includes(q);
                    const matchesGST = (inv.clientGSTIN || store.gstin || '').toLowerCase().includes(q);
                    const matchesAddress = (store.address || '').toLowerCase().includes(q);

                    if (!matchesName && !matchesTenantId && !matchesOwner && !matchesEmail && !matchesPhone && !matchesGST && !matchesAddress) {
                        return false;
                    }
                }

                // Expiry Filter
                if (expiryFilter === 'CRITICAL' && expMeta.status !== 'CRITICAL') return false;
                if (expiryFilter === 'EXPIRING_SOON' && expMeta.status !== 'EXPIRING_SOON' && expMeta.status !== 'CRITICAL') return false;
                if (expiryFilter === 'ACTIVE_SAFE' && expMeta.status !== 'ACTIVE_SAFE') return false;
                if (expiryFilter === 'EXPIRED' && expMeta.status !== 'EXPIRED') return false;

                // Plan Filter
                if (planFilter !== 'ALL') {
                    const p = (t.subscription?.planType || 'PRO').toUpperCase();
                    if (p !== planFilter) return false;
                }

                // Status Filter
                if (statusFilter !== 'ALL') {
                    const s = (t.status || 'ACTIVE').toUpperCase();
                    if (s !== statusFilter) return false;
                }

                return true;
            })
            .sort((a, b) => {
                const expA = new Date(a.storeInformation?.expiryDate || a.subscription?.expiresAt || '9999-12-31').getTime();
                const expB = new Date(b.storeInformation?.expiryDate || b.subscription?.expiresAt || '9999-12-31').getTime();
                const nameA = (a.storeInformation?.storeName || '').toLowerCase();
                const nameB = (b.storeInformation?.storeName || '').toLowerCase();
                const feeA = getTenantSubscriptionPricing(a).totalAmount;
                const feeB = getTenantSubscriptionPricing(b).totalAmount;
                const createdA = new Date(a.createdAt || 0).getTime();
                const createdB = new Date(b.createdAt || 0).getTime();

                switch (sortBy) {
                    case 'EXPIRY_ASC':
                        return expA - expB;
                    case 'EXPIRY_DESC':
                        return expB - expA;
                    case 'NAME_ASC':
                        return nameA.localeCompare(nameB);
                    case 'FEE_DESC':
                        return feeB - feeA;
                    case 'NEWEST':
                        return createdB - createdA;
                    default:
                        return expA - expB;
                }
            });
    }, [tenants, searchTerm, expiryFilter, planFilter, statusFilter, sortBy]);

    // Check if any filters are currently active
    const hasActiveFilters = searchTerm !== '' || expiryFilter !== 'ALL' || planFilter !== 'ALL' || statusFilter !== 'ALL';

    const handleResetFilters = () => {
        setSearchTerm('');
        setExpiryFilter('ALL');
        setPlanFilter('ALL');
        setStatusFilter('ALL');
        setSortBy('EXPIRY_ASC');
        toast.info('Filters reset to default view.');
    };

    // Export subscriptions report to CSV
    const exportToCSV = () => {
        if (!filteredTenants || filteredTenants.length === 0) {
            toast.info('No wholesaler accounts to export.');
            return;
        }

        const headers = [
            'Tenant ID',
            'Wholesaler Name',
            'Owner Name',
            'Mobile',
            'Email',
            'Address',
            'Plan Type',
            'Expiry Date',
            'Days Remaining',
            'Expiry Status',
            'Subscription Amount (INR)',
            'Server Amount (INR)',
            'GSTIN',
            'Account Status'
        ];

        const rows = filteredTenants.map((t) => {
            const store = t.storeInformation || {};
            const owner = t.owner || {};
            const expMeta = getTenantExpiryMeta(t);
            const pricing = getTenantSubscriptionPricing(t);

            return [
                `"${t.tenantId || ''}"`,
                `"${(store.storeName || '').replace(/"/g, '""')}"`,
                `"${(owner.ownerName || '').replace(/"/g, '""')}"`,
                `"${owner.mobile || ''}"`,
                `"${owner.email || ''}"`,
                `"${(store.address || '').replace(/"/g, '""')}"`,
                `"${t.subscription?.planType || 'PRO'}"`,
                `"${expMeta.formattedDate}"`,
                expMeta.daysRemaining != null ? expMeta.daysRemaining : '',
                `"${expMeta.status}"`,
                pricing.subscriptionAmount,
                pricing.serverCostAmount,
                `"${t.invoiceDetails?.clientGSTIN || store.gstin || ''}"`,
                `"${t.status || 'ACTIVE'}"`
            ].join(',');
        });

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `DigiOptics_Wholesalers_Subscription_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exported ${filteredTenants.length} wholesaler subscriptions to CSV!`);
    };

    return (
        <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header Banner */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                    <div className="p-3 bg-gradient-to-br from-[#2980B9]/15 to-[#2471A3]/25 text-[#2980B9] rounded-2xl flex-shrink-0 shadow-xs border border-[#2980B9]/20">
                        <Icon icon="lucide:building-2" className="text-2xl sm:text-3xl" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base sm:text-lg font-bold text-slate-800">
                                Wholesaler Platform Overview
                            </h1>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2980B9]/10 text-[#2980B9] border border-[#2980B9]/20">
                                Platform Owner &amp; Accountant
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Platform Owner Control Panel — Manage wholesaler accounts, plan subscriptions, expiry timelines &amp; tax invoicing.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => fetchDashboardData(true)}
                        disabled={refreshing}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all"
                        title="Refresh data"
                    >
                        <Icon icon="lucide:refresh-cw" className={`text-sm ${refreshing ? 'animate-spin text-[#2980B9]' : ''}`} />
                        <span>Refresh</span>
                    </button>

                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-xs rounded-xl transition-all"
                        title="Export current table to CSV"
                    >
                        <Icon icon="lucide:download" className="text-sm" />
                        <span>Export CSV</span>
                    </button>

                    <button
                        onClick={() => navigate(PATHS.TENANTS.REGISTER)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#2980B9] hover:bg-[#2471A3] text-white font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-95"
                    >
                        <Icon icon="lucide:plus" className="text-base" />
                        <span>+ Create Wholesaler</span>
                    </button>
                </div>
            </div>

            {/* 5 Rich Metric Cards for Platform Owner & Accountant */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                {/* Total Wholesalers */}
                <div
                    onClick={() => { setStatusFilter('ALL'); setExpiryFilter('ALL'); }}
                    className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-xs space-y-1.5 cursor-pointer hover:border-[#2980B9]/40 hover:shadow-sm transition-all"
                >
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">Total Fleet</span>
                        <div className="p-1.5 bg-blue-50 text-[#2980B9] rounded-xl flex-shrink-0">
                            <Icon icon="lucide:building-2" className="text-base" />
                        </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-800">{metrics.total}</div>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block truncate">Registered workspaces</span>
                </div>

                {/* Active Subscriptions */}
                <div
                    onClick={() => { setStatusFilter('ACTIVE'); }}
                    className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-xs space-y-1.5 cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all"
                >
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 truncate">Active</span>
                        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl flex-shrink-0">
                            <Icon icon="lucide:check-circle" className="text-base" />
                        </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-600">{metrics.active}</div>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block truncate">Operational accounts</span>
                </div>

                {/* Expiring Soon (Urgent for Accountant) */}
                <div
                    onClick={() => { setExpiryFilter('EXPIRING_SOON'); }}
                    className={`bg-white p-3.5 sm:p-4 rounded-2xl border shadow-xs space-y-1.5 cursor-pointer transition-all ${
                        metrics.totalExpiringCohort > 0
                            ? 'border-amber-200 bg-amber-50/20 hover:border-amber-400 hover:shadow-sm'
                            : 'border-slate-100 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 truncate">Expiring (&le;30d)</span>
                        <div className="p-1.5 bg-amber-50 text-amber-600 rounded-xl flex-shrink-0">
                            <Icon icon="lucide:clock" className="text-base" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <div className="text-xl sm:text-2xl font-black text-amber-600">{metrics.totalExpiringCohort}</div>
                        {metrics.critical > 0 && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-full border border-rose-200">
                                {metrics.critical} critical
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-amber-600 font-medium block truncate">Renewal follow-up</span>
                </div>

                {/* Expired Subscriptions */}
                <div
                    onClick={() => { setExpiryFilter('EXPIRED'); }}
                    className={`bg-white p-3.5 sm:p-4 rounded-2xl border shadow-xs space-y-1.5 cursor-pointer transition-all ${
                        metrics.expired > 0
                            ? 'border-rose-200 bg-rose-50/20 hover:border-rose-400 hover:shadow-sm'
                            : 'border-slate-100 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 truncate">Expired</span>
                        <div className="p-1.5 bg-rose-50 text-rose-600 rounded-xl flex-shrink-0">
                            <Icon icon="lucide:alert-triangle" className="text-base" />
                        </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-rose-600">{metrics.expired}</div>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block truncate">Past due / Grace period</span>
                </div>

                {/* Estimated Monthly Revenue (Accountant Value) */}
                <div className="col-span-2 sm:col-span-1 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-xs space-y-1.5 overflow-hidden">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">Est. Billed MRR</span>
                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl flex-shrink-0">
                            <Icon icon="lucide:indian-rupee" className="text-base" />
                        </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-800">
                        ₹{metrics.totalMonthlyRevenue.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-indigo-600 font-medium block truncate">Subscription billing pool</span>
                </div>
            </div>

            {/* BAR-BASED REPRESENTATION SECTION (Subscription Lifecycle & Tier Breakdown) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 1. Subscription Expiry Timeline & Health Bar */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3.5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                <Icon icon="lucide:activity" className="text-[#2980B9]" />
                                Subscription Expiry Timeline Bar
                            </h2>
                            <p className="text-[11px] text-slate-400 font-medium">
                                Fleet-wide expiry health distribution across all active workspaces
                            </p>
                        </div>
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            {metrics.total} Workspaces
                        </span>
                    </div>

                    {/* Multi-Segment Stacked Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-3.5 flex overflow-hidden p-0.5 shadow-inner">
                        {metrics.pctSafe > 0 && (
                            <div
                                style={{ width: `${metrics.pctSafe}%` }}
                                className="bg-emerald-500 hover:bg-emerald-600 transition-all rounded-l-full cursor-pointer"
                                title={`Safe (>30d): ${metrics.safe} (${metrics.pctSafe.toFixed(1)}%)`}
                                onClick={() => setExpiryFilter('ACTIVE_SAFE')}
                            />
                        )}
                        {metrics.pctExpiringSoon > 0 && (
                            <div
                                style={{ width: `${metrics.pctExpiringSoon}%` }}
                                className="bg-amber-400 hover:bg-amber-500 transition-all cursor-pointer"
                                title={`Expiring in 8-30d: ${metrics.expiringSoon} (${metrics.pctExpiringSoon.toFixed(1)}%)`}
                                onClick={() => setExpiryFilter('EXPIRING_SOON')}
                            />
                        )}
                        {metrics.pctCritical > 0 && (
                            <div
                                style={{ width: `${metrics.pctCritical}%` }}
                                className="bg-orange-500 hover:bg-orange-600 transition-all cursor-pointer"
                                title={`Critical (<=7d): ${metrics.critical} (${metrics.pctCritical.toFixed(1)}%)`}
                                onClick={() => setExpiryFilter('CRITICAL')}
                            />
                        )}
                        {metrics.pctExpired > 0 && (
                            <div
                                style={{ width: `${metrics.pctExpired}%` }}
                                className="bg-rose-500 hover:bg-rose-600 transition-all cursor-pointer"
                                title={`Expired: ${metrics.expired} (${metrics.pctExpired.toFixed(1)}%)`}
                                onClick={() => setExpiryFilter('EXPIRED')}
                            />
                        )}
                        {metrics.pctSuspended > 0 && (
                            <div
                                style={{ width: `${metrics.pctSuspended}%` }}
                                className="bg-slate-400 hover:bg-slate-500 transition-all rounded-r-full cursor-pointer"
                                title={`Suspended: ${metrics.suspended} (${metrics.pctSuspended.toFixed(1)}%)`}
                                onClick={() => setStatusFilter('SUSPENDED')}
                            />
                        )}
                    </div>

                    {/* Interactive Legend / Filter Buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                        <button
                            onClick={() => setExpiryFilter(expiryFilter === 'ACTIVE_SAFE' ? 'ALL' : 'ACTIVE_SAFE')}
                            className={`p-2 rounded-xl border text-left transition-all ${
                                expiryFilter === 'ACTIVE_SAFE'
                                    ? 'border-emerald-400 bg-emerald-50/70 shadow-xs'
                                    : 'border-slate-100 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                <span>Safe (&gt;30d)</span>
                            </div>
                            <div className="text-slate-700 font-semibold mt-0.5 text-xs">
                                {metrics.safe} <span className="text-[10px] text-slate-400 font-normal">({metrics.pctSafe.toFixed(0)}%)</span>
                            </div>
                        </button>

                        <button
                            onClick={() => setExpiryFilter(expiryFilter === 'EXPIRING_SOON' ? 'ALL' : 'EXPIRING_SOON')}
                            className={`p-2 rounded-xl border text-left transition-all ${
                                expiryFilter === 'EXPIRING_SOON'
                                    ? 'border-amber-400 bg-amber-50/70 shadow-xs'
                                    : 'border-slate-100 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-center gap-1.5 text-amber-700 font-bold">
                                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                                <span>Expiring (&le;30d)</span>
                            </div>
                            <div className="text-slate-700 font-semibold mt-0.5 text-xs">
                                {metrics.expiringSoon} <span className="text-[10px] text-slate-400 font-normal">({metrics.pctExpiringSoon.toFixed(0)}%)</span>
                            </div>
                        </button>

                        <button
                            onClick={() => setExpiryFilter(expiryFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
                            className={`p-2 rounded-xl border text-left transition-all ${
                                expiryFilter === 'CRITICAL'
                                    ? 'border-orange-400 bg-orange-50/70 shadow-xs'
                                    : 'border-slate-100 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-center gap-1.5 text-orange-700 font-bold">
                                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                                <span>Critical (&le;7d)</span>
                            </div>
                            <div className="text-slate-700 font-semibold mt-0.5 text-xs">
                                {metrics.critical} <span className="text-[10px] text-slate-400 font-normal">({metrics.pctCritical.toFixed(0)}%)</span>
                            </div>
                        </button>

                        <button
                            onClick={() => setExpiryFilter(expiryFilter === 'EXPIRED' ? 'ALL' : 'EXPIRED')}
                            className={`p-2 rounded-xl border text-left transition-all ${
                                expiryFilter === 'EXPIRED'
                                    ? 'border-rose-400 bg-rose-50/70 shadow-xs'
                                    : 'border-slate-100 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-center gap-1.5 text-rose-700 font-bold">
                                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                                <span>Expired</span>
                            </div>
                            <div className="text-slate-700 font-semibold mt-0.5 text-xs">
                                {metrics.expired} <span className="text-[10px] text-slate-400 font-normal">({metrics.pctExpired.toFixed(0)}%)</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* 2. Subscription Plan Tier & Revenue Breakdown Bars */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                <Icon icon="lucide:layers" className="text-[#2980B9]" />
                                Plan Tier &amp; Revenue Representation
                            </h2>
                            <p className="text-[11px] text-slate-400 font-medium">
                                Breakdown of plan types and contribution to total subscription billing
                            </p>
                        </div>
                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md">
                            ₹{metrics.totalMonthlyRevenue.toLocaleString('en-IN')} Total
                        </span>
                    </div>

                    <div className="space-y-2.5 pt-1">
                        {/* PRO Plan */}
                        <div>
                            <div className="flex justify-between items-center text-xs mb-1">
                                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#2980B9] border border-blue-200">PRO</span>
                                    <span>Plan ({metrics.planCounts.PRO})</span>
                                </div>
                                <span className="font-semibold text-slate-600 text-[11px]">
                                    ₹{metrics.planRevenue.PRO.toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                    style={{ width: `${metrics.total > 0 ? (metrics.planCounts.PRO / metrics.total) * 100 : 0}%` }}
                                    className="bg-gradient-to-r from-[#2980B9] to-[#0284C7] h-full rounded-full transition-all"
                                />
                            </div>
                        </div>

                        {/* CUSTOM Plan */}
                        <div>
                            <div className="flex justify-between items-center text-xs mb-1">
                                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">CUSTOM</span>
                                    <span>Plan ({metrics.planCounts.CUSTOM})</span>
                                </div>
                                <span className="font-semibold text-slate-600 text-[11px]">
                                    ₹{metrics.planRevenue.CUSTOM.toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                    style={{ width: `${metrics.total > 0 ? (metrics.planCounts.CUSTOM / metrics.total) * 100 : 0}%` }}
                                    className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-full transition-all"
                                />
                            </div>
                        </div>

                        {/* PREMIUM Plan */}
                        <div>
                            <div className="flex justify-between items-center text-xs mb-1">
                                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">PREMIUM</span>
                                    <span>Plan ({metrics.planCounts.PREMIUM})</span>
                                </div>
                                <span className="font-semibold text-slate-600 text-[11px]">
                                    ₹{metrics.planRevenue.PREMIUM.toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                    style={{ width: `${metrics.total > 0 ? (metrics.planCounts.PREMIUM / metrics.total) * 100 : 0}%` }}
                                    className="bg-gradient-to-r from-teal-500 to-emerald-600 h-full rounded-full transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter & Search Toolbar (Designed specifically for Accountants) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    {/* Live Search Bar */}
                    <div className="relative flex-1">
                        <Icon icon="lucide:search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by store name, tenant ID, owner, phone, email, GSTIN..."
                            className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2980B9] focus:bg-white transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <Icon icon="lucide:x" className="text-sm" />
                            </button>
                        )}
                    </div>

                    {/* Filter Select Dropdowns */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Expiry Time Filter */}
                        <div className="relative flex items-center">
                            <select
                                value={expiryFilter}
                                onChange={(e) => setExpiryFilter(e.target.value)}
                                className="py-2 pl-3 pr-7 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#2980B9] appearance-none cursor-pointer"
                            >
                                <option value="ALL">All Expiry Times</option>
                                <option value="CRITICAL">Critical (&le; 7 Days)</option>
                                <option value="EXPIRING_SOON">Expiring Soon (&le; 30 Days)</option>
                                <option value="ACTIVE_SAFE">Safe (&gt; 30 Days)</option>
                                <option value="EXPIRED">Already Expired</option>
                            </select>
                            <Icon icon="lucide:chevron-down" className="absolute right-2 text-slate-400 pointer-events-none text-xs" />
                        </div>

                        {/* Plan Filter */}
                        <div className="relative flex items-center">
                            <select
                                value={planFilter}
                                onChange={(e) => setPlanFilter(e.target.value)}
                                className="py-2 pl-3 pr-7 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#2980B9] appearance-none cursor-pointer"
                            >
                                <option value="ALL">All Plans</option>
                                <option value="PRO">PRO</option>
                                <option value="CUSTOM">CUSTOM</option>
                                <option value="PREMIUM">PREMIUM</option>
                            </select>
                            <Icon icon="lucide:chevron-down" className="absolute right-2 text-slate-400 pointer-events-none text-xs" />
                        </div>

                        {/* Status Filter */}
                        <div className="relative flex items-center">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="py-2 pl-3 pr-7 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#2980B9] appearance-none cursor-pointer"
                            >
                                <option value="ALL">All Status</option>
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="SUSPENDED">SUSPENDED</option>
                            </select>
                            <Icon icon="lucide:chevron-down" className="absolute right-2 text-slate-400 pointer-events-none text-xs" />
                        </div>

                        {/* Sort By */}
                        <div className="relative flex items-center">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="py-2 pl-3 pr-7 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#2980B9] appearance-none cursor-pointer"
                            >
                                <option value="EXPIRY_ASC">Expiry: Nearest First</option>
                                <option value="EXPIRY_DESC">Expiry: Furthest First</option>
                                <option value="NAME_ASC">Name (A &rarr; Z)</option>
                                <option value="FEE_DESC">Fee: High to Low</option>
                                <option value="NEWEST">Newest Created</option>
                            </select>
                            <Icon icon="lucide:chevron-down" className="absolute right-2 text-slate-400 pointer-events-none text-xs" />
                        </div>

                        {/* Reset Filters Button */}
                        {hasActiveFilters && (
                            <button
                                onClick={handleResetFilters}
                                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-semibold text-xs transition-all flex items-center gap-1 border border-rose-200"
                            >
                                <Icon icon="lucide:rotate-ccw" className="text-xs" />
                                <span>Reset</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Quick Filter Status Badges */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 text-xs">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick Filter:</span>
                    <button
                        onClick={() => { setExpiryFilter('ALL'); setStatusFilter('ALL'); }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            expiryFilter === 'ALL' && statusFilter === 'ALL'
                                ? 'bg-slate-800 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        All ({metrics.total})
                    </button>

                    <button
                        onClick={() => { setExpiryFilter('EXPIRING_SOON'); setStatusFilter('ALL'); }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            expiryFilter === 'EXPIRING_SOON'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                        }`}
                    >
                        Expiring Soon ({metrics.totalExpiringCohort})
                    </button>

                    <button
                        onClick={() => { setExpiryFilter('EXPIRED'); setStatusFilter('ALL'); }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            expiryFilter === 'EXPIRED'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                        }`}
                    >
                        Expired ({metrics.expired})
                    </button>

                    <button
                        onClick={() => { setStatusFilter('ACTIVE'); setExpiryFilter('ALL'); }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            statusFilter === 'ACTIVE'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                    >
                        Active ({metrics.active})
                    </button>

                    <button
                        onClick={() => { setStatusFilter('SUSPENDED'); setExpiryFilter('ALL'); }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            statusFilter === 'SUSPENDED'
                                ? 'bg-slate-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                        }`}
                    >
                        Suspended ({metrics.suspended})
                    </button>

                    <span className="ml-auto text-[11px] font-semibold text-slate-400">
                        Showing {filteredTenants.length} of {metrics.total} Wholesalers
                    </span>
                </div>
            </div>

            {/* Wholesaler List Section with Differentiating Info for Accountants */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <span>Registered Wholesalers &amp; Subscription Accounts</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                {filteredTenants.length}
                            </span>
                        </h2>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                            Accountant View: Comprehensive subscription status, expiry urgency, contact details &amp; tax invoicing
                        </p>
                    </div>

                    <button
                        onClick={() => navigate(PATHS.TENANTS.LIST)}
                        className="text-xs font-semibold text-[#2980B9] hover:underline flex items-center gap-1 self-end sm:self-auto"
                    >
                        <span>View All in Tenant List</span>
                        <Icon icon="lucide:arrow-right" />
                    </button>
                </div>

                {/* Mobile Cards View (md:hidden) */}
                <div className="block md:hidden divide-y divide-slate-100">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400 text-xs font-medium">
                            <Icon icon="lucide:loader" className="animate-spin text-xl text-[#2980B9] mx-auto mb-2" />
                            Loading platform accounts...
                        </div>
                    ) : filteredTenants.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs font-medium">
                            No wholesalers matched the selected filters.
                            {hasActiveFilters && (
                                <button
                                    onClick={handleResetFilters}
                                    className="block mx-auto mt-2 text-[#2980B9] font-bold hover:underline"
                                >
                                    Reset all filters
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredTenants.map((t) => {
                            const store = t.storeInformation || {};
                            const owner = t.owner || {};
                            const isSuspended = t.status === 'SUSPENDED';
                            const expMeta = getTenantExpiryMeta(t);
                            const pricing = getTenantSubscriptionPricing(t);

                            return (
                                <div key={t._id} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-sm leading-snug">{store.storeName || 'N/A'}</h3>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="font-mono text-[11px] text-[#2980B9] font-semibold">{t.tenantId}</span>
                                                <button
                                                    onClick={() => handleCopy(t.tenantId, 'Tenant ID')}
                                                    className="text-slate-400 hover:text-slate-600"
                                                    title="Copy ID"
                                                >
                                                    <Icon icon="lucide:copy" className="text-[11px]" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 border ${
                                                isSuspended ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            }`}>
                                                {t.status || 'ACTIVE'}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${expMeta.badgeClass}`}>
                                                {expMeta.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Mini Progress Bar for Expiry */}
                                    {expMeta.hasExpiry && (
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] text-slate-400">
                                                <span>Expiry: {expMeta.formattedDate}</span>
                                                <span className="font-semibold text-slate-600">{expMeta.percentRemaining}% valid</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    style={{ width: `${expMeta.percentRemaining}%` }}
                                                    className={`h-full rounded-full ${expMeta.barColor}`}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-50">
                                        <div className="space-y-0.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Owner Contact</span>
                                            <span className="font-semibold text-slate-700 block truncate">{owner.ownerName || 'N/A'}</span>
                                            {owner.mobile && (
                                                <a href={`tel:${owner.mobile}`} className="text-[11px] text-[#2980B9] font-medium block truncate flex items-center gap-1 hover:underline">
                                                    <Icon icon="lucide:phone" className="text-[10px]" />
                                                    {owner.mobile}
                                                </a>
                                            )}
                                            {owner.email && (
                                                <a href={`mailto:${owner.email}`} className="text-[11px] text-slate-500 block truncate hover:underline">
                                                    {owner.email}
                                                </a>
                                            )}
                                        </div>

                                        <div className="space-y-0.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Subscription Fee</span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                    {t.subscription?.planType || 'PRO'}
                                                </span>
                                                <span className="font-bold text-slate-800 text-xs">{pricing.formattedTotal}</span>
                                            </div>
                                            {store.address && (
                                                <span className="text-[10px] text-slate-400 block truncate mt-1">
                                                    {store.address}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                        <button
                                            onClick={() => generateTenantInvoice(t)}
                                            className="px-2.5 py-1 text-xs font-semibold text-[#2980B9] bg-blue-50/60 hover:bg-blue-100/70 rounded-lg flex items-center gap-1.5"
                                        >
                                            <Icon icon="lucide:file-text" className="text-sm" />
                                            <span>Tax Invoice</span>
                                        </button>

                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => navigate(`/tenants/view/${t._id}`)}
                                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs"
                                            >
                                                Manage
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(t)}
                                                className={`px-2.5 py-1 rounded-lg font-semibold text-xs ${
                                                    isSuspended ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                                }`}
                                            >
                                                {isSuspended ? 'Activate' : 'Suspend'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Desktop Data-Dense Accountant Table (hidden on mobile) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50/90 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                                <th className="py-3 px-4">Wholesaler &amp; Workspace</th>
                                <th className="py-3 px-4">Owner &amp; Accountant Contact</th>
                                <th className="py-3 px-4">Plan &amp; Billing</th>
                                <th className="py-3 px-4 min-w-[170px]">Subscription Expiry</th>
                                <th className="py-3 px-4 text-center">Status</th>
                                <th className="py-3 px-4 text-center min-w-[190px]">Accountant Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-10 text-center text-slate-400 font-medium">
                                        <Icon icon="lucide:loader" className="animate-spin text-2xl text-[#2980B9] mx-auto mb-2" />
                                        Loading platform data...
                                    </td>
                                </tr>
                            ) : filteredTenants.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-slate-400 font-medium">
                                        <Icon icon="lucide:search-x" className="text-3xl text-slate-300 mx-auto mb-2" />
                                        <div>No wholesalers match the selected filters.</div>
                                        {hasActiveFilters && (
                                            <button
                                                onClick={handleResetFilters}
                                                className="mt-2 text-xs font-bold text-[#2980B9] hover:underline"
                                            >
                                                Clear all filters
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                filteredTenants.map((t) => {
                                    const store = t.storeInformation || {};
                                    const owner = t.owner || {};
                                    const inv = t.invoiceDetails || {};
                                    const isSuspended = t.status === 'SUSPENDED';
                                    const expMeta = getTenantExpiryMeta(t);
                                    const pricing = getTenantSubscriptionPricing(t);

                                    return (
                                        <tr key={t._id} className="hover:bg-slate-50/70 transition-colors">
                                            {/* Wholesaler & Workspace */}
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-slate-800 text-xs">
                                                    {store.storeName || 'Wholesaler Workspace'}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="font-mono text-[10.5px] text-[#2980B9] font-bold">
                                                        {t.tenantId}
                                                    </span>
                                                    <button
                                                        onClick={() => handleCopy(t.tenantId, 'Tenant ID')}
                                                        className="text-slate-400 hover:text-[#2980B9] transition-colors"
                                                        title="Copy Tenant ID"
                                                    >
                                                        <Icon icon="lucide:copy" className="text-[11px]" />
                                                    </button>
                                                </div>
                                                {store.address && (
                                                    <div className="text-[10px] text-slate-400 truncate max-w-[200px] mt-0.5" title={store.address}>
                                                        {store.address}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Owner & Contact */}
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-slate-700">
                                                    {owner.ownerName || 'N/A'}
                                                </div>
                                                {owner.mobile && (
                                                    <a
                                                        href={`tel:${owner.mobile}`}
                                                        className="text-[11px] text-[#2980B9] hover:underline font-medium flex items-center gap-1 mt-0.5"
                                                        title="Call Owner"
                                                    >
                                                        <Icon icon="lucide:phone" className="text-[10px]" />
                                                        <span>{owner.mobile}</span>
                                                    </a>
                                                )}
                                                {owner.email && (
                                                    <a
                                                        href={`mailto:${owner.email}`}
                                                        className="text-[10.5px] text-slate-400 hover:text-slate-600 hover:underline block truncate max-w-[190px]"
                                                        title={owner.email}
                                                    >
                                                        {owner.email}
                                                    </a>
                                                )}
                                            </td>

                                            {/* Plan & Billing */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                        (t.subscription?.planType || 'PRO') === 'PREMIUM'
                                                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                                                            : (t.subscription?.planType || 'PRO') === 'CUSTOM'
                                                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                            : 'bg-blue-50 text-[#2980B9] border-blue-200'
                                                    }`}>
                                                        {t.subscription?.planType || 'PRO'}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] font-bold text-slate-800 mt-1">
                                                    {pricing.formattedTotal}
                                                    <span className="text-[10px] font-normal text-slate-400"> /cycle</span>
                                                </div>
                                                {inv.clientGSTIN && (
                                                    <div className="text-[9.5px] font-mono text-slate-400 uppercase">
                                                        GST: {inv.clientGSTIN}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Subscription Expiry with Mini Progress Bar */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-between gap-1 mb-1">
                                                    <span className="font-semibold text-slate-700 text-xs">
                                                        {expMeta.formattedDate}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${expMeta.badgeClass}`}>
                                                        {expMeta.label}
                                                    </span>
                                                </div>

                                                {/* Mini Lifecycle Bar */}
                                                {expMeta.hasExpiry && (
                                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            style={{ width: `${expMeta.percentRemaining}%` }}
                                                            className={`h-full rounded-full ${expMeta.barColor} transition-all`}
                                                        />
                                                    </div>
                                                )}
                                            </td>

                                            {/* Account Status */}
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                                    isSuspended ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                }`}>
                                                    {t.status || 'ACTIVE'}
                                                </span>
                                            </td>

                                            {/* Actions for Accountant */}
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {/* Tax Invoice Generator with DigiBySR Logo */}
                                                    <button
                                                        onClick={() => generateTenantInvoice(t)}
                                                        className="p-1.5 text-[#2980B9] bg-blue-50/70 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-all"
                                                        title="Generate GST Tax Invoice (DigiBySR)"
                                                    >
                                                        <Icon icon="lucide:file-text" className="text-sm" />
                                                    </button>

                                                    {/* Feature Settings */}
                                                    <button
                                                        onClick={() => navigate(`/owner/wholesalers/${t._id}/settings`)}
                                                        className="p-1.5 text-slate-400 hover:text-[#2980B9] hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="Wholesaler Feature & Module Settings"
                                                    >
                                                        <Icon icon="lucide:settings-2" className="text-sm" />
                                                    </button>

                                                    {/* Manage Workspace */}
                                                    <button
                                                        onClick={() => navigate(`/tenants/view/${t._id}`)}
                                                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px] transition-colors"
                                                    >
                                                        Manage
                                                    </button>

                                                    {/* Toggle Suspend / Activate */}
                                                    <button
                                                        onClick={() => handleToggleStatus(t)}
                                                        className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors border ${
                                                            isSuspended
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                                                        }`}
                                                    >
                                                        {isSuspended ? 'Activate' : 'Suspend'}
                                                    </button>

                                                    {/* Delete */}
                                                    <button
                                                        onClick={() => handleDelete(t)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="Delete Wholesaler"
                                                    >
                                                        <Icon icon="lucide:trash-2" className="text-sm" />
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
