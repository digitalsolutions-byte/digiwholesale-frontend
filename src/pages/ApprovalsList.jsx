import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { getPendingStageCustomers } from '../services/customerService';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../routes/paths';
import usePermissions from '../hooks/usePermissions';

const ApprovalsList = () => {
    const navigate = useNavigate();
    const { user } = usePermissions();

    const deptName = (user?.Department?.name || '').toLowerCase();
    const isSalesDept = deptName.includes('sales');
    const isFinanceDept = deptName.includes('finance');

    // Initial stage determination
    const defaultStage = isFinanceDept ? 'finance' : 'salesHead';
    const [activeStage, setActiveStage] = useState(defaultStage);
    const [approvals, setApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalRecords: 0 });

    const isRestrictedDept = isSalesDept || isFinanceDept;

    const fetchApprovals = useCallback(async (stageToFetch = activeStage, page = 1) => {
        setLoading(true);
        try {
            // Use stage-specific parameter for pending-stage API
            const response = await getPendingStageCustomers(stageToFetch, page, 10);

            if (response?.success) {
                const data = response.data || {};
                const list = data.customers || (Array.isArray(data) ? data : []);
                setApprovals(list);
                setPagination(data.pagination || {
                    currentPage: page,
                    totalPages: Math.ceil((data.totalCustomers || list.length) / 10) || 1,
                    totalRecords: data.totalCustomers || data.totalRecords || list.length
                });
            } else {
                setApprovals([]);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to load pending approvals');
            setApprovals([]);
        } finally {
            setLoading(false);
        }
    }, [activeStage]);

    useEffect(() => {
        fetchApprovals(activeStage, 1);
    }, [activeStage, fetchApprovals]);

    const handleStageTabChange = (stage) => {
        setActiveStage(stage);
    };

    const handleRowClick = (id) => {
        navigate(`${PATHS.CUSTOMER.REGISTER}?approvalId=${id}&stage=${activeStage}`);
    };

    const isSalesStage = activeStage === 'salesHead';

    return (
        <div className="p-2 w-full h-full flex flex-col gap-4">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-1">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Icon
                            icon={isSalesStage ? "mdi:account-tie" : "mdi:finance"}
                            className={isSalesStage ? "text-[#2980B9]" : "text-emerald-600"}
                        />
                        {isSalesStage ? 'Sales Head Pending Approvals' : 'Finance Pending Approvals'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {isSalesStage
                            ? 'Review and verify sales registration requests submitted by sales executive'
                            : 'Review and set credit limits, payment terms & financial approvals'}
                        <span className={`ml-2 font-bold ${isSalesStage ? 'text-[#1F618D]' : 'text-emerald-700'}`}>
                            ({pagination.totalRecords || approvals.length} total pending)
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fetchApprovals(activeStage, pagination.currentPage)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#2980B9] bg-[#eaf4fb] hover:bg-[#d4eaf6] rounded-xl transition-colors"
                    >
                        <Icon icon="mdi:refresh" className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Department / Stage Tabs (For Admins or Multi-stage users) */}
            {!isRestrictedDept && (
                <div className="flex items-center gap-2 p-1.5 bg-gray-100/80 rounded-2xl w-fit border border-gray-200/60">
                    <button
                        onClick={() => handleStageTabChange('salesHead')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            activeStage === 'salesHead'
                                ? 'bg-white text-[#1F618D] shadow-sm border border-gray-200/60'
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <Icon icon="mdi:account-tie" className="text-base" />
                        Sales Head Stage
                    </button>
                    <button
                        onClick={() => handleStageTabChange('finance')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            activeStage === 'finance'
                                ? 'bg-white text-emerald-700 shadow-sm border border-gray-200/60'
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <Icon icon="mdi:finance" className="text-base" />
                        Finance Stage
                    </button>
                </div>
            )}

            {/* Table Area */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`${isSalesStage ? 'bg-[#eaf4fb]/50 border-[#2980B9]/15' : 'bg-emerald-50/40 border-emerald-200/40'} border-b`}>
                                <th className={`py-3 px-4 text-xs font-bold ${isSalesStage ? 'text-[#1F618D]' : 'text-emerald-800'} uppercase tracking-wider`}>Shop Info</th>
                                <th className={`py-3 px-4 text-xs font-bold ${isSalesStage ? 'text-[#1F618D]' : 'text-emerald-800'} uppercase tracking-wider`}>Customer Type</th>
                                <th className={`py-3 px-4 text-xs font-bold ${isSalesStage ? 'text-[#1F618D]' : 'text-emerald-800'} uppercase tracking-wider`}>Approval Stage</th>
                                <th className={`py-3 px-4 text-xs font-bold ${isSalesStage ? 'text-[#1F618D]' : 'text-emerald-800'} uppercase tracking-wider`}>Created By</th>
                                <th className={`py-3 px-4 text-xs font-bold ${isSalesStage ? 'text-[#1F618D]' : 'text-emerald-800'} uppercase tracking-wider`}>Submission Date</th>
                                <th className={`py-3 px-4 text-xs font-bold ${isSalesStage ? 'text-[#1F618D]' : 'text-emerald-800'} uppercase tracking-wider text-right`}>Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="p-6">
                                            <div className="h-12 bg-gray-100 rounded-2xl w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : approvals.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="p-4 bg-gray-50 rounded-full">
                                                <Icon icon="mdi:clipboard-text-off-outline" className="text-4xl text-gray-300" />
                                            </div>
                                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                                                No pending {isSalesStage ? 'Sales Head' : 'Finance'} approvals found
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                approvals.map((approval) => (
                                    <tr
                                        key={approval._id}
                                        className="group hover:bg-gray-50/80 transition-all cursor-pointer"
                                        onClick={() => handleRowClick(approval._id)}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${isSalesStage ? 'from-amber-400 to-[#1F618D]' : 'from-emerald-400 to-teal-700'} flex items-center justify-center text-white font-bold text-xs shadow-sm`}>
                                                    {approval.shopName?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-xs text-gray-800 uppercase tracking-tight truncate max-w-[200px]">
                                                        {approval.shopName}
                                                    </div>
                                                    <div className="text-gray-400 font-medium text-[10px] uppercase flex items-center gap-1">
                                                        <Icon icon="mdi:account" className="text-gray-300" />
                                                        {approval.ownerName || approval.proprietorName}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                {approval.businessType?.name || approval.businessType || approval.CustomerType?.name || approval.CustomerType || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                isSalesStage
                                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                            }`}>
                                                {isSalesStage ? 'Sales Head Review' : 'Finance Review'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-semibold text-gray-700 uppercase tracking-tight">
                                                {(typeof approval.createdByName === 'object' ? (approval.createdByName?.employeeName || approval.createdByName?.name) : (approval.createdByLabel || approval.createdByName)) || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-semibold text-gray-500">
                                                {approval.createdAt ? new Date(approval.createdAt).toLocaleDateString('en-IN', {
                                                    year: 'numeric', month: 'short', day: 'numeric'
                                                }) : 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button className={`px-3 py-1.5 text-xs font-bold text-white rounded-lg transition-all flex items-center gap-1.5 ml-auto ${
                                                isSalesStage
                                                    ? 'bg-[#1F618D] hover:bg-[#174e71]'
                                                    : 'bg-emerald-600 hover:bg-emerald-700'
                                            }`}>
                                                <Icon icon="mdi:shield-check" className="text-sm" />
                                                {isSalesStage ? 'Review (Sales Head)' : 'Review (Finance)'}
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
                    <div className="p-4 flex items-center justify-between bg-gray-50/50 border-t border-gray-100">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            Page {pagination.currentPage} of {pagination.totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); fetchApprovals(activeStage, pagination.currentPage - 1); }}
                                disabled={pagination.currentPage === 1}
                                className="p-2 rounded-xl bg-white border border-gray-200 text-gray-400 disabled:opacity-50 hover:bg-gray-100 transition-all font-bold text-[10px] uppercase tracking-wider px-4"
                            >
                                Prev
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); fetchApprovals(activeStage, pagination.currentPage + 1); }}
                                disabled={pagination.currentPage >= pagination.totalPages}
                                className={`p-2 rounded-xl text-white disabled:opacity-50 transition-all font-bold text-[10px] uppercase tracking-wider px-4 ${
                                    isSalesStage ? 'bg-[#1F618D] hover:bg-[#2980B9]' : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
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


