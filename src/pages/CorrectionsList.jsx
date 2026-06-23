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

    const { hasPermission } = usePermissions();

    const fetchCorrections = async (page = 1) => {
        setLoading(true);
        try {
            // Derive workflow stages from accessPermissions[].
            // No Department.name or EmployeeType string checks.
            const stages = new Set();

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
        <div className="p-8 pb-20 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-red-500/10 rounded-xl">
                            <Icon icon="mdi:alert-circle-outline" className="text-2xl text-red-600" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">Corrections Required</h1>
                    </div>
                    <p className="text-gray-500 font-medium flex items-center gap-2">
                        Review and resubmit customers with rejected details
                        <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                        <span className="text-red-600 font-bold">{pagination.totalCustomers || corrections.length} total pending</span>
                    </p>
                </div>

                <Button
                    variant="outlined"
                    onClick={() => fetchCorrections(pagination.currentPage)}
                    className="rounded-2xl border-gray-200 flex items-center gap-2"
                >
                    <Icon icon="mdi:refresh" className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh List
                </Button>
            </div>

            {/* Table Area */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Shop Info</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Remark</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Requested By</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Rejected On</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Actions</th>
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
                                        className="group hover:bg-red-50/30 transition-all cursor-pointer"
                                        onClick={() => handleRowClick(item._id)}
                                    >
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-black shadow-lg shadow-red-500/20 group-hover:scale-110 transition-transform">
                                                    {item.shopName?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-black text-gray-800 uppercase tracking-tight text-sm leading-tight leading-4">
                                                        {item.shopName}
                                                    </div>
                                                    <div className="text-gray-400 font-bold text-[11px] uppercase  flex items-center gap-1.5 mt-0.5">
                                                        <Icon icon="mdi:account" className="text-gray-300" />
                                                        {item.ownerName}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="max-w-[300px]">
                                                <p className="text-xs font-bold text-red-600 truncate" title={item.correctionRequest?.remark}>
                                                    {item.correctionRequest?.remark || 'No remark provided'}
                                                </p>
                                                <p className="text-[10px] text-gray-400 font-medium uppercase mt-1">
                                                    {item.correctionRequest?.fieldsToCorrect?.length || 0} fields to fix
                                                </p>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-xs font-bold text-gray-700 uppercase tracking-tight">
                                                {item.correctionRequest?.requestedBy?.employeeName || 'Finance'}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-xs font-bold text-gray-500">
                                                {item.correctionRequest?.requestedAt ? new Date(item.correctionRequest.requestedAt).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <button className="p-2.5 bg-gray-50 text-gray-400 rounded-xl group-hover:bg-red-500 group-hover:text-white transition-all shadow-sm">
                                                <Icon icon="mdi:pencil-outline" className="text-xl" />
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
                                className="p-2 rounded-xl bg-white border border-gray-200 text-gray-400 disabled:opacity-50 hover:bg-gray-100 transition-all font-black text-[10px] uppercase tracking-widest px-4"
                            >
                                Prev
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); fetchCorrections(pagination.currentPage + 1); }}
                                disabled={pagination.currentPage === pagination.totalPages}
                                className="p-2 rounded-xl bg-red-500 text-white disabled:opacity-50 hover:bg-red-600 transition-all font-black text-[10px] uppercase tracking-widest px-4 shadow-lg shadow-red-500/20"
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


