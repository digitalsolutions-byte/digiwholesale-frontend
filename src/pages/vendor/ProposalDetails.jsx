import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { vendorProposalService } from '../../services/vendorProposalService';
import { PATHS } from '../../routes/paths';

const QUOTATION_STATUS_BADGE = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    QUOTED: 'bg-blue-50 text-blue-700 border-blue-200',
    SELECTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200'
};

const ProposalDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [proposal, setProposal] = useState(null);
    const [loading, setLoading] = useState(true);

    // Modal state for entering quote
    const [activeQuotation, setActiveQuotation] = useState(null);
    const [quoteForm, setQuoteForm] = useState({
        price: '',
        availableQty: '',
        deliveryDays: '',
        deliveryDetails: '',
        gst: '12',
        hsnSac: '9001',
        remarks: ''
    });
    const [submittingQuote, setSubmittingQuote] = useState(false);

    // Modal state for finalize
    const [finalizeQuotation, setFinalizeQuotation] = useState(null);
    const [finalizeForm, setFinalizeForm] = useState({
        cgst: '6',
        sgst: '6'
    });
    const [finalizing, setFinalizing] = useState(false);
    const [finalizeResult, setFinalizeResult] = useState(null);

    // Modal state for cancel proposal
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelling, setCancelling] = useState(false);

    const loadProposalDetails = useCallback(async () => {
        try {
            setLoading(true);
            const data = await vendorProposalService.getProposalDetails(id);
            if (data.success || data.data || data.proposal) {
                const prop = data.data?.proposal || data.proposal || data.data;
                setProposal(prop);
            } else {
                toast.error(data.message || 'Failed to fetch proposal details');
            }
        } catch (err) {
            toast.error(err.message || 'Failed to load proposal details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadProposalDetails();
    }, [loadProposalDetails]);

    // Handle quote submit
    const handleOpenQuoteModal = (quote) => {
        setActiveQuotation(quote);
        const q = quote.quotation || quote;
        setQuoteForm({
            price: q.price !== undefined && q.price !== null ? String(q.price) : '',
            availableQty: q.availableQty !== undefined && q.availableQty !== null ? String(q.availableQty) : String(proposal?.requiredQty || ''),
            deliveryDays: q.deliveryDays !== undefined && q.deliveryDays !== null ? String(q.deliveryDays) : '7',
            deliveryDetails: q.deliveryDetails || 'Ex-warehouse',
            gst: q.gst !== undefined && q.gst !== null ? String(q.gst) : '12',
            hsnSac: q.hsnSac || '9001',
            remarks: q.remarks || ''
        });
    };

    const handleSaveQuotation = async (e) => {
        e.preventDefault();
        if (!quoteForm.price || Number(quoteForm.price) <= 0) {
            toast.error('Valid price is required');
            return;
        }

        try {
            setSubmittingQuote(true);
            const payload = {
                price: Number(quoteForm.price),
                availableQty: Number(quoteForm.availableQty) || 0,
                deliveryDays: Number(quoteForm.deliveryDays) || 0,
                deliveryDetails: quoteForm.deliveryDetails,
                gst: Number(quoteForm.gst) || 0,
                hsnSac: quoteForm.hsnSac,
                remarks: quoteForm.remarks
            };

            const data = await vendorProposalService.submitQuotation(id, activeQuotation._id, payload);
            if (data.success) {
                toast.success('Vendor quotation submitted successfully');
                setActiveQuotation(null);
                loadProposalDetails();
            } else {
                toast.error(data.message || 'Failed to submit quotation');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Error submitting quotation');
        } finally {
            setSubmittingQuote(false);
        }
    };

    // Handle Finalize & Select Vendor
    const handleFinalizeOrder = async (e) => {
        e.preventDefault();
        try {
            setFinalizing(true);
            const payload = {
                quotationId: finalizeQuotation._id,
                cgst: finalizeForm.cgst,
                sgst: finalizeForm.sgst
            };

            const data = await vendorProposalService.finalizeProposal(id, payload);
            if (data.success) {
                toast.success('Proposal finalized and PO placed successfully!');
                setFinalizeResult(data.data || data.purchaseOrder || { poNumber: data.poNumber || 'PO Created' });
                loadProposalDetails();
            } else {
                toast.error(data.message || 'Failed to finalize proposal');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Failed to finalize proposal');
        } finally {
            setFinalizing(false);
        }
    };

    // Handle Cancel Proposal
    const handleCancelProposal = async (e) => {
        e.preventDefault();
        if (!cancelReason.trim()) {
            toast.error('Cancel reason is required');
            return;
        }

        try {
            setCancelling(true);
            const data = await vendorProposalService.cancelProposal(id, { reason: cancelReason });
            if (data.success) {
                toast.success('Proposal cancelled successfully');
                setShowCancelModal(false);
                loadProposalDetails();
            } else {
                toast.error(data.message || 'Failed to cancel proposal');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Error cancelling proposal');
        } finally {
            setCancelling(false);
        }
    };

    // Handle Resend to Vendor
    const handleResendToVendor = async (quotationId) => {
        try {
            const data = await vendorProposalService.resendToVendor(id, quotationId);
            if (data.success) {
                toast.success(data.message || 'RFQ notification resent to vendor successfully');
            } else {
                toast.error(data.message || 'Failed to resend RFQ');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Failed to resend RFQ');
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Icon icon="lucide:loader-2" className="animate-spin text-3xl text-[#2980B9]" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Proposal Details</p>
                </div>
            </div>
        );
    }

    if (!proposal) {
        return (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 p-8 space-y-4">
                <Icon icon="lucide:alert-triangle" className="text-4xl text-amber-500 mx-auto" />
                <h2 className="text-lg font-bold text-gray-800">Proposal Not Found</h2>
                <button onClick={() => navigate('/vendor/proposal/list')} className="px-5 py-2 bg-[#2980B9] text-white text-xs font-bold rounded-xl">
                    Back to Proposals List
                </button>
            </div>
        );
    }

    const isEditable = proposal.status !== 'ORDERED' && proposal.status !== 'CANCELLED';

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header Strip */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/vendor/proposal/list')}
                        className="p-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 hover:text-[#2980B9] hover:bg-blue-50 transition-all"
                    >
                        <Icon icon="mdi:arrow-left" className="text-xl" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg sm:text-xl font-bold text-gray-900 uppercase font-mono">
                                #{proposal.proposalNumber || proposal._id}
                            </h1>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                proposal.status === 'ORDERED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                proposal.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                                {proposal.status}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Created Date: <span className="font-semibold text-gray-700">{dayjs(proposal.createdAt).format('DD MMM YYYY, hh:mm A')}</span>
                        </p>
                    </div>
                </div>

                {isEditable && (
                    <button
                        onClick={() => setShowCancelModal(true)}
                        className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white transition-all text-xs font-bold rounded-xl flex items-center gap-1.5 self-start sm:self-auto"
                    >
                        <Icon icon="mdi:cancel" className="text-base" />
                        Cancel Proposal
                    </button>
                )}
            </div>

            {/* Screen 4 — After Finalize Success Box */}
            {finalizeResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 sm:p-6 space-y-4 animate-fadeIn">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                            <Icon icon="mdi:check-circle" className="text-2xl" />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-emerald-900">Purchase Order Placed Successfully!</h3>
                            <p className="text-xs text-emerald-700">
                                PO Reference: <span className="font-mono font-bold">{finalizeResult.poNumber || finalizeResult._id || 'Generated'}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button
                            onClick={() => navigate(PATHS.VENDOR.PURCHASE_ITEMS)}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
                        >
                            <Icon icon="lucide:truck" className="text-base" />
                            <span>Go to Purchase Orders (Inward & QC)</span>
                        </button>
                    </div>
                </div>
            )}

            <div>
                {(() => {
                    const prod = proposal.product || proposal;
                    return (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-[#2980B9] flex items-center gap-2">
                                    <Icon icon="lucide:box" className="text-base" />
                                    Required Product Overview
                                </h2>
                                <span className="text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                                    Category: {prod.category || proposal.category || 'N/A'}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Product Name</span>
                                    <span className="font-bold text-gray-900 text-sm block">{prod.productName || proposal.productName || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Product Code</span>
                                    <span className="font-mono font-bold text-gray-700 block">{prod.productCode || proposal.productCode || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Brand & Unit</span>
                                    <span className="font-semibold text-gray-800 block">{prod.brand || proposal.brand || 'No Brand'} • {prod.unit || proposal.unit || 'PIECE'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Current Stock</span>
                                    <span className="font-bold text-purple-700 block">{prod.currentQty !== undefined ? `${prod.currentQty} Pcs` : 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Required Qty & Date</span>
                                    <span className="font-bold text-emerald-700 text-sm block">
                                        {proposal.requiredQty} Pcs • {proposal.requiredByDate ? dayjs(proposal.requiredByDate).format('DD MMM YYYY') : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            {proposal.description && (
                                <div className="pt-2 border-t border-gray-50 text-xs">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Notes / Special Instructions</span>
                                    <p className="text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">{proposal.description}</p>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* Vendor Quotations Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col space-y-2 p-5 sm:p-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#2980B9] flex items-center gap-2">
                        <Icon icon="lucide:users" className="text-base" />
                        Vendor Bids & Quotations ({proposal.vendorQuotations?.length || 0})
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs min-w-[800px]">
                        <thead>
                            <tr className="bg-[#eaf4fb]/60 border-b border-[#2980B9]/15">
                                <th className="px-4 py-3 font-bold text-[#1F618D] uppercase tracking-wider">Vendor</th>
                                <th className="px-4 py-3 font-bold text-[#1F618D] uppercase tracking-wider text-right">Price</th>
                                <th className="px-4 py-3 font-bold text-[#1F618D] uppercase tracking-wider text-center">Avail Qty</th>
                                <th className="px-4 py-3 font-bold text-[#1F618D] uppercase tracking-wider text-center">Delivery</th>
                                <th className="px-4 py-3 font-bold text-[#1F618D] uppercase tracking-wider text-center">GST %</th>
                                <th className="px-4 py-3 font-bold text-[#1F618D] uppercase tracking-wider text-center">Status</th>
                                <th className="px-4 py-3 font-bold text-[#1F618D] uppercase tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {(!proposal.vendorQuotations || proposal.vendorQuotations.length === 0) ? (
                                <tr>
                                    <td colSpan="7" className="py-8 text-center text-gray-400 font-semibold">
                                        No vendor quotations found.
                                    </td>
                                </tr>
                            ) : (
                                proposal.vendorQuotations.map((quote) => {
                                    const vName = quote.vendorName || quote.vendor?.name || quote.vendorId?.name || 'Vendor';
                                    const statusBadge = QUOTATION_STATUS_BADGE[quote.status] || 'bg-gray-100 text-gray-700';
                                    const qData = quote.quotation || quote;

                                    return (
                                        <tr key={quote._id} className="hover:bg-blue-50/20 transition-colors">
                                            <td className="px-4 py-3.5">
                                                <span className="font-bold text-gray-900 block">{vName}</span>
                                                {qData.remarks && <span className="text-[10px] text-gray-400 italic block">{qData.remarks}</span>}
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-bold text-gray-900">
                                                {qData.price !== undefined && qData.price !== null ? `₹${qData.price}` : '—'}
                                            </td>
                                            <td className="px-4 py-3.5 text-center font-semibold text-gray-800">
                                                {qData.availableQty !== undefined && qData.availableQty !== null ? qData.availableQty : '—'}
                                            </td>
                                            <td className="px-4 py-3.5 text-center text-gray-700 font-medium">
                                                {qData.deliveryDays !== undefined && qData.deliveryDays !== null ? `${qData.deliveryDays} days` : '—'}
                                            </td>
                                            <td className="px-4 py-3.5 text-center text-gray-700 font-medium">
                                                {qData.gst !== undefined && qData.gst !== null ? `${qData.gst}%` : '—'}
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusBadge}`}>
                                                    {quote.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-right space-x-2">
                                                {isEditable && (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenQuoteModal(quote)}
                                                            className="px-3 py-1 bg-[#eaf4fb] hover:bg-[#2980B9] hover:text-white text-[#1F618D] text-xs font-bold rounded-lg transition-colors"
                                                        >
                                                            {quote.status === 'QUOTED' ? 'Edit Quote' : 'Enter Quote'}
                                                        </button>

                                                        {quote.status === 'QUOTED' && (
                                                            <button
                                                                onClick={() => setFinalizeQuotation(quote)}
                                                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                                                            >
                                                                Select
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => handleResendToVendor(quote._id)}
                                                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors inline-flex items-center"
                                                            title="Resend RFQ Notification"
                                                        >
                                                            <Icon icon="mdi:send" className="text-sm" />
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Enter Quote Modal */}
            {activeQuotation && (
                <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#2980B9] text-white">
                            <h3 className="text-sm font-bold">
                                Enter Vendor Quotation ({activeQuotation.vendorName || 'Vendor'})
                            </h3>
                            <button onClick={() => setActiveQuotation(null)} className="text-white/80 hover:text-white">
                                <Icon icon="mdi:close" className="text-xl" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveQuotation} className="p-6 space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="font-bold text-gray-700 block mb-1">Unit Price (₹) <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="e.g. 850"
                                        value={quoteForm.price}
                                        onChange={e => setQuoteForm(p => ({ ...p, price: e.target.value }))}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#2980B9]"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="font-bold text-gray-700 block mb-1">Available Qty</label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 100"
                                        value={quoteForm.availableQty}
                                        onChange={e => setQuoteForm(p => ({ ...p, availableQty: e.target.value }))}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#2980B9]"
                                    />
                                </div>

                                <div>
                                    <label className="font-bold text-gray-700 block mb-1">Delivery Days</label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 7"
                                        value={quoteForm.deliveryDays}
                                        onChange={e => setQuoteForm(p => ({ ...p, deliveryDays: e.target.value }))}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#2980B9]"
                                    />
                                </div>

                                <div>
                                    <label className="font-bold text-gray-700 block mb-1">GST %</label>
                                    <input
                                        type="number"
                                        placeholder="12"
                                        value={quoteForm.gst}
                                        onChange={e => setQuoteForm(p => ({ ...p, gst: e.target.value }))}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#2980B9]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-bold text-gray-700 block mb-1">Delivery Details</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Ex-Delhi warehouse"
                                    value={quoteForm.deliveryDetails}
                                    onChange={e => setQuoteForm(p => ({ ...p, deliveryDetails: e.target.value }))}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-[#2980B9]"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-gray-700 block mb-1">Vendor Remarks</label>
                                <textarea
                                    rows={2}
                                    placeholder="e.g. Minimum order 10 pieces"
                                    value={quoteForm.remarks}
                                    onChange={e => setQuoteForm(p => ({ ...p, remarks: e.target.value }))}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-[#2980B9] resize-none"
                                />
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setActiveQuotation(null)} className="px-4 py-2 text-gray-500 font-bold">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingQuote}
                                    className="px-6 py-2 bg-[#2980B9] text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                                >
                                    {submittingQuote ? 'Saving...' : 'Save Quote'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Finalize Vendor Modal */}
            {finalizeQuotation && (
                <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-emerald-600 text-white">
                            <h3 className="text-sm font-bold">
                                Finalize & Create Purchase Order
                            </h3>
                            <button onClick={() => setFinalizeQuotation(null)} className="text-white/80 hover:text-white">
                                <Icon icon="mdi:close" className="text-xl" />
                            </button>
                        </div>

                        <form onSubmit={handleFinalizeOrder} className="p-6 space-y-4 text-xs">
                            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 space-y-1">
                                <span className="text-[10px] font-bold uppercase text-emerald-700 block">Selected Vendor</span>
                                <p className="font-bold text-gray-900 text-sm">{finalizeQuotation.vendorName}</p>
                                <p className="text-xs text-gray-600 font-semibold">Quote: ₹{finalizeQuotation.price} • {finalizeQuotation.availableQty} Pcs available</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="font-bold text-gray-700 block mb-1">CGST Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={finalizeForm.cgst}
                                        onChange={e => setFinalizeForm(p => ({ ...p, cgst: e.target.value }))}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-gray-700 block mb-1">SGST Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={finalizeForm.sgst}
                                        onChange={e => setFinalizeForm(p => ({ ...p, sgst: e.target.value }))}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none"
                                    />
                                </div>
                            </div>

                            <p className="text-[10px] text-gray-400 leading-relaxed font-semibold">
                                Note: Finalizing will automatically dispatch PO Email + WhatsApp with PO Excel to {finalizeQuotation.vendorName}, mark all other vendor quotations as REJECTED, and set Proposal status to ORDERED.
                            </p>

                            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setFinalizeQuotation(null)} className="px-4 py-2 text-gray-500 font-bold">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={finalizing}
                                    className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                                >
                                    {finalizing ? 'Placing PO...' : 'Finalize & Issue PO'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Cancel Proposal Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-rose-600 text-white">
                            <h3 className="text-sm font-bold">Cancel Proposal</h3>
                            <button onClick={() => setShowCancelModal(false)} className="text-white/80 hover:text-white">
                                <Icon icon="mdi:close" className="text-xl" />
                            </button>
                        </div>

                        <form onSubmit={handleCancelProposal} className="p-6 space-y-4 text-xs">
                            <div>
                                <label className="font-bold text-gray-700 block mb-1">Reason for Cancellation <span className="text-red-500">*</span></label>
                                <textarea
                                    rows={3}
                                    placeholder="e.g. Procured from existing stock"
                                    value={cancelReason}
                                    onChange={e => setCancelReason(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-rose-500 resize-none"
                                    required
                                />
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowCancelModal(false)} className="px-4 py-2 text-gray-500 font-bold">
                                    Close
                                </button>
                                <button
                                    type="submit"
                                    disabled={cancelling}
                                    className="px-6 py-2 bg-rose-600 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                                >
                                    {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProposalDetails;
