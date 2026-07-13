import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { getQCFailedReport, getAllPurchaseReturns, updatePurchaseReturnItemStatus } from '../../services/vendorOrderService';
import { toast } from 'react-toastify';

const STATUS_META = {
    Pending: { cls: 'bg-gray-100 text-gray-600', icon: 'lucide:clock' },
    VendorNotified: { cls: 'bg-blue-50 text-blue-700', icon: 'lucide:bell' },
    Replaced: { cls: 'bg-emerald-50 text-emerald-700', icon: 'lucide:check-circle' },
    PartiallyReplaced: { cls: 'bg-amber-50 text-amber-700', icon: 'lucide:git-branch' },
    Closed: { cls: 'bg-purple-50 text-purple-700', icon: 'lucide:lock' },
};

const getStatusMeta = (status) =>
    STATUS_META[status] || { cls: 'bg-gray-100 text-gray-600', icon: 'lucide:help-circle' };

const QCFailedReport = () => {
    const navigate = useNavigate();

    const [reports, setReports] = useState([]);
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [expandedQcId, setExpandedQcId] = useState(null);

    // Modal state for updating return status
    const [modal, setModal] = useState(null); // { returnId, itemId, itemName }
    const [modalStatus, setModalStatus] = useState('Replaced');
    const [modalRemarks, setModalRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [reportRes, returnRes] = await Promise.all([
                getQCFailedReport(1, 100),
                getAllPurchaseReturns(1, 100)
            ]);

            if (reportRes.success) {
                setReports(reportRes.data?.report || reportRes.data || []);
            }
            if (returnRes.success) {
                setReturns(returnRes.data?.returns || returnRes.data || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error(error.message || 'Failed to fetch failed QC items');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Helper to find the return item status and returnId
    const getReturnStatusInfo = (purchaseQCId, itemId) => {
        const returnRec = returns.find(r => r.purchaseQCId === purchaseQCId);
        if (!returnRec) return { status: 'Pending', remarks: '', returnId: null };
        const item = returnRec.items?.find(i => i.itemId === itemId);
        return {
            status: item?.itemStatus || returnRec.status || 'Pending',
            remarks: item?.itemRemarks || '',
            returnId: returnRec._id
        };
    };

    const handleOpenUpdateModal = (purchaseQCId, itemId, itemName) => {
        const info = getReturnStatusInfo(purchaseQCId, itemId);
        if (!info.returnId) {
            toast.warning('No matching return record found for this QC batch.');
            return;
        }
        setModal({ returnId: info.returnId, itemId, itemName });
        setModalStatus(info.status);
        setModalRemarks(info.remarks);
    };

    const handleUpdateStatusSubmit = async () => {
        if (!modal) return;
        setSubmitting(true);
        try {
            const payload = { itemId: modal.itemId, status: modalStatus, remarks: modalRemarks };
            const response = await updatePurchaseReturnItemStatus(modal.returnId, payload);
            if (response.success) {
                toast.success(`Return status updated successfully!`);
                setModal(null);
                fetchData();
            } else {
                toast.error(response.message || 'Failed to update return item status');
            }
        } catch (error) {
            toast.error(error.message || 'Error updating return item status');
        } finally {
            setSubmitting(false);
        }
    };

    // Filter reports based on search (vendorName)
    const filteredReports = reports.filter(rep => {
        const matchesSearch = !search || rep.vendorName?.toLowerCase().includes(search.toLowerCase());

        if (statusFilter) {
            // Check if any failed items match this status
            const hasStatus = rep.failedItems?.some(item => {
                const info = getReturnStatusInfo(rep._id, item.itemId);
                return info.status === statusFilter;
            });
            return matchesSearch && hasStatus;
        }

        return matchesSearch;
    });

    return (
        <div className="p-2 w-full h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Icon icon="lucide:shield-alert" className="text-red-500" />
                        QC Failed Items Report
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Track and manage items that failed Quality Checks</p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#1F618D] bg-[#eaf4fb] hover:bg-[#d4eaf6] rounded-xl transition-colors"
                >
                    <Icon icon="lucide:refresh-cw" className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Status Filter Chips */}
            <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(STATUS_META).map(([status, meta]) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(prev => prev === status ? '' : status)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                            ${statusFilter === status
                                ? 'ring-2 ring-offset-1 ring-[#1F618D] border-transparent ' + meta.cls
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                    >
                        <Icon icon={meta.icon} className="text-sm" />
                        {status}
                    </button>
                ))}
                {statusFilter && (
                    <button onClick={() => setStatusFilter('')}
                        className="text-xs text-gray-400 hover:text-gray-600 px-2 underline">
                        Clear
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="mb-4">
                <div className="relative max-w-sm">
                    <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search vendor name…"
                        className="pl-9 pr-4 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white"
                    />
                </div>
            </div>

            {/* Report list */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 overflow-hidden flex flex-col">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center flex-col gap-3 text-gray-400">
                        <Icon icon="lucide:loader-2" className="animate-spin text-3xl text-erp-accent" />
                        <p className="text-sm">Loading failed QC report…</p>
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center flex-col gap-3 text-gray-400">
                        <Icon icon="lucide:inbox" className="text-4xl text-gray-300" />
                        <p className="text-sm">No failed QC records found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#eaf4fb]/50 border-b border-[#2980B9]/15">
                                    <th className="py-2.5 px-4 w-10 text-[#1F618D]"></th>
                                    <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">QC Batch ID</th>
                                    <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Vendor</th>
                                    <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">QC Date</th>
                                    <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Failed Qty</th>
                                    <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Overall Result</th>
                                    <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredReports.map(rep => {
                                    const isExpanded = expandedQcId === rep._id;
                                    return (
                                        <React.Fragment key={rep._id}>
                                            <tr
                                                className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                                                onClick={() => setExpandedQcId(isExpanded ? null : rep._id)}
                                            >
                                                <td className="px-4 py-2 text-center">
                                                    <Icon
                                                        icon="lucide:chevron-right"
                                                        className={`text-[#1F618D] text-xs transition-transform duration-200 inline-block ${isExpanded ? 'rotate-90' : ''}`}
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span className="font-mono text-xs text-gray-550 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                                        #{rep._id.slice(-8).toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 font-semibold text-xs text-gray-800">
                                                    {rep.vendorName}
                                                </td>
                                                <td className="px-4 py-2 text-[11px] text-gray-500">
                                                    {new Date(rep.qcDate || rep.createdAt).toLocaleDateString('en-IN', {
                                                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </td>
                                                <td className="px-4 py-2 font-bold text-xs text-red-650">
                                                    {rep.totalFailedQty}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${rep.overallResult === 'FAILED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                                                        }`}>
                                                        {rep.overallResult}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => navigate(`/vendor/qc/${rep._id}`)}
                                                        className="text-[10px] text-[#1F618D] hover:text-[#2980B9] font-semibold flex items-center gap-0.5 bg-[#eaf4fb] hover:bg-[#d4eaf6] px-2 py-1 rounded transition-colors"
                                                    >
                                                        QC Details
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Expanded items */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={7} className="bg-gray-50/60 border-b border-gray-100 px-8 py-4">
                                                        <div className="space-y-3">
                                                            {rep.failedItems?.map((item, idx) => {
                                                                const info = getReturnStatusInfo(rep._id, item.itemId);
                                                                const meta = getStatusMeta(info.status);
                                                                return (
                                                                    <div key={idx} className="flex items-start justify-between bg-white rounded-xl border border-gray-100 p-4 gap-4 shadow-sm">
                                                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                                                            <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                                                                                <Icon icon="lucide:package-x" className="text-red-500 text-sm" />
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <p className="text-sm font-semibold text-gray-800">{item.itemName}</p>
                                                                                <p className="text-xs text-gray-500 mt-0.5">
                                                                                    Category: {item.category} &bull; Unit: {item.unit} &bull; PO: <span className="font-mono">{item.orderNumber}</span>
                                                                                </p>
                                                                                <p className="text-xs text-gray-600 mt-1">
                                                                                    Received: <strong>{item.receivedQty}</strong> &bull; Passed: <strong>{item.passedQty}</strong> &bull; Failed: <strong className="text-red-600">{item.failedQty}</strong>
                                                                                </p>
                                                                                {item.failureReason && (
                                                                                    <p className="text-xs text-red-500 mt-1 font-medium">
                                                                                        Failure Reason: {item.failureReason}
                                                                                    </p>
                                                                                )}
                                                                                {info.remarks && (
                                                                                    <p className="text-xs text-gray-500 mt-1 italic">
                                                                                        &ldquo;{info.remarks}&rdquo;
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${meta.cls}`}>
                                                                                <Icon icon={meta.icon} className="text-sm" />
                                                                                {info.status}
                                                                            </span>
                                                                            {/* <button
                                                                                onClick={() => handleOpenUpdateModal(rep._id, item.itemId, item.itemName)}
                                                                                className="text-xs text-amber-600 hover:text-amber-800 font-medium bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                                                                            >
                                                                                <Icon icon="lucide:pencil" className="text-sm" />
                                                                                Update Return Status
                                                                            </button> */}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal for status update */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                    <Icon icon="lucide:refresh-ccw" className="text-amber-600 text-xl" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-gray-800">Update Return Item Status</h2>
                                    <p className="text-xs text-gray-500 truncate max-w-[240px]" title={modal.itemName}>
                                        {modal.itemName}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setModal(null)} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                                <Icon icon="lucide:x" className="text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">New Status</label>
                                <select value={modalStatus} onChange={e => setModalStatus(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 bg-white">
                                    <option value="Pending">Pending</option>
                                    <option value="VendorNotified">Vendor Notified</option>
                                    <option value="Replaced">Replaced</option>
                                    <option value="PartiallyReplaced">Partially Replaced</option>
                                    <option value="Closed">Closed</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Remarks</label>
                                <textarea
                                    rows={3}
                                    value={modalRemarks}
                                    onChange={e => setModalRemarks(e.target.value)}
                                    placeholder="e.g. Call vendor Sunny on 07 July, he confirmed..."
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all resize-none"
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                            <button onClick={() => setModal(null)}
                                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleUpdateStatusSubmit} disabled={submitting}
                                className="px-5 py-2.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
                                {submitting ? <Icon icon="lucide:loader-2" className="animate-spin" /> : <Icon icon="lucide:check" />}
                                {submitting ? 'Updating…' : 'Update Status'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QCFailedReport;
