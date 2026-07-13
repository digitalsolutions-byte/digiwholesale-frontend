import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { getReplacementOrderDetail, createPurchaseInward, createPurchaseQC } from '../../services/vendorOrderService';
import { toast } from 'react-toastify';
import { PATHS } from '../../routes/paths';

const categoryIcon = {
    LENS:         'lucide:eye',
    FRAME:        'lucide:glasses',
    CONTACT_LENS: 'lucide:circle-dot',
};

const ReplacementOrderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);

    // Inward Modal State
    const [selectedInwardItem, setSelectedInwardItem] = useState(null);
    const [receivedQty, setReceivedQty] = useState(1);
    const [inwardCondition, setInwardCondition] = useState('GOOD');
    const [vendorRefId, setVendorRefId] = useState('');
    const [inwardRemarks, setInwardRemarks] = useState('');
    const [submittingInward, setSubmittingInward] = useState(false);

    // QC Modal State
    const [selectedQCItem, setSelectedQCItem] = useState(null);
    const [passedQty, setPassedQty] = useState(0);
    const [failedQty, setFailedQty] = useState(0);
    const [failureReason, setFailureReason] = useState('');
    const [qcRemarks, setQcRemarks] = useState('');
    const [notifyVendor, setNotifyVendor] = useState(false);
    const [submittingQC, setSubmittingQC] = useState(false);

    const fetchDetail = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getReplacementOrderDetail(id);
            if (res.success && res.data) {
                setDetail(res.data);
            } else {
                toast.error('Failed to load replacement order details');
            }
        } catch (err) {
            toast.error(err.message || 'Error fetching details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    // Handle Inward Action
    const handleOpenInward = (item) => {
        const remaining = (item.qty || 0) - (item.receivedQty || 0);
        setSelectedInwardItem(item);
        setReceivedQty(remaining > 0 ? remaining : 1);
        setInwardCondition('GOOD');
        setVendorRefId(item.vendorRefId || '');
        setInwardRemarks('');
    };

    const handleSubmitInward = async () => {
        if (!selectedInwardItem || !detail?.replacementOrder) return;
        if (Number(receivedQty) <= 0) {
            toast.error('Received Quantity must be greater than 0');
            return;
        }

        setSubmittingInward(true);
        try {
            const payload = {
                purchaseOrderId: detail.replacementOrder._id,
                remarks: inwardRemarks || `Inward for replacement PO item ${selectedInwardItem.itemName}`,
                items: [{
                    itemId: selectedInwardItem.itemId || selectedInwardItem._id,
                    receivedQty: Number(receivedQty),
                    condition: inwardCondition,
                    vendorRefId: vendorRefId,
                    remarks: inwardRemarks,
                }],
            };

            const res = await createPurchaseInward(payload);
            if (res.success) {
                toast.success('Item inwarded successfully!');
                setSelectedInwardItem(null);
                fetchDetail();
            } else {
                toast.error(res.message || 'Failed to inward item');
            }
        } catch (err) {
            toast.error(err.message || 'Error performing inward receipt');
        } finally {
            setSubmittingInward(false);
        }
    };

    // Handle QC Action
    const handleOpenQC = (item) => {
        setSelectedQCItem(item);
        setPassedQty(item.receivedQty || item.qty || 0);
        setFailedQty(0);
        setFailureReason('');
        setQcRemarks('');
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
        if (!selectedQCItem || !detail?.replacementOrder) return;
        if (failedQty > 0 && !failureReason.trim()) {
            toast.error('Please specify a Failure Reason for the failed items');
            return;
        }

        setSubmittingQC(true);
        try {
            const payload = {
                purchaseOrderId: detail.replacementOrder._id,
                purchaseInwardId: selectedQCItem.purchaseInwardId || detail.replacementOrder.purchaseInwardId,
                notifyVendor,
                remarks: qcRemarks || `QC check for replacement item ${selectedQCItem.itemName}`,
                items: [{
                    itemId: selectedQCItem.itemId || selectedQCItem._id,
                    passedQty: Number(passedQty),
                    failedQty: Number(failedQty),
                    failureReason: failureReason,
                    remarks: qcRemarks,
                }],
            };

            const res = await createPurchaseQC(payload);
            if (res.success) {
                toast.success('QC check submitted successfully!');
                setSelectedQCItem(null);
                fetchDetail();
            } else {
                toast.error(res.message || 'Failed to submit QC');
            }
        } catch (err) {
            toast.error(err.message || 'Error executing QC submission');
        } finally {
            setSubmittingQC(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <Icon icon="lucide:loader-2" className="animate-spin text-4xl text-erp-accent" />
                    <p className="text-gray-500 font-medium">Loading replacement details...</p>
                </div>
            </div>
        );
    }

    if (!detail?.replacementOrder) {
        return (
            <div className="p-8 text-center text-gray-500">
                <Icon icon="lucide:alert-circle" className="text-4xl text-gray-400 mx-auto mb-4" />
                <p>Replacement order not found</p>
                <button onClick={() => navigate(-1)} className="mt-4 text-erp-accent hover:underline">Go Back</button>
            </div>
        );
    }

    const { replacementOrder, purchaseReturn, originalPurchaseOrder } = detail;
    const vendor = replacementOrder.vendor || {};
    const subOrders = replacementOrder.orders || [];
    return (
        <div className="p-2 w-full h-full flex flex-col gap-4 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-gray-100 pb-4 shrink-0">
                <button
                    onClick={() => navigate('/vendor/replacement-orders')}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                >
                    <Icon icon="lucide:arrow-left" className="text-xl" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <Icon icon="lucide:package-check" className="text-[#2980B9]" />
                        Replacement Order Details
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 font-mono">#{replacementOrder._id}</p>
                </div>
            </div>

            {/* Quick Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
                {/* Vendor Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                        <Icon icon="lucide:truck" className="text-[#2980B9] text-lg" />
                        <h2 className="text-sm font-bold text-gray-800">Vendor Details</h2>
                    </div>
                    <div className="space-y-1.5 text-xs text-gray-600">
                        <p><strong className="text-gray-800">Name:</strong> {vendor.vendorName || '—'}</p>
                        <p><strong className="text-gray-800">Mobile:</strong> {vendor.mobile || '—'}</p>
                        <p><strong className="text-gray-800">Email:</strong> {vendor.email || '—'}</p>
                        <p><strong className="text-gray-800">Address:</strong> {vendor.address || '—'}</p>
                        <p><strong className="text-gray-800">GSTIN:</strong> {vendor.gstNumber || '—'}</p>
                    </div>
                </div>

                {/* References Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                        <Icon icon="lucide:link" className="text-[#2980B9] text-lg" />
                        <h2 className="text-sm font-bold text-gray-800">Linked Records</h2>
                    </div>
                    <div className="space-y-3 text-xs">
                        {originalPurchaseOrder && (
                            <div>
                                <p className="text-gray-500">Original Purchase Order</p>
                                <button
                                    onClick={() => navigate(`/vendor/purchase-items/${originalPurchaseOrder._id}`)}
                                    className="text-[#1F618D] font-bold hover:underline flex items-center gap-1 mt-1"
                                >
                                    <Icon icon="lucide:receipt" />
                                    #{originalPurchaseOrder.orderNumber || originalPurchaseOrder._id?.slice(-8).toUpperCase()}
                                </button>
                            </div>
                        )}
                        {purchaseReturn && (
                            <div>
                                <p className="text-gray-500">Linked Purchase Return</p>
                                <button
                                    onClick={() => navigate(PATHS.VENDOR.PURCHASE_RETURNS)}
                                    className="text-[#1F618D] font-bold hover:underline flex items-center gap-1 mt-1"
                                >
                                    <Icon icon="lucide:undo-2" />
                                    #{purchaseReturn._id?.slice(-8).toUpperCase()}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Metadata Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                        <Icon icon="lucide:info" className="text-[#2980B9] text-lg" />
                        <h2 className="text-sm font-bold text-gray-800">Order Metadata</h2>
                    </div>
                    <div className="space-y-1.5 text-xs text-gray-600">
                        <p><strong className="text-gray-800">Status:</strong> {replacementOrder.overallStatus || 'Submitted'}</p>
                        <p><strong className="text-gray-800">Created:</strong> {new Date(replacementOrder.createdAt).toLocaleString('en-IN')}</p>
                        <p><strong className="text-gray-800">Created By:</strong> {replacementOrder.createdBy || 'System'}</p>
                    </div>
                </div>
            </div>

            {/* Original Returned Items (Reference) */}
            {purchaseReturn?.items && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden shrink-0">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                        <Icon icon="lucide:alert-circle" className="text-[#E74C3C]" />
                        <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">QC Rejected / Returned Items (Replacement Cause)</h2>
                    </div>
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-gray-100/50 border-b border-gray-200">
                                <th className="p-3 text-gray-500 font-semibold">Item Name</th>
                                <th className="p-3 text-gray-500 font-semibold">Category</th>
                                <th className="p-3 text-gray-500 font-semibold">Returned Qty</th>
                                <th className="p-3 text-gray-500 font-semibold">Failure Reason</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {purchaseReturn.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="p-3 font-medium text-gray-800">{item.itemName}</td>
                                    <td className="p-3">{item.category}</td>
                                    <td className="p-3 font-semibold text-[#E74C3C]">{item.qty} {item.unit}</td>
                                    <td className="p-3 italic text-gray-500">{item.reason || 'No specific reason given'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Items List inside replacement order */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 overflow-hidden flex flex-col min-h-[300px]">
                <div className="p-4 bg-[#eaf4fb] border-b border-[#2980B9]/15 flex items-center justify-between shrink-0">
                    <h2 className="text-xs font-bold text-[#1F618D] uppercase tracking-wider">Replacement Order Items</h2>
                </div>
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="p-4 text-gray-500 font-semibold">Item</th>
                                <th className="p-4 text-gray-500 font-semibold">Code / Cat</th>
                                <th className="p-4 text-gray-500 font-semibold">Qty Expected</th>
                                <th className="p-4 text-gray-500 font-semibold">Qty Received</th>
                                <th className="p-4 text-gray-500 font-semibold">Inward Status</th>
                                <th className="p-4 text-gray-500 font-semibold">QC Status</th>
                                <th className="p-4 text-gray-500 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {subOrders.flatMap((subOrder, oIdx) =>
                                subOrder.items?.map((item, iIdx) => {
                                    const key = `${oIdx}-${iIdx}`;
                                    return (
                                        <tr key={key} className="hover:bg-gray-50/50">
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-[#eaf4fb] flex items-center justify-center">
                                                        <Icon icon={categoryIcon[item.category] || 'lucide:box'} className="text-[#2980B9]" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-800">{item.itemName}</p>
                                                        <p className="text-gray-400 text-[10px]">{item.brand || 'No Brand'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <p className="font-mono text-gray-600">{item.code || '—'}</p>
                                                <span className="text-[10px] text-gray-400">{item.category}</span>
                                            </td>
                                            <td className="p-4 font-bold text-gray-800">{item.qty} {item.unit}</td>
                                            <td className="p-4 font-bold text-gray-800">{item.receivedQty || 0} {item.unit}</td>
                                            <td className="p-4">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full font-semibold ${
                                                    item.inwardStatus === 'RECEIVED' ? 'bg-[#eaf4fb] text-[#1F618D]' :
                                                    item.inwardStatus === 'PARTIAL' ? 'bg-[#fdf8ed] text-[#b45309]' :
                                                    'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {item.inwardStatus || 'PENDING'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full font-semibold ${
                                                    item.qcStatus === 'PASSED' ? 'bg-[#eaf4fb] text-[#1F618D]' :
                                                    item.qcStatus === 'FAILED' ? 'bg-[#fef2f0] text-[#E74C3C]' :
                                                    item.qcStatus === 'PARTIAL' ? 'bg-[#fdf8ed] text-[#b45309]' :
                                                    'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {item.qcStatus || 'PENDING'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {item.inwardStatus !== 'RECEIVED' && (
                                                        <button
                                                            onClick={() => handleOpenInward(item)}
                                                            className="px-2.5 py-1.5 bg-[#eaf4fb] hover:bg-[#1F618D] hover:text-white text-[#1F618D] border border-[#2980B9]/20 rounded-lg transition-colors font-bold"
                                                        >
                                                            Inward
                                                        </button>
                                                    )}
                                                    {item.inwardStatus === 'RECEIVED' && item.qcStatus === 'PENDING' && (
                                                        <button
                                                            onClick={() => handleOpenQC(item)}
                                                            className="px-2.5 py-1.5 bg-[#eaf4fb] hover:bg-[#1F618D] hover:text-white text-[#1F618D] border border-[#2980B9]/20 rounded-lg transition-colors font-bold"
                                                        >
                                                            QC Check
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Inward Modal */}
            {selectedInwardItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedInwardItem(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        
                        <div className="p-5 border-b border-gray-100 bg-[#eaf4fb] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#1F618D] flex items-center justify-center">
                                    <Icon icon="lucide:package-check" className="text-white text-xl" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-[#1F618D]">Inward Item Receipt</h2>
                                    <p className="text-xs text-[#2980B9] mt-0.5">Replacement Inward</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedInwardItem(null)} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                                <Icon icon="lucide:x" className="text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-[#eaf4fb]/30 border border-[#2980B9]/15 rounded-xl p-3">
                                <p className="text-xs font-bold text-gray-700">{selectedInwardItem.itemName}</p>
                                <p className="text-[11px] text-gray-500 mt-1">
                                    Total Expected: <strong>{selectedInwardItem.qty} {selectedInwardItem.unit}</strong> | Remaining: <strong>{selectedInwardItem.qty - (selectedInwardItem.receivedQty || 0)}</strong>
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Received Qty</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={selectedInwardItem.qty - (selectedInwardItem.receivedQty || 0)}
                                    value={receivedQty}
                                    onChange={e => setReceivedQty(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Condition</label>
                                <select
                                    value={inwardCondition}
                                    onChange={e => setInwardCondition(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9] bg-white"
                                >
                                    <option value="GOOD">Good</option>
                                    <option value="DAMAGED">Damaged</option>
                                    <option value="DEFECTIVE">Defective</option>
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

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Remarks</label>
                                <textarea
                                    rows={2}
                                    value={inwardRemarks}
                                    onChange={e => setInwardRemarks(e.target.value)}
                                    placeholder="Any notes..."
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9] resize-none"
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                            <button onClick={() => setSelectedInwardItem(null)}
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
                </div>
            )}

            {/* QC Check Modal */}
            {selectedQCItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedQCItem(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        
                        <div className="p-5 border-b border-gray-100 bg-[#eaf4fb] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#1F618D] flex items-center justify-center">
                                    <Icon icon="lucide:shield-check" className="text-white text-xl" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-[#1F618D]">QC Check Details</h2>
                                    <p className="text-xs text-[#2980B9] mt-0.5">Replacement QC</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedQCItem(null)} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                                <Icon icon="lucide:x" className="text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-[#eaf4fb]/30 border border-[#2980B9]/15 rounded-xl p-3">
                                <p className="text-xs font-bold text-gray-700">{selectedQCItem.itemName}</p>
                                <p className="text-[11px] text-gray-500 mt-1">
                                    Received Qty: <strong>{selectedQCItem.receivedQty || selectedQCItem.qty || 0} {selectedQCItem.unit}</strong>
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Passed Qty</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={selectedQCItem.receivedQty || selectedQCItem.qty || 0}
                                        value={passedQty}
                                        onChange={e => handlePassedQtyChange(e.target.value, selectedQCItem.receivedQty || selectedQCItem.qty || 0)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Failed Qty</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={selectedQCItem.receivedQty || selectedQCItem.qty || 0}
                                        value={failedQty}
                                        onChange={e => handleFailedQtyChange(e.target.value, selectedQCItem.receivedQty || selectedQCItem.qty || 0)}
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
                                        placeholder="Reason for failure"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E74C3C]/20 focus:border-[#E74C3C]"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Remarks</label>
                                <textarea
                                    rows={2}
                                    value={qcRemarks}
                                    onChange={e => setQcRemarks(e.target.value)}
                                    placeholder="Remarks..."
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
                                    Notify Vendor
                                </label>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                            <button onClick={() => setSelectedQCItem(null)}
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

export default ReplacementOrderDetail;
