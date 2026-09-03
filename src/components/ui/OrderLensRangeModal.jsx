import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import api from '../../services/apiInstance';

const DEFAULT_STEP = 0.25;
const round2 = (n) => Math.round(n * 100) / 100;

const makeEmptyRangeRow = () => ({
    id: crypto.randomUUID(),
    sphFrom: "", sphTo: "",
    cylFrom: "", cylTo: "",
    additionFrom: "", additionTo: "",
    sphStep: "0.25", cylStep: "0.25", addStep: "0.25",
    errors: {},
});

export default function OrderLensRangeModal({ isOpen, onClose, configs, onAddProducts }) {
    const categories = configs?.category || [];

    // Form settings
    const [form, setForm] = useState({
        productName: "",
        categoryId: "",
        brandId: "",
        color: "BLACK",
        vendorId: "",
        material: "",
        prefix: "DO",
        price: "",
        mrp: "",
        gst: "12",
        hsnSac: "9001",
        qty: "1",
        // Lens Specific
        indexId: "",
        coatingId: "",
        treatmentId: "",
        tintId: "",
        // Frame / Glasses Specific
        frameType: "",
        shape: "",
        size: "",
        dimensions: "",
        // Contact Lens Specific
        disposability: "",
        baseCurve: "",
        diameter: "",
    });

    const [rangeRows, setRangeRows] = useState([makeEmptyRangeRow()]);
    const [previewRows, setPreviewRows] = useState([]);
    const [showPreview, setShowPreview] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [previewSearch, setPreviewSearch] = useState("");

    // Category type detection
    const selectedCategoryObj = useMemo(() => {
        return categories.find(c => c._id === form.categoryId || c.name === form.categoryId);
    }, [categories, form.categoryId]);

    const catName = (selectedCategoryObj?.name || form.categoryId || "").toUpperCase();
    const isFrameOrGlass = catName === 'FRAME' || catName === 'SUNGLASS' || catName.includes('FRAME') || catName.includes('SUNGLASS') || catName.includes('GLASSES') || catName.includes('OPTICAL') || catName === 'READING GLASSES';
    const isContactLens = catName.includes('CONTACT');
    const isLens = !isFrameOrGlass && !isContactLens;

    useEffect(() => {
        if (isOpen) {
            // Preset first category
            const initialCat = categories[0]?._id || "";
            const initialCatName = (categories[0]?.name || "").toUpperCase();
            
            let defaultHsn = "9001";
            let defaultPrefix = "DO";
            if (initialCatName.includes("FRAME") || initialCatName.includes("GLASSES")) {
                defaultHsn = "9003";
                defaultPrefix = "FRM";
            } else if (initialCatName.includes("SUNGLASS")) {
                defaultHsn = "9004";
                defaultPrefix = "SUN";
            } else if (initialCatName.includes("CONTACT")) {
                defaultHsn = "9001";
                defaultPrefix = "CL";
            }

            setForm({
                productName: "",
                categoryId: initialCat,
                brandId: "",
                color: "BLACK",
                vendorId: "",
                material: "",
                prefix: defaultPrefix,
                price: "",
                mrp: "",
                gst: "12",
                hsnSac: defaultHsn,
                qty: "1",
                indexId: "",
                coatingId: "",
                treatmentId: "",
                tintId: "",
                frameType: "",
                shape: "",
                size: "",
                dimensions: "",
                disposability: "",
                baseCurve: "",
                diameter: "",
            });
            setRangeRows([makeEmptyRangeRow()]);
            setPreviewRows([]);
            setShowPreview(false);
        }
    }, [isOpen]);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => {
            const next = { ...prev, [name]: value };
            if (name === "categoryId") {
                const catObj = categories.find(c => c._id === value || c.name === value);
                const cUpper = (catObj?.name || value || "").toUpperCase();
                if (cUpper.includes("FRAME") || cUpper.includes("GLASSES")) {
                    next.hsnSac = "9003";
                    next.prefix = "FRM";
                } else if (cUpper.includes("SUNGLASS")) {
                    next.hsnSac = "9004";
                    next.prefix = "SUN";
                } else if (cUpper.includes("CONTACT")) {
                    next.hsnSac = "9001";
                    next.prefix = "CL";
                } else {
                    next.hsnSac = "9001";
                    next.prefix = "DO";
                }
            }
            return next;
        });
        setShowPreview(false);
    };

    const isValidStep = (val, step = DEFAULT_STEP) => {
        if (val === "" || isNaN(parseFloat(val))) return true;
        const s = parseFloat(step) || DEFAULT_STEP;
        return Math.abs(Math.round(parseFloat(val) / s) * s - parseFloat(val)) < 0.0001;
    };

    const isPositiveStep = (val) => {
        const n = parseFloat(val);
        return !isNaN(n) && n > 0;
    };

    const handleRangeRowChange = (rowId, field, value) => {
        setRangeRows(prev => prev.map(row => {
            if (row.id !== rowId) return row;
            const errors = { ...row.errors };

            if (field === "sphStep" || field === "cylStep" || field === "addStep") {
                if (value !== "" && !isPositiveStep(value)) {
                    errors[field] = "Step must be > 0";
                } else {
                    delete errors[field];
                }
                return { ...row, [field]: value, errors };
            }

            const stepField = field.startsWith("sph") ? "sphStep"
                : field.startsWith("cyl") ? "cylStep"
                    : "addStep";
            const step = parseFloat(row[stepField]) || DEFAULT_STEP;

            if (value !== "" && !isNaN(parseFloat(value))) {
                if (!isValidStep(value, step)) {
                    const nearest = (Math.round(parseFloat(value) / step) * step).toFixed(2);
                    errors[field] = "Must be a multiple of " + step + " (nearest: " + nearest + ")";
                } else {
                    delete errors[field];
                }
            } else {
                delete errors[field];
            }
            return { ...row, [field]: value, errors };
        }));
        setShowPreview(false);
    };

    const generateRowCombinations = (row) => {
        const sphFrom = parseFloat(row.sphFrom);
        const sphTo = parseFloat(row.sphTo);
        const cylFrom = parseFloat(row.cylFrom);
        const cylTo = parseFloat(row.cylTo);
        const addFrom = row.additionFrom !== "" ? parseFloat(row.additionFrom) : null;
        const addTo = row.additionTo !== "" ? parseFloat(row.additionTo) : null;

        const sphStep = parseFloat(row.sphStep) || DEFAULT_STEP;
        const cylStep = parseFloat(row.cylStep) || DEFAULT_STEP;
        const addStep = parseFloat(row.addStep) || DEFAULT_STEP;

        // If all fields are empty, return empty
        if (row.sphFrom === "" && row.sphTo === "" && row.cylFrom === "" && row.cylTo === "") {
            return null;
        }

        if ([sphFrom, sphTo, cylFrom, cylTo].some(isNaN)) return null;
        if (!isPositiveStep(sphStep) || !isPositiveStep(cylStep) || !isPositiveStep(addStep)) return null;

        const sFrom = Math.min(sphFrom, sphTo);
        const sTo = Math.max(sphFrom, sphTo);
        const cFrom = Math.min(cylFrom, cylTo);
        const cTo = Math.max(cylFrom, cylTo);

        let addSteps = [""];
        if (addFrom !== null && addTo !== null) {
            const aFrom = Math.min(addFrom, addTo);
            const aTo = Math.max(addFrom, addTo);
            addSteps = [];
            for (let a = aFrom; a <= aTo + 0.0001; a = round2(a + addStep)) {
                addSteps.push(round2(a).toFixed(2));
            }
        } else if (addFrom !== null) {
            addSteps = [round2(addFrom).toFixed(2)];
        } else if (addTo !== null) {
            addSteps = [round2(addTo).toFixed(2)];
        }

        const combos = [];
        for (let sph = sFrom; sph <= sTo + 0.0001; sph = round2(sph + sphStep)) {
            for (let cyl = cFrom; cyl <= cTo + 0.0001; cyl = round2(cyl + cylStep)) {
                for (const add of addSteps) {
                    combos.push({
                        sph: round2(sph).toFixed(2),
                        cyl: round2(cyl).toFixed(2),
                        addition: add,
                    });
                }
            }
        }
        return combos;
    };

    const totalComboCount = useMemo(() => {
        let total = 0;
        for (const row of rangeRows) {
            if (Object.keys(row.errors).length > 0) return -1;
            const combos = generateRowCombinations(row);
            if (combos === null) continue;
            total += combos.length;
        }
        return total;
    }, [rangeRows]);

    const hasAnyRangeErrors = rangeRows.some(r => Object.keys(r.errors).length > 0);

    const handlePreview = () => {
        if (!form.productName || !form.categoryId || !form.brandId)
            return toast.error("Please fill Product Name, Category, and Brand first.");
        if (hasAnyRangeErrors) return toast.error("Please fix any step combination errors first.");

        const allCombos = [];
        for (let ri = 0; ri < rangeRows.length; ri++) {
            const row = rangeRows[ri];
            if (!row.sphFrom && !row.sphTo && !row.cylFrom && !row.cylTo) {
                // If it's frame or glasses and user left powers blank, allow adding 1 standard row
                if (isFrameOrGlass && ri === 0) {
                    allCombos.push({
                        sph: "0.00",
                        cyl: "0.00",
                        addition: "",
                        rowIndex: ri,
                        price: form.price || 0,
                        mrp: form.mrp || 0,
                        qty: form.qty || 1
                    });
                }
                continue;
            }
            const combos = generateRowCombinations(row);
            if (!combos || combos.length === 0)
                return toast.error("Row " + (ri + 1) + ": SPH/CYL range invalid. Check step multiples.");
            combos.forEach(c => allCombos.push({
                ...c, rowIndex: ri,
                price: form.price || 0, mrp: form.mrp || 0, qty: form.qty || 1
            }));
        }
        if (allCombos.length === 0) return toast.error("No combinations generated. Specify at least one SPH/CYL range.");
        setPreviewRows(allCombos);
        setPreviewSearch("");
        setShowPreview(true);
    };

    const handlePreviewEdit = (idx, field, value) => {
        setPreviewRows(prev => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], [field]: value };
            return copy;
        });
    };

    const handlePreviewDeleteRow = (idx) => {
        setPreviewRows(prev => prev.filter((_, i) => i !== idx));
    };

    const filteredPreviewRows = useMemo(() => {
        if (!previewSearch.trim()) return previewRows.map((r, i) => ({ ...r, _origIdx: i }));
        const q = previewSearch.trim().toLowerCase();
        return previewRows
            .map((r, i) => ({ ...r, _origIdx: i }))
            .filter(r => {
                const label = (form.productName + " sph" + r.sph + " cyl" + r.cyl + (r.addition ? " add" + r.addition : "")).toLowerCase();
                return label.includes(q) || r.sph.includes(q) || r.cyl.includes(q);
            });
    }, [previewRows, previewSearch, form.productName]);

    const handleSubmit = async () => {
        if (!form.productName || !form.categoryId || !form.brandId)
            return toast.error("Fill Product Name, Category, and Brand.");
        if (!showPreview || previewRows.length === 0)
            return toast.error("Click Preview first to generate and review sheet rows.");

        for (let i = 0; i < previewRows.length; i++) {
            const r = previewRows[i];
            if (!r.price || Number(r.price) <= 0) return toast.error("Preview Row " + (i + 1) + ": Price must be > 0");
            if (!r.mrp || Number(r.mrp) <= 0) return toast.error("Preview Row " + (i + 1) + ": MRP must be > 0");
            if (!r.qty || Number(r.qty) <= 0) return toast.error("Preview Row " + (i + 1) + ": Qty must be > 0");
        }

        const selectedCat = categories.find(c => c._id === form.categoryId || c.name === form.categoryId);
        const selectedBrand = configs?.brand?.find(b => b._id === form.brandId || b.name === form.brandId);
        const selectedCoating = configs?.coating?.find(c => c._id === form.coatingId);
        const selectedTreatment = configs?.treatment?.find(t => t._id === form.treatmentId);
        const selectedTint = configs?.tints?.find(t => t._id === form.tintId);
        const selectedVendor = (Array.isArray(configs?.vendors) ? configs.vendors : []).find(
            v => v._id === form.vendorId || v.vendorNumber === form.vendorId || v.name === form.vendorId
        );
        const vendorObj = selectedVendor
            ? { id: selectedVendor._id || selectedVendor.vendorNumber, name: selectedVendor.name }
            : (form.vendorId ? { id: form.vendorId, name: form.vendorId } : undefined);

        const chosenColor = form.color?.trim() || "BLACK";

        const productsToCreate = previewRows.map(({ sph, cyl, addition, price, mrp, qty }, i) => {
            const hasPower = (sph && sph !== "0.00") || (cyl && cyl !== "0.00") || addition;
            const labelPower = hasPower ? ("SPH " + sph + " CYL " + cyl + (addition ? " ADD " + addition : "")) : (form.size ? "SIZE " + form.size : "");
            const generatedName = labelPower 
                ? (form.productName.trim().toUpperCase() + " " + labelPower)
                : form.productName.trim().toUpperCase();

            return {
                productCode: "" + (i + 1) + (form.prefix.trim().toUpperCase() || "DO"),
                productName: generatedName,
                category: selectedCat?.name || "",
                brand: selectedBrand?.name || "",
                // Lens attributes
                coating: isLens ? (selectedCoating?.name || "") : "",
                index: isLens ? (form.indexId || "") : "",
                addition: isLens ? (addition || "") : "",
                // Frame attributes
                type: isFrameOrGlass ? (form.frameType || "") : "",
                shape: isFrameOrGlass ? (form.shape || "") : "",
                size: isFrameOrGlass ? (form.size || "") : "",
                dimensions: isFrameOrGlass ? (form.dimensions || form.size || "") : "",
                // Contact lens attributes
                disposability: isContactLens ? (form.disposability || "") : "",
                // Common attributes
                material: form.material || "",
                color: chosenColor,
                sph,
                cyl,
                price: Number(price),
                mrp: Number(mrp),
                gst: Number(form.gst),
                hsnSac: form.hsnSac,
                qty: Number(qty),
                discount: 0,
                orderSource: form.vendorId ? 'ORDER' : 'INHOUSE',
                vendor: vendorObj || { id: null, name: null }
            };
        });

        setSubmitting(true);
        try {
            // Register in Backend Database
            const res = await api.post("/api/digi/product/bulk", {
                products: JSON.stringify(productsToCreate),
                suffix: form.prefix.trim().toUpperCase() || "DO",
            });

            if (res.data?.success) {
                toast.success(res.data.count + " bulk items created in inventory database!");
                
                // Construct the formik items
                const createdProducts = res.data.products || [];
                const finalOrderWizardRows = productsToCreate.map((prod, index) => {
                    const matchFromDb = createdProducts.find(p => p.productName === prod.productName) || {};
                    const dbId = matchFromDb._id || matchFromDb.id || "";
                    
                    const isRxType = isLens;

                    return {
                        qty: Number(prod.qty),
                        unit: isFrameOrGlass ? 'piece' : 'pair',
                        price: Number(prod.price),
                        discount: 0,
                        brand: prod.brand,
                        Brand: prod.brand,
                        brandId: form.brandId,
                        category: prod.category,
                        categoryId: form.categoryId,
                        productName: prod.productName,
                        itemName: prod.productName,
                        productId: dbId,
                        productCode: matchFromDb.productCode || prod.productCode,
                        code: matchFromDb.productCode || prod.productCode,
                        MRP: Number(prod.mrp),
                        HSNSAC: prod.hsnSac,
                        gstDetails: {
                            gstPercent: prod.gst.toString(),
                            gstType: "",
                            gstMode: "",
                            gstAmount: "",
                            loyaltyPoints: "",
                            advance: "",
                            transactionType: "",
                            remarks: ""
                        },
                        powerMode: 'both',
                        productMode: isRxType ? 'rx' : 'stock',
                        orderType: isRxType ? 'rx' : 'stock',
                        availability: form.vendorId ? 'order' : 'in-house',
                        orderSource: form.vendorId ? 'ORDER' : 'INHOUSE',
                        vendorId: form.vendorId || "",
                        vendorName: selectedVendor?.name || "",
                        vendor: vendorObj || { id: "", name: "" },
                        color: chosenColor,
                        // Frame Specific
                        frameType: isFrameOrGlass ? form.frameType : "",
                        shape: isFrameOrGlass ? form.shape : "",
                        size: isFrameOrGlass ? form.size : "",
                        dimensions: isFrameOrGlass ? (form.dimensions || form.size) : "",
                        // Lens Specific
                        indexId: isLens ? (form.indexId || "") : "",
                        coatingId: isLens ? form.coatingId : "",
                        treatmentId: isLens ? form.treatmentId : "",
                        tintId: isLens ? form.tintId : "",
                        material: form.material,
                        hasPrism: 'no',
                        powerTable: {
                            R: { sph: prod.sph, cyl: prod.cyl, axis: '', add: prod.addition, dia: '70' },
                            L: { sph: prod.sph, cyl: prod.cyl, axis: '', add: prod.addition, dia: '70' }
                        },
                        selectedSide: 'R',
                        prismTable: {
                            R: { prism: '', base: '' },
                            L: { prism: '', base: '' }
                        },
                        centrationData: {
                            R: { pd: '', corridor: '', fittingHeight: '' },
                            L: { pd: '', corridor: '', fittingHeight: '' }
                        },
                        photos: []
                    };
                });

                onAddProducts(finalOrderWizardRows);
                onClose();
            } else {
                toast.error(res.data?.message || "Product range creation failed.");
            }
        } catch (err) {
            console.error("Bulk upload error:", err);
            toast.error(err.response?.data?.message || err.message || "Failed to create products");
        } finally {
            setSubmitting(false);
        }
    };

    const inputCls = "w-full px-3 py-2.5 sm:py-2 text-xs border border-gray-200 rounded-xl sm:rounded-lg outline-none transition bg-gray-50 text-gray-700 focus:border-[#2980B9] focus:bg-white hover:border-gray-300";
    const selectCls = "w-full px-3 py-2.5 sm:py-2 text-xs border border-gray-200 rounded-xl sm:rounded-lg outline-none transition bg-gray-50 text-gray-700 focus:border-[#2980B9] focus:bg-white hover:border-gray-300";

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-5xl flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 border border-gray-100">
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 bg-gradient-to-r from-[#2980B9]/5 to-transparent flex-shrink-0">
                    <div className="min-w-0">
                        <h2 className="text-sm sm:text-base font-bold text-gray-800 flex items-center gap-2">
                            <Icon icon="mdi:playlist-plus" className="text-[#2980B9] text-lg sm:text-xl flex-shrink-0" />
                            <span className="truncate">Bulk {isFrameOrGlass ? 'Frame & Glass' : isContactLens ? 'Contact Lens' : 'Lens'} Generator</span>
                        </h2>
                        <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 truncate">
                            Define ranges and category specifications to generate catalog items
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition flex-shrink-0 ml-2"
                    >
                        <Icon icon="mdi:close" className="text-xl" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
                    {/* Basic Info */}
                    <div className="bg-gray-50/50 p-3 sm:p-4 rounded-xl border border-gray-100 space-y-3 sm:space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[11px] font-black text-[#1F618D] uppercase tracking-wider">
                                {isFrameOrGlass ? 'Frame / Glass Details' : isContactLens ? 'Contact Lens Details' : 'Lens Details'}
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2980B9]/10 text-[#2980B9] uppercase">
                                Mode: {isFrameOrGlass ? 'Frame / Glasses' : isContactLens ? 'Contact Lens' : 'Optical Lens'}
                            </span>
                        </div>

                        {/* Common Row 1 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Product Name *</label>
                                <input name="productName" type="text" className={inputCls} placeholder={isFrameOrGlass ? "e.g. AVIATOR TITANIUM CLASSIC" : "e.g. CR39 SINGLE VISION"} value={form.productName} onChange={handleFormChange} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Category *</label>
                                <select name="categoryId" className={selectCls} value={form.categoryId} onChange={handleFormChange}>
                                    <option value="">Select Category</option>
                                    {categories.map(c => <option key={c._id || c.name} value={c._id || c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Brand *</label>
                                <select name="brandId" className={selectCls} value={form.brandId} onChange={handleFormChange}>
                                    <option value="">Select Brand</option>
                                    {(configs?.brand || []).map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Color *</label>
                                <input
                                    name="color"
                                    type="text"
                                    className={inputCls}
                                    placeholder="e.g. BLACK, GOLD, CLEAR"
                                    value={form.color}
                                    onChange={handleFormChange}
                                    list="color-range-modal-options"
                                />
                                <datalist id="color-range-modal-options">
                                    <option value="BLACK" />
                                    <option value="GOLD" />
                                    <option value="SILVER" />
                                    <option value="GUNMETAL" />
                                    <option value="BROWN" />
                                    <option value="TORTOISE" />
                                    <option value="TRANSPARENT / CLEAR" />
                                    <option value="BLUE" />
                                    <option value="GREY" />
                                    <option value="MATTE BLACK" />
                                </datalist>
                            </div>
                        </div>

                        {/* DYNAMIC CATEGORY-SPECIFIC ROW 2 */}
                        {isLens && (
                            /* LENS SPECIFIC FIELDS */
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 pt-1 border-t border-gray-100">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Index</label>
                                    <input
                                        name="indexId"
                                        type="text"
                                        className={inputCls}
                                        placeholder="1.56, 1.61..."
                                        value={form.indexId}
                                        onChange={handleFormChange}
                                        list="index-range-modal-options"
                                    />
                                    <datalist id="index-range-modal-options">
                                        {(configs?.index || []).map((idx, i) => {
                                            const val = idx.value?.toString() || idx.name || idx.toString();
                                            return <option key={i} value={val} />;
                                        })}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Coating</label>
                                    <select name="coatingId" className={selectCls} value={form.coatingId} onChange={handleFormChange}>
                                        <option value="">Select Coating</option>
                                        {(configs?.coating || []).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Treatment</label>
                                    <select name="treatmentId" className={selectCls} value={form.treatmentId} onChange={handleFormChange}>
                                        <option value="">Select Treatment</option>
                                        {(configs?.treatment || []).map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Tint</label>
                                    <select name="tintId" className={selectCls} value={form.tintId} onChange={handleFormChange}>
                                        <option value="">Select Tint</option>
                                        {(configs?.tints || []).map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Material</label>
                                    <input name="material" type="text" className={inputCls} placeholder="e.g. CR39, Poly" value={form.material} onChange={handleFormChange} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Prefix Code</label>
                                    <input name="prefix" type="text" className={inputCls} placeholder="e.g. LNV" value={form.prefix} onChange={handleFormChange} />
                                </div>
                            </div>
                        )}

                        {isFrameOrGlass && (
                            /* FRAME & GLASSES SPECIFIC FIELDS */
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 pt-1 border-t border-gray-100">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Frame Type</label>
                                    <select name="frameType" className={selectCls} value={form.frameType} onChange={handleFormChange}>
                                        <option value="">Select Type</option>
                                        <option value="FULL RIM">Full Rim</option>
                                        <option value="HALF RIM">Half Rim / Supra</option>
                                        <option value="RIMLESS">Rimless</option>
                                        <option value="CLIP-ON">Clip-On</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Shape</label>
                                    <input
                                        name="shape"
                                        type="text"
                                        className={inputCls}
                                        placeholder="e.g. Rectangle, Aviator"
                                        value={form.shape}
                                        onChange={handleFormChange}
                                        list="shape-range-modal-options"
                                    />
                                    <datalist id="shape-range-modal-options">
                                        <option value="RECTANGLE" />
                                        <option value="SQUARE" />
                                        <option value="ROUND" />
                                        <option value="AVIATOR" />
                                        <option value="CAT EYE" />
                                        <option value="WAYFARER" />
                                        <option value="CLUBMASTER" />
                                        <option value="HEXAGON" />
                                        <option value="GEOMETRIC" />
                                        <option value="OVAL" />
                                    </datalist>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Size</label>
                                    <input
                                        name="size"
                                        type="text"
                                        className={inputCls}
                                        placeholder="e.g. Medium, 52-18-140"
                                        value={form.size}
                                        onChange={handleFormChange}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Dimensions</label>
                                    <input
                                        name="dimensions"
                                        type="text"
                                        className={inputCls}
                                        placeholder="e.g. 52-18-140"
                                        value={form.dimensions}
                                        onChange={handleFormChange}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Frame Material</label>
                                    <input
                                        name="material"
                                        type="text"
                                        className={inputCls}
                                        placeholder="e.g. Acetate, Titanium, TR90"
                                        value={form.material}
                                        onChange={handleFormChange}
                                        list="frame-material-options"
                                    />
                                    <datalist id="frame-material-options">
                                        <option value="ACETATE" />
                                        <option value="METAL / ALLOY" />
                                        <option value="TITANIUM" />
                                        <option value="TR90" />
                                        <option value="ULTEM" />
                                        <option value="STAINLESS STEEL" />
                                        <option value="PLASTIC" />
                                    </datalist>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Prefix Code</label>
                                    <input name="prefix" type="text" className={inputCls} placeholder="e.g. FRM" value={form.prefix} onChange={handleFormChange} />
                                </div>
                            </div>
                        )}

                        {isContactLens && (
                            /* CONTACT LENS SPECIFIC FIELDS */
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-1 border-t border-gray-100">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Disposability</label>
                                    <select name="disposability" className={selectCls} value={form.disposability} onChange={handleFormChange}>
                                        <option value="">Select Disposability</option>
                                        <option value="DAILY">Daily Disposable</option>
                                        <option value="BI-WEEKLY">Bi-Weekly</option>
                                        <option value="MONTHLY">Monthly Disposable</option>
                                        <option value="YEARLY">Yearly Conventional</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Material</label>
                                    <input name="material" type="text" className={inputCls} placeholder="e.g. Silicone Hydrogel" value={form.material} onChange={handleFormChange} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Base Curve (BC)</label>
                                    <input name="baseCurve" type="text" className={inputCls} placeholder="e.g. 8.6" value={form.baseCurve} onChange={handleFormChange} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Prefix Code</label>
                                    <input name="prefix" type="text" className={inputCls} placeholder="e.g. CL" value={form.prefix} onChange={handleFormChange} />
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Defaults & Pricing */}
                    <div className="bg-gray-50/50 p-3 sm:p-4 rounded-xl border border-gray-100 space-y-3 sm:space-y-4">
                        <h3 className="text-[11px] font-black text-[#1F618D] uppercase tracking-wider">Default Pricing, Qty & Vendor</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Price *</label>
                                <input name="price" type="number" className={inputCls} placeholder="0" value={form.price} onChange={handleFormChange} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">MRP *</label>
                                <input name="mrp" type="number" className={inputCls} placeholder="0" value={form.mrp} onChange={handleFormChange} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">HSN/SAC</label>
                                <input name="hsnSac" type="text" className={inputCls} placeholder={isFrameOrGlass ? "9003" : "9001"} value={form.hsnSac} onChange={handleFormChange} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Qty/Product *</label>
                                <input name="qty" type="number" className={inputCls} placeholder="1" value={form.qty} onChange={handleFormChange} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">GST %</label>
                                <select name="gst" className={selectCls} value={form.gst} onChange={handleFormChange}>
                                    <option value="5">5%</option>
                                    <option value="12">12%</option>
                                    <option value="18">18%</option>
                                    <option value="28">28%</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Vendor / Lab</label>
                                <select name="vendorId" className={selectCls} value={form.vendorId} onChange={handleFormChange}>
                                    <option value="">Select Vendor (Optional)</option>
                                    {(Array.isArray(configs?.vendors) ? configs.vendors : []).map(v => (
                                        <option key={v._id || v.vendorNumber} value={v._id || v.vendorNumber}>
                                            {v.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Ranges Section */}
                    <div className="space-y-3 sm:space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div>
                                <h3 className="text-[11px] font-black text-[#1F618D] uppercase tracking-wider">
                                    {isFrameOrGlass ? 'Power Range / Item Generation Rows' : 'Lens Power Range Rows'}
                                </h3>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                    {isFrameOrGlass 
                                        ? 'Configure power steps for reading glasses, or leave blank to create standard frame units' 
                                        : 'Configure SPH, CYL and ADD power ranges with step values'}
                                </p>
                            </div>
                            {totalComboCount > 0 && (
                                <div className="px-3 py-1 bg-[#eaf4fb] text-[#1F618D] text-[10px] sm:text-xs font-bold rounded-lg border border-[#2980B9]/20 flex-shrink-0">
                                    Total: {totalComboCount} items
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            {rangeRows.map((row, ri) => (
                                <div key={row.id} className="p-3 sm:p-4 bg-white rounded-xl border border-gray-200 shadow-sm space-y-3">
                                    {/* Row Header */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-500 shrink-0">
                                                {ri + 1}
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Range Row</span>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setRangeRows(prev => [...prev, makeEmptyRangeRow()])}
                                                className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition"
                                            >
                                                <Icon icon="mdi:plus" className="text-sm" />
                                            </button>
                                            {rangeRows.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setRangeRows(prev => prev.filter(r => r.id !== row.id))}
                                                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                                                >
                                                    <Icon icon="mdi:delete-outline" className="text-sm" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* SPH, CYL, ADD inputs */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                                        {/* SPH */}
                                        <div className="p-2.5 sm:p-3 bg-gray-50/70 rounded-lg border border-gray-100 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-wider">SPH Range</span>
                                                <span className="text-[9px] text-gray-400 font-bold">Step: {row.sphStep}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                <div>
                                                    <label className="text-[8px] font-bold text-gray-400 block mb-0.5">From</label>
                                                    <input type="number" step="any" placeholder="-6.00" className={inputCls} value={row.sphFrom} onChange={e => handleRangeRowChange(row.id, "sphFrom", e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="text-[8px] font-bold text-gray-400 block mb-0.5">To</label>
                                                    <input type="number" step="any" placeholder="+6.00" className={inputCls} value={row.sphTo} onChange={e => handleRangeRowChange(row.id, "sphTo", e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="text-[8px] font-bold text-gray-400 block mb-0.5">Step</label>
                                                    <input type="number" step="any" placeholder="0.25" className={inputCls} value={row.sphStep} onChange={e => handleRangeRowChange(row.id, "sphStep", e.target.value)} />
                                                </div>
                                            </div>
                                            {row.errors?.sphFrom && <p className="text-[9px] text-red-500 font-bold">{row.errors.sphFrom}</p>}
                                            {row.errors?.sphTo && <p className="text-[9px] text-red-500 font-bold">{row.errors.sphTo}</p>}
                                        </div>

                                        {/* CYL */}
                                        <div className="p-2.5 sm:p-3 bg-gray-50/70 rounded-lg border border-gray-100 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-wider">CYL Range</span>
                                                <span className="text-[9px] text-gray-400 font-bold">Step: {row.cylStep}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                <div>
                                                    <label className="text-[8px] font-bold text-gray-400 block mb-0.5">From</label>
                                                    <input type="number" step="any" placeholder="-2.00" className={inputCls} value={row.cylFrom} onChange={e => handleRangeRowChange(row.id, "cylFrom", e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="text-[8px] font-bold text-gray-400 block mb-0.5">To</label>
                                                    <input type="number" step="any" placeholder="0.00" className={inputCls} value={row.cylTo} onChange={e => handleRangeRowChange(row.id, "cylTo", e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="text-[8px] font-bold text-gray-400 block mb-0.5">Step</label>
                                                    <input type="number" step="any" placeholder="0.25" className={inputCls} value={row.cylStep} onChange={e => handleRangeRowChange(row.id, "cylStep", e.target.value)} />
                                                </div>
                                            </div>
                                            {row.errors?.cylFrom && <p className="text-[9px] text-red-500 font-bold">{row.errors.cylFrom}</p>}
                                            {row.errors?.cylTo && <p className="text-[9px] text-red-500 font-bold">{row.errors.cylTo}</p>}
                                        </div>

                                        {/* ADD */}
                                        <div className="p-2.5 sm:p-3 bg-gray-50/70 rounded-lg border border-gray-100 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-wider">Addition (Optional)</span>
                                                <span className="text-[9px] text-gray-400 font-bold">Step: {row.addStep}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                <div>
                                                    <label className="text-[8px] font-bold text-gray-400 block mb-0.5">From</label>
                                                    <input type="number" step="any" placeholder="+1.00" className={inputCls} value={row.additionFrom} onChange={e => handleRangeRowChange(row.id, "additionFrom", e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="text-[8px] font-bold text-gray-400 block mb-0.5">To</label>
                                                    <input type="number" step="any" placeholder="+3.00" className={inputCls} value={row.additionTo} onChange={e => handleRangeRowChange(row.id, "additionTo", e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="text-[8px] font-bold text-gray-400 block mb-0.5">Step</label>
                                                    <input type="number" step="any" placeholder="0.25" className={inputCls} value={row.addStep} onChange={e => handleRangeRowChange(row.id, "addStep", e.target.value)} />
                                                </div>
                                            </div>
                                            {row.errors?.additionFrom && <p className="text-[9px] text-red-500 font-bold">{row.errors.additionFrom}</p>}
                                            {row.errors?.additionTo && <p className="text-[9px] text-red-500 font-bold">{row.errors.additionTo}</p>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Preview Table */}
                    {showPreview && (
                        <div className="space-y-3 sm:space-y-4 pt-2 border-t border-gray-100">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-[11px] font-black text-[#1F618D] uppercase tracking-wider">
                                        Generated Preview ({filteredPreviewRows.length} items)
                                    </h3>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Review generated sheet before injecting into order</p>
                                </div>
                                <div className="w-full sm:w-64">
                                    <input
                                        type="text"
                                        placeholder="Search preview..."
                                        value={previewSearch}
                                        onChange={e => setPreviewSearch(e.target.value)}
                                        className="w-full px-3 py-1.5 text-xs border rounded-lg bg-gray-50"
                                    />
                                </div>
                            </div>

                            {/* Desktop Preview Table */}
                            <div className="hidden sm:block max-h-72 overflow-y-auto border border-gray-200 rounded-xl">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 font-bold text-gray-600 uppercase text-[10px]">
                                        <tr>
                                            <th className="p-2 w-12 text-center">#</th>
                                            <th className="p-2">Item Name / Particulars</th>
                                            <th className="p-2 w-20">SPH</th>
                                            <th className="p-2 w-20">CYL</th>
                                            <th className="p-2 w-20">ADD</th>
                                            <th className="p-2 w-24">Price</th>
                                            <th className="p-2 w-24">MRP</th>
                                            <th className="p-2 w-20">Qty</th>
                                            <th className="p-2 w-12 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredPreviewRows.map((r, i) => (
                                            <tr key={r._origIdx} className="hover:bg-blue-50/50">
                                                <td className="p-2 text-center text-gray-400">{i + 1}</td>
                                                <td className="p-2 font-medium text-gray-800">
                                                    {form.productName.toUpperCase() + " SPH " + r.sph + " CYL " + r.cyl + (r.addition ? " ADD " + r.addition : "")}
                                                </td>
                                                <td className="p-2 font-mono font-bold text-gray-700">{r.sph}</td>
                                                <td className="p-2 font-mono font-bold text-gray-700">{r.cyl}</td>
                                                <td className="p-2 font-mono text-gray-500">{r.addition || "—"}</td>
                                                <td className="p-2">
                                                    <input type="number" className="w-16 px-1 py-0.5 border rounded text-xs" value={r.price} onChange={e => handlePreviewEdit(r._origIdx, "price", e.target.value)} />
                                                </td>
                                                <td className="p-2">
                                                    <input type="number" className="w-16 px-1 py-0.5 border rounded text-xs" value={r.mrp} onChange={e => handlePreviewEdit(r._origIdx, "mrp", e.target.value)} />
                                                </td>
                                                <td className="p-2">
                                                    <input type="number" className="w-14 px-1 py-0.5 border rounded text-xs" value={r.qty} onChange={e => handlePreviewEdit(r._origIdx, "qty", e.target.value)} />
                                                </td>
                                                <td className="p-2 text-right">
                                                    <button type="button" onClick={() => handlePreviewDeleteRow(r._origIdx)} className="text-red-500 hover:text-red-700">
                                                        <Icon icon="mdi:delete-outline" className="text-lg" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Preview Cards */}
                            <div className="sm:hidden max-h-72 overflow-y-auto space-y-2 custom-scrollbar">
                                {filteredPreviewRows.map((r) => (
                                    <div key={r._origIdx} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-[10px] font-bold text-gray-700 leading-tight flex-1">
                                                {form.productName.toUpperCase() + " SPH " + r.sph + " CYL " + r.cyl + (r.addition ? " ADD " + r.addition : "")}
                                            </p>
                                            <button type="button" onClick={() => handlePreviewDeleteRow(r._origIdx)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                                                <Icon icon="mdi:close-circle" className="text-lg" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1.5 border border-gray-100">
                                                <span className="text-[9px] text-gray-400 font-bold">SPH</span>
                                                <span className="text-[10px] font-bold text-gray-800 font-mono">{r.sph}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1.5 border border-gray-100">
                                                <span className="text-[9px] text-gray-400 font-bold">CYL</span>
                                                <span className="text-[10px] font-bold text-gray-800 font-mono">{r.cyl}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1.5 border border-gray-100">
                                                <span className="text-[9px] text-gray-400 font-bold">ADD</span>
                                                <span className="text-[10px] font-bold text-gray-800 font-mono">{r.addition || "—"}</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label className="text-[8px] font-bold text-gray-400 block mb-0.5">Price</label>
                                                <input type="number" className="w-full px-2 py-1.5 text-[11px] border border-gray-200 rounded-lg bg-white" value={r.price} onChange={e => handlePreviewEdit(r._origIdx, "price", e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-bold text-gray-400 block mb-0.5">MRP</label>
                                                <input type="number" className="w-full px-2 py-1.5 text-[11px] border border-gray-200 rounded-lg bg-white" value={r.mrp} onChange={e => handlePreviewEdit(r._origIdx, "mrp", e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-bold text-gray-400 block mb-0.5">Qty</label>
                                                <input type="number" className="w-full px-2 py-1.5 text-[11px] border border-gray-200 rounded-lg bg-white" value={r.qty} onChange={e => handlePreviewEdit(r._origIdx, "qty", e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-3 flex-shrink-0">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-lg border border-gray-200 hover:bg-white text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 transition disabled:opacity-50 text-center"
                    >
                        Cancel
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePreview}
                            disabled={submitting || hasAnyRangeErrors}
                            className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-lg border border-[#2980B9] text-[#2980B9] hover:bg-blue-50 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition disabled:opacity-50 text-center"
                        >
                            Preview
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || previewRows.length === 0}
                            className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-lg bg-[#2980B9] hover:bg-[#1F618D] text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting && <Icon icon="mdi:loading" className="animate-spin text-sm" />}
                            <span className="hidden sm:inline">Generate & Add to Order</span>
                            <span className="sm:hidden">Add to Order</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
