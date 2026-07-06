import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { getInwardById } from '../../services/vendorOrderService';
import { toast } from 'react-toastify';

const InwardDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [inward, setInward] = useState(null);
    const [loading, setLoading] = useState(true);

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
                <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full">
                    {inward.status || 'Pending'}
                </span>
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
        </div>
    );
};

export default InwardDetails;
