import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { getQcPendingItems, createPurchaseQC } from '../../services/vendorOrderService';
import { toast } from 'react-toastify';

const categoryIcon = {
    LENS:         'lucide:eye',
    FRAME:        'lucide:glasses',
    CONTACT_LENS: 'lucide:circle-dot',
};

const QcPending = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [pagination, setPagination] = useState(null);

    // QC Modal State
    const [selectedItem, setSelectedItem] = useState(null);
    const [passedQty, setPassedQty] = useState(0);
    const [failedQty, setFailedQty] = useState(0);
    const [failureReason, setFailureReason] = useState('');
    const [remarks, setRemarks] = useState('');
    const [notifyVendor, setNotifyVendor] = useState(false);
    const [submittingQC, setSubmittingQC] = useState(false);

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getQcPendingItems(1, 100);
            if (res.success) {
                setItems(Array.isArray(res.data?.items) ? res.data.items : []);
                setPagination(res.data?.pagination || null);
            } else {
                setItems([]);
                toast.error(res.message || 'Failed to load QC pending items');
            }
        } catch (err) {
            toast.error(err.message || 'Error fetching QC pending items');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const handleOpenQC = (item) => {
        setSelectedItem(item);
        setPassedQty(item.receivedQty || item.qty || 0);
        setFailedQty(0);
        setFailureReason('');
        setRemarks('');
        setNotifyVendor(false);
    };

    const handlePassedQtyChange = (val, maxVal) => {
        const passed = Math.min(maxVal, Math.max(0, parseInt(val) || 0));
        setPassedQty(passed);
        setFailedQty(maxVal - passed);
    };

    const handleFailedQtyChange = (val, maxVal) => {
        const failed = Math.min(maxVal, Math.max(0, parseInt(val) || 0));
        setFailedQty(failed);
        setPassedQty(maxVal - failed);
    };

    const handleSubmitQC = async () => {
        if (!selectedItem) return;
        if (failedQty > 0 && !failureReason.trim()) {
            toast.error('Please specify a Failure Reason for the failed items');
            return;
        }

        setSubmittingQC(true);
        try {
            const payload = {
                purchaseOrderId: selectedItem.purchaseOrderId,
                purchaseInwardId: selectedItem.purchaseInwardId,
                notifyVendor,
                remarks: remarks || `Direct QC check for ${selectedItem.itemName}`,
                items: [{
                    itemId: selectedItem.itemId || selectedItem._id,
                    passedQty: Number(passedQty),
                    failedQty: Number(failedQty),
                    failureReason: failureReason,
                    remarks: remarks,
                }],
            };

            const res = await createPurchaseQC(payload);
            if (res.success) {
                toast.success('QC check submitted successfully!');
                setSelectedItem(null);
                fetchItems();
            } else {
                toast.error(res.message || 'Failed to submit QC');
            }
        } catch (err) {
            toast.error(err.message || 'Error executing QC submission');
        } finally {
            setSubmittingQC(false);
        }
    };

    const filtered = items.filter(item => {
        const q = search.toLowerCase();
        const matchesSearch = !q ||
            item.itemName?.toLowerCase().includes(q) ||
            item.vendorName?.toLowerCase().includes(q) ||
            item.orderNumber?.toLowerCase().includes(q) ||
            item.code?.toLowerCase().includes(q);
        const matchesCategory = !categoryFilter || item.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="p-2 w-full h-full flex flex-col gap-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Icon icon="lucide:clipboard-list" className="text-[#2980B9]" />
                        QC Pending
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Inwarded items awaiting quality check
                        {pagination && (
                            <span className="ml-2 font-semibold text-[#1F618D]">
                                ({pagination.totalRecords} pending)
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={fetchItems}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#2980B9] bg-[#eaf4fb] hover:bg-[#d4eaf6] rounded-xl transition-colors"
                >
                    <Icon icon="lucide:refresh-cw" className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Summary stat */}
            {!loading && items.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {['LENS', 'FRAME', 'CONTACT_LENS'].map(cat => {
                        const count = items.filter(i => i.category === cat).length;
                        const totalQty = items.filter(i => i.category === cat).reduce((s, i) => s + (i.receivedQty || i.qty || 0), 0);
                        if (!count) return null;
                        return (
                            <div key={cat} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon icon={categoryIcon[cat]} className="text-[#2980B9] text-lg" />
                                    <span className="text-xs font-semibold text-gray-500 uppercase">{cat.replace('_', ' ')}</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-800">{count}</p>
                                <p className="text-xs text-gray-400 mt-1">Pending Qty: {totalQty}</p>
                            </div>
                        );
                    })}
                    <div className="bg-[#eaf4fb] rounded-xl border border-[#2980B9]/20 p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Icon icon="lucide:clipboard-list" className="text-[#1F618D] text-lg" />
                            <span className="text-xs font-semibold text-[#1F618D] uppercase">Total Pending</span>
                        </div>
                        <p className="text-2xl font-bold text-[#1F618D]">{items.length}</p>
                        <p className="text-xs text-[#2980B9] mt-1">Across all categories</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by item, vendor, order..."
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9]"
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9]"
                >
                    <option value="">All Categories</option>
                    <option value="LENS">Lens</option>
                    <option value="FRAME">Frame</option>
                    <option value="CONTACT_LENS">Contact Lens</option>
                </select>
                {(search || categoryFilter) && (
                    <button onClick={() => { setSearch(''); setCategoryFilter(''); }}
                        className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
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
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Item</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Vendor</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Order #</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Category</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Received Qty</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">QC Status</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="7" className="p-8 text-center text-gray-500">
                                    <div className="flex justify-center items-center gap-2">
                                        <Icon icon="lucide:loader-2" className="animate-spin text-xl text-[#2980B9]" />
                                        <span>Loading QC pending items...</span>
                                    </div>
                                </td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="7" className="p-12 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Icon icon="lucide:check-circle-2" className="text-4xl text-gray-300" />
                                        <p className="text-gray-500 font-medium">No items pending QC</p>
                                    </div>
                                </td></tr>
                            ) : (
                                filtered.map((item, idx) => {
                                    const catIcon = categoryIcon[item.category] || 'lucide:box';
                                    return (
                                        <tr key={item._id || idx} className="hover:bg-[#eaf4fb]/20 transition-colors">
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-[#eaf4fb] flex items-center justify-center shrink-0">
                                                        <Icon icon={catIcon} className="text-[#2980B9] text-xs" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-800">{item.itemName}</p>
                                                        <p className="text-[10px] text-gray-400">{item.code || '—'} · {item.brand || '—'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2"><p className="text-xs font-medium text-gray-700">{item.vendorName || '—'}</p></td>
                                            <td className="px-4 py-2"><span className="font-mono text-[10px] text-gray-500">{item.orderNumber}</span></td>
                                            <td className="px-4 py-2">
                                                <span className="text-[10px] px-2 py-0.5 bg-[#eaf4fb] text-[#1F618D] rounded-full font-medium">
                                                    {item.category?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs font-bold text-[#1F618D]">{item.receivedQty ?? item.qty ?? 0}</span>
                                                    <span className="text-[10px] text-gray-400">{item.unit}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gray-100 text-gray-600">
                                                    <Icon icon="lucide:clock" className="text-xs" /> PENDING
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <button
                                                    onClick={() => handleOpenQC(item)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-[#1F618D] bg-[#eaf4fb] hover:bg-[#1F618D] hover:text-white border border-[#2980B9]/20 rounded-lg transition-colors"
                                                >
                                                    <Icon icon="lucide:shield-check" className="text-xs" />
                                                    QC Check
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
                        <span>Showing <strong>{filtered.length}</strong> of <strong>{items.length}</strong> items</span>
                    </div>
                )}
            </div>

            {/* QC Check Modal */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedItem(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        
                        {/* Header */}
                        <div className="p-5 border-b border-gray-100 bg-[#eaf4fb] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#1F618D] flex items-center justify-center">
                                    <Icon icon="lucide:shield-check" className="text-white text-xl" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-[#1F618D]">QC Check Details</h2>
                                    <p className="text-xs text-[#2980B9] mt-0.5">Order #{selectedItem.orderNumber}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                                <Icon icon="lucide:x" className="text-gray-500" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            <div className="bg-[#eaf4fb]/30 border border-[#2980B9]/15 rounded-xl p-3">
                                <p className="text-xs font-bold text-gray-700">{selectedItem.itemName}</p>
                                <p className="text-[11px] text-gray-500 mt-1">
                                    Received Quantity to inspect: <strong>{selectedItem.receivedQty ?? selectedItem.qty ?? 0} {selectedItem.unit}</strong>
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Passed Qty</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={selectedItem.receivedQty ?? selectedItem.qty ?? 0}
                                        value={passedQty}
                                        onChange={e => handlePassedQtyChange(e.target.value, selectedItem.receivedQty ?? selectedItem.qty ?? 0)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Failed Qty</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={selectedItem.receivedQty ?? selectedItem.qty ?? 0}
                                        value={failedQty}
                                        onChange={e => handleFailedQtyChange(e.target.value, selectedItem.receivedQty ?? selectedItem.qty ?? 0)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9]"
                                    />
                                </div>
                            </div>

                            {failedQty > 0 && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-[#E74C3C] mb-1.5">Failure Reason *</label>
                                    <input
                                        type="text"
                                        value={failureReason}
                                        onChange={e => setFailureReason(e.target.value)}
                                        placeholder="e.g. Scratches on coating, broken frame..."
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E74C3C]/20 focus:border-[#E74C3C]"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Remarks / Inspection Notes</label>
                                <textarea
                                    rows={2}
                                    value={remarks}
                                    onChange={e => setRemarks(e.target.value)}
                                    placeholder="Optional remarks..."
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9] resize-none"
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="notifyVendorCheckbox"
                                    checked={notifyVendor}
                                    onChange={e => setNotifyVendor(e.target.checked)}
                                    className="w-4 h-4 text-[#1F618D] border-gray-300 rounded focus:ring-[#1F618D]"
                                />
                                <label htmlFor="notifyVendorCheckbox" className="text-xs font-semibold text-gray-700 cursor-pointer select-none">
                                    Notify Vendor of QC Failure
                                </label>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                            <button onClick={() => setSelectedItem(null)}
                                className="px-5 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitQC}
                                disabled={submittingQC}
                                className="px-6 py-2.5 text-xs font-bold text-white bg-[#1F618D] hover:bg-[#174e71] rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {submittingQC ? <Icon icon="lucide:loader-2" className="animate-spin" /> : <Icon icon="lucide:check" />}
                                Submit QC Report
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QcPending;
