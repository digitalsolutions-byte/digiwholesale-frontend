import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { getAllEmployees, deleteEmployee } from '../services/employeeService';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import EditEmployeeModal from '../components/EditEmployeeModal';
import { getAllDepartments } from '../services/departmentService';
import { getSystemConfigs } from '../services/configService';
import { toast } from 'react-toastify';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

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

const EmployeeList = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [configs, setConfigs] = useState({ departments: [], employeeTypes: [] });
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [activeActionMenu, setActiveActionMenu] = useState(null);
    const [selectedEmployeeForDelete, setSelectedEmployeeForDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [viewLoading, setViewLoading] = useState(false);
    const [editEmployeeId, setEditEmployeeId] = useState(null);

    // Filter States
    const [filters, setFilters] = useState({
        search: '',
        department: '',
        EmployeeType: '',
        fromDate: '',
        toDate: ''
    });

    const [searchTerm, setSearchTerm] = useState('');

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
        toast.info("Username copied to clipboard", {
            position: "bottom-center",
            autoClose: 1500,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: false,
            theme: "colored",
        });
    };

    const fetchConfigs = async () => {
        try {
            const [deptRes, configRes] = await Promise.all([
                getAllDepartments(),
                getSystemConfigs()
            ]);

            setConfigs({
                departments: deptRes.data || [],
                employeeTypes: configRes.data?.find(c => c.configType === 'EmployeeType')?.values || []
            });
        } catch (error) {
            console.error('Error fetching configs:', error);
        }
    };

    const fetchEmployees = async (page = 1, currentFilters = filters) => {
        setLoading(true);
        try {
            const activeFilters = Object.fromEntries(
                Object.entries(currentFilters).filter(([_, v]) => v !== '')
            );
            const response = await getAllEmployees(page, 10, activeFilters);
            if (response.success) {
                setEmployees(response.data.users);
                setPagination(response.data.pagination);
            }
        } catch {
            toast.error('Failed to load employees');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (emp) => {
        setSelectedEmployeeForDelete(emp);
        setActiveActionMenu(null);
    };

    const handleConfirmDelete = async () => {
        if (!selectedEmployeeForDelete) return;

        setDeleteLoading(true);
        try {
            await deleteEmployee(selectedEmployeeForDelete._id);
            toast.success('Employee deleted successfully');
            await fetchEmployees(pagination.currentPage);
        } catch (error) {
            console.error('Error deleting employee:', error);
            toast.error(error.message || 'Failed to delete employee');
        } finally {
            setDeleteLoading(false);
            setSelectedEmployeeForDelete(null);
        }
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setFilters(prev => ({ ...prev, search: searchTerm }));
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        fetchEmployees(1, filters);
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
            department: '',
            EmployeeType: '',
            fromDate: '',
            toDate: ''
        });
    };

    const emptyRowsCount = Math.max(0, 10 - employees.length);

    return (
        <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto p-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-gray-100/80 flex flex-col gap-4 md:gap-6 ">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-wrap items-end gap-3 md:gap-6">
                    {/* Search - Full width on mobile/tablet, flexible on desktop */}
                    <div className="flex flex-col gap-1.5 col-span-1 md:col-span-2 lg:min-w-[300px] lg:flex-1">
                        <span className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] ml-2 md:ml-5">Search By Name, Username, Employee Code, Email & Phone</span>
                        <FilterInput
                            placeholder="Start typing..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            icon="mdi:account-search"
                        />
                    </div>

                    {/* Department */}
                    <div className="flex flex-col gap-1.5 w-full lg:w-auto lg:min-w-[160px]">
                        <span className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] ml-2 md:ml-5">Department</span>
                        <FilterSelect
                            placeholder="All Departments"
                            value={filters.department}
                            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                            options={configs.departments.map(d => ({ label: d.name, value: d.name }))}
                            icon="mdi:office-building"
                        />
                    </div>
                    {console.log('filters.employeeType', configs.employeeTypes)}

                    {/* Employee Type */}
                    <div className="flex flex-col gap-1.5 w-full lg:w-auto lg:min-w-[160px]">
                        <span className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] ml-2 md:ml-5">Employee Type</span>
                        <FilterSelect
                            placeholder="All Types"
                            value={filters.EmployeeType}
                            onChange={(e) => setFilters({ ...filters, EmployeeType: e.target.value })}
                            options={configs.employeeTypes.map(t => ({ label: t, value: t }))}
                            icon="mdi:account-badge-outline"
                        />
                    </div>

                    {/* Quick Date */}
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

                    {/* Access Start Period */}
                    <div className="flex flex-col gap-1.5 col-span-1 md:col-span-2 lg:min-w-[380px]">
                        <span className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] ml-2 md:ml-5">Access Start Period</span>
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
                        className="flex items-center justify-center gap-2 text-gray-400 hover:text-erp-accent/80 px-5 py-2.5 rounded-full hover:bg-erp-accent/10 transition-all duration-300 font-black text-[10px] uppercase tracking-widest group border border-transparent hover:border-erp-accent/20 shadow-sm hover:shadow-md w-full md:w-auto"
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
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="bg-erp-accent text-white">
                                    <th className="py-4 px-4 font-semibold text-xs border-r border-erp-accent/80/20 last:border-r-0 text-center uppercase  ">Employee Code</th>
                                    <th className="py-4 px-6 font-semibold text-xs border-r border-erp-accent/80/20 last:border-r-0 text-center uppercase  ">Name</th>
                                    <th className="py-4 px-4 font-semibold text-xs border-r border-erp-accent/80/20 last:border-r-0 text-center uppercase  ">Department</th>
                                    <th className="py-4 px-4 font-semibold text-xs border-r border-erp-accent/80/20 last:border-r-0 text-center uppercase  ">Type</th>
                                    <th className="py-4 px-6 font-semibold text-xs border-r border-erp-accent/80/20 last:border-r-0 text-center uppercase  ">Phone</th>
                                    <th className="py-4 px-4 font-semibold text-xs border-r border-erp-accent/80/20 last:border-r-0 text-center uppercase  ">Status</th>
                                    <th className="py-4 px-4 font-semibold text-xs text-center uppercase  ">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-600">
                                {employees.map((emp) => (
                                    <React.Fragment key={emp._id}>
                                        <tr
                                            className={`border-b border-gray-100 last:border-b-0 hover:bg-erp-accent/10/20 transition-all h-16 cursor-pointer ${expandedRows.has(emp._id) ? 'bg-erp-accent/10/10' : ''}`}
                                            onClick={() => toggleRow(emp._id)}
                                        >
                                            <td className="px-4 py-2 text-center border-r border-gray-50">
                                                <span className="text-xs font-black text-erp-accent/80 font-mono tracking-tighter">
                                                    {emp?.employeeCode || emp.serialNumber || '---'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-2 text-center border-r border-gray-50">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-gray-800 tracking-tight">{emp?.employeeName || '---'}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase  ">{emp?.username || '---'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-center border-r border-gray-50">
                                                <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-[9px] font-black uppercase tracking-widest border border-gray-200">
                                                    {emp?.Department?.name || emp?.Department || '---'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-center border-r border-gray-50 uppercase text-[10px] font-black tracking-widest text-gray-500">
                                                {emp.EmployeeType?.name || emp.EmployeeType || '---'}
                                            </td>
                                            <td className="px-6 py-2 text-center border-r border-gray-50 text-xs font-semibold text-gray-600">
                                                {emp.phone || '---'}
                                            </td>
                                            <td className="px-4 py-2 text-center border-r border-gray-50">
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${emp.isActive ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                                    {emp.isActive ? 'ACTIVE' : 'INACTIVE'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-center relative" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => setActiveActionMenu(activeActionMenu === emp._id ? null : emp._id)}
                                                    className={`p-2 rounded-xl transition-all ${activeActionMenu === emp._id ? 'bg-erp-accent text-white shadow-lg' : 'text-gray-400 hover:text-erp-accent hover:bg-erp-accent/10'}`}
                                                >
                                                    <Icon icon="mdi:dots-vertical" className="w-6 h-6" />
                                                </button>

                                                {activeActionMenu === emp._id && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-[60]"
                                                            onClick={() => setActiveActionMenu(null)}
                                                        />
                                                        <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 z-[70] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden min-w-[140px] animate-in fade-in slide-in-from-right-4 duration-200">
                                                            <button
                                                                onClick={() => { toggleRow(emp._id); setActiveActionMenu(null); }}
                                                                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-erp-accent/10 hover:text-erp-accent/80 transition-colors"
                                                            >
                                                                <Icon icon="mdi:eye" className="text-lg" />
                                                                View
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setEditEmployeeId(emp._id);
                                                                    setActiveActionMenu(null);
                                                                }}
                                                                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors border-y border-gray-50">
                                                                <Icon icon="mdi:pencil" className="text-lg" />
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteClick(emp)}
                                                                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                                                            >
                                                                <Icon icon="mdi:trash-can" className="text-lg" />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </td>
                                        </tr>

                                        {expandedRows.has(emp._id) && (
                                            <tr className="bg-gray-50/50">
                                                <td colSpan="7" className="p-0 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                                                    <div className="p-10 border-x-4 border-erp-accent/20 bg-gradient-to-br from-white to-erp-accent/10/30">
                                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                                                            <div className="space-y-6">
                                                                <h4 className="text-[11px] font-black text-erp-accent/80 uppercase tracking-widest border-b border-erp-accent/20 pb-2">Profile Info</h4>
                                                                <DetailItem label="Full Name" value={emp.employeeName} />
                                                                <DetailItem label="Username (Copy)" onClick={() => copyToClipboard(emp.username)} value={emp.username} />
                                                                <DetailItem label="Employee Type" value={emp.EmployeeType?.name || emp.EmployeeType} />
                                                                <DetailItem label="Serial No." value={`#${emp.serialNumber}`} />
                                                            </div>

                                                            <div className="space-y-6">
                                                                <h4 className="text-[11px] font-black text-erp-accent/80 uppercase tracking-widest border-b border-erp-accent/20 pb-2">Contact</h4>
                                                                <DetailItem label="Email ID" value={emp.email} />
                                                                <DetailItem label="Phone Number" value={emp.phone} />
                                                                <DetailItem label="Account Created" value={new Date(emp.createdAt).toLocaleDateString()} />
                                                            </div>

                                                            <div className="space-y-6">
                                                                <h4 className="text-[11px] font-black text-erp-accent/80 uppercase tracking-widest border-b border-erp-accent/20 pb-2">Work & Dep.</h4>
                                                                <DetailItem label="Department" value={emp.Department?.name || emp.Department} />
                                                                <DetailItem label="Sub Roles" value={emp.subRoles?.map(r => r.name).join(', ') || 'None'} />
                                                                <DetailItem label="Lab Access" value={emp.lab?.name || 'All'} />
                                                                <DetailItem label="Access Expiry" value={emp.expiry ? new Date(emp.expiry).toLocaleDateString() : 'Never'} />
                                                            </div>

                                                            <div className="space-y-6 md:col-span-1">
                                                                <h4 className="text-[11px] font-black text-erp-accent/80 uppercase tracking-widest border-b border-erp-accent/20 pb-2">Address</h4>
                                                                <DetailItem label="Registered Address" value={emp.address} />
                                                                <DetailItem label="Country" value={emp.country} />
                                                                <DetailItem label="Pincode" value={emp.pincode} />
                                                            </div>

                                                            <div className="md:col-span-4 mt-6">
                                                                <h4 className="text-[11px] font-black text-erp-accent/80 uppercase tracking-widest border-b border-erp-accent/20 pb-2 mb-6">Staff Documents</h4>
                                                                <div className="flex flex-wrap gap-8">
                                                                    <a href={emp.aadharCard} target="_blank" rel="noreferrer" className={`flex items-center gap-3 p-4 bg-white border border-erp-accent/20 rounded-2xl hover:shadow-md transition-shadow ${!emp.aadharCard && 'opacity-30 grayscale pointer-events-none'}`}>
                                                                        <div className="w-10 h-10 rounded-full bg-erp-accent/10 flex items-center justify-center text-erp-accent">
                                                                            <Icon icon="mdi:card-account-details-outline" className="text-xl" />
                                                                        </div>
                                                                        <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Aadhar Card</span>
                                                                    </a>
                                                                    <a href={emp.panCard} target="_blank" rel="noreferrer" className={`flex items-center gap-3 p-4 bg-white border border-erp-accent/20 rounded-2xl hover:shadow-md transition-shadow ${!emp.panCard && 'opacity-30 grayscale pointer-events-none'}`}>
                                                                        <div className="w-10 h-10 rounded-full bg-erp-accent/10 flex items-center justify-center text-erp-accent">
                                                                            <Icon icon="mdi:card-text-outline" className="text-xl" />
                                                                        </div>
                                                                        <span className="text-xs font-black text-gray-500 uppercase tracking-widest">PAN Card</span>
                                                                    </a>
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
                                        <td className="border-r border-gray-50 last:border-r-0"></td>
                                        <td className="border-r border-gray-50 last:border-r-0"></td>
                                        <td className="border-r border-gray-50 last:border-r-0"></td>
                                        <td className="border-r border-gray-50 last:border-r-0"></td>
                                        <td className="border-r border-gray-50 last:border-r-0"></td>
                                        <td className="border-r border-gray-50 last:border-r-0"></td>
                                        <td></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && pagination.totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 py-4 border-t border-gray-100">
                        <button
                            disabled={pagination.currentPage === 1}
                            onClick={() => fetchEmployees(pagination.currentPage - 1)}
                            className="p-2 rounded-full border border-gray-200 disabled:opacity-30 hover:bg-erp-accent/10 transition-colors"
                        >
                            <Icon icon="mdi:chevron-left" className="text-xl" />
                        </button>
                        <span className="text-sm font-medium">Page {pagination.currentPage} of {pagination.totalPages}</span>
                        <button
                            disabled={!pagination.hasNext}
                            onClick={() => fetchEmployees(pagination.currentPage + 1)}
                            className="p-2 rounded-full border border-gray-200 disabled:opacity-30 hover:bg-erp-accent/10 transition-colors"
                        >
                            <Icon icon="mdi:chevron-right" className="text-xl" />
                        </button>
                    </div>
                )}
            </div>

            {viewLoading && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-erp-accent"></div>
                </div>
            )}

            <ConfirmationModal
                isOpen={!!selectedEmployeeForDelete}
                onClose={() => setSelectedEmployeeForDelete(null)}
                onConfirm={handleConfirmDelete}
                loading={deleteLoading}
                title="Delete Employee"
                message={`Are you sure you want to delete ${selectedEmployeeForDelete?.employeeName}? This action cannot be undone.`}
                confirmText="Delete"
                type="danger"
            />

            {editEmployeeId && (
                <EditEmployeeModal
                    employeeId={editEmployeeId}
                    onClose={() => setEditEmployeeId(null)}
                    onSaved={(updatedUser) => {
                        if (updatedUser?._id) {
                            setEmployees(prev =>
                                prev.map(emp => emp._id === updatedUser._id ? { ...emp, ...updatedUser } : emp)
                            );
                        }
                    }}
                />
            )}
        </div>
    );
};

export default EmployeeList;

const DetailItem = ({ label, value, status, onClick }) => (
    <div className={`space-y-1 ${onClick ? 'cursor-pointer group/item flex items-center gap-2' : ''}`} onClick={onClick}>
        <div className="flex flex-col flex-1">
            <p className="text-[10px] uppercase   text-gray-400 font-bold">{label}</p>
            <p className={`text-sm font-semibold ${status ? (value === 'Active' ? 'text-green-600' : 'text-red-500') : 'text-gray-700'} ${onClick ? 'group-hover/item:text-erp-accent/80 transition-colors' : ''}`}>
                {value || '---'}
            </p>
        </div>
        {onClick && <Icon icon="mdi:content-copy" className="text-erp-accent/50 opacity-0 group-hover/item:opacity-100 transition-opacity" />}
    </div>
);

const FilterSelect = ({ placeholder, value, onChange, options = [], icon }) => (
    <div className="relative flex items-center bg-gray-50/80 rounded-full border border-gray-100 px-5 py-2.5 focus-within:border-erp-accent/50 focus-within:bg-white focus-within:shadow-md transition-all duration-300 w-full group shadow-inner">
        {icon && <Icon icon={icon} className="text-gray-400 text-lg mr-3 group-focus-within:text-erp-accent transition-colors" />}
        <select
            value={value}
            onChange={onChange}
            className="text-xs text-gray-600 outline-none w-full bg-transparent appearance-none cursor-pointer pr-6 font-bold"
        >
            <option value="">{placeholder}</option>
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
        <div className="absolute right-5 pointer-events-none text-gray-300 group-hover:text-erp-accent transition-colors">
            <Icon icon="mdi:chevron-down" className="text-base" />
        </div>
    </div>
);

const FilterInput = ({ placeholder, value, onChange, icon }) => (
    <div className="relative flex items-center bg-gray-50/80 rounded-full border border-gray-100 px-5 py-2.5 focus-within:border-erp-accent/50 focus-within:bg-white focus-within:shadow-md transition-all duration-300 w-full group shadow-inner">
        {icon && <Icon icon={icon} className="text-gray-400 text-lg mr-3 group-focus-within:text-erp-accent transition-colors" />}
        <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className="text-xs text-gray-600 outline-none w-full bg-transparent font-bold placeholder:text-gray-300 placeholder:font-medium"
        />
    </div>
);


