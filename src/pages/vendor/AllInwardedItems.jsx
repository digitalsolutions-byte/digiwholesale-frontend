import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { getAllInwardedPurchaseItems } from '../../services/vendorOrderService';
import { toast } from 'react-toastify';

const inwardStatusMeta = {
    RECEIVED:     { cls: 'bg-[#eaf4fb] text-[#1F618D]',   label: 'Received' },
    PARTIAL:      { cls: 'bg-[#fdf8ed] text-[#b45309]',   label: 'Partial' },
    NOT_RECEIVED: { cls: 'bg-gray-100 text-gray-500',      label: 'Not Received' },
    PENDING:      { cls: 'bg-gray-100 text-gray-500',      label: 'Pending' },
};

const qcStatusMeta = {
    PASSED:  { cls: 'bg-[#eaf4fb] text-[#1F618D]',   icon: 'lucide:check-circle', label: 'Passed' },
    PARTIAL: { cls: 'bg-[#fdf8ed] text-[#b45309]',   icon: 'lucide:git-branch',   label: 'Partial' },
    FAILED:  { cls: 'bg-[#fef2f0] text-[#E74C3C]',   icon: 'lucide:x-circle',     label: 'Failed' },
    PENDING: { cls: 'bg-gray-100 text-gray-500',      icon: 'lucide:clock',        label: 'Pending' },
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
        <div className="p-2 w-full h-full flex flex-col gap-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Icon icon="lucide:package-check" className="text-[#2980B9]" />
                        All Inwarded Items
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        All purchase items that have been inwarded
                        {pagination && <span className="ml-2 font-medium text-gray-700">({pagination.totalRecords} total)</span>}
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
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9]">
                    <option value="">All Categories</option>
                    <option value="LENS">Lens</option>
                    <option value="FRAME">Frame</option>
                    <option value="CONTACT_LENS">Contact Lens</option>
                </select>
                <select value={inwardFilter} onChange={e => setInwardFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9]">
                    <option value="">All Inward Status</option>
                    <option value="RECEIVED">Received</option>
                    <option value="PARTIAL">Partial</option>
                    <option value="NOT_RECEIVED">Not Received</option>
                </select>
                <select value={qcFilter} onChange={e => setQcFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9]">
                    <option value="">All QC Status</option>
                    <option value="PASSED">Passed</option>
                    <option value="PARTIAL">Partial</option>
                    <option value="FAILED">Failed</option>
                    <option value="PENDING">Pending</option>
                </select>
                {(search || categoryFilter || inwardFilter || qcFilter) && (
                    <button onClick={() => { setSearch(''); setCategoryFilter(''); setInwardFilter(''); setQcFilter(''); }}
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
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Qty / Received</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Inward Status</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">QC Status</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Price / MRP</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="8" className="p-8 text-center text-gray-500">
                                    <div className="flex justify-center items-center gap-2">
                                        <Icon icon="lucide:loader-2" className="animate-spin text-xl text-[#2980B9]" />
                                        <span>Loading inwarded items...</span>
                                    </div>
                                </td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="8" className="p-12 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Icon icon="lucide:inbox" className="text-4xl text-gray-300" />
                                        <p className="text-gray-500 font-medium">No inwarded items found</p>
                                    </div>
                                </td></tr>
                            ) : (
                                filtered.map((item, idx) => {
                                    const inwardMeta = inwardStatusMeta[item.inwardStatus] || inwardStatusMeta.PENDING;
                                    const qcMeta     = qcStatusMeta[item.qcStatus]         || qcStatusMeta.PENDING;
                                    const catIcon    = categoryIcon[item.category] || 'lucide:box';
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
                                                <div className="text-xs">
                                                    <span className="font-semibold text-gray-800">{item.receivedQty ?? 0}</span>
                                                    <span className="text-gray-400"> / {item.qty ?? 0}</span>
                                                    <span className="text-gray-400 ml-1">{item.unit}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${inwardMeta.cls}`}>
                                                    {inwardMeta.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${qcMeta.cls}`}>
                                                    <Icon icon={qcMeta.icon} className="text-xs" />
                                                    {qcMeta.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="text-xs">
                                                    <p className="font-semibold text-gray-800">₹{item.price?.toLocaleString('en-IN') ?? '—'}</p>
                                                    <p className="text-[10px] text-gray-400">MRP ₹{item.mrp?.toLocaleString('en-IN') ?? '—'}</p>
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
