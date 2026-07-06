import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { getRxOrders } from '../services/orderService';
import { toast } from 'react-toastify';

const RxOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [expandedRows, setExpandedRows] = useState(new Set());

    const toggleRow = (orderId) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(orderId)) {
                next.delete(orderId);
            } else {
                next.add(orderId);
            }
            return next;
        });
    };

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getRxOrders(search);
            if (response.success) {
                setOrders(response.data?.orders || []);
            } else {
                setOrders([]);
            }
        } catch (error) {
            console.error('Error fetching RX orders:', error);
            toast.error(error.message || 'Failed to fetch RX orders');
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    return (
        <div className="p-6 max-w-7xl mx-auto h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Icon icon="lucide:clipboard-list" className="text-primary-main" />
                        RX Orders
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">View and manage all RX orders</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search RX Orders..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-main focus:border-transparent text-sm w-64"
                        />
                    </div>
                    <button
                        onClick={fetchOrders}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                        title="Refresh"
                    >
                        <Icon icon="lucide:refresh-cw" className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-grow overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="p-4 w-12"></th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer Name</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">RX Items</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <Icon icon="lucide:loader-2" className="animate-spin text-xl text-primary-main" />
                                            <span>Loading RX orders...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-gray-500">
                                        No RX orders found.
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <React.Fragment key={order._id}>
                                        <tr 
                                            className="hover:bg-gray-50/50 transition-colors cursor-pointer" 
                                            onClick={() => toggleRow(order._id)}
                                        >
                                            <td className="p-4">
                                                <Icon 
                                                    icon={expandedRows.has(order._id) ? "lucide:chevron-down" : "lucide:chevron-right"} 
                                                    className="text-gray-400 text-lg" 
                                                />
                                            </td>
                                            <td className="p-4">
                                                <span className="font-mono text-sm text-gray-600" title={order._id}>
                                                    {order._id.substring(order._id.length - 8).toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-medium text-gray-800">
                                                    {order.customer?.customerName || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-sm text-gray-600">
                                                    {order.customer?.customerShipToBranchName || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                                                    {order.orders?.reduce((acc, curr) => acc + (curr.rxItems?.length || 0), 0) || 0} items
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full">
                                                    {order.orders?.[0]?.status || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-medium text-gray-800">
                                                    ₹{order.orders?.reduce((acc, curr) => acc + (curr.totalOrderPrice || 0), 0)?.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-gray-500">
                                                {new Date(order.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                        {expandedRows.has(order._id) && (
                                            <tr>
                                                <td colSpan="8" className="p-0 border-b border-gray-100 bg-gray-50/50">
                                                    <div className="p-6 pl-14">
                                                        <h4 className="text-sm font-bold text-gray-800 mb-4">Product Details</h4>
                                                        <div className="space-y-4">
                                                            {order.orders?.map((subOrder, idx) => (
                                                                <div key={idx} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                                                    <div className="flex justify-between items-center mb-4">
                                                                        <span className="text-sm font-semibold text-primary-main">Order #{subOrder.orderNumber}</span>
                                                                        <span className="text-sm font-bold text-gray-700">Total: ₹{subOrder.totalOrderPrice || 0}</span>
                                                                    </div>
                                                                    {subOrder.rxItems?.length > 0 ? (
                                                                        <div className="overflow-x-auto">
                                                                            <table className="w-full text-left text-sm">
                                                                                <thead>
                                                                                    <tr className="text-gray-500 border-b border-gray-100">
                                                                                        <th className="pb-3 font-medium">Item Name</th>
                                                                                        <th className="pb-3 font-medium">Category</th>
                                                                                        <th className="pb-3 font-medium text-center">SPH / CYL / AXIS</th>
                                                                                        <th className="pb-3 font-medium text-center">ADD</th>
                                                                                        <th className="pb-3 font-medium text-center">Qty</th>
                                                                                        <th className="pb-3 font-medium text-right">Price</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-gray-50">
                                                                                    {subOrder.rxItems.map((item, itemIdx) => (
                                                                                        <tr key={itemIdx}>
                                                                                            <td className="py-3">
                                                                                                <div className="font-medium text-gray-800">{item.itemName}</div>
                                                                                                <div className="text-xs text-gray-500 mt-1">{item.orderType} • {item.coating}</div>
                                                                                            </td>
                                                                                            <td className="py-3 text-gray-600">{item.category}</td>
                                                                                            <td className="py-3 text-gray-600 text-center">
                                                                                                {item.sph || 0} / {item.cyl || 0} / {item.axis || 0}
                                                                                            </td>
                                                                                            <td className="py-3 text-gray-600 text-center">{item.add || '-'}</td>
                                                                                            <td className="py-3 text-gray-600 text-center">{item.qty}</td>
                                                                                            <td className="py-3 text-gray-800 font-medium text-right">
                                                                                                ₹{item.price * (item.qty || 1)}
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-sm text-gray-500 italic py-2">No RX items available for this order.</p>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RxOrders;
