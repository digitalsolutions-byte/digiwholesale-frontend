import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { getPendingStageCustomers } from '../services/customerService';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../routes/paths';
import Button from '../components/ui/Button';
import usePermissions from '../hooks/usePermissions';

const ApprovalsList = () => {
    const navigate = useNavigate();
    const [approvals, setApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });

    const { hasPermission } = usePermissions();

    const fetchApprovals = async (page = 1) => {
        setLoading(true);
        try {
            // Derive workflow stages from accessPermissions[].
            // No Department.name or EmployeeType string checks.
            const stages = new Set();

            // APPROVE_ORDER permission → can approve at both workflow stages
            if (hasPermission('APPROVE_ORDER')) {
                stages.add('salesHead');
                stages.add('finance');
            }
            // UPDATE_CUSTOMER permission → sales-head review stage
            if (hasPermission('UPDATE_CUSTOMER')) {
                stages.add('salesHead');
            }
            // ADD_CUSTOMER permission → can see pending-finance items
            if (hasPermission('ADD_CUSTOMER')) {
                stages.add('finance');
            }

            // Fallback: show all stages so the page is never silently blank
            if (stages.size === 0) {
                stages.add('salesHead');
                stages.add('finance');
            }

            const response = await getPendingStageCustomers([...stages].join(','), page, 10);
            if (response.success) {
                let customers = response.data.customers || [];

                // If regular Sales user, only show their own submissions
                // if (isSalesExecutive) {
                //     customers = customers.filter(c => c.createdBy === user._id || c.createdBy?._id === user._id);
                // }

                setApprovals(customers);
                setPagination(response.data.pagination || { currentPage: 1, totalPages: 1 });
            }
        } catch (error) {
            toast.error(error.message || 'Failed to load pending approvals');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApprovals();
    }, []);

    const handleRowClick = (id) => {
        navigate(`${PATHS.CUSTOMER.REGISTER}?approvalId=${id}`);
    };

    return (
        <div className="p-2 w-full h-full flex flex-col gap-4">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Icon icon="mdi:clipboard-check-outline" className="text-[#2980B9]" />
                        Pending Approvals
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Review and finalize customer registrations
                        <span className="ml-2 font-semibold text-[#1F618D]">({pagination.totalCustomers || (pagination.totalRecords || approvals.length)} total pending)</span>
                    </p>
                </div>
                <button
                    onClick={() => fetchApprovals(pagination.currentPage)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#2980B9] bg-[#eaf4fb] hover:bg-[#d4eaf6] rounded-xl transition-colors"
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
                            <tr className="bg-[#eaf4fb]/50 border-b border-[#2980B9]/15">
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Shop Info</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Customer Type</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Created By</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Submission Date</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider text-right">Actions</th>
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
                            ) : approvals.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="p-4 bg-gray-50 rounded-full">
                                                <Icon icon="mdi:clipboard-text-off-outline" className="text-4xl text-gray-300" />
                                            </div>
                                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No pending approvals found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                approvals.map((approval) => (
                                    <tr
                                        key={approval._id}
                                        className="group hover:bg-[#eaf4fb]/50 transition-all cursor-pointer"
                                        onClick={() => handleRowClick(approval._id)}
                                    >
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-[#1F618D] flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                                    {approval.shopName?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-xs text-gray-800 uppercase tracking-tight truncate max-w-[200px]">
                                                        {approval.shopName}
                                                    </div>
                                                    <div className="text-gray-400 font-medium text-[10px] uppercase flex items-center gap-1">
                                                        <Icon icon="mdi:account" className="text-gray-300" />
                                                        {approval.ownerName}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                {approval.businessType?.name || approval.businessType || approval.CustomerType?.name || approval.CustomerType || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className="text-xs font-semibold text-gray-700 uppercase tracking-tight">
                                                {(typeof approval.createdByName === 'object' ? (approval.createdByName?.employeeName || approval.createdByName?.name) : (approval.createdByLabel || approval.createdByName)) || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className="text-xs font-semibold text-gray-500">
                                                {new Date(approval.createdAt).toLocaleDateString('en-IN', {
                                                    year: 'numeric', month: 'short', day: 'numeric'
                                                })}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <button className="p-1 bg-gray-50 text-gray-400 rounded-lg group-hover:bg-[#1F618D] group-hover:text-white transition-all">
                                                <Icon icon="mdi:eye-outline" className="text-base" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && approvals.length > 0 && (
                    <div className="p-6 flex items-center justify-between bg-gray-50/50 border-t border-gray-100">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            Page {pagination.currentPage} of {pagination.totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); fetchApprovals(pagination.currentPage - 1); }}
                                disabled={pagination.currentPage === 1}
                                className="p-2 rounded-xl bg-white border border-gray-200 text-gray-400 disabled:opacity-50 hover:bg-gray-100 transition-all font-bold text-[10px] uppercase tracking-wider px-4"
                            >
                                Prev
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); fetchApprovals(pagination.currentPage + 1); }}
                                disabled={pagination.currentPage === pagination.totalPages}
                                className="p-2 rounded-xl bg-[#1F618D] text-white disabled:opacity-50 hover:bg-[#2980B9] transition-all font-bold text-[10px] uppercase tracking-wider px-4"
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

export default ApprovalsList;


