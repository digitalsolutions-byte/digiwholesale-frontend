import CustomerPaymentModal from './accounting/CustomerPaymentModal';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { getAllCustomers, getCustomerById, getCustomerConfigs, deactivateCustomer, sendCustomerForCorrection } from '../services/customerService';
import { getAllZones } from '../services/locationService';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import CorrectionRequestModal from '../components/ui/CorrectionRequestModal';
import UpdateCustomerContactModal from '../components/ui/UpdateCustomerContactModal';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice';
import { toast } from 'react-toastify';
import { PATHS } from '../routes/paths';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import usePermissions from '../hooks/usePermissions';
import PermissionWrapper from '../components/PermissionWrapper';

const datePickerStyles = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        fontSize: '0.75rem',
        fontWeight: 600,
        height: '38px',
        '& fieldset': {
            borderColor: '#e5e7eb',
        },
        '&:hover fieldset': {
            borderColor: '#2980B9',
        },
        '&.Mui-focused fieldset': {
            borderColor: '#2980B9',
        },
    },
    '& .MuiInputBase-input': {
        padding: '0 12px',
        color: '#374151',
        '&::placeholder': {
            opacity: 1,
            color: '#d1d5db',
        }
    },
    '& .MuiInputAdornment-root': {
        marginRight: '4px'
    }
};

