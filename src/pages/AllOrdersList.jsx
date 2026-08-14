import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { getAllOrders, getOrderProductConfigs, cancelOrder, draftOrder, deleteOrder, updateBulkOrderStatus, updateOrderTracking } from '../services/orderService';
import { getAllCustomers } from '../services/customerService';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice';
import { toast } from 'react-toastify';
import { PATHS } from '../routes/paths';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import SearchableSelect from '../components/ui/SearchableSelect';
import api from '../services/apiInstance';
import usePermissions from '../hooks/usePermissions';

const ALLOWED_TRANSITIONS = {
    Draft: ['Submitted', 'Cancelled'],
    Submitted: ['Processing', 'Cancelled'],
    Processing: ['QC', 'Cancelled'],
    QC: ['ReadyToDispatch', 'Cancelled'],
    ReadyToDispatch: ['Dispatched', 'Cancelled'],
    Dispatched: ['Delivered', 'Cancelled'],
    Delivered: ['Completed'],
    Completed: [],
    Cancelled: [],
};

const STATUS_CONFIG = {
    Draft: { label: 'Draft', color: '#6b7280', badge: 'bg-gray-100 text-gray-600 border-gray-200' },
    Submitted: { label: 'Submitted', color: '#3b82f6', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
    Processing: { label: 'Processing', color: '#f59e0b', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
    QC: { label: 'Quality Check', color: '#8b5cf6', badge: 'bg-purple-100 text-purple-700 border-purple-200' },
    ReadyToDispatch: { label: 'Ready to Dispatch', color: '#06b6d4', badge: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
    Dispatched: { label: 'Dispatched', color: '#6366f1', badge: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    Delivered: { label: 'Delivered', color: '#10b981', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    Completed: { label: 'Completed', color: '#059669', badge: 'bg-green-100 text-green-700 border-green-200' },
    Cancelled: { label: 'Cancelled', color: '#ef4444', badge: 'bg-red-100 text-red-700 border-red-200' },
};

const TRANSITION_BTN = {
    Submitted: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
    Processing: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200',
    QC: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200',
    ReadyToDispatch: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border-cyan-200',
    Dispatched: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200',
    Delivered: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200',
    Completed: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200',
    Cancelled: 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200',
};

const datePickerStyles = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '9999px',
        backgroundColor: 'rgba(249, 250, 251, 0.8)',
        fontSize: '0.75rem',
        fontWeight: 700,
        height: '42px',
        '& fieldset': {
            borderColor: '#f3f4f6',
        },
        '&:hover fieldset': {
            borderColor: '#f59e0b80',
        },
        '&.Mui-focused fieldset': {
            borderColor: '#f59e0b80',
        },
    },
    '& .MuiInputBase-input': {
        padding: '0 16px',
        color: '#4b5563',
        '&::placeholder': {
            opacity: 1,
            color: '#d1d5db',
        }
    },
    '& .MuiInputAdornment-root': {
        marginRight: '8px'
    }
};

const ALL_STEPS = ['Draft', 'Submitted', 'Processing', 'QC', 'ReadyToDispatch', 'Dispatched', 'Delivered', 'Completed'];

function StatusJourneyModal({ order, currentStatus, onClose, onTransition, loading }) {
    const normalised = Object.keys(STATUS_CONFIG).find(k => k.toLowerCase() === currentStatus?.toLowerCase()) || currentStatus;
    const transitions = ALLOWED_TRANSITIONS[normalised] || [];
    const currentIdx = ALL_STEPS.indexOf(normalised);
    const [remarks, setRemarks] = useState('');
    const [trackingId, setTrackingId] = useState(order?.trackingId || order?.orders?.[0]?.trackingId || '');
    const [trackingLink, setTrackingLink] = useState(order?.trackingLink || order?.orders?.[0]?.trackingLink || '');

    // Extract statusHistory from order or first subOrder
    const statusHistory = order?.statusHistory || order?.orders?.[0]?.statusHistory || [];

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
            <div
                className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-100"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="p-4 sm:p-6 pb-4 flex items-center gap-3 sm:gap-4 border-b border-slate-100 flex-shrink-0 bg-white">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 text-blue-600">
                        <Icon icon="mdi:swap-horizontal" className="text-xl sm:text-2xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base sm:text-xl font-bold text-slate-800 tracking-tight">Change Status</h2>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5 truncate">
                            {order?.customer?.customerName || 'Customer'} &bull; #{order?.orders?.[0]?.orderNumber || order?._id}
                        </p>
                        {(() => {
                            const est = order?.estimatedDeliveryDate || order?.orders?.[0]?.estimatedDeliveryDate;
                            return est ? (
                                <p className="text-[11px] font-semibold text-[#2980B9] mt-0.5">
                                    Est. Delivery: {dayjs(est).format('DD MMM YYYY, hh:mm A')}
                                </p>
                            ) : null;
                        })()}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={() => {
                                const shareUrl = `${window.location.origin}/orders/status?orderId=${order._id || order.orders?.[0]?.orderNumber}`;
                                navigator.clipboard.writeText(shareUrl);
                                toast.success("Public status link copied to clipboard!");
                            }}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-[#2980B9] border border-blue-100 hover:bg-blue-100 rounded-xl text-xs font-semibold transition-all"
                            title="Copy Public Tracking Link"
                        >
                            <Icon icon="mdi:share-variant-outline" className="text-base" /> Share Link
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600">
                            <Icon icon="mdi:close" className="text-xl" />
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex flex-col md:flex-row overflow-hidden flex-1">
                    {/* Order Journey - Horizontal Stepper on Mobile, Vertical Sidebar on Desktop */}
                    <div className="w-full md:w-48 flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-100 p-3 sm:p-4 md:p-6 overflow-x-auto md:overflow-y-auto bg-slate-50/50 md:bg-transparent">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 md:mb-4">Order Journey</p>
                        
                        {/* Mobile Stepper (Horizontal) */}
                        <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                            {ALL_STEPS.map((step, idx) => {
                                const cfg = STATUS_CONFIG[step];
                                const isDone = idx < currentIdx;
                                const isCurrent = idx === currentIdx;
                                return (
                                    <div
                                        key={step}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap border flex-shrink-0 ${
                                            isDone
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : isCurrent
                                                ? 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-100'
                                                : 'bg-white text-slate-400 border-slate-200'
                                        }`}
                                    >
                                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                            isDone ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'
                                        }`}>
                                            {isDone ? '✓' : idx + 1}
                                        </span>
                                        <span>{cfg.label}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop Vertical Stepper */}
                        <div className="hidden md:flex flex-col gap-0">
                            {ALL_STEPS.map((step, idx) => {
                                const cfg = STATUS_CONFIG[step];
                                const isDone = idx < currentIdx;
                                const isCurrent = idx === currentIdx;
                                return (
                                    <div key={step} className="flex items-start gap-3">
                                        <div className="flex flex-col items-center flex-shrink-0">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${isDone ? 'bg-emerald-500 border-emerald-500' :
                                                isCurrent ? 'bg-white border-blue-500 ring-2 ring-blue-100' :
                                                    'bg-white border-slate-200'
                                                }`}>
                                                {isDone
                                                    ? <Icon icon="mdi:check" className="text-white text-[10px]" />
                                                    : isCurrent
                                                        ? <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                        : <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                                }
                                            </div>
                                            {idx < ALL_STEPS.length - 1 && (
                                                <div className={`w-0.5 h-6 ${idx < currentIdx ? 'bg-emerald-300' : 'bg-slate-100'}`} />
                                            )}
                                        </div>
                                        <div className="pb-4">
                                            <span className={`text-[11px] font-semibold tracking-tight leading-tight ${isDone ? 'text-emerald-700' :
                                                isCurrent ? 'text-blue-600 font-bold' :
                                                    'text-slate-400'
                                                }`}>
                                                {cfg.label}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Actions & Remarks */}
                    <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 w-full min-w-0">
                        {/* Courier Tracking Details */}
                        <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-3.5 space-y-2.5">
                            <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Icon icon="mdi:truck-fast-outline" className="text-sm text-purple-600" />
                                Courier & Tracking Details
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <input
                                    type="text"
                                    value={trackingId}
                                    onChange={e => setTrackingId(e.target.value)}
                                    placeholder="Tracking ID / AWB Number..."
                                    className="w-full px-3 py-2 rounded-xl border border-purple-200 text-xs font-mono font-bold text-purple-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
                                />
                                <input
                                    type="url"
                                    value={trackingLink}
                                    onChange={e => setTrackingLink(e.target.value)}
                                    placeholder="Tracking URL / Link..."
                                    className="w-full px-3 py-2 rounded-xl border border-purple-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
                                />
                            </div>
                        </div>

                        {/* Status Change Remarks Input */}
                        {transitions.length > 0 && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    Status Change Remarks / Notes (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={remarks}
                                    onChange={e => setRemarks(e.target.value)}
                                    placeholder="e.g. Order ReadyToDispatch by production team..."
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9] transition-all bg-slate-50/50"
                                />
                            </div>
                        )}

                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 sm:mb-3">
                                {transitions.length > 0 ? 'Available Actions' : 'No Actions Available'}
                            </p>
                            <div className="flex flex-col gap-2.5 sm:gap-3">
                                {transitions.length > 0 ? (
                                    transitions.map(next => {
                                        const cfg = STATUS_CONFIG[next];
                                        const isCancel = next === 'Cancelled';
                                        return (
                                            <button
                                                key={next}
                                                onClick={() => onTransition(order._id, next, order?.orders?.[0]?.orderNumber, remarks, { trackingId, trackingLink })}
                                                disabled={!!loading}
                                                className={`w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all disabled:opacity-50 text-left ${isCancel
                                                    ? 'bg-red-50/70 text-red-700 border-red-200 hover:bg-red-100'
                                                    : TRANSITION_BTN[next] || 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.badge}`}>
                                                        <Icon icon={isCancel ? 'mdi:close-circle-outline' : 'mdi:arrow-right-circle-outline'} className="text-base sm:text-lg" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs sm:text-sm font-bold tracking-tight">{cfg.label}</p>
                                                        <p className="text-[10px] sm:text-xs font-medium opacity-70 truncate mt-0.5">
                                                            {isCancel ? 'Stop and cancel this order' : 'Move order to this stage'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {loading === next
                                                    ? <Icon icon="mdi:loading" className="animate-spin text-lg sm:text-xl flex-shrink-0 ml-2" />
                                                    : <Icon icon="mdi:chevron-right" className="text-lg sm:text-xl opacity-40 flex-shrink-0 ml-2" />
                                                }
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-6 text-center">
                                        <Icon
                                            icon={normalised === 'Cancelled' ? 'mdi:close-circle' : 'mdi:check-circle'}
                                            className={`text-4xl sm:text-5xl mb-2 ${normalised === 'Cancelled' ? 'text-red-400' : 'text-emerald-400'}`}
                                        />
                                        <p className="text-xs sm:text-sm font-bold text-slate-700">
                                            {normalised === 'Cancelled' ? 'Order Cancelled' : 'Order Completed'}
                                        </p>
                                        <p className="text-xs text-slate-400 font-medium mt-0.5">No further actions available</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status History Audit Trail inside Modal */}
                        {statusHistory && statusHistory.length > 0 && (
                            <div className="border-t border-slate-100 pt-4 mt-2">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                    <Icon icon="mdi:history" className="text-[#2980B9] text-sm" />
                                    Status Change Audit Logs
                                </p>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                    {statusHistory.map((h, hIdx) => (
                                        <div key={hIdx} className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-100 text-xs flex flex-col gap-1">
                                            <div className="flex justify-between items-center flex-wrap gap-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-slate-800">{h.changedByName || h.changedBy || 'System User'}</span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
                                                        {h.from || 'Started'} &rarr; {h.to}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                    {h.changedAt ? dayjs(h.changedAt).format('DD MMM, hh:mm A') : ''}
                                                </span>
                                            </div>
                                            {h.remarks && (
                                                <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded-lg border border-slate-100 mt-0.5">
                                                    &ldquo;{h.remarks}&rdquo;
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end px-4 sm:px-6 py-3.5 border-t border-slate-100 flex-shrink-0 bg-slate-50/50">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-100 transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}


const AllOrdersList = ({ isPendingOnly = false, defaultStatus = '' }) => {
    const navigate = useNavigate();
    const currentUser = useSelector(selectCurrentUser);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [configs, setConfigs] = useState({ brands: [], categories: [] });
    const [customers, setCustomers] = useState([]);
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [activeActionMenu, setActiveActionMenu] = useState(null);

    // Per-order challan download loading state — keyed by order._id
    const [challanLoading, setChallanLoading] = useState({});

    // Per-order invoice download loading state — keyed by order._id
    const [invoiceLoading, setInvoiceLoading] = useState({});

    const downloadChallan = async (orderId) => {
        setChallanLoading(prev => ({ ...prev, [orderId]: true }));
        try {
            const response = await api.get(`/api/order/bulk-orders/${orderId}/challan`, {
                responseType: 'blob',
            });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `challan-${orderId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setActiveActionMenu(null);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to download challan. Please try again.');
        } finally {
            setChallanLoading(prev => ({ ...prev, [orderId]: false }));
        }
    };

    const downloadInvoice = async (orderId, orderNumber) => {
        setInvoiceLoading(prev => ({ ...prev, [orderId]: true }));
        try {
            const response = await api.get(`/api/order/bulk-orders/${orderId}/invoice`, {
                responseType: 'blob',
            });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice-${orderNumber || orderId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setActiveActionMenu(null);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to download invoice. Please try again.');
        } finally {
            setInvoiceLoading(prev => ({ ...prev, [orderId]: false }));
        }
    };

    // Modal States
    const [actionModal, setActionModal] = useState({
        isOpen: false,
        type: '', // 'cancel' or 'delete'
        id: null,
        loading: false
    });
    const [cancelReason, setCancelReason] = useState('');

    // Status update state
    const [statusUpdate, setStatusUpdate] = useState({ loading: {} });
    const [cancelConfirm, setCancelConfirm] = useState({ isOpen: false, orderId: null, orderNumber: null, loading: false });
    const [statusPopup, setStatusPopup] = useState({ isOpen: false, order: null, currentStatus: '' });

    const { hasPermission } = usePermissions();
    const canUpdateStatus = hasPermission('UPDATE_ORDER');

    const handleStatusTransition = async (orderId, newStatus, orderNumber = null, remarks = '', trackingData = null) => {
        if (newStatus === 'Cancelled') {
            setCancelConfirm({ isOpen: true, orderId, orderNumber, remarks, loading: false });
            return;
        }
        setStatusUpdate(prev => ({ loading: { ...prev.loading, [orderId]: newStatus } }));
        try {
            // Save tracking info if supplied
            if (trackingData && (trackingData.trackingId || trackingData.trackingLink)) {
                await updateOrderTracking(orderId, {
                    trackingId: trackingData.trackingId,
                    trackingLink: trackingData.trackingLink
                }).catch(err => console.warn('Failed to patch tracking details:', err));
            }

            const res = await updateBulkOrderStatus(orderId, newStatus, orderNumber, remarks);
            if (res.success) {
                toast.success(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
                setStatusPopup({ isOpen: false, order: null, currentStatus: '' });
                fetchOrders(pagination.currentPage);
            }
        } catch (err) {
            toast.error(err?.error?.message || err?.message || 'Failed to update status');
        } finally {
            setStatusUpdate(prev => ({ loading: { ...prev.loading, [orderId]: null } }));
        }
    };

    const handleConfirmCancel = async () => {
        const { orderId, orderNumber } = cancelConfirm;
        setCancelConfirm(prev => ({ ...prev, loading: true }));
        try {
            const res = await updateBulkOrderStatus(orderId, 'Cancelled', orderNumber);
            if (res.success) {
                toast.success('Order cancelled');
                setCancelConfirm({ isOpen: false, orderId: null, orderNumber: null, loading: false });
                setStatusPopup({ isOpen: false, order: null, currentStatus: '' });
                fetchOrders(pagination.currentPage);
            }
        } catch (err) {
            toast.error(err?.error?.message || err?.message || 'Failed to cancel order');
            setCancelConfirm(prev => ({ ...prev, loading: false }));
        }
    };

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        search: '',
        status: defaultStatus,
        customerId: '',
        orderType: '',
        fromDate: '',
        toDate: ''
    });

    const fetchConfigs = async () => {
        try {
            const [orderConfigs, customerData] = await Promise.all([
                getOrderProductConfigs(),
                getAllCustomers(1, 1000)
            ]);
            setConfigs(orderConfigs);
            setCustomers(customerData?.data?.customers || []);
        } catch (error) {
            console.error('Error fetching configs:', error);
        }
    };

    const fetchOrders = async (page = 1, currentFilters = filters) => {
        setLoading(true);
        try {
            const activeFilters = Object.fromEntries(
                Object.entries(currentFilters).filter(([_, v]) => v !== '')
            );

            let response;
            if (activeFilters.status === 'Draft') {
                import('../services/orderService').then(({ getDraftOrders }) => {
                    // handled dynamically to avoid import circular issues or messy top-level replace
                });
                const { getDraftOrders } = await import('../services/orderService');
                response = await getDraftOrders(page, 10, activeFilters.search || '');
            } else {
                response = await getAllOrders(page, 10, activeFilters);
            }

            if (response.success) {
                setOrders(response.data.orders || []);
                const paginationData = response.data.pagination || {};
                setPagination({
                    currentPage: Number(paginationData.currentPage || paginationData.page || 1),
                    totalPages: Number(paginationData.totalPages || paginationData.pages || 1)
                });
            } else {
                toast.error(response.message || response.error?.message || 'Failed to fetch orders');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error(error?.response?.data?.message || error?.message || 'Error fetching orders');
        } finally {
            setLoading(false);
        }
    };

    const isFirstRun = useRef(true);

    useEffect(() => {
        fetchConfigs();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            // Only update filters if search term actually changed
            if (searchTerm !== filters.search) {
                setFilters(prev => ({ ...prev, search: searchTerm }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        // Simple fetch - if filters changes, it fetches.
        // We let the first one run on mount.
        fetchOrders(1, filters);
    }, [filters]);

    const toggleRow = (id) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) newExpanded.delete(id);
        else newExpanded.add(id);
        setExpandedRows(newExpanded);
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setFilters({
            search: '',
            status: defaultStatus,
            customerId: '',
            orderType: '',
            fromDate: '',
            toDate: ''
        });
    };

    const handleCancelOrder = async (id, reason) => {
        setActionModal(prev => ({ ...prev, loading: true }));
        try {
            const response = await cancelOrder(id, { reason });
            if (response.success) {
                toast.success('Order cancelled successfully');
                handleCloseModal();
                fetchOrders(pagination.currentPage);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to cancel order');
        } finally {
            setActionModal(prev => ({ ...prev, loading: false }));
        }
    };

    const handleDraftOrder = async (id) => {
        try {
            const response = await draftOrder(id);
            if (response.success) {
                toast.success('Order moved to draft');
                fetchOrders(pagination.currentPage);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to move order to draft');
        }
    };

    const handleDeleteOrder = async (id) => {
        setActionModal(prev => ({ ...prev, loading: true }));
        try {
            const response = await deleteOrder(id);
            if (response.success) {
                toast.success('Order deleted successfully');
                handleCloseModal();
                fetchOrders(pagination.currentPage);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to delete order');
        } finally {
            setActionModal(prev => ({ ...prev, loading: false }));
        }
    };

    const handleConfirmAction = () => {
        if (actionModal.type === 'cancel') {
            if (!cancelReason.trim()) {
                toast.warn('Please provide a reason for cancellation');
                return;
            }
            handleCancelOrder(actionModal.id, cancelReason);
        } else if (actionModal.type === 'delete') {
            handleDeleteOrder(actionModal.id);
        }
    };

    const handleCloseModal = () => {
        setActionModal({ isOpen: false, type: '', id: null, loading: false });
        setCancelReason('');
    };

    const getStatusBadge = (status) => {
        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG[Object.keys(STATUS_CONFIG).find(k => k.toLowerCase() === status?.toLowerCase())];
        const cls = cfg?.badge || 'bg-gray-100 text-gray-700 border-gray-200';
        return `px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${cls}`;
    };

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
            <div className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-gray-100/80 flex flex-col gap-4 md:gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-wrap items-end gap-3 md:gap-6">
                    <div className="flex flex-col gap-1.5 col-span-1 md:col-span-2 lg:min-w-[300px] lg:flex-1">
                        <span className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] ml-2 md:ml-5">Search By Order ID, Shop Name, or Customer</span>
                        <div className="relative group">
                            <Icon icon="mdi:magnify" className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 text-lg group-hover:text-erp-accent transition-colors" />
                            <input
                                placeholder="Order #65432..."
                                className="w-full pl-14 pr-6 py-2.5 rounded-full bg-gray-50/80 border border-gray-100/50 text-[11px] font-black uppercase tracking-widest text-gray-700 focus:bg-white focus:ring-4 focus:ring-amber-50 focus:border-erp-accent/10 transition-all outline-none placeholder:text-gray-300"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {!isPendingOnly && (
                        <div className="flex flex-col gap-1.5 w-full lg:w-auto lg:min-w-[180px]">
                            <span className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] ml-2 md:ml-5">Status</span>
                            <div className="relative">
                                <Icon icon="mdi:checkbox-blank-circle-outline" className="fixed-icon absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                                <select
                                    className="w-full pl-14 pr-10 py-2.5 rounded-full bg-gray-50/80 border border-gray-100/50 text-[11px] font-black uppercase tracking-widest text-gray-700 appearance-none focus:bg-white focus:ring-4 focus:ring-amber-50 transition-all outline-none"
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="Draft">Draft</option>
                                    <option value="Submitted">Submitted</option>
                                    <option value="Processing">Processing</option>
                                    <option value="QC">QC</option>
                                    <option value="ReadyToDispatch">Ready to Dispatch</option>
                                    <option value="Dispatched">Dispatched</option>
                                    <option value="Delivered">Delivered</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5 w-full lg:w-auto lg:min-w-[250px]">
                        <span className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] ml-2 md:ml-5">Customer</span>
                        <SearchableSelect
                            name="customerId"
                            value={filters.customerId}
                            onChange={(e) => setFilters({ ...filters, customerId: e.target.value })}
                            options={customers.map(c => ({ value: c._id, label: `${c.shopName} (${c.customerCode || 'No Code'})` }))}
                            placeholder="All Customers"
                            containerClassName="!bg-transparent"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '9999px',
                                    height: '42px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    backgroundColor: 'rgba(249, 250, 251, 0.8)',
                                    '& fieldset': { borderColor: '#f3f4f6' },
                                }
                            }}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5 col-span-1 md:col-span-2 lg:min-w-[380px]">
                        <span className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] ml-2 md:ml-5">Registration Period</span>
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <DatePicker
                                value={filters.fromDate ? dayjs(filters.fromDate) : null}
                                onChange={(newValue) => setFilters({ ...filters, fromDate: newValue ? newValue.format('YYYY-MM-DD') : '' })}
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        placeholder: 'From Date',
                                        sx: { ...datePickerStyles, width: '100%' }
                                    }
                                }}
                            />
                            <span className="text-gray-300 text-[10px] font-black uppercase">to</span>
                            <DatePicker
                                value={filters.toDate ? dayjs(filters.toDate) : null}
                                onChange={(newValue) => setFilters({ ...filters, toDate: newValue ? newValue.format('YYYY-MM-DD') : '' })}
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        placeholder: 'To Date',
                                        sx: { ...datePickerStyles, width: '100%' }
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
                <div className="flex items-end self-end w-full md:w-auto mb-1">
                    <button
                        onClick={handleResetFilters}
                        className="flex items-center justify-center gap-2 text-gray-400 hover:text-erp-accent/80 px-5 py-2.5 rounded-full hover:bg-erp-accent/5 transition-all duration-300 font-black text-[10px] uppercase tracking-widest group border border-transparent hover:border-erp-accent/10 shadow-sm hover:shadow-md w-full md:w-auto"
                    >
                        <Icon icon="mdi:refresh" className="text-lg group-hover:rotate-180 transition-transform duration-700" />
                        Clear Filters
                    </button>
                </div>
            </div>

            <div className="w-full bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100 min-h-[500px]">
                {loading ? (
                    <div className="flex justify-center items-center h-[500px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-erp-accent"></div>
                    </div>
                ) : (
                    <>
                        {/* ── Mobile Card View (block md:hidden) ── */}
                        <div className="block md:hidden space-y-3 p-3 bg-gray-50/50">
                            {orders.map((order) => {
                                const isExpanded = expandedRows.has(order._id);
                                const totalOrders = order.orders?.length || 0;
                                let totalItemsQty = 0;
                                let grandTotal = 0;
                                let orderStatus = 'PENDING';

                                if (totalOrders > 0) {
                                    orderStatus = order.orders[0]?.status || 'PENDING';
                                    order.orders.forEach(bo => {
                                        let boTotal = Number(bo.totalOrderPrice) || Number(bo.orderTotal) || Number(bo.totalAmount) || Number(bo.netPayableTotal) || 0;
                                        if (!boTotal && bo.items) {
                                            bo.items.forEach(item => {
                                                const price = Number(item.price) || 0;
                                                const qty = Number(item.qty) || 1;
                                                const gst = Number(item.gst) || 0;
                                                const disc = Number(item.discountAmount) || 0;
                                                const taxable = (price * qty) - disc;
                                                const gstAmt = taxable > 0 ? taxable * (gst / 100) : 0;
                                                boTotal += taxable > 0 ? taxable + gstAmt : 0;
                                            });
                                        }
                                        grandTotal += boTotal;

                                        if (bo.items) {
                                            bo.items.forEach(item => {
                                                totalItemsQty += (Number(item.qty) || 0);
                                            });
                                        }
                                    });
                                }

                                const statusCfg = STATUS_CONFIG[orderStatus] || STATUS_CONFIG[Object.keys(STATUS_CONFIG).find(k => k.toLowerCase() === orderStatus?.toLowerCase())] || { label: orderStatus, badge: 'bg-gray-100 text-gray-700 border-gray-200', icon: 'mdi:clock-outline' };

                                return (
                                    <div key={order._id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-erp-accent font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">
                                                        #{order.orders?.[0]?.orderNumber || order?._id?.slice(-6) || '---'}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${statusCfg.badge}`}>
                                                        <Icon icon={statusCfg.icon || 'mdi:circle'} className="text-xs" />
                                                        {statusCfg.label || orderStatus}
                                                    </span>
                                                </div>
                                                <h3 className="text-sm font-black text-gray-800 tracking-tight mt-1 truncate">{order?.customer?.customerName || '---'}</h3>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase truncate">{order?.customer?.customerShipToBranchName || '---'}</p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    if (activeActionMenu?.id === order._id) {
                                                        setActiveActionMenu(null);
                                                    } else {
                                                        setActiveActionMenu({
                                                            id: order._id,
                                                            top: rect.bottom + window.scrollY,
                                                            left: rect.right,
                                                            order,
                                                            orderStatus,
                                                            canUpdateStatus
                                                        });
                                                    }
                                                }}
                                                className={`p-1.5 rounded-lg transition-colors ${activeActionMenu?.id === order._id ? 'bg-erp-accent text-white' : 'text-gray-400 hover:text-erp-accent hover:bg-erp-accent/10'}`}
                                            >
                                                <Icon icon="mdi:dots-vertical" className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {(() => {
                                            const summary = order.summary || {};
                                            const advanceVal = Number(summary.advanceAmount ?? order.advanceAmount ?? 0);
                                            const shippingVal = Number(summary.shippingCharges ?? order.shippingCharges ?? 0);
                                            const otherVal = Number(summary.otherCharges ?? order.otherCharges ?? 0);
                                            const nowPayableVal = summary.nowPayable !== undefined ? Number(summary.nowPayable) : Math.max(0, grandTotal + shippingVal + otherVal - advanceVal);

                                            return (
                                                <div className="space-y-2 py-2 border-y border-gray-100 text-[11px]">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <span className="text-[9px] uppercase font-bold text-gray-400 block">Date & Time</span>
                                                            <span className="font-semibold text-gray-700">{dayjs(order?.createdAt).format('DD MMM YYYY, hh:mm A')}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[9px] uppercase font-bold text-gray-400 block">Total Qty</span>
                                                            <span className="font-semibold text-gray-700">{totalItemsQty} Pcs</span>
                                                        </div>
                                                        {(order.trackingId || order.orders?.[0]?.trackingId) && (
                                                            <div className="col-span-2 pt-1 border-t border-gray-50 flex items-center justify-between text-[10px]">
                                                                <span className="font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1">
                                                                    <Icon icon="mdi:truck-fast-outline" className="text-xs" />
                                                                    AWB: {order.trackingId || order.orders?.[0]?.trackingId}
                                                                </span>
                                                                {(order.trackingLink || order.orders?.[0]?.trackingLink) && (
                                                                    <a
                                                                        href={order.trackingLink || order.orders?.[0]?.trackingLink}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        onClick={e => e.stopPropagation()}
                                                                        className="text-[#2980B9] font-bold underline flex items-center gap-0.5"
                                                                    >
                                                                        Track <Icon icon="mdi:open-in-new" className="text-[10px]" />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <span className="text-[9px] uppercase font-bold text-gray-400 block">Sub Orders</span>
                                                            <span className="font-semibold text-gray-700">{totalOrders}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[9px] uppercase font-bold text-gray-400 block">Grand Total</span>
                                                            <span className="font-bold text-gray-800">₹{(summary.grandTotal ?? grandTotal).toFixed(2)}</span>
                                                        </div>
                                                    </div>

                                                    {(advanceVal > 0 || shippingVal > 0 || otherVal > 0 || nowPayableVal !== undefined) && (
                                                        <div className="pt-2 border-t border-dashed border-gray-200 grid grid-cols-2 gap-2 bg-slate-50/70 p-2 rounded-lg text-[10px]">
                                                            <div>
                                                                <span className="text-[9px] uppercase font-bold text-gray-400 block">Advance</span>
                                                                <span className="font-bold text-emerald-600">₹{advanceVal.toFixed(2)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[9px] uppercase font-bold text-gray-400 block">Shipping / Other</span>
                                                                <span className="font-semibold text-gray-700">₹{shippingVal} / ₹{otherVal}</span>
                                                            </div>
                                                            <div className="col-span-2 flex justify-between items-center pt-1 border-t border-gray-200/60 font-bold">
                                                                <span className="text-gray-500 uppercase text-[9px]">Now Payable</span>
                                                                <span className="text-xs text-[#2980B9] font-black">₹{nowPayableVal.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        <button
                                            onClick={() => toggleRow(order._id)}
                                            className="w-full flex items-center justify-center gap-1.5 pt-1 text-xs font-bold text-erp-accent hover:text-blue-700"
                                        >
                                            <span>{isExpanded ? 'Hide Details' : 'View Sub-Orders & Details'}</span>
                                            <Icon icon="lucide:chevron-down" className={`text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isExpanded && (
                                            <div className="pt-3 border-t border-gray-100 space-y-4 animate-in fade-in duration-200 text-xs">
                                                {order.orders?.map((subOrder, soIdx) => (
                                                    <div key={soIdx} className="bg-gray-50/70 p-3 rounded-xl border border-gray-200/80 space-y-3">
                                                        <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                                                            <span className="font-mono font-bold text-erp-accent text-xs">
                                                                Sub-Order: #{subOrder.orderNumber || 'N/A'}
                                                            </span>
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-100">
                                                                {subOrder.status || 'PENDING'}
                                                            </span>
                                                        </div>

                                                        <div className="space-y-2">
                                                            {subOrder.items?.map((item, itemIdx) => (
                                                                <div key={itemIdx} className="bg-white p-2.5 rounded-lg border border-gray-100 space-y-1.5 shadow-2xs">
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <div>
                                                                            <span className="font-bold text-gray-800 text-xs block">{item.itemName || 'Unnamed Item'}</span>
                                                                            <span className="text-[9px] font-bold text-gray-400 uppercase">{item.category} • {item.orderType}</span>
                                                                        </div>
                                                                        <div className="text-right flex-shrink-0">
                                                                            <span className="font-black text-erp-accent text-xs block">₹{item.price}</span>
                                                                            <span className="text-[10px] text-gray-500 font-semibold">Qty: {item.qty} {item.unit}</span>
                                                                        </div>
                                                                    </div>

                                                                    {item.rx && (
                                                                        <div className="pt-1.5 border-t border-gray-50 text-[10px] text-gray-500 space-y-1">
                                                                            {item.rx.consumerCardName && (
                                                                                <div><span className="font-bold text-gray-400">Patient:</span> {item.rx.consumerCardName}</div>
                                                                            )}
                                                                            {item.rx.opticianName && (
                                                                                <div><span className="font-bold text-gray-400">Optician:</span> {item.rx.opticianName}</div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── Desktop Table View (hidden md:block) ── */}
                        <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[1000px] custom-scrollbar">
                            <table className="w-full border-collapse min-w-[1240px]">
                                <thead>
                                    <tr className="bg-erp-accent text-white">
                                        <th className="py-4 px-4 font-semibold text-xs border-r border-erp-accent/80/20 last:border-r-0 text-center uppercase ">Order Code</th>
                                        <th className="py-4 px-6 font-semibold text-xs border-r border-erp-accent/80/20 last:border-r-0 text-center uppercase ">Customer / Shop</th>
                                        <th className="py-4 px-4 font-semibold text-xs border-r border-erp-accent/80/20 last:border-r-0 text-center uppercase ">Date / Time</th>
                                        <th className="py-4 px-4 font-semibold text-xs border-r border-erp-accent/80/20 last:border-r-0 text-center uppercase ">Est. Delivery</th>
                                        <th className="py-4 px-4 font-semibold text-xs border-r border-erp-accent/80/20 last:border-r-0 text-center uppercase ">Sub Orders</th>
                                        <th className="py-4 px-4 font-semibold text-xs border-r border-erp-accent/80/20 last:border-r-0 text-center uppercase ">Total Qty</th>
                                        <th className="py-4 px-6 font-semibold text-xs border-r border-erp-accent/80/20 last:border-r-0 text-center uppercase ">Order Total</th>
                                        <th className="py-4 px-4 font-semibold text-xs border-r border-erp-accent/80/20 last:border-r-0 text-center uppercase whitespace-nowrap min-w-[200px]">Status</th>
                                        <th className="py-4 px-4 font-semibold text-xs text-center uppercase ">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600">
                                {orders.map((order) => {
                                    const totalOrders = order.orders?.length || 0;
                                    let totalItemsQty = 0;
                                    let grandTotal = 0;
                                    let orderStatus = 'PENDING';
                                    console.log(order, "order")

                                    if (totalOrders > 0) {
                                        orderStatus = order.orders[0]?.status || 'PENDING';
                                        order.orders.forEach(bo => {
                                            if (bo.items) {
                                                bo.items.forEach(item => {
                                                    totalItemsQty += (Number(item.qty) || 0);
                                                });
                                            }
                                        });
                                    }

                                    return (
                                        <React.Fragment key={order._id}>
                                            <tr
                                                className={`border-b border-gray-100 last:border-b-0 hover:bg-erp-accent/5/20 transition-all h-16 cursor-pointer ${expandedRows.has(order._id) ? 'bg-erp-accent/5/10' : ''}`}
                                                onClick={() => toggleRow(order._id)}
                                            >
                                                <td className="px-4 py-2 text-center border-r border-gray-50">
                                                    <span className="text-xs font-black text-erp-accent/80 font-mono tracking-tighter uppercase">
                                                        #{order.orders?.[0]?.orderNumber || order?._id?.slice(-6) || '---'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-2 text-center border-r border-gray-50">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-gray-800 tracking-tight">{order?.customer?.customerName || '---'}</span>
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase ">{order?.customer?.customerShipToBranchName || '---'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-center border-r border-gray-50">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-xs font-bold text-gray-700">{dayjs(order?.createdAt).format('DD MMM YYYY')}</span>
                                                        <span className="text-[10px] font-black text-erp-accent/80 uppercase tracking-tighter">{dayjs(order?.createdAt).format('hh:mm A')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-center border-r border-gray-50">
                                                    {(() => {
                                                        const est = order.estimatedDeliveryDate || order.orders?.[0]?.estimatedDeliveryDate;
                                                        return est ? (
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-xs font-bold text-[#2980B9]">{dayjs(est).format('DD MMM YYYY')}</span>
                                                                <span className="text-[10px] font-black text-gray-400 uppercase">{dayjs(est).format('hh:mm A')}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 font-medium">---</span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-4 py-2 text-center border-r border-gray-50">
                                                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-black uppercase tracking-widest border border-blue-100">
                                                        {totalOrders}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-center border-r border-gray-50">
                                                    <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-md text-xs font-black uppercase tracking-widest border border-amber-100">
                                                        {totalItemsQty}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-2 text-center border-r border-gray-50">
                                                    {(() => {
                                                        const summary = order.summary || {};
                                                        const grand = Number(summary.grandTotal ?? order?.orders?.[0]?.totalOrderPrice ?? 0);
                                                        const advanceVal = Number(summary.advanceAmount ?? order.advanceAmount ?? 0);
                                                        const nowPayableVal = summary.nowPayable !== undefined ? Number(summary.nowPayable) : (grand - advanceVal);

                                                        return (
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-sm font-black text-gray-800 tracking-tight">
                                                                    ₹{grand.toFixed(2)}
                                                                </span>
                                                                {advanceVal > 0 && (
                                                                    <span className="text-[10px] font-bold text-emerald-600">
                                                                        Adv: ₹{advanceVal} | Due: ₹{nowPayableVal.toFixed(2)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-4 py-2 text-center border-r border-gray-50">
                                                    {(() => {
                                                        const cfg = STATUS_CONFIG[orderStatus] || STATUS_CONFIG[Object.keys(STATUS_CONFIG).find(k => k.toLowerCase() === orderStatus?.toLowerCase())] || { label: orderStatus, badge: 'bg-gray-100 text-gray-700 border-gray-200' };
                                                        return (
                                                            <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${cfg.badge}`}>
                                                                {cfg.label}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-4 py-2 text-center relative" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            if (activeActionMenu?.id === order._id) {
                                                                setActiveActionMenu(null);
                                                            } else {
                                                                setActiveActionMenu({
                                                                    id: order._id,
                                                                    top: rect.bottom + window.scrollY,
                                                                    left: rect.right,
                                                                    order,
                                                                    orderStatus,
                                                                    canUpdateStatus
                                                                });
                                                            }
                                                        }}
                                                        className={`p-2 rounded-xl transition-all ${activeActionMenu?.id === order._id ? 'bg-erp-accent text-white shadow-lg' : 'text-gray-400 hover:text-erp-accent hover:bg-erp-accent/5'}`}
                                                    >
                                                        <Icon icon="mdi:dots-vertical" className="w-6 h-6" />
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Collapsible Details Row */}
                                            {expandedRows.has(order._id) && (
                                                <tr className="bg-gray-50/50">
                                                    <td colSpan="8" className="p-0 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                                                        <div className="p-8 border-x-4 border-erp-accent/20 bg-gradient-to-br from-white to-amber-50/30 flex flex-col gap-8">
                                                            {order.orders?.map((subOrder, soIndex) => (
                                                                <div key={soIndex} className="flex flex-col gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                                                    <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="text-sm font-black text-erp-accent uppercase">Sub Order: {subOrder.orderNumber || 'N/A'}</span>
                                                                            <span className={getStatusBadge(subOrder.status)}>{subOrder.status || 'PENDING'}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-4">
                                                                            {subOrder.cgst && <span className="text-xs font-bold text-gray-500">CGST: {subOrder.cgst}%</span>}
                                                                            {subOrder.sgst && <span className="text-xs font-bold text-gray-500">SGST: {subOrder.sgst}%</span>}
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex flex-col gap-6">
                                                                        {subOrder.items?.map((item, itemIdx) => (
                                                                            <div key={itemIdx} className="flex flex-col gap-4 p-5 rounded-2xl bg-gray-50/50 border border-gray-100">
                                                                                <div className="flex justify-between items-center">
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-sm font-black text-gray-800">{item.itemName || 'Unnamed Item'}</span>
                                                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.category} • {item.orderType}</span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-4">
                                                                                        <span className="text-xs font-black text-gray-600 bg-white px-3 py-1 rounded-lg border border-gray-200">Qty: {item.qty} {item.unit}</span>
                                                                                        <span className="text-sm font-black text-erp-accent">₹{item.price}</span>
                                                                                    </div>
                                                                                </div>

                                                                                {item.orderType === 'RX' && item.rx && (
                                                                                    <>
                                                                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-2">
                                                                                            <DetailSection title="Patient Info">
                                                                                                <DetailItem label="Card Name" value={item.rx.consumerCardName} />
                                                                                                <DetailItem label="Optician" value={item.rx.opticianName} />
                                                                                                <DetailItem label="Reference" value={item.rx.orderReference} />
                                                                                            </DetailSection>
                                                                                            <DetailSection title="Centration (R)">
                                                                                                <DetailItem label="PD" value={item.rx.centration?.find(c => c.side === 'R')?.pd} />
                                                                                                <DetailItem label="Corridor" value={item.rx.centration?.find(c => c.side === 'R')?.corridor} />
                                                                                                <DetailItem label="Fitting Ht" value={item.rx.centration?.find(c => c.side === 'R')?.fittingHeight} />
                                                                                            </DetailSection>
                                                                                            <DetailSection title="Centration (L)">
                                                                                                <DetailItem label="PD" value={item.rx.centration?.find(c => c.side === 'L')?.pd} />
                                                                                                <DetailItem label="Corridor" value={item.rx.centration?.find(c => c.side === 'L')?.corridor} />
                                                                                                <DetailItem label="Fitting Ht" value={item.rx.centration?.find(c => c.side === 'L')?.fittingHeight} />
                                                                                            </DetailSection>
                                                                                            <DetailSection title="Technical Details">
                                                                                                <DetailItem label="Frame Type" value={item.rx.fitting?.frameType} />
                                                                                                <DetailItem label="Coating" value={item.rx.coating?.name || item.coating} />
                                                                                                <DetailItem label="Treatment" value={item.rx.treatment?.name} />
                                                                                                <DetailItem label="Tint" value={item.rx.tint?.name || item.tint} />
                                                                                            </DetailSection>
                                                                                        </div>

                                                                                        {/* Power Table for RX */}
                                                                                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm mt-2">
                                                                                            <div className="grid grid-cols-6 bg-gray-50/80 px-6 py-2 border-b border-gray-100">
                                                                                                <span className="text-[10px] font-black uppercase text-gray-400">Eye</span>
                                                                                                <span className="text-[10px] font-black uppercase text-gray-400">SPH</span>
                                                                                                <span className="text-[10px] font-black uppercase text-gray-400">CYL</span>
                                                                                                <span className="text-[10px] font-black uppercase text-gray-400">AXIS</span>
                                                                                                <span className="text-[10px] font-black uppercase text-gray-400">ADD</span>
                                                                                                <span className="text-[10px] font-black uppercase text-gray-400">PRISM</span>
                                                                                            </div>
                                                                                            {['R', 'L'].filter(side => item.rx.powers?.some(p => p.side === side)).map((side) => {
                                                                                                const power = item.rx.powers?.find(p => p.side === side) || {};
                                                                                                const prism = item.rx.prisms?.find(p => p.side === side) || {};
                                                                                                return (
                                                                                                    <div key={side} className="grid grid-cols-6 px-6 py-3 border-b border-gray-50 last:border-b-0">
                                                                                                        <span className="text-xs font-black text-erp-accent">{side === 'R' ? 'Right Eye' : 'Left Eye'}</span>
                                                                                                        <span className="text-xs font-bold text-gray-800">{power.sph ?? '---'}</span>
                                                                                                        <span className="text-xs font-bold text-gray-800">{power.cyl ?? '---'}</span>
                                                                                                        <span className="text-xs font-bold text-gray-800">{power.axis ?? '---'}</span>
                                                                                                        <span className="text-xs font-bold text-gray-800">{power.add ?? '---'}</span>
                                                                                                        <span className="text-xs font-bold text-gray-800">{prism.prism ? `${prism.prism} / ${prism.base}` : '---'}</span>
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    </>
                                                                                )}

                                                                                {item.orderType === 'STOCK' && (
                                                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-2 bg-white p-5 rounded-2xl border border-gray-100">
                                                                                        <DetailItem label="SPH" value={item.sph} />
                                                                                        <DetailItem label="CYL" value={item.cyl} />
                                                                                        <DetailItem label="AXIS" value={item.axis} />
                                                                                        <DetailItem label="ADD" value={item.add} />
                                                                                        <DetailItem label="Index" value={item.index} />
                                                                                        <DetailItem label="Color" value={item.color} />
                                                                                        <DetailItem label="Coating" value={item.coating} />
                                                                                        <DetailItem label="Tint" value={item.tint} />
                                                                                        <DetailItem label="Expiry" value={item.expiry ? dayjs(item.expiry).format('DD MMM YYYY') : ''} />
                                                                                        <DetailItem label="Disposability" value={item.disposability} />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                    {/* Status Change Audit History */}
                                                                    {((subOrder.statusHistory && subOrder.statusHistory.length > 0) || (order.statusHistory && order.statusHistory.length > 0)) && (
                                                                        <div className="bg-white p-5 rounded-2xl border border-gray-100 flex flex-col gap-3">
                                                                            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                                                                                <Icon icon="mdi:history" className="text-blue-500 text-lg" />
                                                                                <span className="text-xs font-black text-gray-800 uppercase tracking-wider">Status Change History & Audit Logs</span>
                                                                            </div>
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                                {(subOrder.statusHistory || order.statusHistory || []).map((sh, shIdx) => (
                                                                                    <div key={shIdx} className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 flex flex-col gap-1.5 text-xs">
                                                                                        <div className="flex justify-between items-center">
                                                                                            <div className="flex items-center gap-1.5">
                                                                                                <Icon icon="mdi:account-circle-outline" className="text-gray-400 text-sm" />
                                                                                                <span className="font-bold text-gray-800">{sh.changedByName || sh.changedBy || 'System'}</span>
                                                                                            </div>
                                                                                            <span className="text-[10px] text-gray-400 font-mono">
                                                                                                {sh.changedAt ? dayjs(sh.changedAt).format('DD MMM YYYY, hh:mm A') : ''}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                                                                                            <span className="text-gray-500">{sh.from || 'Started'}</span>
                                                                                            <Icon icon="mdi:arrow-right" className="text-blue-400 text-xs" />
                                                                                            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{sh.to}</span>
                                                                                        </div>
                                                                                        {sh.remarks && (
                                                                                            <p className="text-[11px] text-gray-600 bg-white p-2 rounded-lg border border-gray-100 italic">
                                                                                                &ldquo;{sh.remarks}&rdquo;
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
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
                </>
            )}

                {!loading && pagination.totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 py-6 border-t border-gray-100 bg-gray-50/30">
                        <button
                            disabled={pagination.currentPage === 1}
                            onClick={() => fetchOrders(pagination.currentPage - 1)}
                            className="p-2.5 rounded-2xl border border-gray-200 disabled:opacity-30 hover:bg-white hover:shadow-md transition-all h-10 w-10 flex items-center justify-center bg-white"
                        >
                            <Icon icon="mdi:chevron-left" className="text-xl" />
                        </button>
                        <span className="text-xs font-black uppercase tracking-widest text-gray-400">Page {pagination.currentPage} of {pagination.totalPages}</span>
                        <button
                            disabled={pagination.currentPage === pagination.totalPages}
                            onClick={() => fetchOrders(pagination.currentPage + 1)}
                            className="p-2.5 rounded-2xl border border-gray-200 disabled:opacity-30 hover:bg-white hover:shadow-md transition-all h-10 w-10 flex items-center justify-center bg-white"
                        >
                            <Icon icon="mdi:chevron-right" className="text-xl" />
                        </button>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={actionModal.isOpen}
                onClose={handleCloseModal}
                onConfirm={handleConfirmAction}
                loading={actionModal.loading}
                title={actionModal.type === 'cancel' ? "Cancel Order" : "Delete Order"}
                message={actionModal.type === 'cancel'
                    ? "Please provide a reason for cancelling this order."
                    : "Are you sure you want to delete this order? This action cannot be undone."}
                confirmText={actionModal.type === 'cancel' ? "Confirm Cancellation" : "Delete Permanently"}
                type={actionModal.type === 'cancel' ? "warning" : "danger"}
            >
                {actionModal.type === 'cancel' && (
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Cancellation Reason</label>
                        <textarea
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-700 focus:bg-white focus:ring-4 focus:ring-amber-50 focus:border-amber-200 transition-all outline-none min-h-[100px] resize-none"
                            placeholder="e.g. I don't have money to pay..."
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                        />
                    </div>
                )}
            </ConfirmationModal>

            {statusPopup.isOpen && statusPopup.order && (
                <StatusJourneyModal
                    order={statusPopup.order}
                    currentStatus={statusPopup.currentStatus}
                    onClose={() => setStatusPopup({ isOpen: false, order: null, currentStatus: '' })}
                    onTransition={handleStatusTransition}
                    loading={statusUpdate.loading[statusPopup.order._id]}
                />
            )}

            <ConfirmationModal
                isOpen={cancelConfirm.isOpen}
                onClose={() => setCancelConfirm({ isOpen: false, orderId: null, orderNumber: null, loading: false })}
                onConfirm={handleConfirmCancel}
                loading={cancelConfirm.loading}
                title="Cancel Order"
                message="Are you sure you want to cancel this order? This action cannot be undone."
                confirmText="Confirm Cancel"
                cancelText="Go Back"
                type="danger"
            />

            {/* Portal Action Menu Popup */}
            {activeActionMenu && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-[9998] bg-black/10 backdrop-blur-[1px]"
                        onClick={() => setActiveActionMenu(null)}
                    />
                    <div
                        style={{
                            position: 'fixed',
                            top: `${Math.min(activeActionMenu.top - window.scrollY, window.innerHeight - 320)}px`,
                            left: `${Math.max(10, Math.min(activeActionMenu.left - 210, window.innerWidth - 220))}px`,
                            zIndex: 9999
                        }}
                        className="w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[9999] animate-in fade-in zoom-in-95 duration-150"
                    >
                        <button
                            onClick={() => {
                                toggleRow(activeActionMenu.id);
                                setActiveActionMenu(null);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-black uppercase text-gray-700 hover:bg-erp-accent/5 hover:text-erp-accent transition-colors"
                        >
                            <Icon icon="mdi:eye-outline" className="text-base text-erp-accent" />
                            {expandedRows.has(activeActionMenu.id) ? 'Hide Items' : 'View Items'}
                        </button>

                        <button
                            onClick={() => {
                                navigate(PATHS.CUSTOMER_CARE.ORDER_DETAILS.replace(':id', activeActionMenu.id));
                                setActiveActionMenu(null);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-black uppercase text-gray-700 hover:bg-erp-accent/5 hover:text-erp-accent transition-colors"
                        >
                            <Icon icon="mdi:file-document-outline" className="text-base text-blue-600" />
                            Full Details
                        </button>

                        <button
                            onClick={() => {
                                const shareUrl = `${window.location.origin}/orders/status?orderId=${activeActionMenu.id || activeActionMenu.order?.orders?.[0]?.orderNumber}`;
                                navigator.clipboard.writeText(shareUrl);
                                toast.success("Public status tracking link copied!");
                                setActiveActionMenu(null);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-black uppercase text-[#2980B9] hover:bg-blue-50 transition-colors"
                        >
                            <Icon icon="mdi:share-variant-outline" className="text-base text-blue-500" />
                            Share Status Link
                        </button>

                        {activeActionMenu.canUpdateStatus && (
                            <button
                                onClick={() => {
                                    setStatusPopup({ isOpen: true, order: activeActionMenu.order, currentStatus: activeActionMenu.orderStatus });
                                    setActiveActionMenu(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-black uppercase text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                                <Icon icon="mdi:swap-horizontal" className="text-base text-amber-500" />
                                Change Status
                            </button>
                        )}

                        {activeActionMenu.order?.customer?.billingMode?.toUpperCase() === 'DC' ? (
                            <button
                                onClick={() => {
                                    downloadChallan(activeActionMenu.id);
                                }}
                                disabled={challanLoading[activeActionMenu.id]}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-black uppercase text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {challanLoading[activeActionMenu.id] ? (
                                    <>
                                        <span className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                        Downloading...
                                    </>
                                ) : (
                                    <>
                                        <Icon icon="mdi:file-download-outline" className="text-base text-emerald-600" />
                                        Download Challan
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    downloadInvoice(activeActionMenu.id, activeActionMenu.order?.orderNumber);
                                }}
                                disabled={invoiceLoading[activeActionMenu.id]}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-black uppercase text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {invoiceLoading[activeActionMenu.id] ? (
                                    <>
                                        <span className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                        Downloading...
                                    </>
                                ) : (
                                    <>
                                        <Icon icon="mdi:file-download-outline" className="text-base text-emerald-600" />
                                        Download Invoice
                                    </>
                                )}
                            </button>
                        )}

                        <button
                            onClick={() => {
                                navigate(PATHS.CUSTOMER_CARE.EDIT_ORDER.replace(':id', activeActionMenu.id));
                                setActiveActionMenu(null);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-black uppercase text-erp-accent/80 hover:bg-erp-accent/5 transition-colors"
                        >
                            <Icon icon="mdi:pencil-outline" className="text-base text-indigo-500" />
                            Upgrade Order
                        </button>

                        {activeActionMenu.order?.status?.toUpperCase() === 'DRAFT' && (
                            <button
                                onClick={() => {
                                    navigate(PATHS.CUSTOMER_CARE.EDIT_ORDER.replace(':id', activeActionMenu.id));
                                    setActiveActionMenu(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-black uppercase text-erp-accent/80 hover:bg-erp-accent/5 transition-colors"
                            >
                                <Icon icon="mdi:pencil-outline" className="text-base text-purple-500" />
                                Edit Order
                            </button>
                        )}

                        {activeActionMenu.orderStatus !== 'CANCELLED' && (
                            <>
                                <button
                                    onClick={() => {
                                        setActionModal({ isOpen: true, type: 'cancel', id: activeActionMenu.id, loading: false });
                                        setActiveActionMenu(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-black uppercase text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                                >
                                    <Icon icon="mdi:close-circle-outline" className="text-base text-red-500" />
                                    Cancel Order
                                </button>
                                <button
                                    onClick={() => {
                                        setActionModal({ isOpen: true, type: 'delete', id: activeActionMenu.id, loading: false });
                                        setActiveActionMenu(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-black uppercase text-red-700 hover:bg-red-100 transition-colors border-t border-red-50"
                                >
                                    <Icon icon="mdi:delete-outline" className="text-base text-red-600" />
                                    Delete Order
                                </button>
                            </>
                        )}
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};

const DetailSection = ({ title, children }) => (
    <div className="space-y-4">
        <h4 className="text-[11px] font-black text-erp-accent/80 uppercase tracking-widest border-b border-erp-accent/10 pb-2">{title}</h4>
        <div className="space-y-3">{children}</div>
    </div>
);

const DetailItem = ({ label, value }) => (
    <div className="flex flex-col">
        <span className="text-[9px] font-black text-gray-400 uppercase ">{label}</span>
        <span className="text-xs font-bold text-gray-700">{value || '---'}</span>
    </div>
);

export default AllOrdersList;


