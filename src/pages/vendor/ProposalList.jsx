import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { vendorProposalService } from '../../services/vendorProposalService';
import { PATHS } from '../../routes/paths';

const STATUS_CONFIG = {
    DRAFT: { label: 'Draft', badge: 'bg-gray-100 text-gray-700 border-gray-200' },
    SENT: { label: 'Sent', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
    QUOTED: { label: 'Quoted', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
    FINALIZED: { label: 'Finalized', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    ORDERED: { label: 'Ordered', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    CANCELLED: { label: 'Cancelled', badge: 'bg-red-50 text-red-700 border-red-200' }
};

const ProposalList = () => {
    const navigate = useNavigate();

    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const fetchProposals = useCallback(async (pageNo = page) => {
        try {
            setLoading(true);
            const params = {
                page: pageNo,
                limit: 20,
                status: statusFilter || undefined,
                search: search || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined
            };

            const data = await vendorProposalService.getProposals(params);
            if (data && (data.success || data.data || data.proposals)) {
                let list = [];
                if (Array.isArray(data.data)) {
                    list = data.data;
                } else if (data.data && Array.isArray(data.data.proposals)) {
                    list = data.data.proposals;
                } else if (data.data && Array.isArray(data.data.data)) {
                    list = data.data.data;
                } else if (Array.isArray(data.proposals)) {
                    list = data.proposals;
                } else if (Array.isArray(data)) {
                    list = data;
                }

                setProposals(list);
                setTotalPages(data.totalPages || data.data?.totalPages || 1);
                setTotalCount(data.totalProposals || data.total || data.data?.totalProposals || list.length);
                setPage(pageNo);
            } else {
                setProposals([]);
            }
        } catch (err) {
            toast.error(err.message || 'Failed to fetch proposals list');
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, search, fromDate, toDate]);

    useEffect(() => {
        fetchProposals(1);
    }, [statusFilter, fromDate, toDate]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchProposals(1);
    };

    const handleClearFilters = () => {
        setStatusFilter('');
        setSearch('');
        setFromDate('');
        setToDate('');
    };

    return (
        <div className="w-full max-w-7xl mx-auto space-y-5 pb-16">
            {/* Header Strip */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Icon icon="lucide:file-spreadsheet" className="text-[#2980B9]" />
                        Purchase Proposals / RFQs
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Manage quotation requests, vendor bids, and PO placement</p>
                </div>

                <button
                    onClick={() => navigate('/vendor/proposal/create')}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#2980B9] hover:bg-[#2471A3] text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
                >
                    <Icon icon="lucide:plus" className="text-base" />
                    <span>Buy Product (Create RFQ)</span>
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                    <div className="lg:col-span-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Search</label>
                        <div className="relative">
                            <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                            <input
                                type="text"
                                placeholder="Proposal No, Product, Brand..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#2980B9]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#2980B9]"
                        >
                            <option value="">All Statuses</option>
                            <option value="DRAFT">Draft</option>
                            <option value="SENT">Sent</option>
                            <option value="QUOTED">Quoted</option>
                            <option value="FINALIZED">Finalized</option>
                            <option value="ORDERED">Ordered</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">From Date</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#2980B9]"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">To Date</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#2980B9]"
                        />
                    </div>
                </form>

                {(search || statusFilter || fromDate || toDate) && (
                    <div className="flex justify-end pt-1">
                        <button
                            onClick={handleClearFilters}
                            className="text-xs font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1"
                        >
                            <Icon icon="mdi:close-circle" /> Clear Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Proposal Table Container */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                {/* ── Mobile Card View (block md:hidden) ── */}
                <div className="block md:hidden p-3 space-y-3 bg-gray-50/50">
                    {loading ? (
                        <div className="p-8 text-center text-xs font-semibold text-gray-400">Loading proposals...</div>
                    ) : !Array.isArray(proposals) || proposals.length === 0 ? (
                        <div className="p-8 text-center text-xs font-semibold text-gray-400">No proposals found</div>
                    ) : (
                        proposals.map((prop) => {
                            const cfg = STATUS_CONFIG[prop.status] || { label: prop.status, badge: 'bg-gray-100 text-gray-700 border-gray-200' };
                            const vendorsCount = prop.vendorQuotations?.length || prop.vendorIds?.length || 0;
                            const pObj = prop.product || prop;

                            return (
                                <div
                                    key={prop._id}
                                    onClick={() => navigate(`/vendor/proposal/view/${prop._id}`)}
                                    className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-2xs cursor-pointer hover:border-blue-300 transition-colors"
                                >
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                        <span className="font-mono text-xs font-bold text-[#2980B9] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                            #{prop.proposalNumber || prop._id.slice(-6).toUpperCase()}
                                        </span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${cfg.badge}`}>
                                            {cfg.label}
                                        </span>
                                    </div>

                                    <div className="space-y-1">
                                        <h3 className="text-sm font-bold text-gray-900">{pObj.productName || 'N/A'}</h3>
                                        <p className="text-xs text-gray-500 font-semibold">{pObj.category || 'N/A'} • {pObj.brand || 'No Brand'}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-50">
                                        <div>
                                            <span className="text-[9px] font-bold text-gray-400 uppercase block">Required Qty</span>
                                            <span className="font-bold text-gray-800">{prop.requiredQty} {prop.unit || 'PIECE'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-bold text-gray-400 uppercase block">Vendors Count</span>
                                            <span className="font-bold text-[#2980B9]">{vendorsCount} Vendors</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase block">Created Date</span>
                                            <span className="font-semibold text-gray-600">{dayjs(prop.createdAt).format('DD MMM YYYY, hh:mm A')}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* ── Desktop Table View (hidden md:block) ── */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                        <thead>
                            <tr className="bg-[#eaf4fb]/60 border-b border-[#2980B9]/15">
                                <th className="px-5 py-3.5 font-bold text-[#1F618D] uppercase tracking-wider">Proposal No</th>
                                <th className="px-5 py-3.5 font-bold text-[#1F618D] uppercase tracking-wider">Product Name</th>
                                <th className="px-5 py-3.5 font-bold text-[#1F618D] uppercase tracking-wider">Category & Brand</th>
                                <th className="px-5 py-3.5 font-bold text-[#1F618D] uppercase tracking-wider text-center">Req. Qty</th>
                                <th className="px-5 py-3.5 font-bold text-[#1F618D] uppercase tracking-wider text-center">Vendors</th>
                                <th className="px-5 py-3.5 font-bold text-[#1F618D] uppercase tracking-wider text-center">Status</th>
                                <th className="px-5 py-3.5 font-bold text-[#1F618D] uppercase tracking-wider">Created Date</th>
                                <th className="px-5 py-3.5 font-bold text-[#1F618D] uppercase tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="py-12 text-center text-gray-400 font-semibold">
                                        Loading proposals...
                                    </td>
                                </tr>
                            ) : !Array.isArray(proposals) || proposals.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-12 text-center text-gray-400 font-semibold">
                                        No proposals found
                                    </td>
                                </tr>
                            ) : (
                                proposals.map((prop) => {
                                    const cfg = STATUS_CONFIG[prop.status] || { label: prop.status, badge: 'bg-gray-100 text-gray-700 border-gray-200' };
                                    const vendorsCount = prop.vendorQuotations?.length || prop.vendorIds?.length || 0;
                                    const pObj = prop.product || prop;

                                    return (
                                        <tr
                                            key={prop._id}
                                            onClick={() => navigate(`/vendor/proposal/view/${prop._id}`)}
                                            className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                                        >
                                            <td className="px-5 py-3.5 font-mono font-bold text-[#2980B9]">
                                                #{prop.proposalNumber || prop._id.slice(-6).toUpperCase()}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="font-bold text-gray-900 block">{pObj.productName || 'N/A'}</span>
                                                {(pObj.productCode || prop.productCode) && <span className="text-[10px] text-gray-400 font-mono">Code: {pObj.productCode || prop.productCode}</span>}
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-700 font-medium">
                                                <span>{pObj.category || 'N/A'}</span>
                                                <span className="text-gray-400 text-[10px] block font-semibold">{pObj.brand || 'No Brand'}</span>
                                            </td>
                                            <td className="px-5 py-3.5 text-center font-bold text-gray-800">
                                                {prop.requiredQty} {prop.unit || 'PIECE'}
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <span className="px-2.5 py-1 bg-blue-50 text-[#2980B9] font-bold rounded-md border border-blue-100">
                                                    {vendorsCount} Vendors
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cfg.badge}`}>
                                                    {cfg.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-500 font-medium">
                                                {dayjs(prop.createdAt).format('DD MMM YYYY, hh:mm A')}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/vendor/proposal/view/${prop._id}`);
                                                    }}
                                                    className="px-3 py-1.5 bg-gray-100 hover:bg-[#2980B9] hover:text-white text-gray-700 font-bold rounded-lg transition-colors text-xs"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <span className="text-xs text-gray-500 font-medium">
                            Showing page <span className="font-bold text-gray-800">{page}</span> of <span className="font-bold text-gray-800">{totalPages}</span> ({totalCount} total)
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => fetchProposals(page - 1)}
                                disabled={page <= 1 || loading}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 disabled:opacity-30 hover:bg-white"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => fetchProposals(page + 1)}
                                disabled={page >= totalPages || loading}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 disabled:opacity-30 hover:bg-white"
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

export default ProposalList;
