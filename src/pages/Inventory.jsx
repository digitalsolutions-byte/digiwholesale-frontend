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
    FiPackage, FiCalendar, FiPrinter, FiTag, FiCheckSquare
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
                <div className="w-8 h-8 rounded-xl bg-erp-accent/5 flex items-center justify-center">
                    <Icon size={15} className="text-erp-accent" />
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
        <div className="w-0.5 h-4 bg-erp-accent/80 rounded-full" />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{children}</span>
    </div>
);

const FieldInput = ({ label, children }) => (
    <div>
        <label className="text-[10px] font-semibold text-gray-700 uppercase   block mb-1">{label}</label>
        {children}
    </div>
);

const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-erp-accent/30 focus:ring-2 focus:ring-erp-accent/10 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300";
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
            className="w-3.5 h-3.5 rounded accent-erp-accent cursor-pointer"
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
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-erp-accent/30 border-t-transparent rounded-full animate-spin pointer-events-none" />
                )}
                <input
                    type="text"
                    value={value}
                    onChange={handleChange}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="Code, brand, category..."
                    className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-erp-accent/30 focus:ring-2 focus:ring-erp-accent/10 bg-gray-50 text-gray-700 transition placeholder:text-gray-300"
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
                    <div className="px-3 py-2 bg-erp-accent/5 border-b border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Suggestions</p>
                    </div>
                    <ul className="max-h-52 overflow-y-auto">
                        {suggestions.map((s, i) => (
                            <li key={i}>
                                <button onMouseDown={() => handleSelect(s)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-erp-accent/5 transition text-left">
                                    <div className="w-7 h-7 rounded-full bg-erp-accent/5 border border-orange-100 flex items-center justify-center flex-shrink-0">
                                        <FiPackage size={11} className="text-erp-accent/80" />
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
    const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
    const settings = useSelector((state) => state.settings.data);

    useEffect(() => {
        dispatch(fetchSettings());
    }, [dispatch]);

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [keyword, setKeyword] = useState("");
    const [triggerSearch, setTriggerSearch] = useState(false);

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
                            className="flex items-center gap-1.5 px-4 py-2 bg-erp-accent hover:bg-erp-accent/90 text-white text-xs font-semibold rounded-xl transition shadow-sm">
                            <FiPlus size={13} /> Add Product
                        </button>
                        <button onClick={() => setShowBulkUploadModal(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-erp-accent/30 hover:bg-erp-accent/5 text-erp-accent/90 text-xs font-semibold rounded-xl transition shadow-sm">
                            <FiUpload size={13} /> Bulk Upload
                        </button>
                        <button onClick={handleRefresh}
                            className="flex items-center gap-2 bg-erp-accent hover:bg-erp-accent/90 text-white px-4 py-2 text-xs font-semibold rounded-lg transition shadow-sm w-fit">
                            <FiRefreshCw size={13} /> Refresh
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end gap-3 w-full lg:w-auto">
                        <div className="flex gap-3 w-full sm:w-auto">
                            <div className="flex flex-col flex-1 sm:w-40">
                                <label className="text-[10px] font-semibold text-gray-400 uppercase   mb-1">From Date</label>
                                <div className="relative">
                                    <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={12} />
                                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-erp-accent/30 focus:ring-2 focus:ring-erp-accent/10 bg-gray-50 text-gray-700 transition" />
                                </div>
                            </div>
                            <div className="flex flex-col flex-1 sm:w-40">
                                <label className="text-[10px] font-semibold text-gray-400 uppercase   mb-1">To Date</label>
                                <div className="relative">
                                    <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={12} />
                                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-erp-accent/30 focus:ring-2 focus:ring-erp-accent/10 bg-gray-50 text-gray-700 transition" />
                                </div>
                            </div>
                        </div>
                        <ProductKeywordInput value={keyword} onChange={setKeyword} />
                        <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => setTriggerSearch(prev => prev + 1)}
                                className="px-4 py-2 bg-erp-accent hover:bg-erp-accent/90 text-white text-xs font-semibold rounded-xl transition shadow-sm">
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
                                        <span className="text-[10px] font-bold text-erp-accent uppercase tracking-widest">Product #{i + 1}</span>
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
                                className="w-full py-3 border-2 border-dashed border-erp-accent/20 hover:border-erp-accent/40 text-erp-accent/80 hover:text-erp-accent/90 text-xs font-semibold rounded-2xl transition flex items-center justify-center gap-2">
                                <FiPlus size={14} /> Add Another Product
                            </button>
                        </div>
                        <ModalFooter>
                            <button type="button" onClick={() => setShowAddProductModal(false)}
                                className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                                Cancel
                            </button>
                            <button type="submit"
                                className="px-5 py-2 bg-erp-accent hover:bg-erp-accent/90 text-white text-xs font-semibold rounded-xl transition shadow-sm">
                                Submit Products
                            </button>
                        </ModalFooter>
                    </form>
                </Modal>
            )}

            {showBulkUploadModal && (
                <BulkUploadModal onClose={() => setShowBulkUploadModal(false)} />
            )}
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
            Swal.fire({ icon: "error", title: "Error", text: error.response?.data?.message || "Something went wrong" });
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
            Swal.fire({ icon: "error", title: "Error", text: error.response?.data?.message || "Something went wrong" });
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
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition" title="Edit">
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
                            className="p-1.5 rounded-lg hover:bg-erp-accent/5 text-erp-accent/80 transition" title="Inventory History">
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
                    <div className="w-8 h-8 border-2 border-erp-accent/30 border-t-transparent rounded-full animate-spin" />
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
                        <div className="flex items-center gap-2 bg-erp-accent/5 border border-erp-accent/20 rounded-xl px-3 py-1.5">
                            <FiCheckSquare size={13} className="text-erp-accent" />
                            <span className="text-xs font-bold text-orange-700">
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
                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-erp-accent/30 focus:ring-2 focus:ring-erp-accent/10 transition text-gray-600 placeholder:text-gray-300" />
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
                                        ${isChecked ? "bg-erp-accent/5/70 hover:bg-erp-accent/5" : "hover:bg-erp-accent/5"}`}
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
                                : "bg-erp-accent hover:bg-erp-accent/90 text-white"}`}>
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
                            className={`w-8 h-8 text-xs rounded-lg font-semibold transition ${p === currentPage ? "bg-erp-accent text-white shadow-sm" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
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
                        className="flex items-center gap-2 px-5 py-2 bg-erp-accent hover:bg-erp-accent/90 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-60">
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
                                <span className="text-[10px] font-bold text-erp-accent uppercase tracking-widest">
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
                                    <input type="number" value={row.total} readOnly className={`${inputCls} bg-erp-accent/5 text-emerald-600 font-semibold`} />
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
                        className="w-full py-3 border-2 border-dashed border-erp-accent/20 hover:border-erp-accent/40 text-erp-accent/80 hover:text-erp-accent/90 text-xs font-semibold rounded-2xl transition flex items-center justify-center gap-2">
                        <FiPlus size={14} /> Add Row
                    </button>
                </div>

                <ModalFooter>
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
                    <button type="submit"
                        className="px-5 py-2 bg-erp-accent hover:bg-erp-accent/90 text-white text-xs font-semibold rounded-xl transition shadow-sm">Submit</button>
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
                        <div className="w-6 h-6 border-2 border-erp-accent/30 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                {table.getHeaderGroups().map(hg => (
                                    <tr key={hg.id} className="border-b border-gray-100">
                                        {hg.headers.map(h => (
                                            <th key={h.id} className="px-4 py-3 text-center text-xs font-semibold text-white bg-erp-accent whitespace-nowrap uppercase  ">
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
                                    <tr key={row.id} className="border-b border-gray-50 hover:bg-erp-accent/5 transition-colors">
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


// ─── PreviewLabel ─────────────────────────────────────────────────────────────
function PreviewLabel({ value, productCode, printType = "barcode" }) {
    const svgRef = useRef(null);
    const canvasRef = useRef(null);
    const [qrDataUrl, setQrDataUrl] = useState("");

    useEffect(() => {
        if (!value) return;
        if (printType === "barcode" && svgRef.current) {
            try {
                JsBarcode(svgRef.current, value, {
                    format: "CODE128", width: 1.8, height: 36,
                    displayValue: false, margin: 0,
                    background: "#ffffff", lineColor: "#000000",
                });
            } catch (e) { console.error(e); }
        }
        if (printType === "qr") {
            QRCode.toDataURL(value, { width: 80, margin: 1, color: { dark: "#000000", light: "#ffffff" } })
                .then(url => setQrDataUrl(url))
                .catch(console.error);
        }
    }, [value, printType]);

    if (!value) return null;

    return (
        <div className="flex flex-col items-center justify-center bg-white border border-gray-200 rounded-lg p-2 shadow-sm"
            style={{ width: printType === "qr" ? "80px" : "120px", minHeight: "64px" }}>
            {printType === "barcode"
                ? <svg ref={svgRef} style={{ maxWidth: "100%", height: "36px" }} />
                : qrDataUrl
                    ? <img src={qrDataUrl} alt="QR" style={{ width: "56px", height: "56px" }} />
                    : <div className="w-14 h-14 bg-gray-100 animate-pulse rounded" />
            }
            <p className="text-[8px] font-mono font-bold text-gray-800 mt-0.5 text-center leading-tight">{value}</p>
            {productCode && productCode !== value && (
                <p className="text-[7px] text-gray-500 text-center leading-tight">{productCode}</p>
            )}
        </div>
    );
}


// ─── QtyStepper ───────────────────────────────────────────────────────────────
function QtyStepper({ value, onChange }) {
    return (
        <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden bg-gray-50 focus-within:border-erp-accent/30 focus-within:ring-2 focus-within:ring-orange-100 transition">
            <button type="button" onClick={() => onChange((parseInt(value) || 0) - 1)}
                className="px-3 py-2 text-gray-500 hover:bg-gray-100 transition text-base font-semibold flex-shrink-0 select-none">−</button>
            <input
                type="number"
                value={value}
                onChange={e => {
                    const raw = e.target.value;
                    if (raw === "" || raw === "-") { onChange(""); return; }
                    const n = parseInt(raw);
                    if (!isNaN(n)) onChange(n);
                }}
                className="flex-1 py-2 text-sm text-center text-gray-700 bg-transparent outline-none min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button type="button" onClick={() => onChange((parseInt(value) || 0) + 1)}
                className="px-3 py-2 text-gray-500 hover:bg-gray-100 transition text-base font-semibold flex-shrink-0 select-none">+</button>
        </div>
    );
}



// Barcode and QR print mode;
function BarcodePrintModal({ product, bulkProducts = null, inventoryData = [], onClose, settings }) {

    const [printType, setPrintType] = useState("barcode");

    // console.log("Print barcode settings => ", settings.storeName)

    const makeRow = (overrides = {}) => ({
        id: Math.random().toString(36).slice(2),
        barcodeValue: "",
        productCode: "",
        mrp: "",
        qty: 1,
        showMrp: true,
        _status: "idle",
        ...overrides,
    });

    const [rows, setRows] = useState(() => {
        if (bulkProducts && bulkProducts.length > 0) {
            return bulkProducts.map(p => makeRow({
                barcodeValue: p.productCode || "",
                productCode: p.productCode || "",
                mrp: p.mrp ? String(p.mrp) : "",
                _status: p.mrp ? "found" : "idle",
            }));
        }
        return [makeRow({
            barcodeValue: product?.productCode || "",
            productCode: product?.productCode || "",
            mrp: product?.mrp ? String(product.mrp) : "",
        })];
    });

    useEffect(() => {
        rows.forEach(row => {
            if (row.barcodeValue && !row.mrp) {
                const match = inventoryData.find(
                    p => p.productCode?.toLowerCase() === row.barcodeValue.toLowerCase()
                );
                if (match) {
                    setRows(prev => prev.map(r =>
                        r.id === row.id ? { ...r, mrp: match.mrp ? String(match.mrp) : "", _status: "found" } : r
                    ));
                } else {
                    fetchByCode(row.barcodeValue, row.id);
                }
            } else if (row.barcodeValue && row.mrp) {
                setRows(prev => prev.map(r =>
                    r.id === row.id ? { ...r, _status: "found" } : r
                ));
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchByCode = async (code, rowId) => {
        if (!code?.trim()) return;
        _setRowField(rowId, "_status", "loading");
        try {
            const res = await api.get(`/api/digi/product/inventory/productCode/${encodeURIComponent(code.trim())}`);
            if (res.data.success) {
                const p = Array.isArray(res.data.data) ? res.data.data[0] : res.data.data;
                setRows(prev => prev.map(r =>
                    r.id === rowId
                        ? { ...r, mrp: p?.mrp ? String(p.mrp) : r.mrp, productCode: p?.productCode || r.productCode, _status: "found" }
                        : r
                ));
            } else {
                _setRowField(rowId, "_status", "notfound");
            }
        } catch { _setRowField(rowId, "_status", "error"); }
    };

    const _setRowField = (id, field, value) =>
        setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));

    const updateRow = (id, field, value) =>
        setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));

    const addRow = () => setRows(prev => [...prev, makeRow()]);
    const removeRow = (id) => { if (rows.length === 1) return; setRows(prev => prev.filter(r => r.id !== id)); };

    const debounceTimers = useRef({});
    const handleBarcodeChange = (id, value) => {
        setRows(prev => prev.map(r =>
            r.id === id ? { ...r, barcodeValue: value, productCode: value, mrp: "", _status: "idle" } : r
        ));
        if (!value.trim() || value.trim().length < 2) return;
        const match = inventoryData.find(p => p.productCode?.toLowerCase() === value.trim().toLowerCase());
        if (match) {
            setRows(prev => prev.map(r =>
                r.id === id ? { ...r, barcodeValue: value, productCode: match.productCode || value, mrp: match.mrp ? String(match.mrp) : "", _status: "found" } : r
            ));
            return;
        }
        clearTimeout(debounceTimers.current[id]);
        debounceTimers.current[id] = setTimeout(() => fetchByCode(value, id), 600);
    };

    const getExpandedLabels = () => {
        const labels = [];
        rows.forEach(row => {
            if (!row.barcodeValue.trim()) return;
            const count = Math.max(1, parseInt(row.qty) || 1);
            for (let i = 0; i < count; i++) {
                labels.push({
                    barcodeValue: row.barcodeValue.trim(),
                    productCode: row.productCode.trim(),
                    mrp: row.showMrp ? row.mrp : "",
                });
            }
        });
        return labels;
    };

    // ── Print handler ─────────────────────────────────────────────────────────
    const handlePrint = useCallback(async () => {
        const labels = getExpandedLabels();
        if (labels.length === 0) return;

        const generateDataUrl = async (value) => {
            if (printType === "barcode") {
                const canvas = document.createElement("canvas");
                try {
                    JsBarcode(canvas, value, {
                        format: "CODE128",
                        width: 2,
                        height: 28,
                        displayValue: false,
                        margin: 1,
                        background: "#ffffff",
                        lineColor: "#000000"
                    });
                    return canvas.toDataURL("image/png");
                } catch { return null; }
            } else {
                try {
                    return await QRCode.toDataURL(value, {
                        width: 80,
                        margin: 0,
                        color: { dark: "#000000", light: "#ffffff" }
                    });
                } catch { return null; }
            }
        };

        const dataUrls = await Promise.all(labels.map(l => generateDataUrl(l.barcodeValue)));
        const isQR = printType === "qr";

        const labelsHtml = labels.map((label, idx) => {
            const imgSrc = dataUrls[idx];
            const showCode = label.productCode && label.productCode !== label.barcodeValue;


            if (isQR) {
                return `
        <div class="label" style="flex-direction:row; align-items:center; gap:1.5mm; padding:1mm 2mm;">
            ${imgSrc ? `<img src="${imgSrc}" class="qr-img" />` : ""}
            <div class="text-block" style="flex-direction:column; align-items:flex-start; gap:0.3mm;">
                ${true ? `<div class="product-code">${label.productCode}</div>` : ""}
                ${label.mrp ? `<div class="mrp">&#8377;${label.mrp}/-</div>` : ""}
            </div>
        </div>`;
            }


            return `
<div class="label">
    <div class="left-zone">
        ${imgSrc ? `<img src="${imgSrc}" class="barcode-img" />` : ""}
        ${true ? `<div class="product-code">${label.productCode}</div>` : ""}
    </div>
    <div class="right-zone">
    {/* <div class="store-name">&#8202;&#8202;&#8202;&#8202;&#8202;&#8202;&#8202;&#8202;&#8202;&#8202;&#8202;&#8202;&#8202;&#8202;&#8202;&#8202;&#8202;&#8202;&#8202;${settings.storeName || ""}</div> */}
        ${label.mrp ? `<div class="mrp">&#8377;${label.mrp}/-</div>` : ""}
    </div>
</div>`;

        }).join("");

        const printHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${isQR ? "QR" : "Barcode"} Labels</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

@page {
    size: 55mm 13mm;
    margin: 0;
}

html, body {
    width: 55mm;
    height: 13mm;
    font-family: Arial, sans-serif;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}

.label {
    width: 55mm;
    height: 13mm;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    overflow: hidden;
    page-break-after: always;
    background: #fff;
    gap: 0.5mm;
}

/* LEFT ZONE — barcode + code stacked */
.left-zone {
    width: 25mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 0.3mm;
    gap: 0.2mm;
    flex-shrink: 0;
    overflow: hidden;
}

/* RIGHT ZONE — MRP large and centered */
.right-zone {
    width: 20mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
}

.barcode-img {
    width: 24mm;
    height: 7mm;
    object-fit: contain;
    display: block;
    flex-shrink: 0;
    max-width: 100%;
}

.qr-img {
    width: 7mm;
    height: 7mm;
    object-fit: contain;
    display: block;
    flex-shrink: 0;
}

.text-block {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: flex-start;
    gap: 0.3mm;
    flex: 1;
    overflow: hidden;
    min-width: 0;
}

.barcode-val {
    font-size: 4.5pt;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    color: #000;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
}



.product-code {
    font-size: 10pt;
    font-weight: bold;
    white-space: normal;
    overflow: visible;
    line-height: 1;
    text-align: center;
}

/*
.store-name {
    font-size: 6pt;
    font-family: Arial, sans-serif;
    font-weight: bold;
    color: #000;
    white-space: nowrap;
    max-width: 100%;
}
*/

.mrp {
    font-size: 10pt;
    font-family: Arial, sans-serif;
    font-weight: bold;
    color: #000;
    white-space: nowrap;
    max-width: 100%;
}

@media screen {
    html, body {
        width: 100vw;
        height: 100vh;
        background: #3a3a3a;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        padding: 20px;
        gap: 14px;
        overflow-y: auto;
    }

    .label {
        width: calc(55mm * 3.5);
        height: calc(13mm * 3.5);
        page-break-after: unset;
        border: 1px solid #ccc;
        border-radius: 6px;
        box-shadow: 0 3px 12px rgba(0,0,0,0.4);
        padding: calc(1mm * 3.5) calc(2mm * 3.5);
        gap: calc(0.5mm * 3.5);
        background: #fff;
    }

    .left-zone  { width: calc(50mm * 3.5); padding: calc(0.5mm * 3.5) calc(1.5mm * 3.5); }
    .right-zone { width: calc(50mm * 3.5); }

    .barcode-img {
        width: calc(46mm * 3.5);
        height: calc(7mm * 3.5);
    }

    .qr-img {
        width: calc(7mm * 3.5);
        height: calc(7mm * 3.5);
    }

    .barcode-val  { font-size: calc(4.5pt   * 3.5); }
    .product-code { font-size: calc(18pt * 3.5); }
    .mrp          { font-size: calc(5.5pt   * 3.5); }
}
</style>
</head>
<body>
${labelsHtml}
</body>
</html>`;

        const win = window.open("", "_blank", "width=900,height=700");
        win.document.write(printHtml);
        win.document.close();
        win.onload = () => { win.focus(); setTimeout(() => win.print(), 300); };
    }, [rows, printType]);

    const totalLabels = rows.reduce((sum, r) => sum + Math.max(1, parseInt(r.qty) || 1), 0);
    const validRows = rows.filter(r => r.barcodeValue.trim());
    const isBulk = bulkProducts && bulkProducts.length > 0;

    const StatusBadge = ({ status }) => {
        if (status === "loading") return <span className="flex items-center gap-1 text-[10px] text-blue-400"><span className="w-2.5 h-2.5 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />Looking up...</span>;
        if (status === "found") return <span className="text-[10px] text-emerald-500 font-semibold">✓ Found</span>;
        if (status === "notfound") return <span className="text-[10px] text-erp-accent">Not in inventory</span>;
        if (status === "error") return <span className="text-[10px] text-red-400">Lookup failed</span>;
        return null;
    };

    return (
        <Modal onClose={onClose} maxWidth="max-w-3xl">
            <ModalHeader
                title="Print Labels"
                subtitle={isBulk
                    ? `Bulk print · ${bulkProducts.length} product${bulkProducts.length > 1 ? "s" : ""} selected`
                    : "Thermal label · 100mm × 13mm · one label per cut"
                }
                icon={FiPrinter}
                onClose={onClose}
            />

            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">

                {/* ── Print type toggle ── */}
                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase  ">Print type</span>
                    <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
                        <button
                            type="button"
                            onClick={() => setPrintType("barcode")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition
                                ${printType === "barcode"
                                    ? "bg-white text-gray-800 shadow-sm"
                                    : "text-gray-400 hover:text-gray-600"}`}
                        >
                            <BsUpcScan size={14} /> Barcode
                        </button>
                        <button
                            type="button"
                            onClick={() => setPrintType("qr")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition
                                ${printType === "qr"
                                    ? "bg-white text-gray-800 shadow-sm"
                                    : "text-gray-400 hover:text-gray-600"}`}
                        >
                            <BsQrCode size={14} /> QR Code
                        </button>
                    </div>
                    <span className="text-[10px] text-gray-400">
                        100 × 13mm · 1 per cut
                    </span>
                </div>

                {/* Info bar */}
                <div className="flex items-center gap-2 bg-erp-accent/5 border border-orange-100 rounded-xl px-4 py-2.5">
                    <FiTag size={13} className="text-erp-accent/80 flex-shrink-0" />
                    <p className="text-xs text-orange-700">
                        <strong>100 × 13mm</strong> — thermal label, one label per cut.
                        {validRows.length > 0 && (
                            <span className="ml-2 font-semibold">
                                {validRows.length} code{validRows.length !== 1 ? "s" : ""} · {totalLabels} label{totalLabels !== 1 ? "s" : ""} will print.
                            </span>
                        )}
                    </p>
                </div>

                {/* Label rows */}
                <div className="space-y-3">
                    {rows.map((row, idx) => {
                        const printQty = Math.max(1, parseInt(row.qty) || 1);
                        const qtyBelowOne = (parseInt(row.qty) || 0) < 1;

                        return (
                            <div key={row.id} className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] font-bold text-erp-accent uppercase tracking-widest">Label #{idx + 1}</span>
                                        <StatusBadge status={row._status} />
                                    </div>
                                    {rows.length > 1 && (
                                        <button type="button" onClick={() => removeRow(row.id)}
                                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition flex-shrink-0">
                                            <FiTrash2 size={13} />
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="text-[10px] font-semibold text-gray-700 uppercase   block mb-1">
                                            {printType === "barcode" ? "Barcode *" : "QR Value *"}
                                        </label>
                                        <div className="relative">
                                            {printType === "barcode"
                                                ? <BsUpcScan className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={13} />
                                                : <BsQrCode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={13} />
                                            }
                                            <input
                                                type="text"
                                                value={row.barcodeValue}
                                                onChange={e => handleBarcodeChange(row.id, e.target.value)}
                                                placeholder="Scan or type code"
                                                className={`${inputCls} pl-9`}
                                                autoFocus={idx === rows.length - 1}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-semibold text-gray-700 uppercase   block mb-1">Product Code</label>
                                        <input type="text" value={row.productCode}
                                            onChange={e => updateRow(row.id, "productCode", e.target.value)}
                                            placeholder="PRD001" className={inputCls} />
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[10px] font-semibold text-gray-700 uppercase  ">MRP (₹)</label>
                                            <label className="flex items-center gap-1 cursor-pointer">
                                                <input type="checkbox" checked={row.showMrp}
                                                    onChange={e => updateRow(row.id, "showMrp", e.target.checked)}
                                                    className="accent-erp-accent w-3 h-3" />
                                                <span className="text-[9px] text-gray-400 select-none">Show</span>
                                            </label>
                                        </div>
                                        <input type="number" value={row.mrp}
                                            onChange={e => updateRow(row.id, "mrp", e.target.value)}
                                            placeholder="0.00" disabled={!row.showMrp}
                                            className={`${inputCls} ${!row.showMrp ? "opacity-40 cursor-not-allowed" : ""}`} />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-semibold text-gray-700 uppercase   block mb-1">
                                            Quantity {qtyBelowOne && <span className="ml-1 text-amber-400 normal-case font-normal">(prints 1)</span>}
                                        </label>
                                        <QtyStepper value={row.qty} onChange={v => updateRow(row.id, "qty", v)} />
                                    </div>
                                </div>

                                {row.barcodeValue.trim() && (
                                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 flex-wrap">
                                        <span className="text-[10px] text-gray-400 uppercase   font-semibold flex-shrink-0">Preview</span>
                                        <PreviewLabel
                                            value={row.barcodeValue.trim()}
                                            productCode={row.productCode.trim()}
                                            mrp={row.showMrp ? row.mrp : ""}
                                            printType={printType}
                                        />
                                        <div className="text-xs text-gray-400">
                                            × <strong className="text-gray-700">{printQty}</strong> label{printQty !== 1 ? "s" : ""}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <button type="button" onClick={addRow}
                    className="w-full py-3 border-2 border-dashed border-erp-accent/20 hover:border-erp-accent/40 text-erp-accent/80 hover:text-erp-accent/90 text-xs font-semibold rounded-2xl transition flex items-center justify-center gap-2">
                    <FiPlus size={14} /> Add Another Code
                </button>
            </div>

            <ModalFooter>
                <div className="flex items-center gap-2 text-xs text-gray-400 mr-auto">
                    <span className="w-2 h-2 rounded-full bg-erp-accent/80 inline-block flex-shrink-0" />
                    {validRows.length} code{validRows.length !== 1 ? "s" : ""} · {totalLabels} total label{totalLabels !== 1 ? "s" : ""}
                </div>
                <button type="button" onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
                <button type="button" onClick={handlePrint} disabled={validRows.length === 0}
                    className="flex items-center gap-2 px-5 py-2 bg-erp-accent hover:bg-erp-accent/90 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    <FiPrinter size={13} />
                    Print {printType === "qr" ? "QR" : "Barcode"} Labels
                </button>
            </ModalFooter>
        </Modal>
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
                        <div className="flex items-center justify-between bg-erp-accent/5 border border-orange-100 rounded-2xl px-5 py-4 gap-4">
                            <div>
                                <p className="text-sm font-semibold text-gray-800">Step 1 — Download the template</p>
                                <p className="text-xs text-gray-500 mt-0.5">Leave <span className="font-mono font-semibold text-erp-accent/90">productCode</span> blank to auto-generate.</p>
                            </div>
                            <button onClick={downloadTemplate}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-erp-accent/30 text-erp-accent/90 text-xs font-semibold rounded-xl hover:bg-erp-accent/5 transition shadow-sm flex-shrink-0">
                                <FiDownload size={13} /> Download Template
                            </button>
                        </div>

                        <div className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4">
                            <p className="text-sm font-semibold text-gray-800 mb-1">Step 2 — Set auto-code prefix</p>
                            <p className="text-xs text-gray-500 mb-3">
                                Blank productCode rows get a code like <span className="font-mono font-semibold text-erp-accent/90">1{activePrefix}, 2{activePrefix}…</span>
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="relative w-44">
                                    <FiTag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={13} />
                                    <input type="text" value={prefix}
                                        onChange={e => setPrefix(e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 6))}
                                        placeholder="DO" maxLength={6}
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-erp-accent/30 focus:ring-2 focus:ring-erp-accent/10 bg-white text-gray-800 transition font-mono uppercase tracking-widest" />
                                </div>
                                <span className="text-xs text-gray-400">Leave blank to default to <span className="font-mono font-semibold">DO</span></span>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-gray-800 mb-2">Step 3 — Upload filled Excel file</p>
                            <div ref={dropRef} onDrop={onDrop} onDragOver={e => e.preventDefault()}
                                onClick={() => document.getElementById("bulk-file-input").click()}
                                className="border-2 border-dashed border-erp-accent/20 hover:border-erp-accent/40 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition bg-gray-50 hover:bg-erp-accent/5">
                                <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center">
                                    <FiUpload size={20} className="text-erp-accent" />
                                </div>
                                {parsing ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-5 h-5 border-2 border-erp-accent/30 border-t-transparent rounded-full animate-spin" />
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
                                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2">
                                    <FiTag size={13} className="text-blue-400" />
                                    <span className="text-xs font-semibold text-blue-600">
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
                                        <th key={h} className="px-3 py-2.5 bg-gray-100 text-gray-600 font-semibold text-center whitespace-nowrap uppercase   border-b border-gray-200">{h}</th>
                                    ))}</tr>
                                </thead>
                                <tbody>
                                    {rows.slice(0, 50).map((row, i) => (
                                        <tr key={i} className={`border-b border-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                                            <td className="px-3 py-2 text-center text-gray-400">{i + 1}</td>
                                            <td className="px-3 py-2 font-mono font-semibold whitespace-nowrap">
                                                {row.productCode ? <span className="text-gray-800">{row.productCode}</span> : <span className="text-blue-400 italic text-[10px]">auto-{activePrefix}</span>}
                                            </td>
                                            <td className="px-3 py-2 text-gray-700 max-w-[160px] truncate">{row.productName}</td>
                                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{row.category}</td>
                                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{row.brand}</td>
                                            <td className="px-3 py-2 text-center text-gray-700">₹{row.price}</td>
                                            <td className="px-3 py-2 text-center text-gray-700">₹{row.mrp}</td>
                                            <td className="px-3 py-2 text-center text-gray-700">{row.qty}</td>
                                            <td className="px-3 py-2 text-center text-gray-500">{row.gst}%</td>
                                            <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{row.color || "—"}</td>
                                            <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{row.type || "—"}</td>
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
                                    <div className="w-full max-w-lg bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
                                        <p className="text-xs font-bold text-blue-700 uppercase   mb-2.5">Auto-generated Codes</p>
                                        <div className="flex flex-wrap gap-2">
                                            {result.generatedCodes.map(({ index, productCode }) => (
                                                <span key={productCode} className="text-xs font-mono bg-white border border-blue-200 text-blue-700 px-2.5 py-1 rounded-lg">
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
                                        <div className="mt-3 bg-erp-accent/5 border border-erp-accent/10 rounded-xl px-4 py-3 text-left">
                                            <p className="text-xs font-bold text-amber-700 uppercase   mb-1.5">Already exist in inventory</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {result.existingCodes.map(code => <span key={code} className="text-xs font-mono bg-amber-100 text-amber-800 px-2 py-0.5 rounded-lg">{code}</span>)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => { setStep("preview"); setResult(null); }}
                                    className="px-5 py-2 bg-erp-accent hover:bg-erp-accent/90 text-white text-xs font-semibold rounded-xl transition">← Back to Preview</button>
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
                        className="flex items-center gap-2 px-5 py-2 bg-erp-accent hover:bg-erp-accent/90 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-60">
                        {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        {submitting ? "Uploading..." : `Upload ${rows.length} Products`}
                    </button>
                )}
            </ModalFooter>
        </Modal>
    );
}






