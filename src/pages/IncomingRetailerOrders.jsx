import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { getIncomingRetailerOrders, updateRetailerOrderStatus } from '../services/wholesaleService';

const STATUS_CONFIG = {
    Submitted:       { label: 'Submitted',         badge: 'bg-blue-100 text-blue-700 border-blue-200',      color: '#3b82f6' },
    Processing:      { label: 'Processing',        badge: 'bg-amber-100 text-amber-700 border-amber-200',    color: '#f59e0b' },
    QC:              { label: 'Quality Check',     badge: 'bg-purple-100 text-purple-700 border-purple-200', color: '#8b5cf6' },
    ReadyToDispatch: { label: 'Ready to Dispatch', badge: 'bg-cyan-100 text-cyan-700 border-cyan-200',      color: '#06b6d4' },
    Dispatched:      { label: 'Dispatched',        badge: 'bg-indigo-100 text-indigo-700 border-indigo-200', color: '#6366f1' },
    Delivered:       { label: 'Delivered',         badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', color: '#10b981' },
    Completed:       { label: 'Completed',         badge: 'bg-green-100 text-green-700 border-green-200',    color: '#059669' },
    Cancelled:       { label: 'Cancelled',         badge: 'bg-red-100 text-red-700 border-red-200',          color: '#ef4444' },
};

const ALL_STEPS = [
    'Submitted',
    'Processing',
    'QC',
    'ReadyToDispatch',
    'Dispatched',
    'Delivered',
    'Completed',
];

const ALL_STATUSES = [
    'Submitted',
    'Processing',
    'QC',
    'ReadyToDispatch',
    'Dispatched',
    'Delivered',
    'Completed',
    'Cancelled',
];

const ALLOWED_TRANSITIONS = {
    Submitted:       ['Processing', 'Cancelled'],
    Processing:      ['QC', 'Cancelled'],
    QC:              ['ReadyToDispatch', 'Cancelled'],
    ReadyToDispatch: ['Dispatched', 'Cancelled'],
    Dispatched:      ['Delivered', 'Cancelled'],
    Delivered:       ['Completed'],
    Completed:       [],
    Cancelled:       [],
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
        },
    },
    '& .MuiInputAdornment-root': {
        marginRight: '8px',
    },
};

const DetailSection = ({ title, children }) => (
    <div className="space-y-4">
        <h4 className="text-[11px] font-black text-erp-accent/80 uppercase tracking-widest border-b border-erp-accent/10 pb-2">
            {title}
        </h4>
        <div className="space-y-3">{children}</div>
    </div>
);

const DetailItem = ({ label, value }) => (
    <div className="flex flex-col">
        <span className="text-[9px] font-black text-gray-400 uppercase">{label}</span>
        <span className="text-xs font-bold text-gray-700">{value || '---'}</span>
    </div>
);

// ─── Status Journey / Update Modal ──────────────────────────────────────────

