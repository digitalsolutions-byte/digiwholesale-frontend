import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { getDraftOrders, deleteOrder } from '../services/orderService';
import { PATHS } from '../routes/paths';
import ConfirmationModal from '../components/ui/ConfirmationModal';

const DraftOrders = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, loading: false });

    const fetchDraftOrders = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getDraftOrders(page, limit, searchTerm);
            if (response.success && response.data) {
                setOrders(response.data.orders || []);
                const paginationData = response.data.pagination || {};
                setTotalPages(paginationData.totalPages || 1);
            } else {
                setOrders([]);
            }
        } catch (error) {
            console.error('Fetch draft orders error:', error);
            toast.error(error.message || 'Failed to fetch draft orders');
        } finally {
            setLoading(false);
        }
    }, [page, limit, searchTerm]);

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            fetchDraftOrders();
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [fetchDraftOrders]);

    const toggleRow = (id) => {
        setExpandedRows(prev => {
            const newExpanded = new Set(prev);
            if (newExpanded.has(id)) newExpanded.delete(id);
            else newExpanded.add(id);
            return newExpanded;
        });
    };

    const handleDeleteClick = (id) => {
        setDeleteModal({ isOpen: true, id, loading: false });
    };

    const confirmDelete = async () => {
        if (!deleteModal.id) return;
        setDeleteModal(prev => ({ ...prev, loading: true }));
        try {
            const res = await deleteOrder(deleteModal.id);
            if (res.success) {
                toast.success('Draft order deleted successfully');
                setDeleteModal({ isOpen: false, id: null, loading: false });
                fetchDraftOrders();
            }
        } catch (err) {
            toast.error(err.message || 'Failed to delete draft order');
            setDeleteModal(prev => ({ ...prev, loading: false }));
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto h-full flex flex-col gap-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2 uppercase tracking-tighter">
                        <Icon icon="mdi:file-document-edit-outline" className="text-erp-accent" />
                        Draft Orders
                    </h1>
                    <p className="text-sm text-gray-500 font-medium">Continue placing your saved draft orders</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search Draft Orders..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(1);
                            }}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-erp-accent focus:border-transparent text-sm w-64"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-xs font-semibold">
                                <th className="p-4 w-12"></th>
                                <th className="p-4">Order Code</th>
                                <th className="p-4">Customer Name</th>
                                <th className="p-4">Branch</th>
                                <th className="p-4">Date Created</th>
                                <th className="p-4">Total Qty</th>
                                <th className="p-4">Order Total</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-600 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="p-10 text-center">
                                        <Icon icon="mdi:loading" className="text-3xl text-erp-accent animate-spin mx-auto mb-2" />
                                        <span>Loading drafts...</span>
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-10 text-center text-gray-400">
                                        <Icon icon="mdi:file-search-outline" className="text-5xl mx-auto mb-2 opacity-50" />
                                        <span>No draft orders found.</span>
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => {
                                    const subOrder = order.orders?.[0] || {};
                                    const totalQty = subOrder.items?.reduce((acc, item) => acc + (Number(item.qty) || 0), 0) || 0;
                                    const orderTotal = subOrder.totalOrderPrice || 0;

                                    return (
                                        <React.Fragment key={order._id}>
                                            <tr 
                                                className={`border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer transition-colors ${
                                                    expandedRows.has(order._id) ? 'bg-gray-50' : ''
                                                }`}
                                                onClick={() => toggleRow(order._id)}
                                            >
                                                <td className="p-4 text-center">
                                                    <Icon 
                                                        icon={expandedRows.has(order._id) ? "mdi:chevron-up" : "mdi:chevron-down"} 
                                                        className="text-lg text-gray-400"
                                                    />
                                                </td>
                                                <td className="p-4 font-mono font-bold text-erp-accent">
                                                    #{subOrder.orderNumber || order._id?.slice(-8).toUpperCase()}
                                                </td>
                                                <td className="p-4 font-bold text-gray-800">
                                                    {order.customer?.customerName || 'N/A'}
                                                </td>
                                                <td className="p-4 text-xs font-semibold text-gray-500 uppercase">
                                                    {order.customer?.customerShipToBranchName || 'N/A'}
                                                </td>
                                                <td className="p-4 text-gray-500">
                                                    {dayjs(order.createdAt).format('DD MMM YYYY, hh:mm A')}
                                                </td>
                                                <td className="p-4 font-bold text-center">
                                                    {totalQty}
                                                </td>
                                                <td className="p-4 font-bold text-gray-800">
                                                    ₹{orderTotal}
                                                </td>
                                                <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={() => navigate(PATHS.CUSTOMER_CARE.EDIT_ORDER.replace(':id', order._id))}
                                                            className="px-3 py-1.5 bg-erp-accent text-white rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
                                                        >
                                                            Continue
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(order._id)}
                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete Draft"
                                                        >
                                                            <Icon icon="mdi:trash-can-outline" className="text-lg" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {expandedRows.has(order._id) && (
                                                <tr className="bg-gray-50/50">
                                                    <td colSpan="8" className="p-6">
                                                        <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col gap-4">
                                                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Sub-Order Items</h4>
                                                            <div className="flex flex-col gap-3">
                                                                {subOrder.items?.map((item, idx) => (
                                                                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sm font-bold text-gray-800">{item.itemName || 'Unnamed Item'}</span>
                                                                            <span className="text-xs text-gray-400 uppercase font-semibold">{item.category} • {item.orderType}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-6">
                                                                            <span className="text-xs font-bold text-gray-600">Qty: {item.qty}</span>
                                                                            <span className="text-sm font-bold text-erp-accent">₹{item.price}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-between items-center p-4 border-t border-gray-100">
                        <span className="text-xs text-gray-400 font-bold uppercase">Page {page} of {totalPages}</span>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold"
                            >
                                Previous
                            </button>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: null, loading: false })}
                onConfirm={confirmDelete}
                title="Delete Draft Order"
                message="Are you sure you want to permanently delete this draft order? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                isLoading={deleteModal.loading}
            />
        </div>
    );
};

export default DraftOrders;
