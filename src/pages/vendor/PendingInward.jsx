import VendorTabNav from '../../components/vendor/VendorTabNav';
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { getPendingInwardItems, createPurchaseInward } from '../../services/vendorOrderService';
import { uploadMultipleDocuments } from '../../services/bucketService';
import { toast } from 'react-toastify';

const categoryIcon = {
    LENS:         'lucide:eye',
    FRAME:        'lucide:glasses',
    CONTACT_LENS: 'lucide:circle-dot',
};

const PendingInward = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [pagination, setPagination] = useState(null);
    const [page, setPage] = useState(1);

    const [selectedItem, setSelectedItem] = useState(null);
    const [receivedQty, setReceivedQty] = useState(1);
    const [condition, setCondition] = useState('GOOD');
    const [vendorRefId, setVendorRefId] = useState('');
    const [remarks, setRemarks] = useState('');
    const [submittingInward, setSubmittingInward] = useState(false);
    const [invoiceFiles, setInvoiceFiles] = useState([]);

    const [receivedBy, setReceivedBy]     = useState('');
    const [receivedOn, setReceivedOn]     = useState('');
    const [receivedFrom, setReceivedFrom] = useState('');

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getPendingInwardItems(page, 10);
            if (res.success) {
                setItems(Array.isArray(res.data?.items) ? res.data.items : []);
                setPagination(res.data?.pagination || null);
            } else {
                setItems([]);
                toast.error(res.message || 'Failed to load items');
            }
        } catch (err) {
            toast.error(err.message || 'Error fetching pending inward items');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const handleOpenInward = (item) => {
        const remaining = (item.qty || 0) - (item.receivedQty || 0);
        setSelectedItem(item);
        setReceivedQty(remaining > 0 ? remaining : 1);
        setCondition('GOOD');
        setVendorRefId(item.vendorRefId || '');
        setRemarks('');
        setReceivedBy('');
        setReceivedOn(new Date().toISOString().split('T')[0]); // Default to today
        setReceivedFrom('');
        setInvoiceFiles([]);
    };

    const handleSubmitInward = async () => {
        if (!selectedItem) return;
        if (Number(receivedQty) <= 0) {
            toast.error('Received Quantity must be greater than 0');
            return;
        }

        if (!receivedBy.trim()) {
            toast.error('Please enter Received By (Name of receiver)');
            return;
        }

        setSubmittingInward(true);
        try {
            let uploadedInvoices = [];
            if (Array.isArray(invoiceFiles) && invoiceFiles.length > 0) {
                uploadedInvoices = await uploadMultipleDocuments(invoiceFiles);
            }

            const payload = {
                purchaseOrderId: selectedItem.purchaseOrderId,
                remarks: remarks || `Direct inward receipt for item ${selectedItem.itemName}`,
                receivedBy:   receivedBy.trim()   || null,
                receivedOn:   receivedOn          || new Date().toISOString().split('T')[0],
                receivedFrom: receivedFrom.trim() || null,
                invoices:     uploadedInvoices,
                items: [{
                    itemId: selectedItem.itemId || selectedItem._id,
                    receivedQty: Number(receivedQty),
                    condition: condition,
                    vendorRefId: vendorRefId,
                    remarks: remarks,
                }],
            };

            const res = await createPurchaseInward(payload);
            if (res.success) {
                toast.success('Item inwarded successfully!');
                setSelectedItem(null);
                setInvoiceFiles([]);
                fetchItems();
            } else {
                toast.error(res.message || 'Failed to inward item');
            }
        } catch (err) {
            toast.error(err.message || 'Error executing inward receipt');
        } finally {
            setSubmittingInward(false);
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
            <VendorTabNav groupKey="PURCHASES_INWARD" />
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Icon icon="lucide:package-open" className="text-[#2980B9]" />
                        Pending Inward
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Purchase items awaiting inward receipt
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
                        const totalQty = items.filter(i => i.category === cat).reduce((s, i) => s + ((i.qty || 0) - (i.receivedQty || 0)), 0);
                        if (!count) return null;
                        return (
                            <div key={cat} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon icon={categoryIcon[cat]} className="text-[#2980B9] text-lg" />
                                    <span className="text-xs font-semibold text-gray-500 uppercase">{cat.replace('_', ' ')}</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-800">{count}</p>
                                <p className="text-xs text-gray-400 mt-1">Remaining Qty: {totalQty}</p>
                            </div>
                        );
                    })}
                    <div className="bg-[#eaf4fb] rounded-xl border border-[#2980B9]/20 p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Icon icon="lucide:alert-circle" className="text-[#1F618D] text-lg" />
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
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search by item, vendor, order..."
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9]"
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9]"
                >
                    <option value="">All Categories</option>
                    <option value="LENS">Lens</option>
                    <option value="FRAME">Frame</option>
                    <option value="CONTACT_LENS">Contact Lens</option>
                </select>
                {(search || categoryFilter) && (
                    <button
                        onClick={() => { setSearch(''); setCategoryFilter(''); setPage(1); }}
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
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Item</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Vendor</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Order #</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Category</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Qty Pending</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Price</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Type</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <Icon icon="lucide:loader-2" className="animate-spin text-xl text-[#2980B9]" />
                                            <span>Loading pending items...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Icon icon="lucide:check-circle-2" className="text-4xl text-gray-300" />
                                            <p className="text-gray-500 font-medium">No pending inward items</p>
                                            <p className="text-xs text-gray-400">All items have been received</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((item, idx) => {
                                    const catIcon = categoryIcon[item.category] || 'lucide:box';
                                    const remaining = (item.qty ?? 0) - (item.receivedQty ?? 0);
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
                                            <td className="px-4 py-2">
                                                <p className="text-xs font-medium text-gray-700">{item.vendorName || '—'}</p>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className="font-mono text-[10px] text-gray-500">{item.orderNumber}</span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className="text-[10px] px-2 py-0.5 bg-[#eaf4fb] text-[#1F618D] rounded-full font-medium">
                                                    {item.category?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-bold text-[#1F618D]">{remaining}</span>
                                                    <span className="text-[10px] text-gray-400">/ {item.qty ?? 0} {item.unit}</span>
                                                </div>
                                                {item.receivedQty > 0 && (
                                                    <p className="text-[10px] text-gray-400 mt-0.5">{item.receivedQty} received</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-2">
                                                <p className="text-xs font-semibold text-gray-800">₹{item.price?.toLocaleString('en-IN') ?? '—'}</p>
                                                <p className="text-[10px] text-gray-400">MRP ₹{item.mrp?.toLocaleString('en-IN') ?? '—'}</p>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                                                    item.orderType === 'RX' ? 'bg-[#eaf4fb] text-[#1F618D]' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {item.orderType}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <button
                                                    onClick={() => handleOpenInward(item)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-[#1F618D] bg-[#eaf4fb] hover:bg-[#1F618D] hover:text-white border border-[#2980B9]/20 rounded-lg transition-colors"
                                                >
                                                    <Icon icon="lucide:package-check" className="text-xs" />
                                                    Inward
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

            {/* Inward Modal */}
            {selectedItem && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedItem(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        
                        {/* Header */}
                        <div className="p-5 border-b border-gray-100 bg-[#eaf4fb] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#1F618D] flex items-center justify-center">
                                    <Icon icon="lucide:package-check" className="text-white text-xl" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-[#1F618D]">Inward Item Receipt</h2>
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
                                    Total Ordered: <strong>{selectedItem.qty} {selectedItem.unit}</strong> | Remaining: <strong>{selectedItem.qty - (selectedItem.receivedQty || 0)}</strong>
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Received Qty</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={selectedItem.qty - (selectedItem.receivedQty || 0)}
                                    value={receivedQty}
                                    onChange={e => setReceivedQty(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Condition</label>
                                <select
                                    value={condition}
                                    onChange={e => setCondition(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9] bg-white"
                                >
                                    <option value="GOOD">Good</option>
                                    <option value="PARTIAL">Partial</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Vendor Ref ID / Invoice #</label>
                                <input
                                    type="text"
                                    value={vendorRefId}
                                    onChange={e => setVendorRefId(e.target.value)}
                                    placeholder="Enter reference ID"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9]"
                                />
                            </div>

                                <div className="bg-[#eaf4fb]/40 border border-[#2980B9]/15 rounded-xl p-3 space-y-3">
                                    <p className="text-[11px] font-bold text-[#1F618D] uppercase tracking-wider flex items-center gap-1.5">
                                        <Icon icon="lucide:clipboard-list" className="text-sm" />
                                        Receipt Details
                                    </p>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Received By <span className="text-red-400">*</span></label>
                                        <input
                                            type="text"
                                            value={receivedBy}
                                            onChange={e => setReceivedBy(e.target.value)}
                                            placeholder="Name of person who received the goods"
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Received On <span className="text-red-400">*</span></label>
                                        <input
                                            type="date"
                                            value={receivedOn}
                                            max={new Date().toISOString().split('T')[0]}
                                            onChange={e => setReceivedOn(e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Received From</label>
                                        <input
                                            type="text"
                                            value={receivedFrom}
                                            onChange={e => setReceivedFrom(e.target.value)}
                                            placeholder="Vendor rep / courier / delivery person"
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9]"
                                        />
                                    </div>
                                </div>

                                {/* Invoice / Challan Upload */}
                                <div className="bg-[#eaf4fb]/40 border border-[#2980B9]/20 rounded-xl p-3.5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                                            <Icon icon="lucide:paperclip" className="text-[#1F618D]" />
                                            Invoices / Challans / Bills (Optional, max 5)
                                        </label>
                                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-[#2980B9]/30 text-[#1F618D] text-xs font-semibold rounded-lg cursor-pointer transition shadow-2xs">
                                            <Icon icon="lucide:upload" className="text-xs" />
                                            <span>Attach Files</span>
                                            <input
                                                type="file"
                                                multiple
                                                accept="application/pdf,image/*"
                                                className="hidden"
                                                onChange={e => {
                                                    const newFiles = Array.from(e.target.files || []);
                                                    setInvoiceFiles(prev => [...prev, ...newFiles].slice(0, 5));
                                                    e.target.value = '';
                                                }}
                                            />
                                        </label>
                                    </div>
                                    <p className="text-[11px] text-gray-400">Attach vendor purchase invoice PDFs, delivery challans, or bills for this inward receipt</p>
                                    {invoiceFiles.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {invoiceFiles.map((f, fi) => (
                                                <span key={fi} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-blue-200 text-blue-800 text-[11px] font-medium rounded-lg shadow-2xs">
                                                    <Icon icon="lucide:file-text" className="text-[#1F618D]" />
                                                    <span className="truncate max-w-[150px]">{f.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setInvoiceFiles(prev => prev.filter((_, idx) => idx !== fi))}
                                                        className="text-blue-400 hover:text-red-500 ml-1 font-bold text-sm leading-none"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Remarks</label>
                                <textarea
                                    rows={2}
                                    value={remarks}
                                    onChange={e => setRemarks(e.target.value)}
                                    placeholder="Any notes about condition..."
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9] resize-none"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                            <button onClick={() => setSelectedItem(null)}
                                className="px-5 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitInward}
                                disabled={submittingInward}
                                className="px-6 py-2.5 text-xs font-bold text-white bg-[#1F618D] hover:bg-[#174e71] rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {submittingInward ? <Icon icon="lucide:loader-2" className="animate-spin" /> : <Icon icon="lucide:check" />}
                                Submit Inward
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default PendingInward;
