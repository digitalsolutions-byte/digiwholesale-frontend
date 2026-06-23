import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import { getEmployeeById, updateEmployee } from '../services/employeeService';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_ACCESS_OPTIONS = [
    { value: 'DASHBOARD', label: 'Dashboard' },
    { value: 'REGISTER_CUSTOMER', label: 'Register Customer' },
    { value: 'REGISTER_STAFF', label: 'Register Staff' },
    { value: 'STAFF_LIST', label: 'Staff List' },
    { value: 'CUSTOMER_LIST', label: 'Customer List' },
    { value: 'SHIP_TO', label: 'Ship To' },
    { value: 'APPROVALS', label: 'Approvals' },
    { value: 'CORRECTIONS', label: 'Corrections' },
    { value: 'NEW_ORDER', label: 'New Order' },
    { value: 'ALL_ORDERS', label: 'All Orders' },
    { value: 'PENDING_ORDERS', label: 'Pending Orders' },
    { value: 'OTHER_SALES', label: 'Other Sales' },
    { value: 'SALES_LIST', label: 'Sales List' },
    { value: 'RETURN_REFUND', label: 'Return & Refund' },
    { value: 'EXCHANGE_REQUESTS', label: 'Exchange Requests' },
    { value: 'DRAFTS', label: 'Drafts' },
    { value: 'DAILY_REPORT', label: 'Daily Report' },
    { value: 'MAIN_REPORT', label: 'Main Report' },
    { value: 'ADD_REPAIR', label: 'Add Repair' },
    { value: 'REPAIR_LIST', label: 'Repair List' },
    { value: 'ADD_VENDOR', label: 'Add Vendor' },
    { value: 'VENDOR_LIST', label: 'Vendor List' },
    { value: 'VENDOR_ORDER', label: 'Vendor Order' },
    { value: 'QUALITY', label: 'Quality' },
    { value: 'FITTING', label: 'Fitting' },
    { value: 'SHIPPING', label: 'Shipping' },
    { value: 'INVENTORY', label: 'Inventory' },
];

const ACCESS_PERMISSION_OPTIONS = [
    { value: 'ADD_STAFF',         label: 'Add Staff' },
    { value: 'UPDATE_STAFF',      label: 'Update Staff' },
    { value: 'DELETE_STAFF',      label: 'Delete Staff' },
    { value: 'ADD_CUSTOMER',      label: 'Add Customer' },
    { value: 'UPDATE_CUSTOMER',   label: 'Update Customer' },
    { value: 'DELETE_CUSTOMER',   label: 'Delete Customer' },
    { value: 'ADD_ORDER',         label: 'Add Order' },
    { value: 'UPDATE_ORDER',      label: 'Update Order' },
    { value: 'DELETE_ORDER',      label: 'Delete Order' },
    { value: 'APPROVE_ORDER',     label: 'Approve Order' },
    { value: 'ADD_DRAFT',         label: 'Add Draft' },
    { value: 'UPDATE_DRAFT',      label: 'Update Draft' },
    { value: 'DELETE_DRAFT',      label: 'Delete Draft' },
    { value: 'ADD_REPAIR',        label: 'Add Repair' },
    { value: 'UPDATE_REPAIR',     label: 'Update Repair' },
    { value: 'DELETE_REPAIR',     label: 'Delete Repair' },
    { value: 'ADD_VENDOR',        label: 'Add Vendor' },
    { value: 'UPDATE_VENDOR',     label: 'Update Vendor' },
    { value: 'DELETE_VENDOR',     label: 'Delete Vendor' },
    { value: 'UPDATE_QUALITY',    label: 'Update Quality' },
    { value: 'UPDATE_FITTING',    label: 'Update Fitting' },
    { value: 'UPDATE_SHIPPING',   label: 'Update Shipping' },
    { value: 'UPDATE_INVENTORY',  label: 'Update Inventory' },
    { value: 'VIEW_REPORTS',      label: 'View Reports' },
    { value: 'EXPORT_REPORTS',    label: 'Export Reports' },
];

const SectionHeader = ({ title, onToggleAll, allSelected }) => (
    <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-erp-accent">{title}</h3>
        <button
            type="button"
            onClick={onToggleAll}
            className="text-[10px] font-black uppercase tracking-widest text-erp-accent/70 hover:text-erp-accent border border-erp-accent/20 hover:border-erp-accent/50 px-3 py-1.5 rounded-full transition-all hover:bg-erp-accent/5"
        >
            {allSelected ? 'Deselect All' : 'Select All'}
        </button>
    </div>
);

