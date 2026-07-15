import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { getAllInwardItems } from '../../services/vendorOrderService';
import { toast } from 'react-toastify';

const InwardList = () => {
    const navigate = useNavigate();
    const [inwards, setInwards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);

    const fetchInwards = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getAllInwardItems(page, 10);
            if (response.success) {
                setInwards(response.data?.inwards || response.data || []);
                setPagination(response.data?.pagination || null);
            } else {
                setInwards([]);
            }
        } catch (error) {
            console.error('Error fetching inward items:', error);
            toast.error(error.message || 'Failed to fetch inward items');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchInwards();
    }, [fetchInwards]);

    const getConditionBadge = (items) => {
        const conditions = items?.map(i => i.condition) || [];
        if (conditions.every(c => c === 'GOOD')) return { label: 'GOOD', cls: 'bg-emerald-50 text-emerald-700' };
        if (conditions.some(c => c === 'DAMAGED')) return { label: 'DAMAGED', cls: 'bg-red-50 text-red-700' };
        return { label: 'MIXED', cls: 'bg-amber-50 text-amber-700' };
    };
    return (
        <div className="p-2 w-full h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Icon icon="lucide:package-check" className="text-[#2980B9]" />
                        Purchase Inwarded Items
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">View all received purchased items</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#eaf4fb]/50 border-b border-[#2980B9]/15">
                                <th className="py-2.5 px-4 w-12 text-[#1F618D]"></th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Inward ID</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Vendor</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Items</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Condition</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Status</th>
                                <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Inward Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <Icon icon="lucide:loader-2" className="animate-spin text-xl text-erp-accent" />
                                            <span>Loading inward items...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : inwards.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-500">
                                        No inward records found.
                                    </td>
                                </tr>
                            ) : (
                                inwards.map((inward) => {
                                    const badge = getConditionBadge(inward.items);
                                    return (
                                        <tr
                                            key={inward._id}
                                            className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                                            onClick={() => navigate(`/vendor/inward/${inward._id}`)}
                                        >
                                            <td className="px-4 py-2">
                                                <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#eaf4fb] transition-colors">
                                                    <Icon icon="lucide:arrow-right" className="text-gray-400 group-hover:text-[#1F618D] text-xs" />
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className="font-mono text-xs text-gray-600" title={inward._id}>
                                                    {inward._id.substring(inward._id.length - 8).toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className="font-semibold text-xs text-gray-800">
                                                    {inward.vendorName || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className="text-xs text-gray-600">
                                                    {inward.items?.length || 0} item{(inward.items?.length || 0) !== 1 ? 's' : ''}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full ${badge.cls}`}>
                                                    {badge.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded-full">
                                                    {inward.status || 'Pending'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-xs text-gray-500">
                                                {new Date(inward.inwardDate || inward.createdAt).toLocaleDateString('en-IN')}
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
                        <span>Showing <strong>{inwards.length}</strong> items</span>
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

export default InwardList;
