import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { createPortal } from 'react-dom';
import { getAllPurchaseReturns, updatePurchaseReturnItemStatus, searchProductNames, submitReplacementOrder } from '../../services/vendorOrderService';
import { toast } from 'react-toastify';

// ─── Color palette (erp-* tokens only) ───────────────────────────────────────
const STATUS_META = {
    Pending:       { cls: 'bg-gray-100 text-gray-600',          icon: 'lucide:clock' },
    VendorNotified:{ cls: 'bg-[#fef2f0] text-[#E74C3C]',        icon: 'lucide:bell' },
    Replaced:      { cls: 'bg-[#eaf4fb] text-[#1F618D]',        icon: 'lucide:check-circle' },
    Closed:        { cls: 'bg-[#f0f4f8] text-[#2980B9]',        icon: 'lucide:lock' },
};

const getStatusMeta = (status) =>
    STATUS_META[status] || { cls: 'bg-gray-100 text-gray-600', icon: 'lucide:help-circle' };

// ─── ProductSearchInput (reused pattern from VendorList) ──────────────────────
function ProductSearchInput({ value, onChange, onSelect }) {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searching, setSearching] = useState(false);
    const [dropdownStyles, setDropdownStyles] = useState({});
    const debounceRef = useRef(null);
    const inputRef = useRef(null);

    const fetchSuggestions = async (q) => {
        try {
            setSearching(true);
            const res = await searchProductNames(q || '');
            const items = res?.products || res?.data || (Array.isArray(res) ? res : []);
            setSuggestions(items);
            setShowSuggestions(true);
            updateDropdownPosition();
        } catch { /* silent */ }
        finally { setSearching(false); }
    };

    const updateDropdownPosition = () => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setDropdownStyles({ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 99999 });
        }
    };

    useEffect(() => {
        if (showSuggestions) {
            updateDropdownPosition();
            window.addEventListener('scroll', updateDropdownPosition, true);
            window.addEventListener('resize', updateDropdownPosition);
            return () => {
                window.removeEventListener('scroll', updateDropdownPosition, true);
                window.removeEventListener('resize', updateDropdownPosition);
            };
        }
    }, [showSuggestions]);

    const handleChange = (e) => {
        onChange(e.target.value);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchSuggestions(e.target.value), 320);
    };

    const handleSelect = (s) => { onSelect(s); setSuggestions([]); setShowSuggestions(false); };

    useEffect(() => {
        const handler = (e) => {
            if (inputRef.current && !inputRef.current.contains(e.target) && !e.target.closest('.rpl-dropdown-portal'))
                setShowSuggestions(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="relative w-full">
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={handleChange}
                onFocus={() => fetchSuggestions(value)}
                placeholder="Search product name..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 outline-none focus:border-[#2980B9] focus:ring-2 focus:ring-[#2980B9]/20 transition-all placeholder:text-gray-300"
            />
            {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-[#2980B9]/40 border-t-[#2980B9] rounded-full animate-spin pointer-events-none" />
            )}
            {showSuggestions && suggestions.length > 0 && createPortal(
                <div className="rpl-dropdown-portal bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden" style={dropdownStyles}>
                    <div className="px-3 py-1.5 border-b border-gray-100 bg-[#eaf4fb]">
                        <p className="text-[10px] font-bold text-[#1F618D] uppercase tracking-wide">Product Suggestions</p>
                    </div>
                    <ul className="max-h-40 overflow-y-auto">
                        {suggestions.map((s, i) => (
                            <li key={i}>
                                <button onMouseDown={() => handleSelect(s)}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#eaf4fb] transition text-left">
                                    <div className="w-6 h-6 rounded bg-[#eaf4fb] flex items-center justify-center shrink-0">
                                        <Icon icon="lucide:box" className="text-[#2980B9] text-xs" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-gray-800 truncate">{s.name || s.itemName || s.productName || '—'}</p>
                                        <p className="text-[10px] text-gray-400 truncate">{s.code || s.productCode || ''}{s.category ? ` · ${s.category}` : ''}</p>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>,
                document.body
            )}
        </div>
    );
}

// ─── Replacement Order Modal ──────────────────────────────────────────────────
function ReplacementOrderModal({ returnRecord, onClose }) {
    const emptyRow = {
        productId: null, isNewProduct: false,
        productName: '', productCode: '', category: 'LENS',
        brand: '', color: '', size: '', shape: '', material: '', dimensions: '',
        unit: 'PIECE', quantity: 1, price: '', mrp: '', gstPercent: '0',
        expectedDate: '',
    };
    const [rows, setRows] = useState([emptyRow]);
    const [remarks, setRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleAddRow = () => {
        setRows(prev => [...prev, emptyRow]);
    };

    const handleRemoveRow = (index) => {
        if (rows.length === 1) return;
        setRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleSelectProduct = (index, s) => {
        setRows(prev => prev.map((r, i) => i === index ? {
            ...r,
            productId: s._id || null,
            isNewProduct: false,
            productName: s.name || s.itemName || s.productName || '',
            productCode: s.code || s.productCode || '',
            category: s.category || 'LENS',
            brand: s.brand || '',
            color: s.color || '',
            size: s.size || '',
            shape: s.shape || '',
            material: s.material || '',
            dimensions: s.dimensions || '',
            unit: s.unit || 'PIECE',
            price: s.price || s.mrp || '',
            mrp: s.mrp || s.price || '',
            gstPercent: s.gst || s.gstPercent || '0',
        } : r));
        toast.info(`Row ${index + 1} product details filled`);
    };

    const handleRowChange = (index, field, val) => {
        setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: val } : r));
    };

    const handleSubmit = async () => {
        // Validation
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            if (!r.productCode) { toast.error(`Row ${i + 1}: Product Code is required`); return; }
            if (!r.productName) { toast.error(`Row ${i + 1}: Product Name is required`); return; }
            if (!r.quantity || Number(r.quantity) <= 0) { toast.error(`Row ${i + 1}: Quantity must be > 0`); return; }
            if (!r.price || Number(r.price) <= 0) { toast.error(`Row ${i + 1}: Price must be > 0`); return; }
            if (!r.expectedDate) { toast.error(`Row ${i + 1}: Expected Date is required`); return; }
        }

        setSubmitting(true);
        try {
            const items = rows.map(row => {
                const item = {
                    isNewProduct: row.isNewProduct,
                    orderType: 'STOCK',
                    itemName: row.productName,
                    category: row.category,
                    code: row.productCode,
                    brand: row.brand || '',
                    color: row.color || '',
                    size: row.size || '',
                    shape: row.shape || '',
                    material: row.material || '',
                    dimensions: row.dimensions || '',
                    unit: row.unit,
                    qty: Number(row.quantity),
                    price: Number(row.price),
                    mrp: Number(row.mrp || row.price),
                    gst: Number(row.gstPercent || 0),
                    expectedDate: row.expectedDate,
                };
                if (!row.isNewProduct && row.productId) item.productId = row.productId;
                return item;
            });

            // Calculate overall CGST / SGST based on first item for simplicity, or 0
            const firstGst = items.length > 0 ? items[0].gst : 0;
            const halfGst = (firstGst / 2).toString();

            const payload = {
                purchaseReturnId: returnRecord._id,
                cgst: halfGst,
                sgst: halfGst,
                remarks: remarks || `Replacement order for return #${returnRecord._id?.slice(-6).toUpperCase()}`,
                replacementItems: rows.map((row, idx) => {
                    const item = items[idx];
                    // Clean up isNewProduct as it's not in the new payload structure specification directly
                    if (item.isNewProduct !== undefined) delete item.isNewProduct;
                    return {
                        returnItemId: returnRecord.items?.[idx]?.itemId || returnRecord.items?.[0]?.itemId,
                        item: item
                    };
                })
            };

            const res = await submitReplacementOrder(payload);
            if (res.success) {
                toast.success('Replacement order created successfully!');
                onClose();
                fetchReturns(); // Refresh returns to show update if any
            } else {
                toast.error(res.message || 'Failed to create replacement order');
            }
        } catch (err) {
            toast.error(err.message || 'Error creating replacement order');
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate summary
    const orderSummary = rows.reduce((acc, r) => {
        const base = (Number(r.quantity) || 0) * (Number(r.price) || 0);
        const gst = (base * (Number(r.gstPercent) || 0)) / 100;
        acc.subtotal += base;
        acc.gstTotal += gst;
        acc.grandTotal += base + gst;
        return acc;
    }, { subtotal: 0, gstTotal: 0, grandTotal: 0 });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-lg w-full max-w-4xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 bg-[#eaf4fb] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#1F618D] flex items-center justify-center">
                            <Icon icon="lucide:package-plus" className="text-white text-lg" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-[#1F618D]">Create Replacement Order</h2>
                            <p className="text-xs text-[#2980B9]">
                                Vendor: <strong>{returnRecord.vendorName}</strong> · Return #{returnRecord._id?.slice(-6).toUpperCase()}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                        <Icon icon="lucide:x" className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Items ({rows.length})</span>
                        <button
                            type="button"
                            onClick={handleAddRow}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1F618D] bg-[#eaf4fb] hover:bg-[#d4eaf6] rounded-lg transition-colors"
                        >
                            <Icon icon="lucide:plus" /> Add Item
                        </button>
                    </div>

                    <div className="space-y-4">
                        {rows.map((row, idx) => (
                            <div key={idx} className="relative p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3">
                                {/* Header / Row count & remove button */}
                                <div className="flex justify-between items-center border-b border-gray-200/60 pb-2">
                                    <span className="text-xs font-bold text-[#1F618D]">Item #{idx + 1}</span>
                                    {rows.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveRow(idx)}
                                            className="p-1 text-[#E74C3C] hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remove Item"
                                        >
                                            <Icon icon="lucide:trash" />
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {/* Product search */}
                                    <div className="md:col-span-2">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-[11px] font-semibold text-gray-500">
                                                Product Name <span className="text-[#E74C3C]">*</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 text-[10px] text-[#1F618D] cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={row.isNewProduct}
                                                    onChange={e => handleRowChange(idx, 'isNewProduct', e.target.checked)}
                                                    className="rounded border-gray-300 text-[#2980B9] focus:ring-[#2980B9]"
                                                />
                                                Add Custom Item
                                            </label>
                                        </div>
                                        {row.isNewProduct ? (
                                            <input
                                                value={row.productName}
                                                onChange={e => handleRowChange(idx, 'productName', e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#2980B9] focus:ring-2 focus:ring-[#2980B9]/20"
                                                placeholder="Enter custom product name"
                                            />
                                        ) : (
                                            <ProductSearchInput
                                                value={row.productName}
                                                onChange={(v) => handleRowChange(idx, 'productName', v)}
                                                onSelect={(s) => handleSelectProduct(idx, s)}
                                            />
                                        )}
                                    </div>

                                    {/* Product Code */}
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                                            Product Code <span className="text-[#E74C3C]">*</span>
                                        </label>
                                        <input
                                            value={row.productCode}
                                            onChange={e => handleRowChange(idx, 'productCode', e.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#2980B9] focus:ring-2 focus:ring-[#2980B9]/20"
                                            placeholder="Code"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">Category</label>
                                        <select
                                            value={row.category}
                                            onChange={e => handleRowChange(idx, 'category', e.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-[#2980B9]"
                                        >
                                            <option value="LENS">Lens</option>
                                            <option value="FRAME">Frame</option>
                                            <option value="CONTACT_LENS">Contact Lens</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">Qty <span className="text-[#E74C3C]">*</span></label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={row.quantity}
                                            onChange={e => handleRowChange(idx, 'quantity', e.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-[#2980B9]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">Price ₹ <span className="text-[#E74C3C]">*</span></label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={row.price}
                                            onChange={e => handleRowChange(idx, 'price', e.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-[#2980B9]"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">MRP ₹</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={row.mrp}
                                            onChange={e => handleRowChange(idx, 'mrp', e.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-[#2980B9]"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">GST %</label>
                                        <input
                                            type="number"
                                            value={row.gstPercent}
                                            onChange={e => handleRowChange(idx, 'gstPercent', e.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-[#2980B9]"
                                            placeholder="0"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">Expected Date <span className="text-[#E74C3C]">*</span></label>
                                        <input
                                            type="date"
                                            value={row.expectedDate}
                                            onChange={e => handleRowChange(idx, 'expectedDate', e.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-[#2980B9]"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Overall Remarks */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Remarks</label>
                        <textarea
                            rows={2}
                            value={remarks}
                            onChange={e => setRemarks(e.target.value)}
                            placeholder="Overall remarks for this replacement order..."
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#2980B9] focus:ring-2 focus:ring-[#2980B9]/20 resize-none"
                        />
                    </div>

                    {/* Summary Card */}
                    {orderSummary.subtotal > 0 && (
                        <div className="bg-[#eaf4fb] border border-[#2980B9]/20 rounded-xl p-4">
                            <p className="text-xs font-semibold text-[#1F618D] mb-2">Order Summary</p>
                            <div className="flex justify-between text-xs text-gray-700">
                                <span>Subtotal</span>
                                <span className="font-semibold">₹{orderSummary.subtotal.toFixed(2)}</span>
                            </div>
                            {orderSummary.gstTotal > 0 && (
                                <div className="flex justify-between text-xs text-gray-700 mt-1">
                                    <span>GST Total</span>
                                    <span className="font-semibold">₹{orderSummary.gstTotal.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm font-bold text-[#1F618D] border-t border-[#2980B9]/20 mt-2 pt-2">
                                <span>Grand Total</span>
                                <span>₹{orderSummary.grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose}
                        className="px-5 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={submitting}
                        className="px-6 py-2.5 text-xs font-semibold text-white bg-[#1F618D] hover:bg-[#174e71] rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
                        {submitting
                            ? <><Icon icon="lucide:loader-2" className="animate-spin" /> Submitting…</>
                            : <><Icon icon="lucide:package-plus" /> Create Replacement Order</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const PurchaseReturnList = () => {
    const navigate = useNavigate();

    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [expandedId, setExpandedId] = useState(null);

    // Update status modal
    const [modal, setModal] = useState(null); // { returnId, itemId }
    const [modalStatus, setModalStatus] = useState('Replaced');
    const [modalRemarks, setModalRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Replacement order modal
    const [replacementModal, setReplacementModal] = useState(null); // the full return record

    const fetchReturns = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getAllPurchaseReturns(1, 100, search);
            if (response.success) {
                const list = response.data?.returns || response.data?.data || response.data || [];
                setReturns(Array.isArray(list) ? list : []);
            } else {
                setReturns([]);
                toast.error(response.message || 'Failed to fetch purchase returns');
            }
        } catch (error) {
            toast.error(error.message || 'Error loading purchase returns');
            setReturns([]);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => { fetchReturns(); }, [fetchReturns]);

    const filtered = returns.filter(r => (!statusFilter || r.status === statusFilter));

    const openModal = (returnId, itemId, currentStatus) => {
        setModal({ returnId, itemId });
        setModalStatus(currentStatus || 'Pending');
        setModalRemarks('');
    };

    const handleUpdateStatus = async () => {
        if (!modal) return;
        setSubmitting(true);
        try {
            const payload = { itemId: modal.itemId, status: modalStatus, remarks: modalRemarks };
            const response = await updatePurchaseReturnItemStatus(modal.returnId, payload);
            if (response.success) {
                toast.success(`Status updated to "${modalStatus}"`);
                setModal(null);
                fetchReturns();
            } else {
                toast.error(response.message || 'Failed to update status');
            }
        } catch (error) {
            toast.error(error.message || 'Error updating status');
        } finally {
            setSubmitting(false);
        }
    };

    const statusCounts = returns.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="p-2 w-full h-full flex flex-col">

            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Icon icon="lucide:undo-2" className="text-[#2980B9]" />
                        QC Failed (Awaiting Replacement)
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Track and manage QC-failed items that need vendor replacement</p>
                </div>
                <button
                    onClick={fetchReturns}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#2980B9] bg-[#eaf4fb] hover:bg-[#d4eaf6] rounded-xl transition-colors"
                >
                    <Icon icon="lucide:refresh-cw" className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Status filter chips */}
            <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(STATUS_META).map(([status, meta]) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(prev => prev === status ? '' : status)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                            ${statusFilter === status
                                ? 'ring-2 ring-offset-1 ring-[#2980B9] border-transparent ' + meta.cls
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                    >
                        <Icon icon={meta.icon} className="text-sm" />
                        {status}
                        <span className="ml-1 bg-white/60 px-1.5 py-0.5 rounded font-bold text-gray-700">
                            {statusCounts[status] || 0}
                        </span>
                    </button>
                ))}
                {statusFilter && (
                    <button onClick={() => { setStatusFilter(''); }}
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
                        className="pl-9 pr-4 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9] bg-white"
                    />
                </div>
            </div>

            {/* Table card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 overflow-hidden flex flex-col">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center flex-col gap-3 text-gray-400">
                        <Icon icon="lucide:loader-2" className="animate-spin text-3xl text-[#2980B9]" />
                        <p className="text-sm">Loading returns…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center flex-col gap-3 text-gray-400">
                        <Icon icon="lucide:inbox" className="text-4xl text-gray-300" />
                        <p className="text-sm">No purchase returns found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#eaf4fb]/50 border-b border-[#2980B9]/15">
                                    <th className="py-2.5 px-4 w-10 text-[#1F618D]"></th>
                                    <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Return ID</th>
                                    <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Vendor</th>
                                    <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Items</th>
                                    <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Status</th>
                                    <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Notified</th>
                                    <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Date</th>
                                    <th className="py-2.5 px-4 text-xs font-bold text-[#1F618D] uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(ret => {
                                    const meta = getStatusMeta(ret.status);
                                    const isExpanded = expandedId === ret._id;
                                    return (
                                        <React.Fragment key={ret._id}>
                                            <tr
                                                className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                                                onClick={() => setExpandedId(isExpanded ? null : ret._id)}
                                            >
                                                <td className="px-4 py-2 text-center">
                                                    <Icon
                                                        icon="lucide:chevron-right"
                                                        className={`text-[#1F618D] text-xs transition-transform duration-200 inline-block ${isExpanded ? 'rotate-90' : ''}`}
                                                    />
                                                </td>

                                                <td className="px-4 py-2">
                                                    <span className="font-mono text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                                                        #{ret._id.slice(-8).toUpperCase()}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-2">
                                                    <p className="text-xs font-semibold text-gray-800">{ret.vendorName}</p>
                                                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{ret.vendorId?.slice(-6).toUpperCase()}</p>
                                                </td>

                                                <td className="px-4 py-2">
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700">
                                                        <Icon icon="lucide:package" className="text-gray-400 text-xs" />
                                                        {ret.items?.length || 0} item{ret.items?.length !== 1 ? 's' : ''}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-2">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.cls}`}>
                                                        <Icon icon={meta.icon} className="text-xs" />
                                                        {ret.status}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-2">
                                                    {ret.vendorNotified ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#2980B9] bg-[#eaf4fb] px-2 py-0.5 rounded-full">
                                                            <Icon icon="lucide:bell-ring" className="text-xs" />
                                                            Yes
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-400">—</span>
                                                    )}
                                                </td>

                                                <td className="px-4 py-2 text-[10px] text-gray-500 whitespace-nowrap">
                                                    {new Date(ret.createdAt).toLocaleDateString('en-IN', {
                                                        day: '2-digit', month: 'short', year: 'numeric'
                                                    })}
                                                </td>

                                                <td className="px-4 py-2" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => navigate(`/vendor/purchase-items/${ret.purchaseOrderId}`)}
                                                            className="text-[10px] text-[#2980B9] hover:text-[#1F618D] font-medium flex items-center gap-1 bg-[#eaf4fb] hover:bg-[#d4eaf6] px-2.5 py-1 rounded-lg transition-colors"
                                                        >
                                                            <Icon icon="lucide:receipt" className="text-xs" />
                                                            View PO
                                                        </button>
                                                        <button
                                                            onClick={() => setReplacementModal(ret)}
                                                            className="text-[10px] text-[#1F618D] hover:text-white font-medium flex items-center gap-1 bg-[#eaf4fb] hover:bg-[#1F618D] border border-[#2980B9]/20 px-2.5 py-1 rounded-lg transition-colors"
                                                            title="Create Replacement Order"
                                                        >
                                                            <Icon icon="lucide:package-plus" className="text-xs" />
                                                            Replace
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* ── Expanded items ── */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={8} className="bg-gray-50/60 border-b border-gray-100 px-8 py-4">
                                                        <div className="space-y-3">
                                                            {ret.items?.map((item, idx) => {
                                                                const itemMeta = getStatusMeta(item.itemStatus);
                                                                return (
                                                                    <div key={idx}
                                                                        className="flex items-start justify-between bg-white rounded-xl border border-gray-100 p-4 gap-4 shadow-sm">
                                                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                                                            <div className="w-9 h-9 bg-[#eaf4fb] rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                                                                                <Icon icon="lucide:box" className="text-[#2980B9] text-sm" />
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <p className="text-sm font-semibold text-gray-800">{item.itemName}</p>
                                                                                <p className="text-xs text-gray-500 mt-0.5">
                                                                                    {item.category} &bull; {item.unit} &bull; Qty: <strong>{item.qty}</strong>
                                                                                    {item.orderNumber && <> &bull; <span className="font-mono">{item.orderNumber}</span></>}
                                                                                </p>
                                                                                {item.reason && (
                                                                                    <p className="text-xs text-[#E74C3C] mt-1">Reason: {item.reason}</p>
                                                                                )}
                                                                                {item.itemRemarks && (
                                                                                    <p className="text-xs text-gray-500 mt-1 italic">&ldquo;{item.itemRemarks}&rdquo;</p>
                                                                                )}
                                                                                {item.itemUpdatedAt && (
                                                                                    <p className="text-xs text-gray-400 mt-1">
                                                                                        Updated: {new Date(item.itemUpdatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            <span className="text-xs bg-[#fef2f0] text-[#E74C3C] px-2 py-1 rounded-full font-medium whitespace-nowrap">
                                                                                {item.condition?.replace(/_/g, ' ')}
                                                                            </span>
                                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${itemMeta.cls}`}>
                                                                                <Icon icon={itemMeta.icon} className="text-sm" />
                                                                                {item.itemStatus || 'Pending'}
                                                                            </span>
                                                                            <button
                                                                                onClick={e => { e.stopPropagation(); openModal(ret._id, item.itemId, item.itemStatus); }}
                                                                                className="text-xs text-[#2980B9] hover:text-[#1F618D] font-medium bg-[#eaf4fb] hover:bg-[#d4eaf6] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                                                                            >
                                                                                <Icon icon="lucide:pencil" className="text-sm" />
                                                                                Update
                                                                            </button>
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

                {/* Footer count */}
                {!loading && filtered.length > 0 && (
                    <div className="p-4 border-t border-gray-100 text-xs text-gray-400 bg-gray-50/50">
                        Showing {filtered.length} of {returns.length} return{returns.length !== 1 ? 's' : ''}
                    </div>
                )}
            </div>

            {/* ── Update Return Item Status Modal ────────────────────────── */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

                        <div className="p-6 border-b border-gray-100 bg-[#eaf4fb] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#1F618D] rounded-xl flex items-center justify-center">
                                    <Icon icon="lucide:refresh-ccw" className="text-white text-xl" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-[#1F618D]">Update Return Item Status</h2>
                                    <p className="text-xs text-[#2980B9] font-mono mt-0.5">
                                        Item: {modal.itemId?.slice(-8).toUpperCase()}
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
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9] bg-white">
                                    <option value="Pending">Pending</option>
                                    <option value="VendorNotified">Vendor Notified</option>
                                    <option value="Replaced">Replaced</option>
                                    <option value="Closed">Closed</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Remarks</label>
                                <textarea
                                    rows={3}
                                    value={modalRemarks}
                                    onChange={e => setModalRemarks(e.target.value)}
                                    placeholder="e.g. Replacement received on 10 July 2026…"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9] transition-all resize-none"
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                            <button onClick={() => setModal(null)}
                                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleUpdateStatus} disabled={submitting}
                                className="px-5 py-2.5 text-sm font-medium text-white bg-[#1F618D] hover:bg-[#174e71] rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
                                {submitting
                                    ? <Icon icon="lucide:loader-2" className="animate-spin" />
                                    : <Icon icon="lucide:check" />
                                }
                                {submitting ? 'Updating…' : 'Update Status'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Replacement Order Modal ───────────────────────────────── */}
            {replacementModal && (
                <ReplacementOrderModal
                    returnRecord={replacementModal}
                    onClose={() => setReplacementModal(null)}
                />
            )}
        </div>
    );
};

export default PurchaseReturnList;