const CustomerList = () => {
    const navigate = useNavigate();
    const currentUser = useSelector(selectCurrentUser);
    const { hasPermission } = usePermissions();
    const [loading, setLoading] = useState(true);
    const [configs, setConfigs] = useState({ businessTypes: [], zones: [] });
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [activeActionMenu, setActiveActionMenu] = useState(null);
    const [selectedCustomerForDeactivate, setSelectedCustomerForDeactivate] = useState(null);
    const [accountingPaymentCustomer, setAccountingPaymentCustomer] = useState(null);
    const [selectedCustomerForCorrection, setSelectedCustomerForCorrection] = useState(null);
    const [selectedCustomerForContactEdit, setSelectedCustomerForContactEdit] = useState(null);
    const [deactivateLoading, setDeactivateLoading] = useState(false);
    const [correctionLoading, setCorrectionLoading] = useState(false);

    const [customers, setCustomers] = useState([]);


    const toggleRow = (id) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.info("Customer ID copied to clipboard", {
            position: "bottom-center",
            autoClose: 1500,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: false,
            theme: "colored",
        });
    };

    // Filter States
    const [filters, setFilters] = useState({
        search: '',
        customerType: '',
        status: '',
        createdByDepartment: '',
        zone: '',
        fromDate: '',
        toDate: ''
    });

    const [searchTerm, setSearchTerm] = useState('');

    const fetchConfigs = async () => {
        try {
            const data = await getCustomerConfigs();
            const zones = await getAllZones();
            console.log(zones.locations, 'zones')
            setConfigs({ ...data, zones: zones?.locations });
        } catch (error) {
            console.error('Error fetching configs:', error);
        }
    };

    const fetchCustomers = async (page = 1, currentFilters = filters) => {
        setLoading(true);
        try {
            // Remove empty filters
            const activeFilters = Object.fromEntries(
                Object.entries(currentFilters).filter(([_, v]) => v !== '')
            );
            const response = await getAllCustomers(page, 10, activeFilters);
            if (response.success) {
                setCustomers(response.data.customers || []);
                setPagination(response.data.pagination || { currentPage: 1, totalPages: 1 });
            }
        } catch (error) {
            toast.error(error.message || 'Failed to load customers');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (id) => {
        setViewLoading(true);
        try {
            const response = await getCustomerById(id);
            if (response.success) {
                setSelectedCustomer(response.data.customer);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to fetch customer details');
        } finally {
            setViewLoading(false);
        }
    };

    const handleDeactivateClick = (cust) => {
        setSelectedCustomerForDeactivate(cust);
        setActiveActionMenu(null);
    };

    const handleConfirmDeactivate = async () => {
        if (!selectedCustomerForDeactivate) return;
        setDeactivateLoading(true);
        try {
            await deactivateCustomer(selectedCustomerForDeactivate._id);
            toast.success('Customer deactivated successfully');
            await fetchCustomers(pagination.currentPage);
        } catch (error) {
            toast.error(error.message || 'Failed to deactivate customer');
        } finally {
            setDeactivateLoading(false);
            setSelectedCustomerForDeactivate(null);
        }
    };

    const handleCorrectionClick = (cust) => {
        setSelectedCustomerForCorrection(cust);
        setActiveActionMenu(null);
    };

    const handleConfirmCorrection = async (correctionData) => {
        if (!selectedCustomerForCorrection) return;
        setCorrectionLoading(true);
        try {
            await sendCustomerForCorrection(selectedCustomerForCorrection._id, correctionData);
            toast.success('Correction request sent successfully');
            await fetchCustomers(pagination.currentPage);
        } catch (error) {
            toast.error(error.message || 'Failed to send correction request');
        } finally {
            setCorrectionLoading(false);
            setSelectedCustomerForCorrection(null);
        }
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    // Debounce Search for Shop Name
    useEffect(() => {
        const timer = setTimeout(() => {
            setFilters(prev => ({ ...prev, search: searchTerm }));
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch customers when any filter changes
    useEffect(() => {
        fetchCustomers(1, filters);
    }, [filters]);

    const handleQuickDate = (type) => {
        const today = dayjs();
        let fromDate = '';
        let toDate = today.format('YYYY-MM-DD');

        switch (type) {
            case 'yesterday':
                fromDate = today.subtract(1, 'day').format('YYYY-MM-DD');
                toDate = today.subtract(1, 'day').format('YYYY-MM-DD');
                break;
            case 'last_week':
                fromDate = today.subtract(1, 'week').startOf('week').format('YYYY-MM-DD');
                toDate = today.subtract(1, 'week').endOf('week').format('YYYY-MM-DD');
                break;
            case 'last_month':
                fromDate = today.subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
                toDate = today.subtract(1, 'month').endOf('month').format('YYYY-MM-DD');
                break;
            case 'last_quarter':
                fromDate = today.subtract(1, 'quarter').startOf('quarter').format('YYYY-MM-DD');
                toDate = today.subtract(1, 'quarter').endOf('quarter').format('YYYY-MM-DD');
                break;
            case 'last_year':
                fromDate = today.subtract(1, 'year').startOf('year').format('YYYY-MM-DD');
                toDate = today.subtract(1, 'year').endOf('year').format('YYYY-MM-DD');
                break;
            default:
                fromDate = '';
                toDate = '';
        }

        setFilters(prev => ({ ...prev, fromDate, toDate }));
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setFilters({
            search: '',
            businessType: '',
            status: '',
            createdByDepartment: '',
            zone: '',
            fromDate: '',
            toDate: ''
        });
    };

    const emptyRowsCount = Math.max(0, 10 - customers.length);

    return (
        <div className="flex flex-col gap-4 w-full h-full p-2">
            {/* Logged-in User Info Strip */}
            {/* <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-5 py-3 rounded-2xl border border-indigo-100/60 flex flex-wrap items-center gap-4 text-[11px]">
                <div className="flex items-center gap-1.5">
                    <Icon icon="mdi:account-circle" className="text-indigo-400 text-base" />
                    <span className="font-black text-gray-400 uppercase  ">Logged in as:</span>
                    <span className="font-extrabold text-indigo-700">{currentUser?.name || currentUser?.Name || '---'}</span>
                </div>
                <span className="text-gray-200">|</span>
                <div className="flex items-center gap-1.5">
                    <span className="font-black text-gray-400 uppercase  ">SubRole:</span>
                    <span className="font-extrabold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{currentUser?.SubRole?.name || currentUser?.SubRole || '---'}</span>
                </div>
                <span className="text-gray-200">|</span>
                <div className="flex items-center gap-1.5">
                    <span className="font-black text-gray-400 uppercase  ">Type:</span>
                    <span className="font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{currentUser?.EmployeeType?.name || currentUser?.EmployeeType || '---'}</span>
                </div>
                <span className="text-gray-200">|</span>
                <div className="flex items-center gap-1.5">
                    <span className="font-black text-gray-400 uppercase  ">Dept:</span>
                    <span className="font-extrabold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">{currentUser?.Department?.name || currentUser?.Department || '---'}</span>
                </div>
            </div> */}
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-wrap items-end gap-3">
                    {/* Search - Full width on mobile/tablet, flexible on desktop */}
                    <div className="flex flex-col gap-1.5 col-span-1 md:col-span-2 lg:min-w-[300px] lg:flex-1">
                        <span className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] ml-2 md:ml-5">Search By Name, Shop, Email, Phone</span>
                        <FilterInput
                            placeholder="Start typing..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            icon="mdi:store-search"
                        />
                    </div>

                    {/* Business Category */}
                    <div className="flex flex-col gap-1.5 w-full lg:w-auto lg:min-w-[160px]">
                        <span className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] ml-2 md:ml-5">Business Category</span>
                        <FilterSelect
                            placeholder="All Categories"
                            value={filters.businessType}
                            onChange={(e) => setFilters({ ...filters, customerType: e.target.value })}
                            options={configs.businessTypes?.map(c => ({ label: c.name, value: c._id })) || []}
                            icon="mdi:account-group"
                        />
                    </div>

                    {/* Zone */}
                    <div className="flex flex-col gap-1.5 w-full lg:w-auto lg:min-w-[160px]">
                        <span className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] ml-2 md:ml-5">Zone / Region</span>
                        <FilterSelect
                            placeholder="All Zones"
                            value={filters.zone}
                            onChange={(e) => setFilters({ ...filters, zone: e.target.value })}
                            options={configs.zones.map(z => ({ label: z.zone, value: z._id || z.refId }))}
                            icon="mdi:map-marker-radius"
                        />
                    </div>

                    {/* Status */}
                    <div className="flex flex-col gap-1.5 w-full lg:w-auto lg:min-w-[160px]">
                        <span className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] ml-2 md:ml-5">Status</span>
                        <FilterSelect
                            placeholder="All Status"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            options={[
                                { label: 'Active', value: 'active' },
                                { label: 'Inactive', value: 'inactive' }
                            ]}
                            icon="mdi:checkbox-blank-circle-outline"
                        />
                    </div>

                    {/* Created By Dept */}
                    <div className="flex flex-col gap-1.5 w-full lg:w-auto lg:min-w-[160px]">
                        <span className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] ml-2 md:ml-5">Created By Dept.</span>
                        <FilterSelect
                            placeholder="By Department"
                            value={filters.createdByDepartment}
                            onChange={(e) => setFilters({ ...filters, createdByDepartment: e.target.value })}
                            options={[
                                { label: 'Superadmin', value: 'SUPERADMIN' },
                                { label: 'Sales', value: 'SALES' },
                                { label: 'Finance', value: 'FINANCE' }
                            ]}
                            icon="mdi:account-tie"
                        />
                    </div>

                    {/* Quick Date Range */}
                    <div className="flex flex-col gap-1.5 w-full lg:w-auto lg:min-w-[160px]">
                        <span className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] ml-2 md:ml-5">Quick Date</span>
                        <FilterSelect
                            placeholder="Select Range"
                            value=""
                            onChange={(e) => handleQuickDate(e.target.value)}
                            options={[
                                { label: 'Yesterday', value: 'yesterday' },
                                { label: 'Last Week', value: 'last_week' },
                                { label: 'Last Month', value: 'last_month' },
                                { label: 'Last Quarter', value: 'last_quarter' },
                                { label: 'Last Year', value: 'last_year' }
                            ]}
                            icon="mdi:calendar-clock"
                        />
                    </div>

                    {/* Registration Period */}
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
                        className="flex items-center justify-center gap-2 text-gray-400 hover:text-[#1F618D] px-4 py-2 rounded-lg hover:bg-[#eaf4fb] transition-all duration-300 font-semibold text-[10px] uppercase tracking-wider group border border-transparent hover:border-[#2980B9]/20 w-full md:w-auto"
                    >
                        <Icon icon="mdi:refresh" className="text-lg group-hover:rotate-180 transition-transform duration-700" />
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="w-full bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 min-h-[500px]">
                {loading ? (
                    <div className="flex justify-center items-center h-[500px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-erp-accent"></div>
                    </div>
                ) : (
                    <>
                        {/* ── Mobile Card View (block md:hidden) ── */}
                        <div className="block md:hidden space-y-3 p-3 bg-gray-50/50">
                            {customers.map((cust) => {
                                const isExpanded = expandedRows.has(cust._id);
                                const isActive = cust?.status?.isActive !== undefined ? cust.status.isActive : (cust?.Status?.isActive !== undefined ? cust.Status.isActive : cust?.status?.toLowerCase?.() === 'active');
                                return (
                                    <div key={cust._id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-erp-accent font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                        {cust?.customerCode || cust.serialNumber || '---'}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {isActive ? 'ACTIVE' : 'INACTIVE'}
                                                    </span>
                                                </div>
                                                <h3 className="text-sm font-black text-gray-800 tracking-tight mt-1 truncate">{cust?.shopName || '---'}</h3>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase truncate">{cust?.ownerName || '---'}</p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    if (activeActionMenu?.id === cust._id) {
                                                        setActiveActionMenu(null);
                                                    } else {
                                                        setActiveActionMenu({
                                                            id: cust._id,
                                                            top: rect.top + window.scrollY,
                                                            left: rect.left + window.scrollX,
                                                            cust
                                                        });
                                                    }
                                                }}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-erp-accent hover:bg-erp-accent/10 transition-colors"
                                            >
                                                <Icon icon="mdi:dots-vertical" className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 py-2 border-y border-gray-100 text-[11px]">
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-gray-400 block">Account Type</span>
                                                <span className="font-semibold text-gray-700">{cust?.businessType?.name || cust?.businessType || cust?.CustomerType?.name || cust?.CustomerType || '---'}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-gray-400 block">Phone</span>
                                                <span className="font-semibold text-gray-700">{cust?.mobileNo1 || '---'}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-gray-400 block">Email</span>
                                                <span className="font-semibold text-gray-700 truncate block">{cust?.businessEmail || cust?.emailId || '---'}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-gray-400 block">City</span>
                                                <span className="font-semibold text-gray-700">{cust?.billToAddress?.city || cust?.address?.[0]?.city || '---'}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => toggleRow(cust._id)}
                                            className="w-full flex items-center justify-center gap-1.5 pt-1 text-xs font-bold text-erp-accent hover:text-blue-700"
                                        >
                                            <span>{isExpanded ? 'Hide Details' : 'View Full Details'}</span>
                                            <Icon icon="lucide:chevron-down" className={`text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isExpanded && (
                                            <div className="pt-3 border-t border-gray-100 space-y-4 animate-in fade-in duration-200 text-xs">
                                                <div className="space-y-2">
                                                    <h4 className="text-[10px] font-black text-erp-accent uppercase tracking-widest border-b border-erp-accent/10 pb-1">Shop & Contact Details</h4>
                                                    <DetailItem label="Sales Representative" value={cust.salesPerson?.name} />
                                                    <DetailItem label="Zone" value={cust.zone?.name || cust.zone} />
                                                    <DetailItem label="GST Number" value={cust.GSTNo || cust.gstNo} />
                                                    <DetailItem label="PAN Number" value={cust.PANNo || cust.panNo} />
                                                    <DetailItem label="Contact Person" value={cust.contactPersonName || cust.ownerName} />
                                                    <DetailItem label="Secondary Mobile" value={cust.mobileNo2} />
                                                    <DetailItem label="Pincode" value={cust.billToAddress?.pincode || cust.address?.[0]?.pincode} />
                                                </div>
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
                                    <tr className="bg-gray-100/80 border-b border-gray-200 sticky top-0 z-10">
                                        <th className="py-2.5 px-3 w-10 text-gray-500 border-r border-gray-200/60 text-center uppercase tracking-wider text-[11px] font-extrabold"></th>
                                        <th className="py-2.5 px-4 font-extrabold text-[11px] text-gray-600 border-r border-gray-200/60 text-center uppercase tracking-wider">Customer Code</th>
                                        <th className="py-2.5 px-6 font-extrabold text-[11px] text-gray-600 border-r border-gray-200/60 text-center uppercase tracking-wider">Name / Shop</th>
                                        <th className="py-2.5 px-4 font-extrabold text-[11px] text-gray-600 border-r border-gray-200/60 text-center uppercase tracking-wider">Account Type</th>
                                        <th className="py-2.5 px-6 font-extrabold text-[11px] text-gray-600 border-r border-gray-200/60 text-center uppercase tracking-wider">Email / Phone</th>
                                        <th className="py-2.5 px-6 font-extrabold text-[11px] text-gray-600 border-r border-gray-200/60 text-center uppercase tracking-wider">City / Country</th>
                                        <th className="py-2.5 px-4 font-extrabold text-[11px] text-gray-600 border-r border-gray-200/60 text-center uppercase tracking-wider">Status</th>
                                        <th className="py-2.5 px-4 font-extrabold text-[11px] text-gray-600 border-r border-gray-200/60 text-center uppercase tracking-wider">Sales Person / Zone</th>
                                        <th className="py-2.5 px-4 font-extrabold text-[11px] text-gray-600 text-center uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600">
                                {customers.map((cust) => (
                                    <React.Fragment key={cust._id}>
                                        <tr
                                            className={`border-b border-gray-100 last:border-b-0 hover:bg-erp-accent/5 transition-all h-12 cursor-pointer ${expandedRows.has(cust._id) ? 'bg-[#eaf4fb]/30' : ''}`}
                                            onClick={() => toggleRow(cust._id)}
                                        >
                                            <td className="px-3 py-2 text-center border-r border-gray-50">
                                                <Icon
                                                    icon="lucide:chevron-right"
                                                    className={`text-[#1F618D] text-xs transition-transform duration-200 inline-block ${expandedRows.has(cust._id) ? 'rotate-90' : ''}`}
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-center border-r border-gray-50">
                                                <span className="text-xs font-black text-erp-accent/80 font-mono tracking-tighter">
                                                    {cust?.customerCode || cust.serialNumber || '---'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-2 text-center border-r border-gray-50">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-gray-800 tracking-tight">{cust?.shopName || '---'}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase  ">{cust?.ownerName || '---'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-center border-r border-gray-50">
                                                <span className="px-2.5 py-1 bg-gray-100 text-gray-600 whitespace-nowrap rounded-md text-[9px] font-black uppercase tracking-widest border border-gray-200">
                                                    {cust?.businessType?.name || cust?.businessType || cust?.CustomerType?.name || cust?.CustomerType || '---'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-2 text-center border-r border-gray-50">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-semibold text-gray-600">{cust?.businessEmail || cust?.emailId || '---'}</span>
                                                    <span className="text-[10px] font-bold text-erp-accent/80 mt-0.5">{cust?.mobileNo1 || '---'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-2 text-center border-r border-gray-50">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-gray-700">{cust?.billToAddress?.city || cust?.address?.[0]?.city || '---'}</span>
                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{cust?.billToAddress?.country || cust?.address?.[0]?.country || 'India'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-center border-r border-gray-50">
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${cust?.status?.isActive || cust?.Status?.isActive || cust?.status?.toLowerCase?.() === 'active' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                                    {cust?.status?.isActive !== undefined ? (cust.status.isActive ? 'ACTIVE' : 'INACTIVE') : (cust?.Status?.isActive ? 'ACTIVE' : (cust?.status || 'ACTIVE'))}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-center border-r border-gray-50">
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest '}`}>
                                                    {cust.salesPerson?.name || '---'}
                                                </span>
                                                <br />
                                                <span className="text-[10px] font-bold text-erp-accent/80 mt-0.5">{cust.zone?.name || '---'}</span>
                                            </td>
                                            {/* <td className="px-4 py-2 text-center border-r border-gray-50">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-xs font-black text-gray-600">{cust?.createdByDepartment || 'SUPERADMIN'}</span>
                                                    <Icon icon="mdi:account-circle" className="text-gray-300 text-lg" />
                                                </div>
                                            </td> */}
                                            <td className="px-4 py-2 text-center relative" onClick={(e) => e.stopPropagation()}>
                                                {/* Action Menu Button */}
                                                <button
                                                    onClick={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        if (activeActionMenu?.id === cust._id) {
                                                            setActiveActionMenu(null);
                                                        } else {
                                                            setActiveActionMenu({
                                                                id: cust._id,
                                                                top: rect.top + window.scrollY,
                                                                left: rect.left + window.scrollX,
                                                                cust
                                                            });
                                                        }
                                                    }}
                                                    className={`p-2 rounded-xl transition-all ${activeActionMenu?.id === cust._id ? 'bg-erp-accent text-white shadow-lg' : 'text-gray-400 hover:text-erp-accent hover:bg-erp-accent/5'}`}
                                                >
                                                    <Icon icon="mdi:dots-vertical" className="w-6 h-6" />
                                                </button>
                                            </td>
                                        </tr>

                                        {/* Collapsible Details Row */}
                                        {expandedRows.has(cust._id) && (
                                            <tr className="bg-gray-50/50">
                                                <td colSpan="9" className="p-0 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                                                    <div className="p-10 border-x-4 border-erp-accent/20 bg-gradient-to-br from-white to-amber-50/30">
                                                        <div className="grid grid-cols-4 gap-12">
                                                            {/* Detailed Columns */}
                                                            <div className="space-y-6">
                                                                <h4 className="text-[11px] font-black text-erp-accent/80 uppercase tracking-widest border-b border-erp-accent/10 pb-2">Business Info</h4>
                                                                <DetailItem label="Full Shop Name" value={cust.shopName} />
                                                                <DetailItem label="Owner Full Name" value={cust.ownerName} />
                                                                {/* <div className="flex items-center gap-2 group/id cursor-pointer" onClick={(e) => { e.stopPropagation(); copyToClipboard(cust.username || cust._id); }}>
                                                                    <DetailItem label="User ID (Click to Copy)" value={cust.username || cust._id} />
                                                                    <Icon icon="mdi:content-copy" className="text-amber-400 opacity-0 group-hover/id:opacity-100 transition-opacity mt-4" />
                                                                </div> */}
                                                                <DetailItem label="Business Type" value={cust.businessType?.name || cust.businessType || cust.CustomerType?.name || cust.CustomerType} />
                                                                <DetailItem label="Order Mode" value={cust.orderMode} />
                                                            </div>

                                                            <div className="space-y-6">
                                                                <h4 className="text-[11px] font-black text-erp-accent/80 uppercase tracking-widest border-b border-erp-accent/10 pb-2">Contact Details</h4>
                                                                <DetailItem label="Business Email" value={cust.businessEmail || cust.emailId} />
                                                                <DetailItem label="Primary Phone" value={cust.mobileNo1} />
                                                                <DetailItem label="Secondary Phone" value={cust.mobileNo2} />
                                                                <DetailItem label="Landline" value={cust.landlineNo} />
                                                            </div>

                                                            <div className="space-y-6">
                                                                <h4 className="text-[11px] font-black text-erp-accent/80 uppercase tracking-widest border-b border-erp-accent/10 pb-2">Logistics & Sales</h4>
                                                                <DetailItem label="Zone / Region" value={cust.zone?.name || cust.zone} />
                                                                <DetailItem label="Sales Person" value={cust.salesPerson?.name || cust.salesPerson} />
                                                                <DetailItem label="Courier" value={cust.courierName?.name || cust.courierName} />
                                                                <DetailItem label="Courier Time" value={cust.courierTime?.name || cust.courierTime} />
                                                                <div>
                                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Assigned Brands</p>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {Array.isArray(cust.brands) && cust.brands.length > 0 ? (
                                                                            cust.brands.map((b, i) => (
                                                                                <span key={i} className="px-2 py-0.5 bg-blue-50 text-[#2980B9] border border-blue-100 rounded text-[10px] font-black uppercase">
                                                                                    {b.brandName || b.name}
                                                                                </span>
                                                                            ))
                                                                        ) : (
                                                                            <span className="text-xs text-gray-400 font-semibold">---</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-6">
                                                                <h4 className="text-[11px] font-black text-erp-accent/80 uppercase tracking-widest border-b border-erp-accent/10 pb-2">Account Status</h4>
                                                                <DetailItem label="Credit Limit" value={cust?.creditLimit ? `₹${cust.creditLimit.toLocaleString()}` : '---'} />
                                                                <DetailItem label="Credit Days" value={cust?.creditDays?.name || cust?.creditDays} />
                                                                <DetailItem label="GST Registered" value={cust?.isGSTRegistered || cust?.IsGSTRegistered ? 'YES' : 'NO'} />
                                                                {(cust?.isGSTRegistered || cust?.IsGSTRegistered) ? (
                                                                    <DetailItem label="GST Number" value={cust?.gstNumber || cust?.GSTNumber} />
                                                                ) : (
                                                                    <>
                                                                        <DetailItem label="Aadhar Card No." value={cust?.aadharCard || cust?.AadharCard} />
                                                                        <DetailItem label="PAN Card No." value={cust?.panCard || cust?.PANCard} />
                                                                    </>
                                                                )}
                                                            </div>

                                                            {/* Bill To Address */}
                                                            {cust?.billToAddress && (
                                                                <div className="md:col-span-4 mt-4">
                                                                    <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-widest border-b border-blue-100 pb-2 mb-6">Bill To Address</h4>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                        <div className="bg-blue-50/40 p-5 rounded-[2rem] border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                                                                            <div className="flex items-center gap-3 mb-4">
                                                                                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-black">
                                                                                    1
                                                                                </div>
                                                                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Bill To</span>
                                                                            </div>
                                                                            <p className="text-[10px] font-bold text-gray-500 mb-1">{cust?.billToAddress?.branchName || '---'}</p>
                                                                            <p className="text-xs font-semibold text-gray-700 leading-relaxed mb-4">{cust?.billToAddress?.address || '---'}</p>
                                                                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-blue-50">
                                                                                <div>
                                                                                    <p className="text-[9px] font-black text-gray-300 uppercase">Contact</p>
                                                                                    <p className="text-xs font-semibold text-gray-700">{cust?.billToAddress?.customerContactName || '---'}</p>
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-[9px] font-black text-gray-300 uppercase">Phone</p>
                                                                                    <p className="text-xs font-semibold text-gray-700">{cust?.billToAddress?.customerContactNumber || '---'}</p>
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-[9px] font-black text-gray-300 uppercase">Currency</p>
                                                                                    <p className="text-[10px] font-bold text-blue-600">{cust?.billToAddress?.billingCurrency || '---'}</p>
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-[9px] font-black text-gray-300 uppercase">Billing Mode</p>
                                                                                    <p className="text-[10px] font-bold text-blue-600">{cust?.billToAddress?.billingMode || '---'}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Ship To Addresses */}
                                                            {cust?.customerShipToDetails?.length > 0 && (
                                                                <div className="md:col-span-4 mt-4">
                                                                    <h4 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest border-b border-emerald-100 pb-2 mb-6">Ship To Addresses</h4>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                        {cust?.customerShipToDetails?.map((addr, idx) => (
                                                                            <div key={idx} className="bg-emerald-50/40 p-5 rounded-[2rem] border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
                                                                                <div className="flex items-center gap-3 mb-4">
                                                                                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black">
                                                                                        {idx + 1}
                                                                                    </div>
                                                                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Ship To</span>
                                                                                </div>
                                                                                <p className="text-[10px] font-bold text-gray-500 mb-1">{addr?.branchName || '---'}</p>
                                                                                <p className="text-xs font-semibold text-gray-700 leading-relaxed mb-4">{addr?.address || addr?.branchAddress || '---'}</p>
                                                                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-emerald-50">
                                                                                    <div>
                                                                                        <p className="text-[9px] font-black text-gray-300 uppercase">Contact</p>
                                                                                        <p className="text-xs font-semibold text-gray-700">{addr?.contactPerson || '---'}</p>
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-[9px] font-black text-gray-300 uppercase">Phone</p>
                                                                                        <p className="text-xs font-semibold text-gray-700">{addr?.mobileNo || '---'}</p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Documents */}
                                                            <div className="md:col-span-4 mt-6">
                                                                <h4 className="text-[11px] font-black text-erp-accent/80 uppercase tracking-widest border-b border-erp-accent/10 pb-2 mb-6">Verification Documents</h4>
                                                                <div className="flex flex-wrap gap-8">
                                                                    <DocumentChip label="GST Certificate" url={cust?.gstCertificateImg || cust?.GSTCertificateImg} />
                                                                    <DocumentChip label="Aadhar Card" url={cust?.aadharCardImg || cust?.AadharCardImg || cust?.aadharImage} />
                                                                    <DocumentChip label="PAN Card" url={cust?.panCardImg || cust?.PANCardImg || cust?.panImage} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                                {Array(emptyRowsCount).fill(0).map((_, i) => (
                                    <tr key={`empty-${i}`} className="border-b border-gray-100 last:border-b-0 h-14">
                                        <td className="border-r border-gray-100"></td>
                                        <td className="border-r border-gray-100"></td>
                                        <td className="border-r border-gray-100"></td>
                                        <td className="border-r border-gray-100"></td>
                                        <td className="border-r border-gray-100"></td>
                                        <td className="border-r border-gray-100"></td>
                                        <td className="border-r border-gray-100"></td>
                                        <td></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

                {!loading && pagination.totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 py-4 border-t border-gray-100">
                        <button
                            disabled={pagination.currentPage === 1}
                            onClick={() => fetchCustomers(pagination.currentPage - 1)}
                            className="p-2 rounded-full border border-gray-200 disabled:opacity-30 hover:bg-erp-accent/5 transition-colors"
                        >
                            <Icon icon="mdi:chevron-left" className="text-xl" />
                        </button>
                        <span className="text-sm font-medium">Page {pagination.currentPage} of {pagination.totalPages}</span>
                        <button
                            disabled={pagination.currentPage === pagination.totalPages}
                            onClick={() => fetchCustomers(pagination.currentPage + 1)}
                            className="p-2 rounded-full border border-gray-200 disabled:opacity-30 hover:bg-erp-accent/5 transition-colors"
                        >
                            <Icon icon="mdi:chevron-right" className="text-xl" />
                        </button>
                    </div>
                )}
            </div>

            {/* Action Menu Portal Popup */}
            {activeActionMenu && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-[9990]"
                        onClick={() => setActiveActionMenu(null)}
                    />
                    <div
                        className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden min-w-[150px] animate-in fade-in zoom-in-95 duration-150"
                        style={{
                            top: Math.min(window.innerHeight - 200, activeActionMenu.top - window.scrollY - 10),
                            left: Math.max(10, activeActionMenu.left - window.scrollX - 160)
                        }}
                    >
                        <button
                            onClick={() => { navigate(`/accounting/customer-statement/${activeActionMenu.id}`); setActiveActionMenu(null); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                            <Icon icon="mdi:book-open-page-variant" className="text-lg" />
                            Khata Statement
                        </button>
                        <button
                            onClick={() => {
                                setAccountingPaymentCustomer({
                                    _id: activeActionMenu.cust._id,
                                    shopName: activeActionMenu.cust.shopName,
                                    ownerName: activeActionMenu.cust.ownerName,
                                    mobile: activeActionMenu.cust.mobileNo1 || activeActionMenu.cust.mobile,
                                    currentBalance: 0
                                });
                                setActiveActionMenu(null);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                            <Icon icon="mdi:cash-plus" className="text-lg" />
                            Collect Payment
                        </button>
                        <button
                            onClick={() => { navigate(`/customer/profile/${activeActionMenu.id}`); setActiveActionMenu(null); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-erp-accent/5 hover:text-erp-accent transition-colors"
                        >
                            <Icon icon="mdi:eye" className="text-lg" />
                            View Profile
                        </button>
                        <PermissionWrapper permission="UPDATE_CUSTOMER">
                            <button
                                onClick={() => { navigate(`${PATHS.CUSTOMER.SHIP_TO}?customerId=${activeActionMenu.id}`); setActiveActionMenu(null); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                                <Icon icon="mdi:truck-delivery-outline" className="text-lg" />
                                Edit Ship-To
                            </button>
                        </PermissionWrapper>
                        <PermissionWrapper permission="UPDATE_CUSTOMER">
                            <button className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-blue-500 hover:bg-blue-50 border-y border-gray-50 transition-colors">
                                <Icon icon="mdi:pencil" className="text-lg" />
                                Edit
                            </button>
                        </PermissionWrapper>
                        <PermissionWrapper permission="DELETE_CUSTOMER">
                            <button
                                onClick={() => { handleDeactivateClick(activeActionMenu.cust); setActiveActionMenu(null); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <Icon icon="mdi:account-off" className="text-lg" />
                                Deactivate
                            </button>
                        </PermissionWrapper>
                        <PermissionWrapper permission="UPDATE_CUSTOMER">
                            <button
                                onClick={() => { setSelectedCustomerForContactEdit(activeActionMenu.cust); setActiveActionMenu(null); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-indigo-600 hover:bg-indigo-50 border-t border-gray-50 transition-colors"
                            >
                                <Icon icon="mdi:phone-edit" className="text-lg" />
                                Update Contact (Demo)
                            </button>
                        </PermissionWrapper>
                        <PermissionWrapper permission="APPROVE_ORDER">
                            {(activeActionMenu.cust?.approvalStatus === 'PENDING_FINANCE' || !activeActionMenu.cust?.approvalStatus) && (
                                <button
                                    onClick={() => { handleCorrectionClick(activeActionMenu.cust); setActiveActionMenu(null); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-amber-600 hover:bg-amber-50 transition-colors border-t border-gray-50"
                                >
                                    <Icon icon="mdi:comment-alert" className="text-lg" />
                                    Correction
                                </button>
                            )}
                        </PermissionWrapper>
                    </div>
                </>,
                document.body
            )}

            {/* Standalone Demo Contact Edit Modal */}
            <UpdateCustomerContactModal
                isOpen={!!selectedCustomerForContactEdit}
                onClose={() => setSelectedCustomerForContactEdit(null)}
                customer={selectedCustomerForContactEdit}
                onSuccess={() => fetchCustomers(pagination.currentPage)}
            />

            {/* Customer Detail Modal */}
            {selectedCustomer && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col scale-in-center">
                        <div className="bg-erp-accent p-6 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Icon icon="mdi:account-details" className="text-2xl" />
                                <h2 className="text-xl font-bold">Customer Details: {selectedCustomer.shopName}</h2>
                            </div>
                            <button onClick={() => setSelectedCustomer(null)} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                                <Icon icon="mdi:close" className="text-2xl" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 pb-12">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Section: Basic Info */}
                                <div className="space-y-4 md:col-span-3">
                                    <h3 className="text-erp-accent font-bold uppercase text-xs tracking-widest border-b pb-2">Basic Information</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        <DetailItem label="Shop Name" value={selectedCustomer?.shopName} />
                                        <DetailItem label="Owner Name" value={selectedCustomer?.ownerName || selectedCustomer?.proprietorName} />
                                        <DetailItem label="Business Type" value={selectedCustomer?.businessType?.name || selectedCustomer?.businessType || selectedCustomer?.CustomerType} />
                                        <DetailItem label="Order Mode" value={selectedCustomer?.orderMode} />
                                        <DetailItem label="Email" value={selectedCustomer?.businessEmail || selectedCustomer?.emailId} />
                                        <DetailItem label="Mobile 1" value={selectedCustomer?.mobileNo1} />
                                        <DetailItem label="Mobile 2" value={selectedCustomer?.mobileNo2} />
                                        <DetailItem label="Landline" value={selectedCustomer?.landlineNo} />
                                    </div>
                                </div>

                                {/* Section: Configuration */}
                                <div className="space-y-4 md:col-span-3">
                                    <h3 className="text-erp-accent font-bold uppercase text-xs tracking-widest border-b pb-2">Configuration & Logistics</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        <DetailItem label="Username" value={selectedCustomer?.username} />
                                        <DetailItem label="Zone" value={selectedCustomer?.zone?.name || selectedCustomer?.zone} />
                                        <DetailItem label="Flat Fitting" value={selectedCustomer?.hasFlatFitting ? 'YES' : 'NO'} />
                                        <DetailItem label="Sales Person" value={selectedCustomer?.salesPerson?.name || selectedCustomer?.salesPerson} />
                                        <DetailItem label="Plant" value={selectedCustomer?.plant?.name || selectedCustomer?.plant} />
                                        <DetailItem label="Lab" value={selectedCustomer?.specificLab?.name || selectedCustomer?.lab} />
                                        <DetailItem label="Fitting Centre" value={selectedCustomer?.fittingCenter?.name || selectedCustomer?.fittingCenter} />
                                        <DetailItem label="Credit Limit" value={selectedCustomer?.creditLimit} />
                                        <DetailItem label="Credit Days" value={selectedCustomer?.creditDays?.name || selectedCustomer?.creditDays} />
                                        <DetailItem label="Courier" value={selectedCustomer?.courierName?.name || selectedCustomer?.courierName} />
                                        <DetailItem label="Courier Time" value={selectedCustomer?.courierTime?.name || selectedCustomer?.courierTime} />
                                    </div>
                                </div>

                                {/* Section: Addresses */}
                                <div className="space-y-4 md:col-span-3">
                                    <h3 className="text-erp-accent font-bold uppercase text-xs tracking-widest border-b pb-2">Registered Addresses</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {([selectedCustomer?.billToAddress, ...(selectedCustomer?.customerShipToDetails || selectedCustomer?.address || [])].filter(Boolean)).map((addr, idx) => (
                                            <div key={idx} className="bg-erp-accent/5/50 p-4 rounded-2xl border border-erp-accent/10">
                                                <p className="font-bold text-gray-800 text-sm mb-2 italic">Address {idx + 1}</p>
                                                <p className="text-xs text-gray-600 mb-1">{addr?.address || addr?.address1 || addr?.branchAddress}</p>
                                                <p className="text-xs text-gray-600 mb-2">{addr?.city}, {addr?.state}, {addr?.country} - {addr?.zipCode}</p>
                                                <div className="flex justify-between text-[10px] font-bold text-erp-accent/80">
                                                    <span>Contact: {addr?.customerContactName || addr?.contactPerson}</span>
                                                    <span>{addr?.billingCurrency}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Section: Identity Details (Aadhar/PAN) - Only if not GST registered */}
                                {!(selectedCustomer?.isGSTRegistered || selectedCustomer?.IsGSTRegistered) && (
                                    <div className="space-y-4 md:col-span-3">
                                        <h3 className="text-erp-accent font-bold uppercase text-xs tracking-widest border-b pb-2">Identity Details (Non-GST)</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                            <DetailItem label="Aadhar Card No." value={selectedCustomer?.aadharCard || selectedCustomer?.AadharCard} />
                                            <DetailItem label="PAN Card No." value={selectedCustomer?.panCard || selectedCustomer?.PANCard} />
                                        </div>
                                    </div>
                                )}

                                {/* Section: Documents */}
                                <div className="space-y-4 md:col-span-3">
                                    <h3 className="text-erp-accent font-bold uppercase text-xs tracking-widest border-b pb-2">Verification Documents</h3>
                                    <div className="flex flex-wrap gap-8">
                                        <DocumentChip label="GST Certificate" url={selectedCustomer?.gstCertificateImg || selectedCustomer?.GSTCertificateImg} />
                                        <DocumentChip label="Aadhar Card" url={selectedCustomer?.aadharCardImg || selectedCustomer?.AadharCardImg || selectedCustomer?.aadharImage} />
                                        <DocumentChip label="PAN Card" url={selectedCustomer?.panCardImg || selectedCustomer?.PANCardImg || selectedCustomer?.panImage} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* View Loading Overlay */}
            {viewLoading && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-erp-accent"></div>
                </div>,
                document.body
            )}
            <ConfirmationModal
                isOpen={!!selectedCustomerForDeactivate}
                onClose={() => setSelectedCustomerForDeactivate(null)}
                onConfirm={handleConfirmDeactivate}
                loading={deactivateLoading}
                title="Deactivate Customer"
                message={`Are you sure you want to deactivate ${selectedCustomerForDeactivate?.shopName}? This action will restrict their access.`}
                confirmText="Deactivate"
                type="danger"
            />

            <CorrectionRequestModal
                isOpen={!!selectedCustomerForCorrection}
                onClose={() => setSelectedCustomerForCorrection(null)}
                onSubmit={handleConfirmCorrection}
                loading={correctionLoading}
                customerName={selectedCustomerForCorrection?.shopName}
            />
        </div>
    );
};

const DetailItem = ({ label, value }) => (
    <div className="space-y-1">
        <p className="text-[10px] uppercase   text-gray-400 font-bold">{label}</p>
        <p className="text-sm font-semibold text-gray-700">{value || '---'}</p>
    </div>
);

const DocumentChip = ({ label, url }) => (
    <div className="flex flex-col gap-2">
        <span className="text-[10px] uppercase font-bold text-gray-400">{label}</span>
        {url ? (
            <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-erp-accent/5 text-erp-accent/80 px-4 py-2 rounded-xl border border-erp-accent/10 hover:bg-amber-100 transition-colors">
                <Icon icon="mdi:file-document-outline" className="text-xl" />
                <span className="text-xs font-bold uppercase">View Document</span>
            </a>
        ) : (
            <div className="flex items-center gap-2 bg-gray-50 text-gray-400 px-4 py-2 rounded-xl border border-dashed border-gray-200">
                <Icon icon="mdi:file-document-outline" className="text-xl" />
                <span className="text-xs font-bold uppercase italic">Not Uploaded</span>
            </div>
        )}
    </div>
);

const FilterSelect = ({ placeholder, value, onChange, options = [], icon }) => (
    <div className="relative flex items-center bg-white rounded-lg border border-gray-200 px-3 py-1.5 focus-within:ring-2 focus-within:ring-[#2980B9]/20 focus-within:border-[#2980B9] transition-all w-full group">
        {icon && <Icon icon={icon} className="text-gray-400 text-base mr-2 group-focus-within:text-[#1F618D] transition-colors" />}
        <select
            value={value}
            onChange={onChange}
            className="text-xs text-gray-700 outline-none w-full bg-transparent appearance-none cursor-pointer pr-6 font-semibold"
        >
            <option value="">{placeholder}</option>
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
        <div className="absolute right-3 pointer-events-none text-gray-400 group-hover:text-[#1F618D] transition-colors">
            <Icon icon="mdi:chevron-down" className="text-base" />
        </div>
    </div>
);

const FilterInput = ({ placeholder, value, onChange, icon }) => (
    <div className="relative flex items-center bg-white rounded-lg border border-gray-200 px-3 py-1.5 focus-within:ring-2 focus-within:ring-[#2980B9]/20 focus-within:border-[#2980B9] transition-all w-full group">
        {icon && <Icon icon={icon} className="text-gray-400 text-base mr-2 group-focus-within:text-[#1F618D] transition-colors" />}
        <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className="text-xs text-gray-700 outline-none w-full bg-transparent font-semibold placeholder:text-gray-300"
        />
    </div>
);

export default CustomerList;


