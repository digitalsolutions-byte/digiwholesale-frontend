import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import api from '../../services/apiInstance';
import { vendorProposalService } from '../../services/vendorProposalService';
import { PATHS } from '../../routes/paths';
import SearchableSelect from '../../components/ui/SearchableSelect';

const BuyProduct = () => {
    const navigate = useNavigate();

    // ── Form State ──
    const [productSearch, setProductSearch] = useState('');
    const [productSearchResults, setProductSearchResults] = useState([]);
    const [isSearchingProduct, setIsSearchingProduct] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const [form, setForm] = useState({
        productId: '',
        productName: '',
        productCode: '',
        category: '',
        brand: '',
        unit: 'PIECE',
        requiredQty: '',
        requiredByDate: '',
        description: '',
        vendorIds: [],
    });

    // ── Vendor Select State ──
    const [vendors, setVendors] = useState([]);
    const [loadingVendors, setLoadingVendors] = useState(false);
    const [vendorSearch, setVendorSearch] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Fetch vendors list for selection using /api/vendor
    useEffect(() => {
        const fetchVendors = async () => {
            try {
                setLoadingVendors(true);
                const res = await api.get('/api/vendor', { params: { page: 1, limit: 1000 } });
                if (res.data.success || Array.isArray(res.data.data) || Array.isArray(res.data.vendors)) {
                    setVendors(res.data.vendors || res.data.data || res.data || []);
                }
            } catch (err) {
                console.error('Failed to fetch vendors list', err);
            } finally {
                setLoadingVendors(false);
            }
        };
        fetchVendors();
    }, []);

    // Handle product search from /api/order/product-names
    const handleSearchProducts = async (query = '', categoryFilter = form.category) => {
        const trimmed = query ? query.trim() : '';
        setProductSearch(query);
        try {
            setIsSearchingProduct(true);
            const params = {
                page: 1,
                limit: 100,
            };
            if (trimmed) params.search = trimmed;
            if (form.brand) params.brand = form.brand;
            if (categoryFilter && categoryFilter !== 'ALL') params.category = categoryFilter;

            const res = await api.get('/api/order/product-names', { params });
            const rawData = res.data;
            let prods = [];
            if (Array.isArray(rawData)) prods = rawData;
            else if (Array.isArray(rawData?.data)) prods = rawData.data;
            else if (Array.isArray(rawData?.data?.data)) prods = rawData.data.data;
            else if (Array.isArray(rawData?.products)) prods = rawData.products;
            else if (Array.isArray(rawData?.data?.products)) prods = rawData.data.products;

            setProductSearchResults(prods);
        } catch (err) {
            console.error('Product search error:', err);
            setProductSearchResults([]);
        } finally {
            setIsSearchingProduct(false);
        }
    };

    const handleSelectProduct = (prod) => {
        setSelectedProduct(prod);
        setForm(prev => ({
            ...prev,
            productId: prod._id,
            productName: prod.productName || prod.name || '',
            productCode: prod.productCode || prod.code || '',
            category: prod.category || '',
            brand: prod.brand || '',
            unit: prod.unit || 'PIECE',
        }));
        setShowDropdown(false);
        setProductSearchResults([]);
        setProductSearch(prod.productName || prod.productCode);
    };

    const handleClearSelectedProduct = () => {
        setSelectedProduct(null);
        setProductSearch('');
        setForm(prev => ({
            ...prev,
            productId: '',
            productName: '',
            productCode: '',
            brand: '',
        }));
    };

    const toggleVendorSelection = (vendorId) => {
        setForm(prev => {
            const exists = prev.vendorIds.includes(vendorId);
            return {
                ...prev,
                vendorIds: exists
                    ? prev.vendorIds.filter(id => id !== vendorId)
                    : [...prev.vendorIds, vendorId]
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.productName.trim()) {
            toast.error('Product Name is required');
            return;
        }
        if (!form.requiredQty || Number(form.requiredQty) <= 0) {
            toast.error('Valid Required Quantity is required');
            return;
        }
        if (!form.requiredByDate) {
            toast.error('Required By Date is required');
            return;
        }
        if (form.vendorIds.length === 0) {
            toast.error('Select at least one vendor');
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                productId: form.productId || undefined,
                productName: form.productName,
                productCode: form.productCode,
                category: form.category,
                brand: form.brand,
                unit: form.unit,
                requiredQty: Number(form.requiredQty),
                requiredByDate: form.requiredByDate,
                description: form.description,
                vendorIds: form.vendorIds
            };

            const data = await vendorProposalService.createProposal(payload);
            if (data.success) {
                toast.success(data.message || 'Proposal created and sent to vendors!');
                navigate(PATHS.VENDOR.PROPOSAL_LIST || '/vendor/proposal/list');
            } else {
                toast.error(data.message || 'Failed to create proposal');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Failed to create proposal');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredVendors = vendors.filter(v => {
        const query = vendorSearch.toLowerCase();
        return (
            (v.name && v.name.toLowerCase().includes(query)) ||
            (v.firm && v.firm.toLowerCase().includes(query)) ||
            (v.mobile && v.mobile.includes(query))
        );
    });

    return (
        <div className="w-full space-y-6 pb-16">
            {/* Top Navigation Strip */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/vendor/proposal/list')}
                        className="p-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 hover:text-[#2980B9] hover:bg-blue-50 transition-all"
                    >
                        <Icon icon="mdi:arrow-left" className="text-xl" />
                    </button>
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Icon icon="lucide:shopping-bag" className="text-[#2980B9]" />
                            Create Purchase Proposal / RFQ
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">Send quote request directly via Email + WhatsApp to suppliers</p>
                    </div>
                </div>
            </div>

            {/* Main Form Card */}
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-7 space-y-6">
                
                {/* 1. Product Selection */}
                <div className="space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#2980B9] flex items-center gap-2 border-b border-gray-100 pb-2">
                        <Icon icon="lucide:search" className="text-base" />
                        1. Product Information
                    </h2>

                    <div>
                        <SearchableSelect
                            label="Search Existing Inventory Product (Optional)"
                            name="inventorySearch"
                            value={form.productId || form.productName}
                            onSearch={(query) => handleSearchProducts(query)}
                            onChange={(e) => {
                                const selectedVal = e.target.value;
                                const matched = productSearchResults.find(p => (p._id || p.productName || p.name) === selectedVal);
                                if (matched) {
                                    handleSelectProduct(matched);
                                } else if (selectedVal) {
                                    setForm(p => ({ ...p, productName: selectedVal }));
                                } else {
                                    handleClearSelectedProduct();
                                }
                            }}
                            options={(Array.isArray(productSearchResults) ? productSearchResults : []).map(p => ({
                                value: typeof p === 'string' ? p : (p._id || p.productName || p.name || ''),
                                label: typeof p === 'string' ? p : `${p.productName || p.name || 'Product'} ${p.productCode ? `(${p.productCode})` : ''} ${p.brand ? `• ${p.brand}` : ''}`
                            }))}
                            placeholder="Type product code, name, or category..."
                            loading={isSearchingProduct}
                            freeSolo
                            containerClassName="!bg-transparent"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                    height: '42px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    backgroundColor: '#f9fafb',
                                    '& fieldset': { borderColor: '#e5e7eb' },
                                }
                            }}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                        {/* Searchable Product Name Input */}
                        <div className="relative">
                            <label className="text-xs font-bold text-gray-600 block mb-1">
                                Product Name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Type or search product name..."
                                    value={form.productName}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setForm(p => ({ ...p, productName: val }));
                                        setShowDropdown(true);
                                        handleSearchProducts(val);
                                    }}
                                    onFocus={() => {
                                        setShowDropdown(true);
                                        handleSearchProducts(form.productName);
                                    }}
                                    onBlur={() => {
                                        setTimeout(() => setShowDropdown(false), 200);
                                    }}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-[#2980B9] focus:bg-white pr-9"
                                    required
                                />
                                {isSearchingProduct ? (
                                    <Icon icon="lucide:loader-2" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2980B9] animate-spin text-sm" />
                                ) : form.productName ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleClearSelectedProduct();
                                            setForm(p => ({ ...p, productName: '' }));
                                            setShowDropdown(false);
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <Icon icon="mdi:close-circle" className="text-base" />
                                    </button>
                                ) : null}
                            </div>

                            {/* Search Dropdown Results */}
                            {showDropdown && productSearchResults.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-40 max-h-64 overflow-y-auto divide-y divide-gray-100">
                                    <div className="px-3 py-1.5 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        Matching Products ({productSearchResults.length})
                                    </div>
                                    {productSearchResults.map((prod, idx) => {
                                        const pName = typeof prod === 'string' ? prod : (prod.productName || prod.name || prod.itemName || '');
                                        const pCode = prod.productCode || prod.code || '';
                                        const pBrand = prod.brand || '';
                                        const pCat = prod.category || '';

                                        return (
                                            <div
                                                key={prod._id || idx}
                                                onClick={() => handleSelectProduct(prod)}
                                                className="p-3 hover:bg-blue-50 cursor-pointer transition-colors flex items-center justify-between text-xs"
                                            >
                                                <div>
                                                    <span className="font-bold text-gray-900 block">{pName}</span>
                                                    <span className="text-[10px] text-gray-500 font-mono">
                                                        {pCode && `Code: ${pCode}`} {pBrand && `• Brand: ${pBrand}`} {pCat && `• Cat: ${pCat}`}
                                                    </span>
                                                </div>
                                                <span className="px-2.5 py-1 bg-[#2980B9] text-white font-bold text-[10px] rounded-lg shadow-2xs">
                                                    Select
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-600 block mb-1">Product Code</label>
                            <input
                                type="text"
                                placeholder="e.g. ZS-PRIME-1.6"
                                value={form.productCode}
                                onChange={(e) => setForm(p => ({ ...p, productCode: e.target.value }))}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-[#2980B9] focus:bg-white"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-600 block mb-1">Category</label>
                            <select
                                value={form.category}
                                onChange={(e) => {
                                    const newCat = e.target.value;
                                    setForm(p => ({ ...p, category: newCat }));
                                    if (productSearch) {
                                        handleSearchProducts(productSearch, newCat);
                                    }
                                }}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-[#2980B9] focus:bg-white"
                            >
                                <option value="ALL">ALL CATEGORIES</option>
                                <option value="LENS">LENS</option>
                                <option value="FRAME">FRAME</option>
                                <option value="SUNGLASS">SUNGLASS</option>
                                <option value="CONTACT_LENS">CONTACT LENS</option>
                                <option value="ACCESSORY">ACCESSORY</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-600 block mb-1">Brand</label>
                            <input
                                type="text"
                                placeholder="e.g. ZEISS"
                                value={form.brand}
                                onChange={(e) => setForm(p => ({ ...p, brand: e.target.value }))}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-[#2980B9] focus:bg-white"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-600 block mb-1">Unit</label>
                            <select
                                value={form.unit}
                                onChange={(e) => setForm(p => ({ ...p, unit: e.target.value }))}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-[#2980B9] focus:bg-white"
                            >
                                <option value="PIECE">PIECE</option>
                                <option value="BOX">BOX</option>
                                <option value="PAIR">PAIR</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 2. Requirement Details */}
                <div className="space-y-3 pt-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#2980B9] flex items-center gap-2 border-b border-gray-100 pb-2">
                        <Icon icon="lucide:calendar-clock" className="text-base" />
                        2. Quantity & Timeline
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-600 block mb-1">Required Quantity <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                min="1"
                                placeholder="e.g. 50"
                                value={form.requiredQty}
                                onChange={(e) => setForm(p => ({ ...p, requiredQty: e.target.value }))}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#2980B9] focus:bg-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-600 block mb-1">Required By Date <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                value={form.requiredByDate}
                                onChange={(e) => setForm(p => ({ ...p, requiredByDate: e.target.value }))}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#2980B9] focus:bg-white"
                                required
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="text-xs font-bold text-gray-600 block mb-1">Special Requirements / Notes</label>
                            <textarea
                                rows={3}
                                placeholder="Need AR coating variant only, urgent delivery required..."
                                value={form.description}
                                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:border-[#2980B9] focus:bg-white resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Multi-Vendor Selector */}
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#2980B9] flex items-center gap-2">
                            <Icon icon="lucide:truck" className="text-base" />
                            3. Select Vendors to Request Quote ({form.vendorIds.length} selected) <span className="text-red-500">*</span>
                        </h2>

                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            Auto Email + WhatsApp
                        </span>
                    </div>

                    <div className="relative">
                        <Icon icon="lucide:search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                        <input
                            type="text"
                            placeholder="Filter vendors by name, firm or mobile..."
                            value={vendorSearch}
                            onChange={(e) => setVendorSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-[#2980B9]"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1 bg-gray-50/50 rounded-xl border border-gray-100">
                        {loadingVendors ? (
                            <div className="col-span-full py-8 text-center text-xs text-gray-400 font-semibold">Loading vendors...</div>
                        ) : filteredVendors.length === 0 ? (
                            <div className="col-span-full py-8 text-center text-xs text-gray-400 font-semibold">No matching vendors found</div>
                        ) : (
                            filteredVendors.map((vendor) => {
                                const isSelected = form.vendorIds.includes(vendor._id);
                                return (
                                    <div
                                        key={vendor._id}
                                        onClick={() => toggleVendorSelection(vendor._id)}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                                            isSelected
                                                ? 'bg-blue-50/80 border-[#2980B9] shadow-2xs'
                                                : 'bg-white border-gray-200 hover:border-blue-200'
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <h4 className="text-xs font-bold text-gray-900 truncate">{vendor.name}</h4>
                                            <span className="text-[10px] text-gray-500 font-semibold truncate block">{vendor.firm || 'No firm name'}</span>
                                        </div>
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                                            isSelected ? 'bg-[#2980B9] text-white' : 'border border-gray-300 bg-white'
                                        }`}>
                                            {isSelected && <Icon icon="mdi:check" className="text-xs" />}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Submit Action */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/vendor/proposal/list')}
                        className="px-6 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-2 px-8 py-3 bg-[#2980B9] hover:bg-[#2471A3] text-white text-xs font-bold rounded-full transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                        {submitting ? (
                            <>
                                <Icon icon="lucide:loader-2" className="animate-spin text-base" />
                                <span>Sending RFQs...</span>
                            </>
                        ) : (
                            <>
                                <Icon icon="lucide:send" className="text-base" />
                                <span>Submit & Dispatch RFQ</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BuyProduct;
