import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import {
    FiX,
    FiDownload,
    FiUpload,
    FiCheckCircle,
    FiAlertCircle,
    FiSearch,
    FiGrid,
    FiClock,
    FiRefreshCw,
    FiArrowRight,
    FiLayers,
    FiDollarSign,
    FiPackage,
    FiTrash2,
} from "react-icons/fi";
import { toast } from "react-toastify";
import api from "../../services/apiInstance";

export default function LensMatrixModal({ isOpen, onClose, onRefreshInventory }) {
    const [activeTab, setActiveTab] = useState("matrix"); // "matrix" | "history"

    // ── Search & Selection State ──
    const [searchTerm, setSearchTerm] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchTimeoutRef = useRef(null);

    // ── Matrix Data State ──
    const [matrixLoading, setMatrixLoading] = useState(false);
    const [matrixData, setMatrixData] = useState(null);

    // ── Action State ──
    const [action, setAction] = useState("UPDATE_PRICE"); // "UPDATE_PRICE" | "UPDATE_QTY" | "DELETE"
    const priceType = "all"; // Always All Prices (Buying, Selling & MRP)

    // ── Excel Upload & Parsing State ──
    const [uploadedFile, setUploadedFile] = useState(null);
    const [parsing, setParsing] = useState(false);
    const [parsedUpdates, setParsedUpdates] = useState([]);
    const [matrixDimensions, setMatrixDimensions] = useState(null);
    const [parseError, setParseError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // ── History State ──
    const [historyList, setHistoryList] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historySearch, setHistorySearch] = useState("");

    // ── Fetch Suggestions on Search Term Change ──
    useEffect(() => {
        if (!searchTerm || searchTerm.trim().length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        searchTimeoutRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await api.get(`/api/digi/product/lens/search?q=${encodeURIComponent(searchTerm.trim())}`);
                if (res.data?.success) {
                    setSuggestions(res.data.data || []);
                    setShowSuggestions(true);
                }
            } catch (err) {
                console.error("Failed to search lens products:", err);
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, [searchTerm]);

    // ── Load Matrix Data for Selected Product ──
    const handleSelectProduct = async (prod) => {
        setSelectedProduct(prod);
        setSearchTerm(prod.productName);
        setShowSuggestions(false);
        setUploadedFile(null);
        setParsedUpdates([]);
        setMatrixDimensions(null);
        setParseError("");

        setMatrixLoading(true);
        try {
            const res = await api.get(`/api/digi/product/lens/matrix-data?productName=${encodeURIComponent(prod.productName)}`);
            if (res.data?.success) {
                setMatrixData(res.data);
            } else {
                toast.error(res.data?.message || "Failed to load matrix data");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to load matrix data");
        } finally {
            setMatrixLoading(false);
        }
    };

    // ── Load History ──
    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const res = await api.get("/api/digi/product/lens/history");
            if (res.data?.success) {
                setHistoryList(res.data.data || []);
            }
        } catch (err) {
            console.error("Failed to fetch lens history:", err);
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && activeTab === "history") {
            fetchHistory();
        }
    }, [isOpen, activeTab]);

    if (!isOpen) return null;

    // ── 1. Export Excel (Flat list: one row per product so ALL combinations are exported) ──
    const handleExportExcel = () => {
        if (!matrixData || !matrixData.products || matrixData.products.length === 0) {
            return toast.error("Please select a valid lens product with power combinations first.");
        }

        const { products: allProducts, productName } = matrixData;

        const wb = XLSX.utils.book_new();

        if (action === "UPDATE_PRICE") {
            // Flat list with all 3 price columns — edit values and re-upload
            const header = ["Product Code", "SPH", "CYL", "Addition", "Selling Price", "Buying Price", "MRP"];
            const rows = allProducts.map(p => [
                p.productCode || "",
                p.sph !== undefined && p.sph !== "" ? Number(p.sph) : "",
                p.cyl !== undefined && p.cyl !== "" ? Number(p.cyl) : "",
                p.addition || "",
                p.sellingPrice ?? p.price ?? 0,
                p.buyingPrice ?? p.price ?? 0,
                p.mrp ?? 0,
            ]);
            const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
            ws["!cols"] = [{ wch: 18 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 10 }];
            XLSX.utils.book_append_sheet(wb, ws, "Prices");

        } else if (action === "UPDATE_QTY") {
            // Flat list with stock qty column
            const header = ["Product Code", "SPH", "CYL", "Addition", "Stock Quantity"];
            const rows = allProducts.map(p => [
                p.productCode || "",
                p.sph !== undefined && p.sph !== "" ? Number(p.sph) : "",
                p.cyl !== undefined && p.cyl !== "" ? Number(p.cyl) : "",
                p.addition || "",
                p.qty ?? 0,
            ]);
            const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
            ws["!cols"] = [{ wch: 18 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 14 }];
            XLSX.utils.book_append_sheet(wb, ws, "Stock Quantity");

        } else {
            // DELETE: flat list — set Delete column to 1 to delete that combination
            const header = ["Product Code", "SPH", "CYL", "Addition", "Delete (1=delete, 0=keep)"];
            const rows = allProducts.map(p => [
                p.productCode || "",
                p.sph !== undefined && p.sph !== "" ? Number(p.sph) : "",
                p.cyl !== undefined && p.cyl !== "" ? Number(p.cyl) : "",
                p.addition || "",
                0,
            ]);
            const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
            ws["!cols"] = [{ wch: 18 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 26 }];
            XLSX.utils.book_append_sheet(wb, ws, "Delete Combinations");
        }

        const actionTag = action === "UPDATE_QTY" ? "Quantity" : action === "UPDATE_PRICE" ? "Pricing" : "Delete";
        const filename = `${productName.replace(/\s+/g, "_")}_${actionTag}_${allProducts.length}pcs.xlsx`;
        XLSX.writeFile(wb, filename);

        toast.success(`Exported ${allProducts.length} products for "${productName}" — edit and re-upload to apply.`);
    };

    // ── 2. Parse Uploaded Excel File (Supports Multi-Sheet & Combined Formats) ──
    const handleFileUpload = (file) => {
        if (!file) return;
        const ext = file.name.split(".").pop().toLowerCase();
        if (!["xlsx", "xls", "csv"].includes(ext)) {
            setParseError("Only .xlsx, .xls, or .csv files are accepted.");
            return;
        }

        setUploadedFile(file);
        setParseError("");
        setParsing(true);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });

                if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                    throw new Error("No sheets found in the uploaded workbook.");
                }

                // Key: productCode or sph_cyl → update object
                const updatesMap = {};
                const parsedSheets = [];
                let totalValidRows = 0;

                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
                    if (!rawData || rawData.length < 2) return;

                    parsedSheets.push(sheetName);
                    const headerRow = rawData[0].map(h => String(h).toLowerCase().trim());

                    // ── Detect flat-list format by looking for a "product code" header ──
                    const isFlatList = headerRow.some(h => h.includes("product") || h.includes("code"));

                    if (isFlatList) {
                        // ── NEW FLAT FORMAT: Product Code | SPH | CYL | Addition | prices... ──
                        const colCode = headerRow.findIndex(h => h.includes("product") || h.includes("code"));
                        const colSph = headerRow.findIndex(h => h === "sph");
                        const colCyl = headerRow.findIndex(h => h === "cyl");
                        const colAdd = headerRow.findIndex(h => h.includes("add"));
                        const colSell = headerRow.findIndex(h => h.includes("sell"));
                        const colBuy = headerRow.findIndex(h => h.includes("buy"));
                        const colMrp = headerRow.findIndex(h => h === "mrp");
                        const colQty = headerRow.findIndex(h => h.includes("stock") || h.includes("qty") || h.includes("quantity"));
                        const colDel = headerRow.findIndex(h => h.includes("delete"));

                        for (let r = 1; r < rawData.length; r++) {
                            const row = rawData[r];
                            if (!row || row.every(c => c === "" || c === undefined)) continue;

                            const productCode = colCode >= 0 ? String(row[colCode] || "").trim() : "";
                            const rawSph = colSph >= 0 ? row[colSph] : "";
                            const rawCyl = colCyl >= 0 ? row[colCyl] : "";
                            const addition = colAdd >= 0 ? String(row[colAdd] || "").trim() : "";

                            const parsedSph = parseFloat(String(rawSph).replace(/\+/g, "").trim());
                            const parsedCyl = parseFloat(String(rawCyl).replace(/\+/g, "").trim());

                            if (!productCode && isNaN(parsedSph) && isNaN(parsedCyl)) continue;

                            const sph = !isNaN(parsedSph) ? parsedSph.toFixed(2) : "";
                            const cyl = !isNaN(parsedCyl) ? parsedCyl.toFixed(2) : "";

                            // Key by productCode first (most precise), fallback to sph_cyl
                            const key = productCode || `${sph}_${cyl}_${addition}`;
                            if (!updatesMap[key]) {
                                updatesMap[key] = { productCode, sph, cyl, addition };
                            }

                            totalValidRows++;

                            // Extract prices / qty / delete flag
                            if (colDel >= 0) {
                                const delVal = Number(row[colDel]);
                                updatesMap[key].isDelete = delVal === 1;
                            }
                            if (colSell >= 0 && row[colSell] !== "" && !isNaN(Number(row[colSell]))) {
                                updatesMap[key].sellingPrice = Math.max(0, Number(row[colSell]));
                            }
                            if (colBuy >= 0 && row[colBuy] !== "" && !isNaN(Number(row[colBuy]))) {
                                updatesMap[key].buyingPrice = Math.max(0, Number(row[colBuy]));
                            }
                            if (colMrp >= 0 && row[colMrp] !== "" && !isNaN(Number(row[colMrp]))) {
                                updatesMap[key].mrp = Math.max(0, Number(row[colMrp]));
                            }
                            if (colQty >= 0 && row[colQty] !== "" && !isNaN(Number(row[colQty]))) {
                                updatesMap[key].value = Math.max(0, Math.round(Number(row[colQty])));
                            }

                            // Derive value for fallback matching
                            if (updatesMap[key].value === undefined) {
                                updatesMap[key].value = updatesMap[key].sellingPrice ?? updatesMap[key].buyingPrice ?? updatesMap[key].mrp ?? 0;
                            }
                        }

                    } else {
                        // ── LEGACY SPH×CYL GRID FORMAT (backward-compatible) ──
                        const lowerSheet = sheetName.toLowerCase();
                        const isSellSheet = /sell/i.test(lowerSheet);
                        const isBuySheet = /buy/i.test(lowerSheet);
                        const isMrpSheet = /mrp/i.test(lowerSheet);
                        const isQtySheet = /qty|stock/i.test(lowerSheet);

                        const cylHeaders = rawData[0].slice(1).map(val => {
                            const parsed = parseFloat(String(val).replace(/\+/g, "").trim());
                            return isNaN(parsed) ? null : parsed.toFixed(2);
                        });

                        for (let r = 1; r < rawData.length; r++) {
                            const row = rawData[r];
                            if (!row || row.length === 0) continue;

                            const rawSph = row[0];
                            if (rawSph === "" || rawSph === undefined || rawSph === null) continue;
                            const parsedSph = parseFloat(String(rawSph).replace(/\+/g, "").trim());
                            if (isNaN(parsedSph)) continue;

                            const sph = parsedSph.toFixed(2);
                            totalValidRows++;

                            for (let c = 0; c < cylHeaders.length; c++) {
                                const cyl = cylHeaders[c];
                                if (cyl === null) continue;
                                const rawVal = row[c + 1];
                                if (rawVal === "" || rawVal === undefined || rawVal === null) continue;

                                const key = `${sph}_${cyl}`;
                                if (!updatesMap[key]) updatesMap[key] = { sph, cyl };

                                const numVal = parseFloat(String(rawVal).trim());
                                if (!isNaN(numVal)) {
                                    if (isSellSheet) updatesMap[key].sellingPrice = numVal;
                                    else if (isBuySheet) updatesMap[key].buyingPrice = numVal;
                                    else if (isMrpSheet) updatesMap[key].mrp = numVal;
                                    else if (isQtySheet) updatesMap[key].value = numVal;
                                    else updatesMap[key].value = numVal;
                                }
                            }
                        }
                    }
                });

                // Ensure .value is always set for backward compatibility with backend
                Object.values(updatesMap).forEach(item => {
                    if (item.value === undefined) {
                        item.value = item.sellingPrice ?? item.buyingPrice ?? item.mrp ?? 0;
                    }
                });

                const updatesList = Object.values(updatesMap);
                if (updatesList.length === 0) {
                    throw new Error("No valid product rows found in the uploaded file.");
                }

                setMatrixDimensions({
                    sheets: parsedSheets,
                    sphRows: totalValidRows,
                    cylCols: 0,
                    totalCells: updatesList.length,
                });

                setParsedUpdates(updatesList);
            } catch (err) {
                console.error("Parse Error:", err);
                setParseError(err.message || "Failed to parse uploaded file");
                setParsedUpdates([]);
                setMatrixDimensions(null);
            } finally {
                setParsing(false);
            }
        };

        reader.readAsArrayBuffer(file);
    };

    // ── 3. Apply Matrix Updates ──
    const handleApplyUpdates = async () => {
        if (!selectedProduct || !selectedProduct.productName) {
            return toast.error("Please select a lens product.");
        }
        if (parsedUpdates.length === 0) {
            return toast.error("No valid matrix updates to apply. Please upload a filled Excel file.");
        }

        setSubmitting(true);
        try {
            const res = await api.post("/api/digi/product/lens/matrix-update", {
                productName: selectedProduct.productName,
                action,
                priceType,
                updates: parsedUpdates,
                fileName: uploadedFile?.name || "",
            });

            if (res.data?.success) {
                toast.success(res.data.message || `Updated ${res.data.updatedCount} products successfully!`);
                // Reload matrix data to show updated values
                const refreshRes = await api.get(`/api/digi/product/lens/matrix-data?productName=${encodeURIComponent(selectedProduct.productName)}`);
                if (refreshRes.data?.success) setMatrixData(refreshRes.data);

                // Notify inventory page to reload products
                if (onRefreshInventory) onRefreshInventory();

                // Refresh history timeline immediately
                fetchHistory();

                setUploadedFile(null);
                setParsedUpdates([]);
                setMatrixDimensions(null);
            } else {
                toast.error(res.data?.message || "Update failed");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update lens matrix");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredHistory = historyList.filter(item =>
        !historySearch.trim() ||
        item.productName?.toLowerCase().includes(historySearch.trim().toLowerCase()) ||
        item.brand?.toLowerCase().includes(historySearch.trim().toLowerCase()) ||
        item.category?.toLowerCase().includes(historySearch.trim().toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-6 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[92vh] overflow-hidden border border-gray-100">

                {/* ── Modal Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#2980b9] flex items-center justify-center font-bold">
                            <FiGrid size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                Bulk Lens Excel Matrix Manager & History
                            </h2>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                                Export SPH × CYL grid to Excel, update prices or stock in bulk, and review generation timeline
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                    >
                        <FiX size={16} />
                    </button>
                </div>

                {/* ── Tabs Navigation ── */}
                <div className="flex items-center gap-2 px-6 pt-3 border-b border-gray-100 bg-gray-50/50">
                    <button
                        onClick={() => setActiveTab("matrix")}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
                            activeTab === "matrix"
                                ? "border-[#2980b9] text-[#2980b9] bg-white shadow-sm"
                                : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-white/60"
                        }`}
                    >
                        <FiGrid size={13} />
                        Matrix Excel Update & Export
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
                            activeTab === "history"
                                ? "border-[#2980b9] text-[#2980b9] bg-white shadow-sm"
                                : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-white/60"
                        }`}
                    >
                        <FiClock size={13} />
                        Lens Generation & Update History
                    </button>
                </div>

                {/* ── Modal Body ── */}
                <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">

                    {/* ════════════════════ TAB 1: MATRIX EXCEL ════════════════════ */}
                    {activeTab === "matrix" && (
                        <div className="space-y-6">

                            {/* ── STEP 1: Search & Select Lens Product ── */}
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-[#2980b9] text-white flex items-center justify-center text-[10px] font-bold">1</div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                            Select Lens Product
                                        </h3>
                                    </div>
                                    {selectedProduct && (
                                        <button
                                            onClick={() => {
                                                setSelectedProduct(null);
                                                setSearchTerm("");
                                                setMatrixData(null);
                                            }}
                                            className="text-[11px] text-red-500 hover:underline"
                                        >
                                            Change Product
                                        </button>
                                    )}
                                </div>

                                <div className="relative">
                                    <div className="relative">
                                        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                                            placeholder="Type 2-3 characters of lens product name (e.g. CR39, Single Vision)..."
                                            className="w-full pl-10 pr-10 py-2.5 text-xs border border-gray-200 rounded-xl outline-none focus:border-[#2980b9] focus:ring-2 focus:ring-blue-50 bg-gray-50/50 text-gray-800 transition font-medium"
                                        />
                                        {searching && (
                                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                                <div className="w-4 h-4 border-2 border-[#2980b9] border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Suggestions Dropdown */}
                                    {showSuggestions && suggestions.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto z-50 divide-y divide-gray-50">
                                            {suggestions.map((p) => (
                                                <div
                                                    key={p._id}
                                                    onClick={() => handleSelectProduct(p)}
                                                    className="p-3 hover:bg-blue-50/60 cursor-pointer transition flex items-center justify-between"
                                                >
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-800">{p.productName}</p>
                                                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                                                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-semibold">{p.category}</span>
                                                            {p.brand && <span>Brand: {p.brand}</span>}
                                                            <span>•</span>
                                                            <span className="text-[#2980b9] font-medium">{p.totalVariants} combinations</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[11px] font-bold text-gray-700">Stock: {p.totalQty}</span>
                                                        <p className="text-[10px] text-gray-400">₹{p.minSellingPrice || p.minPrice} - ₹{p.maxSellingPrice || p.maxPrice}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Selected Product Summary Card */}
                                {selectedProduct && matrixData && (
                                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-bold text-blue-900">{matrixData.productName}</p>
                                            <p className="text-[11px] text-blue-700 mt-0.5">
                                                {matrixData.totalCount} Power Combinations in Database • Category: {matrixData.category} • Brand: {matrixData.brand || "—"}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs">
                                            <div className="bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-2xs">
                                                <span className="text-[10px] text-gray-400 block font-semibold">SPH RANGE</span>
                                                <span className="font-mono font-bold text-gray-800">
                                                    {matrixData.sphValues[0]} to {matrixData.sphValues[matrixData.sphValues.length - 1]} ({matrixData.sphValues.length} steps)
                                                </span>
                                            </div>
                                            <div className="bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-2xs">
                                                <span className="text-[10px] text-gray-400 block font-semibold">CYL RANGE</span>
                                                <span className="font-mono font-bold text-gray-800">
                                                    {matrixData.cylValues[0]} to {matrixData.cylValues[matrixData.cylValues.length - 1]} ({matrixData.cylValues.length} steps)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── STEP 2: Configure Action & Download Matrix ── */}
                            {selectedProduct && matrixData && (
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-[#2980b9] text-white flex items-center justify-center text-[10px] font-bold">2</div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                            Configure Action & Download Matrix Template
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                                                Select Update Action
                                            </label>
                                            <select
                                                value={action}
                                                onChange={(e) => setAction(e.target.value)}
                                                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-[#2980b9] bg-gray-50 text-gray-700 font-semibold"
                                            >
                                                <option value="UPDATE_PRICE">Update Prices (Buying, Selling & MRP)</option>
                                                <option value="UPDATE_QTY">Update Stock Quantity</option>
                                                <option value="DELETE">Delete Combinations</option>
                                            </select>
                                        </div>

                                        <div className="flex items-end">
                                            <button
                                                onClick={handleExportExcel}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
                                            >
                                                <FiDownload size={14} />
                                                Export Matrix Excel (.xlsx)
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── STEP 3: Upload Edited Excel Matrix ── */}
                            {selectedProduct && matrixData && (
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-[#2980b9] text-white flex items-center justify-center text-[10px] font-bold">3</div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                            Upload Edited Excel Matrix & Apply Updates
                                        </h3>
                                    </div>

                                    <div
                                        onClick={() => document.getElementById("matrix-excel-input").click()}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            const file = e.dataTransfer.files?.[0];
                                            if (file) handleFileUpload(file);
                                        }}
                                        className="border-2 border-dashed border-[#2980b9]/40 hover:border-[#2980b9] rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition bg-gray-50/50 hover:bg-blue-50/40"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-[#2980b9]">
                                            <FiUpload size={20} />
                                        </div>
                                        {parsing ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-[#2980b9] border-t-transparent rounded-full animate-spin" />
                                                <span className="text-xs text-gray-500 font-semibold">Parsing matrix cells...</span>
                                            </div>
                                        ) : uploadedFile ? (
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-gray-800">{uploadedFile.name}</p>
                                                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Click or drag another file to replace</p>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-gray-700">Drop your edited matrix Excel file here or click to browse</p>
                                                <p className="text-[10px] text-gray-400 mt-1">Accepts .xlsx, .xls, .csv</p>
                                            </div>
                                        )}
                                        <input
                                            id="matrix-excel-input"
                                            type="file"
                                            accept=".xlsx,.xls,.csv"
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(e.target.files[0])}
                                        />
                                    </div>

                                    {parseError && (
                                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-xs font-medium">
                                            <FiAlertCircle size={15} className="flex-shrink-0" />
                                            <span>{parseError}</span>
                                        </div>
                                    )}

                                    {/* Parsed Summary & Confirmation */}
                                    {matrixDimensions && parsedUpdates.length > 0 && (
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <FiCheckCircle className="text-emerald-500" size={16} />
                                                    <span className="text-xs font-bold text-gray-800">
                                                        ✓ Parsed {matrixDimensions.totalCells} products from {matrixDimensions.sheets?.length || 1} sheet(s) — ready to apply
                                                        {matrixDimensions.sheets?.length > 1 && (
                                                            <span className="text-[11px] text-[#2980b9] font-semibold block sm:inline sm:ml-2">
                                                                (Sheets: {matrixDimensions.sheets.join(", ")})
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700">
                                                    Action: {action === "UPDATE_QTY" ? "Set Stock Quantity" : action === "UPDATE_PRICE" ? (matrixDimensions.sheets?.length > 1 ? "Multi-Sheet Pricing" : `Update ${priceType}`) : "Delete"}
                                                </span>
                                            </div>

                                            <div className="flex justify-end pt-2">
                                                <button
                                                    onClick={handleApplyUpdates}
                                                    disabled={submitting}
                                                    className="flex items-center gap-2 px-6 py-2.5 bg-[#2980b9] hover:bg-[#2980b9]/90 text-white text-xs font-bold rounded-xl transition shadow-sm disabled:opacity-50"
                                                >
                                                    {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                                    {submitting ? "Updating Products..." : `Apply Updates to ${parsedUpdates.length} Combinations`}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    )}

                    {/* ════════════════════ TAB 2: HISTORY ════════════════════ */}
                    {activeTab === "history" && (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                        Lens Generation & Inventory Update Timeline
                                    </h3>
                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                        Tracks when lens combinations were created, initial and current pricing, and update timestamps
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:w-64">
                                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                                        <input
                                            type="text"
                                            value={historySearch}
                                            onChange={(e) => setHistorySearch(e.target.value)}
                                            placeholder="Filter by product name, brand..."
                                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl outline-none focus:border-[#2980b9] bg-white text-gray-700"
                                        />
                                    </div>
                                    <button
                                        onClick={fetchHistory}
                                        disabled={historyLoading}
                                        className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 transition"
                                        title="Refresh history"
                                    >
                                        <FiRefreshCw size={14} className={historyLoading ? "animate-spin" : ""} />
                                    </button>
                                </div>
                            </div>

                            {historyLoading ? (
                                <div className="py-16 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-[#2980b9] border-t-transparent rounded-full animate-spin" />
                                    <span>Loading lens timeline...</span>
                                </div>
                            ) : filteredHistory.length === 0 ? (
                                <div className="py-16 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl">
                                    No lens products found in history.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-2xs">
                                    <table className="w-full text-xs text-left">
                                        <thead>
                                            <tr className="bg-gray-100/80 text-gray-600 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200">
                                                <th className="px-4 py-3">Product Name</th>
                                                <th className="px-3 py-3 text-center">Event / Action</th>
                                                <th className="px-3 py-3 text-center">Combinations</th>
                                                <th className="px-3 py-3 text-center">Total Stock</th>
                                                <th className="px-3 py-3">Power Ranges</th>
                                                <th className="px-3 py-3 text-right">Buying Price</th>
                                                <th className="px-3 py-3 text-right">Selling Price</th>
                                                <th className="px-3 py-3 text-right">MRP</th>
                                                <th className="px-4 py-3">Date & Time</th>
                                                <th className="px-4 py-3 text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {filteredHistory.map((item) => (
                                                <tr key={item._id} className="hover:bg-blue-50/40 transition">
                                                    <td className="px-4 py-3 font-bold text-gray-800">
                                                        {item.productName}
                                                        <div className="text-[10px] text-gray-400 font-normal mt-0.5">
                                                            {item.category} {item.brand ? `• ${item.brand}` : ""}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        {item.action === "GENERATED" ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                                GENERATED
                                                            </span>
                                                        ) : item.action === "UPDATE_PRICE" ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                                                PRICE {item.priceType ? `(${item.priceType})` : "UPDATE"}
                                                            </span>
                                                        ) : item.action === "UPDATE_QTY" ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                                                STOCK UPDATE
                                                            </span>
                                                        ) : item.action === "DELETE" ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                                                                DELETE
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                                                                {item.action || "UPDATE"}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3 text-center font-bold text-[#2980b9]">
                                                        {item.totalLenses}
                                                    </td>
                                                    <td className="px-3 py-3 text-center font-bold text-emerald-700">
                                                        {item.totalStockQty}
                                                    </td>
                                                    <td className="px-3 py-3 font-mono text-[11px] text-gray-600">
                                                        {item.sphRange ? <div>SPH: {item.sphRange}</div> : null}
                                                        {item.cylRange ? <div>CYL: {item.cylRange}</div> : null}
                                                        {!item.sphRange && !item.cylRange && "—"}
                                                    </td>
                                                    <td className="px-3 py-3 text-right font-medium text-gray-700">
                                                        ₹{item.buyingPrice ?? 0}
                                                    </td>
                                                    <td className="px-3 py-3 text-right font-semibold text-blue-700">
                                                        ₹{item.sellingPrice ?? 0}
                                                    </td>
                                                    <td className="px-3 py-3 text-right font-medium text-gray-600">
                                                        ₹{item.mrp ?? 0}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-[11px]">
                                                        {item.timestamp ? new Date(item.timestamp).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—"}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => {
                                                                setActiveTab("matrix");
                                                                handleSelectProduct(item);
                                                            }}
                                                            className="px-2.5 py-1 text-[11px] font-bold text-[#2980b9] bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                                                        >
                                                            Manage Matrix
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* ── Modal Footer ── */}
                <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100 bg-gray-50 rounded-b-3xl">
                    <span className="text-[11px] text-gray-400">
                        Zero extra models • Real-time bulk inventory updates • Optical SPH × CYL standard matrix
                    </span>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition shadow-2xs"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
}
