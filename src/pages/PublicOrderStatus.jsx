import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import dayjs from 'dayjs';
import axios from 'axios';
import api from '../services/apiInstance';

const STATUS_STEPS = ['Draft', 'Submitted', 'Processing', 'QC', 'ReadyToDispatch', 'Dispatched', 'Delivered', 'Completed'];

const STATUS_CONFIG = {
    Draft: { label: 'Draft', color: 'bg-gray-500', badge: 'bg-gray-100 text-gray-700' },
    Submitted: { label: 'Submitted', color: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' },
    Processing: { label: 'Processing', color: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' },
    QC: { label: 'Quality Check', color: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700' },
    ReadyToDispatch: { label: 'Ready To Dispatch', color: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-700' },
    Dispatched: { label: 'Dispatched', color: 'bg-teal-500', badge: 'bg-teal-100 text-teal-700' },
    Delivered: { label: 'Delivered', color: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
    Completed: { label: 'Completed', color: 'bg-green-600', badge: 'bg-green-100 text-green-800' },
    Cancelled: { label: 'Cancelled', color: 'bg-red-500', badge: 'bg-red-100 text-red-700' },
};

export default function PublicOrderStatus() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const orderIdParam = searchParams.get('orderId') || '';

    const [searchId, setSearchId] = useState(orderIdParam);
    const [loading, setLoading] = useState(false);
    const [orderData, setOrderData] = useState(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const fetchStatus = async (queryId) => {
        if (!queryId) return;
        setLoading(true);
        setError('');
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
            const res = await axios.get(`${baseUrl}api/order/status/public?orderId=${encodeURIComponent(queryId)}`).catch(() => null);
            let rawData = res?.data?.data || res?.data;
            let data = rawData?.order || rawData;

            // Fallback to standard order public endpoint if public search wrapper isn't returned
            if (!data) {
                const fallbackRes = await axios.get(`${baseUrl}/api/order/${queryId}`).catch(() => null);
                let fallbackRaw = fallbackRes?.data?.data || fallbackRes?.data;
                data = fallbackRaw?.order || fallbackRaw;
            }

            if (data) {
                setOrderData(data);
            } else {
                setError('Order not found. Please check your order ID or reference code.');
                setOrderData(null);
            }
        } catch (err) {
            setError('Failed to fetch order status. Please verify the order number.');
            setOrderData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (orderIdParam) {
            fetchStatus(orderIdParam);
        }
    }, [orderIdParam]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchId.trim()) {
            navigate(`?orderId=${encodeURIComponent(searchId.trim())}`);
            fetchStatus(searchId.trim());
        }
    };

    const copyShareLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    const currentStatus = orderData?.status || orderData?.orders?.[0]?.status || 'Submitted';
    const normalizedStatus = Object.keys(STATUS_CONFIG).find(k => k.toLowerCase() === currentStatus?.toLowerCase()) || currentStatus;
    const currentStepIdx = STATUS_STEPS.indexOf(normalizedStatus);
    const estDate = orderData?.estimatedDeliveryDate || orderData?.orders?.[0]?.estimatedDeliveryDate;
    const trackingId = orderData?.trackingId || orderData?.orders?.[0]?.trackingId;
    const trackingLink = orderData?.trackingLink || orderData?.orders?.[0]?.trackingLink;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex flex-col justify-between p-4 md:p-8">
            <div className="max-w-4xl mx-auto w-full space-y-6">

                {/* Header Card */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#2980B9] text-white flex items-center justify-center shadow-md">
                            <Icon icon="mdi:truck-fast-outline" className="text-2xl" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-800 uppercase tracking-wider">Order Status Tracker</h1>
                            <p className="text-xs font-medium text-gray-500">Live order status and estimated delivery time</p>
                        </div>
                    </div>

                    {orderData && (
                        <button
                            onClick={copyShareLink}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-[#2980B9] border border-blue-100 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all shadow-sm self-start md:self-auto"
                        >
                            <Icon icon={copied ? "mdi:check-all" : "mdi:share-variant"} className="text-base" />
                            <span>{copied ? 'Link Copied!' : 'Share Status Link'}</span>
                        </button>
                    )}
                </div>

                {/* Search Bar */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Icon icon="mdi:magnify" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                            <input
                                type="text"
                                value={searchId}
                                onChange={(e) => setSearchId(e.target.value)}
                                placeholder="Enter Order Number or ID..."
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 outline-none focus:border-[#2980B9] focus:bg-white transition-all"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-[#2980B9] hover:bg-[#2471a3] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                            {loading ? <Icon icon="mdi:loading" className="animate-spin text-base" /> : <Icon icon="mdi:search-web" className="text-base" />}
                            <span>Track Order</span>
                        </button>
                    </form>
                </div>

                {/* Error State */}
                {error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 p-5 rounded-2xl text-xs font-bold flex items-center gap-3">
                        <Icon icon="mdi:alert-circle-outline" className="text-xl shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Order Status Display Card */}
                {orderData && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-8 animate-in fade-in duration-300">

                        {/* Order Header Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-6 border-b border-gray-100">
                            <div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Order Code</span>
                                <p className="text-lg font-black text-gray-800 font-mono">#{orderData.orders?.[0]?.orderNumber || orderData._id?.slice(-8) || '---'}</p>
                                <p className="text-xs text-gray-500 font-medium mt-0.5">{orderData.customer?.customerName || orderData.customerName || '---'}</p>
                            </div>

                            <div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Current Status</span>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${STATUS_CONFIG[normalizedStatus]?.badge || 'bg-gray-100 text-gray-700'}`}>
                                    {STATUS_CONFIG[normalizedStatus]?.label || normalizedStatus}
                                </span>
                            </div>

                            <div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Courier & Tracking</span>
                                {trackingId || trackingLink ? (
                                    <div className="space-y-1">
                                        {trackingId && (
                                            <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 inline-block">
                                                AWB: {trackingId}
                                            </span>
                                        )}
                                        {trackingLink && (
                                            <a
                                                href={trackingLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs font-bold text-[#2980B9] hover:underline flex items-center gap-1 mt-1"
                                            >
                                                <Icon icon="mdi:truck-fast-outline" className="text-sm" />
                                                <span>Track Package Online</span>
                                                <Icon icon="mdi:open-in-new" className="text-xs" />
                                            </a>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-xs text-gray-400 italic">Tracking details not assigned</span>
                                )}
                            </div>

                            <div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Estimated Delivery Time</span>
                                {estDate ? (
                                    <div className="flex items-center gap-2 text-[#2980B9]">
                                        <Icon icon="mdi:clock-outline" className="text-lg" />
                                        <div>
                                            <p className="text-sm font-black">{dayjs(estDate).format('DD MMM YYYY')}</p>
                                            <p className="text-[11px] font-bold text-gray-500">{dayjs(estDate).format('hh:mm A')}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-xs text-gray-400 italic">Not set by seller yet</span>
                                )}
                            </div>
                        </div>

                        {/* Order Journey Progress */}
                        {normalizedStatus !== 'Cancelled' ? (
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                                    <Icon icon="mdi:timeline-text-outline" className="text-base text-[#2980B9]" /> Order Fulfillment Progress
                                </h3>

                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 pt-2">
                                    {STATUS_STEPS.map((step, idx) => {
                                        const isDone = idx < currentStepIdx;
                                        const isCurrent = idx === currentStepIdx;
                                        const cfg = STATUS_CONFIG[step];

                                        return (
                                            <div
                                                key={step}
                                                className={`p-3 rounded-xl border flex flex-col justify-between min-h-[90px] transition-all ${isDone
                                                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800'
                                                    : isCurrent
                                                        ? 'bg-blue-50 border-[#2980B9] text-[#2980B9] shadow-sm ring-2 ring-blue-100'
                                                        : 'bg-gray-50/50 border-gray-200 text-gray-400'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold">Step {idx + 1}</span>
                                                    {isDone ? (
                                                        <Icon icon="mdi:check-circle" className="text-emerald-500 text-base" />
                                                    ) : isCurrent ? (
                                                        <Icon icon="mdi:clock-fast" className="text-[#2980B9] text-base animate-pulse" />
                                                    ) : (
                                                        <Icon icon="mdi:circle-outline" className="text-gray-300 text-base" />
                                                    )}
                                                </div>
                                                <p className="text-[11px] font-black uppercase tracking-wider mt-2">{cfg?.label || step}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-2">
                                <Icon icon="mdi:close-circle" className="text-4xl text-rose-500 mx-auto" />
                                <h3 className="text-sm font-black text-rose-700 uppercase tracking-widest">Order Cancelled</h3>
                                <p className="text-xs text-rose-600 font-medium">This order has been cancelled and is no longer being processed.</p>
                            </div>
                        )}

                        {/* Order Items List */}
                        {orderData.orders?.[0]?.items?.length > 0 && (
                            <div className="pt-4 border-t border-gray-100 space-y-3">
                                <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                                    <Icon icon="mdi:package-variant-closed" className="text-base text-[#2980B9]" /> Order Items ({orderData.orders[0].items.length})
                                </h4>
                                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-gray-50/50">
                                    {orderData.orders[0].items.map((item, iIdx) => (
                                        <div key={iIdx} className="p-3.5 flex items-center justify-between text-xs bg-white">
                                            <div>
                                                <p className="font-bold text-gray-800">{item.itemName}</p>
                                                <p className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">{item.category || 'N/A'} &bull; {item.orderType || 'STOCK'}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-mono font-bold text-[#2980B9] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                                                    Qty: {item.qty} {item.unit || ''}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Status Change Audit Trail */}
                        {(orderData.statusHistory || orderData.orders?.[0]?.statusHistory)?.length > 0 && (
                            <div className="pt-4 border-t border-gray-100 space-y-3">
                                <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                                    <Icon icon="mdi:history" className="text-base text-[#2980B9]" /> Status Log History
                                </h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                    {(orderData.statusHistory || orderData.orders?.[0]?.statusHistory).map((log, lIdx) => (
                                        <div key={lIdx} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs flex justify-between items-center gap-4">
                                            <div>
                                                <span className="font-bold text-gray-800">{log.to}</span>
                                                {log.remarks && <span className="text-gray-500 block text-[11px] italic mt-0.5">&ldquo;{log.remarks}&rdquo;</span>}
                                            </div>
                                            <span className="text-[10px] font-mono text-gray-400 whitespace-nowrap">
                                                {log.changedAt ? dayjs(log.changedAt).format('DD MMM YYYY, hh:mm A') : ''}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <footer className="text-center py-6 text-xs text-gray-400 font-medium">
                &copy; {new Date().getFullYear()} DigiOptics Wholesale &bull; Order Tracking System
            </footer>
        </div>
    );
}
