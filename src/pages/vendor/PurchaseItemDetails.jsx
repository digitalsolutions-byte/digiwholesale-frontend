import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { getPurchaseItemDetails, getVendorPurchaseOrders, updatePurchaseItem, deletePurchaseItem, createPurchaseInward } from '../../services/vendorOrderService';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { PATHS } from '../../routes/paths';

const PurchaseItemDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [orderDetails, setOrderDetails] = useState(null);
    const [vendorHistory, setVendorHistory] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Inward Modal State
    const [showInwardModal, setShowInwardModal] = useState(false);
    const [inwardRemarks, setInwardRemarks] = useState('');
    const [inwardItems, setInwardItems] = useState([]);
    const [submittingInward, setSubmittingInward] = useState(false);

    // Fetch Details
    useEffect(() => {
        const fetchDetails = async () => {
            setLoadingDetails(true);
            try {
                const response = await getPurchaseItemDetails(id);
                if (response.success && response.data) {
                    const orderData = response.data.purchaseOrder || response.data;
                    setOrderDetails(orderData);
                    
                    // Fetch vendor history if we have vendor ID
                    const vendorId = orderData.vendor?.vendorId || orderData.vendorId?._id || orderData.vendorId;
                    if (vendorId) {
                        fetchVendorHistory(vendorId);
                    }
                } else {
                    toast.error('Failed to load purchase item details');
                }
            } catch (error) {
                toast.error(error.message || 'Error loading details');
            } finally {
                setLoadingDetails(false);
            }
        };
        fetchDetails();
    }, [id]);

    const fetchVendorHistory = async (vendorId) => {
        setLoadingHistory(true);
        try {
            const response = await getVendorPurchaseOrders(vendorId);
            if (response.success && response.data) {
                let historyData = response.data.vendorOrders || response.data.purchaseOrders || response.data.orders || response.data || [];
                if (!Array.isArray(historyData)) {
                    historyData = Object.values(historyData).find(Array.isArray) || [];
                }
                const history = historyData.filter(o => o._id !== id);
                setVendorHistory(history);
            }
        } catch (error) {
            console.error('Failed to load vendor history', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleUpdateStatus = async () => {
        try {
            const payload = {
                status: "Return_Approved",
                remark: "Item is safe to return"
            };
            const response = await updatePurchaseItem(id, payload);
            if (response.success) {
                toast.success('Order updated to Return Approved');
                setOrderDetails(prev => ({ ...prev, status: payload.status }));
            } else {
                toast.error(response.message || 'Failed to update order');
            }
        } catch (error) {
            toast.error(error.message || 'Error updating order');
        }
    };

    const handleDelete = async () => {
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
                    navigate(PATHS.VENDOR.PURCHASE_ITEMS);
                } else {
                    toast.error(response.message || 'Failed to delete order');
                }
            } catch (error) {
                toast.error(error.message || 'Error deleting order');
            }
        }
    };

    // ── Inward Modal Logic ────────────────────────────────────────────────────
    const openInwardModal = () => {
        // Build form state from all items in all sub-orders
        const vendorId = orderDetails.vendor?.vendorId || orderDetails.vendorId?._id || orderDetails.vendorId || '';
        const items = [];
        orderDetails.orders?.forEach((subOrder) => {
            subOrder.items?.forEach((item, itemIdx) => {
                items.push({
                    selected: true,
                    orderNumber: subOrder.orderNumber || '',
                    itemIndex: itemIdx,
                    itemName: item.itemName,
                    brand: item.brand,
                    category: item.category,
                    expectedQty: item.qty || 1,
                    receivedQty: item.qty || 1,
                    condition: 'GOOD',
                    vendorRefId: vendorId,
                    remarks: '',
                });
            });
        });
        setInwardItems(items);
        setInwardRemarks('');
        setShowInwardModal(true);
    };

    const updateInwardItem = (index, field, value) => {
        setInwardItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleSubmitInward = async () => {
        const selectedItems = inwardItems.filter(i => i.selected);
        if (selectedItems.length === 0) {
            toast.error('Please select at least one item to inward');
            return;
        }

        setSubmittingInward(true);
        try {
            const payload = {
                purchaseOrderId: id,
                remarks: inwardRemarks,
                items: selectedItems.map(item => ({
                    orderNumber: item.orderNumber,
                    itemIndex: item.itemIndex,
                    receivedQty: Number(item.receivedQty),
                    condition: item.condition,
                    vendorRefId: item.vendorRefId,
                    remarks: item.remarks,
                })),
            };

            const response = await createPurchaseInward(payload);
            if (response.success) {
                toast.success('Items inwarded successfully!');
                setShowInwardModal(false);
            } else {
                toast.error(response.message || 'Failed to inward items');
            }
        } catch (error) {
            toast.error(error.message || 'Error creating inward');
        } finally {
            setSubmittingInward(false);
        }
    };

    // ── Loading / Empty States ────────────────────────────────────────────────
    if (loadingDetails) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <Icon icon="lucide:loader-2" className="animate-spin text-4xl text-erp-accent" />
                    <p className="text-gray-500 font-medium">Loading details...</p>
                </div>
            </div>
        );
    }

    if (!orderDetails) {
        return (
            <div className="p-8 text-center text-gray-500">
                <Icon icon="lucide:alert-circle" className="text-4xl text-gray-400 mx-auto mb-4" />
                <p>Purchase order not found</p>
                <button onClick={() => navigate(-1)} className="mt-4 text-erp-accent hover:underline">Go Back</button>
            </div>
        );
    }

    const vendorName = orderDetails.vendorId?.name || orderDetails.vendor?.vendorName || orderDetails.vendorId || 'Unknown Vendor';
    const totalAmount = orderDetails.orders?.reduce((acc, subOrder) => acc + (subOrder.items?.reduce((sum, item) => sum + ((item.mrp || 0) * (item.qty || 1)), 0) || 0), 0) || 0;

    return (
        <div className="p-6 max-w-7xl mx-auto h-full flex flex-col gap-6 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate(PATHS.VENDOR.PURCHASE_ITEMS)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                    >
                        <Icon icon="lucide:arrow-left" className="text-xl" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                            <Icon icon="lucide:receipt" className="text-erp-accent" />
                            Purchase Order Details
                        </h1>
                        <p className="text-sm text-gray-500 mt-1 font-mono">#{orderDetails._id}</p>
                    </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-3">
                    <button 
                        onClick={openInwardModal}
                        className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Icon icon="lucide:package-check" />
                        Inward Items
                    </button>
                    <button 
                        onClick={handleUpdateStatus}
                        className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Icon icon="lucide:check-circle" />
                        Approve Return
                    </button>
                    <button 
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Icon icon="lucide:trash-2" />
                        Delete
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vendor</span>
                            <span className="text-sm font-semibold text-gray-800 truncate">{vendorName}</span>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</span>
                            <span className="inline-flex w-fit items-center px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full">
                                {orderDetails.orders?.[0]?.status || orderDetails.status || 'COMPLETED'}
                            </span>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date</span>
                            <span className="text-sm font-semibold text-gray-800">{new Date(orderDetails.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total</span>
                            <span className="text-lg font-bold text-erp-accent">₹{totalAmount.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                <Icon icon="lucide:package" /> Purchased Items
                            </h2>
                        </div>
                        <div className="p-6">
                            <div className="space-y-6">
                                {orderDetails.orders?.map((subOrder, idx) => (
                                    <div key={idx} className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-sm font-semibold text-gray-700 bg-white px-3 py-1 rounded-full border border-gray-200">Order Group {idx + 1}</span>
                                            {subOrder.remarks && <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">Remarks: {subOrder.remarks}</span>}
                                        </div>
                                        {subOrder.items?.length > 0 ? (
                                            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                                                <table className="w-full text-left text-sm">
                                                    <thead>
                                                        <tr className="text-gray-500 bg-gray-50 border-b border-gray-100">
                                                            <th className="p-3 font-medium">Item</th>
                                                            <th className="p-3 font-medium">Category</th>
                                                            <th className="p-3 font-medium text-center">Qty</th>
                                                            <th className="p-3 font-medium text-center">GST</th>
                                                            <th className="p-3 font-medium text-right">MRP</th>
                                                            <th className="p-3 font-medium text-right">Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {subOrder.items.map((item, itemIdx) => (
                                                            <tr key={itemIdx} className="hover:bg-gray-50/50">
                                                                <td className="p-3">
                                                                    <div className="font-medium text-gray-800">{item.itemName}</div>
                                                                    <div className="text-xs text-gray-500 mt-0.5">{item.brand} • {item.orderType}</div>
                                                                </td>
                                                                <td className="p-3 text-gray-600">{item.category}</td>
                                                                <td className="p-3 text-gray-600 text-center font-medium">{item.qty}</td>
                                                                <td className="p-3 text-gray-600 text-center">{item.gst || 0}%</td>
                                                                <td className="p-3 text-gray-600 text-right">₹{item.mrp || 0}</td>
                                                                <td className="p-3 text-gray-800 font-medium text-right">
                                                                    ₹{((item.mrp || 0) * (item.qty || 1))}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 italic">No items found.</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Vendor History */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
                        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                <Icon icon="lucide:history" /> Vendor Order History
                            </h2>
                        </div>
                        <div className="p-5 flex-1 overflow-y-auto">
                            {loadingHistory ? (
                                <div className="flex justify-center p-4">
                                    <Icon icon="lucide:loader-2" className="animate-spin text-erp-accent" />
                                </div>
                            ) : vendorHistory.length > 0 ? (
                                <div className="space-y-3">
                                    {vendorHistory.map(historyOrder => (
                                        <div 
                                            key={historyOrder._id}
                                            onClick={() => navigate(`/vendor/purchase-items/${historyOrder._id}`)}
                                            className="p-4 rounded-xl border border-gray-100 hover:border-erp-accent hover:shadow-md transition-all cursor-pointer bg-white group"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">#{historyOrder._id.substring(historyOrder._id.length - 6).toUpperCase()}</span>
                                                <Icon icon="lucide:arrow-up-right" className="text-gray-300 group-hover:text-erp-accent transition-colors" />
                                            </div>
                                            <div className="flex justify-between items-end mt-3">
                                                <span className="text-xs text-gray-400">{new Date(historyOrder.createdAt).toLocaleDateString()}</span>
                                                <span className="text-sm font-bold text-gray-800">
                                                    ₹{historyOrder.orders?.reduce((acc, subOrder) => acc + (subOrder.items?.reduce((sum, item) => sum + ((item.mrp || 0) * (item.qty || 1)), 0) || 0), 0) || 0}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center p-8 text-gray-500 flex flex-col items-center gap-2">
                                    <Icon icon="lucide:inbox" className="text-3xl text-gray-300" />
                                    <p className="text-sm">No other orders found for this vendor.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* ── Inward Items Modal ─────────────────────────────────────────────── */}
            {showInwardModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowInwardModal(false)} />
                    
                    {/* Modal */}
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col mx-4 overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <Icon icon="lucide:package-check" className="text-blue-600 text-xl" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800">Inward Purchase Items</h2>
                                    <p className="text-xs text-gray-500">Record received goods from this purchase order</p>
                                </div>
                            </div>
                            <button onClick={() => setShowInwardModal(false)} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                                <Icon icon="lucide:x" className="text-gray-500 text-xl" />
                            </button>
                        </div>

                        {/* Modal Body (scrollable) */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Global Remarks */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Overall Remarks</label>
                                <input
                                    type="text"
                                    value={inwardRemarks}
                                    onChange={(e) => setInwardRemarks(e.target.value)}
                                    placeholder="e.g. Goods received from vendor"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                                />
                            </div>

                            {/* Items */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-gray-700">Items ({inwardItems.filter(i => i.selected).length} of {inwardItems.length} selected)</h3>
                                    <button 
                                        onClick={() => {
                                            const allSelected = inwardItems.every(i => i.selected);
                                            setInwardItems(prev => prev.map(i => ({ ...i, selected: !allSelected })));
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        {inwardItems.every(i => i.selected) ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>

                                {inwardItems.map((item, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`rounded-xl border-2 transition-all ${item.selected ? 'border-blue-200 bg-blue-50/30 shadow-sm' : 'border-gray-100 bg-gray-50/50 opacity-60'}`}
                                    >
                                        {/* Item Header */}
                                        <div className="p-4 flex items-center gap-4 border-b border-gray-100">
                                            <label className="flex items-center gap-3 cursor-pointer flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={item.selected}
                                                    onChange={(e) => updateInwardItem(idx, 'selected', e.target.checked)}
                                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                />
                                                <div>
                                                    <span className="text-sm font-semibold text-gray-800">{item.itemName}</span>
                                                    <span className="text-xs text-gray-500 ml-2">{item.brand} • {item.category}</span>
                                                </div>
                                            </label>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="bg-white px-2 py-1 rounded-md border border-gray-200 font-mono text-gray-500">
                                                    {item.orderNumber || 'N/A'}
                                                </span>
                                                <span className="bg-gray-100 px-2 py-1 rounded-md text-gray-500">
                                                    Expected: {item.expectedQty}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Item Fields */}
                                        {item.selected && (
                                            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Received Qty</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={item.receivedQty}
                                                        onChange={(e) => updateInwardItem(idx, 'receivedQty', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Condition</label>
                                                    <select
                                                        value={item.condition}
                                                        onChange={(e) => updateInwardItem(idx, 'condition', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-white"
                                                    >
                                                        <option value="GOOD">GOOD</option>
                                                        <option value="DAMAGED">DAMAGED</option>
                                                        <option value="DEFECTIVE">DEFECTIVE</option>
                                                        <option value="PARTIAL">PARTIAL</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Vendor Ref ID</label>
                                                    <input
                                                        type="text"
                                                        value={item.vendorRefId}
                                                        onChange={(e) => updateInwardItem(idx, 'vendorRefId', e.target.value)}
                                                        placeholder="e.g. REF-001"
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Item Remarks</label>
                                                    <input
                                                        type="text"
                                                        value={item.remarks}
                                                        onChange={(e) => updateInwardItem(idx, 'remarks', e.target.value)}
                                                        placeholder="e.g. All pieces intact"
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
                            <button 
                                onClick={() => setShowInwardModal(false)}
                                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSubmitInward}
                                disabled={submittingInward || inwardItems.filter(i => i.selected).length === 0}
                                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submittingInward ? (
                                    <>
                                        <Icon icon="lucide:loader-2" className="animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Icon icon="lucide:package-check" />
                                        Submit Inward
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseItemDetails;
