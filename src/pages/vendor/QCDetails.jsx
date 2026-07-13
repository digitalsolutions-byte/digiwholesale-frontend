import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { getQCById } from '../../services/vendorOrderService';
import { toast } from 'react-toastify';

const QCDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [qcRecord, setQcRecord] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQC = async () => {
            setLoading(true);
            try {
                const response = await getQCById(id);
                if (response.success && response.data) {
                    setQcRecord(response.data.qcRecord || response.data.qc || response.data);
                } else {
                    toast.error('Failed to load QC details');
                }
            } catch (error) {
                toast.error(error.message || 'Error loading QC details');
            } finally {
                setLoading(false);
            }
        };
        fetchQC();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <Icon icon="lucide:loader-2" className="animate-spin text-4xl text-erp-accent" />
                    <p className="text-gray-500 font-medium">Loading QC details...</p>
                </div>
            </div>
        );
    }

    if (!qcRecord) {
        return (
            <div className="p-8 text-center text-gray-500">
                <Icon icon="lucide:alert-circle" className="text-4xl text-gray-400 mx-auto mb-4" />
                <p>QC record not found</p>
                <button onClick={() => navigate(-1)} className="mt-4 text-erp-accent hover:underline">Go Back</button>
            </div>
        );
    }

    const totalPassed = qcRecord.items?.reduce((sum, i) => sum + (i.passedQty || 0), 0) || 0;
    const totalFailed = qcRecord.items?.reduce((sum, i) => sum + (i.failedQty || 0), 0) || 0;

    const getResultColor = (passed, failed) => {
        if (failed > 0 && passed === 0) return 'bg-red-50 text-red-700';
        if (failed > 0) return 'bg-amber-50 text-amber-700';
        if (passed > 0) return 'bg-emerald-50 text-emerald-700';
        return 'bg-gray-50 text-gray-700';
    };

    const getResultLabel = (passed, failed) => {
        if (failed > 0 && passed === 0) return 'FAILED';
        if (failed > 0) return 'PARTIAL';
        if (passed > 0) return 'PASSED';
        return 'PENDING';
    };

    return (
        <div className="p-2 w-full h-full flex flex-col gap-4 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/vendor/qc')}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                    >
                        <Icon icon="lucide:arrow-left" className="text-xl" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                            <Icon icon="lucide:shield-check" className="text-erp-accent" />
                            QC Details
                        </h1>
                        <p className="text-sm text-gray-500 mt-1 font-mono">#{qcRecord._id}</p>
                    </div>
                </div>
                {qcRecord.notifyVendor && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full">
                        <Icon icon="lucide:bell" className="text-sm" />
                        Vendor Notified
                    </span>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vendor</span>
                    <span className="text-sm font-semibold text-gray-800 truncate">{qcRecord.vendorName || 'N/A'}</span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Purchase Order</span>
                    <span className="font-mono text-xs text-gray-600 truncate" title={qcRecord.purchaseOrderId}>
                        {qcRecord.purchaseOrderId ? qcRecord.purchaseOrderId.substring(qcRecord.purchaseOrderId.length - 8).toUpperCase() : 'N/A'}
                    </span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Inward ID</span>
                    <span className="font-mono text-xs text-gray-600 truncate" title={qcRecord.purchaseInwardId}>
                        {qcRecord.purchaseInwardId ? qcRecord.purchaseInwardId.substring(qcRecord.purchaseInwardId.length - 8).toUpperCase() : 'N/A'}
                    </span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Passed</span>
                    <span className="text-lg font-bold text-emerald-600">{totalPassed}</span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Failed</span>
                    <span className={`text-lg font-bold ${totalFailed > 0 ? 'text-red-600' : 'text-gray-400'}`}>{totalFailed}</span>
                </div>
            </div>

            {/* QC Date & Remarks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">QC Date</span>
                    <p className="text-sm font-semibold text-gray-800">
                        {new Date(qcRecord.qcDate || qcRecord.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                    </p>
                </div>
                {qcRecord.remarks && (
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Remarks</span>
                        <p className="text-sm text-gray-700">{qcRecord.remarks}</p>
                    </div>
                )}
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-[#eaf4fb]/20">
                    <h2 className="text-sm font-bold text-[#1F618D] flex items-center gap-2">
                        <Icon icon="lucide:list-checks" /> QC Items
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-[#eaf4fb]/50 border-b border-[#2980B9]/15 text-[#1F618D] font-bold text-xs uppercase tracking-wider">
                                <th className="px-4 py-2.5 font-bold">#</th>
                                <th className="px-4 py-2.5 font-bold">Item</th>
                                <th className="px-4 py-2.5 font-bold">Category</th>
                                <th className="px-4 py-2.5 font-bold text-center">Passed Qty</th>
                                <th className="px-4 py-2.5 font-bold text-center">Failed Qty</th>
                                <th className="px-4 py-2.5 font-bold text-center">Result</th>
                                <th className="px-4 py-2.5 font-bold">Failure Reason</th>
                                <th className="px-4 py-2.5 font-bold">Remarks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-gray-700">
                            {qcRecord.items?.map((item, idx) => {
                                const resultColor = getResultColor(item.passedQty, item.failedQty);
                                const resultLabel = getResultLabel(item.passedQty, item.failedQty);
                                return (
                                    <tr key={idx} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-2 text-gray-400 font-medium">{idx + 1}</td>
                                        <td className="px-4 py-2">
                                            <div className="font-semibold text-gray-800">{item.itemName || 'N/A'}</div>
                                            {item.unit && <div className="text-[10px] text-gray-450 mt-0.5">{item.unit}</div>}
                                        </td>
                                        <td className="px-4 py-2 text-gray-600">{item.category || '—'}</td>
                                        <td className="px-4 py-2 text-center">
                                            <span className="font-bold text-emerald-600">{item.passedQty || 0}</span>
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <span className={`font-bold ${(item.failedQty || 0) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                {item.failedQty || 0}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold rounded-full ${resultColor}`}>
                                                {resultLabel}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2">
                                            {item.failureReason ? (
                                                <span className="text-xs text-red-650 font-semibold">{item.failureReason}</span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-xs text-gray-500 max-w-[200px] truncate" title={item.remarks}>
                                            {item.remarks || '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default QCDetails;
