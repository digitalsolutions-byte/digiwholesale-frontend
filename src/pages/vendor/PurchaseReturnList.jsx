import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { getAllPurchaseReturns, updatePurchaseReturnItemStatus, createReplacementOrder } from '../../services/vendorOrderService';
import { toast } from 'react-toastify';

const UNIT_OPTIONS = ['PIECE', 'PAIR', 'BOX'];
const CATEGORY_OPTIONS = ['LENS', 'FRAME', 'SUNGLASS', 'CONTACT_LENS'];
const ORDER_TYPE_OPTIONS = ['STOCK', 'RX'];

const emptyItemForm = () => ({
    mode: 'existing',
    productId: '',
    itemName: '',
    category: '',
    orderType: 'STOCK',
    qty: '',
    price: '',
    mrp: '',
    gst: '',
    hsnSac: '',
    brand: '',
    coating: '',
    index: '',
    unit: 'PIECE',
    discountPercent: '',
});

function ReplacementOrderModal({ ret, onClose, onSuccess }) {
    const [cgst, setCgst] = useState('9');
    const [sgst, setSgst] = useState('9');
    const [remarks, setRemarks] = useState('');
    const [itemForms, setItemForms] = useState(() =>
        (ret.items || []).map(item => ({ ...emptyItemForm(), _returnItem: item }))
    );
    const [submitting, setSubmitting] = useState(false);

    const updateForm = (idx, field, value) => {
        setItemForms(prev => prev.map((f, i) => i === idx ? { ...f, [field]: value } : f));
    };

    const handleSubmit = async () => {
        for (let i = 0; i < itemForms.length; i++) {
            const f = itemForms[i];
            if (f.mode === 'existing') {
                if (!f.productId.trim()) return toast.warning(`Item ${i + 1}: Product ID is required`);
                if (!f.qty) return toast.warning(`Item ${i + 1}: Qty is required`);
                if (!f.price) return toast.warning(`Item ${i + 1}: Price is required`);
            } else {
                if (!f.itemName.trim()) return toast.warning(`Item ${i + 1}: Item Name is required`);
                if (!f.category) return toast.warning(`Item ${i + 1}: Category is required`);
                if (!f.qty) return toast.warning(`Item ${i + 1}: Qty is required`);
                if (!f.price) return toast.warning(`Item ${i + 1}: Price is required`);
            }
        }

        const replacementItems = itemForms.map(f => {
            const item = f.mode === 'existing'
                ? {
                    productId: f.productId.trim(),
                    orderType: f.orderType,
                    qty: Number(f.qty),
                    price: Number(f.price),
                    ...(f.mrp && { mrp: Number(f.mrp) }),
                    ...(f.gst && { gst: Number(f.gst) }),
                    ...(f.hsnSac && { hsnSac: f.hsnSac }),
                    ...(f.unit && { unit: f.unit }),
                    ...(f.discountPercent !== '' && { discountPercent: Number(f.discountPercent) }),
                }
                : {
                    itemName: f.itemName.trim(),
                    category: f.category,
                    orderType: f.orderType,
                    qty: Number(f.qty),
                    price: Number(f.price),
                    ...(f.mrp && { mrp: Number(f.mrp) }),
                    ...(f.gst && { gst: Number(f.gst) }),
                    ...(f.hsnSac && { hsnSac: f.hsnSac }),
                    ...(f.brand && { brand: f.brand }),
                    ...(f.coating && { coating: f.coating }),
                    ...(f.index !== '' && { index: Number(f.index) }),
                    ...(f.unit && { unit: f.unit }),
                };
            return { returnItemId: f._returnItem.itemId, item };
        });

        try {
            setSubmitting(true);
            const data = await createReplacementOrder({
                purchaseReturnId: ret._id,
                cgst,
                sgst,
                remarks,
                replacementItems,
            });
            if (data.success) {
                toast.success('Replacement order created. Vendor has been notified.');
                onSuccess();
                onClose();
            }
        } catch (err) {
            const code = err?.error?.code;
            if (code === 'ALREADY_REPLACED') {
                toast.error(err?.error?.message || 'These items already have a replacement in progress.');
            } else {
                toast.error(err?.message || 'Failed to create replacement order');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">

                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                            <Icon icon="lucide:package-plus" className="text-indigo-600 text-xl" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-800">Create Replacement Order</h2>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">Return #{ret._id.slice(-8).toUpperCase()} &bull; {ret.vendorName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                        <Icon icon="lucide:x" className="text-gray-500" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded-xl p-4 col-span-3">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Purchase Return ID</p>
                                    <p className="text-xs font-mono font-bold text-gray-700">{ret._id}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Vendor</p>
                                    <p className="text-xs font-bold text-gray-700">{ret.vendorName}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Items</p>
                                    <p className="text-xs font-bold text-gray-700">{ret.items?.length}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">CGST (%)</label>
                            <input type="number" value={cgst} onChange={e => setCgst(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">SGST (%)</label>
                            <input type="number" value={sgst} onChange={e => setSgst(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Remarks</label>
                            <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white" />
                        </div>
                    </div>

                    {itemForms.map((f, idx) => {
                        const ri = f._returnItem;
                        return (
                            <div key={idx} className="border border-gray-100 rounded-2xl overflow-hidden">
                                <div className="bg-gray-50 px-5 py-3 flex items-center justify-between border-b border-gray-100">
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">{ri.itemName}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Failed Qty: <strong className="text-red-600">{ri.qty}</strong>
                                            {ri.reason && <> &bull; Reason: <span className="text-red-500">{ri.reason}</span></>}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {['existing', 'new'].map(m => (
                                            <button
                                                key={m}
                                                onClick={() => updateForm(idx, 'mode', m)}
                                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${f.mode === m ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                            >
                                                {m === 'existing' ? 'Existing Product' : 'New Product'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {f.mode === 'existing' ? (
                                        <>
                                            <div className="col-span-2 md:col-span-1">
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Product ID <span className="text-red-500">*</span></label>
                                                <input type="text" value={f.productId} onChange={e => updateForm(idx, 'productId', e.target.value)} placeholder="e.g. 69e1c3de83e6e9..." className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Order Type <span className="text-red-500">*</span></label>
                                                <select value={f.orderType} onChange={e => updateForm(idx, 'orderType', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white">
                                                    {ORDER_TYPE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Qty <span className="text-red-500">*</span></label>
                                                <input type="number" value={f.qty} onChange={e => updateForm(idx, 'qty', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Price <span className="text-red-500">*</span></label>
                                                <input type="number" value={f.price} onChange={e => updateForm(idx, 'price', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">MRP</label>
                                                <input type="number" value={f.mrp} onChange={e => updateForm(idx, 'mrp', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">GST (%)</label>
                                                <input type="number" value={f.gst} onChange={e => updateForm(idx, 'gst', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">HSN/SAC</label>
                                                <input type="text" value={f.hsnSac} onChange={e => updateForm(idx, 'hsnSac', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Unit</label>
                                                <select value={f.unit} onChange={e => updateForm(idx, 'unit', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white">
                                                    {UNIT_OPTIONS.map(u => <option key={u}>{u}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Discount %</label>
                                                <input type="number" value={f.discountPercent} onChange={e => updateForm(idx, 'discountPercent', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white" />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="col-span-2 md:col-span-1">
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Item Name <span className="text-red-500">*</span></label>
                                                <input type="text" value={f.itemName} onChange={e => updateForm(idx, 'itemName', e.target.value)} placeholder="e.g. New Better Lens 1.74" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category <span className="text-red-500">*</span></label>
                                                <select value={f.category} onChange={e => updateForm(idx, 'category', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white">
                                                    <option value="">Select…</option>
                                                    {CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Order Type <span className="text-red-500">*</span></label>
                                                <select value={f.orderType} onChange={e => updateForm(idx, 'orderType', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white">
                                                    {ORDER_TYPE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Qty <span className="text-red-500">*</span></label>
                                                <input type="number" value={f.qty} onChange={e => updateForm(idx, 'qty', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Price <span className="text-red-500">*</span></label>
                                                <input type="number" value={f.price} onChange={e => updateForm(idx, 'price', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">MRP</label>
                                                <input type="number" value={f.mrp} onChange={e => updateForm(idx, 'mrp', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">GST (%)</label>
                                                <input type="number" value={f.gst} onChange={e => updateForm(idx, 'gst', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">HSN/SAC</label>
                                                <input type="text" value={f.hsnSac} onChange={e => updateForm(idx, 'hsnSac', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Brand</label>
                                                <input type="text" value={f.brand} onChange={e => updateForm(idx, 'brand', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Coating</label>
                                                <input type="text" value={f.coating} onChange={e => updateForm(idx, 'coating', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Index</label>
                                                <input type="number" value={f.index} onChange={e => updateForm(idx, 'index', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Unit</label>
                                                <select value={f.unit} onChange={e => updateForm(idx, 'unit', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white">
                                                    {UNIT_OPTIONS.map(u => <option key={u}>{u}</option>)}
                                                </select>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 flex-shrink-0">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={submitting}
                        className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
                        {submitting ? <Icon icon="lucide:loader-2" className="animate-spin" /> : <Icon icon="lucide:package-plus" />}
                        {submitting ? 'Creating…' : 'Create Replacement Order'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

const STATUS_META = {
    Pending: { cls: 'bg-gray-100 text-gray-600', icon: 'lucide:clock' },
    VendorNotified: { cls: 'bg-blue-50 text-blue-700', icon: 'lucide:bell' },
    Replaced: { cls: 'bg-emerald-50 text-emerald-700', icon: 'lucide:check-circle' },
    PartiallyReplaced: { cls: 'bg-amber-50 text-amber-700', icon: 'lucide:git-branch' },
    Closed: { cls: 'bg-purple-50 text-purple-700', icon: 'lucide:lock' },
};

const getStatusMeta = (status) =>
    STATUS_META[status] || { cls: 'bg-gray-100 text-gray-600', icon: 'lucide:help-circle' };

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
    const [replacementModal, setReplacementModal] = useState(null); // full ret object with pending items only

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

    useEffect(() => {
        fetchReturns();
    }, [fetchReturns]);

    const filtered = returns.filter(r =>
        (!statusFilter || r.status === statusFilter)
    );

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
        <div className="p-6 max-w-7xl mx-auto h-full flex flex-col">

            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Icon icon="lucide:undo-2" className="text-erp-accent" />
                        Purchase Returns
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Vendor return &amp; replacement tracking</p>
                </div>
                <button
                    onClick={fetchReturns}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-erp-accent bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
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
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                            ${statusFilter === status
                                ? 'ring-2 ring-offset-1 ring-erp-accent border-transparent ' + meta.cls
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                    >
                        <Icon icon={meta.icon} className="text-sm" />
                        {status}
                        <span className="ml-1 bg-white/60 px-1.5 py-0.5 rounded-full font-bold text-gray-700">
                            {statusCounts[status] || 0}
                        </span>
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

            {/* Table card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 overflow-hidden flex flex-col">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center flex-col gap-3 text-gray-400">
                        <Icon icon="lucide:loader-2" className="animate-spin text-3xl text-erp-accent" />
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
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-4 w-10"></th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Return ID</th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Notified</th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
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
                                                <td className="p-4 text-center">
                                                    <Icon
                                                        icon={isExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'}
                                                        className="text-gray-400 text-sm"
                                                    />
                                                </td>

                                                <td className="p-4">
                                                    <span className="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                                        #{ret._id.slice(-8).toUpperCase()}
                                                    </span>
                                                </td>

                                                <td className="p-4">
                                                    <p className="text-sm font-semibold text-gray-800">{ret.vendorName}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{ret.vendorId?.slice(-6).toUpperCase()}</p>
                                                </td>

                                                <td className="p-4">
                                                    <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-700">
                                                        <Icon icon="lucide:package" className="text-gray-400 text-sm" />
                                                        {ret.items?.length || 0} item{ret.items?.length !== 1 ? 's' : ''}
                                                    </span>
                                                </td>

                                                <td className="p-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.cls}`}>
                                                        <Icon icon={meta.icon} className="text-sm" />
                                                        {ret.status}
                                                    </span>
                                                </td>

                                                <td className="p-4">
                                                    {ret.vendorNotified ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                                            <Icon icon="lucide:bell-ring" className="text-sm" />
                                                            Yes
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">—</span>
                                                    )}
                                                </td>

                                                <td className="p-4 text-xs text-gray-500 whitespace-nowrap">
                                                    {new Date(ret.createdAt).toLocaleDateString('en-IN', {
                                                        day: '2-digit', month: 'short', year: 'numeric'
                                                    })}
                                                </td>

                                                <td className="p-4" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => navigate(`/vendor/purchase-items/${ret.purchaseOrderId}`)}
                                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        <Icon icon="lucide:receipt" className="text-sm" />
                                                        View PO
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* ── Expanded items ── */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={8} className="bg-gray-50/60 border-b border-gray-100 px-8 py-4">
                                                        <div className="space-y-3">
                                                            {ret.items?.map((item, idx) => {
                                                                const itemMeta = getStatusMeta(item.itemStatus);
                                                                const isPending = !item.itemStatus || ['pending', 'vendornotified'].includes(item.itemStatus?.toLowerCase());
                                                                return (
                                                                    <div key={idx}
                                                                        className="flex items-start justify-between bg-white rounded-xl border border-gray-100 p-4 gap-4 shadow-sm">
                                                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                                                            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                                                                                <Icon icon="lucide:box" className="text-gray-500 text-sm" />
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <p className="text-sm font-semibold text-gray-800">{item.itemName}</p>
                                                                                <p className="text-xs text-gray-500 mt-0.5">
                                                                                    {item.category} &bull; {item.unit} &bull; Qty: <strong>{item.qty}</strong>
                                                                                    {item.orderNumber && <> &bull; <span className="font-mono">{item.orderNumber}</span></>}
                                                                                </p>
                                                                                {item.reason && (
                                                                                    <p className="text-xs text-red-500 mt-1">
                                                                                        Reason: {item.reason}
                                                                                    </p>
                                                                                )}
                                                                                {item.itemRemarks && (
                                                                                    <p className="text-xs text-gray-500 mt-1 italic">
                                                                                        &ldquo;{item.itemRemarks}&rdquo;
                                                                                    </p>
                                                                                )}
                                                                                {item.itemUpdatedAt && (
                                                                                    <p className="text-xs text-gray-400 mt-1">
                                                                                        Updated: {new Date(item.itemUpdatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full font-medium whitespace-nowrap">
                                                                                {item.condition?.replace(/_/g, ' ')}
                                                                            </span>
                                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${itemMeta.cls}`}>
                                                                                <Icon icon={itemMeta.icon} className="text-sm" />
                                                                                {item.itemStatus || 'Pending'}
                                                                            </span>
                                                                            <button
                                                                                onClick={e => { e.stopPropagation(); openModal(ret._id, item.itemId, item.itemStatus); }}
                                                                                className="text-xs text-amber-600 hover:text-amber-800 font-medium bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                                                                            >
                                                                                <Icon icon="lucide:pencil" className="text-sm" />
                                                                                Update
                                                                            </button>
                                                                            {isPending && (
                                                                                <button
                                                                                    onClick={e => {
                                                                                        e.stopPropagation();
                                                                                        setReplacementModal({ ...ret, items: [item] });
                                                                                    }}
                                                                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                                                                                >
                                                                                    <Icon icon="lucide:package-plus" className="text-sm" />
                                                                                    Replacement Order
                                                                                </button>
                                                                            )}
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

            {replacementModal && (
                <ReplacementOrderModal
                    ret={replacementModal}
                    onClose={() => setReplacementModal(null)}
                    onSuccess={fetchReturns}
                />
            )}

            {/* ── Update Return Item Status Modal ──────────────────────── */}
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
                                    <p className="text-xs text-gray-500 font-mono mt-0.5">
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
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 bg-white">
                                    <option value="Pending">Pending</option>
                                    <option value="VendorNotified">Vendor Notified</option>
                                    <option value="Replaced">Replaced</option>
                                    {/* <option value="PartiallyReplaced">Partially Replaced</option> */}
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
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all resize-none"
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                            <button onClick={() => setModal(null)}
                                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleUpdateStatus} disabled={submitting}
                                className="px-5 py-2.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
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
        </div>
    );
};

export default PurchaseReturnList;