const CheckboxGrid = ({ options, selected, onToggle }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
        {options.map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                <div className="relative flex-shrink-0">
                    <input
                        type="checkbox"
                        className="sr-only"
                        checked={selected.includes(opt.value)}
                        onChange={() => onToggle(opt.value)}
                    />
                    <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center
                        ${selected.includes(opt.value)
                            ? 'bg-erp-accent border-erp-accent'
                            : 'border-gray-300 group-hover:border-erp-accent/50'}`}
                    >
                        {selected.includes(opt.value) && (
                            <Icon icon="mdi:check" className="text-white text-[10px]" />
                        )}
                    </div>
                </div>
                <span className="text-[11px] font-bold text-gray-600 group-hover:text-gray-800 transition-colors leading-tight">
                    {opt.label}
                </span>
            </label>
        ))}
    </div>
);

const CollapsibleSection = ({ title, badge, children, defaultOpen = false }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="rounded-2xl border border-gray-100 bg-gray-50/50 overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-100/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="text-sm font-black uppercase tracking-widest text-erp-accent">{title}</span>
                    {badge > 0 && (
                        <span className="px-2 py-0.5 bg-erp-accent text-white text-[10px] font-black rounded-full">
                            {badge}
                        </span>
                    )}
                </div>
                <Icon
                    icon="mdi:chevron-down"
                    className={`text-erp-accent/60 text-xl transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {open && <div className="px-6 pb-6">{children}</div>}
        </div>
    );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────

const EditEmployeeModal = ({ employeeId, onClose, onSaved }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [employee, setEmployee] = useState(null);

    const [pageAccess, setPageAccess] = useState([]);
    const [accessPermissions, setAccessPermissions] = useState([]);

    // Fetch employee on mount
    useEffect(() => {
        const fetchEmployee = async () => {
            setLoading(true);
            try {
                const res = await getEmployeeById(employeeId);
                const user = res?.data?.user || res?.data || res;
                setEmployee(user);
                setPageAccess(user.pageAccess || []);
                // Strip any legacy _USER values the backend no longer accepts
                const VALID_PERMISSIONS = new Set(ACCESS_PERMISSION_OPTIONS.map(o => o.value));
                setAccessPermissions(
                    (user.accessPermissions || []).filter(p => VALID_PERMISSIONS.has(p))
                );
            } catch (err) {
                toast.error(err?.message || 'Failed to load employee details');
                onClose();
            } finally {
                setLoading(false);
            }
        };
        fetchEmployee();
    }, [employeeId]);

    // Close on Escape key
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const toggleArrayItem = (list, setList, value) => {
        setList(prev =>
            prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
        );
    };

    const toggleAll = (options, list, setList) => {
        setList(list.length === options.length ? [] : options.map(o => o.value));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await updateEmployee(employeeId, {
                pageAccess,
                accessPermissions,
            });
            toast.success('Employee updated successfully');
            onSaved(response?.data?.user || response?.data || null);
            onClose();
        } catch (err) {
            toast.error(err?.error?.message || err?.message || 'Failed to update employee');
        } finally {
            setSaving(false);
        }
    };

    return (
        // Backdrop
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-100 animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 flex-shrink-0">
                    <div>
                        <h2 className="text-base font-black uppercase tracking-widest text-gray-800">
                            Edit Permissions
                        </h2>
                        {employee && (
                            <p className="text-[11px] text-gray-400 font-bold mt-0.5">
                                {employee.employeeName} · {employee.username}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                    >
                        <Icon icon="mdi:close" className="text-xl" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 px-8 py-6 space-y-4 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center items-center h-48">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-erp-accent" />
                        </div>
                    ) : (
                        <>
                            {/* Section 1 — Page Access */}
                            <CollapsibleSection
                                title="Page Access"
                                badge={pageAccess.length}
                                defaultOpen={true}
                            >
                                <SectionHeader
                                    title="Page Access"
                                    allSelected={pageAccess.length === PAGE_ACCESS_OPTIONS.length}
                                    onToggleAll={() => toggleAll(PAGE_ACCESS_OPTIONS, pageAccess, setPageAccess)}
                                />
                                <CheckboxGrid
                                    options={PAGE_ACCESS_OPTIONS}
                                    selected={pageAccess}
                                    onToggle={(v) => toggleArrayItem(pageAccess, setPageAccess, v)}
                                />
                                {pageAccess.length > 0 && (
                                    <p className="mt-3 text-[10px] font-black text-erp-accent/60 uppercase tracking-widest">
                                        {pageAccess.length} page{pageAccess.length !== 1 ? 's' : ''} selected
                                    </p>
                                )}
                            </CollapsibleSection>

                            {/* Section 2 — Access Permissions */}
                            <CollapsibleSection
                                title="Access Permissions"
                                badge={accessPermissions.length}
                                defaultOpen={true}
                            >
                                <SectionHeader
                                    title="Access Permissions"
                                    allSelected={accessPermissions.length === ACCESS_PERMISSION_OPTIONS.length}
                                    onToggleAll={() => toggleAll(ACCESS_PERMISSION_OPTIONS, accessPermissions, setAccessPermissions)}
                                />
                                <CheckboxGrid
                                    options={ACCESS_PERMISSION_OPTIONS}
                                    selected={accessPermissions}
                                    onToggle={(v) => toggleArrayItem(accessPermissions, setAccessPermissions, v)}
                                />
                                {accessPermissions.length > 0 && (
                                    <p className="mt-3 text-[10px] font-black text-erp-accent/60 uppercase tracking-widest">
                                        {accessPermissions.length} permission{accessPermissions.length !== 1 ? 's' : ''} selected
                                    </p>
                                )}
                            </CollapsibleSection>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-gray-100 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="px-6 py-2.5 rounded-full border border-gray-200 text-gray-500 text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="px-8 py-2.5 rounded-full bg-erp-accent text-white text-xs font-black uppercase tracking-widest hover:bg-erp-accent/90 transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditEmployeeModal;
