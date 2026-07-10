import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { getAllQCItems } from '../../services/vendorOrderService';
import { toast } from 'react-toastify';

const QCList = () => {
    const navigate = useNavigate();
    const [qcRecords, setQcRecords] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchQCRecords = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getAllQCItems(1, 100);
            if (response.success) {
                let records = response.data?.qcs || response.data?.qcRecords || response.data?.qcItems || response.data?.items || response.data?.data || response.data || [];
                if (!Array.isArray(records)) {
                    records = [];
                }
                setQcRecords(records);
            } else {
                setQcRecords([]);
            }
        } catch (error) {
            console.error('Error fetching QC items:', error);
            toast.error(error.message || 'Failed to fetch QC records');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQCRecords();
    }, [fetchQCRecords]);

    const getQCStatusBadge = (qc) => {
        const result = qc.overallResult || 'PENDING';
        if (result === 'PASSED') return { label: 'PASSED', cls: 'bg-emerald-50 text-emerald-700' };
        if (result === 'FAILED') return { label: 'FAILED', cls: 'bg-red-50 text-red-700' };
        if (result === 'PARTIAL') return { label: 'PARTIAL', cls: 'bg-amber-50 text-amber-700' };
        return { label: result, cls: 'bg-gray-50 text-gray-600' };
    };

    return (
        <div className="p-6 max-w-7xl mx-auto h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Icon icon="lucide:shield-check" className="text-erp-accent" />
                        Purchase QC Completed
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Quality check records for received goods</p>
                </div>
                <button
                    onClick={fetchQCRecords}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-erp-accent bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                >
                    <Icon icon="lucide:refresh-cw" className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="p-4 w-12"></th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">QC ID</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Passed</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Failed</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">QC Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <Icon icon="lucide:loader-2" className="animate-spin text-xl text-erp-accent" />
                                            <span>Loading QC records...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : qcRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Icon icon="lucide:shield-off" className="text-4xl text-gray-300" />
                                            <p className="text-gray-500 font-medium">No QC records found</p>
                                            <p className="text-xs text-gray-400">QC records will appear here after quality checks are performed on inwarded goods</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                qcRecords.map((qc) => {
                                    const badge = getQCStatusBadge(qc);
                                    const totalPassed = qc.items?.reduce((sum, i) => sum + (i.passedQty || 0), 0) || 0;
                                    const totalFailed = qc.items?.reduce((sum, i) => sum + (i.failedQty || 0), 0) || 0;
                                    return (
                                        <tr
                                            key={qc._id}
                                            className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                                            onClick={() => navigate(`/vendor/qc/${qc._id}`)}
                                        >
                                            <td className="p-4">
                                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-erp-accent/10 transition-colors">
                                                    <Icon icon="lucide:arrow-right" className="text-gray-400 group-hover:text-erp-accent" />
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-mono text-sm text-gray-600" title={qc._id}>
                                                    {qc._id.substring(qc._id.length - 8).toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-medium text-gray-800">
                                                    {qc.vendorName || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-sm text-gray-600">
                                                    {qc.items?.length || 0} item{(qc.items?.length || 0) !== 1 ? 's' : ''}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-sm font-bold text-emerald-600">{totalPassed}</span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`text-sm font-bold ${totalFailed > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                    {totalFailed}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${badge.cls}`}>
                                                    {badge.label}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-gray-500">
                                                {new Date(qc.qcDate || qc.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default QCList;
