import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { getReplacementOrders } from '../../services/vendorOrderService';
import { toast } from 'react-toastify';

const ReplacementOrderList = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState(null);
    const [page, setPage] = useState(1);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getReplacementOrders(page, 10);
            if (res.success) {
                setOrders(res.data?.replacementOrders || res.data || []);
                setPagination(res.data?.pagination || null);
            } else {
                setOrders([]);
                toast.error(res.message || 'Failed to fetch replacement orders');
            }
        } catch (err) {
            toast.error(err.message || 'Error fetching replacement orders');
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const filtered = orders.filter(order => {
        const q = search.toLowerCase();
        return !q ||
            order._id?.toLowerCase().includes(q) ||
            order.vendor?.vendorName?.toLowerCase().includes(q) ||
            order.orders?.some(o => o.orderNumber?.toLowerCase().includes(q));
    });

    return (
        <div className="p-2 w-full h-full flex flex-col gap-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Icon icon="lucide:package-check" className="text-[#2980B9]" />
                        Replacement Orders
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Track purchase orders generated as vendor replacements
                        {pagination && <span className="ml-2 font-medium text-gray-700">({pagination.totalRecords} total)</span>}
                    </p>
                </div>
                <button
                    onClick={fetchOrders}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#2980B9] bg-[#eaf4fb] hover:bg-[#d4eaf6] rounded-xl transition-colors"
                >
                    <Icon icon="lucide:refresh-cw" className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search by ID, Vendor, Order Number..."
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9]"
                    />
                </div>
                {search && (
                    <button
                        onClick={() => { setSearch(''); setPage(1); }}
                        className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                        <Icon icon="lucide:x" className="text-sm" /> Clear
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#eaf4fb]/50 border-b border-[#2980B9]/15">
                                <th className="py-2.5 px-4 w-12 text-[#1F618D]"></th>
                                <th className="py-2.5 px-4 text-sm font-bold text-[#1F618D] uppercase tracking-wider">Order ID</th>
                                <th className="py-2.5 px-4 text-sm font-bold text-[#1F618D] uppercase tracking-wider">Vendor</th>
                                <th className="py-2.5 px-4 text-sm font-bold text-[#1F618D] uppercase tracking-wider">Status</th>
                                <th className="py-2.5 px-4 text-sm font-bold text-[#1F618D] uppercase tracking-wider">Summary</th>
                                <th className="py-2.5 px-4 text-sm font-bold text-[#1F618D] uppercase tracking-wider">Created Date</th>
                                <th className="py-2.5 px-4 text-sm font-bold text-[#1F618D] uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <Icon icon="lucide:loader-2" className="animate-spin text-xl text-[#2980B9]" />
                                            <span>Loading replacement orders...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Icon icon="lucide:inbox" className="text-4xl text-gray-300" />
                                            <p className="text-gray-500 font-medium">No replacement orders found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((order, idx) => {
                                    const summary = order.replacementSummary || { totalItems: 0, inwardDone: 0, qcPassed: 0, qcFailed: 0 };
                                    return (
                                            <tr
                                                key={order._id || idx}
                                                className="hover:bg-[#eaf4fb]/20 transition-colors cursor-pointer group"
                                                onClick={() => navigate(`/vendor/replacement-orders/${order._id}`)}
                                            >
                                                <td className="px-4 py-2">
                                                    <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#eaf4fb] transition-colors">
                                                        <Icon icon="lucide:arrow-right" className="text-gray-400 group-hover:text-[#2980B9] text-xs" />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span className="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                                        #{order._id?.slice(-8).toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <p className="text-sm font-semibold text-gray-800">{order.vendor?.vendorName || '—'}</p>
                                                    <p className="text-xs text-gray-400 font-mono mt-0.5">{order.vendor?.gstNumber}</p>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                                                        order.overallStatus === 'QC Completed' ? 'bg-[#eaf4fb] text-[#1F618D]' :
                                                        order.overallStatus === 'Partially Received' ? 'bg-[#fdf8ed] text-[#b45309]' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {order.overallStatus || 'Submitted'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-xs text-gray-600 space-y-0.5">
                                                    <div>Total Items: <span className="font-bold">{summary.totalItems}</span></div>
                                                    <div>Inwarded: <span className="font-bold">{summary.inwardDone}</span></div>
                                                    <div className="flex items-center gap-2">
                                                        <span>QC:</span>
                                                        <span className="text-[#1F618D] font-bold">{summary.qcPassed} Passed</span>
                                                        {summary.qcFailed > 0 && (
                                                            <span className="text-[#E74C3C] font-bold">{summary.qcFailed} Failed</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                                                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                                        day: '2-digit', month: 'short', year: 'numeric'
                                                    })}
                                                </td>
                                                <td className="px-4 py-2 text-right" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => navigate(`/vendor/replacement-orders/${order._id}`)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#1F618D] bg-[#eaf4fb] hover:bg-[#1F618D] hover:text-white rounded-lg transition-colors border border-[#2980B9]/10"
                                                    >
                                                        <Icon icon="lucide:eye" className="text-sm" />
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {pagination && pagination.totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center bg-gray-50/50">
                        <span>Showing <strong>{filtered.length}</strong> items</span>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold shadow-sm hover:bg-gray-50 transition-colors"
                            >
                                Previous
                            </button>
                            <span className="self-center font-semibold text-gray-700">Page {page} of {pagination.totalPages}</span>
                            <button
                                disabled={page === pagination.totalPages}
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold shadow-sm hover:bg-gray-50 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReplacementOrderList;
