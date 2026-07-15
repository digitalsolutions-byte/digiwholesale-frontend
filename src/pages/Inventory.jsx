import api from "../services/apiInstance";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchSettings } from "../store/slices/settingsSlice";
import {
    useReactTable, getCoreRowModel, getPaginationRowModel,
    getFilteredRowModel, flexRender,
} from "@tanstack/react-table";
import { toast } from "react-toastify";
import {
    FiInfo, FiShoppingCart, FiEdit2, FiTrash2, FiX, FiRefreshCw,
    FiImage, FiSearch, FiPlus, FiChevronLeft, FiChevronRight,
    FiPackage, FiCalendar, FiPrinter, FiTag, FiCheckSquare, FiLayout, FiBox, FiLayers, FiAward, FiAlignLeft, FiDollarSign, FiEyeOff, FiSave, FiBarChart2, FiGrid, FiSliders, FiHash, FiEye, FiMove, FiArrowDown, FiColumns
} from "react-icons/fi";
import Swal from "sweetalert2";
import { v4 as uuidv4 } from "uuid";
import { BsUpcScan, BsQrCode } from "react-icons/bs";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode"; // npm install qrcode

import * as XLSX from "xlsx";
import { FiUpload, FiDownload, FiCheckCircle, FiAlertCircle } from "react-icons/fi";

// ─── shared primitives ────────────────────────────────────────────────────────
const Modal = ({ children, onClose, maxWidth = "max-w-5xl" }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className={`bg-white w-full ${maxWidth} max-h-[92vh] rounded-2xl shadow-2xl flex flex-col animate-fadeIn`}>
            {children}
        </div>
    </div>
);

const ModalHeader = ({ title, subtitle, onClose, icon: Icon }) => (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
            {Icon && (
                <div className="w-8 h-8 rounded-xl bg-[#2980b9]/10 flex items-center justify-center">
                    <Icon size={15} className="text-[#2980b9]" />
                </div>
            )}
            <div>
                <h2 className="text-sm font-bold text-gray-800">{title}</h2>
                {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition">
            <FiX size={15} />
        </button>
    </div>
);

const ModalFooter = ({ children }) => (
    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl flex-shrink-0">
        {children}
    </div>
);

const SectionTitle = ({ children }) => (
    <div className="flex items-center gap-2 mb-4">
        <div className="w-0.5 h-4 bg-[#2980b9] rounded-full" />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{children}</span>
    </div>
);

const FieldInput = ({ label, children }) => (
    <div>
        <label className="text-[10px] font-semibold text-gray-700 uppercase   block mb-1">{label}</label>
        {children}
    </div>
);

const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-[#2980b9]/40 focus:ring-2 focus:ring-[#2980b9]/20 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300";
const selectCls = inputCls;

const FETCH_LIMIT = 100;
const PAGE_SIZE = 100;

// ─── Checkbox cell component ──────────────────────────────────────────────────
function RowCheckbox({ checked, onChange, indeterminate = false }) {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) ref.current.indeterminate = indeterminate;
    }, [indeterminate]);
    return (
        <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            className="w-3.5 h-3.5 rounded accent-[#2980b9] cursor-pointer"
        />
    );
}

