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
    FiLayers,
    FiPackage,
    FiInfo,
    FiList,
    FiEye,
} from "react-icons/fi";
import { toast } from "react-toastify";
import api from "../../services/apiInstance";

export default function LensSphAddMatrixModal({ isOpen, onClose, onRefreshInventory }) {
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

    // ── Action & Format State ──
    const [action, setAction] = useState("UPDATE_QTY"); // "UPDATE_QTY" | "UPDATE_PRICE" | "UPDATE_SELLING_PRICE" | "UPDATE_BUYING_PRICE" | "UPDATE_MRP"
    const [matrixFormat, setMatrixFormat] = useState("AUTO"); // "AUTO" | "SPH_CYL" | "SPH_ADD"

    // ── Live UI Matrix & Table Preview State ──
    const [previewViewMode, setPreviewViewMode] = useState("grid"); // "grid" | "table"
    const [previewSearch, setPreviewSearch] = useState("");
    const [previewMetric, setPreviewMetric] = useState("qty"); // "qty" | "sellingPrice" | "buyingPrice" | "mrp"

    // ── Excel Upload & Parsing State ──
    const [uploadedFile, setUploadedFile] = useState(null);
    const [parsing, setParsing] = useState(false);
    const [parsedUpdates, setParsedUpdates] = useState([]);
    const [matrixStats, setMatrixStats] = useState(null);
    const [parseError, setParseError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // ── History State ──
    const [historyList, setHistoryList] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historySearch, setHistorySearch] = useState("");

    // Reset to "matrix" tab whenever modal opens
    useEffect(() => {
        if (isOpen) {
            setActiveTab("matrix");
        }
    }, [isOpen]);

    // ── Search Lens Products (Debounced) ──
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
        setMatrixStats(null);
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
            console.error("Failed to load matrix data:", err);
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

    // Helper: Normalize power numbers (e.g. "+0.25" -> 0.25)
    const numPower = (v) => {
        if (v === null || v === undefined || v === "") return null;
        const n = parseFloat(String(v).replace(/\+/g, "").trim());
        return isNaN(n) ? null : n;
    };

    // Determine whether selected product is Progressive (SPH x ADD) or Single Vision (SPH x CYL)
    const hasValidAddition = (matrixData?.products?.some(p => {
        const a = numPower(p.addition);
        return a !== null && a > 0;
    })) || (matrixData?.additionValues && matrixData.additionValues.some(a => parseFloat(a) > 0));

    const effectiveFormat = matrixFormat === "AUTO"
        ? (hasValidAddition ? "SPH_ADD" : "SPH_CYL")
        : matrixFormat;

    // Helper to get value for a cell based on selected action
    const getVal = (prod) => {
        if (!prod) return "";
        if (action === "UPDATE_QTY") return prod.qty !== undefined ? prod.qty : "";
        if (action === "UPDATE_SELLING_PRICE") return prod.sellingPrice ?? prod.price ?? "";
        if (action === "UPDATE_BUYING_PRICE") return prod.buyingPrice ?? prod.price ?? "";
        if (action === "UPDATE_MRP") return prod.mrp ?? "";
        return prod.sellingPrice ?? prod.price ?? "";
    };

    // ════════════════════════════════════════════════════════════════════════
    // 1A. Export Single Vision SPH × CYL Matrix Grid (Siddhartha's Standard)
    // ════════════════════════════════════════════════════════════════════════
    const exportSphCylMatrix = () => {
        const prodName = selectedProduct?.productName || (searchTerm.trim().length > 1 ? searchTerm.trim() : "Single_Vision_Lens_Matrix");
        const allProducts = matrixData?.products || [];

        // Build lookup map by SPH and CYL
        const lookup = new Map();
        const detectedSphs = new Set();
        const detectedCyls = new Set();

        allProducts.forEach(p => {
            let s = numPower(p.sph);
            let c = numPower(p.cyl);
            const a = numPower(p.addition);

            // Handle Plano / zero power / non-powered products (e.g. Oakley, Gucci, OK)
            if (s === null && c === null && (a === null || a === 0)) {
                s = 0;
                c = 0;
            } else {
                if (s !== null && c === null) c = 0;
                if (s === null && c !== null) s = 0;
            }

            if (s !== null) detectedSphs.add(s);
            if (c !== null) detectedCyls.add(c);

            if (s !== null && c !== null) {
                const key = `${s.toFixed(2)}_${c.toFixed(2)}`;
                lookup.set(key, p);
            }
        });

        if (detectedSphs.size === 0) detectedSphs.add(0);
        if (detectedCyls.size === 0) detectedCyls.add(0);

        // Determine SPH range: min to max (or default 0.00 to 3.00)
        let minSph = 0.00;
        let maxSph = 3.00;
        detectedSphs.forEach(s => {
            if (s < minSph) minSph = s;
            if (s > maxSph) maxSph = s;
        });

        const sphStep = 0.25;
        const sphList = [];
        for (let s = minSph; s <= maxSph + 0.001; s += sphStep) {
            sphList.push(Number(s.toFixed(2)));
        }

        // Determine CYL list: if specific cylinder values exist (e.g. Macaulay Moon 10.00-15.00), use them;
        // otherwise use standard optical increments 0.00 to -2.00
        const defaultCyls = [0.00, -0.25, -0.50, -0.75, -1.00, -1.25, -1.50, -1.75, -2.00];
        let cylList;
        if (detectedCyls.size > 0 && !(detectedCyls.size === 1 && detectedCyls.has(0))) {
            cylList = Array.from(detectedCyls).sort((a, b) => a - b);
        } else {
            cylList = defaultCyls;
        }

        const numCylCols = cylList.length;
        const sphCol = 1;      // Col B
        const cylStartCol = 2; // Col C
        const cylEndCol = cylStartCol + numCylCols - 1;
        const totalCols = cylEndCol + 2;

        const rows = [];
        const actionLabel = action === "UPDATE_QTY" ? "Pairs / Stock Qty" : "Price Matrix";

        // Row 1: Title
        const titleRow = new Array(totalCols).fill("");
        titleRow[sphCol] = `Sales Order - ${prodName} (Single Vision SPH × CYL)`;
        rows.push(titleRow);

        // Row 2: Empty Spacer
        rows.push(new Array(totalCols).fill(""));

        // Row 3: Product Banner & Unit Tag
        const bannerRow = new Array(totalCols).fill("");
        bannerRow[sphCol] = prodName;
        bannerRow[cylEndCol] = actionLabel;
        rows.push(bannerRow);

        // Row 4: Main Group Headers
        const groupHeaderRow = new Array(totalCols).fill("");
        groupHeaderRow[sphCol] = "SPH";
        groupHeaderRow[cylStartCol] = "CYL";
        rows.push(groupHeaderRow);

        // Row 5: Column Sub-headers
        const subHeaderRow = new Array(totalCols).fill("");
        subHeaderRow[sphCol] = "Power";
        cylList.forEach((cVal, idx) => {
            subHeaderRow[cylStartCol + idx] = cVal.toFixed(2);
        });
        rows.push(subHeaderRow);

        // Rows 6+: Data rows
        sphList.forEach(sVal => {
            const rowData = new Array(totalCols).fill("");
            rowData[sphCol] = sVal.toFixed(2);

            cylList.forEach((cVal, cIdx) => {
                const key = `${sVal.toFixed(2)}_${cVal.toFixed(2)}`;
                const prod = lookup.get(key);
                rowData[cylStartCol + cIdx] = getVal(prod);
            });

            rows.push(rowData);
        });

        rows.push(new Array(totalCols).fill(""));
        rows.push(new Array(totalCols).fill(""));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows);

        ws["!merges"] = [
            { s: { r: 2, c: sphCol }, e: { r: 2, c: cylEndCol - 1 } },
            { s: { r: 3, c: cylStartCol }, e: { r: 3, c: cylEndCol } },
        ];

        const colWidths = [{ wch: 4 }, { wch: 10 }];
        for (let i = 0; i < numCylCols; i++) colWidths.push({ wch: 9 });
        ws["!cols"] = colWidths;

        const sheetTitle = (prodName || "SPH_CYL_Matrix").substring(0, 31).replace(/[:\\\/\?\*\[\]]/g, "_");
        XLSX.utils.book_append_sheet(wb, ws, sheetTitle);

        const safeFilename = `${prodName.replace(/[^a-zA-Z0-9_\-]/g, "_")}_SingleVision_SPH_CYL_Matrix.xlsx`;
        XLSX.writeFile(wb, safeFilename);

        toast.success(`Exported Single Vision SPH × CYL matrix for "${prodName}". Fill quantities/rates and upload to apply.`);
    };

    // Helper to clean axis string
    const cleanAxisStr = (ax) => {
        if (ax === null || ax === undefined || ax === "") return "";
        return String(ax).replace(/[°\s]/g, "").trim();
    };

    // Helper to format Distance Power in the first column: SPH / CYL x AXIS
    const formatDistRxCell = (sVal, cVal, axVal) => {
        let sStr = "";
        if (sVal === 0) {
            sStr = "0";
        } else if (sVal > 0) {
            sStr = `+${sVal.toFixed(2)}`;
        } else {
            sStr = sVal.toFixed(2);
        }

        let cStr = "";
        if (cVal !== null && cVal !== undefined && cVal !== 0) {
            cStr = cVal > 0 ? `+${cVal.toFixed(2)}` : cVal.toFixed(2);
        }

        const axClean = cleanAxisStr(axVal);

        if (cStr && axClean) {
            return `${sStr}/${cStr}x${axClean}`;
        } else if (cStr) {
            return `${sStr}/${cStr}`;
        } else if (axClean) {
            return `${sStr}x${axClean}`;
        }
        return sStr;
    };

    // ════════════════════════════════════════════════════════════════════════
    // 1B. Export Progressive SPH × ADD Matrix Grid (Siddhartha's Standard)
    // ════════════════════════════════════════════════════════════════════════
    const exportSphAddMatrix = () => {
        const prodName = selectedProduct?.productName || (searchTerm.trim().length > 1 ? searchTerm.trim() : "Progressive_Lens_Matrix");
        const allProducts = matrixData?.products || [];

        // Build lookup map by SPH, CYL, AXIS and Addition
        const lookup = new Map();
        const detectedAdds = new Set();
        const comboKeySet = new Set();
        const combosList = [];

        allProducts.forEach(p => {
            let s = numPower(p.sph) ?? 0;
            let c = numPower(p.cyl) ?? 0;
            const ax = cleanAxisStr(p.axis);
            const a = numPower(p.addition);

            if (a !== null && a > 0) {
                detectedAdds.add(a);
                const sStr = s.toFixed(2);
                const cStr = c.toFixed(2);
                const aStr = a.toFixed(2);

                // Multi-tier lookup keys
                lookup.set(`${sStr}_${cStr}_${ax}_${aStr}`, p);
                if (!lookup.has(`${sStr}_${cStr}_${aStr}`)) {
                    lookup.set(`${sStr}_${cStr}_${aStr}`, p);
                }
                if (!lookup.has(`${sStr}_${aStr}`)) {
                    lookup.set(`${sStr}_${aStr}`, p);
                }
            }

            const comboKey = `${s.toFixed(2)}_${c.toFixed(2)}_${ax}`;
            if (!comboKeySet.has(comboKey)) {
                comboKeySet.add(comboKey);
                combosList.push({ s, c, ax });
            }
        });

        // If no combinations exist yet in DB, generate standard optical combinations
        if (combosList.length === 0) {
            const defaultSphs = [0.00, 0.25, 0.50, 0.75, 1.00, 1.25, 1.50, 1.75, 2.00, -0.25, -0.50, -0.75, -1.00, -1.25, -1.50, -1.75, -2.00];
            const defaultCyls = [-0.25, -0.50, -0.75, -1.00];
            const defaultAxis = "90";
            defaultSphs.forEach(s => {
                defaultCyls.forEach(c => {
                    combosList.push({ s, c, ax: defaultAxis });
                });
            });
        }

        // Optical sorting:
        // 1. Plano (0) first
        // 2. Positive SPH ascending (+0.25, +0.50, +0.75, +1.00...)
        // 3. Negative SPH descending (-0.25, -0.50, -0.75, -1.00...)
        // 4. Within same SPH, sort CYL (-0.25 before -0.50 before -0.75 before -1.00)
        // 5. Within same CYL, sort Axis ascending
        combosList.sort((a, b) => {
            const groupA = a.s === 0 ? 0 : (a.s > 0 ? 1 : 2);
            const groupB = b.s === 0 ? 0 : (b.s > 0 ? 1 : 2);
            if (groupA !== groupB) return groupA - groupB;

            if (groupA === 1) {
                if (a.s !== b.s) return a.s - b.s;
            } else if (groupA === 2) {
                if (a.s !== b.s) return b.s - a.s;
            }

            if (a.c !== b.c) return b.c - a.c;

            const numAxA = parseInt(a.ax, 10) || 0;
            const numAxB = parseInt(b.ax, 10) || 0;
            return numAxA - numAxB;
        });

        // Determine Additions: default 1.00 to 3.00 with step 0.25
        const defaultAdds = [1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00];
        const addList = detectedAdds.size > 0
            ? Array.from(new Set([...defaultAdds, ...Array.from(detectedAdds)])).sort((a, b) => a - b)
            : defaultAdds;

        const numAddCols = addList.length;
        const rxCol = 1;      // Col B
        const addStartCol = 2; // Col C
        const addEndCol = addStartCol + numAddCols - 1;
        const totalCols = addEndCol + 2;

        const rows = [];

        // Row 1: Blank Spacer
        rows.push(new Array(totalCols).fill(""));

        // Row 2: Product Name Banner (Merged across Col B to last ADD Col)
        const bannerRow = new Array(totalCols).fill("");
        bannerRow[rxCol] = prodName;
        rows.push(bannerRow);

        // Row 3: Rx and ADD (+) Header
        const addHeaderRow = new Array(totalCols).fill("");
        addHeaderRow[rxCol] = "Rx";
        addHeaderRow[addStartCol] = "ADD (+)";
        rows.push(addHeaderRow);

        // Row 4: sph/cyl*axis and Addition Values
        const subHeaderRow = new Array(totalCols).fill("");
        subHeaderRow[rxCol] = "sph/cyl*axis";
        addList.forEach((addVal, idx) => {
            subHeaderRow[addStartCol + idx] = addVal.toFixed(2);
        });
        rows.push(subHeaderRow);

        // Row 5+: Data rows (First column: SPH / CYL x AXIS, columns: ADD values)
        combosList.forEach((combo) => {
            const rowData = new Array(totalCols).fill("");
            rowData[rxCol] = formatDistRxCell(combo.s, combo.c, combo.ax);

            addList.forEach((addVal, aIdx) => {
                const sStr = combo.s.toFixed(2);
                const cStr = combo.c.toFixed(2);
                const ax = combo.ax;
                const aStr = addVal.toFixed(2);

                const prod = lookup.get(`${sStr}_${cStr}_${ax}_${aStr}`) ||
                             lookup.get(`${sStr}_${cStr}_${aStr}`) ||
                             lookup.get(`${sStr}_${aStr}`);

                rowData[addStartCol + aIdx] = getVal(prod);
            });

            rows.push(rowData);
        });

        // Add 2 summary/blank rows at the bottom
        rows.push(new Array(totalCols).fill(""));
        rows.push(new Array(totalCols).fill(""));

        // Create Workbook and Sheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows);

        // Merges:
        // Row 2 (index 1): Banner across Col B to end
        // Row 3 (index 2): ADD (+) header across Col C to end
        ws["!merges"] = [
            { s: { r: 1, c: rxCol }, e: { r: 1, c: addEndCol } },
            { s: { r: 2, c: addStartCol }, e: { r: 2, c: addEndCol } },
        ];

        // Column Widths: Col A: 4, Col B (Rx): 18, ADD cols: 10 each
        const colWidths = [{ wch: 4 }, { wch: 18 }];
        for (let i = 0; i < numAddCols; i++) colWidths.push({ wch: 10 });
        ws["!cols"] = colWidths;

        const sheetTitle = (prodName || "Progressive_Matrix").substring(0, 31).replace(/[:\\\/\?\*\[\]]/g, "_");
        XLSX.utils.book_append_sheet(wb, ws, sheetTitle);

        const safeFilename = `${prodName.replace(/[^a-zA-Z0-9_\-]/g, "_")}_Progressive_ADD_Matrix.xlsx`;
        XLSX.writeFile(wb, safeFilename);

        toast.success(`Exported Progressive (SPH/CYL×AXIS) × ADD matrix for "${prodName}". Fill quantities/rates and upload to apply.`);
    };

    // Main Export Dispatcher
    const handleExportExcel = () => {
        if (effectiveFormat === "SPH_CYL") {
            exportSphCylMatrix();
        } else {
            exportSphAddMatrix();
        }
    };

    // ════════════════════════════════════════════════════════════════════════
    // 2. Parse Uploaded Excel File (Auto-Detects SPH×CYL or SPH×ADD Grid)
    // ════════════════════════════════════════════════════════════════════════
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

                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rawData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" });

                if (!rawData || rawData.length < 3) {
                    throw new Error("The uploaded sheet has insufficient data rows.");
                }

                // Auto-Detect Product Name from Row 3 or Row 1
                let detectedProductName = "";
                for (let r = 0; r < Math.min(5, rawData.length); r++) {
                    const row = rawData[r];
                    for (let c = 0; c < row.length; c++) {
                        const cell = String(row[c]).trim();
                        if (cell && !["sales order", "sph", "cyl", "add", "(+)", "(-)", "pairs", "price matrix", "power"].includes(cell.toLowerCase())) {
                            if (cell.toLowerCase().startsWith("sales order -")) {
                                detectedProductName = cell.substring("sales order -".length).replace(/\(.*?\)/g, "").trim();
                                break;
                            } else if (r === 2 && cell.length > 2) {
                                detectedProductName = cell;
                                break;
                            }
                        }
                    }
                    if (detectedProductName) break;
                }

                if (detectedProductName) {
                    setSearchTerm(detectedProductName);
                    if (!selectedProduct || selectedProduct.productName?.toUpperCase() !== detectedProductName.toUpperCase()) {
                        setSelectedProduct({ productName: detectedProductName });
                        api.get(`/api/digi/product/lens/matrix-data?productName=${encodeURIComponent(detectedProductName)}`)
                            .then(res => {
                                if (res.data?.success) setMatrixData(res.data);
                            })
                            .catch(err => console.error("Auto matrix data fetch error:", err));
                    }
                }

                // ── Auto-Detect Matrix Type (SPH × CYL vs SPH × ADD) ──
                let isSphAdd = false;
                let isSphCyl = false;
                let headerRowIdx = -1;

                for (let r = 0; r < Math.min(10, rawData.length); r++) {
                    const row = rawData[r].map(c => String(c).trim().toLowerCase());
                    if (row.some(c => c === "(+)" || c === "+" || c.includes("add (+)")) &&
                        row.some(c => c === "(-)" || c === "-" || c.includes("add (-)"))) {
                        isSphAdd = true;
                        headerRowIdx = r;
                        break;
                    }
                    if (row.some(c => c === "cyl" || c.startsWith("cyl"))) {
                        isSphCyl = true;
                        headerRowIdx = r;
                        break;
                    }
                }

                if (!isSphAdd && !isSphCyl) {
                    for (let r = 0; r < Math.min(10, rawData.length); r++) {
                        const row = rawData[r].map(c => String(c).trim().toLowerCase());
                        if (row.some(c => c.includes("add"))) {
                            isSphAdd = true;
                            headerRowIdx = r;
                            break;
                        }
                    }
                }

                const updates = [];

                // ── PARSE SPH × CYL MATRIX (Single Vision) ──
                if (isSphCyl) {
                    let subHeaderIdx = headerRowIdx + 1;
                    const groupHeaderRow = rawData[headerRowIdx] || [];
                    const subHeaderRow = rawData[subHeaderIdx] || [];

                    // Dynamically find SPH column index (handles Column A present or stripped by Google Sheets)
                    let sphCol = -1;
                    // 1. Check subHeaderRow for "power" or "sph"
                    for (let c = 0; c < subHeaderRow.length; c++) {
                        const cell = String(subHeaderRow[c] || "").trim().toLowerCase();
                        if (cell === "power" || cell === "sph") {
                            sphCol = c;
                            break;
                        }
                    }
                    // 2. Check groupHeaderRow for "sph"
                    if (sphCol === -1) {
                        for (let c = 0; c < groupHeaderRow.length; c++) {
                            const cell = String(groupHeaderRow[c] || "").trim().toLowerCase();
                            if (cell === "sph" || cell.startsWith("sph")) {
                                sphCol = c;
                                break;
                            }
                        }
                    }
                    // 3. Fallback: inspect first 5 columns to find one where data rows have numeric SPH powers
                    if (sphCol === -1) {
                        for (let c = 0; c < Math.min(5, subHeaderRow.length); c++) {
                            let matchCount = 0;
                            for (let r = subHeaderIdx + 1; r < Math.min(subHeaderIdx + 8, rawData.length); r++) {
                                const val = parseFloat(String(rawData[r]?.[c] || "").replace(/\+/g, "").trim());
                                if (!isNaN(val)) matchCount++;
                            }
                            if (matchCount >= 2) {
                                sphCol = c;
                                break;
                            }
                        }
                    }
                    if (sphCol === -1) sphCol = 0;

                    // Collect all CYL columns to the right of sphCol
                    const cylCols = [];
                    for (let c = sphCol + 1; c < subHeaderRow.length; c++) {
                        const raw = String(subHeaderRow[c] || "").replace(/\+/g, "").trim();
                        const val = parseFloat(raw);
                        if (!isNaN(val) && raw !== "") {
                            cylCols.push({ colIdx: c, cylVal: val.toFixed(2) });
                        }
                    }

                    if (cylCols.length === 0) {
                        throw new Error("Could not detect CYL power columns in the header.");
                    }

                    for (let r = subHeaderIdx + 1; r < rawData.length; r++) {
                        const row = rawData[r];
                        if (!row || row.every(c => c === "" || c === undefined)) continue;

                        const rawSph = String(row[sphCol] || "").replace(/\+/g, "").trim();
                        const sphVal = parseFloat(rawSph);
                        if (isNaN(sphVal) || rawSph === "") continue;
                        const sphStr = sphVal.toFixed(2);

                        cylCols.forEach(({ colIdx, cylVal }) => {
                            const cellRaw = row[colIdx];
                            if (cellRaw !== "" && cellRaw !== undefined && cellRaw !== "-") {
                                const valNum = parseFloat(String(cellRaw).trim());
                                if (!isNaN(valNum)) {
                                    const updateObj = {
                                        sph: sphStr,
                                        cyl: cylVal,
                                        value: valNum,
                                    };
                                    if (action === "UPDATE_QTY") {
                                        updateObj.qty = valNum;
                                    } else if (action === "UPDATE_SELLING_PRICE") {
                                        updateObj.sellingPrice = valNum;
                                    } else if (action === "UPDATE_BUYING_PRICE") {
                                        updateObj.buyingPrice = valNum;
                                    } else if (action === "UPDATE_MRP") {
                                        updateObj.mrp = valNum;
                                    } else {
                                        updateObj.sellingPrice = valNum;
                                        updateObj.buyingPrice = valNum;
                                        updateObj.mrp = valNum;
                                    }
                                    updates.push(updateObj);
                                }
                            }
                        });
                    }

                    if (updates.length === 0) {
                        throw new Error("No numeric values found in the SPH × CYL matrix cells.");
                    }

                    setParsedUpdates(updates);
                    setMatrixStats({
                        totalCells: updates.length,
                        format: "SPH_CYL",
                        formatLabel: "Single Vision (SPH × CYL)",
                        productName: detectedProductName || selectedProduct?.productName,
                    });
                    setParseError("");

                    // ── PARSE SPH × ADD MATRIX (Progressive / Bifocal: (SPH/CYL×AXIS) × ADD) ──
                    let rxCol = -1;
                    let subHeaderRowIdx = -1;
                    let addCols = [];

                    // 1. Look for the Distance Power column ("sph/cyl*axis", "sph/cyl", "rx", "sph")
                    for (let r = 0; r < Math.min(8, rawData.length); r++) {
                        const row = rawData[r] || [];
                        for (let c = 0; c < Math.min(5, row.length); c++) {
                            const cell = String(row[c] || "").trim().toLowerCase();
                            if (cell.includes("sph/cyl") || cell === "rx" || cell.includes("sph/cyl*axis") || cell.includes("sph/cylxaxis")) {
                                rxCol = c;
                                subHeaderRowIdx = r;
                                break;
                            }
                        }
                        if (rxCol !== -1) break;
                    }

                    const parseDistPower = (str, forceNegative = false) => {
                        if (str === null || str === undefined || str === "") return null;
                        const s = String(str).trim();
                        if (!s || s === "-" || s.toLowerCase().startsWith("sph/cyl") || s.toLowerCase() === "rx") return null;

                        const match = s.match(/^([+-]?\d+(?:\.\d+)?)(?:\s*\/\s*([+-]?\d+(?:\.\d+)?))?(?:\s*[*xX]\s*(\d+))?/);
                        if (!match) return null;

                        let sphNum = parseFloat(match[1]);
                        if (isNaN(sphNum)) return null;

                        if (forceNegative && sphNum > 0) {
                            sphNum = -Math.abs(sphNum);
                        }

                        const cylNum = match[2] !== undefined ? parseFloat(match[2]) : null;
                        const axisStr = match[3] !== undefined ? match[3].trim() : "";

                        return {
                            sph: sphNum === 0 ? "0.00" : (sphNum > 0 ? `+${sphNum.toFixed(2)}` : `${sphNum.toFixed(2)}`),
                            cyl: cylNum !== null && !isNaN(cylNum) ? cylNum.toFixed(2) : "0.00",
                            axis: axisStr,
                        };
                    };

                    // 2. If rxCol not found by header text, fallback by scanning first 4 columns for valid Rx strings
                    if (rxCol === -1) {
                        for (let c = 0; c < Math.min(4, (rawData[0] || []).length); c++) {
                            let matchCount = 0;
                            for (let r = 2; r < Math.min(15, rawData.length); r++) {
                                const cell = String(rawData[r]?.[c] || "").trim();
                                if (parseDistPower(cell)) matchCount++;
                            }
                            if (matchCount >= 2) {
                                rxCol = c;
                                break;
                            }
                        }
                    }
                    if (rxCol === -1) rxCol = 1; // Default to Col B

                    // 3. Find the ADD header row containing numbers like 1.00, 1.25, 1.50...
                    const hasAddColsInRow = (row) => {
                        let count = 0;
                        for (let c = rxCol + 1; c < (row || []).length; c++) {
                            const val = numPower(row[c]);
                            if (val !== null && val >= 0.75 && val <= 5.00) count++;
                        }
                        return count >= 2;
                    };

                    let addHeaderRowIdx = subHeaderRowIdx !== -1 && hasAddColsInRow(rawData[subHeaderRowIdx]) ? subHeaderRowIdx : -1;

                    if (addHeaderRowIdx === -1) {
                        for (let r = 0; r < Math.min(8, rawData.length); r++) {
                            if (hasAddColsInRow(rawData[r])) {
                                addHeaderRowIdx = r;
                                break;
                            }
                        }
                    }

                    if (addHeaderRowIdx === -1) {
                        throw new Error("Could not detect Addition power columns (1.00, 1.25, etc.) in the header.");
                    }

                    // 4. Collect ADD columns (handles single unified table as well as older dual-table format)
                    let rightSphCol = -1;
                    let rightAddCols = [];
                    const addRow = rawData[addHeaderRowIdx] || [];

                    for (let c = rxCol + 1; c < addRow.length; c++) {
                        const rawCell = String(addRow[c] || "").trim().toLowerCase();
                        if (rawCell === "(-)" || rawCell === "sph (-)" || rawCell === "sph") {
                            rightSphCol = c;
                            break;
                        }
                        const val = numPower(addRow[c]);
                        if (val !== null && val >= 0.50 && val <= 5.00) {
                            addCols.push({ colIdx: c, addVal: val.toFixed(2) });
                        }
                    }

                    if (rightSphCol !== -1) {
                        for (let c = rightSphCol + 1; c < addRow.length; c++) {
                            const val = numPower(addRow[c]);
                            if (val !== null && val >= 0.50 && val <= 5.00) {
                                rightAddCols.push({ colIdx: c, addVal: val.toFixed(2) });
                            }
                        }
                    }

                    if (addCols.length === 0) {
                        throw new Error("Could not detect any Addition columns (1.00, 1.25, etc.) in the header.");
                    }

                    let posCount = 0;
                    let negCount = 0;

                    for (let r = addHeaderRowIdx + 1; r < rawData.length; r++) {
                        const row = rawData[r];
                        if (!row || row.every(c => c === "" || c === undefined)) continue;

                        const rawDist = row[rxCol];
                        const parsed = parseDistPower(rawDist, false);

                        if (parsed) {
                            addCols.forEach(({ colIdx, addVal }) => {
                                const cellRaw = row[colIdx];
                                if (cellRaw !== "" && cellRaw !== undefined && cellRaw !== "-") {
                                    const valNum = parseFloat(String(cellRaw).trim());
                                    if (!isNaN(valNum)) {
                                        const updateObj = {
                                            sph: parsed.sph,
                                            addition: `+${addVal}`,
                                            value: valNum,
                                            isPositive: parseFloat(parsed.sph) >= 0,
                                        };
                                        if (parsed.cyl) updateObj.cyl = parsed.cyl;
                                        if (parsed.axis) updateObj.axis = parsed.axis;

                                        if (action === "UPDATE_QTY") {
                                            updateObj.qty = valNum;
                                        } else if (action === "UPDATE_SELLING_PRICE") {
                                            updateObj.sellingPrice = valNum;
                                        } else if (action === "UPDATE_BUYING_PRICE") {
                                            updateObj.buyingPrice = valNum;
                                        } else if (action === "UPDATE_MRP") {
                                            updateObj.mrp = valNum;
                                        } else {
                                            updateObj.sellingPrice = valNum;
                                            updateObj.buyingPrice = valNum;
                                            updateObj.mrp = valNum;
                                        }
                                        updates.push(updateObj);
                                        if (parseFloat(parsed.sph) >= 0) posCount++;
                                        else negCount++;
                                    }
                                }
                            });
                        }

                        // Fallback support for older dual-table format with rightSphCol
                        if (rightSphCol >= 0) {
                            const rawNegDist = row[rightSphCol];
                            const parsedNeg = parseDistPower(rawNegDist, true);

                            if (parsedNeg) {
                                rightAddCols.forEach(({ colIdx, addVal }) => {
                                    const cellRaw = row[colIdx];
                                    if (cellRaw !== "" && cellRaw !== undefined && cellRaw !== "-") {
                                        const valNum = parseFloat(String(cellRaw).trim());
                                        if (!isNaN(valNum)) {
                                            const updateObj = {
                                                sph: parsedNeg.sph,
                                                addition: `+${addVal}`,
                                                value: valNum,
                                                isPositive: false,
                                            };
                                            if (parsedNeg.cyl) updateObj.cyl = parsedNeg.cyl;
                                            if (parsedNeg.axis) updateObj.axis = parsedNeg.axis;

                                            if (action === "UPDATE_QTY") {
                                                updateObj.qty = valNum;
                                            } else if (action === "UPDATE_SELLING_PRICE") {
                                                updateObj.sellingPrice = valNum;
                                            } else if (action === "UPDATE_BUYING_PRICE") {
                                                updateObj.buyingPrice = valNum;
                                            } else if (action === "UPDATE_MRP") {
                                                updateObj.mrp = valNum;
                                            } else {
                                                updateObj.sellingPrice = valNum;
                                                updateObj.buyingPrice = valNum;
                                                updateObj.mrp = valNum;
                                            }
                                            updates.push(updateObj);
                                            negCount++;
                                        }
                                    }
                                });
                            }
                        }
                    }

                    if (updates.length === 0) {
                        throw new Error("No numeric values found in the Progressive / Bifocal matrix cells.");
                    }

                    setParsedUpdates(updates);
                    setMatrixStats({
                        totalCells: updates.length,
                        format: "SPH_ADD",
                        formatLabel: "Progressive / Bifocal ((SPH/CYL×AXIS) × ADD)",
                        posCount,
                        negCount,
                        productName: detectedProductName || selectedProduct?.productName,
                    });
                    setParseError("");
                }
            } catch (err) {
                console.error("Excel parse error:", err);
                setParseError(err.message || "Failed to parse the matrix Excel file.");
                setParsedUpdates([]);
                setMatrixStats(null);
            } finally {
                setParsing(false);
            }
        };

        reader.readAsArrayBuffer(file);
    };

    // ── 3. Apply Matrix Updates to Database ──
    const handleApplyUpdates = async () => {
        const prodName = selectedProduct?.productName || matrixStats?.productName || searchTerm.trim();
        if (!prodName) {
            return toast.error("Please select a lens product in Step 1 or ensure product name is in Excel row 3.");
        }
        if (!parsedUpdates || parsedUpdates.length === 0) {
            return toast.error("No valid matrix updates to apply.");
        }

        setSubmitting(true);
        try {
            const payload = {
                productName: prodName,
                action: action, // "UPDATE_QTY" | "UPDATE_PRICE" | "UPDATE_SELLING_PRICE" etc.
                priceType: action === "UPDATE_SELLING_PRICE" ? "Selling Price" : action === "UPDATE_BUYING_PRICE" ? "Buying Price" : action === "UPDATE_MRP" ? "MRP" : "Buying, Selling & MRP",
                updates: parsedUpdates,
            };

            const res = await api.post("/api/digi/product/lens/matrix-update", payload);

            if (res.data?.success) {
                toast.success(res.data.message || `Successfully updated ${parsedUpdates.length} lens combinations!`);
                setUploadedFile(null);
                setParsedUpdates([]);
                setMatrixStats(null);

                // Reload matrix data & refresh inventory
                const targetProduct = selectedProduct?.productName
                    ? selectedProduct
                    : (prodName ? { productName: prodName } : null);

                if (targetProduct) {
                    await handleSelectProduct(targetProduct);
                }
                if (typeof onRefreshInventory === "function") {
                    onRefreshInventory();
                }
            } else {
                toast.error(res.data?.message || "Failed to apply matrix updates");
            }
        } catch (err) {
            console.error("Apply matrix update error:", err);
            toast.error(err.response?.data?.message || "Failed to update lens combinations");
        } finally {
            setSubmitting(false);
        }
    };

    // Filter history based on search query
    const filteredHistory = historyList.filter(h => {
        if (!historySearch.trim()) return true;
        const q = historySearch.toLowerCase();
        return (
            (h.productName || "").toLowerCase().includes(q) ||
            (h.brand || "").toLowerCase().includes(q) ||
            (h.action || "").toLowerCase().includes(q)
        );
    });

    // ── Live UI Matrix & Table Preview Calculations ──
    const previewProducts = matrixData?.products || [];
    const uiSphCylLookup = new Map();
    const uiSphAddLookup = new Map();
    const uiDetectedSphs = new Set();
    const uiDetectedCyls = new Set();
    const uiDetectedAdds = new Set();
    const uiComboKeySet = new Set();
    const uiCombosList = [];
    let totalStockPreview = 0;
    let totalValuePreview = 0;

    previewProducts.forEach(p => {
        const qtyNum = p.qty || 0;
        totalStockPreview += qtyNum;
        totalValuePreview += qtyNum * (p.sellingPrice ?? p.price ?? 0);

        let s = numPower(p.sph);
        let c = numPower(p.cyl);
        const a = numPower(p.addition);
        const ax = cleanAxisStr(p.axis);

        if (s === null && c === null && (a === null || a === 0)) {
            s = 0;
            c = 0;
        } else {
            if (s !== null && c === null) c = 0;
            if (s === null && c !== null) s = 0;
        }

        if (s !== null) uiDetectedSphs.add(s);
        if (c !== null) uiDetectedCyls.add(c);
        if (a !== null && a > 0) uiDetectedAdds.add(a);

        if (s !== null && c !== null) {
            uiSphCylLookup.set(`${s.toFixed(2)}_${c.toFixed(2)}`, p);
        }
        if (a !== null && a > 0) {
            const sVal = s ?? 0;
            const cVal = c ?? 0;
            const sStr = sVal.toFixed(2);
            const cStr = cVal.toFixed(2);
            const aStr = a.toFixed(2);

            uiSphAddLookup.set(`${sStr}_${cStr}_${ax}_${aStr}`, p);
            if (!uiSphAddLookup.has(`${sStr}_${cStr}_${aStr}`)) {
                uiSphAddLookup.set(`${sStr}_${cStr}_${aStr}`, p);
            }
            if (!uiSphAddLookup.has(`${sStr}_${aStr}`)) {
                uiSphAddLookup.set(`${sStr}_${aStr}`, p);
            }
        }

        const sVal = s ?? 0;
        const cVal = c ?? 0;
        const comboKey = `${sVal.toFixed(2)}_${cVal.toFixed(2)}_${ax}`;
        if (!uiComboKeySet.has(comboKey)) {
            uiComboKeySet.add(comboKey);
            uiCombosList.push({ s: sVal, c: cVal, ax });
        }
    });

    // Optical sort: Plano (0) first, then positive ascending, then negative descending, then cylinder, then axis
    uiCombosList.sort((a, b) => {
        const groupA = a.s === 0 ? 0 : (a.s > 0 ? 1 : 2);
        const groupB = b.s === 0 ? 0 : (b.s > 0 ? 1 : 2);
        if (groupA !== groupB) return groupA - groupB;

        if (groupA === 1) {
            if (a.s !== b.s) return a.s - b.s;
        } else if (groupA === 2) {
            if (a.s !== b.s) return b.s - a.s;
        }

        if (a.c !== b.c) return b.c - a.c;

        const numAxA = parseInt(a.ax, 10) || 0;
        const numAxB = parseInt(b.ax, 10) || 0;
        return numAxA - numAxB;
    });

    if (uiDetectedSphs.size === 0) uiDetectedSphs.add(0);
    if (uiDetectedCyls.size === 0) uiDetectedCyls.add(0);

    let uiMinSph = 0.00;
    let uiMaxSph = 3.00;
    uiDetectedSphs.forEach(s => {
        if (s < uiMinSph) uiMinSph = s;
        if (s > uiMaxSph) uiMaxSph = s;
    });

    const uiSphList = [];
    for (let s = uiMinSph; s <= uiMaxSph + 0.001; s += 0.25) {
        uiSphList.push(Number(s.toFixed(2)));
    }

    const defaultCyls = [0.00, -0.25, -0.50, -0.75, -1.00, -1.25, -1.50, -1.75, -2.00];
    const uiCylList = uiDetectedCyls.size > 0 && !(uiDetectedCyls.size === 1 && uiDetectedCyls.has(0))
        ? Array.from(uiDetectedCyls).sort((a, b) => a - b)
        : defaultCyls;

    const defaultAdds = [1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00];
    const uiAddList = uiDetectedAdds.size > 0
        ? Array.from(new Set([...defaultAdds, ...Array.from(uiDetectedAdds)])).sort((a, b) => a - b)
        : defaultAdds;

    const filteredPreviewProducts = previewProducts.filter(p => {
        if (!previewSearch.trim()) return true;
        const q = previewSearch.toLowerCase();
        return (
            (p.productCode || "").toLowerCase().includes(q) ||
            String(p.sph || "").includes(q) ||
            String(p.cyl || "").includes(q) ||
            String(p.addition || "").includes(q) ||
            String(p.qty || "").includes(q)
        );
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">

                {/* ── Modal Header ── */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#2980b9] text-white flex items-center justify-center shadow-md">
                            <FiGrid size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-extrabold text-gray-900">
                                    Bulk Lens Excel Matrix Manager &amp; History
                                </h2>
                                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#2980b9] uppercase tracking-wider border border-blue-200">
                                    Single Vision (SPH × CYL) &amp; Progressive (SPH × ADD)
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Smart grid Excel export &amp; bulk update according to lens classification standard
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* ── Tabs Navigation ── */}
                <div className="px-6 border-b border-gray-200 flex gap-4 bg-gray-50/70">
                    <button
                        onClick={() => setActiveTab("matrix")}
                        className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${activeTab === "matrix"
                                ? "border-[#2980b9] text-[#2980b9] bg-white rounded-t-xl shadow-2xs"
                                : "border-transparent text-gray-500 hover:text-gray-800"
                            }`}
                    >
                        <FiLayers size={14} className={activeTab === "matrix" ? "text-[#2980b9]" : ""} />
                        <span>Matrix Excel Update &amp; Export</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${activeTab === "history"
                                ? "border-[#2980b9] text-[#2980b9] bg-white rounded-t-xl shadow-2xs"
                                : "border-transparent text-gray-500 hover:text-gray-800"
                            }`}
                    >
                        <FiClock size={14} className={activeTab === "history" ? "text-[#2980b9]" : ""} />
                        <span>Lens Generation &amp; Update History</span>
                    </button>
                </div>

                {/* ── Modal Body (Scrollable) ── */}
                <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30 space-y-5">

                    {/* ════════════════════ TAB 1: MATRIX UPDATE & EXPORT ════════════════════ */}
                    {activeTab === "matrix" && (
                        <div className="space-y-5">

                            {/* ── STEP 1: Select Lens Product ── */}
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
                                                setMatrixData(null);
                                                setSearchTerm("");
                                                setParsedUpdates([]);
                                                setUploadedFile(null);
                                                setMatrixStats(null);
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
                                            placeholder="Type lens product name (e.g. MACAULAY MOON, Single Vision, Prog Photo BB)..."
                                            className="w-full pl-10 pr-10 py-2.5 text-xs border border-gray-200 rounded-xl outline-none focus:border-[#2980b9] focus:ring-2 focus:ring-blue-50 bg-gray-50/50 text-gray-800 transition font-medium"
                                        />
                                        {searching || matrixLoading ? (
                                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                                <div className="w-4 h-4 border-2 border-[#2980b9] border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* Suggestions Dropdown */}
                                    {showSuggestions && suggestions.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto z-50 divide-y divide-gray-50">
                                            {suggestions.map((p) => (
                                                <div
                                                    key={p._id || p.productName}
                                                    onClick={() => handleSelectProduct(p)}
                                                    className="p-3 hover:bg-blue-50/60 cursor-pointer transition flex items-center justify-between"
                                                >
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-800">{p.productName}</p>
                                                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                                                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-semibold">{p.category || "LENS"}</span>
                                                            {p.brand && <span>Brand: {p.brand}</span>}
                                                            <span>•</span>
                                                            <span className="text-[#2980b9] font-medium">{p.totalVariants || 0} combinations</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[11px] font-bold text-gray-700">Stock: {p.totalQty || 0}</span>
                                                        <p className="text-[10px] text-gray-400">₹{p.minSellingPrice || p.minPrice || 0} - ₹{p.maxSellingPrice || p.maxPrice || 0}</p>
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
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-blue-900">{matrixData.productName}</p>
                                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${effectiveFormat === "SPH_CYL"
                                                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                                                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                                    }`}>
                                                    {effectiveFormat === "SPH_CYL" ? "Single Vision (SPH × CYL Standard)" : "Progressive / Bifocal (SPH × ADD Standard)"}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-blue-700 mt-1">
                                                {matrixData.totalCount} Power Combinations in Database • Category: {matrixData.category || "LENS"} • Brand: {matrixData.brand || "—"}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs">
                                                {/* TOTAL STOCK BADGE */}
                                                <div className="bg-white px-3.5 py-1.5 rounded-xl border border-emerald-200 shadow-2xs flex flex-col items-center">
                                                    <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">TOTAL STOCK</span>
                                                    <span className="font-extrabold text-sm text-emerald-600">
                                                        {matrixData.totalStockQty != null ? matrixData.totalStockQty : (selectedProduct.totalStock ?? selectedProduct.totalQty ?? 0)} <span className="text-[10px] font-semibold text-gray-500">Units</span>
                                                    </span>
                                                </div>
                                                <div className="bg-white px-3 py-1.5 rounded-xl border border-blue-100 shadow-2xs">
                                                    <span className="text-[10px] text-gray-400 block font-semibold">SPH RANGE</span>
                                                    <span className="font-mono font-bold text-gray-800">
                                                    {matrixData.sphValues && matrixData.sphValues.length > 0 && !(matrixData.sphValues.length === 1 && matrixData.sphValues[0] === "0.00" && matrixData.totalCount === 1)
                                                            ? `${matrixData.sphValues[0]} to ${matrixData.sphValues[matrixData.sphValues.length - 1]} (${matrixData.sphValues.length} steps)`
                                                        : (matrixData.sphValues?.[0] === "0.00" || matrixData.sphValues?.length === 0 ? "Plano (0.00)" : "to (0 steps)")}
                                                    </span>
                                                </div>
                                                    <div className="bg-white px-3 py-1.5 rounded-xl border border-blue-100 shadow-2xs">
                                                        <span className="text-[10px] text-gray-400 block font-semibold">
                                                            {effectiveFormat === "SPH_CYL" ? "CYL RANGE" : "ADD RANGE"}
                                                        </span>
                                                        <span className="font-mono font-bold text-gray-800">
                                                            {effectiveFormat === "SPH_CYL"
                                                                    ? (matrixData.cylValues && matrixData.cylValues.length > 0 && !(matrixData.cylValues.length === 1 && matrixData.cylValues[0] === "0.00" && matrixData.totalCount === 1)
                                                                        ? `${matrixData.cylValues[0]} to ${matrixData.cylValues[matrixData.cylValues.length - 1]} (${matrixData.cylValues.length} steps)`
                                                                    : (matrixData.cylValues?.[0] === "0.00" || matrixData.cylValues?.length === 0 ? "Plano (0.00)" : "to (0 steps)"))
                                                                : (matrixData.additionValues && matrixData.additionValues.length > 0
                                                                    ? `+${matrixData.additionValues[0]} to +${matrixData.additionValues[matrixData.additionValues.length - 1]} (${matrixData.additionValues.length} steps)`
                                                            : "None / Single Vision")
                                                    }
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                )}
                                        </div>

                                        {/* ── STEP 2: Configure Action & Download Matrix Template & Live Table ── */}
                                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-full bg-[#2980b9] text-white flex items-center justify-center text-[10px] font-bold">2</div>
                                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                                        Configure Action, Download Matrix &amp; Live UI Preview
                                                    </h3>
                                                </div>
                                                {selectedProduct && (
                                                    <span className="text-[11px] font-semibold text-gray-400">
                                                        Target: {selectedProduct.productName}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                {/* Action Selector */}
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                                                        Select Update Action
                                                    </label>
                                                    <select
                                                        value={action}
                                                        onChange={(e) => setAction(e.target.value)}
                                                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-[#2980b9] bg-gray-50 text-gray-700 font-semibold"
                                                    >
                                                        <option value="UPDATE_QTY">Update Stock Quantity</option>
                                                        {/* <option value="UPDATE_PRICE">Update Prices (Buying, Selling &amp; MRP)</option> */}
                                                        <option value="UPDATE_SELLING_PRICE">Update Selling Price Only</option>
                                                        <option value="UPDATE_BUYING_PRICE">Update Buying Price Only</option>
                                                        <option value="UPDATE_MRP">Update MRP Only</option>
                                                    </select>
                                                </div>

                                                {/* Matrix Format Selector (Siddhartha's Standard) */}
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                                                        Matrix Grid Format
                                                    </label>
                                                    <select
                                                        value={matrixFormat}
                                                        onChange={(e) => setMatrixFormat(e.target.value)}
                                                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-[#2980b9] bg-gray-50 text-gray-700 font-semibold"
                                                    >
                                                        <option value="AUTO">
                                                            Auto-Detect ({effectiveFormat === "SPH_CYL" ? "Single Vision SPH × CYL" : "Progressive SPH × ADD"})
                                                        </option>
                                                        <option value="SPH_CYL">
                                                            Single Vision (SPH in Col A, CYL in Row 1)
                                                        </option>
                                                        <option value="SPH_ADD">
                                                            Progressive / Bifocal (SPH in Col A, ADD in Row 1)
                                                        </option>
                                                    </select>
                                                </div>

                                                {/* Download Button */}
                                                <div className="flex items-end">
                                                    <button
                                                        onClick={handleExportExcel}
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
                                                    >
                                                        <FiDownload size={14} />
                                                        Export {effectiveFormat === "SPH_CYL" ? "SPH × CYL" : "SPH × ADD"} Excel (.xlsx)
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
                                                <FiInfo size={15} className="flex-shrink-0 mt-0.5 text-[#2980b9]" />
                                                <div>
                                                    {effectiveFormat === "SPH_CYL" ? (
                                                        <span>
                                                            <strong>Single Vision Standard:</strong> SPH powers are in Column B and Cylindrical powers (CYL) in the top row. All combinations and quantities for <strong>"{selectedProduct?.productName || "Selected Product"}"</strong> will appear in the grid cells.
                                                        </span>
                                                    ) : (
                                                        <span>
                                                            <strong>Progressive / Bifocal Standard:</strong> SPH (+) &amp; SPH (-) are in Column B &amp; L, and Addition powers (ADD) in the top row. Edit quantities or prices, save, and upload in Step 3 below.
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* ── LIVE INTERACTIVE INVENTORY DATA TABLE & MATRIX PREVIEW ── */}
                                            {matrixLoading ? (
                                                <div className="p-10 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 flex flex-col items-center justify-center gap-2 text-gray-400">
                                                    <div className="w-6 h-6 border-2 border-[#2980b9] border-t-transparent rounded-full animate-spin" />
                                                    <span className="text-xs font-semibold text-gray-500">Loading live inventory matrix data...</span>
                                                </div>
                                            ) : selectedProduct && matrixData ? (
                                                <div className="mt-4 border border-gray-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                                                    {/* Table / Grid Toolbar */}
                                                    <div className="p-3.5 bg-gray-50/90 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <FiGrid className="text-[#2980b9]" size={15} />
                                                            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-800">
                                                                Live Inventory Preview
                                                            </span>
                                                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-200">
                                                                {previewProducts.length} Combinations • {totalStockPreview} Total Units
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {/* View Switcher: Grid vs Table */}
                                                            <div className="flex items-center bg-gray-200/80 p-0.5 rounded-xl text-[11px] font-bold">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPreviewViewMode("grid")}
                                                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition ${previewViewMode === "grid"
                                                                            ? "bg-white text-[#2980b9] shadow-2xs"
                                                                            : "text-gray-600 hover:text-gray-900"
                                                                        }`}
                                                                >
                                                                    <FiGrid size={12} />
                                                                    <span>Visual Grid</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPreviewViewMode("table")}
                                                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition ${previewViewMode === "table"
                                                                            ? "bg-white text-[#2980b9] shadow-2xs"
                                                                            : "text-gray-600 hover:text-gray-900"
                                                                        }`}
                                                                >
                                                                    <FiList size={12} />
                                                                    <span>Table List</span>
                                                                </button>
                                                            </div>

                                                            {/* Metric Selector */}
                                                            <div className="flex items-center gap-1 bg-gray-100 border border-gray-200 px-2 py-1 rounded-xl text-[11px]">
                                                                <span className="text-gray-400 font-semibold text-[10px] uppercase">Cell:</span>
                                                                <select
                                                                    value={previewMetric}
                                                                    onChange={(e) => setPreviewMetric(e.target.value)}
                                                                    className="bg-transparent text-gray-700 font-bold outline-none cursor-pointer text-xs"
                                                                >
                                                                    <option value="qty">Stock Quantity (Units)</option>
                                                                    <option value="sellingPrice">Selling Price (₹)</option>
                                                                    <option value="buyingPrice">Buying Price (₹)</option>
                                                                    <option value="mrp">MRP (₹)</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* View 1: Visual Matrix Grid */}
                                                    {previewViewMode === "grid" && (
                                                        <div className="overflow-x-auto max-h-[380px] p-3">
                                                            {effectiveFormat === "SPH_CYL" ? (
                                                                /* Single Vision SPH × CYL Matrix */
                                                                <table className="w-full border-collapse text-center text-xs">
                                                                    <thead>
                                                                        <tr>
                                                                            <th className="sticky left-0 z-20 bg-gray-100 text-gray-700 font-bold p-2 text-[10px] uppercase border border-gray-200">
                                                                                SPH \ CYL
                                                                            </th>
                                                                            {uiCylList.map((cVal) => (
                                                                                <th key={cVal} className="bg-gray-50 text-gray-700 font-bold px-3 py-2 text-[11px] border border-gray-200 min-w-[70px]">
                                                                                    {cVal.toFixed(2)}
                                                                                </th>
                                                                            ))}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {uiSphList.map((sVal) => (
                                                                            <tr key={sVal} className="hover:bg-blue-50/20">
                                                                                <td className="sticky left-0 z-10 bg-gray-50 font-mono font-bold text-gray-800 p-2 text-xs border border-gray-200 text-left pl-3">
                                                                                    {sVal.toFixed(2)}
                                                                                </td>
                                                                                {uiCylList.map((cVal) => {
                                                                                    const key = `${sVal.toFixed(2)}_${cVal.toFixed(2)}`;
                                                                                    const item = uiSphCylLookup.get(key);
                                                                                    return (
                                                                                        <td
                                                                                            key={cVal}
                                                                                            className={`border border-gray-200 p-1.5 transition ${item ? "bg-emerald-50/40 hover:bg-emerald-100/50" : "bg-white"
                                                                                                }`}
                                                                                            title={item ? `Code: ${item.productCode}\nSPH: ${item.sph} | CYL: ${item.cyl}\nStock: ${item.qty} units\nSelling Price: ₹${item.sellingPrice ?? item.price ?? 0}\nBuying Price: ₹${item.buyingPrice ?? item.price ?? 0}\nMRP: ₹${item.mrp ?? 0}` : "No product combination"}
                                                                                        >
                                                                                            {item ? (
                                                                                                <div className="flex flex-col items-center justify-center">
                                                                                                    {previewMetric === "qty" ? (
                                                                                                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md font-bold text-xs ${(item.qty || 0) > 0
                                                                                                                ? "bg-emerald-500 text-white shadow-2xs"
                                                                                                                : "bg-amber-100 text-amber-800"
                                                                                                            }`}>
                                                                                                            {item.qty || 0}
                                                                                                        </span>
                                                                                                    ) : (
                                                                                                        <span className="font-mono text-xs font-bold text-[#2980b9]">
                                                                                                            ₹{previewMetric === "sellingPrice" ? (item.sellingPrice ?? item.price ?? 0) : previewMetric === "buyingPrice" ? (item.buyingPrice ?? item.price ?? 0) : (item.mrp ?? 0)}
                                                                                                        </span>
                                                                                                    )}
                                                                                                    <span className="text-[9px] text-gray-400 font-mono mt-0.5">
                                                                                                        {previewMetric === "qty" ? `₹${item.sellingPrice ?? item.price ?? 0}` : `${item.qty || 0} pcs`}
                                                                                                    </span>
                                                                                                </div>
                                                                                            ) : (
                                                                                                <span className="text-gray-300 text-[11px]">—</span>
                                                                                            )}
                                                                                        </td>
                                                                                    );
                                                                                })}
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            ) : (
                                                                /* Progressive / Bifocal (SPH / CYL × AXIS) × ADD Unified Matrix */
                                                                <div className="border border-blue-200 rounded-xl overflow-hidden shadow-2xs">
                                                                    <div className="bg-[#2980b9] text-white px-3.5 py-2 text-xs font-bold flex items-center justify-between">
                                                                        <div className="flex items-center gap-2">
                                                                            <FiLayers size={14} />
                                                                            <span>Progressive / Bifocal Matrix — (SPH / CYL × AXIS) × ADD</span>
                                                                        </div>
                                                                        <span className="text-[10px] bg-white/20 px-2.5 py-0.5 rounded font-mono font-bold">
                                                                            {uiCombosList.length} Rx Combinations × {uiAddList.length} Additions
                                                                        </span>
                                                                    </div>
                                                                    <div className="overflow-x-auto max-h-[360px]">
                                                                        <table className="w-full border-collapse text-center text-xs">
                                                                            <thead>
                                                                                <tr className="bg-gray-100 text-gray-800 font-bold text-[11px]">
                                                                                    <th className="sticky left-0 z-20 bg-gray-200/90 text-gray-800 font-extrabold px-3 py-2 border border-gray-300 text-left min-w-[130px]">
                                                                                        sph/cyl*axis
                                                                                    </th>
                                                                                    {uiAddList.map(a => (
                                                                                        <th key={a} className="p-2 border border-gray-200 min-w-[65px] bg-blue-50/70 text-blue-900 font-extrabold">
                                                                                            +{a.toFixed(2)}
                                                                                        </th>
                                                                                    ))}
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {uiCombosList.map((combo) => {
                                                                                    const rowLabel = formatDistRxCell(combo.s, combo.c, combo.ax);
                                                                                    return (
                                                                                        <tr key={`${combo.s}_${combo.c}_${combo.ax}`} className="hover:bg-blue-50/20">
                                                                                            <td className="sticky left-0 z-10 bg-gray-50 font-mono font-bold p-1.5 border border-gray-200 text-left pl-3 whitespace-nowrap text-gray-800 text-xs">
                                                                                                {rowLabel}
                                                                                            </td>
                                                                                            {uiAddList.map(a => {
                                                                                                const sStr = combo.s.toFixed(2);
                                                                                                const cStr = combo.c.toFixed(2);
                                                                                                const ax = combo.ax;
                                                                                                const aStr = a.toFixed(2);
                                                                                                const item = uiSphAddLookup.get(`${sStr}_${cStr}_${ax}_${aStr}`) ||
                                                                                                             uiSphAddLookup.get(`${sStr}_${cStr}_${aStr}`) ||
                                                                                                             uiSphAddLookup.get(`${sStr}_${aStr}`);
                                                                                                return (
                                                                                                    <td
                                                                                                        key={a}
                                                                                                        className={`border border-gray-200 p-1 transition ${item ? "bg-emerald-50/40 hover:bg-emerald-100/50" : "bg-white"}`}
                                                                                                        title={item ? `Code: ${item.productCode}\nRx: ${rowLabel} | ADD: +${aStr}\nStock: ${item.qty} units\nSelling Price: ₹${item.sellingPrice ?? item.price ?? 0}\nBuying Price: ₹${item.buyingPrice ?? item.price ?? 0}\nMRP: ₹${item.mrp ?? 0}` : "No product combination"}
                                                                                                    >
                                                                                                        {item ? (
                                                                                                            <div className="flex flex-col items-center justify-center">
                                                                                                                {previewMetric === "qty" ? (
                                                                                                                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded font-bold text-xs ${(item.qty || 0) > 0 ? "bg-emerald-500 text-white shadow-2xs" : "bg-amber-100 text-amber-800"}`}>
                                                                                                                        {item.qty || 0}
                                                                                                                    </span>
                                                                                                                ) : (
                                                                                                                    <span className="font-mono text-xs font-bold text-[#2980b9]">
                                                                                                                        ₹{previewMetric === "sellingPrice" ? (item.sellingPrice ?? item.price ?? 0) : previewMetric === "buyingPrice" ? (item.buyingPrice ?? item.price ?? 0) : (item.mrp ?? 0)}
                                                                                                                    </span>
                                                                                                                )}
                                                                                                                <span className="text-[9px] text-gray-400 font-mono mt-0.5">
                                                                                                                    {previewMetric === "qty" ? `₹${item.sellingPrice ?? item.price ?? 0}` : `${item.qty || 0} pcs`}
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        ) : (
                                                                                                            <span className="text-gray-300 text-[10px]">—</span>
                                                                                                        )}
                                                                                                    </td>
                                                                                                );
                                                                                            })}
                                                                                        </tr>
                                                                                    );
                                                                                })}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* View 2: Detailed Combination Table */}
                                                    {previewViewMode === "table" && (
                                                        <div>
                                                            <div className="p-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-3">
                                                                <div className="relative flex-1 max-w-xs">
                                                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                                                                    <input
                                                                        type="text"
                                                                        value={previewSearch}
                                                                        onChange={(e) => setPreviewSearch(e.target.value)}
                                                                        placeholder="Filter combinations by code or power..."
                                                                        className="w-full pl-8 pr-3 py-1 text-xs border border-gray-200 rounded-lg outline-none focus:border-[#2980b9] bg-white text-gray-700"
                                                                    />
                                                                </div>
                                                                <span className="text-[11px] text-gray-500 font-medium">
                                                                    Showing {filteredPreviewProducts.length} of {previewProducts.length} variants
                                                                </span>
                                                            </div>

                                                            <div className="overflow-x-auto max-h-[350px]">
                                                                <table className="w-full text-xs text-left">
                                                                    <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-[10px] sticky top-0 z-10 border-b border-gray-200">
                                                                        <tr>
                                                                            <th className="px-3.5 py-2.5">Product Code</th>
                                                                            <th className="px-3 py-2.5 text-center">SPH Power</th>
                                                                            <th className="px-3 py-2.5 text-center">CYL Power</th>
                                                                            <th className="px-3 py-2.5 text-center">ADD Power</th>
                                                                            <th className="px-3 py-2.5 text-center">Stock Quantity</th>
                                                                            <th className="px-3 py-2.5 text-right">Buying Price</th>
                                                                            <th className="px-3 py-2.5 text-right">Selling Price</th>
                                                                            <th className="px-3 py-2.5 text-right">MRP</th>
                                                                            <th className="px-3.5 py-2.5 text-right">Total Value</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-100 bg-white">
                                                                        {filteredPreviewProducts.map((p) => {
                                                                            const sStr = p.sph != null && p.sph !== "" && p.sph !== "undefined" ? p.sph : "0.00 (Plano)";
                                                                            const cStr = p.cyl != null && p.cyl !== "" && p.cyl !== "undefined" ? p.cyl : "0.00 (Plano)";
                                                                            const aStr = p.addition != null && p.addition !== "" && p.addition !== "0.00" && p.addition !== "undefined" ? p.addition : "—";
                                                                            const qty = p.qty || 0;
                                                                            const sPrice = p.sellingPrice ?? p.price ?? 0;
                                                                            const bPrice = p.buyingPrice ?? p.price ?? 0;
                                                                            const mrp = p.mrp ?? 0;
                                                                            const lineVal = qty * sPrice;

                                                                            return (
                                                                                <tr key={p._id || p.productCode} className="hover:bg-blue-50/40 transition">
                                                                                    <td className="px-3.5 py-2 font-mono font-bold text-gray-800">
                                                                                        {p.productCode || "—"}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 text-center font-mono font-semibold text-gray-700">
                                                                                        {sStr}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 text-center font-mono font-semibold text-gray-700">
                                                                                        {cStr}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 text-center font-mono text-gray-600">
                                                                                        {aStr}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 text-center">
                                                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${qty > 0 ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-red-100 text-red-800"
                                                                                            }`}>
                                                                                            {qty} Units
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="px-3 py-2 text-right font-medium text-gray-700">
                                                                                        ₹{bPrice}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 text-right font-bold text-blue-700">
                                                                                        ₹{sPrice}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 text-right font-medium text-gray-500">
                                                                                        ₹{mrp}
                                                                                    </td>
                                                                                    <td className="px-3.5 py-2 text-right font-bold text-emerald-700">
                                                                                        ₹{lineVal.toLocaleString("en-IN")}
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                    <tfoot className="bg-gray-50 border-t-2 border-gray-200 text-xs font-bold text-gray-800 sticky bottom-0">
                                                                        <tr>
                                                                            <td className="px-3.5 py-2.5 text-gray-500 uppercase text-[10px]">
                                                                                Total ({filteredPreviewProducts.length} Items)
                                                                            </td>
                                                                            <td colSpan={3} className="text-center text-gray-400">—</td>
                                                                            <td className="px-3 py-2.5 text-center text-emerald-700 font-extrabold">
                                                                                {filteredPreviewProducts.reduce((sum, p) => sum + (p.qty || 0), 0)} Units
                                                                            </td>
                                                                            <td colSpan={3} className="text-right text-gray-400">—</td>
                                                                            <td className="px-3.5 py-2.5 text-right text-emerald-800 font-extrabold">
                                                                                ₹{filteredPreviewProducts.reduce((sum, p) => sum + ((p.qty || 0) * (p.sellingPrice ?? p.price ?? 0)), 0).toLocaleString("en-IN")}
                                                                            </td>
                                                                        </tr>
                                                                    </tfoot>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="p-6 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 flex flex-col items-center justify-center gap-1.5 text-center">
                                                    <FiPackage size={22} className="text-gray-300" />
                                                    <p className="text-xs font-semibold text-gray-600">Select a product in Step 1 to inspect live stock quantities and view power grid.</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* ── STEP 3: Upload Edited Excel Matrix & Apply Updates ── */}
                                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-[#2980b9] text-white flex items-center justify-center text-[10px] font-bold">3</div>
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                                    Upload Edited Excel Matrix &amp; Apply Updates
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
                                                        <p className="text-[10px] text-gray-400 mt-1">Accepts .xlsx, .xls, .csv (SPH × CYL &amp; SPH × ADD formats auto-detected)</p>
                                                    </div>
                                                )}
                                                <input
                                                    id="matrix-excel-input"
                                                    type="file"
                                                    accept=".xlsx,.xls,.csv"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        if (e.target.files?.[0]) {
                                                            handleFileUpload(e.target.files[0]);
                                                        }
                                                        e.target.value = "";
                                                    }}
                                                />
                                            </div>

                                            {parseError && (
                                                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-xs font-medium">
                                                    <FiAlertCircle size={15} className="flex-shrink-0" />
                                                    <span>{parseError}</span>
                                                </div>
                                            )}

                                            {/* Parsed Summary & Confirmation */}
                                            {matrixStats && parsedUpdates.length > 0 && (
                                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <FiCheckCircle className="text-emerald-500" size={16} />
                                                            <span className="text-xs font-bold text-gray-800">
                                                                ✓ Parsed {matrixStats.totalCells} combinations ({matrixStats.formatLabel || "Matrix"}) ready to apply
                                                                {matrixStats.posCount != null && (
                                                                    <span className="text-[11px] text-[#2980b9] font-semibold ml-2">
                                                                        (+ SPH: {matrixStats.posCount} | - SPH: {matrixStats.negCount})
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700">
                                                            Action: {action === "UPDATE_QTY" ? "Set Stock Quantity" : action.replace(/_/g, " ")}
                                                        </span>
                                                    </div>

                                                    {/* Preview of first few parsed cells */}
                                                    <div className="bg-white p-3 rounded-xl border border-gray-100 overflow-x-auto">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Sample Preview (First 8 Combinations):</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {parsedUpdates.slice(0, 8).map((u, i) => (
                                                                <span key={i} className="text-[11px] px-2 py-1 bg-gray-50 border border-gray-200 rounded-md font-mono text-gray-700">
                                                                    SPH <strong>{u.sph}</strong> / {u.cyl ? <>CYL <strong>{u.cyl}</strong></> : <>ADD <strong>{u.addition}</strong></>} → <strong className="text-[#2980b9]">{u.value}</strong>
                                                                </span>
                                                            ))}
                                                            {parsedUpdates.length > 8 && (
                                                                <span className="text-[11px] px-2 py-1 text-gray-400 font-semibold">
                                                                    +{parsedUpdates.length - 8} more...
                                                                </span>
                                                            )}
                                                        </div>
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

                                    </div>
                                )}

                                {/* ════════════════════ TAB 2: LENS GENERATION & UPDATE HISTORY ════════════════════ */}
                                {activeTab === "history" && (
                                    <div className="space-y-4">
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                            <div>
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                                    Lens Generation &amp; Inventory Update Timeline
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
                                                            <th className="px-4 py-3">Date &amp; Time</th>
                                                            <th className="px-4 py-3 text-center">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 bg-white">
                                                        {filteredHistory.map((item) => (
                                                <tr key={item._id || `${item.productName}_${item.timestamp}`} className="hover:bg-blue-50/40 transition">
                                                    <td className="px-4 py-3 font-bold text-gray-800">
                                                        {item.productName}
                                                        <div className="text-[10px] text-gray-400 font-normal mt-0.5">
                                                            {item.category || "LENS"} {item.brand ? `• ${item.brand}` : ""}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        {item.action === "GENERATED" ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                                GENERATED
                                                            </span>
                                                        ) : item.action === "UPDATE_PRICE" || item.action === "UPDATE_SELLING_PRICE" || item.action === "UPDATE_BUYING_PRICE" || item.action === "UPDATE_MRP" ? (
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
                                                        {item.totalLenses || 0}
                                                    </td>
                                                    <td className="px-3 py-3 text-center font-bold text-emerald-700">
                                                        {item.totalStockQty ?? 0}
                                                    </td>
                                                    <td className="px-3 py-3 font-mono text-[11px] text-gray-600">
                                                        {item.sphRange && item.sphRange.trim() !== "to" && item.sphRange.trim() !== "to (0 steps)" ? (
                                                            <div>SPH: {item.sphRange}</div>
                                                        ) : (
                                                            <div>SPH: Plano (0.00)</div>
                                                        )}
                                                        {item.additionRange ? (
                                                            <div className="text-emerald-700 font-semibold">ADD: {item.additionRange}</div>
                                                        ) : item.cylRange && item.cylRange.trim() !== "to" && item.cylRange.trim() !== "to (0 steps)" ? (
                                                            <div>CYL: {item.cylRange}</div>
                                                        ) : (
                                                            <div>CYL: Plano (0.00)</div>
                                                        )}
                                                        {item.additionRange ? (
                                                            <span className="inline-block mt-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded border border-emerald-100">
                                                                SPH × ADD
                                                            </span>
                                                        ) : (
                                                            <span className="inline-block mt-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-bold rounded border border-blue-100">
                                                                SPH × CYL
                                                            </span>
                                                        )}
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
                                                        {item.timestamp ? new Date(item.timestamp).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : (item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—")}
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
                    <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <p className="text-[11px] text-gray-400">
                            Zero extra models • Optical SPH × CYL &amp; SPH × ADD standards • Real-time bulk updates
                        </p>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-100 text-xs font-semibold text-gray-600 transition"
                        >
                            Close
                        </button>
                    </div>

                </div>
            </div>
            );
}