function RetailerOrderStatusModal({ order, onClose, onSuccess }) {
    const currentStatus = order?.status || 'Submitted';
    const nextTransitions = ALLOWED_TRANSITIONS[currentStatus] || [];
    const [selectedStatus, setSelectedStatus] = useState(nextTransitions[0] || currentStatus);
    const [cancelReason, setCancelReason] = useState('');
    const [saving, setSaving] = useState(false);

    const currentIdx = ALL_STEPS.indexOf(currentStatus);

    const handleSave = async () => {
        if (!selectedStatus) {
            toast.warn('Please select a target status');
            return;
        }
        if (selectedStatus === currentStatus) {
            toast.info(`Order is already marked as ${currentStatus}`);
            return;
        }
        if (selectedStatus === 'Cancelled' && !cancelReason.trim()) {
            toast.warn('Please provide a reason for cancellation');
            return;
        }

        setSaving(true);
        try {
            // await updateRetailerOrderStatus(order._id, selectedStatus, cancelReason);
            // toast.success(`Order #${order.orderNumber} updated to ${selectedStatus}`);
            // onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.message || 'Failed to update order status');
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
            <div
                className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-100"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="p-4 sm:p-6 pb-4 flex items-center gap-3 sm:gap-4 border-b border-slate-100 flex-shrink-0 bg-white">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 text-blue-600">
                        <Icon icon="mdi:swap-horizontal" className="text-xl sm:text-2xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base sm:text-xl font-bold text-slate-800 tracking-tight">Change Retailer Order Status</h2>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5 truncate">
                            {order?.retailerStoreName || 'Retailer'} &bull; #{order?.orderNumber}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <Icon icon="mdi:close" className="text-xl" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 flex flex-col gap-6 overflow-y-auto">
                    {/* Stepper */}
                    <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Order Status Progression</p>
                        <div className="flex items-center justify-between relative overflow-x-auto pb-2 custom-scrollbar">
                            {ALL_STEPS.map((step, idx) => {
                                const isDone = currentStatus === 'Completed' || (currentIdx !== -1 && idx < currentIdx);
                                const isCurrent = step === currentStatus;
                                const cfg = STATUS_CONFIG[step] || {};
                                return (
                                    <div key={step} className="flex flex-col items-center flex-1 min-w-[68px] relative">
                                        <div
                                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold border-2 transition-all ${
                                                isDone
                                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                                    : isCurrent
                                                    ? 'bg-white border-blue-500 text-blue-600 ring-4 ring-blue-50'
                                                    : 'bg-white border-slate-200 text-slate-400'
                                            }`}
                                        >
                                            {isDone ? '✓' : idx + 1}
                                        </div>
                                        <span className={`text-[9px] font-bold mt-1 text-center leading-tight uppercase ${isCurrent ? 'text-blue-600' : 'text-slate-500'}`}>
                                            {cfg.label || step}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* All Status Selection */}
                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-700">Update Order Status</label>
                            <span className="text-[10px] font-bold text-slate-400">Current: <span className="text-blue-600">{currentStatus}</span></span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {ALL_STATUSES.map(st => {
                                const cfg = STATUS_CONFIG[st] || { label: st };
                                const isSelected = selectedStatus === st;
                                const isCurrent = currentStatus === st;
                                return (
                                    <button
                                        key={st}
                                        type="button"
                                        onClick={() => setSelectedStatus(st)}
                                        className={`p-2.5 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 ${
                                            isSelected
                                                ? st === 'Cancelled'
                                                    ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-100'
                                                    : 'bg-erp-accent text-white border-erp-accent shadow-md shadow-blue-100'
                                                : isCurrent
                                                ? 'bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-200'
                                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        <Icon
                                            icon={
                                                st === 'Cancelled'
                                                    ? 'mdi:cancel'
                                                    : isSelected || isCurrent
                                                    ? 'mdi:check-circle-outline'
                                                    : 'mdi:checkbox-blank-circle-outline'
                                            }
                                            className="text-base"
                                        />
                                        <span className="text-center text-[10px] leading-tight">{cfg.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {selectedStatus === 'Cancelled' && (
                            <div className="flex flex-col gap-1.5 mt-2 animate-in fade-in duration-200">
                                <label className="text-xs font-bold text-red-600">Cancellation Reason *</label>
                                <textarea
                                    rows={3}
                                    className="w-full p-3 rounded-xl border border-red-200 bg-red-50/30 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-200"
                                    placeholder="Provide reason for cancellation..."
                                    value={cancelReason}
                                    onChange={e => setCancelReason(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 sm:p-6 pt-3 flex justify-end items-center gap-3 border-t border-slate-100 bg-slate-50/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-all uppercase tracking-wider"
                    >
                        Cancel
                    </button>
                    {nextTransitions.length > 0 && (
                        <button
                            type="button"
                            // onClick={handleSave}
                            disabled={saving || !selectedStatus || (selectedStatus === 'Cancelled' && !cancelReason.trim())}
                            className="px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-wider bg-erp-accent hover:bg-blue-700 text-white shadow-md shadow-blue-200 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                        >
                            {saving && <Icon icon="mdi:loading" className="animate-spin text-sm" />}
                            Confirm Status
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function IncomingRetailerOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [total, setTotal] = useState(0);

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const [expandedRows, setExpandedRows] = useState(new Set());
    const [activeActionMenu, setActiveActionMenu] = useState(null);
    const [selectedOrderForStatus, setSelectedOrderForStatus] = useState(null);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch incoming retailer orders
    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getIncomingRetailerOrders({
                page,
                limit,
                status: statusFilter,
                search: debouncedSearch,
                fromDate,
                toDate,
            });
            setOrders(data.orders || []);
            setTotal(data.total || 0);
        } catch (err) {
            toast.error(err.message || 'Failed to load retailer orders');
        } finally {
            setLoading(false);
        }
    }, [page, limit, statusFilter, debouncedSearch, fromDate, toDate]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Reset filters
    const handleResetFilters = () => {
        setSearchTerm('');
        setDebouncedSearch('');
        setStatusFilter('');
        setFromDate('');
        setToDate('');
        setPage(1);
    };

    // Row expansion toggle
    const toggleRow = (id) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const getStatusBadge = (status) => {
        const cfg = STATUS_CONFIG[status] || { badge: 'bg-gray-100 text-gray-700 border-gray-200', label: status || 'Pending' };
        return `px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${cfg.badge}`;
    };

    const totalPages = Math.ceil(total / limit) || 1;

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500 font-sans">
            {/* ── Filter Card ── */}
            <div className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-gray-100/80 flex flex-col gap-4 md:gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-wrap items-end gap-3 md:gap-6">
                    {/* Search */}
                    <div className="flex flex-col gap-1.5 col-span-1 md:col-span-2 lg:min-w-[320px] lg:flex-1">
                        <span className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] ml-2 md:ml-5">
                            Search By Order ID, Shop Name, or Retailer
                        </span>
                        <div className="relative group">
                            <Icon
                                icon="mdi:magnify"
                                className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 text-lg group-hover:text-erp-accent transition-colors"
                            />
                            <input
                                placeholder="Order #, Store Name, Reference..."
                                className="w-full pl-14 pr-6 py-2.5 rounded-full bg-gray-50/80 border border-gray-100/50 text-[11px] font-black uppercase tracking-widest text-gray-700 focus:bg-white focus:ring-4 focus:ring-amber-50 focus:border-erp-accent/10 transition-all outline-none placeholder:text-gray-300"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Status Dropdown */}
                    <div className="flex flex-col gap-1.5 w-full lg:w-auto lg:min-w-[200px]">
                        <span className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] ml-2 md:ml-5">
                            Status
                        </span>
                        <div className="relative">
                            <Icon
                                icon="mdi:checkbox-blank-circle-outline"
                                className="fixed-icon absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 text-lg"
                            />
                            <select
                                className="w-full pl-14 pr-10 py-2.5 rounded-full bg-gray-50/80 border border-gray-100/50 text-[11px] font-black uppercase tracking-widest text-gray-700 appearance-none focus:bg-white focus:ring-4 focus:ring-amber-50 transition-all outline-none cursor-pointer"
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="">All Statuses</option>
                                <option value="Submitted">Submitted</option>
                                <option value="Processing">Processing</option>
                                <option value="QC">Quality Check (QC)</option>
                                <option value="ReadyToDispatch">Ready to Dispatch</option>
                                <option value="Dispatched">Dispatched</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    {/* Order Period Date Pickers */}
                    <div className="flex flex-col gap-1.5 col-span-1 md:col-span-2 lg:min-w-[380px]">
                        <span className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] ml-2 md:ml-5">
                            Order Period
                        </span>
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <DatePicker
                                value={fromDate ? dayjs(fromDate) : null}
                                onChange={(newValue) => {
                                    setFromDate(newValue ? newValue.format('YYYY-MM-DD') : '');
                                    setPage(1);
                                }}
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        placeholder: 'From Date',
                                        sx: { ...datePickerStyles, width: '100%' },
                                    },
                                }}
                            />
                            <span className="text-gray-300 text-[10px] font-black uppercase">to</span>
                            <DatePicker
                                value={toDate ? dayjs(toDate) : null}
                                onChange={(newValue) => {
                                    setToDate(newValue ? newValue.format('YYYY-MM-DD') : '');
                                    setPage(1);
                                }}
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        placeholder: 'To Date',
                                        sx: { ...datePickerStyles, width: '100%' },
                                    },
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Clear Filters Button */}
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

            {/* ── Table Card ── */}
            <div className="w-full bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100 min-h-[500px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-4">
                        <Icon icon="mdi:loading" className="text-4xl text-erp-accent animate-spin" />
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Loading Retailer Orders...</span>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-3 text-center">
                        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-erp-accent mb-2">
                            <Icon icon="mdi:package-variant-closed" className="text-3xl" />
                        </div>
                        <span className="text-sm font-black text-gray-700 uppercase tracking-wider">No Retailer Orders Found</span>
                        <p className="text-xs text-gray-400 max-w-sm font-medium">
                            {searchTerm || statusFilter || fromDate || toDate
                                ? 'No orders match the current filter criteria. Try adjusting or clearing filters.'
                                : 'No orders have been received from retail stores yet.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="overflow-x-auto overflow-y-auto max-h-[1000px] custom-scrollbar">
                            <table className="w-full border-collapse min-w-[1240px]">
                                <thead>
                                    <tr className="bg-erp-accent text-white">
                                        <th className="py-4 px-4 font-semibold text-xs border-r border-gray-200 last:border-r-0 text-center uppercase">Order Code</th>
                                        <th className="py-4 px-6 font-semibold text-xs border-r border-gray-200 last:border-r-0 text-center uppercase">Customer / Shop</th>
                                        <th className="py-4 px-4 font-semibold text-xs border-r border-gray-200 last:border-r-0 text-center uppercase">Date / Time</th>
                                        <th className="py-4 px-4 font-semibold text-xs border-r border-gray-200 last:border-r-0 text-center uppercase">Est. Delivery</th>
                                        <th className="py-4 px-4 font-semibold text-xs border-r border-gray-200 last:border-r-0 text-center uppercase">Sub Orders</th>
                                        <th className="py-4 px-4 font-semibold text-xs border-r border-gray-200 last:border-r-0 text-center uppercase">Total Qty</th>
                                        <th className="py-4 px-6 font-semibold text-xs border-r border-gray-200 last:border-r-0 text-center uppercase">Order Total</th>
                                        <th className="py-4 px-4 font-semibold text-xs border-r border-gray-200 last:border-r-0 text-center uppercase whitespace-nowrap min-w-[160px]">Status</th>
                                        <th className="py-4 px-4 font-semibold text-xs text-center uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600">
                                    {orders.map((order) => {
                                        const isExpanded = expandedRows.has(order._id);
                                        const totalItemsQty = Array.isArray(order.items)
                                            ? order.items.reduce((sum, it) => sum + (Number(it.qty || it.quantity) || 1), 0)
                                            : 0;

                                        const subtotal = Number(order.subtotal || 0);
                                        const totalGst = Number(order.totalGst || 0);
                                        const grossTotal = Number(order.grossTotal != null ? order.grossTotal : (subtotal + totalGst));
                                        const shippingCharges = Number(order.shippingCharges || 0);
                                        const otherCharges = Number(order.otherCharges || 0);
                                        const advanceAmount = Number(order.advanceAmount || 0);
                                        const shippingAndOther = shippingCharges + otherCharges;

                                        // grossTotalWithCharges represents the amount before advance deduction
                                        const grossTotalWithCharges = Number(
                                            order.grossTotalWithCharges != null && Number(order.grossTotalWithCharges) > 0
                                                ? order.grossTotalWithCharges
                                                : (grossTotal + shippingAndOther)
                                        );

                                        // netPayableTotal is the actual order / payable amount
                                        const netPayableTotal = Number(
                                            order.netPayableTotal != null && Number(order.netPayableTotal) >= 0
                                                ? order.netPayableTotal
                                                : Math.max(0, grossTotalWithCharges - advanceAmount)
                                        );

                                        const cfg = STATUS_CONFIG[order.status] || {
                                            label: order.status || 'Submitted',
                                            badge: 'bg-gray-100 text-gray-700 border-gray-200',
                                        };

                                        return (
                                            <React.Fragment key={order._id}>
                                                <tr
                                                    className={`border-b border-gray-100 last:border-b-0 hover:bg-blue-50/40 transition-all h-16 cursor-pointer ${
                                                        isExpanded ? 'bg-blue-50/20' : ''
                                                    }`}
                                                    onClick={() => toggleRow(order._id)}
                                                >
                                                    {/* ORDER CODE */}
                                                    <td className="px-4 py-2 text-center border-r border-gray-50">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-xs font-black text-erp-accent/80 font-mono tracking-tighter uppercase">
                                                                #{order.orderNumber || order._id?.slice(-6)}
                                                            </span>
                                                            {order.orderReference && (
                                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                                                    Ref: {order.orderReference}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* CUSTOMER / SHOP */}
                                                    <td className="px-6 py-2 text-center border-r border-gray-50">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-black text-gray-800 tracking-tight">
                                                                {order.retailerStoreName || 'Digi-Retailer'}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 font-bold uppercase">
                                                                {order.retailerMobile || order.retailerTenantId || 'Retailer Store'}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* DATE / TIME */}
                                                    <td className="px-4 py-2 text-center border-r border-gray-50">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-xs font-bold text-gray-700">
                                                                {dayjs(order.createdAt).format('DD MMM YYYY')}
                                                            </span>
                                                            <span className="text-[10px] font-black text-erp-accent/80 uppercase tracking-tighter">
                                                                {dayjs(order.createdAt).format('hh:mm A')}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* EST. DELIVERY */}
                                                    <td className="px-4 py-2 text-center border-r border-gray-50">
                                                        {order.estimatedDeliveryDate ? (
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-xs font-bold text-[#2980B9]">
                                                                    {dayjs(order.estimatedDeliveryDate).format('DD MMM YYYY')}
                                                                </span>
                                                                <span className="text-[10px] font-black text-gray-400 uppercase">
                                                                    {dayjs(order.estimatedDeliveryDate).format('hh:mm A')}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 font-medium">---</span>
                                                        )}
                                                    </td>

                                                    {/* SUB ORDERS */}
                                                    <td className="px-4 py-2 text-center border-r border-gray-50">
                                                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-black uppercase tracking-widest border border-blue-100">
                                                            1
                                                        </span>
                                                    </td>

                                                    {/* TOTAL QTY */}
                                                    <td className="px-4 py-2 text-center border-r border-gray-50">
                                                        <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-md text-xs font-black uppercase tracking-widest border border-amber-100">
                                                            {totalItemsQty}
                                                        </span>
                                                    </td>

                                                    {/* ORDER TOTAL */}
                                                    <td className="px-6 py-2 text-center border-r border-gray-50">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-sm font-black text-gray-800 tracking-tight">
                                                                ₹{netPayableTotal.toFixed(2)}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">
                                                                Net Payable
                                                            </span>
                                                            {advanceAmount > 0 ? (
                                                                <span className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                                                                    Adv: ₹{advanceAmount.toFixed(2)} | Gross: ₹{grossTotalWithCharges.toFixed(2)}
                                                                </span>
                                                            ) : (
                                                                shippingAndOther > 0 && (
                                                                    <span className="text-[10px] font-medium text-gray-500 mt-0.5">
                                                                        Gross: ₹{grossTotalWithCharges.toFixed(2)}
                                                                    </span>
                                                                )
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* STATUS */}
                                                    <td className="px-4 py-2 text-center border-r border-gray-50">
                                                        <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${cfg.badge}`}>
                                                            {cfg.label}
                                                        </span>
                                                    </td>

                                                    {/* ACTION */}
                                                    <td className="px-4 py-2 text-center relative" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (activeActionMenu === order._id) {
                                                                    setActiveActionMenu(null);
                                                                } else {
                                                                    setActiveActionMenu(order._id);
                                                                }
                                                            }}
                                                            className={`p-2 rounded-xl transition-all ${
                                                                activeActionMenu === order._id
                                                                    ? 'bg-erp-accent text-white shadow-lg'
                                                                    : 'text-gray-400 hover:text-erp-accent hover:bg-erp-accent/5'
                                                            }`}
                                                            title="Actions"
                                                        >
                                                            <Icon icon="mdi:dots-vertical" className="w-6 h-6" />
                                                        </button>

                                                        {/* Action Dropdown Menu */}
                                                        {activeActionMenu === order._id && (
                                                            <div
                                                                className="absolute right-4 top-14 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <button
                                                                    onClick={() => {
                                                                        setActiveActionMenu(null);
                                                                        setSelectedOrderForStatus(order);
                                                                    }}
                                                                    className="w-full px-4 py-2 text-left text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-erp-accent flex items-center gap-2.5 transition-colors"
                                                                >
                                                                    <Icon icon="mdi:swap-horizontal" className="text-base text-blue-500" />
                                                                    Update Status
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setActiveActionMenu(null);
                                                                        toggleRow(order._id);
                                                                    }}
                                                                    className="w-full px-4 py-2 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                                                                >
                                                                    <Icon icon="mdi:eye-outline" className="text-base text-gray-400" />
                                                                    {isExpanded ? 'Hide Details' : 'View Details'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* ── Collapsible Details Row (Matches Screenshot Exactly) ── */}
                                                {isExpanded && (
                                                    <tr className="bg-gray-50/50">
                                                        <td colSpan="9" className="p-0 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                                                            <div className="p-8 border-x-4 border-erp-accent/20 bg-gradient-to-br from-white to-amber-50/30 flex flex-col gap-8">
                                                                <div className="flex flex-col gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                                                    {/* Sub-order Header */}
                                                                    <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="text-sm font-black text-erp-accent uppercase">
                                                                                SUB ORDER: {order.orderNumber || order.orderReference || 'RETAIL-ORDER'}
                                                                            </span>
                                                                            <span className={getStatusBadge(order.status)}>
                                                                                {order.status || 'SUBMITTED'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-4">
                                                                            <span className="text-xs font-bold text-gray-500">
                                                                                CGST: {order.cgst || '0.00'}
                                                                            </span>
                                                                            <span className="text-xs font-bold text-gray-500">
                                                                                SGST: {order.sgst || '0.00'}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Items Section */}
                                                                    <div className="flex flex-col gap-6">
                                                                        {Array.isArray(order.items) && order.items.length > 0 ? (
                                                                            order.items.map((item, itemIdx) => {
                                                                                const hasPowers =
                                                                                    item.sph != null ||
                                                                                    item.cyl != null ||
                                                                                    item.axis != null ||
                                                                                    item.add != null;

                                                                                return (
                                                                                    <div
                                                                                        key={itemIdx}
                                                                                        className="flex flex-col gap-4 p-5 rounded-2xl bg-gray-50/50 border border-gray-100"
                                                                                    >
                                                                                        {/* Item title banner */}
                                                                                        <div className="flex justify-between items-center">
                                                                                            <div className="flex flex-col">
                                                                                                <span className="text-sm font-black text-gray-800">
                                                                                                    {item.itemName || item.productName || 'Unnamed Item'}
                                                                                                </span>
                                                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                                                                    {item.category || 'LENS'} • {item.orderType || item.powerType || 'RX'}
                                                                                                </span>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-4">
                                                                                                <span className="text-xs font-black text-gray-600 bg-white px-3 py-1 rounded-lg border border-gray-200">
                                                                                                    Qty: {item.qty || item.quantity || 1} PIECE
                                                                                                </span>
                                                                                                <span className="text-sm font-black text-erp-accent">
                                                                                                    ₹{item.price || item.sellingPrice || 0}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* 4-Column Grid Details */}
                                                                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-2">
                                                                                            <DetailSection title="Patient Info">
                                                                                                <DetailItem label="Card Name" value={item.rx?.consumerCardName || item.remarks || order.retailerStoreName} />
                                                                                                <DetailItem label="Optician" value={item.rx?.opticianName || order.retailerStoreName} />
                                                                                                <DetailItem label="Reference" value={item.orderReference || order.orderReference} />
                                                                                            </DetailSection>

                                                                                            <DetailSection title="Centration (R)">
                                                                                                <DetailItem label="PD" value={item.rx?.centration?.find(c => c.side === 'R')?.pd || item.pdR} />
                                                                                                <DetailItem label="Corridor" value={item.rx?.centration?.find(c => c.side === 'R')?.corridor || item.corridorR} />
                                                                                                <DetailItem label="Fitting Ht" value={item.rx?.centration?.find(c => c.side === 'R')?.fittingHeight || item.fittingHeightR} />
                                                                                            </DetailSection>

                                                                                            <DetailSection title="Centration (L)">
                                                                                                <DetailItem label="PD" value={item.rx?.centration?.find(c => c.side === 'L')?.pd || item.pdL} />
                                                                                                <DetailItem label="Corridor" value={item.rx?.centration?.find(c => c.side === 'L')?.corridor || item.corridorL} />
                                                                                                <DetailItem label="Fitting Ht" value={item.rx?.centration?.find(c => c.side === 'L')?.fittingHeight || item.fittingHeightL} />
                                                                                            </DetailSection>

                                                                                            <DetailSection title="Technical Details">
                                                                                                <DetailItem label="Frame Type" value={item.frameType} />
                                                                                                <DetailItem label="Coating" value={item.coating || item.rx?.coating?.name} />
                                                                                                <DetailItem label="Treatment" value={item.treatment || item.rx?.treatment?.name} />
                                                                                                <DetailItem label="Tint" value={item.tint || item.rx?.tint?.name} />
                                                                                            </DetailSection>
                                                                                        </div>

                                                                                        {/* Power Table for Prescription */}
                                                                                        {(hasPowers || item.rx?.powers) && (
                                                                                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm mt-2">
                                                                                                <div className="grid grid-cols-6 bg-gray-50/80 px-6 py-2 border-b border-gray-100">
                                                                                                    <span className="text-[10px] font-black uppercase text-gray-400">Eye</span>
                                                                                                    <span className="text-[10px] font-black uppercase text-gray-400">SPH</span>
                                                                                                    <span className="text-[10px] font-black uppercase text-gray-400">CYL</span>
                                                                                                    <span className="text-[10px] font-black uppercase text-gray-400">AXIS</span>
                                                                                                    <span className="text-[10px] font-black uppercase text-gray-400">ADD</span>
                                                                                                    <span className="text-[10px] font-black uppercase text-gray-400">PRISM</span>
                                                                                                </div>

                                                                                                {/* Right Eye */}
                                                                                                <div className="grid grid-cols-6 px-6 py-3 border-b border-gray-50">
                                                                                                    <span className="text-xs font-black text-erp-accent">Right Eye</span>
                                                                                                    <span className="text-xs font-bold text-gray-800">{item.side === 'R' ? item.sph ?? '---' : item.sphR ?? item.sph ?? '---'}</span>
                                                                                                    <span className="text-xs font-bold text-gray-800">{item.side === 'R' ? item.cyl ?? '---' : item.cylR ?? item.cyl ?? '---'}</span>
                                                                                                    <span className="text-xs font-bold text-gray-800">{item.side === 'R' ? item.axis ?? '---' : item.axisR ?? item.axis ?? '---'}</span>
                                                                                                    <span className="text-xs font-bold text-gray-800">{item.side === 'R' ? item.add ?? '---' : item.addR ?? item.add ?? '---'}</span>
                                                                                                    <span className="text-xs font-bold text-gray-800">{item.prismR || item.prism || '---'}</span>
                                                                                                </div>

                                                                                                {/* Left Eye */}
                                                                                                <div className="grid grid-cols-6 px-6 py-3">
                                                                                                    <span className="text-xs font-black text-erp-accent">Left Eye</span>
                                                                                                    <span className="text-xs font-bold text-gray-800">{item.side === 'L' ? item.sph ?? '---' : item.sphL ?? item.sph ?? '---'}</span>
                                                                                                    <span className="text-xs font-bold text-gray-800">{item.side === 'L' ? item.cyl ?? '---' : item.cylL ?? item.cyl ?? '---'}</span>
                                                                                                    <span className="text-xs font-bold text-gray-800">{item.side === 'L' ? item.axis ?? '---' : item.axisL ?? item.axis ?? '---'}</span>
                                                                                                    <span className="text-xs font-bold text-gray-800">{item.side === 'L' ? item.add ?? '---' : item.addL ?? item.add ?? '---'}</span>
                                                                                                    <span className="text-xs font-bold text-gray-800">{item.prismL || item.prism || '---'}</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })
                                                                        ) : (
                                                                            <div className="p-4 text-xs font-semibold text-gray-400">No items listed.</div>
                                                                        )}
                                                                    </div>

                                                                    {/* Shipping / Address / Financials breakdown */}
                                                                    <div className="bg-slate-50/70 p-5 rounded-2xl border border-gray-100 flex flex-col md:flex-row justify-between gap-6 text-xs">
                                                                        <div className="space-y-1.5 flex-1">
                                                                            <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">
                                                                                Retailer & Shipping Information
                                                                            </span>
                                                                            <div className="text-gray-700 font-bold">{order.retailerStoreName} ({order.retailerTenantId})</div>
                                                                            <div className="text-gray-500 font-medium">Contact: {order.retailerMobile || '---'} | Email: {order.retailerEmail || '---'}</div>
                                                                            {order.shippingAddress && (
                                                                                <div className="text-gray-500 font-medium">Address: {order.shippingAddress}</div>
                                                                            )}
                                                                            {order.remarks && (
                                                                                <div className="text-blue-600 font-medium">Remarks: {order.remarks}</div>
                                                                            )}
                                                                        </div>

                                                                        <div className="space-y-2 min-w-[260px] border-t md:border-t-0 md:border-l border-gray-200 md:pl-6 pt-3 md:pt-0">
                                                                            <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">
                                                                                Financial Breakdown
                                                                            </span>

                                                                            <div className="flex justify-between text-xs text-gray-600">
                                                                                <span>Subtotal</span>
                                                                                <span className="font-semibold text-gray-800">₹{subtotal.toFixed(2)}</span>
                                                                            </div>

                                                                            <div className="flex justify-between text-xs text-gray-600">
                                                                                <span>Total GST</span>
                                                                                <span className="font-semibold text-gray-800">₹{totalGst.toFixed(2)}</span>
                                                                            </div>

                                                                            <div className="flex justify-between text-xs text-gray-700 font-bold pt-1 border-t border-dashed border-gray-200">
                                                                                <span>Gross Total</span>
                                                                                <span>₹{grossTotal.toFixed(2)}</span>
                                                                            </div>

                                                                            {shippingAndOther > 0 && (
                                                                                <div className="space-y-1 pt-1 border-t border-gray-100">
                                                                                    {shippingCharges > 0 && (
                                                                                        <div className="flex justify-between text-xs text-gray-600">
                                                                                            <span>+ Shipping Charges</span>
                                                                                            <span className="font-semibold text-gray-700">+ ₹{shippingCharges.toFixed(2)}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {otherCharges > 0 && (
                                                                                        <div className="flex justify-between text-xs text-gray-600">
                                                                                            <span>+ Other Charges</span>
                                                                                            <span className="font-semibold text-gray-700">+ ₹{otherCharges.toFixed(2)}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    <div className="flex justify-between text-[11px] text-gray-500 font-medium">
                                                                                        <span>Gross with Charges</span>
                                                                                        <span>₹{grossTotalWithCharges.toFixed(2)}</span>
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {advanceAmount > 0 && (
                                                                                <div className="flex justify-between text-xs text-emerald-600 font-semibold pt-1 border-t border-dashed border-gray-200">
                                                                                    <span>- Advance Paid</span>
                                                                                    <span>- ₹{advanceAmount.toFixed(2)}</span>
                                                                                </div>
                                                                            )}

                                                                            <div className="flex justify-between text-gray-900 font-black text-sm pt-2 border-t-2 border-gray-300">
                                                                                <span>Net Payable</span>
                                                                                <span className="text-erp-accent text-base">₹{netPayableTotal.toFixed(2)}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
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

                        {/* ── Pagination Bar ── */}
                        <div className="p-4 md:p-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
                            <div className="text-xs font-semibold text-gray-500">
                                Showing <span className="font-black text-gray-800">{orders.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
                                <span className="font-black text-gray-800">{Math.min(page * limit, total)}</span> of{' '}
                                <span className="font-black text-gray-800">{total}</span> orders
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-all"
                                    title="Previous Page"
                                >
                                    <Icon icon="mdi:chevron-left" className="text-lg" />
                                </button>

                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum = i + 1;
                                        if (totalPages > 5 && page > 3) {
                                            pageNum = page - 3 + i + 1;
                                            if (pageNum > totalPages) pageNum = totalPages - 4 + i;
                                        }
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setPage(pageNum)}
                                                className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${
                                                    page === pageNum
                                                        ? 'bg-erp-accent text-white shadow-md shadow-blue-100'
                                                        : 'text-gray-600 hover:bg-gray-100'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-all"
                                    title="Next Page"
                                >
                                    <Icon icon="mdi:chevron-right" className="text-lg" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ── Status Transition Modal ── */}
            {selectedOrderForStatus && (
                <RetailerOrderStatusModal
                    order={selectedOrderForStatus}
                    onClose={() => setSelectedOrderForStatus(null)}
                    onSuccess={fetchOrders}
                />
            )}
        </div>
    );
}
