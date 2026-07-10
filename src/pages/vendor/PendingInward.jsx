import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { getPendingInwardItems } from '../../services/vendorOrderService';
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

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getPendingInwardItems(1, 100);
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
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="p-6 max-w-7xl mx-auto h-full flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Icon icon="lucide:package-open" className="text-amber-500" />
                        Pending Inward
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Purchase items awaiting inward receipt
                        {pagination && (
                            <span className="ml-2 font-semibold text-amber-600">
                                ({pagination.totalRecords} pending)
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={fetchItems}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors"
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
                        const totalQty = items.filter(i => i.category === cat).reduce((s, i) => s + (i.qty || 0), 0);
                        if (!count) return null;
                        return (
                            <div key={cat} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon icon={categoryIcon[cat]} className="text-amber-500 text-lg" />
                                    <span className="text-xs font-semibold text-gray-500 uppercase">{cat.replace('_', ' ')}</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-800">{count}</p>
                                <p className="text-xs text-gray-400 mt-1">Total Qty: {totalQty}</p>
                            </div>
                        );
                    })}
                    <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Icon icon="lucide:alert-circle" className="text-amber-500 text-lg" />
                            <span className="text-xs font-semibold text-amber-600 uppercase">Total Pending</span>
                        </div>
                        <p className="text-2xl font-bold text-amber-700">{items.length}</p>
                        <p className="text-xs text-amber-500 mt-1">Across all categories</p>
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
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                    <option value="">All Categories</option>
                    <option value="LENS">Lens</option>
                    <option value="FRAME">Frame</option>
                    <option value="CONTACT_LENS">Contact Lens</option>
                </select>
                {(search || categoryFilter) && (
                    <button
                        onClick={() => { setSearch(''); setCategoryFilter(''); }}
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
                            <tr className="bg-amber-50 border-b border-amber-100">
                                <th className="p-4 text-xs font-semibold text-amber-700 uppercase tracking-wider">Item</th>
                                <th className="p-4 text-xs font-semibold text-amber-700 uppercase tracking-wider">Vendor</th>
                                <th className="p-4 text-xs font-semibold text-amber-700 uppercase tracking-wider">Order #</th>
                                <th className="p-4 text-xs font-semibold text-amber-700 uppercase tracking-wider">Category</th>
                                <th className="p-4 text-xs font-semibold text-amber-700 uppercase tracking-wider">Qty Pending</th>
                                <th className="p-4 text-xs font-semibold text-amber-700 uppercase tracking-wider">Price</th>
                                <th className="p-4 text-xs font-semibold text-amber-700 uppercase tracking-wider">Type</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <Icon icon="lucide:loader-2" className="animate-spin text-xl text-amber-500" />
                                            <span>Loading pending items...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Icon icon="lucide:check-circle-2" className="text-4xl text-emerald-300" />
                                            <p className="text-gray-500 font-medium">No pending inward items</p>
                                            <p className="text-xs text-gray-400">All items have been received</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((item, idx) => {
                                    const catIcon = categoryIcon[item.category] || 'lucide:box';
                                    return (
                                        <tr key={item._id || idx} className="hover:bg-amber-50/30 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                                                        <Icon icon={catIcon} className="text-amber-500 text-sm" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-800">{item.itemName}</p>
                                                        <p className="text-xs text-gray-400">{item.code || '—'} · {item.brand || '—'}</p>
                                                        {item.isNewProduct && (
                                                            <span className="text-xs text-purple-600 font-medium bg-purple-50 px-1.5 py-0.5 rounded mt-1 inline-block">New Product</span>
                                                        )}
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
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-bold text-amber-600">{item.qty ?? 0}</span>
                                                    <span className="text-xs text-gray-400">{item.unit}</span>
                                                </div>
                                                {item.receivedQty > 0 && (
                                                    <p className="text-xs text-gray-400 mt-0.5">{item.receivedQty} received so far</p>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <p className="text-sm font-semibold text-gray-800">₹{item.price?.toLocaleString('en-IN') ?? '—'}</p>
                                                <p className="text-xs text-gray-400">MRP ₹{item.mrp?.toLocaleString('en-IN') ?? '—'}</p>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                                                    item.orderType === 'RX' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                                                }`}>
                                                    {item.orderType}
                                                </span>
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
                        <span>Showing <strong>{filtered.length}</strong> of <strong>{items.length}</strong> pending items</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PendingInward;
