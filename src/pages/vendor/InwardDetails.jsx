import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { getInwardById, createPurchaseQC } from '../../services/vendorOrderService';
import { toast } from 'react-toastify';

const InwardDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [inward, setInward] = useState(null);
    const [loading, setLoading] = useState(true);

    // QC Modal State
    const [showQCModal, setShowQCModal] = useState(false);
    const [qcRemarks, setQcRemarks] = useState('');
    const [notifyVendor, setNotifyVendor] = useState(false);
    const [qcItems, setQcItems] = useState([]);
    const [submittingQC, setSubmittingQC] = useState(false);

    useEffect(() => {
        const fetchInward = async () => {
            setLoading(true);
            try {
                const response = await getInwardById(id);
                if (response.success && response.data) {
                    setInward(response.data.inward || response.data);
                } else {
                    toast.error('Failed to load inward details');
                }
            } catch (error) {
                toast.error(error.message || 'Error loading inward details');
            } finally {
                setLoading(false);
            }
        };
        fetchInward();
    }, [id]);

    // Initialize QC items from inward items when opening modal
    const handleOpenQCModal = () => {
        if (!inward?.items) return;
        
        const pendingItems = inward.items.filter(item => item.qcStatus !== 'PASSED');
        
        if (pendingItems.length === 0) {
            toast.info('All items have already passed QC.');
            return;
        }

        setQcItems(
            pendingItems.map(item => ({
                itemId: item.itemId || item._id,
                itemName: item.itemName || '',
                category: item.category || '',
                receivedQty: item.receivedQty || 0,
                passedQty: item.receivedQty || 0,
                failedQty: 0,
                failureReason: '',
                remarks: '',
            }))
        );
        setQcRemarks('');
        setNotifyVendor(false);
        setShowQCModal(true);
    };

    const handleQCItemChange = (index, field, value) => {
        setQcItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };

            // Auto-adjust: if passedQty changes, update failedQty and vice versa
            if (field === 'passedQty') {
                const passed = parseInt(value) || 0;
                updated[index].failedQty = Math.max(0, updated[index].receivedQty - passed);
            } else if (field === 'failedQty') {
                const failed = parseInt(value) || 0;
                updated[index].passedQty = Math.max(0, updated[index].receivedQty - failed);
            }

            return updated;
        });
    };

    const handleSubmitQC = async () => {
        if (!inward) return;
        setSubmittingQC(true);
        try {
            const payload = {
                purchaseOrderId: inward.purchaseOrderId,
                purchaseInwardId: inward._id,
                notifyVendor,
                remarks: qcRemarks,
                items: qcItems.map(item => ({
                    itemId: item.itemId,
                    passedQty: parseInt(item.passedQty) || 0,
                    failedQty: parseInt(item.failedQty) || 0,
                    failureReason: item.failureReason || '',
                    remarks: item.remarks || '',
                })),
            };
            const response = await createPurchaseQC(payload);
            if (response.success) {
                toast.success(response.message || 'QC record created successfully');
                setShowQCModal(false);
                navigate('/vendor/qc');
            } else {
                toast.error(response.message || 'Failed to create QC record');
            }
        } catch (error) {
            toast.error(error.message || 'Failed to submit QC');
        } finally {
            setSubmittingQC(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <Icon icon="lucide:loader-2" className="animate-spin text-4xl text-erp-accent" />
                    <p className="text-gray-500 font-medium">Loading inward details...</p>
                </div>
            </div>
        );
    }

    if (!inward) {
        return (
            <div className="p-8 text-center text-gray-500">
                <Icon icon="lucide:alert-circle" className="text-4xl text-gray-400 mx-auto mb-4" />
                <p>Inward record not found</p>
                <button onClick={() => navigate(-1)} className="mt-4 text-erp-accent hover:underline">Go Back</button>
            </div>
        );
    }

    const getConditionColor = (condition) => {
        switch (condition) {
            case 'GOOD': return 'bg-emerald-50 text-emerald-700';
            case 'DAMAGED': return 'bg-red-50 text-red-700';
            case 'DEFECTIVE': return 'bg-orange-50 text-orange-700';
            case 'PARTIAL': return 'bg-amber-50 text-amber-700';
            default: return 'bg-gray-50 text-gray-700';
        }
    };

    const getQcStatusColor = (status) => {
        switch (status) {
            case 'PASSED': return 'bg-emerald-50 text-emerald-700';
            case 'FAILED': return 'bg-red-50 text-red-700';
            case 'PARTIAL': return 'bg-amber-50 text-amber-700';
            default: return 'bg-gray-50 text-gray-700';
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto h-full flex flex-col gap-6 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/vendor/inward')}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                    >
                        <Icon icon="lucide:arrow-left" className="text-xl" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                            <Icon icon="lucide:package-check" className="text-erp-accent" />
                            Inward Details
                        </h1>
                        <p className="text-sm text-gray-500 mt-1 font-mono">#{inward._id}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full">
                        {inward.status || 'Pending'}
                    </span>
                    <button
                        onClick={handleOpenQCModal}
                        className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-erp-accent hover:bg-erp-accent/90 active:scale-95 rounded-full transition-all shadow-lg shadow-erp-accent/20"
                    >
                        <Icon icon="lucide:shield-check" className="text-base" />
                        Start QC
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vendor</span>
                    <span className="text-sm font-semibold text-gray-800 truncate">{inward.vendorName || 'N/A'}</span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Purchase Order</span>
                    <span className="font-mono text-xs text-gray-600 truncate" title={inward.purchaseOrderId}>
                        {inward.purchaseOrderId ? inward.purchaseOrderId.substring(inward.purchaseOrderId.length - 8).toUpperCase() : 'N/A'}
                    </span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Inward Date</span>
                    <span className="text-sm font-semibold text-gray-800">{new Date(inward.inwardDate || inward.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Items</span>
                    <span className="text-lg font-bold text-erp-accent">{inward.items?.length || 0}</span>
                </div>
            </div>

            {/* Remarks */}
            {inward.remarks && (
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Remarks</span>
                    <p className="text-sm text-gray-700">{inward.remarks}</p>
                </div>
            )}

            {/* Items Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <Icon icon="lucide:list-checks" /> Received Items
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-gray-500 bg-gray-50 border-b border-gray-100">
                                <th className="p-4 font-medium">Item</th>
                                <th className="p-4 font-medium">Category</th>
                                <th className="p-4 font-medium">Order Number</th>
                                <th className="p-4 font-medium text-center">Ordered Qty</th>
                                <th className="p-4 font-medium text-center">Received Qty</th>
                                <th className="p-4 font-medium text-center">Condition</th>
                                <th className="p-4 font-medium text-center">QC Status</th>
                                <th className="p-4 font-medium">Vendor Ref</th>
                                <th className="p-4 font-medium">Remarks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {inward.items?.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50">
                                    <td className="p-4">
                                        <div className="font-medium text-gray-800">{item.itemName}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">{item.unit}</div>
                                    </td>
                                    <td className="p-4 text-gray-600">{item.category}</td>
                                    <td className="p-4">
                                        <span className="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                            {item.orderNumber || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-600 text-center font-medium">{item.orderedQty}</td>
                                    <td className="p-4 text-center">
                                        <span className={`font-bold ${item.receivedQty < item.orderedQty ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {item.receivedQty}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getConditionColor(item.condition)}`}>
                                            {item.condition}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getQcStatusColor(item.qcStatus)}`}>
                                            {item.qcStatus || 'PENDING'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className="font-mono text-xs text-gray-600">{item.vendorRefId || '—'}</span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500 max-w-[200px] truncate" title={item.remarks}>
                                        {item.remarks || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── QC Modal ── */}
            {showQCModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gray-50/50 rounded-t-3xl">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-erp-accent/10 flex items-center justify-center text-erp-accent shadow-inner">
                                    <Icon icon="lucide:shield-check" className="text-2xl" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-widest text-gray-800">Quality Check</h2>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        Inward #{inward._id.substring(inward._id.length - 8).toUpperCase()}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowQCModal(false)}
                                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-all group"
                            >
                                <Icon icon="mdi:close" className="text-2xl group-hover:rotate-90 transition-transform" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                            {/* Top controls */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">QC Remarks</label>
                                    <textarea
                                        rows={2}
                                        value={qcRemarks}
                                        onChange={e => setQcRemarks(e.target.value)}
                                        placeholder="Overall QC observations..."
                                        className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-medium text-gray-700 outline-none focus:border-erp-accent/30 focus:ring-4 focus:ring-erp-accent/5 transition-all placeholder:text-gray-300 resize-none"
                                    />
                                </div>
                                <div className="flex items-start gap-3 pt-7">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={notifyVendor}
                                            onChange={e => setNotifyVendor(e.target.checked)}
                                            className="w-5 h-5 rounded-md border-gray-300 text-erp-accent focus:ring-erp-accent/20"
                                        />
                                        <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Notify Vendor</span>
                                    </label>
                                </div>
                            </div>

                            {/* QC Items Table */}
                            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[800px] border-collapse text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                <th className="p-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 w-8">#</th>
                                                <th className="p-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 min-w-[140px]">Item</th>
                                                <th className="p-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-500 w-20">Rcvd</th>
                                                <th className="p-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-500 w-24">Passed</th>
                                                <th className="p-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-500 w-24">Failed</th>
                                                <th className="p-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 min-w-[160px]">Failure Reason</th>
                                                <th className="p-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 min-w-[140px]">Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {qcItems.map((item, index) => (
                                                <tr key={index} className="hover:bg-gray-50/50">
                                                    <td className="p-3 text-gray-400 font-medium">{index + 1}</td>
                                                    <td className="p-3">
                                                        <div className="font-medium text-gray-800 text-sm">{item.itemName || 'N/A'}</div>
                                                        {item.category && <div className="text-xs text-gray-400">{item.category}</div>}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <span className="font-bold text-gray-700">{item.receivedQty}</span>
                                                    </td>
                                                    <td className="p-3">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={item.receivedQty}
                                                            value={item.passedQty}
                                                            onChange={e => handleQCItemChange(index, 'passedQty', e.target.value)}
                                                            className="w-full bg-emerald-50/50 border border-emerald-100 rounded-lg px-3 py-2 text-center text-sm font-bold text-emerald-700 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 transition-all"
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={item.receivedQty}
                                                            value={item.failedQty}
                                                            onChange={e => handleQCItemChange(index, 'failedQty', e.target.value)}
                                                            className="w-full bg-red-50/50 border border-red-100 rounded-lg px-3 py-2 text-center text-sm font-bold text-red-700 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all"
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <input
                                                            type="text"
                                                            placeholder="Reason..."
                                                            value={item.failureReason}
                                                            onChange={e => handleQCItemChange(index, 'failureReason', e.target.value)}
                                                            className="w-full bg-transparent border border-gray-100 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 outline-none focus:border-erp-accent/30 focus:ring-2 focus:ring-erp-accent/5 transition-all placeholder:text-gray-300"
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <input
                                                            type="text"
                                                            placeholder="Notes..."
                                                            value={item.remarks}
                                                            onChange={e => handleQCItemChange(index, 'remarks', e.target.value)}
                                                            className="w-full bg-transparent border border-gray-100 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 outline-none focus:border-erp-accent/30 focus:ring-2 focus:ring-erp-accent/5 transition-all placeholder:text-gray-300"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between rounded-b-3xl">
                            <div className="text-xs text-gray-400">
                                <span className="font-bold text-emerald-600">
                                    {qcItems.reduce((s, i) => s + (parseInt(i.passedQty) || 0), 0)} passed
                                </span>
                                {' · '}
                                <span className="font-bold text-red-600">
                                    {qcItems.reduce((s, i) => s + (parseInt(i.failedQty) || 0), 0)} failed
                                </span>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowQCModal(false)}
                                    className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmitQC}
                                    disabled={submittingQC}
                                    className="flex items-center gap-2 px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-erp-accent hover:bg-erp-accent/90 active:scale-95 disabled:opacity-50 rounded-full transition-all shadow-xl shadow-erp-accent/20"
                                >
                                    {submittingQC ? (
                                        <Icon icon="lucide:loader-2" className="animate-spin text-base" />
                                    ) : (
                                        <Icon icon="lucide:shield-check" className="text-base" />
                                    )}
                                    {submittingQC ? 'Submitting...' : 'Submit QC'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InwardDetails;
