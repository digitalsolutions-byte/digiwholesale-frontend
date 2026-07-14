import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { getAllOrders, getOrderProductConfigs, cancelOrder, draftOrder, deleteOrder, updateBulkOrderStatus } from '../services/orderService';
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
    Draft:           ['Submitted', 'Cancelled'],
    Submitted:       ['Processing', 'Cancelled'],
    Processing:      ['QC', 'Cancelled'],
    QC:              ['ReadyToDispatch', 'Cancelled'],
    ReadyToDispatch: ['Dispatched', 'Cancelled'],
    Dispatched:      ['Delivered', 'Cancelled'],
    Delivered:       ['Completed'],
    Completed:       [],
    Cancelled:       [],
};

const STATUS_CONFIG = {
    Draft:           { label: 'Draft',             color: '#6b7280', badge: 'bg-gray-100 text-gray-600 border-gray-200' },
    Submitted:       { label: 'Submitted',          color: '#3b82f6', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
    Processing:      { label: 'Processing',         color: '#f59e0b', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
    QC:              { label: 'Quality Check',      color: '#8b5cf6', badge: 'bg-purple-100 text-purple-700 border-purple-200' },
    ReadyToDispatch: { label: 'Ready to Dispatch',  color: '#06b6d4', badge: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
    Dispatched:      { label: 'Dispatched',         color: '#6366f1', badge: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    Delivered:       { label: 'Delivered',          color: '#10b981', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    Completed:       { label: 'Completed',          color: '#059669', badge: 'bg-green-100 text-green-700 border-green-200' },
    Cancelled:       { label: 'Cancelled',          color: '#ef4444', badge: 'bg-red-100 text-red-700 border-red-200' },
};

const TRANSITION_BTN = {
    Submitted:       'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
    Processing:      'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200',
    QC:              'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200',
    ReadyToDispatch: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border-cyan-200',
    Dispatched:      'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200',
    Delivered:       'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200',
    Completed:       'bg-green-50 text-green-700 hover:bg-green-100 border-green-200',
    Cancelled:       'bg-red-50 text-red-600 hover:bg-red-100 border-red-200',
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

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-gray-100"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-8 pb-5 flex items-center gap-4 border-b border-gray-50 flex-shrink-0">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Icon icon="mdi:swap-horizontal" className="text-3xl text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Change Status</h2>
                        <p className="text-xs font-bold text-gray-400 mt-0.5 truncate">
                            {order?.customer?.customerName} &bull; #{order?.orders?.[0]?.orderNumber}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0">
                        <Icon icon="mdi:close" className="text-xl text-gray-400" />
                    </button>
                </div>

                <div className="flex overflow-hidden flex-1">
                    <div className="w-48 flex-shrink-0 border-r border-gray-50 p-6 overflow-y-auto">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Order Journey</p>
                        <div className="flex flex-col gap-0">
                            {ALL_STEPS.map((step, idx) => {
                                const cfg = STATUS_CONFIG[step];
                                const isDone = idx < currentIdx;
                                const isCurrent = idx === currentIdx;
                                return (
                                    <div key={step} className="flex items-start gap-3">
                                        <div className="flex flex-col items-center flex-shrink-0">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${
                                                isDone ? 'bg-emerald-500 border-emerald-500' :
                                                isCurrent ? 'bg-white border-blue-500 ring-2 ring-blue-100' :
                                                'bg-white border-gray-200'
                                            }`}>
                                                {isDone
                                                    ? <Icon icon="mdi:check" className="text-white text-[10px]" />
                                                    : isCurrent
                                                        ? <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                        : <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                                                }
                                            </div>
                                            {idx < ALL_STEPS.length - 1 && (
                                                <div className={`w-0.5 h-6 ${idx < currentIdx ? 'bg-emerald-300' : 'bg-gray-100'}`} />
                                            )}
                                        </div>
                                        <div className="pb-4">
                                            <span className={`text-[10px] font-black uppercase tracking-wider leading-tight ${
                                                isDone ? 'text-emerald-600' :
                                                isCurrent ? 'text-blue-600' :
                                                'text-gray-300'
                                            }`}>
                                                {cfg.label}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">
                            {transitions.length > 0 ? 'Available Actions' : 'No Actions Available'}
                        </p>
                        <div className="flex flex-col gap-3">
                            {transitions.length > 0 ? (
                                transitions.map(next => {
                                    const cfg = STATUS_CONFIG[next];
                                    const isCancel = next === 'Cancelled';
                                    return (
                                        <button
                                            key={next}
                                            onClick={() => onTransition(order._id, next)}
                                            disabled={!!loading}
                                            className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all disabled:opacity-50 ${
                                                isCancel
                                                    ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100 hover:border-red-200'
                                                    : TRANSITION_BTN[next] || 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.badge}`}>
                                                    <Icon icon={isCancel ? 'mdi:close-circle-outline' : 'mdi:arrow-right-circle-outline'} className="text-lg" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-xs font-black uppercase tracking-wider">{cfg.label}</p>
                                                    <p className="text-[10px] font-medium opacity-60 mt-0.5">
                                                        {isCancel ? 'Stop and cancel this order' : 'Move order to this stage'}
                                                    </p>
                                                </div>
                                            </div>
                                            {loading === next
                                                ? <Icon icon="mdi:loading" className="animate-spin text-xl flex-shrink-0" />
                                                : <Icon icon="mdi:chevron-right" className="text-xl opacity-40 flex-shrink-0" />
                                            }
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Icon
                                        icon={normalised === 'Cancelled' ? 'mdi:close-circle' : 'mdi:check-circle'}
                                        className={`text-5xl mb-3 ${normalised === 'Cancelled' ? 'text-red-300' : 'text-emerald-300'}`}
                                    />
                                    <p className="text-sm font-black text-gray-400 uppercase tracking-widest">
                                        {normalised === 'Cancelled' ? 'Order Cancelled' : 'Order Completed'}
                                    </p>
                                    <p className="text-xs text-gray-300 font-medium mt-1">No further actions available</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end px-8 py-5 border-t border-gray-50 flex-shrink-0 bg-gray-50/30">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider text-gray-500 border-2 border-gray-200 hover:bg-gray-100 transition-all"
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

    const handleStatusTransition = async (orderId, newStatus, orderNumber = null) => {
        if (newStatus === 'Cancelled') {
            setCancelConfirm({ isOpen: true, orderId, orderNumber, loading: false });
            return;
        }
        setStatusUpdate(prev => ({ loading: { ...prev.loading, [orderId]: newStatus } }));
        try {
            const res = await updateBulkOrderStatus(orderId, newStatus, orderNumber);
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
            }
        } catch (error) {
            console.error('Fetch error:', error);
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
        <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto p-4 animate-in fade-in duration-500">
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
                                    <option value="PENDING">Pending</option>
                                    <option value="CONFIRMED">Confirmed</option>
                                    <option value="PROCESSING">Processing</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="CANCELLED">Cancelled</option>
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
                    <div className="overflow-x-auto overflow-y-auto max-h-[1000px] custom-scrollbar">
                        <table className="w-full border-collapse min-w-[1240px]">
                            <thead>
                                <tr className="bg-erp-accent text-white">
                                    <th className="py-4 px-4 font-semibold text-xs border-r border-erp-accent/80/20 last:border-r-0 text-center uppercase ">Order Code</th>
                                    <th className="py-4 px-6 font-semibold text-xs border-r border-erp-accent/80/20 last:border-r-0 text-center uppercase ">Customer / Shop</th>
                                    <th className="py-4 px-4 font-semibold text-xs border-r border-erp-accent/80/20 last:border-r-0 text-center uppercase ">Date / Time</th>
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
                                                    <span className="text-sm font-black text-gray-800 tracking-tight ">
                                                        ₹{order?.orders[0].totalOrderPrice || '0.00'}
                                                    </span>
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
                                                        onClick={() => setActiveActionMenu(activeActionMenu === order._id ? null : order._id)}
                                                        className={`p-2 rounded-xl transition-all ${activeActionMenu === order._id ? 'bg-erp-accent text-white shadow-lg' : 'text-gray-400 hover:text-erp-accent hover:bg-erp-accent/5'}`}
                                                    >
                                                        <Icon icon="mdi:dots-vertical" className="w-6 h-6" />
                                                    </button>

                                                    {activeActionMenu === order._id && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-[60]"
                                                                onClick={() => setActiveActionMenu(null)}
                                                            />
                                                            <div className="absolute right-full mr-2 top-0 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-[100] animate-in fade-in slide-in-from-right-2 duration-200">
                                                                <button
                                                                    onClick={() => {
                                                                        toggleRow(order._id);
                                                                        setActiveActionMenu(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-black uppercase text-gray-600 hover:bg-erp-accent/5 hover:text-erp-accent/80 transition-colors"
                                                                >
                                                                    <Icon icon="mdi:eye-outline" className="text-base" />
                                                                    {expandedRows.has(order._id) ? 'Hide Items' : 'View Items'}
                                                                </button>

                                                                <button
                                                                    onClick={() => {
                                                                        navigate(PATHS.CUSTOMER_CARE.ORDER_DETAILS.replace(':id', order._id));
                                                                        setActiveActionMenu(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-black uppercase text-gray-600 hover:bg-erp-accent/5 hover:text-erp-accent/80 transition-colors"
                                                                >
                                                                    <Icon icon="mdi:file-document" className="text-base" />
                                                                    Full Details
                                                                </button>

                                                                {canUpdateStatus && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setStatusPopup({ isOpen: true, order, currentStatus: orderStatus });
                                                                            setActiveActionMenu(null);
                                                                        }}
                                                                        className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-black uppercase text-blue-600 hover:bg-blue-50 transition-colors"
                                                                    >
                                                                        <Icon icon="mdi:swap-horizontal" className="text-base" />
                                                                        Change Status
                                                                    </button>
                                                                )}

                                                                {/* Download Challan */}
                                                                <button
                                                                    onClick={() => {
                                                                        downloadChallan(order._id);
                                                                        setActiveActionMenu(null);
                                                                    }}
                                                                    disabled={challanLoading[order._id]}
                                                                    className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-black uppercase text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {challanLoading[order._id] ? (
                                                                        <>
                                                                            <span className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                                                            Downloading...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Icon icon="mdi:file-download-outline" className="text-base" />
                                                                            Download Challan
                                                                        </>
                                                                    )}
                                                                </button>
                                                                {/* Download Invoice */}
                                                                <button
                                                                    onClick={() => {
                                                                        downloadInvoice(order._id, order.orderNumber);
                                                                        setActiveActionMenu(null);
                                                                    }}
                                                                    disabled={invoiceLoading[order._id]}
                                                                    className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-black uppercase text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {invoiceLoading[order._id] ? (
                                                                        <>
                                                                            <span className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                                                            Downloading...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Icon icon="mdi:file-download-outline" className="text-base" />
                                                                            Download Invoice
                                                                        </>
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        navigate(PATHS.CUSTOMER_CARE.EDIT_ORDER.replace(':id', order._id));
                                                                        setActiveActionMenu(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-black uppercase text-erp-accent/80 hover:bg-erp-accent/5 transition-colors"
                                                                >
                                                                    <Icon icon="mdi:pencil-outline" className="text-base" />
                                                                    Upgrade Order
                                                                </button>
                                                                {order.status?.toUpperCase() === 'DRAFT' && (
                                                                    <button
                                                                        onClick={() => {
                                                                            navigate(PATHS.CUSTOMER_CARE.EDIT_ORDER.replace(':id', order._id));
                                                                            setActiveActionMenu(null);
                                                                        }}
                                                                        className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-black uppercase text-erp-accent/80 hover:bg-erp-accent/5 transition-colors"
                                                                    >
                                                                        <Icon icon="mdi:pencil-outline" className="text-base" />
                                                                        Edit Order
                                                                    </button>
                                                                )}

                                                                {orderStatus !== 'CANCELLED' && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => {
                                                                                setActionModal({ isOpen: true, type: 'cancel', id: order._id, loading: false });
                                                                                setActiveActionMenu(null);
                                                                            }}
                                                                            className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-black uppercase text-red-600 hover:bg-red-50 transition-colors"
                                                                        >
                                                                            <Icon icon="mdi:close-circle-outline" className="text-base" />
                                                                            Cancel Order
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setActionModal({ isOpen: true, type: 'delete', id: order._id, loading: false });
                                                                                setActiveActionMenu(null);
                                                                            }}
                                                                            className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-black uppercase text-red-700 hover:bg-red-100 transition-colors border-t border-red-50"
                                                                        >
                                                                            <Icon icon="mdi:delete-outline" className="text-base" />
                                                                            Delete Order
                                                                        </button>
                                                                    </>
                                                                )}

                                                                {/* <button
                                                                onClick={() => {
                                                                    window.print();
                                                                    setActiveActionMenu(null);
                                                                }}
                                                                className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-black uppercase text-gray-600 hover:bg-gray-50 transition-colors border-t border-gray-50 mt-1 pt-2"
                                                            >
                                                                <Icon icon="mdi:printer-outline" className="text-base" />
                                                                Print Invoice
                                                            </button> */}
                                                            </div>
                                                        </>
                                                    )}
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
            />        </div>
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


