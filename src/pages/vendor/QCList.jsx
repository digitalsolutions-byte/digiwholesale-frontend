import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { getAllQCItems } from '../../services/vendorOrderService';
import { toast } from 'react-toastify';

const QCList = () => {
    const navigate = useNavigate();
    const [qcRecords, setQcRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);

    const fetchQCRecords = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getAllQCItems(page, 10);
            if (response.success) {
                let records = response.data?.qcs || response.data?.qcRecords || response.data?.qcItems || response.data?.items || response.data?.data || response.data || [];
                if (!Array.isArray(records)) {
                    records = [];
                }
                setQcRecords(records);
                setPagination(response.data?.pagination || null);
            } else {
                setQcRecords([]);
            }
        } catch (error) {
            console.error('Error fetching QC items:', error);
            toast.error(error.message || 'Failed to fetch QC records');
        } finally {
            setLoading(false);
        }
    }, [page]);

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
        <div className="p-2 w-full h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Icon icon="lucide:shield-check" className="text-[#2980B9]" />
                        Purchase QC Completed
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Quality check records for received goods</p>
                </div>
                <button
                    onClick={fetchQCRecords}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#1F618D] bg-blue-50 hover:bg-[#eaf4fb] rounded-xl transition-colors"
                >
                    <Icon icon="lucide:refresh-cw" className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#eaf4fb]/50 border-b border-[#2980B9]/15">
                                <th className="py-2.5 px-4 w-12 text-[#1F618D]"></th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">QC ID</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Vendor</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Items</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Passed</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Failed</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Status</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">QC Date</th>
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
                                            <td className="px-4 py-2">
                                                <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#eaf4fb] transition-colors">
                                                    <Icon icon="lucide:arrow-right" className="text-gray-400 group-hover:text-[#1F618D] text-xs" />
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className="font-mono text-xs text-gray-600" title={qc._id}>
                                                    {qc._id.substring(qc._id.length - 8).toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className="font-semibold text-xs text-gray-800">
                                                    {qc.vendorName || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className="text-xs text-gray-600">
                                                    {qc.items?.length || 0} item{(qc.items?.length || 0) !== 1 ? 's' : ''}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className="text-xs font-bold text-emerald-600">{totalPassed}</span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className={`text-xs font-bold ${totalFailed > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                    {totalFailed}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full ${badge.cls}`}>
                                                    {badge.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-xs text-gray-500">
                                                {new Date(qc.qcDate || qc.createdAt).toLocaleDateString('en-IN')}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {pagination && pagination.totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center bg-gray-50/50">
                        <span>Showing <strong>{qcRecords.length}</strong> items</span>
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

export default QCList;
