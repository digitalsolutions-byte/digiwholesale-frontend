import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { getPendingStageCustomers } from '../services/customerService';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../routes/paths';
import Button from '../components/ui/Button';
import usePermissions from '../hooks/usePermissions';

const CorrectionsList = () => {
    const navigate = useNavigate();
    const [corrections, setCorrections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });

    const { hasPermission, user } = usePermissions();

    const fetchCorrections = async (page = 1) => {
        setLoading(true);
        try {
            // Derive workflow stages from accessPermissions[].
            const stages = new Set();
            const isFinanceDept = user?.Department?.name?.toLowerCase() === 'finance';

            if (isFinanceDept) {
                stages.add('financeCorrection');
            } else {
                // APPROVE_ORDER → finance-level corrections
                if (hasPermission('APPROVE_ORDER')) {
                    stages.add('financeCorrection');
                    stages.add('salesHead');
                }
                // UPDATE_CUSTOMER → sales corrections and sales-head review
                if (hasPermission('UPDATE_CUSTOMER')) {
                    stages.add('salesCorrection');
                    stages.add('salesHead');
                }
                // ADD_CUSTOMER → own sales corrections
                if (hasPermission('ADD_CUSTOMER')) {
                    stages.add('salesCorrection');
                }
            }

            // Fallback so the page is never silently blank
            if (stages.size === 0) {
                stages.add('salesCorrection');
                stages.add('financeCorrection');
                stages.add('salesHead');
            }

            const response = await getPendingStageCustomers([...stages].join('&'), page, 10);
            if (response.success) {
                const customers = response.data.customers || [];
                setCorrections(customers);
                setPagination(response.data.pagination || { currentPage: 1, totalPages: 1 });
            }
        } catch (error) {
            toast.error(error.message || 'Failed to load correction requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCorrections();
    }, []);

    const handleRowClick = (id) => {
        navigate(`${PATHS.CUSTOMER.REGISTER}?correctionId=${id}`);
    };

    return (
        <div className="p-2 w-full h-full flex flex-col gap-4">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Icon icon="mdi:alert-circle-outline" className="text-red-600" />
                        Corrections Required
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Review and resubmit customers with rejected details
                        <span className="ml-2 font-semibold text-red-650">({pagination.totalCustomers || corrections.length} total pending)</span>
                    </p>
                </div>
                <button
                    onClick={() => fetchCorrections(pagination.currentPage)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                >
                    <Icon icon="mdi:refresh" className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Table Area */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-red-50/50 border-b border-red-200/30">
                                <th className="py-2.5 px-4 text-xs font-bold text-red-700 uppercase tracking-wider">Shop Info</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-red-700 uppercase tracking-wider">Remark</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-red-700 uppercase tracking-wider">Requested By</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-red-700 uppercase tracking-wider">Rejected On</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-red-700 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="5" className="p-6">
                                            <div className="h-12 bg-gray-100 rounded-2xl w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : corrections.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="p-4 bg-gray-50 rounded-full">
                                                <Icon icon="mdi:clipboard-check-outline" className="text-4xl text-gray-300" />
                                            </div>
                                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No corrections required at the moment</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                corrections.map((item) => (
                                    <tr
                                        key={item._id}
                                        className="group hover:bg-red-50/20 transition-all cursor-pointer"
                                        onClick={() => handleRowClick(item._id)}
                                    >
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                                    {item.shopName?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-xs text-gray-800 uppercase tracking-tight truncate max-w-[200px]">
                                                        {item.shopName}
                                                    </div>
                                                    <div className="text-gray-400 font-medium text-[10px] uppercase flex items-center gap-1">
                                                        <Icon icon="mdi:account" className="text-gray-300" />
                                                        {item.ownerName}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="max-w-[300px]">
                                                <p className="text-xs font-semibold text-red-650 truncate" title={item.correctionRequest?.remark}>
                                                    {item.correctionRequest?.remark || 'No remark provided'}
                                                </p>
                                                <p className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">
                                                    {item.correctionRequest?.fieldsToCorrect?.length || 0} fields to fix
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className="text-xs font-semibold text-gray-700 uppercase tracking-tight">
                                                {item.correctionRequest?.requestedBy?.employeeName || 'Finance'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className="text-xs font-semibold text-gray-500">
                                                {item.correctionRequest?.requestedAt ? new Date(item.correctionRequest.requestedAt).toLocaleDateString('en-IN') : 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <button className="p-1 bg-gray-50 text-gray-400 rounded-lg group-hover:bg-red-500 group-hover:text-white transition-all">
                                                <Icon icon="mdi:pencil-outline" className="text-base" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && corrections.length > 0 && (
                    <div className="p-6 flex items-center justify-between bg-gray-50/50 border-t border-gray-100">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            Page {pagination.currentPage} of {pagination.totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); fetchCorrections(pagination.currentPage - 1); }}
                                disabled={pagination.currentPage === 1}
                                className="p-2 rounded-xl bg-white border border-gray-200 text-gray-405 disabled:opacity-50 hover:bg-gray-105 transition-all font-bold text-[10px] uppercase tracking-wider px-4"
                            >
                                Prev
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); fetchCorrections(pagination.currentPage + 1); }}
                                disabled={pagination.currentPage === pagination.totalPages}
                                className="p-2 rounded-xl bg-red-600 text-white disabled:opacity-50 hover:bg-red-750 transition-all font-bold text-[10px] uppercase tracking-wider px-4"
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

export default CorrectionsList;