// ─── Product Keyword Suggestion Input ────────────────────────────────────────
function ProductKeywordInput({ value, onChange }) {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef(null);
    const containerRef = useRef(null);

    const fetchSuggestions = async (q) => {
        if (!q || q.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
        try {
            setSearching(true);
            const res = await api.get("/api/digi/product/suggestion", { params: { q } });
            if (res.data.success) { setSuggestions(res.data.data || []); setShowSuggestions(true); }
        } catch { /* silent */ }
        finally { setSearching(false); }
    };

    const handleChange = (e) => {
        onChange(e.target.value);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchSuggestions(e.target.value), 320);
    };

    const handleSelect = (s) => {
        const q = value.trim().toLowerCase();
        let filled = s.productCode || "";
        if (s.category?.toLowerCase().includes(q)) filled = s.category;
        else if (s.brand?.toLowerCase().includes(q)) filled = s.brand;
        else if (s.type?.toLowerCase().includes(q)) filled = s.type;
        else if (s.color?.toLowerCase().includes(q)) filled = s.color;
        else filled = s.productCode || s.category || "";
        onChange(filled);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target))
                setShowSuggestions(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={containerRef} className="relative flex flex-col flex-1 sm:w-48">
            <label className="text-[10px] font-semibold text-gray-400 uppercase   mb-1">Keyword</label>
            <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={12} />
                {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-[#2980b9]/40 border-t-transparent rounded-full animate-spin pointer-events-none" />
                )}
                <input
                    type="text"
                    value={value}
                    onChange={handleChange}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="Code, brand, category..."
                    className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#2980b9]/40 focus:ring-2 focus:ring-[#2980b9]/20 bg-gray-50 text-gray-700 transition placeholder:text-gray-300"
                />
                {value && !searching && (
                    <button onClick={() => { onChange(""); setSuggestions([]); setShowSuggestions(false); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition">
                        <FiX size={12} />
                    </button>
                )}
            </div>
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="px-3 py-2 bg-[#2980b9]/10 border-b border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Suggestions</p>
                    </div>
                    <ul className="max-h-52 overflow-y-auto">
                        {suggestions.map((s, i) => (
                            <li key={i}>
                                <button onMouseDown={() => handleSelect(s)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#2980b9]/10 transition text-left">
                                    <div className="w-7 h-7 rounded-full bg-[#2980b9]/10 border border-[#2980b9]/20 flex items-center justify-center flex-shrink-0">
                                        <FiPackage size={11} className="text-[#2980b9]" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">
                                            {s.productCode || "—"}
                                            {s.brand ? <span className="text-gray-400 font-normal"> · {s.brand}</span> : ""}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate">
                                            {[s.category, s.type].filter(Boolean).join(" · ")}
                                        </p>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Inventory() {
    const dispatch = useDispatch();
    const [showAddProductModal, setShowAddProductModal] = useState(false);
    const [showLensRangeModal, setShowLensRangeModal] = useState(false);
    const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
    const [vendors, setVendors] = useState([]);
    const settings = useSelector((state) => state.settings.data);

    useEffect(() => {
        dispatch(fetchSettings());
    }, [dispatch]);

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [keyword, setKeyword] = useState("");
    const [triggerSearch, setTriggerSearch] = useState(false);

    const fetchAllVendors = async () => {
        try {
            const res = await api.get("/api/vendor");
            if (res.data.success) setVendors(res.data.vendors);
        } catch (err) { console.error(err); }
    };
    useEffect(() => { fetchAllVendors(); }, []);

    const handleRefresh = () => {
        Swal.fire({
            title: "Are you sure?", text: "The page will be refreshed.", icon: "warning",
            showCancelButton: true, confirmButtonColor: "#ea580c", cancelButtonColor: "#6b7280",
            confirmButtonText: "Yes, refresh it!",
        }).then((result) => { if (result.isConfirmed) window.location.reload(); });
    };

    const emptyRow = {
        id: uuidv4(), date: "", productCode: "", productName: "", category: "",
        brand: "", color: "", size: "", type: "", shape: "", sph: "", cyl: "",
        index: "", axis: "", addition: "", coating: "", expiry: "", price: "", gst: "0",
        hsnSac: "", mrp: "", qty: "", image: null, material: "", dimensions: ""
    };

    const [rows, setRows] = useState([emptyRow]);
    const addRow = () => setRows([...rows, { ...emptyRow, id: uuidv4() }]);
    const removeRow = (id) => { if (rows.length === 1) return; setRows(prev => prev.filter(r => r.id !== id)); };

    const LENS_FIELDS = ["sph", "cyl", "index", "axis", "coating", "expiry"];
    const isLensCategory = (v) => v.toLowerCase().includes("lens") || v.toLowerCase().includes("glass") || v.toLowerCase().includes("contact lens");

    const handleChange = (i, key, value) => {
        const copy = [...rows];
        if (key === "category") {
            copy[i].category = value;
            if (!isLensCategory(value)) LENS_FIELDS.forEach(f => { copy[i][f] = ""; });
        } else if (key === "gst") {
            copy[i].gst = Number(value) || "0";
        } else {
            copy[i][key] = value;
        }
        setRows(copy);
    };

    const validateProductsRows = (rows) => {
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row.productCode?.trim()) return `Product Code is required (Row ${i + 1})`;
            if (!row.productName?.trim()) return `Product Name is required (Row ${i + 1})`;
            if (!row.category) return `Category is required (Row ${i + 1})`;
            if (!row.brand) return `Brand is required (Row ${i + 1})`;
            if (row.price === "" || Number(row.price) <= 0) return `Price must be > 0 (Row ${i + 1})`;
            if (row.mrp === "" || Number(row.mrp) <= 0) return `MRP must be > 0 (Row ${i + 1})`;
            if (row.qty === "" || Number(row.qty) <= 0) return `Quantity must be > 0 (Row ${i + 1})`;
        }
        return null;
    };

    const submitAddProductForm = async (e) => {
        e.preventDefault();
        const errorMessage = validateProductsRows(rows);
        if (errorMessage) { toast.error(errorMessage); return; }
        try {
            const formData = new FormData();
            formData.append("products", JSON.stringify(rows));
            rows.forEach((row, index) => { if (row.image instanceof File) formData.append(`productImage_${index}`, row.image); });
            const res = await api.post("/api/digi/product", formData, { headers: { "Content-Type": "multipart/form-data" } });
            if (res.data.success) {
                toast.success("Products added successfully");
                setRows([{ ...emptyRow, id: uuidv4() }]);
                setShowAddProductModal(false);
            } else { toast.error(res.data.message || "Something went wrong"); }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save products");
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">

            {/* ── Filter bar ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowAddProductModal(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#2980b9] hover:bg-[#2980b9]/90 text-white text-xs font-semibold rounded-xl transition shadow-sm">
                            <FiPlus size={13} /> Add Product
                        </button>
                        <button onClick={() => setShowBulkUploadModal(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#2980b9]/40 hover:bg-[#2980b9]/10 text-[#2980b9]/90 text-xs font-semibold rounded-xl transition shadow-sm">
                            <FiUpload size={13} /> Bulk Upload
                        </button>
                        <button onClick={handleRefresh}
                            className="flex items-center gap-2 bg-[#2980b9] hover:bg-[#2980b9]/90 text-white px-4 py-2 text-xs font-semibold rounded-lg transition shadow-sm w-fit">
                            <FiRefreshCw size={13} /> Refresh
                        </button>
                        <button onClick={() => setShowLensRangeModal(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-blue-300 hover:bg-blue-50 text-blue-600 text-xs font-semibold rounded-xl transition shadow-sm">
                            <FiPlus size={13} /> Lens Range
                        </button>
                    </div>


                    <div className="flex flex-col sm:flex-row items-end gap-3 w-full lg:w-auto">
                        <div className="flex gap-3 w-full sm:w-auto">
                            <div className="flex flex-col flex-1 sm:w-40">
                                <label className="text-[10px] font-semibold text-gray-400 uppercase   mb-1">From Date</label>
                                <div className="relative">
                                    <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={12} />
                                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#2980b9]/40 focus:ring-2 focus:ring-[#2980b9]/20 bg-gray-50 text-gray-700 transition" />
                                </div>
                            </div>
                            <div className="flex flex-col flex-1 sm:w-40">
                                <label className="text-[10px] font-semibold text-gray-400 uppercase   mb-1">To Date</label>
                                <div className="relative">
                                    <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={12} />
                                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#2980b9]/40 focus:ring-2 focus:ring-[#2980b9]/20 bg-gray-50 text-gray-700 transition" />
                                </div>
                            </div>
                        </div>
                        <ProductKeywordInput value={keyword} onChange={setKeyword} />
                        <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => setTriggerSearch(prev => prev + 1)}
                                className="px-4 py-2 bg-[#2980b9] hover:bg-[#2980b9]/90 text-white text-xs font-semibold rounded-xl transition shadow-sm">
                                Search
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Inventory Table ── */}
            <InventoryTable
                fromDate={fromDate} setFromDate={setFromDate}
                toDate={toDate} setToDate={setToDate}
                keyword={keyword} setKeyword={setKeyword}
                triggerSearch={triggerSearch} setTriggerSearch={setTriggerSearch}
            />

            {/* ── Add Product Modal ── */}
            {showAddProductModal && (
                <Modal onClose={() => setShowAddProductModal(false)} maxWidth="max-w-7xl">
                    <ModalHeader title="Add Product" subtitle="Fill in product details below" icon={FiPlus} onClose={() => setShowAddProductModal(false)} />
                    <form onSubmit={submitAddProductForm} className="flex-1 min-h-0 flex flex-col">
                        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
                            {rows.map((row, i) => (
                                <div key={row.id} className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[10px] font-bold text-[#2980b9] uppercase tracking-widest">Product #{i + 1}</span>
                                        {rows.length > 1 && (
                                            <button type="button" onClick={() => removeRow(row.id)}
                                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition">
                                                <FiTrash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
                                        <FieldInput label="Date">
                                            <input type="date" className={inputCls} onChange={e => handleChange(i, "date", e.target.value)} />
                                        </FieldInput>
                                        <FieldInput label="Code *">
                                            <input type="text" className={inputCls} placeholder="e.g. PRD001" onChange={e => handleChange(i, "productCode", e.target.value)} />
                                        </FieldInput>
                                        <FieldInput label="Name *">
                                            <input type="text" className={inputCls} placeholder="Product name" onChange={e => handleChange(i, "productName", e.target.value)} />
                                        </FieldInput>
                                        <FieldInput label="Category *">
                                            <select className={selectCls} onChange={e => handleChange(i, "category", e.target.value)}>
                                                <option value="">Select</option>
                                                {settings?.allCategories?.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}
                                            </select>
                                        </FieldInput>
                                        <FieldInput label="Brand *">
                                            <input type="text" className={inputCls} placeholder="Brand" onChange={e => handleChange(i, "brand", e.target.value)} />
                                        </FieldInput>
                                        <FieldInput label="Color">
                                            <input type="text" className={inputCls} placeholder="Color" onChange={e => handleChange(i, "color", e.target.value)} />
                                        </FieldInput>
                                        <FieldInput label="Size">
                                            <input type="text" className={inputCls} placeholder="Size" onChange={e => handleChange(i, "size", e.target.value)} />
                                        </FieldInput>
                                        <FieldInput label="Type">
                                            <input type="text" className={inputCls} placeholder="Type" onChange={e => handleChange(i, "type", e.target.value)} />
                                        </FieldInput>
                                        <FieldInput label="Shape">
                                            <input type="text" className={inputCls} placeholder="Shape" onChange={e => handleChange(i, "shape", e.target.value)} />
                                        </FieldInput>

                                        <FieldInput label="Material">
                                            <input type="text" className={inputCls} placeholder="Material" onChange={e => handleChange(i, "material", e.target.value)} />
                                        </FieldInput>

                                        <FieldInput label="Dimensions">
                                            <input type="text" className={inputCls} placeholder="Dimensions" onChange={e => handleChange(i, "dimensions", e.target.value)} />
                                        </FieldInput>

                                        <FieldInput label="Image">
                                            <input type="file" accept="image/*" className={inputCls} onChange={e => handleChange(i, "image", e.target.files[0])} />
                                        </FieldInput>

                                        {["LENS", "GLASS", "CONTACT"].some(k => row.category?.toUpperCase().includes(k)) && (<>
                                            <FieldInput label="SPH"><input type="text" className={inputCls} onChange={e => handleChange(i, "sph", e.target.value)} /></FieldInput>
                                            <FieldInput label="CYL"><input type="text" className={inputCls} onChange={e => handleChange(i, "cyl", e.target.value)} /></FieldInput>
                                            <FieldInput label="Index"><input type="text" className={inputCls} onChange={e => handleChange(i, "index", e.target.value)} /></FieldInput>
                                            <FieldInput label="Axis"><input type="text" className={inputCls} onChange={e => handleChange(i, "axis", e.target.value)} /></FieldInput>

                                            <FieldInput label="Addition"><input type="text" className={inputCls} onChange={e => handleChange(i, "addition", e.target.value)} /></FieldInput>

                                            <FieldInput label="Coating"><input type="text" className={inputCls} onChange={e => handleChange(i, "coating", e.target.value)} /></FieldInput>
                                            <FieldInput label="Expiry"><input type="date" className={inputCls} onChange={e => handleChange(i, "expiry", e.target.value)} /></FieldInput>
                                        </>)}

                                        <FieldInput label="Price *">
                                            <input type="number" className={inputCls} placeholder="0" onChange={e => handleChange(i, "price", e.target.value)} />
                                        </FieldInput>
                                        <FieldInput label="GST %">
                                            <select className={selectCls} onChange={e => handleChange(i, "gst", e.target.value)}>
                                                {settings?.gst?.map((p, idx) => <option key={idx} value={p}>{p}%</option>)}
                                            </select>
                                        </FieldInput>
                                        <FieldInput label="HSN/SAC">
                                            <input type="text" className={inputCls} placeholder="HSN code" onChange={e => handleChange(i, "hsnSac", e.target.value)} />
                                        </FieldInput>
                                        <FieldInput label="MRP *">
                                            <input type="number" className={inputCls} placeholder="0" onChange={e => handleChange(i, "mrp", e.target.value)} />
                                        </FieldInput>
                                        <FieldInput label="Qty *">
                                            <input type="number" className={inputCls} placeholder="0" onChange={e => handleChange(i, "qty", e.target.value)} />
                                        </FieldInput>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={addRow}
                                className="w-full py-3 border-2 border-dashed border-[#2980b9]/40 hover:border-[#2980b9]/60 text-[#2980b9] hover:text-[#2980b9]/90 text-xs font-semibold rounded-2xl transition flex items-center justify-center gap-2">
                                <FiPlus size={14} /> Add Another Product
                            </button>
                        </div>
                        <ModalFooter>
                            <button type="button" onClick={() => setShowAddProductModal(false)}
                                className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                                Cancel
                            </button>
                            <button type="submit"
                                className="px-5 py-2 bg-[#2980b9] hover:bg-[#2980b9]/90 text-white text-xs font-semibold rounded-xl transition shadow-sm">
                                Submit Products
                            </button>
                        </ModalFooter>
                    </form>
                </Modal>
            )}

            {showBulkUploadModal && (
                <BulkUploadModal onClose={() => setShowBulkUploadModal(false)} />
            )}

            {showLensRangeModal && (
                <LensRangeModal
                    settings={settings}
                    vendors={vendors}
                    onClose={() => setShowLensRangeModal(false)}
                />
            )}
        </div>
    );
}



// ─────────────────────────────────────────────────────────────────────────────
//  LensRangeModal — generate multiple lens products from SPH × CYL × Addition ranges
// ─────────────────────────────────────────────────────────────────────────────




const RangeCell = ({ row, field, placeholder, onRangeChange, onRangeBlur }) => {
    const hasErr = !!row.errors[field];
    return (
        <div className="flex flex-col gap-0.5">
            <input
                type="number"
                step={
                    field.startsWith("sph") ? (row.sphStep || "0.25")
                        : field.startsWith("cyl") ? (row.cylStep || "0.25")
                            : (row.addStep || "0.25")
                }
                placeholder={placeholder}
                value={row[field]}
                onChange={e => onRangeChange(row.id, field, e.target.value)}
                onBlur={e => onRangeBlur(row.id, field, e.target.value)}
                className={`w-full px-2 py-1.5 text-xs border rounded-lg outline-none transition bg-gray-50 text-gray-700
                    ${hasErr
                        ? "border-red-400 focus:ring-red-100 focus:border-red-400"
                        : "border-gray-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400"}`}
            />
            {hasErr && (
                <span className="text-[9px] text-red-500 leading-tight">{row.errors[field]}</span>
            )}
        </div>
    );
};

const StepCell = ({ row, field, label, onRangeChange }) => {
    const hasErr = !!row.errors[field];
    return (
        <div className="flex flex-col gap-0.5">
            <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest text-center">
                {label}
            </label>
            <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.25"
                value={row[field]}
                onChange={e => onRangeChange(row.id, field, e.target.value)}
                className={`w-full px-2 py-1.5 text-xs border rounded-lg outline-none transition text-center font-mono
                    ${hasErr
                        ? "border-red-400 bg-red-50 text-red-700 focus:ring-red-100"
                        : "border-violet-200 bg-violet-50 text-violet-700 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 hover:border-violet-300"}`}
            />
            {hasErr && (
                <span className="text-[9px] text-red-500 leading-tight text-center">{row.errors[field]}</span>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────

const makeEmptyRangeRow = () => ({
    id: crypto.randomUUID(),
    sphFrom: "", sphTo: "",
    cylFrom: "", cylTo: "",
    additionFrom: "", additionTo: "",
    sphStep: "0.25", cylStep: "0.25", addStep: "0.25",
    errors: {},
});

export function LensRangeModal({ settings, vendors, onClose }) {
    const DEFAULT_STEP = 0.25;
    const round2 = (n) => Math.round(n * 100) / 100;

    const isValidStep = (val, step = DEFAULT_STEP) => {
        if (val === "" || isNaN(parseFloat(val))) return true;
        const s = parseFloat(step) || DEFAULT_STEP;
        return Math.abs(Math.round(parseFloat(val) / s) * s - parseFloat(val)) < 0.0001;
    };

    const isPositiveStep = (val) => {
        const n = parseFloat(val);
        return !isNaN(n) && n > 0;
    };

    const isLensCat = (cat) => /lens|glass|contact/i.test(cat || "");
    const lensCategories = (settings?.allCategories || []).filter(isLensCat);
    const brandList = settings?.brands?.length ? settings.brands : [];

    // ── Product / pricing form ──
    const [form, setForm] = useState({
        productName: "", category: "", brand: "",
        coating: "", material: "", index: "",
        price: "", mrp: "", gst: "12", hsnSac: "9001",
        qty: "", discount: "0",
        vendorNumber: "", vendorName: "",
        prefix: "DO",
    });
    const [categoryError, setCategoryError] = useState("");

    // ── Multiple range rows ──
    const [rangeRows, setRangeRows] = useState([makeEmptyRangeRow()]);

    // ── Preview state ──
    const [previewRows, setPreviewRows] = useState([]);
    const [showPreview, setShowPreview] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [previewSearch, setPreviewSearch] = useState("");

    // ── Form handlers ──
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => {
            const next = { ...prev, [name]: value };
            if (name === "category") {
                if (value && !isLensCat(value)) {
                    setCategoryError("Only Lens, Glass, or Contact Lens categories are allowed here.");
                } else {
                    setCategoryError("");
                }
            }
            return next;
        });
        setShowPreview(false);
    };

    // ── Range row handlers ──
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
                    errors[field] = `Must be a multiple of ${step} (nearest: ${nearest})`;
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

    const handleRangeRowBlur = (rowId, field, value) => {
        const row = rangeRows.find(r => r.id === rowId);
        if (!row) return;
        const stepField = field.startsWith("sph") ? "sphStep"
            : field.startsWith("cyl") ? "cylStep"
                : "addStep";
        const step = parseFloat(row[stepField]) || DEFAULT_STEP;
        if (value !== "" && !isNaN(parseFloat(value)) && !isValidStep(value, step)) {
            const nearest = (Math.round(parseFloat(value) / step) * step).toFixed(2);
            toast.error(`${field.replace(/([A-Z])/g, ' $1').toUpperCase()}: Must be multiple of ${step} (nearest: ${nearest})`);
        }
    };

    const addRangeRow = () => setRangeRows(prev => [...prev, makeEmptyRangeRow()]);

    const removeRangeRow = (rowId) => {
        if (rangeRows.length === 1) return;
        setRangeRows(prev => prev.filter(r => r.id !== rowId));
        setShowPreview(false);
    };

    // ── Per-row combination generator ──
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

        if ([sphFrom, sphTo, cylFrom, cylTo].some(isNaN)) return null;
        if (!isPositiveStep(sphStep) || !isPositiveStep(cylStep) || !isPositiveStep(addStep)) return null;

        if (!isValidStep(sphFrom, sphStep) || !isValidStep(sphTo, sphStep)) return null;
        if (!isValidStep(cylFrom, cylStep) || !isValidStep(cylTo, cylStep)) return null;

        const sFrom = Math.min(sphFrom, sphTo);
        const sTo = Math.max(sphFrom, sphTo);
        const cFrom = Math.min(cylFrom, cylTo);
        const cTo = Math.max(cylFrom, cylTo);

        let addSteps = [""];
        if (addFrom !== null && addTo !== null) {
            if (isNaN(addFrom) || isNaN(addTo)) return null;
            if (!isValidStep(addFrom, addStep) || !isValidStep(addTo, addStep)) return null;
            const aFrom = Math.min(addFrom, addTo);
            const aTo = Math.max(addFrom, addTo);
            addSteps = [];
            for (let a = aFrom; a <= aTo + 0.0001; a = round2(a + addStep)) {
                addSteps.push(round2(a).toFixed(2));
            }
        } else if (addFrom !== null) {
            if (!isNaN(addFrom) && isValidStep(addFrom, addStep))
                addSteps = [round2(addFrom).toFixed(2)];
        } else if (addTo !== null) {
            if (!isNaN(addTo) && isValidStep(addTo, addStep))
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

    // ── Live total count ──
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

    // ── Preview builder ──
    const handlePreview = () => {
        if (!form.productName || !form.category || !form.brand)
            return toast.error("Please fill Product Name, Category, and Brand first.");
        if (categoryError) return toast.error(categoryError);
        if (hasAnyRangeErrors) return toast.error("Fix the range step errors first.");

        const allCombos = [];
        for (let ri = 0; ri < rangeRows.length; ri++) {
            const row = rangeRows[ri];
            if (!row.sphFrom && !row.sphTo && !row.cylFrom && !row.cylTo) continue;
            const combos = generateRowCombinations(row);
            if (!combos || combos.length === 0)
                return toast.error(`Row ${ri + 1}: Check SPH/CYL range — values must be valid multiples of their steps.`);
            combos.forEach(c => allCombos.push({
                ...c, rowIndex: ri,
                price: form.price, mrp: form.mrp, qty: form.qty
            }));
        }
        if (allCombos.length === 0) return toast.error("No combinations generated. Fill at least one range row.");
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
                const label = `${form.productName} sph${r.sph} cyl${r.cyl} ${r.addition ? `add${r.addition}` : ""}`.toLowerCase();
                return label.includes(q) || r.sph.includes(q) || r.cyl.includes(q) || (r.addition || "").includes(q);
            });
    }, [previewRows, previewSearch, form.productName]);

    // ── Submit ──
    const handleSubmit = async () => {
        if (!form.productName || !form.category || !form.brand)
            return toast.error("Fill Product Name, Category, and Brand.");
        if (categoryError) return toast.error(categoryError);
        if (!isLensCat(form.category)) return toast.error("Only Lens / Glass / Contact Lens categories are allowed.");
        if (hasAnyRangeErrors) return toast.error("Fix range errors first.");
        if (!showPreview || previewRows.length === 0) return toast.error("Click Preview first.");

        for (let i = 0; i < previewRows.length; i++) {
            const r = previewRows[i];
            if (!r.price || Number(r.price) <= 0) return toast.error(`Row ${i + 1}: Price must be > 0`);
            if (!r.mrp || Number(r.mrp) <= 0) return toast.error(`Row ${i + 1}: MRP must be > 0`);
            if (!r.qty || Number(r.qty) <= 0) return toast.error(`Row ${i + 1}: Qty must be > 0`);
        }

        const products = previewRows.map(({ sph, cyl, addition, price, mrp, qty }, i) => ({
            productCode: `${i + 1}${form.prefix.trim().toUpperCase() || "DO"}`,
            productName: form.productName.trim().toUpperCase(),
            category: form.category.trim().toUpperCase(),
            brand: form.brand,
            coating: form.coating,
            material: form.material,
            addition: addition || "",
            index: form.index,
            sph,
            cyl,
            price: Number(price),
            mrp: Number(mrp),
            gst: Number(form.gst),
            hsnSac: form.hsnSac,
            qty: Number(qty),
            discount: Number(form.discount) || 0,
            vendorNumber: form.vendorNumber,
            vendorName: form.vendorName,
        }));

        setSubmitting(true);
        try {
            const res = await api.post("/api/digi/product/bulk", {
                products: JSON.stringify(products),
                suffix: form.prefix.trim().toUpperCase() || "DO",
            });
            if (res.data.success) {
                toast.success(`${res.data.count} lens products created successfully.`);
                onClose();
            } else {
                toast.error(res.data.message || "Upload failed.");
            }
        } catch (err) {
            toast.error(err.message || err.response?.data?.message || "Something went wrong.");
        } finally {
            setSubmitting(false);
        }
    };

    // ── Shared input class helpers ──
    const inputCls = "w-full px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none transition bg-gray-50 text-gray-700 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-300";
    const selectCls = "w-full px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none transition bg-gray-50 text-gray-700 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-300";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                            <FiPlus className="text-orange-500" size={18} />
                            Lens Range Generator
                        </h2>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                            Auto-create lens products across SPH × CYL × Addition ranges
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                    >
                        <FiX size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">

                    {/* ── Product Info ── */}
                    <div>
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-3">
                            Product Info
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider block mb-1">
                                    Product Name *
                                </label>
                                <input
                                    name="productName" type="text" className={inputCls}
                                    placeholder="e.g. CR39 Single Vision"
                                    value={form.productName} onChange={handleFormChange}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider block mb-1">
                                    Category *
                                </label>
                                <select
                                    name="category"
                                    className={`${selectCls} ${categoryError ? "border-red-400" : ""}`}
                                    value={form.category} onChange={handleFormChange}
                                >
                                    <option value="">Select</option>
                                    {lensCategories.length > 0
                                        ? lensCategories.map((cat, i) => (
                                            <option key={i} value={cat}>{cat}</option>
                                        ))
                                        : (settings?.allCategories || []).map((cat, i) => (
                                            <option key={i} value={cat} disabled={!isLensCat(cat)}
                                                style={!isLensCat(cat) ? { color: "#9ca3af" } : {}}>
                                                {cat}{!isLensCat(cat) ? " (not allowed)" : ""}
                                            </option>
                                        ))
                                    }
                                </select>
                                {categoryError && (
                                    <p className="text-[10px] text-red-500 mt-1">{categoryError}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider block mb-1">
                                    Brand *
                                </label>
                                <input name="brand" type="text" className={inputCls} placeholder="e.g. Zeiss"
                                    value={form.brand} onChange={handleFormChange} />
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider block mb-1">
                                    Index
                                </label>
                                <input name="index" type="text" className={inputCls} placeholder="e.g. 1.56"
                                    value={form.index} onChange={handleFormChange} />
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider block mb-1">
                                    Coating
                                </label>
                                <input name="coating" type="text" className={inputCls} placeholder="e.g. AR Coating"
                                    value={form.coating} onChange={handleFormChange} />
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider block mb-1">
                                    Material
                                </label>
                                <input name="material" type="text" className={inputCls} placeholder="e.g. CR39"
                                    value={form.material} onChange={handleFormChange} />
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider block mb-1">
                                    Vendor
                                </label>
                                <select
                                    name="vendorNumber" className={selectCls} value={form.vendorNumber}
                                    onChange={e => {
                                        const vendorName = e.target.options[e.target.selectedIndex].text;
                                        setForm(prev => ({ ...prev, vendorNumber: e.target.value, vendorName }));
                                        setShowPreview(false);
                                    }}
                                >
                                    <option value="">Select</option>
                                    {vendors?.map(v => (
                                        <option key={v.vendorNumber} value={v.vendorNumber}>{v.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* ── Pricing ── */}
                    <div>
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-3">
                            Default Pricing
                            <span className="normal-case font-normal text-gray-400 ml-1">(editable per row in preview)</span>
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                            {[
                                { label: "Price *", name: "price", type: "number", placeholder: "0" },
                                { label: "MRP *", name: "mrp", type: "number", placeholder: "0" },
                                { label: "HSN/SAC", name: "hsnSac", type: "text", placeholder: "9001" },
                                { label: "Discount (₹)", name: "discount", type: "number", placeholder: "0" },
                                { label: "Qty per product *", name: "qty", type: "number", placeholder: "0" },
                            ].map(f => (
                                <div key={f.name}>
                                    <label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider block mb-1">
                                        {f.label}
                                    </label>
                                    <input name={f.name} type={f.type} className={inputCls}
                                        placeholder={f.placeholder} value={form[f.name]} onChange={handleFormChange} />
                                </div>
                            ))}
                            <div>
                                <label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider block mb-1">
                                    GST %
                                </label>
                                <select name="gst" className={selectCls} value={form.gst} onChange={handleFormChange}>
                                    {(settings?.gst || [5, 12, 18]).map((p, i) => (
                                        <option key={i} value={p}>{p}%</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* ── SPH × CYL × Addition Range Rows ── */}
                    <div className="space-y-5">
                        {/* Header */}
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                            <div>
                                <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                    SPH × CYL × Addition Ranges
                                </h3>
                                <p className="text-xs text-gray-400 mt-1">
                                    Configure lens power ranges with custom step values.
                                </p>
                            </div>
                            {totalComboCount > 0 && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm">
                                    <span className="text-[10px] uppercase tracking-wider opacity-80">Products</span>
                                    <span className="text-sm font-bold leading-none">{totalComboCount}</span>
                                </div>
                            )}
                        </div>

                        {/* Info Box */}
                        <div className="flex gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4">
                            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                                i
                            </div>
                            <div className="text-xs text-blue-800 leading-relaxed">
                                <strong>Tip:</strong> All From/To values must follow their step values.
                                Addition range is optional.
                            </div>
                        </div>

                        {/* Rows */}
                        <div className="space-y-4">
                            {rangeRows.map((row, ri) => {
                                const rowCombos = (() => {
                                    if (Object.keys(row.errors).length > 0) return null;
                                    if (!row.sphFrom && !row.sphTo && !row.cylFrom && !row.cylTo) return null;
                                    return generateRowCombinations(row);
                                })();

                                return (
                                    <div
                                        key={row.id}
                                        className="relative border border-gray-200 bg-white rounded-3xl shadow-sm hover:shadow-md transition-all overflow-hidden"
                                    >
                                        {/* Top bar */}
                                        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-2xl bg-orange-100 text-orange-600 text-sm font-bold flex items-center justify-center">
                                                    {ri + 1}
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-semibold text-gray-800">
                                                        Range Configuration
                                                    </h3>
                                                    {rowCombos !== null && rowCombos.length > 0 && (
                                                        <p className="text-[11px] text-blue-600 font-medium">
                                                            {rowCombos.length} combinations generated
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeRangeRow(row.id)}
                                                disabled={rangeRows.length === 1}
                                                className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-30"
                                            >
                                                <FiX size={14} />
                                            </button>
                                        </div>

                                        {/* Content */}
                                        <div className="p-5 space-y-5">

                                            {/* Power Ranges */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-1.5 h-5 rounded-full bg-orange-400" />
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                                        Power Ranges
                                                    </h4>
                                                </div>
                                                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                                                    {[
                                                        { field: "sphFrom", placeholder: "-6.00", label: "SPH From" },
                                                        { field: "sphTo", placeholder: "+2.00", label: "SPH To" },
                                                        { field: "cylFrom", placeholder: "-4.00", label: "CYL From" },
                                                        { field: "cylTo", placeholder: "0.00", label: "CYL To" },
                                                        { field: "additionFrom", placeholder: "+0.75", label: "Add From" },
                                                        { field: "additionTo", placeholder: "+3.00", label: "Add To" },
                                                    ].map(({ field, placeholder, label }) => (
                                                        <div key={field}>
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                                                                {label}
                                                            </label>
                                                            {/* ✅ RangeCell is now defined OUTSIDE — no remount on re-render */}
                                                            <RangeCell
                                                                row={row}
                                                                field={field}
                                                                placeholder={placeholder}
                                                                onRangeChange={handleRangeRowChange}
                                                                onRangeBlur={handleRangeRowBlur}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Step Values */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-1.5 h-5 rounded-full bg-indigo-400" />
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                                        Step Values
                                                    </h4>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    {[
                                                        { field: "sphStep", label: "SPH step", title: "SPH Step" },
                                                        { field: "cylStep", label: "CYL step", title: "CYL Step" },
                                                        { field: "addStep", label: "Add step", title: "ADD Step" },
                                                    ].map(({ field, label, title }) => (
                                                        <div key={field} className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">
                                                                {title}
                                                            </p>
                                                            {/* ✅ StepCell is now defined OUTSIDE — no remount on re-render */}
                                                            <StepCell
                                                                row={row}
                                                                field={field}
                                                                label={label}
                                                                onRangeChange={handleRangeRowChange}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Add Button */}
                        <button
                            onClick={addRangeRow}
                            className="w-full py-3 rounded-2xl border-2 border-dashed border-orange-300 hover:border-orange-500 bg-orange-50 hover:bg-orange-100 text-orange-600 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                        >
                            <FiPlus size={16} />
                            Add Another Range
                        </button>

                        {/* Warning */}
                        {totalComboCount === 0 &&
                            rangeRows.some(r => r.sphFrom || r.cylFrom) &&
                            !hasAnyRangeErrors && (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-medium">
                                    ⚠ No valid combinations found. Check range and step values.
                                </div>
                            )}
                    </div>

                    {/* ── Code Suffix ── */}
                    <div>
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-3">
                            Product Code
                        </h3>
                        <div className="flex items-center gap-4">
                            <div className="w-40">
                                <label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider block mb-1">
                                    Suffix
                                </label>
                                <input name="prefix" type="text" className={inputCls} placeholder="DO"
                                    value={form.prefix} onChange={handleFormChange} maxLength={6} />
                            </div>
                            <p className="text-xs text-gray-400 mt-5">
                                Codes auto-generated as{" "}
                                <span className="font-mono font-semibold text-gray-600">
                                    1{form.prefix || "DO"}, 2{form.prefix || "DO"}, 3{form.prefix || "DO"}…
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* ── Preview Table ── */}
                    {showPreview && previewRows.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3 gap-3">
                                <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                    Preview — {previewRows.length} product{previewRows.length !== 1 ? "s" : ""}
                                    {previewSearch && filteredPreviewRows.length !== previewRows.length && (
                                        <span className="ml-1 font-normal text-gray-400">
                                            ({filteredPreviewRows.length} shown)
                                        </span>
                                    )}
                                    <span className="normal-case font-normal text-gray-400 ml-1 text-[10px]">
                                        (Price, MRP, Qty editable)
                                    </span>
                                </h3>
                                <div className="relative flex-shrink-0">
                                    <FiSearch size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Search SPH, CYL, ADD…"
                                        value={previewSearch}
                                        onChange={e => setPreviewSearch(e.target.value)}
                                        className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 bg-white text-gray-700 w-48 transition"
                                    />
                                    {previewSearch && (
                                        <button
                                            onClick={() => setPreviewSearch("")}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                                        >
                                            <FiX size={11} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-gray-100">
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100 border-b border-gray-200">
                                            {["#", "Code", "Product Name", "SPH", "CYL", "Addition", "Price ✎", "MRP ✎", "Qty ✎", ""].map(h => (
                                                <th key={h} className="px-3 py-2.5 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPreviewRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className="px-4 py-8 text-center text-xs text-gray-400">
                                                    No rows match "
                                                    <span className="font-semibold text-gray-500">{previewSearch}</span>"
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredPreviewRows.map((row, fi) => {
                                                const origIdx = row._origIdx;
                                                return (
                                                    <tr
                                                        key={origIdx}
                                                        className={`border-b border-gray-50 ${fi % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                                                    >
                                                        <td className="px-3 py-1.5 text-center text-gray-400">{origIdx + 1}</td>
                                                        <td className="px-3 py-1.5 text-center font-mono text-xs text-gray-700 whitespace-nowrap">
                                                            {origIdx + 1}{form.prefix.trim().toUpperCase() || "DO"}
                                                        </td>
                                                        <td className="px-3 py-1.5 text-gray-700 whitespace-nowrap">
                                                            {form.productName.toUpperCase()}
                                                        </td>
                                                        <td className="px-3 py-1.5 text-center font-mono text-blue-600">{row.sph}</td>
                                                        <td className="px-3 py-1.5 text-center font-mono text-blue-600">{row.cyl}</td>
                                                        <td className="px-3 py-1.5 text-center font-mono text-purple-600">
                                                            {row.addition || "—"}
                                                        </td>
                                                        <td className="px-2 py-1">
                                                            <input
                                                                type="number" value={row.price}
                                                                onChange={e => handlePreviewEdit(origIdx, "price", e.target.value)}
                                                                className="w-20 px-2 py-1 text-xs border border-orange-200 rounded-lg outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-100 bg-orange-50 text-gray-700 text-center"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-1">
                                                            <input
                                                                type="number" value={row.mrp}
                                                                onChange={e => handlePreviewEdit(origIdx, "mrp", e.target.value)}
                                                                className="w-20 px-2 py-1 text-xs border border-orange-200 rounded-lg outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-100 bg-orange-50 text-gray-700 text-center"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-1">
                                                            <input
                                                                type="number" value={row.qty}
                                                                onChange={e => handlePreviewEdit(origIdx, "qty", e.target.value)}
                                                                className="w-16 px-2 py-1 text-xs border border-orange-200 rounded-lg outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-100 bg-orange-50 text-gray-700 text-center"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-1">
                                                            <button
                                                                onClick={() => handlePreviewDeleteRow(origIdx)}
                                                                title="Remove this product"
                                                                className="w-6 h-6 flex items-center justify-center rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50 transition mx-auto cursor-pointer"
                                                            >
                                                                <FiTrash2 size={11} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2 text-right">
                                {previewSearch && filteredPreviewRows.length !== previewRows.length
                                    ? `Showing ${filteredPreviewRows.length} of ${previewRows.length} products — `
                                    : `Showing all ${previewRows.length} products — `}
                                edit Price, MRP or Qty inline, or delete unwanted rows before submitting.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-3xl">
                    <button
                        onClick={handlePreview}
                        disabled={submitting || hasAnyRangeErrors || totalComboCount === 0}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-blue-600 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 transition disabled:opacity-50"
                    >
                        Preview {totalComboCount > 0 ? `(${totalComboCount})` : ""}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !showPreview || previewRows.length === 0 || hasAnyRangeErrors}
                        className="flex items-center gap-2 px-5 py-2 bg-erp-primary hover:bg-erp-secondary text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-60"
                    >
                        {submitting && (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        {submitting ? "Creating..." : `Create ${previewRows.length > 0 ? previewRows.length : ""} Products`}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── InventoryTable ───────────────────────────────────────────────────────────
function InventoryTable({ fromDate, setFromDate, toDate, setToDate, keyword, setKeyword, triggerSearch, setTriggerSearch }) {
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const isFirstRender = useRef(true);

    const [globalFilter, setGlobalFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    // const [vendors, setVendors] = useState([]);

    const [openEditProductModal, setOpenEditProductModal] = useState(false);
    const [openInventoryModal, setOpenInventoryModal] = useState(false);
    const [openInventoryHistoryTableModal, setOpenInventoryHistoryTableModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const settings = useSelector((state) => state.settings.data);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const [openBarcodeModal, setOpenBarcodeModal] = useState(false);
    const [barcodeProduct, setBarcodeProduct] = useState(null);

    // ── Row selection state ───────────────────────────────────────────────────
    // Map of rowId (_id) → product object for selected rows
    const [selectedRows, setSelectedRows] = useState({});
    // Pre-filled products array for bulk modals
    const [bulkStockProducts, setBulkStockProducts] = useState(null);   // null = not open
    const [bulkBarcodeProducts, setBulkBarcodeProducts] = useState(null); // null = not open

    const selectedCount = Object.keys(selectedRows).length;
    const selectedProductsList = Object.values(selectedRows); // array of product objects

    const toggleRow = (product) => {
        setSelectedRows(prev => {
            const next = { ...prev };
            if (next[product._id]) delete next[product._id];
            else next[product._id] = product;
            return next;
        });
    };

    const toggleAllVisible = (tableRows) => {
        const allSelected = tableRows.every(r => selectedRows[r.original._id]);
        if (allSelected) {
            // deselect all visible
            setSelectedRows(prev => {
                const next = { ...prev };
                tableRows.forEach(r => delete next[r.original._id]);
                return next;
            });
        } else {
            // select all visible
            setSelectedRows(prev => {
                const next = { ...prev };
                tableRows.forEach(r => { next[r.original._id] = r.original; });
                return next;
            });
        }
    };

    const clearSelection = () => setSelectedRows({});

    const fetchProducts = async (pageNumber = 1, append = false) => {
        try {
            pageNumber === 1 ? setLoading(true) : setLoadingMore(true);
            const res = await api.get("/api/digi/product", { params: { page: pageNumber, limit: FETCH_LIMIT } });
            if (res.data.success) {
                setData(prev => append ? [...prev, ...(res.data.products || [])] : (res.data.products || []));
                setHasMore(res.data.hasMore);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); setLoadingMore(false); }
    };

    // const fetchAllVendors = async () => {
    //     try {
    //         const res = await api.get("/vendor");
    //         if (res.data.success) setVendors(res.data.vendors);
    //     } catch (err) { console.error(err); }
    // };

    useEffect(() => { fetchProducts(1, false); /* fetchAllVendors(); */ }, []);

    const handleLoadMore = () => {
        if (!hasMore || loadingMore) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchProducts(nextPage, true);
    };

    const handleDeleteProduct = async (product) => {
        const result = await Swal.fire({
            title: "Are you sure?", text: `Delete product (${product.productCode})?`,
            icon: "warning", showCancelButton: true,
            confirmButtonColor: "#dc2626", cancelButtonColor: "#6b7280",
            confirmButtonText: "Yes, delete it",
        });
        if (!result.isConfirmed) return;
        try {
            Swal.fire({ title: "Deleting...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const res = await api.delete(`/api/digi/product/${product._id}`);
            if (res.data.success) {
                setData(prev => prev.filter(p => p._id !== product._id));
                setFilteredData(prev => prev.filter(p => p._id !== product._id));
                setSelectedRows(prev => { const n = { ...prev }; delete n[product._id]; return n; });
                Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false });
            }
        } catch (error) {
            Swal.fire({ icon: "error", title: "Error", text: error.message || error.response?.data?.message || "Something went wrong" });
        }
    };

    const emptyInventoryRow = { productCode: "", qty: "", expiry: "", price: "", gst: "0", total: "", mrp: "" /*, vendorId: "", vendorName: "" */ };
    const [inventoryRows, setInventoryRows] = useState([{ ...emptyInventoryRow }]);

    const updateRow = (index, field, value) => {
        setInventoryRows(prev => prev.map((row, i) => {
            if (i !== index) return row;
            const updatedRow = { ...row, [field]: field === "qty" ? Math.floor(Number(value)) : value };
            const qty = Number(updatedRow.qty) || 0;
            const price = Number(updatedRow.price) || 0;
            const gst = Number(updatedRow.gst) || 0;
            updatedRow.total = (qty * price * (1 + gst / 100)).toFixed(2);
            return updatedRow;
        }));
    };

    const addInventoryRow = () => setInventoryRows(prev => [...prev, { ...emptyInventoryRow }]);
    const removeInventoryRow = (index) => setInventoryRows(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));

    const validateInventoryRows = () => {
        for (let i = 0; i < inventoryRows.length; i++) {
            const row = inventoryRows[i];
            if (!row.productCode?.trim()) return `Product Code is required (Row ${i + 1})`;
            if (!row.qty || Number(row.qty) <= 0) return `Quantity must be > 0 (Row ${i + 1})`;
            if (row.price === "" || Number(row.price) < 0) return `Price must be > 0 (Row ${i + 1})`;
            if (row.mrp === "" || Number(row.mrp) < 0) return `MRP must be > 0 (Row ${i + 1})`;
        }
        return null;
    };

    const handleInventorySubmit = async (e) => {
        e.preventDefault();
        const err = validateInventoryRows();
        if (err) { Swal.fire({ icon: "error", title: "Validation Error", text: err }); return; }
        try {
            const res = await api.post("/api/digi/product/add/inventory", { items: inventoryRows });
            if (res.data.success) {
                Swal.fire({ icon: "success", title: "Success", text: "Inventory added successfully" });
                setOpenInventoryModal(false);
                setBulkStockProducts(null);
                setInventoryRows([{ ...emptyInventoryRow }]);
                clearSelection();
            }
        } catch (error) {
            Swal.fire({ icon: "error", title: "Error", text: error.message || error.response?.data?.message || "Something went wrong" });
        }
    };

    const searchProducts = async () => {
        if (!fromDate && !toDate && !keyword) { toast.warning("Please provide at least one filter."); return; }
        if ((fromDate && !toDate) || (!fromDate && toDate)) { toast.warning("Select both From and To dates."); return; }
        if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) { toast.warning("From date cannot be after To date."); return; }
        if (keyword && keyword.trim().length < 3) { toast.warning("Keyword must be at least 3 characters."); return; }
        try {
            setLoading(true); setPage(1);
            const res = await api.post("/api/digi/product/search", { startDate: fromDate || undefined, endDate: toDate || undefined, keyword: keyword || undefined });
            if (res.data.success) { setFilteredData(res.data.products || []); setIsSearching(true); }
            else toast.info(res.data.message);
        } catch (err) { toast.error(err.response?.data?.message || "Search failed"); }
        finally { setLoading(false); }
    };

    const handleResetSearch = () => {
        setFromDate(""); setToDate(""); setKeyword("");
        setFilteredData([]); setIsSearching(false); setPage(1);
    };

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        searchProducts();
    }, [triggerSearch]);

    // ── Open bulk Add Stock — pre-fill rows from selected products ────────────
    const openBulkStock = () => {
        const preFilled = selectedProductsList.map(p => ({
            ...emptyInventoryRow,
            productCode: p.productCode || "",
            mrp: p.mrp ? String(p.mrp) : "",
            price: p.price ? String(p.price) : "",
            gst: p.gst ? String(p.gst) : "0",
        }));
        setInventoryRows(preFilled.length > 0 ? preFilled : [{ ...emptyInventoryRow }]);
        setBulkStockProducts(selectedProductsList);
        setOpenInventoryModal(true);
    };

    // ── Open bulk Barcode print — pre-fill from selected products ─────────────
    const openBulkBarcode = () => {
        setBulkBarcodeProducts(selectedProductsList);
        setOpenBarcodeModal(true);
    };

    const columns = useMemo(() => [
        // ── Checkbox column ──────────────────────────────────────────────────
        {
            id: "select",
            header: ({ table }) => {
                const visibleRows = table.getRowModel().rows;
                const allChecked = visibleRows.length > 0 && visibleRows.every(r => selectedRows[r.original._id]);
                const someChecked = visibleRows.some(r => selectedRows[r.original._id]);
                return (
                    <RowCheckbox
                        checked={allChecked}
                        indeterminate={!allChecked && someChecked}
                        onChange={() => toggleAllVisible(visibleRows)}
                    />
                );
            },
            cell: ({ row }) => (
                <div className="flex justify-center">
                    <RowCheckbox
                        checked={!!selectedRows[row.original._id]}
                        onChange={() => toggleRow(row.original)}
                    />
                </div>
            ),
        },
        {
            header: "Action", id: "actions",
            cell: ({ row }) => {
                const product = row.original;
                return (
                    <div className="flex items-center justify-center gap-0.5">
                        <button onClick={e => { e.stopPropagation(); setSelectedProduct(product); setOpenEditProductModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-[#2980b9]/10 text-[#2980b9] transition" title="Edit">
                            <FiEdit2 size={14} />
                        </button>
                        <button onClick={e => {
                            e.stopPropagation();
                            setInventoryRows([{ ...emptyInventoryRow, productCode: product.productCode, mrp: product.mrp ? String(product.mrp) : "", price: product.price ? String(product.price) : "", gst: product.gst ? String(product.gst) : "0" }]);
                            setBulkStockProducts(null);
                            setOpenInventoryModal(true);
                        }}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-500 transition" title="Add Stock">
                            <FiShoppingCart size={14} />
                        </button>
                        <button onClick={e => {
                            e.stopPropagation();
                            setBulkBarcodeProducts(null);
                            setBarcodeProduct(product);
                            setOpenBarcodeModal(true);
                        }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition" title="Print Barcode">
                            <BsUpcScan size={14} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setOpenInventoryHistoryTableModal(true); setSelectedProduct(product); }}
                            className="p-1.5 rounded-lg hover:bg-[#2980b9]/10 text-[#2980b9] transition" title="Inventory History">
                            <FiInfo size={14} />
                        </button>
                    </div>
                );
            },
        },
        { header: "Date", accessorKey: "createdAt", cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString("en-IN") : "-" },
        { header: "Code", accessorKey: "productCode" },
        { header: "Name", accessorKey: "productName" },
        { header: "Category", accessorKey: "category" },
        { header: "Brand", accessorKey: "brand" },
        {
            header: "Image", accessorKey: "image",
            cell: ({ row }) => {
                const product = row.original;
                if (!product.image) return <span className="text-gray-300">—</span>;
                return (
                    <div className="flex justify-center">
                        <button onClick={e => { e.stopPropagation(); window.open(product.image, "_blank"); }}
                            className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-500 transition" title="View Image">
                            <FiImage size={14} />
                        </button>
                    </div>
                );
            },
        },
        { header: "Qty", accessorKey: "qty" },
        { header: "MRP", accessorKey: "mrp", cell: ({ getValue }) => `₹${getValue()}` },
        { header: "GST %", accessorKey: "gst", cell: ({ getValue }) => `${getValue()}%` },
        { header: "SPH", accessorKey: "sph", cell: ({ getValue }) => getValue() || "—" },
        { header: "CYL", accessorKey: "cyl", cell: ({ getValue }) => getValue() || "—" },
        { header: "Axis", accessorKey: "axis", cell: ({ getValue }) => getValue() || "—" },

        { header: "Add.", accessorKey: "addition", cell: ({ getValue }) => getValue() || "—" },
        { header: "Dimensions", accessorKey: "dimensions", cell: ({ getValue }) => getValue() || "—" },
        { header: "Material", accessorKey: "material", cell: ({ getValue }) => getValue() || "—" },

        { header: "Color", accessorKey: "color", cell: ({ getValue }) => getValue() || "—" },
        { header: "Shape", accessorKey: "shape", cell: ({ getValue }) => getValue() || "—" },
        { header: "Size", accessorKey: "size", cell: ({ getValue }) => getValue() || "—" },
        { header: "Type", accessorKey: "type", cell: ({ getValue }) => getValue() || "—" },
        { header: "Index", accessorKey: "index", cell: ({ getValue }) => getValue() || "—" },
        { header: "Coating", accessorKey: "coating", cell: ({ getValue }) => getValue() || "—" },
        { header: "Expiry", accessorKey: "expiry", cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString("en-IN") : "—" },
        { header: "Price", accessorKey: "price", cell: ({ getValue }) => `₹${getValue()}` },
        { header: "HSN/SAC", accessorKey: "hsnSac", cell: ({ getValue }) => getValue() || "—" },
        {
            header: "Delete", id: "delete",
            cell: ({ row }) => (
                <div className="flex justify-center">
                    <button onClick={e => { e.stopPropagation(); handleDeleteProduct(row.original); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500 transition" title="Delete">
                        <FiTrash2 size={14} />
                    </button>
                </div>
            ),
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [selectedRows]);

    const table = useReactTable({
        data: isSearching ? filteredData : data,
        columns,
        state: { globalFilter },
        onGlobalFilterChange: setGlobalFilter,
        initialState: { pagination: { pageIndex: 0, pageSize: PAGE_SIZE } },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const currentPage = table.getState().pagination.pageIndex;
    const totalPages = table.getPageCount();
    const MAX_PAGES = 5;
    let startPage = Math.max(0, currentPage - Math.floor(MAX_PAGES / 2));
    let endPage = Math.min(totalPages, startPage + MAX_PAGES);
    const pages = Array.from({ length: endPage - startPage }, (_, i) => startPage + i);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-[#2980b9]/40 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-400">Loading inventory...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Table top bar */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 flex-wrap">

                {/* ── Selection action bar (visible when rows are checked) ── */}
                {selectedCount > 0 ? (
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Selection summary badge */}
                        <div className="flex items-center gap-2 bg-[#2980b9]/10 border border-[#2980b9]/40 rounded-xl px-3 py-1.5">
                            <FiCheckSquare size={13} className="text-[#2980b9]" />
                            <span className="text-xs font-bold text-[#2980b9]/90">
                                {selectedCount} row{selectedCount > 1 ? "s" : ""} selected
                            </span>
                        </div>

                        {/* Bulk Add Stock */}
                        <button
                            onClick={openBulkStock}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                        >
                            <FiShoppingCart size={13} /> Add Stock ({selectedCount})
                        </button>

                        {/* Bulk Print */}
                        <button
                            onClick={openBulkBarcode}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                        >
                            <FiPrinter size={13} /> Print Labels ({selectedCount})
                        </button>

                    </div>
                ) : (
                    <div /> // placeholder to keep search on right
                )}

                {/* Quick search */}
                <div className="relative w-full sm:w-60">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={13} />
                    <input type="text" value={globalFilter ?? ""} onChange={e => setGlobalFilter(e.target.value)}
                        placeholder="Quick search..."
                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#2980b9]/40 focus:ring-2 focus:ring-[#2980b9]/20 transition text-gray-600 placeholder:text-gray-300" />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 z-10 bg-gray-200">
                        {table.getHeaderGroups().map(hg => (
                            <tr key={hg.id} className="bg-gray-200 border-b border-gray-100">
                                {hg.headers.map(h => (
                                    <th key={h.id} className="px-4 py-3 text-center text-xs font-semibold text-gray-800 whitespace-nowrap uppercase  ">
                                        {flexRender(h.column.columnDef.header, h.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.length === 0 && (
                            <tr><td colSpan={columns.length} className="py-14 text-center text-gray-400 text-sm">No products found</td></tr>
                        )}
                        {table.getRowModel().rows.map(row => {
                            const isChecked = !!selectedRows[row.original._id];
                            return (
                                <tr key={row.id}
                                    className={`border-b border-gray-50 text-center transition-colors cursor-pointer
                                        ${isChecked ? "bg-[#2980b9]/10/70 hover:bg-[#2980b9]/10" : "hover:bg-[#2980b9]/10"}`}
                                    onClick={() => toggleRow(row.original)}
                                >
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id}
                                            className="px-4 py-2.5 text-gray-700 whitespace-nowrap text-sm"
                                            onClick={e => {
                                                // Don't toggle row when clicking action buttons
                                                if (cell.column.id === "actions" || cell.column.id === "delete") e.stopPropagation();
                                            }}
                                        >
                                            {flexRender(cell.column.columnDef.cell ?? cell.column.columnDef.accessorKey, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-gray-100">
                <button
                    onClick={isSearching ? handleResetSearch : handleLoadMore}
                    disabled={loadingMore || (!isSearching && !hasMore)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition
                        ${loadingMore || (!isSearching && !hasMore)
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : isSearching ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                                : "bg-[#2980b9] hover:bg-[#2980b9]/90 text-white"}`}>
                    {loadingMore ? "Loading..." : isSearching ? "Reset Search" : "Load More"}
                </button>
                <div className="flex items-center gap-1">
                    <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition">
                        <FiChevronLeft size={14} />
                    </button>
                    {startPage > 0 && (<><button onClick={() => table.setPageIndex(0)} className="w-8 h-8 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold">1</button><span className="text-gray-300 text-xs">…</span></>)}
                    {pages.map(p => (
                        <button key={p} onClick={() => table.setPageIndex(p)}
                            className={`w-8 h-8 text-xs rounded-lg font-semibold transition ${p === currentPage ? "bg-[#2980b9] text-white shadow-sm" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                            {p + 1}
                        </button>
                    ))}
                    {endPage < totalPages && (<><span className="text-gray-300 text-xs">…</span><button onClick={() => table.setPageIndex(totalPages - 1)} className="w-8 h-8 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold">{totalPages}</button></>)}
                    <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition">
                        <FiChevronRight size={14} />
                    </button>
                </div>
            </div>

            {/* Modals */}
            {openEditProductModal && (
                <EditProductModal product={selectedProduct} settings={settings}
                    onClose={() => { setOpenEditProductModal(false); setSelectedProduct(null); }} />
            )}

            {openInventoryModal && (
                <InventoryModal open={openInventoryModal}
                    onClose={() => { setOpenInventoryModal(false); setBulkStockProducts(null); }}
                    inventoryRows={inventoryRows} updateRow={updateRow}
                    addRow={addInventoryRow} removeRow={removeInventoryRow}
                    handleInventorySubmit={handleInventorySubmit}
                    settings={settings}
                    // vendors={vendors}
                    bulkProducts={bulkStockProducts}
                />
            )}

            {openInventoryHistoryTableModal && (
                <InventoryHistoryModal product={selectedProduct}
                    onClose={() => { setSelectedProduct(null); setOpenInventoryHistoryTableModal(false); }} />
            )}

            {openBarcodeModal && (
                <BarcodePrintModal
                    product={bulkBarcodeProducts ? null : barcodeProduct}
                    bulkProducts={bulkBarcodeProducts}
                    inventoryData={data}
                    onClose={() => { setOpenBarcodeModal(false); setBarcodeProduct(null); setBulkBarcodeProducts(null); }}
                    settings={settings}
                />
            )}
        </div>
    );
}


// ─── Edit Product Modal ───────────────────────────────────────────────────────
function EditProductModal({ product, settings, onClose }) {
    const toInputDate = (v) => v ? new Date(v).toISOString().split("T")[0] : "";

    const [formData, setFormData] = useState({
        createdAt: "", productCode: "", productName: "", category: "", brand: "",
        color: "", size: "", type: "", shape: "", sph: "", cyl: "", index: "",
        axis: "", coating: "", expiry: "", price: "", gst: "0", hsnSac: "", mrp: "", qty: "",
    });
    const [selectedImage, setSelectedImage] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (product) {
            setFormData({
                createdAt: toInputDate(product.createdAt), productCode: product.productCode || "",
                productName: product.productName || "", category: product.category || "",
                brand: product.brand || "", color: product.color || "", size: product.size || "",
                type: product.type || "", shape: product.shape || "", sph: product.sph || "",
                cyl: product.cyl || "", index: product.index || "", axis: product.axis || "",
                coating: product.coating || "", expiry: toInputDate(product.expiry),
                price: product.price || "", gst: product.gst || "0", hsnSac: product.hsnSac || "",
                mrp: product.mrp || "", qty: product.qty || "",

                addition: product.addition || "", material: product.material || "", dimensions: product.dimensions || ""
            });
        }
    }, [product]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const dataToSend = new FormData();
            Object.keys(formData).forEach(key => dataToSend.append(key, formData[key]));
            dataToSend.append("productId", product._id);
            if (selectedImage instanceof File) dataToSend.append("image", selectedImage);
            const res = await api.put(`/api/digi/product`, dataToSend, { headers: { "Content-Type": "multipart/form-data" } });
            if (res.data.success) { toast.success("Product updated successfully"); onClose(); }
            else toast.error(res.data.message || "Update failed");
        } catch (err) { toast.error("Something went wrong"); }
        finally { setSaving(false); }
    };

    const fields = [
        { name: "createdAt", label: "Date", type: "date" },
        { name: "productCode", label: "Product Code", type: "text" },
        { name: "productName", label: "Product Name", type: "text" },
        { name: "brand", label: "Brand", type: "text" },
        { name: "color", label: "Color", type: "text" },
        { name: "size", label: "Size", type: "text" },
        { name: "type", label: "Type", type: "text" },
        { name: "shape", label: "Shape", type: "text" },
        { name: "sph", label: "SPH", type: "text" },
        { name: "cyl", label: "CYL", type: "text" },
        { name: "index", label: "Index", type: "text" },
        { name: "axis", label: "Axis", type: "text" },
        { name: "coating", label: "Coating", type: "text" },
        { name: "expiry", label: "Expiry", type: "date" },
        { name: "price", label: "Price", type: "number" },
        { name: "hsnSac", label: "HSN/SAC", type: "text" },
        { name: "mrp", label: "MRP", type: "number" },

        { name: "addition", label: "ADD.", type: "text" },
        { name: "material", label: "MATERIAL", type: "text" },
        { name: "dimensions", label: "DIMENSIONS", type: "text" },

        { name: "qty", label: "Quantity", type: "number" },
    ];

    return (
        <Modal onClose={onClose} maxWidth="max-w-5xl">
            <ModalHeader title="Edit Product" subtitle={product?.productName} icon={FiEdit2} onClose={onClose} />
            <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 min-h-0 overflow-y-auto p-6">
                    <SectionTitle>Product Details</SectionTitle>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {fields.map(f => (
                            <FieldInput key={f.name} label={f.label}>
                                <input name={f.name} type={f.type} value={formData[f.name]}
                                    onChange={handleChange} className={inputCls} />
                            </FieldInput>
                        ))}
                        <FieldInput label="Category">
                            <select name="category" value={formData.category} onChange={handleChange} className={selectCls}>
                                <option value="">Select</option>
                                {settings?.allCategories?.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}
                            </select>
                        </FieldInput>
                        <FieldInput label="GST %">
                            <select name="gst" value={formData.gst} onChange={handleChange} className={selectCls}>
                                {settings?.gst?.map((p, idx) => <option key={idx} value={p}>{p}%</option>)}
                            </select>
                        </FieldInput>
                        <FieldInput label="Product Image">
                            <div className="flex items-center gap-2">
                                {product?.image && (
                                    <button type="button" onClick={() => window.open(product.image, "_blank")}
                                        className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-500 transition flex-shrink-0">
                                        <FiImage size={14} />
                                    </button>
                                )}
                                <input type="file" accept="image/*" onChange={e => setSelectedImage(e.target.files[0])}
                                    className={inputCls} />
                            </div>
                        </FieldInput>
                    </div>
                </div>
                <ModalFooter>
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
                    <button type="submit" disabled={saving}
                        className="flex items-center gap-2 px-5 py-2 bg-[#2980b9] hover:bg-[#2980b9]/90 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-60">
                        {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </ModalFooter>
            </form>
        </Modal>
    );
}


// ─── Inventory Modal ──────────────────────────────────────────────────────────
// bulkProducts: array of product objects (when opened from bulk selection), or null
const InventoryModal = ({ open, onClose, inventoryRows, updateRow, addRow, removeRow, handleInventorySubmit, settings, vendors, bulkProducts }) => {
    if (!open) return null;

    return (
        <Modal onClose={onClose} maxWidth="max-w-5xl">
            <ModalHeader
                title="Add Inventory"
                subtitle={bulkProducts
                    ? `Bulk stock update · ${bulkProducts.length} product${bulkProducts.length > 1 ? "s" : ""} selected`
                    : "Update stock levels"
                }
                icon={FiShoppingCart}
                onClose={onClose}
            />


            <form onSubmit={handleInventorySubmit} className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-3">
                    {inventoryRows.map((row, index) => (
                        <div key={index} className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-bold text-[#2980b9] uppercase tracking-widest">
                                    Row #{index + 1}
                                    {bulkProducts?.[index]?.productCode && (
                                        <span className="ml-2 font-mono text-gray-400 normal-case font-normal">
                                            — {bulkProducts[index].productCode}
                                        </span>
                                    )}
                                </span>
                                {inventoryRows.length > 1 && (
                                    <button type="button" onClick={() => removeRow(index)}
                                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition">
                                        <FiTrash2 size={13} />
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
                                <FieldInput label="Product Code">
                                    <input type="text" value={row.productCode} onChange={e => updateRow(index, "productCode", e.target.value)}
                                        className={inputCls} placeholder="Code" />
                                </FieldInput>
                                <FieldInput label="Quantity">
                                    <input type="number" min="0" step="1" value={row.qty} onChange={e => updateRow(index, "qty", e.target.value)}
                                        className={inputCls} placeholder="0" />
                                </FieldInput>
                                <FieldInput label="Expiry">
                                    <input type="date" value={row.expiry} onChange={e => updateRow(index, "expiry", e.target.value)} className={inputCls} />
                                </FieldInput>
                                <FieldInput label="Price">
                                    <input type="number" value={row.price} onChange={e => updateRow(index, "price", e.target.value)}
                                        className={inputCls} placeholder="0" />
                                </FieldInput>
                                <FieldInput label="Tax %">
                                    <select value={row.gst} onChange={e => updateRow(index, "gst", e.target.value)} className={selectCls}>
                                        {settings?.gst?.map((g, idx) => <option key={idx} value={g}>{g}%</option>)}
                                    </select>
                                </FieldInput>
                                <FieldInput label="Total">
                                    <input type="number" value={row.total} readOnly className={`${inputCls} bg-[#2980b9]/10 text-emerald-600 font-semibold`} />
                                </FieldInput>
                                <FieldInput label="MRP">
                                    <input type="number" value={row.mrp} onChange={e => updateRow(index, "mrp", e.target.value)}
                                        className={inputCls} placeholder="0" />
                                </FieldInput>
                                {/* <FieldInput label="Vendor">
                                    <select onChange={e => {
                                        const vendorId = e.target.value || null;
                                        const vendorName = e.target.options[e.target.selectedIndex].text;
                                        updateRow(index, "vendorId", vendorId);
                                        updateRow(index, "vendorName", vendorName);
                                    }} className={selectCls}>
                                        <option value="">Select</option>
                                        {vendors?.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
                                    </select>
                                </FieldInput> */}
                            </div>
                        </div>
                    ))}

                    <button type="button" onClick={addRow}
                        className="w-full py-3 border-2 border-dashed border-[#2980b9]/40 hover:border-[#2980b9]/60 text-[#2980b9] hover:text-[#2980b9]/90 text-xs font-semibold rounded-2xl transition flex items-center justify-center gap-2">
                        <FiPlus size={14} /> Add Row
                    </button>
                </div>

                <ModalFooter>
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
                    <button type="submit"
                        className="px-5 py-2 bg-[#2980b9] hover:bg-[#2980b9]/90 text-white text-xs font-semibold rounded-xl transition shadow-sm">Submit</button>
                </ModalFooter>
            </form>
        </Modal>
    );
};


// ─── Inventory History Modal ──────────────────────────────────────────────────
const InventoryHistoryModal = ({ product, onClose }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (product?._id) fetchInventoryHistory();
    }, [product]);

    const fetchInventoryHistory = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/digi/product/inventory/${product._id}`);
            if (res.data.success) setData(Array.isArray(res.data.data) ? res.data.data : [res.data.data]);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const columns = useMemo(() => [
        { header: "Created At", accessorKey: "createdAt", cell: ({ getValue }) => new Date(getValue()).toLocaleDateString("en-IN") },
        { header: "Product Code", accessorKey: "productCode" },
        { header: "Qty", accessorKey: "qty" },
        { header: "Price", accessorKey: "price", cell: ({ getValue }) => `₹${getValue()}` },
        { header: "MRP", accessorKey: "mrp", cell: ({ getValue }) => `₹${getValue()}` },
        { header: "GST %", accessorKey: "gst" },
        { header: "Total", accessorKey: "total", cell: ({ getValue }) => <span className="font-semibold text-emerald-600">₹{getValue()}</span> },
        // { header: "Vendor", accessorKey: "vendorName" },
    ], []);

    const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

    return (
        <Modal onClose={onClose} maxWidth="max-w-4xl">
            <ModalHeader title="Inventory History" subtitle={product?.productName} icon={FiInfo} onClose={onClose} />
            <div className="flex-1 min-h-0 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-2 border-[#2980b9]/40 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                {table.getHeaderGroups().map(hg => (
                                    <tr key={hg.id} className="border-b border-gray-100">
                                        {hg.headers.map(h => (
                                            <th key={h.id} className="px-4 py-3 text-center text-xs font-semibold text-white bg-[#2980b9] whitespace-nowrap uppercase  ">
                                                {h.column.columnDef.header}
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody>
                                {table.getRowModel().rows.length === 0 && (
                                    <tr><td colSpan={columns.length} className="py-10 text-center text-gray-400">No inventory data found</td></tr>
                                )}
                                {table.getRowModel().rows.map(row => (
                                    <tr key={row.id} className="border-b border-gray-50 hover:bg-[#2980b9]/10 transition-colors">
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id} className="px-4 py-2.5 text-gray-700 text-center whitespace-nowrap">
                                                {cell.renderValue()}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <ModalFooter>
                <button onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">Close</button>
            </ModalFooter>
        </Modal>
    );
};


// ─── BarcodePrintModal ────────────────────────────────────────────────────────

const STORAGE_KEY = "printModalSettings_v7";

// ─── Field definitions ────────────────────────────────────────────────────────
const ALL_FIELDS = [
    { key: "storeName", label: "Store Name", icon: FiLayout, sub: "e.g. MY SHOP" },
    { key: "productName", label: "Product Name", icon: FiBox, sub: "e.g. Blue Pen" },
    { key: "category", label: "Category", icon: FiLayers, sub: "e.g. Stationery" },
    { key: "brand", label: "Brand", icon: FiAward, sub: "e.g. BIC" },
    { key: "description", label: "Description", icon: FiAlignLeft, sub: "Promo / note" },
    { key: "mrp", label: "MRP / Price", icon: FiDollarSign, sub: "₹ value" },
    { key: "productCode", label: "Product Code", icon: FiTag, sub: "Below image" },
];

const FONT_FIELDS = [
    { key: "storeName", label: "Store Name", def: 7.5 },
    { key: "productName", label: "Product Name", def: 8.5 },
    { key: "category", label: "Category", def: 7.5 },
    { key: "brand", label: "Brand", def: 7 },
    { key: "description", label: "Description", def: 7 },
    { key: "mrp", label: "MRP / Price", def: 9 },
    { key: "productCode", label: "Product Code", def: 7 },
];

const SHOW_KEY_MAP = {
    storeName: "showStoreName",
    productName: "showProductName",
    category: "showCategory",
    brand: "showBrand",
    description: "showDescription",
    mrp: "showMrp",
    productCode: "showProductCode",
};

const ZONES = ["leftAbove", "leftOfImage", "rightOfImage", "leftBelow", "right", "hidden"];

const SIZE_PRESETS = [
    { label: "100×13 mm", width: 100, height: 13 },
    { label: "100×25 mm", width: 100, height: 25 },
    { label: "50×25 mm", width: 50, height: 25 },
];
const N_PRESETS = [1, 2, 3, 4];

// imageSide: where the image column sits
// "hidden" only hides the graphic — the column structure is unchanged
const IMAGE_SIDE_OPTIONS = [
    { value: "left", label: "Image Left", icon: FiChevronLeft, desc: "Barcode/QR column on the left, text on the right." },
    { value: "right", label: "Image Right", icon: FiChevronRight, desc: "Text column on the left, Barcode/QR on the right." },
    { value: "hidden", label: "Hide Image", icon: FiEyeOff, desc: "Image graphic hidden — column layout & all text fields still print." },
];

const DEFAULT_LAYOUT = {
    leftAbove: [],
    leftOfImage: [],
    rightOfImage: [],
    leftBelow: ["productCode"],
    right: ["storeName", "productName", "category", "description", "mrp"],
    hidden: ["brand"],
};

const DEFAULT_GLOBAL_FIELDS = {
    storeName: "",
    showStoreName: true,
    showProductName: true,
    showCategory: true,
    showBrand: false,
    showMrp: true,
    showDescription: true,
    showProductCode: true,
};

const DEFAULT_TYPO = {
    gap: 0.3,
    imgPct: 70,
    leftZonePct: 44,
    imageSide: "left",
    lpad: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
    rpad: { top: 0.5, bottom: 0.5, left: 0.6, right: 0.4 },
    fonts: {
        storeName: 7.5, productName: 8.5, category: 7.5,
        brand: 7, description: 7, mrp: 9, productCode: 7,
    },
};

// ─── Storage helpers ──────────────────────────────────────────────────────────
function loadFromStorage() {
    try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; }
    catch { return null; }
}
function saveToStorage(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return true; }
    catch { return false; }
}

// ─── Pad normaliser ───────────────────────────────────────────────────────────
function normPad(v, def) {
    if (!v) return { ...def };
    if (typeof v === "object" && "top" in v) return { ...def, ...v };
    const n = parseFloat(v) || def.top;
    return { top: n, bottom: n, left: n, right: n };
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const map = {
        loading: { cls: "bg-[#2980b9]/10 text-[#2980b9] border-[#2980b9]/20", label: "Looking up…" },
        found: { cls: "bg-green-50 text-green-600 border-green-100", label: "Found" },
        notfound: { cls: "bg-amber-50 text-amber-500 border-amber-100", label: "Not found" },
        error: { cls: "bg-red-50 text-red-400 border-red-100", label: "Error" },
    };
    if (!map[status]) return null;
    const { cls, label } = map[status];
    return <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
}

// ─── QtyStepper ───────────────────────────────────────────────────────────────
function QtyStepper({ value, onChange, label = "Qty", size = "normal" }) {
    const parsed = Math.max(1, parseInt(value) || 1);
    const sm = size === "small";
    return (
        <div className="flex flex-col gap-1">
            {label && (
                <span className={`${sm ? "text-[8px]" : "text-[9px]"} font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1`}>
                    <FiHash size={sm ? 8 : 9} /> {label}
                </span>
            )}
            <div className="flex items-center gap-1">
                <button type="button" onClick={() => onChange(Math.max(1, parsed - 1))}
                    className={`${sm ? "w-6 h-6 text-[10px]" : "w-7 h-7 text-xs"} rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 font-bold flex items-center justify-center`}>
                    −
                </button>
                <input type="number" min={1} value={value} onChange={e => onChange(e.target.value)}
                    className={`${sm ? "w-10 text-[10px] py-0.5" : "w-12 text-xs py-1"} text-center font-semibold rounded-lg border border-gray-200 outline-none focus:border-[#2980b9]/60 text-gray-700`} />
                <button type="button" onClick={() => onChange(parsed + 1)}
                    className={`${sm ? "w-6 h-6 text-[10px]" : "w-7 h-7 text-xs"} rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 font-bold flex items-center justify-center`}>
                    +
                </button>
            </div>
        </div>
    );
}

// ─── SliderRow ────────────────────────────────────────────────────────────────
function SliderRow({ label, min, max, step = 0.1, value, unit = "", onChange }) {
    return (
        <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-400">{label}</span>
                <span className="text-[10px] font-semibold text-[#2980b9]">
                    {typeof value === "number" ? value.toFixed(step < 1 ? 1 : 0) : value}{unit}
                </span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
                onChange={e => onChange(parseFloat(e.target.value))}
                className="w-full accent-[#2980b9] h-1.5" />
        </div>
    );
}

// ─── LabelSize ────────────────────────────────────────────────────────────────
function LabelSize({ width, height, onChange }) {
    const [customOpen, setCustomOpen] = useState(false);
    const isPreset = SIZE_PRESETS.some(s => s.width === width && s.height === height);
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Size</span>
            {SIZE_PRESETS.map(s => {
                const active = !customOpen && s.width === width && s.height === height;
                return (
                    <button key={s.label} type="button"
                        onClick={() => { onChange({ width: s.width, height: s.height }); setCustomOpen(false); }}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition
              ${active ? "border-[#2980b9]/60 bg-[#2980b9]/10 text-[#2980b9]/90" : "border-gray-200 bg-white text-gray-500 hover:border-[#2980b9]/40 hover:text-[#2980b9]"}`}>
                        {s.label}
                    </button>
                );
            })}
            <button type="button" onClick={() => setCustomOpen(v => !v)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition
          ${customOpen || !isPreset ? "border-[#2980b9]/60 bg-[#2980b9]/10 text-[#2980b9]/90" : "border-gray-200 bg-white text-gray-500 hover:border-[#2980b9]/40 hover:text-[#2980b9]"}`}>
                Custom
            </button>
            {(customOpen || !isPreset) && (
                <div className="flex items-center gap-1">
                    <input type="number" value={width} onChange={e => onChange({ width: +e.target.value, height })}
                        className="w-14 text-center text-xs rounded-lg border border-gray-200 py-1 outline-none focus:border-[#2980b9]/60" placeholder="W" />
                    <span className="text-gray-400 text-xs">×</span>
                    <input type="number" value={height} onChange={e => onChange({ width, height: +e.target.value })}
                        className="w-14 text-center text-xs rounded-lg border border-gray-200 py-1 outline-none focus:border-[#2980b9]/60" placeholder="H" />
                    <span className="text-gray-400 text-xs">mm</span>
                </div>
            )}
        </div>
    );
}

// ─── FieldChip ────────────────────────────────────────────────────────────────
function FieldChip({ fieldKey, zone, layout, dragging, onDragStart, onDragEnd, onReorder, onHide }) {
    const field = ALL_FIELDS.find(f => f.key === fieldKey);
    if (!field) return null;
    const Icon = field.icon;
    const arr = layout[zone] || [];
    const idx = arr.indexOf(fieldKey);
    return (
        <div
            draggable
            onDragStart={() => onDragStart(fieldKey)}
            onDragEnd={onDragEnd}
            className={`flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-2.5 py-2 cursor-grab text-xs text-gray-700 transition
        ${dragging === fieldKey ? "opacity-40 scale-95" : "hover:border-[#2980b9]/40 hover:shadow-sm"}`}
        >
            <FiMove size={10} className="text-gray-300 flex-shrink-0" />
            <Icon size={11} className="text-[#2980b9] flex-shrink-0" />
            <span className="flex-1 font-medium">{field.label}</span>
            <span className="text-[9px] text-gray-400">{field.sub}</span>
            {zone !== "hidden" && (
                <div className="flex flex-col gap-0.5 ml-1">
                    <button type="button" onClick={() => onReorder(zone, fieldKey, -1)} disabled={idx === 0}
                        className="p-0.5 rounded hover:bg-[#2980b9]/10 text-gray-300 hover:text-[#2980b9] disabled:opacity-20 transition">
                        <FiArrowUp size={9} />
                    </button>
                    <button type="button" onClick={() => onReorder(zone, fieldKey, 1)} disabled={idx === arr.length - 1}
                        className="p-0.5 rounded hover:bg-[#2980b9]/10 text-gray-300 hover:text-[#2980b9] disabled:opacity-20 transition">
                        <FiArrowDown size={9} />
                    </button>
                </div>
            )}
            <button type="button" onClick={() => onHide(fieldKey)} title="Hide"
                className="p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition">
                <FiX size={10} />
            </button>
        </div>
    );
}

// ─── DropZone ─────────────────────────────────────────────────────────────────
function DropZone({ zoneId, label, icon, hint, overZone, layout, onDragOver, onDragLeave, onDrop, children }) {
    return (
        <div
            onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            className={`border-2 border-dashed rounded-2xl p-3 min-h-[72px] transition
        ${overZone === zoneId ? "border-[#2980b9] bg-[#2980b9]/10" : "border-gray-200 bg-gray-50"}`}
        >
            <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[#2980b9]">{icon}</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
                <span className="text-[9px] text-gray-400 ml-1">{hint}</span>
            </div>
            <div className="space-y-1.5">
                {children}
                {(layout[zoneId] || []).length === 0 && (
                    <div className="text-[10px] text-gray-300 text-center py-2">Drop fields here</div>
                )}
            </div>
        </div>
    );
}

// ─── LayoutDesigner ───────────────────────────────────────────────────────────
function LayoutDesigner({ layout, onChange, printType }) {
    const [dragging, setDragging] = useState(null);
    const [overZone, setOverZone] = useState(null);

    const moveField = (key, toZone) => {
        const next = {};
        ZONES.forEach(z => { next[z] = (layout[z] || []).filter(k => k !== key); });
        next[toZone] = [...(next[toZone] || []), key];
        onChange(next);
    };

    const reorder = (zone, key, dir) => {
        const arr = [...(layout[zone] || [])];
        const idx = arr.indexOf(key);
        if (idx < 0) return;
        const ni = idx + dir;
        if (ni < 0 || ni >= arr.length) return;
        [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
        onChange({ ...layout, [zone]: arr });
    };

    const handleDragEnd = () => { setDragging(null); setOverZone(null); };
    const chipProps = {
        layout, dragging,
        onDragStart: setDragging,
        onDragEnd: handleDragEnd,
        onReorder: reorder,
        onHide: k => moveField(k, "hidden"),
    };
    const dzProps = zoneId => ({
        zoneId, overZone, layout,
        onDragOver: e => { e.preventDefault(); setOverZone(zoneId); },
        onDragLeave: () => setOverZone(null),
        onDrop: e => { e.preventDefault(); if (dragging) moveField(dragging, zoneId); setOverZone(null); },
    });

    const allKeysInLayout = ZONES.flatMap(z => layout[z] || []);
    const unplaced = ALL_FIELDS.filter(f => !allKeysInLayout.includes(f.key));

    return (
        <div className="space-y-3">
            {/* Image column zones */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Image column — {printType === "qr" ? "QR" : "Barcode"} area
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <DropZone {...dzProps("leftAbove")} label="Above image" icon={<FiArrowUp size={11} />} hint="above code">
                        {(layout.leftAbove || []).map(k => <FieldChip key={k} fieldKey={k} zone="leftAbove" {...chipProps} />)}
                    </DropZone>
                    <DropZone {...dzProps("leftBelow")} label="Below image" icon={<FiArrowDown size={11} />} hint="below code">
                        {(layout.leftBelow || []).map(k => <FieldChip key={k} fieldKey={k} zone="leftBelow" {...chipProps} />)}
                    </DropZone>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <DropZone {...dzProps("leftOfImage")} label="Left of image" icon={<FiAlignLeft size={11} />} hint="beside image, left">
                        {(layout.leftOfImage || []).map(k => <FieldChip key={k} fieldKey={k} zone="leftOfImage" {...chipProps} />)}
                    </DropZone>
                    <DropZone {...dzProps("rightOfImage")} label="Right of image" icon={<FiAlignRight size={11} />} hint="beside image, right">
                        {(layout.rightOfImage || []).map(k => <FieldChip key={k} fieldKey={k} zone="rightOfImage" {...chipProps} />)}
                    </DropZone>
                </div>
            </div>

            {/* Right + Hidden */}
            <div className="grid grid-cols-2 gap-3">
                <DropZone {...dzProps("right")} label="Right text column" icon={<FiAlignRight size={11} />} hint="top → bottom order">
                    {(layout.right || []).map(k => <FieldChip key={k} fieldKey={k} zone="right" {...chipProps} />)}
                </DropZone>
                <DropZone {...dzProps("hidden")} label="Hidden (not printed)" icon={<FiEyeOff size={11} />} hint="">
                    {(layout.hidden || []).map(k => <FieldChip key={k} fieldKey={k} zone="hidden" {...chipProps} />)}
                </DropZone>
            </div>

            {unplaced.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Unplaced:</span>
                    {unplaced.map(f => (
                        <button key={f.key} type="button" onClick={() => moveField(f.key, "right")}
                            className="text-[10px] px-2 py-1 rounded-lg border border-dashed border-[#2980b9]/60 text-[#2980b9] hover:bg-[#2980b9]/10 transition">
                            + {f.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── PaddingEditor ────────────────────────────────────────────────────────────
function PaddingEditor({ label, value, onChange }) {
    const set = (side, v) => onChange({ ...value, [side]: parseFloat(v) || 0 });
    return (
        <div className="mb-4">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</div>
            <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1">
                    <span className="text-[9px] text-gray-400 w-12 text-right">top</span>
                    <input type="number" min={0} max={5} step={0.1} value={value.top} onChange={e => set("top", e.target.value)}
                        className="w-14 text-center text-[11px] rounded-lg border border-gray-200 py-1 outline-none focus:border-[#2980b9]/60 text-gray-700" />
                    <span className="text-[9px] text-gray-400">mm</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[9px] text-gray-400">left</span>
                        <input type="number" min={0} max={5} step={0.1} value={value.left} onChange={e => set("left", e.target.value)}
                            className="w-14 text-center text-[11px] rounded-lg border border-gray-200 py-1 outline-none focus:border-[#2980b9]/60 text-gray-700" />
                        <span className="text-[9px] text-gray-400">mm</span>
                    </div>
                    <div className="w-12 h-8 border-2 border-dashed border-[#2980b9]/40 rounded-md bg-[#2980b9]/10 flex items-center justify-center">
                        <span className="text-[8px] text-[#2980b9]/60 font-bold">zone</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[9px] text-gray-400">right</span>
                        <input type="number" min={0} max={5} step={0.1} value={value.right} onChange={e => set("right", e.target.value)}
                            className="w-14 text-center text-[11px] rounded-lg border border-gray-200 py-1 outline-none focus:border-[#2980b9]/60 text-gray-700" />
                        <span className="text-[9px] text-gray-400">mm</span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-[9px] text-gray-400 w-12 text-right">bottom</span>
                    <input type="number" min={0} max={5} step={0.1} value={value.bottom} onChange={e => set("bottom", e.target.value)}
                        className="w-14 text-center text-[11px] rounded-lg border border-gray-200 py-1 outline-none focus:border-[#2980b9]/60 text-gray-700" />
                    <span className="text-[9px] text-gray-400">mm</span>
                </div>
            </div>
            <div className="mt-1.5 text-center text-[9px] text-[#2980b9] font-mono">
                {value.top} · {value.right} · {value.bottom} · {value.left} mm
            </div>
        </div>
    );
}

// ─── ImageSideToggle ──────────────────────────────────────────────────────────
function ImageSideToggle({ value, onChange }) {
    const active = IMAGE_SIDE_OPTIONS.find(o => o.value === value);
    return (
        <div className="mb-2">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                Barcode / QR position
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                {IMAGE_SIDE_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    const isActive = value === opt.value;
                    return (
                        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition
                ${isActive ? "border-[#2980b9] bg-[#2980b9]/10 text-[#2980b9]/90" : "border-gray-200 bg-white text-gray-500 hover:border-[#2980b9]/40 hover:text-[#2980b9]"}`}>
                            <Icon size={12} /> {opt.label}
                        </button>
                    );
                })}
            </div>
            {active && (
                <p className="text-[9px] text-gray-400 mt-1.5">{active.desc}</p>
            )}
        </div>
    );
}

// ─── TypographyPanel ─────────────────────────────────────────────────────────
function TypographyPanel({ typo, onChange }) {
    const set = (path, val) => {
        if (path.startsWith("fonts.")) {
            onChange({ ...typo, fonts: { ...typo.fonts, [path.slice(6)]: val } });
        } else {
            onChange({ ...typo, [path]: val });
        }
    };
    const lpad = normPad(typo.lpad, DEFAULT_TYPO.lpad);
    const rpad = normPad(typo.rpad, DEFAULT_TYPO.rpad);
    return (
        <div className="space-y-5">
            <ImageSideToggle value={typo.imageSide || "left"} onChange={v => onChange({ ...typo, imageSide: v })} />
            <div className="grid grid-cols-2 gap-6">
                <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Font sizes (pt)</div>
                    {FONT_FIELDS.map(f => (
                        <SliderRow key={f.key} label={f.label} min={5} max={14} step={0.5}
                            value={typo.fonts[f.key] ?? f.def} unit="pt" onChange={v => set(`fonts.${f.key}`, v)} />
                    ))}
                </div>
                <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Spacing &amp; image</div>
                    <SliderRow label="Gap between fields" min={0} max={3} step={0.1} value={typo.gap} unit="mm" onChange={v => set("gap", v)} />
                    <SliderRow label="Image / code size" min={0} max={100} step={1} value={typo.imgPct} unit="%" onChange={v => set("imgPct", v)} />
                    <SliderRow label="Image/text split" min={20} max={80} step={1} value={typo.leftZonePct} unit="%" onChange={v => set("leftZonePct", v)} />
                    <div className="border-t border-gray-100 my-3" />
                    <div className="grid grid-cols-2 gap-4">
                        <PaddingEditor label="Image zone padding" value={lpad} onChange={v => onChange({ ...typo, lpad: v })} />
                        <PaddingEditor label="Text zone padding" value={rpad} onChange={v => onChange({ ...typo, rpad: v })} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Section (collapsible) ───────────────────────────────────────────────────
function Section({ title, icon: Icon, defaultOpen = false, children, badge }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <button type="button" onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left">
                <div className="flex items-center gap-2">
                    {Icon && <Icon size={13} className="text-[#2980b9]" />}
                    <span className="text-xs font-semibold text-gray-700">{title}</span>
                    {badge && <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#2980b9]/20 text-[#2980b9]/90 font-semibold">{badge}</span>}
                </div>
                <FiArrowDown size={13} className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </button>
            {open && <div className="px-4 py-4 bg-white">{children}</div>}
        </div>
    );
}

// ─── LivePreviewLabel ─────────────────────────────────────────────────────────
const MM_TO_PX = 3.7795;

function LivePreviewLabel({ value, row, layout, printType, globalFields, typo, labelSize }) {
    const barcodeCanvasRef = useRef(null);
    const [qrUrl, setQrUrl] = useState(null);

    const imageSide = typo.imageSide || "left";
    // "hidden" means: suppress the <canvas>/<img> graphic only.
    // The left column (imageCol) still renders its text fields.
    const suppressImg = imageSide === "hidden";

    const W = Math.round(labelSize.width * MM_TO_PX);
    const H = Math.round(labelSize.height * MM_TO_PX);

    const hasRightZone = (layout.right || []).length > 0;
    const lzPct = hasRightZone ? typo.leftZonePct : 100;
    const lzW = Math.round(W * lzPct / 100);

    const fScale = Math.max(0.5, Math.min(1.4, lzW / (50 * MM_TO_PX)));
    const gapPx = Math.round(typo.gap * MM_TO_PX * fScale);

    const lpad = normPad(typo.lpad, DEFAULT_TYPO.lpad);
    const rpad = normPad(typo.rpad, DEFAULT_TYPO.rpad);
    const px = mm => Math.round(mm * MM_TO_PX);

    const imgH = Math.round(H * typo.imgPct / 100);
    const imgW = Math.max(20, lzW - px(lpad.left) - px(lpad.right));

    const resolve = useCallback(key => {
        const sk = SHOW_KEY_MAP[key];
        if (sk && !globalFields[sk] && key !== "productCode") return "";
        return ({
            storeName: globalFields.storeName || "",
            productName: row.productName || "",
            category: row.category || "",
            brand: row.brand || "",
            description: row.description || "",
            mrp: row.mrp ? `₹${row.mrp}/-` : "",
            productCode: row.productCode || value || "",
        })[key] ?? "";
    }, [row, globalFields, value]);

    const fieldStyle = key => ({
        fontSize: `${(typo.fonts[key] || 8) * fScale}px`,
        fontWeight: ["storeName", "productName", "mrp"].includes(key) ? "700" : "400",
        textTransform: key === "storeName" ? "uppercase" : "none",
        letterSpacing: key === "storeName" ? "0.3px" : "normal",
        fontFamily: key === "productCode" ? "monospace" : "inherit",
        textAlign: key === "productCode" ? "center" : "left",
        color: key === "description" ? "#666" : "#111",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        maxWidth: "100%", marginBottom: `${gapPx}px`, lineHeight: 1.4,
    });

    // Only render barcode/QR canvas when NOT suppressed
    useEffect(() => {
        if (suppressImg || printType !== "barcode" || !barcodeCanvasRef.current || !value) return;
        try {
            JsBarcode(barcodeCanvasRef.current, value, {
                format: "CODE128",
                width: Math.max(1, Math.round(imgW / 40)),
                height: imgH, displayValue: false, margin: 1,
                background: "#ffffff", lineColor: "#000000",
            });
        } catch { }
    }, [value, printType, imgW, imgH, suppressImg]);

    useEffect(() => {
        if (suppressImg || printType !== "qr" || !value) { setQrUrl(null); return; }
        QRCode.toDataURL(value, { width: Math.max(40, imgH * 2), margin: 1 })
            .then(setQrUrl).catch(() => setQrUrl(null));
    }, [value, printType, imgH, suppressImg]);

    if (!value?.trim()) {
        return (
            <div style={{ width: W, height: H, border: "0.5px solid #d1d5db", borderRadius: 2, background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 9, color: "#9ca3af" }}>No code</span>
            </div>
        );
    }

    const hasLeftOfImg = (layout.leftOfImage || []).length > 0;
    const hasRightOfImg = (layout.rightOfImage || []).length > 0;

    const renderZoneFields = (zone, extraStyle = {}) =>
        (layout[zone] || []).map(k => {
            const v = resolve(k);
            return v ? <div key={k} style={{ ...fieldStyle(k), ...extraStyle }}>{v}</div> : null;
        });

    // The image graphic element — null when suppressed
    const imgGraphic = suppressImg ? null : (
        printType === "barcode"
            ? <canvas ref={barcodeCanvasRef} style={{ maxWidth: "100%", maxHeight: imgH, display: "block", flexShrink: 1 }} />
            : qrUrl
                ? <img src={qrUrl} alt="QR" style={{ width: imgH, height: imgH, objectFit: "contain", imageRendering: "pixelated", flexShrink: 1 }} />
                : null
    );

    // Show a placeholder outline where the image would be, so the user can see the zone
    const imgPlaceholder = suppressImg ? (
        <div style={{ width: imgH * 1.5, height: imgH, border: "0.8px dashed #fbbf24", borderRadius: 2, background: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 1 }}>
            <span style={{ fontSize: 7, color: "#f59e0b", fontWeight: 600 }}>hidden</span>
        </div>
    ) : null;

    // imageRow: leftOfImage | [graphic or placeholder] | rightOfImage
    const imageRow = (
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: `${gapPx}px`, flexShrink: 1, minHeight: 0, width: "100%" }}>
            {hasLeftOfImg && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", gap: `${gapPx}px`, flexShrink: 0, overflow: "hidden", maxWidth: "35%" }}>
                    {renderZoneFields("leftOfImage", { textAlign: "right", whiteSpace: "nowrap" })}
                </div>
            )}
            <div style={{ flexShrink: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {imgGraphic || imgPlaceholder}
            </div>
            {hasRightOfImg && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: `${gapPx}px`, flexShrink: 0, overflow: "hidden", maxWidth: "35%" }}>
                    {renderZoneFields("rightOfImage", { whiteSpace: "nowrap" })}
                </div>
            )}
        </div>
    );

    // imageCol contains: leftAbove + imageRow + leftBelow
    const imageColStyle = {
        width: lzW, flexShrink: 0, height: "100%",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: `${px(lpad.top)}px ${px(lpad.right)}px ${px(lpad.bottom)}px ${px(lpad.left)}px`,
        gap: `${gapPx}px`, overflow: "hidden",
    };

    const imageColBorder = hasRightZone
        ? (imageSide === "right" ? { borderLeft: "0.5px solid #e5e7eb" } : { borderRight: "0.5px solid #e5e7eb" })
        : {};

    const imageCol = (
        <div style={{ ...imageColStyle, ...imageColBorder }}>
            {renderZoneFields("leftAbove")}
            {imageRow}
            {renderZoneFields("leftBelow")}
        </div>
    );

    // textCol contains: right zone fields
    const textCol = hasRightZone ? (
        <div style={{
            flex: 1, minWidth: 0, height: "100%",
            display: "flex", flexDirection: "column", justifyContent: "center",
            padding: `${px(rpad.top)}px ${px(rpad.right)}px ${px(rpad.bottom)}px ${px(rpad.left)}px`,
            gap: `${gapPx}px`, overflow: "hidden",
        }}>
            {renderZoneFields("right")}
        </div>
    ) : null;

    return (
        <div style={{ width: W, height: H, display: "flex", flexDirection: "row", border: "0.5px solid #d1d5db", borderRadius: 2, background: "#fff", overflow: "hidden", flexShrink: 0 }}>
            {imageSide === "right" ? <>{textCol}{imageCol}</> : <>{imageCol}{textCol}</>}
        </div>
    );
}

// ─── Row factory ─────────────────────────────────────────────────────────────
let _rowCounter = 0;
function makeRow(overrides = {}) {
    return {
        id: `r${++_rowCounter}`,
        barcodeValue: "", productCode: "", productName: "",
        category: "", brand: "", description: "", mrp: "",
        qty: 1, _status: "idle",
        ...overrides,
    };
}

// ─── BarcodePrintModal ────────────────────────────────────────────────────────
function BarcodePrintModal({
    product = null,
    bulkProducts = null,
    inventoryData = [],
    onClose,
    settings = {},
    api = null,
}) {
    const saved = useMemo(() => loadFromStorage(), []);

    const [printType, setPrintType] = useState(saved?.printType || "barcode");
    const [labelSize, setLabelSize] = useState(saved?.labelSize || { width: 100, height: 13 });
    const [nup, setNup] = useState(saved?.nup || 1);
    const [layout, setLayout] = useState(saved?.layout || settings?.layoutConfig || DEFAULT_LAYOUT);
    const [globalFields, setGlobalFields] = useState(() => ({
        ...DEFAULT_GLOBAL_FIELDS,
        storeName: settings?.storeName || "",
        ...(saved?.globalFields || {}),
    }));
    const [typo, setTypo] = useState(() => {
        const sv = saved?.typo || {};
        return {
            ...DEFAULT_TYPO, ...sv,
            imageSide: sv.imageSide || DEFAULT_TYPO.imageSide,
            lpad: normPad(sv.lpad, DEFAULT_TYPO.lpad),
            rpad: normPad(sv.rpad, DEFAULT_TYPO.rpad),
            fonts: { ...DEFAULT_TYPO.fonts, ...(sv.fonts || {}) },
        };
    });

    const [globalQty, setGlobalQty] = useState(saved?.globalQty || 1);
    const [useGlobalQty, setUseGlobalQty] = useState(saved?.useGlobalQty ?? false);
    const [showDesigner, setShowDesigner] = useState(false);
    const [savedNotice, setSavedNotice] = useState(false);
    const [customNInput, setCustomNInput] = useState("");

    // ── Rows ──────────────────────────────────────────────────────────────────
    const [rows, setRows] = useState(() => {
        if (bulkProducts?.length > 0) {
            return bulkProducts.map(p => makeRow({
                barcodeValue: p.productCode || "", productCode: p.productCode || "",
                productName: p.productName || "", category: p.category || "",
                brand: p.brand || "", mrp: p.mrp ? String(p.mrp) : "",
                qty: Math.max(1, parseInt(p.qty) || 1),   // ← pre-fill each row from p.qty
                _status: p.mrp ? "found" : "idle",
            }));
        }
        return [makeRow({
            barcodeValue: product?.productCode || "", productCode: product?.productCode || "",
            productName: product?.productName || "", category: product?.category || "",
            brand: product?.brand || "", mrp: product?.mrp ? String(product.mrp) : "",
            qty: Math.max(1, parseInt(product?.qty) || 1),   // ← pre-fill from product.qty
            _status: product?.mrp ? "found" : "idle",
        })];
    });

    // ── On mount: resolve missing data ────────────────────────────────────────
    useEffect(() => {
        rows.forEach(row => {
            if (row.barcodeValue && !row.mrp) {
                const match = inventoryData.find(p => p.productCode?.toLowerCase() === row.barcodeValue.toLowerCase());
                if (match) {
                    setRows(prev => prev.map(r => r.id !== row.id ? r : {
                        ...r, mrp: match.mrp ? String(match.mrp) : "",
                        productName: match.productName || r.productName,
                        category: match.category || r.category,
                        brand: match.brand || r.brand,
                        qty: match.qty ? Math.max(1, parseInt(match.qty) || 1) : r.qty,
                        _status: "found",
                    }));
                } else if (api) {
                    fetchByCode(row.barcodeValue, row.id);
                }
            } else if (row.barcodeValue && row.mrp) {
                setRows(prev => prev.map(r => r.id === row.id ? { ...r, _status: "found" } : r));
            }
        });
    }, []); // eslint-disable-line

    // ── Row helpers ───────────────────────────────────────────────────────────
    const setRow = (id, field, val) => setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
    const addRow = () => setRows(prev => [...prev, makeRow()]);
    const removeRow = id => { if (rows.length > 1) setRows(prev => prev.filter(r => r.id !== id)); };
    const toggleGF = (key, val) => setGlobalFields(prev => ({ ...prev, [key]: val }));
    const effectiveQty = row => useGlobalQty ? Math.max(1, parseInt(globalQty) || 1) : Math.max(1, parseInt(row.qty) || 1);

    // ── API fetch ─────────────────────────────────────────────────────────────
    const fetchByCode = useCallback(async (code, rowId) => {
        if (!code?.trim() || !api) return;
        setRow(rowId, "_status", "loading");
        try {
            const res = await api.get(`/product/inventory/productCode/${encodeURIComponent(code.trim())}`);
            if (res.data.success) {
                const p = Array.isArray(res.data.data) ? res.data.data[0] : res.data.data;
                setRows(prev => prev.map(r => r.id !== rowId ? r : {
                    ...r,
                    mrp: p?.mrp ? String(p.mrp) : r.mrp,
                    productCode: p?.productCode || r.productCode,
                    productName: p?.productName || r.productName,
                    category: p?.category || r.category,
                    brand: p?.brand || r.brand,
                    qty: p?.qty ? Math.max(1, parseInt(p.qty) || 1) : r.qty,
                    _status: "found",
                }));
            } else { setRow(rowId, "_status", "notfound"); }
        } catch { setRow(rowId, "_status", "error"); }
    }, [api]); // eslint-disable-line

    // ── Debounced barcode change ──────────────────────────────────────────────
    const debounceTimers = useRef({});
    const handleBarcodeChange = useCallback((id, value) => {
        setRows(prev => prev.map(r => r.id !== id ? r : {
            ...r, barcodeValue: value, productCode: value,
            productName: "", category: "", brand: "", mrp: "", _status: "idle",
        }));
        if (!value.trim() || value.trim().length < 2) return;
        const match = inventoryData.find(p => p.productCode?.toLowerCase() === value.trim().toLowerCase());
        if (match) {
            setRows(prev => prev.map(r => r.id !== id ? r : {
                ...r,
                productCode: match.productCode || value,
                productName: match.productName || "",
                category: match.category || "",
                brand: match.brand || "",
                mrp: match.mrp ? String(match.mrp) : "",
                qty: match.qty ? Math.max(1, parseInt(match.qty) || 1) : r.qty,
                _status: "found",
            }));
            return;
        }
        clearTimeout(debounceTimers.current[id]);
        debounceTimers.current[id] = setTimeout(() => fetchByCode(value, id), 600);
    }, [inventoryData, fetchByCode]);

    // ── Save / Reset ──────────────────────────────────────────────────────────
    const handleSave = () => {
        if (saveToStorage({ printType, labelSize, nup, layout, globalFields, typo, globalQty, useGlobalQty })) {
            setSavedNotice(true);
            setTimeout(() => setSavedNotice(false), 4000);
        }
    };
    const handleReset = () => {
        localStorage.removeItem(STORAGE_KEY);
        setPrintType("barcode"); setLabelSize({ width: 100, height: 13 }); setNup(1);
        setLayout(DEFAULT_LAYOUT); setGlobalFields(DEFAULT_GLOBAL_FIELDS); setTypo(DEFAULT_TYPO);
        setGlobalQty(1); setUseGlobalQty(false); setCustomNInput("");
    };

    // ── Derived values ────────────────────────────────────────────────────────
    const validRows = rows.filter(r => r.barcodeValue.trim());
    const totalLabels = rows.reduce((s, r) => s + effectiveQty(r), 0);
    const totalStrips = Math.ceil(totalLabels / nup);
    const isBulk = bulkProducts?.length > 0;
    const isCustomN = !N_PRESETS.includes(nup);

    const resolveField = useCallback((row, key) => {
        const sk = SHOW_KEY_MAP[key];
        if (sk && !globalFields[sk] && key !== "productCode") return "";
        return ({
            storeName: globalFields.storeName || "",
            productName: row.productName || "",
            category: row.category || "",
            brand: row.brand || "",
            description: row.description || "",
            mrp: row.mrp ? `${row.mrp}` : "",
            productCode: row.productCode || row.barcodeValue || "",
        })[key] ?? "";
    }, [globalFields]);

    // ── Print handler ─────────────────────────────────────────────────────────
    const handlePrint = useCallback(async () => {
        const labels = [];
        rows.forEach(row => {
            if (!row.barcodeValue.trim()) return;
            const count = effectiveQty(row);
            for (let i = 0; i < count; i++) {
                labels.push({
                    barcodeValue: row.barcodeValue.trim(),
                    leftAbove: (layout.leftAbove || []).map(k => ({ key: k, value: resolveField(row, k) })).filter(x => x.value),
                    leftOfImage: (layout.leftOfImage || []).map(k => ({ key: k, value: resolveField(row, k) })).filter(x => x.value),
                    rightOfImage: (layout.rightOfImage || []).map(k => ({ key: k, value: resolveField(row, k) })).filter(x => x.value),
                    leftBelow: (layout.leftBelow || []).map(k => ({ key: k, value: resolveField(row, k) })).filter(x => x.value),
                    right: (layout.right || []).map(k => ({ key: k, value: resolveField(row, k) })).filter(x => x.value),
                });
            }
        });
        if (!labels.length) return;

        const isQR = printType === "qr";
        const imageSide = typo.imageSide || "left";
        // suppressImg: do NOT render barcode/QR <img> in the print HTML,
        //              but KEEP the two-column layout and all text fields.
        const suppressImg = imageSide === "hidden";

        const dataUrls = await Promise.all(labels.map(async l => {
            if (suppressImg) return null;   // image suppressed — skip generation
            if (!isQR) {
                const canvas = document.createElement("canvas");
                try {
                    JsBarcode(canvas, l.barcodeValue, {
                        format: "CODE128", width: 2, height: 60,
                        displayValue: false, margin: 4,
                        background: "#ffffff", lineColor: "#000000",
                    });
                    return canvas.toDataURL("image/png");
                } catch { return null; }
            } else {
                try {
                    return await QRCode.toDataURL(l.barcodeValue, {
                        width: 160, margin: 2, color: { dark: "#000000", light: "#ffffff" },
                    });
                } catch { return null; }
            }
        }));

        const N = nup;
        const PW = labelSize.width;
        const PH = labelSize.height;
        const CW = PW / N;
        const LZP = typo.leftZonePct;
        const lpad = normPad(typo.lpad, DEFAULT_TYPO.lpad);
        const rpad = normPad(typo.rpad, DEFAULT_TYPO.rpad);
        const fScale = Math.max(0.5, Math.min(1.4, CW / 50));
        const fs = key => `${((typo.fonts[key] || 8) * fScale).toFixed(1)}pt`;

        const FSTYLES = {
            storeName: k => `font-size:${fs(k)};font-weight:bold;text-transform:uppercase;letter-spacing:0.3pt;`,
            productName: k => `font-size:${fs(k)};font-weight:700;`,
            category: k => `font-size:${fs(k)};font-weight:600;`,
            brand: k => `font-size:${fs(k)};`,
            description: k => `font-size:${fs(k)};color:#444;`,
            mrp: k => `font-size:${fs(k)};font-weight:bold;`,
            productCode: k => `font-size:${fs(k)};font-family:monospace;text-align:center;`,
        };

        const fieldDiv = item =>
            `<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;line-height:1.4;margin-bottom:${typo.gap}mm;${(FSTYLES[item.key] || (k => `font-size:${fs(k)};`))(item.key)}">${item.key === "mrp" ? `&#8377;${item.value}/-` : item.value}</div>`;
        const fieldDivR = item => fieldDiv(item).replace("text-overflow:ellipsis", "text-overflow:ellipsis;text-align:right");

        const renderCell = (label, imgSrc, isEmpty = false) => {
            if (isEmpty) return `<div style="width:${CW}mm;height:${PH}mm;flex-shrink:0;background:#fafafa;"></div>`;

            const hasRight = label.right.length > 0;
            const hasLOI = label.leftOfImage.length > 0;
            const hasROI = label.rightOfImage.length > 0;

            // imgSrc is null when suppressImg=true.
            // We still render the image column — we just omit the <img> tag inside it.
            const imgHtml = (imgSrc && !suppressImg)
                ? `<img src="${imgSrc}" style="width:${typo.imgPct}%;height:auto;object-fit:contain;display:block;flex-shrink:1;min-height:0;${isQR ? "image-rendering:pixelated;max-height:70%;" : "max-height:65%;"}" alt="">`
                : "";   // empty string when hidden — column structure remains

            const loiHtml = hasLOI
                ? `<div style="flex-shrink:0;max-width:35%;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:${typo.gap}mm;overflow:hidden;">${label.leftOfImage.map(fieldDivR).join("")}</div>`
                : "";
            const roiHtml = hasROI
                ? `<div style="flex-shrink:0;max-width:35%;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:${typo.gap}mm;overflow:hidden;">${label.rightOfImage.map(fieldDiv).join("")}</div>`
                : "";

            const imgRow = `<div style="display:flex;flex-direction:row;align-items:center;justify-content:center;gap:${typo.gap}mm;flex-shrink:1;min-height:0;width:100%;">${loiHtml}<div style="flex-shrink:1;min-width:0;display:flex;align-items:center;justify-content:center;">${imgHtml}</div>${roiHtml}</div>`;

            const dividerStyle = hasRight
                ? (imageSide === "right" ? "border-left:0.2mm solid #eee;" : "border-right:0.2mm solid #eee;")
                : "";

            // Image column: always rendered (graphic may be empty when suppressed)
            const imgColHtml =
                `<div style="width:${LZP}%;flex-shrink:0;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:${lpad.top}mm ${lpad.right}mm ${lpad.bottom}mm ${lpad.left}mm;gap:${typo.gap}mm;overflow:hidden;${dividerStyle}">` +
                label.leftAbove.map(fieldDiv).join("") +
                imgRow +
                label.leftBelow.map(fieldDiv).join("") +
                `</div>`;

            // Text column: rendered when right zone has fields
            const txtColHtml = hasRight
                ? `<div style="flex:1;min-width:0;height:100%;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:${rpad.top}mm ${rpad.right}mm ${rpad.bottom}mm ${rpad.left}mm;gap:${typo.gap}mm;overflow:hidden;">${label.right.map(fieldDiv).join("")}</div>`
                : "";

            // Swap order based on imageSide
            const innerHtml = imageSide === "right"
                ? `${txtColHtml}${imgColHtml}`
                : `${imgColHtml}${txtColHtml}`;

            return `<div style="width:${CW}mm;height:${PH}mm;flex-shrink:0;display:flex;flex-direction:row;align-items:stretch;overflow:hidden;">${innerHtml}</div>`;
        };

        let pagesHtml = "";
        for (let i = 0; i < labels.length; i += N) {
            const cells = Array.from({ length: N }, (_, offset) => {
                const idx = i + offset;
                return idx < labels.length
                    ? renderCell(labels[idx], dataUrls[idx], false)
                    : renderCell(null, null, true);
            });
            pagesHtml += `<div style="width:${PW}mm;height:${PH}mm;display:flex;flex-direction:row;align-items:stretch;overflow:hidden;page-break-after:always;background:#fff;">${cells.join("")}</div>`;
        }

        const printHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${isQR ? "QR" : "Barcode"} Labels (${N}-Up)</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
@page{size:${PW}mm ${PH}mm;margin:0;}
html,body{width:${PW}mm;font-family:'Arial Narrow',Arial,sans-serif;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
@media screen{html,body{width:100vw;min-height:100vh;background:#3a3a3a;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:20px;gap:16px;overflow-y:auto;}}
@media print{html,body{width:${PW}mm;background:#fff;}}
</style></head><body>
${pagesHtml}
<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},350)};<\/script>
</body></html>`;

        const win = window.open("", "_blank", "width=960,height=720");
        if (!win) { alert("Popup blocked — please allow popups for this site."); return; }
        win.document.write(printHtml);
        win.document.close();
    }, [rows, printType, labelSize, nup, layout, globalFields, typo, resolveField, useGlobalQty, globalQty]); // eslint-disable-line

    // ─── Render ───────────────────────────────────────────────────────────────
    const inputCls = "w-full text-xs rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-[#2980b9]/60 focus:bg-white bg-white transition placeholder:text-gray-300 text-gray-700";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[94vh]">

                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <div className="p-2 bg-[#2980b9]/10 rounded-xl"><FiPrinter size={16} className="text-[#2980b9]" /></div>
                    <div className="flex-1">
                        <h2 className="text-sm font-bold text-gray-800">Print Labels</h2>
                        <p className="text-[11px] text-gray-400">
                            {isBulk ? `Bulk print · ${bulkProducts.length} products selected` : "Configure barcode / QR labels"}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={handleSave}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-500 hover:border-green-300 hover:text-green-600 transition">
                            <FiSave size={12} /> Save settings
                        </button>
                        <button type="button" onClick={handleReset}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-500 hover:border-[#2980b9]/60 hover:text-[#2980b9] transition">
                            <FiRefreshCw size={12} /> Reset
                        </button>
                        <button type="button" onClick={onClose}
                            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition">
                            <FiX size={16} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">

                    {savedNotice && (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-100 rounded-xl text-xs text-green-700">
                            <FiCheckCircle size={13} className="text-green-500" />
                            Settings saved — will be restored next time you open this modal.
                            <button onClick={() => setSavedNotice(false)} className="ml-auto text-green-500 hover:text-green-700"><FiX size={12} /></button>
                        </div>
                    )}

                    {/* Type + Size */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
                            {["barcode", "qr"].map(t => (
                                <button key={t} type="button" onClick={() => setPrintType(t)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition
                    ${printType === t ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                                    {t === "barcode" ? <FiBarChart2 size={14} /> : <FiGrid size={14} />}
                                    {t === "barcode" ? "Barcode" : "QR Code"}
                                </button>
                            ))}
                        </div>
                        <LabelSize width={labelSize.width} height={labelSize.height} onChange={setLabelSize} />
                    </div>

                    {/* N-Up */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Labels per strip</span>
                        {N_PRESETS.map(n => (
                            <button key={n} type="button" onClick={() => { setNup(n); setCustomNInput(""); }}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition
                  ${nup === n && !isCustomN ? "border-[#2980b9]/60 bg-[#2980b9]/10 text-[#2980b9]/90" : "border-gray-200 bg-white text-gray-500 hover:border-[#2980b9]/40 hover:text-[#2980b9]"}`}>
                                {n}-Up
                            </button>
                        ))}
                        <span className="w-px h-5 bg-gray-200" />
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${isCustomN ? "border-[#2980b9]/60 bg-[#2980b9]/10 text-[#2980b9]/90" : "border-gray-200 bg-white text-gray-500"}`}>
                            <FiSliders size={11} className={isCustomN ? "text-[#2980b9]" : "text-gray-400"} />
                            <span className="text-gray-400 text-[10px]">Custom</span>
                            <input type="number" min={1} max={32} value={customNInput} placeholder="N"
                                onChange={e => { setCustomNInput(e.target.value); const p = parseInt(e.target.value, 10); if (!isNaN(p) && p >= 1 && p <= 32) setNup(p); }}
                                className="w-9 text-center bg-transparent outline-none text-xs font-bold text-gray-700 placeholder:text-gray-300" />
                            <span className="text-gray-400 text-[10px]">-Up</span>
                        </div>
                        {nup > 1 && (
                            <span className="flex items-center gap-1 text-[9px] bg-[#2980b9] text-white font-bold px-2 py-0.5 rounded-full">
                                <FiColumns size={9} /> {nup}-Up ON
                            </span>
                        )}
                    </div>

                    {/* Global Quantity */}
                    <div className="flex items-center gap-4 bg-[#2980b9]/10 border border-[#2980b9]/20 rounded-xl px-4 py-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <FiHash size={13} className="text-[#2980b9]" />
                            <span className="text-xs font-semibold text-gray-700">Global Quantity</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <div onClick={() => setUseGlobalQty(v => !v)}
                                className={`relative w-9 h-5 rounded-full transition-colors ${useGlobalQty ? "bg-[#2980b9]" : "bg-gray-300"}`}>
                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${useGlobalQty ? "translate-x-4" : ""}`} />
                            </div>
                            <span className="text-xs text-gray-500">{useGlobalQty ? "Override all rows" : "Use per-row qty"}</span>
                        </label>
                        {useGlobalQty && (
                            <>
                                <QtyStepper value={globalQty} onChange={setGlobalQty} label="" />
                                <span className="text-[10px] text-[#2980b9]/90 font-semibold">
                                    → {validRows.length} code{validRows.length !== 1 ? "s" : ""} × {Math.max(1, parseInt(globalQty) || 1)} = {validRows.length * Math.max(1, parseInt(globalQty) || 1)} labels
                                </span>
                            </>
                        )}
                    </div>

                    {/* Typography & Spacing */}
                    <Section title="Typography, Spacing & Image Position" icon={FiSliders} badge="font · gap · image side">
                        <TypographyPanel typo={typo} onChange={setTypo} />
                    </Section>

                    {/* Field Visibility */}
                    <Section title="Field Visibility & Store Name" icon={FiEye} defaultOpen>
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Show:</span>
                            {ALL_FIELDS.filter(f => f.key !== "productCode").map(f => {
                                const sk = SHOW_KEY_MAP[f.key];
                                const on = globalFields[sk];
                                return (
                                    <button key={f.key} type="button" onClick={() => toggleGF(sk, !on)}
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-semibold transition
                      ${on ? "border-[#2980b9]/60 bg-[#2980b9]/10 text-[#2980b9]/90" : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"}`}>
                                        {on ? <FiEye size={9} /> : <FiEyeOff size={9} />} {f.label}
                                    </button>
                                );
                            })}
                        </div>
                        {globalFields.showStoreName && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 whitespace-nowrap">Store name:</span>
                                <input type="text" value={globalFields.storeName}
                                    onChange={e => toggleGF("storeName", e.target.value)}
                                    placeholder="e.g. MY SHOP"
                                    className="text-xs rounded-lg border border-[#2980b9]/40 px-2 py-1 outline-none focus:border-[#2980b9] text-gray-700 w-40" />
                            </div>
                        )}
                    </Section>

                    {/* Layout Designer */}
                    <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                        <div className="flex items-center gap-2">
                            <FiLayout size={13} className="text-[#2980b9]" />
                            <span className="text-xs font-semibold text-gray-600">Label layout</span>
                            <span className="text-[10px] text-gray-400">
                                Above: {(layout.leftAbove || []).length} · LeftImg: {(layout.leftOfImage || []).length} · RightImg: {(layout.rightOfImage || []).length} · Below: {(layout.leftBelow || []).length} · Right: {(layout.right || []).length} fields
                            </span>
                        </div>
                        <button type="button" onClick={() => setShowDesigner(v => !v)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition
                ${showDesigner ? "border-[#2980b9]/60 bg-[#2980b9]/10 text-[#2980b9]/90" : "border-gray-200 bg-white text-gray-500 hover:border-[#2980b9]/40 hover:text-[#2980b9]"}`}>
                            <FiMove size={11} /> {showDesigner ? "Close designer" : "Arrange fields"}
                        </button>
                    </div>

                    {showDesigner && (
                        <div className="bg-white border border-[#2980b9]/20 rounded-2xl p-4">
                            <p className="text-xs text-gray-500 mb-3 flex items-center gap-1.5">
                                <FiMove size={12} className="text-[#2980b9]" />
                                Drag fields between zones · use ↑↓ to reorder within a zone
                            </p>
                            <LayoutDesigner layout={layout} onChange={setLayout} printType={printType} />
                        </div>
                    )}

                    {/* Info bars */}
                    {nup > 1 && (
                        <div className="flex items-center gap-2 bg-[#2980b9]/10 border border-[#2980b9]/20 rounded-xl px-4 py-2.5">
                            <FiColumns size={13} className="text-[#2980b9] flex-shrink-0" />
                            <p className="text-xs text-[#2980b9]/90">
                                <strong>{nup}-Up on</strong> — {nup} labels per strip, each cell <strong>~{Math.round(labelSize.width / nup)}mm</strong> wide on a <strong>{labelSize.width}×{labelSize.height}mm</strong> strip.
                            </p>
                        </div>
                    )}
                    <div className="flex items-center gap-2 bg-[#2980b9]/10 border border-[#2980b9]/20 rounded-xl px-4 py-2.5">
                        <FiInfo size={13} className="text-[#2980b9]/80 flex-shrink-0" />
                        <p className="text-xs text-[#2980b9]/90">
                            Strip: <strong>{labelSize.width}×{labelSize.height}mm</strong>
                            {nup > 1 && ` · cell ~${Math.round(labelSize.width / nup)}mm wide`}
                            {validRows.length > 0 && (
                                <span className="ml-2 font-semibold">
                                    {validRows.length} code{validRows.length !== 1 ? "s" : ""} · {totalLabels} label{totalLabels !== 1 ? "s" : ""}
                                    {nup > 1 && <span className="text-[#2980b9]/90"> → {totalStrips} strip{totalStrips !== 1 ? "s" : ""} ({nup}-up)</span>}
                                    {" "}will print.
                                </span>
                            )}
                        </p>
                    </div>

                    {/* Label rows */}
                    <div className="space-y-3">
                        {rows.map((row, idx) => {
                            const eqty = effectiveQty(row);
                            const hasDesc = [...(layout.leftAbove || []), ...(layout.leftBelow || []), ...(layout.right || [])].includes("description");

                            return (
                                <div key={row.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100 rounded-t-2xl">
                                        <div className="flex items-center gap-2">
                                            <FiHash size={11} className="text-[#2980b9]" />
                                            <span className="text-[10px] font-bold text-[#2980b9] uppercase tracking-widest">Label {idx + 1}</span>
                                            <StatusBadge status={row._status} />
                                        </div>
                                        {rows.length > 1 && (
                                            <button type="button" onClick={() => removeRow(row.id)}
                                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition">
                                                <FiTrash2 size={13} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="p-4 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                    <FiBarChart2 size={9} /> {printType === "barcode" ? "Barcode value *" : "QR value *"}
                                                </label>
                                                <div className="relative">
                                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={12} />
                                                    <input type="text" value={row.barcodeValue}
                                                        onChange={e => handleBarcodeChange(row.id, e.target.value)}
                                                        placeholder="Scan or type code"
                                                        className={`${inputCls} pl-9`}
                                                        autoFocus={idx === rows.length - 1} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                    <FiTag size={9} /> Product Code (printed)
                                                </label>
                                                <input type="text" value={row.productCode}
                                                    onChange={e => setRow(row.id, "productCode", e.target.value)}
                                                    placeholder="PRD001" className={inputCls} />
                                            </div>
                                        </div>

                                        {row._status === "found" && (row.productName || row.mrp || row.brand || row.category) && (
                                            <div className="flex items-center gap-2 flex-wrap px-3 py-2 bg-green-50 border border-green-100 rounded-xl">
                                                <FiCheckCircle size={12} className="text-green-500 flex-shrink-0" />
                                                {row.productName && <span className="flex items-center gap-1 text-[10px] text-green-700 font-semibold"><FiBox size={9} className="text-green-400" />{row.productName}</span>}
                                                {row.category && <span className="flex items-center gap-1 text-[10px] text-green-600"><FiLayers size={9} className="text-green-400" />{row.category}</span>}
                                                {row.brand && <span className="flex items-center gap-1 text-[10px] text-green-600"><FiAward size={9} className="text-green-400" />{row.brand}</span>}
                                                {row.mrp && <span className="flex items-center gap-1 text-[10px] text-green-700 font-bold ml-auto"><FiDollarSign size={9} className="text-green-500" />₹{row.mrp}</span>}
                                            </div>
                                        )}

                                        {hasDesc && (
                                            <div>
                                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                    <FiAlignLeft size={9} /> Description
                                                </label>
                                                <textarea value={row.description}
                                                    onChange={e => setRow(row.id, "description", e.target.value)}
                                                    placeholder={"e.g. BUY 1 GET 1\nUp To -13/+8 Power"}
                                                    rows={2}
                                                    className="w-full text-xs rounded-xl border border-gray-200 px-3 py-2 outline-none resize-none leading-relaxed transition placeholder:text-gray-300 text-gray-700 focus:border-[#2980b9]/60 focus:bg-white bg-white" />
                                            </div>
                                        )}

                                        {/* Live preview + individual Qty */}
                                        <div className="flex items-end justify-between gap-3 flex-wrap">
                                            <div>
                                                <div className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mb-1.5">
                                                    Live preview — actual print scale
                                                    {typo.imageSide === "hidden" && (
                                                        <span className="ml-2 text-amber-400 normal-case font-semibold">· image hidden (dashed outline)</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <LivePreviewLabel
                                                        value={row.barcodeValue.trim()}
                                                        row={row}
                                                        layout={layout}
                                                        printType={printType}
                                                        globalFields={globalFields}
                                                        typo={typo}
                                                        labelSize={labelSize}
                                                    />
                                                    {row.barcodeValue.trim() && (
                                                        <span className="text-xs text-gray-400">
                                                            × <strong className="text-gray-600">{eqty}</strong>
                                                            {useGlobalQty && <span className="text-[9px] text-[#2980b9] ml-1">(global)</span>}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className={`flex-shrink-0 transition ${useGlobalQty ? "opacity-40 pointer-events-none" : ""}`}>
                                                <QtyStepper
                                                    value={useGlobalQty ? globalQty : row.qty}
                                                    onChange={v => setRow(row.id, "qty", v)}
                                                    label={useGlobalQty ? "Qty (overridden)" : "Qty (from data)"}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Add row */}
                    <button type="button" onClick={addRow}
                        className="w-full py-3 border-2 border-dashed border-[#2980b9]/40 hover:border-[#2980b9] text-[#2980b9] hover:text-[#2980b9]/90 text-xs font-semibold rounded-2xl transition flex items-center justify-center gap-2">
                        <FiPlus size={14} /> Add Another Code
                    </button>
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex-shrink-0">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mr-auto">
                        <FiPrinter size={12} className="text-[#2980b9]" />
                        {validRows.length} code{validRows.length !== 1 ? "s" : ""} · {totalLabels} label{totalLabels !== 1 ? "s" : ""}
                        {nup > 1 && <span className="text-[#2980b9] font-semibold"> · {totalStrips} strip{totalStrips !== 1 ? "s" : ""} ({nup}-up)</span>}
                    </div>
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition flex items-center gap-1.5">
                        <FiX size={13} /> Cancel
                    </button>
                    <button type="button" onClick={handlePrint} disabled={validRows.length === 0}
                        className="flex items-center gap-2 px-5 py-2 bg-[#2980b9] hover:bg-[#2980b9]/90 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        <FiPrinter size={13} />
                        Print {printType === "qr" ? "QR" : "Barcode"} Labels
                        {nup > 1 && <span className="text-[#2980b9]/40 text-[9px] font-normal ml-0.5">{nup}-up</span>}
                    </button>
                </div>

            </div>
        </div>
    );
}






// ─── BulkUploadModal ──────────────────────────────────────────────────────────
const REQUIRED_FIELDS_BULK = ["productName", "category", "brand", "price", "mrp", "qty"];
const ACCEPTED_COLUMNS = [
    "productCode", "productName", "category", "brand", "color", "size",
    "type", "shape", "sph", "cyl", "index", "axis", "coating", "expiry",
    "price", "gst", "hsnSac", "mrp", "qty", "addition", "material", "dimensions"
];
const TEXT_COLUMNS = new Set(["productCode", "hsnSac"]);

function validateBulkRow(row, rowIndex) {
    const errors = [];
    for (const field of REQUIRED_FIELDS_BULK) {
        const val = row[field];
        if (val === undefined || val === null || String(val).trim() === "")
            errors.push(`Row ${rowIndex}: "${field}" is required`);
    }
    if (row.price !== undefined && row.price !== "" && Number(row.price) <= 0) errors.push(`Row ${rowIndex}: price must be > 0`);
    if (row.mrp !== undefined && row.mrp !== "" && Number(row.mrp) <= 0) errors.push(`Row ${rowIndex}: mrp must be > 0`);
    if (row.qty !== undefined && row.qty !== "" && Number(row.qty) <= 0) errors.push(`Row ${rowIndex}: qty must be > 0`);
    return errors;
}

function parseExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(e.target.result, { type: "array", cellDates: true });
                const sheetName = wb.SheetNames.includes("Product Data") ? "Product Data" : wb.SheetNames[0];
                const ws = wb.Sheets[sheetName];
                const raw = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
                const rows = raw.filter(r =>
                    !["REQUIRED", "optional", "required"].includes(String(r.productCode).trim())
                );
                resolve(rows);
            } catch (err) {
                reject(new Error("Failed to parse Excel file: " + err.message));
            }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsArrayBuffer(file);
    });
}

function sanitizeRow(raw) {
    const row = {};
    for (const col of ACCEPTED_COLUMNS) {
        let val = raw[col];
        if (val === undefined || val === null) val = "";
        if (TEXT_COLUMNS.has(col)) { row[col] = String(val).trim(); continue; }
        if (col === "expiry" && val instanceof Date) { row[col] = val.toISOString().split("T")[0]; continue; }
        row[col] = String(val).trim();
    }
    row.price = row.price !== "" ? Number(row.price) : "";
    row.mrp = row.mrp !== "" ? Number(row.mrp) : "";
    row.qty = row.qty !== "" ? Number(row.qty) : "";
    row.gst = row.gst !== "" ? Number(row.gst) : 0;
    return row;
}

function BulkUploadModal({ onClose }) {
    const [step, setStep] = useState("upload");
    const [file, setFile] = useState(null);
    const [parsing, setParsing] = useState(false);
    const [parseError, setParseError] = useState("");
    const [rows, setRows] = useState([]);
    const [validationErrors, setValidationErrors] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [prefix, setPrefix] = useState("DO");
    const dropRef = useRef(null);

    const activePrefix = prefix.trim().toUpperCase() || "DO";
    const autoCodeRows = rows.filter(r => !r.productCode);

    const handleFieldChange = (index, field, value) => {
        const updated = [...rows];
        let val = value;
        if (["price", "mrp", "qty", "gst"].includes(field)) {
            val = value === "" ? "" : Number(value);
        }
        updated[index] = { ...updated[index], [field]: val };
        setRows(updated);
        import('./Inventory').then(() => {
            // handled dynamically to avoid scope error with validateBulkRow
        });
        setValidationErrors(updated.flatMap((r, idx) => validateBulkRow(r, idx + 1)));
    };

    const downloadTemplate = () => {
        const aoa = [
            ACCEPTED_COLUMNS,
            ACCEPTED_COLUMNS.map(h => REQUIRED_FIELDS_BULK.includes(h) ? "REQUIRED" : "optional"),
            ["100", "Ray-Ban Aviator Frame", "FRAME", "Ray-Ban", "Black", "", "Full Rim", "Aviator", "", "", "", "", "", "", 450, 0, "9004", 1200, 10, "", "", ""],
        ];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const textCols = [ACCEPTED_COLUMNS.indexOf("productCode"), ACCEPTED_COLUMNS.indexOf("hsnSac")];
        for (let r = 3; r <= 200; r++) {
            for (const ci of textCols) {
                const addr = XLSX.utils.encode_cell({ r, c: ci });
                if (!ws[addr]) ws[addr] = { t: "s", v: "" };
                ws[addr].z = "@";
            }
        }
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Product Data");
        XLSX.writeFile(wb, "inventory_upload_template.xlsx");
    };

    const handleFile = async (f) => {
        if (!f) return;
        const ext = f.name.split(".").pop().toLowerCase();
        if (!["xlsx", "xls", "csv"].includes(ext)) { setParseError("Only .xlsx, .xls, or .csv files are accepted."); return; }
        setFile(f); setParseError(""); setParsing(true);
        try {
            const rawRows = await parseExcel(f);
            const sanitized = rawRows.map(sanitizeRow).filter(r => r.productName || r.productCode);
            if (sanitized.length === 0) { setParseError("No product rows found. Make sure you filled the 'Product Data' sheet."); setParsing(false); return; }
            setRows(sanitized);
            setValidationErrors(sanitized.flatMap((r, i) => validateBulkRow(r, i + 1)));
            setStep("preview");
        } catch (err) { setParseError(err.message); }
        finally { setParsing(false); }
    };

    const onDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); };

    const handleSubmit = async () => {
        if (validationErrors.length > 0) return;
        setSubmitting(true);
        try {
            const res = await api.post("/api/digi/product/bulk", { products: JSON.stringify(rows), suffix: activePrefix });
            setResult({ success: res.data.success, count: res.data.count, message: res.data.message, generatedCodes: res.data.generatedCodes || [], existingCodes: res.data.existingCodes || [], duplicateCodes: res.data.duplicateCodes || [] });
            setStep("result");
        } catch (err) {
            setResult({ success: false, message: err.response?.data?.message || "Upload failed.", existingCodes: err.response?.data?.existingCodes || [], duplicateCodes: err.response?.data?.duplicateCodes || [], generatedCodes: [] });
            setStep("result");
        } finally { setSubmitting(false); }
    };

    const resetToUpload = () => { setStep("upload"); setFile(null); setRows([]); setValidationErrors([]); setResult(null); };

    return (
        <Modal onClose={onClose} maxWidth="max-w-4xl">
            <ModalHeader title="Bulk Inventory Upload" subtitle="Upload an Excel file to add multiple products at once" icon={FiUpload} onClose={onClose} />

            <div className="flex-1 min-h-0 overflow-y-auto p-6">

                {step === "upload" && (
                    <div className="space-y-5">
                        <div className="flex items-center justify-between bg-[#2980b9]/10 border border-[#2980b9]/20 rounded-2xl px-5 py-4 gap-4">
                            <div>
                                <p className="text-sm font-semibold text-gray-800">Step 1 — Download the template</p>
                                <p className="text-xs text-gray-500 mt-0.5">Leave <span className="font-mono font-semibold text-[#2980b9]/90">productCode</span> blank to auto-generate.</p>
                            </div>
                            <button onClick={downloadTemplate}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-[#2980b9]/60 text-[#2980b9]/90 text-xs font-semibold rounded-xl hover:bg-[#2980b9]/10 transition shadow-sm flex-shrink-0">
                                <FiDownload size={13} /> Download Template
                            </button>
                        </div>

                        <div className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4">
                            <p className="text-sm font-semibold text-gray-800 mb-1">Step 2 — Set auto-code prefix</p>
                            <p className="text-xs text-gray-500 mb-3">
                                Blank productCode rows get a code like <span className="font-mono font-semibold text-[#2980b9]/90">1{activePrefix}, 2{activePrefix}…</span>
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="relative w-44">
                                    <FiTag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={13} />
                                    <input type="text" value={prefix}
                                        onChange={e => setPrefix(e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 6))}
                                        placeholder="DO" maxLength={6}
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#2980b9]/60 focus:ring-2 focus:ring-[#2980b9]/20 bg-white text-gray-800 transition font-mono uppercase tracking-widest" />
                                </div>
                                <span className="text-xs text-gray-400">Leave blank to default to <span className="font-mono font-semibold">DO</span></span>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-gray-800 mb-2">Step 3 — Upload filled Excel file</p>
                            <div ref={dropRef} onDrop={onDrop} onDragOver={e => e.preventDefault()}
                                onClick={() => document.getElementById("bulk-file-input").click()}
                                className="border-2 border-dashed border-[#2980b9]/40 hover:border-[#2980b9] rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition bg-gray-50 hover:bg-[#2980b9]/10">
                                <div className="w-12 h-12 rounded-2xl bg-[#2980b9]/20 flex items-center justify-center">
                                    <FiUpload size={20} className="text-[#2980b9]" />
                                </div>
                                {parsing ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-5 h-5 border-2 border-[#2980b9]/60 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-sm text-gray-500">Parsing file...</span>
                                    </div>
                                ) : (
                                    <p className="text-sm font-semibold text-gray-700">{file ? file.name : "Drop your Excel file here or click to browse"}</p>
                                )}
                                <input id="bulk-file-input" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
                            </div>
                            {parseError && (
                                <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                                    <FiAlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-red-600">{parseError}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {step === "preview" && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">
                                <FiCheckCircle size={13} className="text-emerald-500" />
                                <span className="text-xs font-semibold text-emerald-700">{rows.length} products parsed</span>
                            </div>
                            {autoCodeRows.length > 0 && (
                                <div className="flex items-center gap-2 bg-[#2980b9]/10 border border-[#2980b9]/20 rounded-xl px-4 py-2">
                                    <FiTag size={13} className="text-[#2980b9]/80" />
                                    <span className="text-xs font-semibold text-[#2980b9]/90">
                                        {autoCodeRows.length} auto-code <span className="font-mono">(1{activePrefix}, 2{activePrefix}…)</span>
                                    </span>
                                </div>
                            )}
                            {validationErrors.length > 0 && (
                                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2">
                                    <FiAlertCircle size={13} className="text-red-500" />
                                    <span className="text-xs font-semibold text-red-700">{validationErrors.length} error{validationErrors.length > 1 ? "s" : ""}</span>
                                </div>
                            )}
                            <button onClick={resetToUpload} className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition">
                                <FiX size={12} /> Change file
                            </button>
                        </div>

                        {validationErrors.length > 0 && (
                            <div className="bg-red-50 border border-red-100 rounded-xl p-4 max-h-32 overflow-y-auto">
                                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-2">Validation Errors</p>
                                {validationErrors.map((e, i) => <p key={i} className="text-xs text-red-600 leading-5">• {e}</p>)}
                            </div>
                        )}

                        <div className="overflow-x-auto rounded-xl border border-gray-100">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr>{["#", "Code", "Name", "Category", "Brand", "Price", "MRP", "Qty", "GST%", "Color", "Type"].map(h => (
                                        <th key={h} className="px-3 py-2.5 bg-gray-100 text-gray-600 font-semibold text-center whitespace-nowrap uppercase tracking-wider border-b border-gray-200">{h}</th>
                                    ))}</tr>
                                </thead>
                                <tbody>
                                    {rows.slice(0, 50).map((row, i) => (
                                        <tr key={i} className={`border-b border-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                                            <td className="px-3 py-2 text-center text-gray-400">{i + 1}</td>
                                            <td className="px-3 py-1 font-mono font-semibold whitespace-nowrap">
                                                <input 
                                                    type="text" 
                                                    value={row.productCode || ""} 
                                                    onChange={e => handleFieldChange(i, "productCode", e.target.value)}
                                                    placeholder={`auto-${activePrefix}`}
                                                    className="w-full bg-transparent border-0 focus:ring-1 focus:ring-[#2980b9]/40 rounded px-1 py-0.5 text-xs text-gray-800 focus:bg-white outline-none"
                                                />
                                            </td>
                                            <td className="px-3 py-1 text-gray-700 max-w-[160px]">
                                                <input 
                                                    type="text" 
                                                    value={row.productName || ""} 
                                                    onChange={e => handleFieldChange(i, "productName", e.target.value)}
                                                    className="w-full bg-transparent border-0 focus:ring-1 focus:ring-[#2980b9]/40 rounded px-1 py-0.5 text-xs text-gray-800 focus:bg-white outline-none"
                                                />
                                            </td>
                                            <td className="px-3 py-1 text-gray-650">
                                                <input 
                                                    type="text" 
                                                    value={row.category || ""} 
                                                    onChange={e => handleFieldChange(i, "category", e.target.value)}
                                                    className="w-full bg-transparent border-0 focus:ring-1 focus:ring-[#2980b9]/40 rounded px-1 py-0.5 text-xs text-gray-800 focus:bg-white outline-none"
                                                />
                                            </td>
                                            <td className="px-3 py-1 text-gray-650">
                                                <input 
                                                    type="text" 
                                                    value={row.brand || ""} 
                                                    onChange={e => handleFieldChange(i, "brand", e.target.value)}
                                                    className="w-full bg-transparent border-0 focus:ring-1 focus:ring-[#2980b9]/40 rounded px-1 py-0.5 text-xs text-gray-800 focus:bg-white outline-none"
                                                />
                                            </td>
                                            <td className="px-3 py-1 text-center text-gray-750">
                                                <div className="flex items-center justify-center">
                                                    <span className="text-[10px] text-gray-400 mr-0.5">₹</span>
                                                    <input 
                                                        type="number" 
                                                        value={row.price} 
                                                        onChange={e => handleFieldChange(i, "price", e.target.value)}
                                                        className="w-16 bg-transparent border-0 focus:ring-1 focus:ring-[#2980b9]/40 rounded px-1 py-0.5 text-xs text-gray-800 text-center focus:bg-white outline-none"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-3 py-1 text-center text-gray-750">
                                                <div className="flex items-center justify-center">
                                                    <span className="text-[10px] text-gray-400 mr-0.5">₹</span>
                                                    <input 
                                                        type="number" 
                                                        value={row.mrp} 
                                                        onChange={e => handleFieldChange(i, "mrp", e.target.value)}
                                                        className="w-16 bg-transparent border-0 focus:ring-1 focus:ring-[#2980b9]/40 rounded px-1 py-0.5 text-xs text-gray-800 text-center focus:bg-white outline-none"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-3 py-1 text-center text-gray-750">
                                                <input 
                                                    type="number" 
                                                    value={row.qty} 
                                                    onChange={e => handleFieldChange(i, "qty", e.target.value)}
                                                    className="w-12 bg-transparent border-0 focus:ring-1 focus:ring-[#2980b9]/40 rounded px-1 py-0.5 text-xs text-gray-800 text-center focus:bg-white outline-none"
                                                />
                                            </td>
                                            <td className="px-3 py-1 text-center text-gray-550">
                                                <div className="flex items-center justify-center">
                                                    <input 
                                                        type="number" 
                                                        value={row.gst} 
                                                        onChange={e => handleFieldChange(i, "gst", e.target.value)}
                                                        className="w-12 bg-transparent border-0 focus:ring-1 focus:ring-[#2980b9]/40 rounded px-1 py-0.5 text-xs text-gray-800 text-center focus:bg-white outline-none"
                                                    />
                                                    <span className="text-[10px] text-gray-400 ml-0.5">%</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-1 text-gray-550">
                                                <input 
                                                    type="text" 
                                                    value={row.color || ""} 
                                                    onChange={e => handleFieldChange(i, "color", e.target.value)}
                                                    className="w-full bg-transparent border-0 focus:ring-1 focus:ring-[#2980b9]/40 rounded px-1 py-0.5 text-xs text-gray-800 focus:bg-white outline-none"
                                                />
                                            </td>
                                            <td className="px-3 py-1 text-gray-550">
                                                <input 
                                                    type="text" 
                                                    value={row.type || ""} 
                                                    onChange={e => handleFieldChange(i, "type", e.target.value)}
                                                    className="w-full bg-transparent border-0 focus:ring-1 focus:ring-[#2980b9]/40 rounded px-1 py-0.5 text-xs text-gray-800 focus:bg-white outline-none"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {rows.length > 50 && <p className="text-center py-2 text-xs text-gray-400">Showing first 50 of {rows.length} rows</p>}
                        </div>
                    </div>
                )}

                {step === "result" && result && (
                    <div className="flex flex-col items-center py-8 gap-5">
                        {result.success ? (
                            <>
                                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <FiCheckCircle size={32} className="text-emerald-500" />
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-gray-800">Upload Successful!</p>
                                    <p className="text-sm text-gray-500 mt-1"><span className="font-semibold text-emerald-600">{result.count}</span> products added.</p>
                                </div>
                                {result.generatedCodes?.length > 0 && (
                                    <div className="w-full max-w-lg bg-[#2980b9]/10 border border-[#2980b9]/20 rounded-xl px-5 py-4">
                                        <p className="text-xs font-bold text-[#2980b9]/90 uppercase tracking-wider mb-2.5">Auto-generated Codes</p>
                                        <div className="flex flex-wrap gap-2">
                                            {result.generatedCodes.map(({ index, productCode }) => (
                                                <span key={productCode} className="text-xs font-mono bg-white border border-[#2980b9]/40 text-[#2980b9]/90 px-2.5 py-1 rounded-lg">
                                                    Row {index} → <span className="font-bold">{productCode}</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                                    <FiAlertCircle size={32} className="text-red-500" />
                                </div>
                                <div className="text-center max-w-md w-full">
                                    <p className="text-lg font-bold text-gray-800">Upload Failed</p>
                                    <p className="text-sm text-gray-500 mt-1">{result.message}</p>
                                    {result.existingCodes?.length > 0 && (
                                        <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-left">
                                            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1.5">Already exist in inventory</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {result.existingCodes.map(code => <span key={code} className="text-xs font-mono bg-amber-100 text-amber-800 px-2 py-0.5 rounded-lg">{code}</span>)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => { setStep("preview"); setResult(null); }}
                                    className="px-5 py-2 bg-[#2980b9] hover:bg-[#2980b9]/90 text-white text-xs font-semibold rounded-xl transition">← Back to Preview</button>
                            </>
                        )}
                    </div>
                )}
            </div>

            <ModalFooter>
                <button onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                    {step === "result" && result?.success ? "Close" : "Cancel"}
                </button>
                {step === "preview" && validationErrors.length === 0 && (
                    <button onClick={handleSubmit} disabled={submitting}
                        className="flex items-center gap-2 px-5 py-2 bg-[#2980b9] hover:bg-[#2980b9]/90 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-60">
                        {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        {submitting ? "Uploading..." : `Upload ${rows.length} Products`}
                    </button>
                )}
            </ModalFooter>
        </Modal>
    );
}