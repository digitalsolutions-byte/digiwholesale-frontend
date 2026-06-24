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
        <div className="p-8 pb-20 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Area */}
            {/* <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-erp-accent/10 rounded-xl">
                            <Icon icon="mdi:clipboard-check-outline" className="text-2xl text-erp-accent/80" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">Pending Approvals</h1>
                    </div>
                    <p className="text-gray-500 font-medium flex items-center gap-2">
                        Review and finalize customer registrations
                        <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                        <span className="text-erp-accent/80 font-bold">{pagination.totalCustomers || (pagination.totalRecords || approvals.length)} total pending</span>
                    </p>
                </div>

                <Button
                    variant="outlined"
                    onClick={() => fetchApprovals(pagination.currentPage)}
                    className="rounded-2xl border-gray-200"
                >
                    <Icon icon="mdi:refresh" className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh List
                </Button>
            </div> */}

            {/* Table Area */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Shop Info</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Customer Type</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Created By</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Submission Date</th>
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
                                        className="group hover:bg-erp-accent/5/30 transition-all cursor-pointer"
                                        onClick={() => handleRowClick(approval._id)}
                                    >
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 whitespace-nowrap h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-erp-accent/80 flex items-center justify-center text-white font-black shadow-lg shadow-erp-accent/20 group-hover:scale-110 transition-transform">
                                                    {approval.shopName?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-black whitespace-nowrap text-gray-800 uppercase tracking-tight text-sm leading-tight leading-4">
                                                        {approval.shopName}
                                                    </div>
                                                    <div className="text-gray-400 whitespace-nowrap font-bold text-[11px] uppercase  flex items-center gap-1.5 mt-0.5">
                                                        <Icon icon="mdi:account" className="text-gray-300" />
                                                        {approval.ownerName}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className="px-3 py-1 whitespace-nowrap bg-gray-100 text-gray-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                {approval.businessType?.name || approval.businessType || approval.CustomerType?.name || approval.CustomerType || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-xs font-bold text-gray-700 uppercase tracking-tight">
                                                {(typeof approval.createdByName === 'object' ? (approval.createdByName?.employeeName || approval.createdByName?.name) : (approval.createdByLabel || approval.createdByName)) || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-xs font-bold text-gray-500">
                                                {new Date(approval.createdAt).toLocaleDateString(undefined, {
                                                    year: 'numeric', month: 'short', day: 'numeric'
                                                })}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <button className="p-2.5 bg-gray-50 text-gray-400 rounded-xl group-hover:bg-erp-accent group-hover:text-white transition-all shadow-sm">
                                                <Icon icon="mdi:eye-outline" className="text-xl" />
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
                                className="p-2 rounded-xl bg-white border border-gray-200 text-gray-400 disabled:opacity-50 hover:bg-gray-100 transition-all font-black text-[10px] uppercase tracking-widest px-4"
                            >
                                Prev
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); fetchApprovals(pagination.currentPage + 1); }}
                                disabled={pagination.currentPage === pagination.totalPages}
                                className="p-2 rounded-xl bg-erp-accent text-white disabled:opacity-50 hover:bg-erp-accent/80 transition-all font-black text-[10px] uppercase tracking-widest px-4 shadow-lg shadow-erp-accent/20"
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


