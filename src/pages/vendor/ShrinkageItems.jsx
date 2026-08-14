import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { getShrinkageItems } from '../../services/purchaseReturnService';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

const categoryIcon = {
    LENS: 'lucide:eye',
    FRAME: 'lucide:glasses',
    CONTACT_LENS: 'lucide:circle-dot',
};

const ShrinkageItems = () => {
    const [returns, setReturns] = useState([]);
    const [totalShrinkageQty, setTotalShrinkageQty] = useState(0);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');

    const fetchShrinkage = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getShrinkageItems(page, 20);
            if (res.success && res.data) {
                setReturns(Array.isArray(res.data.returns) ? res.data.returns : []);
                setTotalShrinkageQty(res.data.totalShrinkageQty || 0);
                setPagination(res.data.pagination || null);
            } else {
                setReturns([]);
                setTotalShrinkageQty(0);
                setPagination(null);
            }
        } catch (err) {
            toast.error(err.message || 'Error fetching shrinkage items');
            setReturns([]);
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchShrinkage();
    }, [fetchShrinkage]);

    const filtered = returns.filter(item => {
        const q = search.toLowerCase();
        if (!q) return true;
        const vName = item.vendorId?.name || item.vendorName || '';
        const pNo = item.purchaseOrderNo || item.orderNumber || '';
        const rNo = item.returnNo || '';
        const iName = item.items?.map(i => i.itemName).join(' ') || '';
        return vName.toLowerCase().includes(q) ||
            pNo.toLowerCase().includes(q) ||
            rNo.toLowerCase().includes(q) ||
            iName.toLowerCase().includes(q);
    });

    return (
        <div className="p-2 w-full h-full flex flex-col gap-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Icon icon="lucide:package-minus" className="text-amber-600" />
                        Shrinkage Items
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        QC missing or lost inventory items
                        <span className="ml-2 font-bold text-amber-600">
                            (Total Shrinkage Qty: {totalShrinkageQty})
                        </span>
                    </p>
                </div>
                <button
                    onClick={fetchShrinkage}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#2980B9] bg-[#eaf4fb] hover:bg-[#d4eaf6] rounded-xl transition-colors"
                >
                    <Icon icon="lucide:refresh-cw" className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Filter */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                <div className="relative flex-1">
                    <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by vendor, order #, return #, or item name..."
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9]"
                    />
                </div>
                {search && (
                    <button
                        onClick={() => setSearch('')}
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
                            <tr className="bg-amber-50/60 border-b border-amber-100">
                                <th className="py-3 px-4 text-xs font-bold text-amber-900 uppercase tracking-wider">Return / Order #</th>
                                <th className="py-3 px-4 text-xs font-bold text-amber-900 uppercase tracking-wider">Vendor</th>
                                <th className="py-3 px-4 text-xs font-bold text-amber-900 uppercase tracking-wider">Shrinkage Items</th>
                                <th className="py-3 px-4 text-xs font-bold text-amber-900 uppercase tracking-wider text-center">Shrinkage Qty</th>
                                <th className="py-3 px-4 text-xs font-bold text-amber-900 uppercase tracking-wider">Condition</th>
                                <th className="py-3 px-4 text-xs font-bold text-amber-900 uppercase tracking-wider">Created Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <Icon icon="lucide:loader-2" className="animate-spin text-xl text-[#2980B9]" />
                                            <span>Loading shrinkage items...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Icon icon="lucide:check-circle-2" className="text-4xl text-emerald-400" />
                                            <p className="text-gray-500 font-medium">No shrinkage items records found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((ret, idx) => {
                                    const vName = ret.vendorId?.name || ret.vendorName || '—';
                                    const retNo = ret.returnNo || ret._id?.slice(-6).toUpperCase();
                                    const poNo = ret.purchaseOrderNo || ret.orderNumber || '—';
                                    const dateStr = ret.createdAt ? dayjs(ret.createdAt).format('DD MMM YYYY, hh:mm A') : '—';
                                    const itemsList = ret.items || [];
                                    const totalQtyInRet = itemsList.reduce((s, i) => s + (i.failedQty || i.qty || 0), 0);

                                    return (
                                        <tr key={ret._id || idx} className="hover:bg-amber-50/20 transition-colors text-xs">
                                            <td className="px-4 py-3">
                                                <p className="font-mono font-bold text-gray-800">{retNo}</p>
                                                <p className="text-[10px] text-gray-400 font-mono">PO: {poNo}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-bold text-gray-800">{vName}</p>
                                            </td>
                                            <td className="px-4 py-3 space-y-1">
                                                {itemsList.map((itm, iIdx) => (
                                                    <div key={iIdx} className="flex items-center gap-2">
                                                        <Icon icon={categoryIcon[itm.category] || 'lucide:box'} className="text-amber-600 text-xs shrink-0" />
                                                        <span className="font-semibold text-gray-800">{itm.itemName}</span>
                                                        {itm.failureReason && (
                                                            <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                                                {itm.failureReason}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </td>
                                            <td className="px-4 py-3 text-center font-black text-amber-700 text-sm">
                                                {totalQtyInRet}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-amber-100 text-amber-800">
                                                    SHRINKAGE
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 font-medium">
                                                {dateStr}
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
                        <span>Showing <strong>{filtered.length}</strong> records</span>
                        <div className="flex gap-2">
                            <button
                                disabled={!pagination.hasPrev || page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 disabled:opacity-50 rounded-lg font-bold shadow-xs hover:bg-gray-50"
                            >
                                Previous
                            </button>
                            <span className="self-center font-semibold text-gray-700">Page {page} of {pagination.totalPages}</span>
                            <button
                                disabled={!pagination.hasNext || page === pagination.totalPages}
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 disabled:opacity-50 rounded-lg font-bold shadow-xs hover:bg-gray-50"
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

export default ShrinkageItems;
