import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { getAllInwardedPurchaseItems } from '../../services/vendorOrderService';
import { toast } from 'react-toastify';

const inwardStatusMeta = {
    RECEIVED:     { cls: 'bg-emerald-50 text-emerald-700', label: 'Received' },
    PARTIAL:      { cls: 'bg-amber-50 text-amber-700',    label: 'Partial' },
    NOT_RECEIVED: { cls: 'bg-gray-100 text-gray-500',     label: 'Not Received' },
    PENDING:      { cls: 'bg-gray-100 text-gray-500',     label: 'Pending' },
};

const qcStatusMeta = {
    PASSED:  { cls: 'bg-emerald-50 text-emerald-700', icon: 'lucide:check-circle', label: 'Passed' },
    PARTIAL: { cls: 'bg-amber-50 text-amber-700',    icon: 'lucide:git-branch',   label: 'Partial' },
    FAILED:  { cls: 'bg-red-50 text-red-700',        icon: 'lucide:x-circle',     label: 'Failed' },
    PENDING: { cls: 'bg-gray-100 text-gray-500',     icon: 'lucide:clock',        label: 'Pending' },
};

const categoryIcon = {
    LENS:         'lucide:eye',
    FRAME:        'lucide:glasses',
    CONTACT_LENS: 'lucide:circle-dot',
};

const AllInwardedItems = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [inwardFilter, setInwardFilter] = useState('');
    const [qcFilter, setQcFilter] = useState('');
    const [pagination, setPagination] = useState(null);

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAllInwardedPurchaseItems(1, 100);
            if (res.success) {
                setItems(Array.isArray(res.data?.items) ? res.data.items : []);
                setPagination(res.data?.pagination || null);
            } else {
                setItems([]);
                toast.error(res.message || 'Failed to load items');
            }
        } catch (err) {
            toast.error(err.message || 'Error fetching inwarded items');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const filtered = items.filter(item => {
        const q = search.toLowerCase();
        const matchesSearch = !q ||
            item.itemName?.toLowerCase().includes(q) ||
            item.vendorName?.toLowerCase().includes(q) ||
            item.orderNumber?.toLowerCase().includes(q) ||
            item.code?.toLowerCase().includes(q);
        const matchesCategory = !categoryFilter || item.category === categoryFilter;
        const matchesInward  = !inwardFilter  || item.inwardStatus === inwardFilter;
        const matchesQc      = !qcFilter      || item.qcStatus     === qcFilter;
        return matchesSearch && matchesCategory && matchesInward && matchesQc;
    });

    return (
        <div className="p-6 max-w-7xl mx-auto h-full flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Icon icon="lucide:package-check" className="text-erp-accent" />
                        All Inwarded Items
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        All purchase items that have been inwarded
                        {pagination && <span className="ml-2 font-medium text-gray-700">({pagination.totalRecords} total)</span>}
                    </p>
                </div>
                <button
                    onClick={fetchItems}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-erp-accent bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
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
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by item, vendor, order..."
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-erp-accent/30"
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-erp-accent/30"
                >
                    <option value="">All Categories</option>
                    <option value="LENS">Lens</option>
                    <option value="FRAME">Frame</option>
                    <option value="CONTACT_LENS">Contact Lens</option>
                </select>
                <select
                    value={inwardFilter}
                    onChange={e => setInwardFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-erp-accent/30"
                >
                    <option value="">All Inward Status</option>
                    <option value="RECEIVED">Received</option>
                    <option value="PARTIAL">Partial</option>
                    <option value="NOT_RECEIVED">Not Received</option>
                </select>
                <select
                    value={qcFilter}
                    onChange={e => setQcFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-erp-accent/30"
                >
                    <option value="">All QC Status</option>
                    <option value="PASSED">Passed</option>
                    <option value="PARTIAL">Partial</option>
                    <option value="FAILED">Failed</option>
                    <option value="PENDING">Pending</option>
                </select>
                {(search || categoryFilter || inwardFilter || qcFilter) && (
                    <button
                        onClick={() => { setSearch(''); setCategoryFilter(''); setInwardFilter(''); setQcFilter(''); }}
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
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Item</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order #</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty / Received</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Inward Status</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">QC Status</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price / MRP</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <Icon icon="lucide:loader-2" className="animate-spin text-xl text-erp-accent" />
                                            <span>Loading inwarded items...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Icon icon="lucide:inbox" className="text-4xl text-gray-300" />
                                            <p className="text-gray-500 font-medium">No inwarded items found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((item, idx) => {
                                    const inwardMeta = inwardStatusMeta[item.inwardStatus] || inwardStatusMeta.PENDING;
                                    const qcMeta     = qcStatusMeta[item.qcStatus]         || qcStatusMeta.PENDING;
                                    const catIcon    = categoryIcon[item.category] || 'lucide:box';
                                    return (
                                        <tr key={item._id || idx} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                                        <Icon icon={catIcon} className="text-blue-500 text-sm" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-800">{item.itemName}</p>
                                                        <p className="text-xs text-gray-400">{item.code || '—'} · {item.brand || '—'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-sm font-medium text-gray-700">{item.vendorName || '—'}</p>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-mono text-xs text-gray-500">{item.orderNumber}</span>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full font-medium">
                                                    {item.category?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm">
                                                    <span className="font-semibold text-gray-800">{item.receivedQty ?? 0}</span>
                                                    <span className="text-gray-400"> / {item.qty ?? 0}</span>
                                                    <span className="text-xs text-gray-400 ml-1">{item.unit}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${inwardMeta.cls}`}>
                                                    {inwardMeta.label}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${qcMeta.cls}`}>
                                                    <Icon icon={qcMeta.icon} className="text-sm" />
                                                    {qcMeta.label}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm">
                                                    <p className="font-semibold text-gray-800">₹{item.price?.toLocaleString('en-IN') ?? '—'}</p>
                                                    <p className="text-xs text-gray-400">MRP ₹{item.mrp?.toLocaleString('en-IN') ?? '—'}</p>
                                                </div>
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
        </div>
    );
};

export default AllInwardedItems;
