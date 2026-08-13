import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { getAllPurchaseItems, updatePurchaseItem, deletePurchaseItem } from '../../services/vendorOrderService';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { PATHS } from '../../routes/paths';

const PurchaseItems = () => {
    const navigate = useNavigate();
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    console.log(purchaseOrders, 'purchaseorders')
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);

    const fetchPurchaseOrders = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getAllPurchaseItems(search, page, 10);
            if (response.success) {
                setPurchaseOrders(response.data?.purchaseOrders || response.data || []);
                setPagination(response.data?.pagination || null);
            } else {
                setPurchaseOrders([]);
            }
        } catch (error) {
            console.error('Error fetching purchase orders:', error);
            toast.error(error.message || 'Failed to fetch purchase orders');
        } finally {
            setLoading(false);
        }
    }, [search, page]);

    const handleUpdateStatus = async (e, id) => {
        e.stopPropagation();
        try {
            const payload = {
                status: "Return_Approved",
                remark: "Item is safe to return"
            };
            const response = await updatePurchaseItem(id, payload);
            if (response.success) {
                toast.success('Order updated to Return Approved');
                fetchPurchaseOrders(); // Refresh list
            } else {
                toast.error(response.message || 'Failed to update order');
            }
        } catch (error) {
            toast.error(error.message || 'Error updating order');
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        const confirm = await Swal.fire({
            title: "Are you sure?",
            text: "This purchase item will be deleted permanently.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "Yes, delete it!"
        });

        if (confirm.isConfirmed) {
            try {
                const response = await deletePurchaseItem(id);
                if (response.success) {
                    toast.success('Order deleted successfully');
                    fetchPurchaseOrders(); // Refresh list
                } else {
                    toast.error(response.message || 'Failed to delete order');
                }
            } catch (error) {
                toast.error(error.message || 'Error deleting order');
            }
        }
    };

    useEffect(() => {
        fetchPurchaseOrders();
    }, [fetchPurchaseOrders]);

    return (
        <div className="p-3 sm:p-4 w-full h-full flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Icon icon="lucide:shopping-bag" className="text-[#2980B9]" />
                        Purchase Items
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">View and manage all purchase orders</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search Purchases..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchPurchaseOrders()}
                            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9] text-xs sm:text-sm w-full"
                        />
                    </div>
                    <button
                        onClick={fetchPurchaseOrders}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors flex-shrink-0"
                        title="Refresh"
                    >
                        <Icon icon="lucide:refresh-cw" className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-grow overflow-hidden flex flex-col">
                {/* ── Mobile Card View (block md:hidden) ── */}
                <div className="block md:hidden p-3 space-y-3 bg-gray-50/50 flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
                            <Icon icon="lucide:loader-2" className="animate-spin text-xl text-[#2980B9]" />
                            <span className="text-xs font-semibold">Loading purchase orders...</span>
                        </div>
                    ) : purchaseOrders.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-xs font-semibold">No purchase orders found.</div>
                    ) : (
                        purchaseOrders.map((order) => {
                            const vendorName = order.vendor?.vendorName || order.vendor?.vendorId || order.vendorId?.name || order.vendorId || 'N/A';
                            const purchaseId = order._id.substring(order._id.length - 8).toUpperCase();
                            const totalAmount = order.orders?.reduce((acc, subOrder) => acc + (subOrder.items?.reduce((sum, item) => sum + ((item.mrp || item.price || 0) * (item.qty || 1)), 0) || 0), 0) || order.totalAmount || 0;

                            return (
                                <div
                                    key={order._id}
                                    className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-2xs cursor-pointer hover:border-blue-300 transition-colors"
                                    onClick={() => navigate(`/vendor/purchase-items/${order._id}`)}
                                >
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                                        <div>
                                            <span className="font-mono text-xs font-bold text-[#2980B9] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                #{purchaseId}
                                            </span>
                                            <h3 className="text-sm font-bold text-gray-800 mt-1">{vendorName}</h3>
                                        </div>
                                        <span className={`inline-flex items-center justify-center px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                                            order.overallStatus === 'QC Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            order.overallStatus === 'Partially Received' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            order.overallStatus === 'Fully Received' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                            'bg-gray-50 text-gray-700 border-gray-200'
                                        }`}>
                                            {order.overallStatus || order.status || 'Pending'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-[9px] font-bold text-gray-400 uppercase block">Total Amount</span>
                                            <span className="font-bold text-gray-900">₹{totalAmount.toFixed(2)}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-bold text-gray-400 uppercase block">Created At</span>
                                            <span className="font-semibold text-gray-700">{new Date(order.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase block">Items Summary</span>
                                            <span className="font-medium text-gray-600 truncate block">
                                                {order.orders?.map(o => o.items?.map(i => i.itemName || i.category).join(', ')).join('; ') || 'No items'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* ── Desktop Table View (hidden md:block) ── */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#eaf4fb]/50 border-b border-[#2980B9]/15">
                                <th className="py-2.5 px-4 w-12 text-[#1F618D]"></th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Purchase ID</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Vendor Name</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Status</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Summary</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Total Amount</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Created At</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <Icon icon="lucide:loader-2" className="animate-spin text-xl text-erp-accent" />
                                            <span>Loading purchase orders...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : purchaseOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-500">
                                        No purchase orders found.
                                    </td>
                                </tr>
                            ) : (
                                purchaseOrders.map((order) => (
                                    <React.Fragment key={order._id}>
                                        <tr
                                            className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                                            onClick={() => navigate(`/vendor/purchase-items/${order._id}`)}
                                        >
                                            <td className="px-4 py-2">
                                                <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#eaf4fb] group-hover:text-[#1F618D] transition-colors">
                                                    <Icon icon="lucide:arrow-right" className="text-gray-400 group-hover:text-[#1F618D] text-xs" />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-[13px] text-gray-600" title={order._id}>
                                                    {order._id.substring(order._id.length - 8).toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-semibold text-[13px] text-gray-800">
                                                    {order.vendor?.vendorName || order.vendor?.vendorId || order.vendorId?.name || order.vendorId || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className={`inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-medium rounded-full ${
                                                    order.overallStatus === 'QC Completed' ? 'bg-emerald-50 text-emerald-700' :
                                                    order.overallStatus === 'Partially Received' ? 'bg-amber-50 text-amber-700' :
                                                    order.overallStatus === 'Fully Received' ? 'bg-blue-50 text-blue-700' :
                                                    'bg-gray-50 text-gray-700'
                                                }`}>
                                                    {order.overallStatus || order.status || 'Pending'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                {order.purchaseOrderSummary ? (
                                                    <div className="text-xs text-gray-600 space-y-0.5">
                                                        <div>Total Items: <span className="font-semibold text-gray-800">{order.purchaseOrderSummary.totalItems}</span></div>
                                                        <div>Inward: <span className="font-semibold text-gray-800">{order.purchaseOrderSummary.inwardDone}</span></div>
                                                        <div className="flex items-center gap-2">
                                                            <span>QC:</span>
                                                            <span className="text-emerald-600 font-medium">{order.purchaseOrderSummary.qcPassed} Passed</span>
                                                            {order.purchaseOrderSummary.qcFailed > 0 && (
                                                                <span className="text-red-600 font-medium">{order.purchaseOrderSummary.qcFailed} Failed</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">No summary</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-semibold text-[13px] text-gray-800">
                                                    ₹{order.orders?.reduce((acc, subOrder) => acc + (subOrder.items?.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || 1)), 0) || 0), 0)?.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500">
                                                {new Date(order.createdAt).toLocaleDateString('en-IN')}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={(e) => handleDelete(e, order._id)}
                                                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors group/btn"
                                                        title="Delete Order"
                                                    >
                                                        <Icon icon="lucide:trash-2" className="text-xs group-hover/btn:scale-110 transition-transform" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {pagination && pagination.totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center bg-gray-50/50">
                        <span>Showing <strong>{purchaseOrders.length}</strong> items</span>
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

export default PurchaseItems;
