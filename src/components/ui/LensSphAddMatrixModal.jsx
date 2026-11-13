import React, { useState, useEffect, useRef, useMemo } from "react";
import XLSX from "xlsx-js-style";
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

// Normalize power numbers (e.g. "+0.25" -> 0.25)
const numPower = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = parseFloat(String(v).replace(/\+/g, "").trim());
    return isNaN(n) ? null : n;
};

// Shared Single Vision axis builder: uses continuous 0.25 steps for normal ranges,
// and falls back to default 0.25 range + actual detected values for extreme ranges (e.g. up to 400.00).
const buildSvAxisValues = (detectedSet, { direction, startAbs, defaultMaxAbs }) => {
    const sign = direction === "pos" ? 1 : -1;
    const sideDetected = Array.from(detectedSet)
        .filter((v) => (direction === "pos" ? (startAbs === 0 ? v >= 0 : v > 0) : v <= 0))
        .map((v) => Number(v.toFixed(2)));
    const maxDetectedAbs = sideDetected.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    const set = new Set();
    const stepLimit = maxDetectedAbs <= 16.00 ? Math.max(defaultMaxAbs, maxDetectedAbs) : defaultMaxAbs;

    for (let abs = startAbs; abs <= stepLimit + 0.001; abs += 0.25) {
        const val = Number((sign * abs).toFixed(2));
        set.add(Object.is(val, -0) ? 0 : val);
    }
    sideDetected.forEach((v) => set.add(Object.is(v, -0) ? 0 : v));
    if (startAbs === 0) set.add(0);

    return Array.from(set).sort((a, b) => (direction === "pos" ? a - b : b - a));
};

// Detect if a lens is Single Vision, Progressive, or Bifocal
const getLensClassification = (item, matrixOverride = null) => {
    const name = (matrixOverride?.productName || item?.productName || "").toLowerCase();
    const cat = (matrixOverride?.category || item?.category || "").toLowerCase();
    const type = (matrixOverride?.type || item?.type || "").toLowerCase();

    if (name.includes("bifocal") || cat.includes("bifocal") || type.includes("bifocal")) {
        return {
            type: "Bifocal",
            label: "Bifocal",
            format: "SPH_ADD",
            badgeClass: "bg-purple-100 text-purple-800 border-purple-200",
            dotColor: "bg-purple-500",
            tag: "BIFOCAL (SPH × ADD)",
        };
    }

    if (name.includes("progressive") || name.includes("prog ") || name.startsWith("prog") || cat.includes("progressive") || type.includes("progressive")) {
        return {
            type: "Progressive",
            label: "Progressive",
            format: "SPH_ADD",
            badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
            dotColor: "bg-emerald-500",
            tag: "PROGRESSIVE (SPH × ADD)",
        };
    }

    // Explicit Single Vision type or name takes precedence over stray/seeded addition fields
    if (
        type === "single_vision" ||
        type === "single vision" ||
        name.includes("single vision") ||
        name.includes("single_vision") ||
        cat.includes("single vision")
    ) {
        return {
            type: "Single Vision",
            label: "Single Vision",
            format: "SPH_CYL",
            badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
            dotColor: "bg-blue-500",
            tag: "SINGLE VISION (SPH × CYL)",
        };
    }

    const distinctAdds = new Set();
    if (matrixOverride?.products?.length) {
        matrixOverride.products.forEach((p) => {
            const a = numPower(p.addition);
            if (a !== null && a > 0) distinctAdds.add(a.toFixed(2));
        });
    }
    if (matrixOverride?.additionValues?.length) {
        matrixOverride.additionValues.forEach((a) => {
            const n = numPower(a);
            if (n !== null && n > 0) distinctAdds.add(n.toFixed(2));
        });
    }

    const itemHasAdd = Boolean(
        (item?.additionRange && item.additionRange.trim() !== "" && item.additionRange.trim() !== "to" && item.additionRange.trim() !== "0.00") ||
        (item?.addition && item.addition !== "0.00" && item.addition !== "") ||
        (Array.isArray(item?.additions) && item.additions.some((a) => (numPower(a) ?? 0) > 0))
    );

    // Non-lens categories (e.g. SUNGLASS) or history entries with empty additionRange and <=1 dummy ADD value stay Single Vision
    const isNonLensCategory = Boolean(cat) && !cat.includes("lens") && !cat.includes("bifocal") && !cat.includes("progressive");
    const historyMarkedNoAdd = item && Object.prototype.hasOwnProperty.call(item, "additionRange") && (!item.additionRange || item.additionRange.trim() === "" || item.additionRange.trim() === "0.00" || item.additionRange.trim() === "to");
    const hasRealAddition =
        distinctAdds.size > 1 ||
        (distinctAdds.size === 1 && !isNonLensCategory && !historyMarkedNoAdd) ||
        (distinctAdds.size === 0 && itemHasAdd && !isNonLensCategory);

    if (hasRealAddition) {
        return {
            type: "Progressive / Bifocal",
            label: "Progressive / Bifocal",
            format: "SPH_ADD",
            badgeClass: "bg-teal-100 text-teal-800 border-teal-200",
            dotColor: "bg-teal-500",
            tag: "PROGRESSIVE / BIFOCAL (SPH × ADD)",
        };
    }

    return {
        type: "Single Vision",
        label: "Single Vision",
        format: "SPH_CYL",
        badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
        dotColor: "bg-blue-500",
        tag: "SINGLE VISION (SPH × CYL)",
    };
};

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

    // ── Action State ──
    const [action, setAction] = useState("UPDATE_QTY"); // "UPDATE_QTY" | "UPDATE_PRICE" | "UPDATE_SELLING_PRICE" | "UPDATE_BUYING_PRICE" | "UPDATE_MRP"

    // ── Live UI Matrix & Table Preview State ──
    const [previewViewMode, setPreviewViewMode] = useState("grid"); // "grid" | "table"
    const [svQuadrantTab, setSvQuadrantTab] = useState("all"); // "all" | "SPH+_CYL+" | "SPH-_CYL+" | "SPH+_CYL-" | "SPH-_CYL-"
    const [previewSearch, setPreviewSearch] = useState("");
    const [gridRxFilter, setGridRxFilter] = useState("");
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
    const [historyCategoryFilter, setHistoryCategoryFilter] = useState("ALL"); // "ALL" | "SINGLE_VISION" | "PROGRESSIVE" | "BIFOCAL"

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
        setGridRxFilter("");

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

    const historyCounts = useMemo(() => {
        let sv = 0, prog = 0, bif = 0;
        historyList.forEach(h => {
            const c = getLensClassification(h);
            if (c.type === "Single Vision") sv++;
            else if (c.type === "Bifocal") bif++;
            else prog++;
        });
        return { all: historyList.length, sv, prog, bif };
    }, [historyList]);

    if (!isOpen) return null;

    // Determine whether selected product is Progressive/Bifocal (sph/cyl*axis × ADD) or Single Vision (SPH × CYL)
    const selectedClassification = getLensClassification(selectedProduct, matrixData);
    const effectiveFormat = selectedClassification.format;

    // Helper to get value for a cell based on selected action
    const getVal = (prod) => {
        if (!prod) return "";
        if (action === "UPDATE_QTY") return prod.qty !== undefined ? prod.qty : "";
        if (action === "UPDATE_SELLING_PRICE") return prod.sellingPrice ?? prod.price ?? "";
        if (action === "UPDATE_BUYING_PRICE") return prod.buyingPrice ?? prod.price ?? "";
        if (action === "UPDATE_MRP") return prod.mrp ?? "";
        return prod.sellingPrice ?? prod.price ?? "";
    };

    // ── Shared Excel Cell Styling Helpers (xlsx-js-style) ──
    const thinBlack = { style: "thin", color: { rgb: "000000" } };
    const medBlack = { style: "medium", color: { rgb: "000000" } };
    const thinGray = { style: "thin", color: { rgb: "BFBFBF" } };

    const xlStyles = {
        yellowBanner: {
            fill: { fgColor: { rgb: "FFFF00" } },
            font: { name: "Calibri", sz: 12, bold: true, color: { rgb: "000000" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: { top: medBlack, bottom: medBlack, left: medBlack, right: medBlack },
        },
        groupHeader: {
            fill: { fgColor: { rgb: "FFFFFF" } },
            font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "000000" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: { top: medBlack, bottom: medBlack, left: medBlack, right: medBlack },
        },
        cyanHeader: {
            fill: { fgColor: { rgb: "DAEEF3" } },
            font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "000000" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: { top: thinBlack, bottom: medBlack, left: thinBlack, right: thinBlack },
        },
        cyanSphCol: {
            fill: { fgColor: { rgb: "DAEEF3" } },
            font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "000000" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: { top: thinBlack, bottom: thinBlack, left: medBlack, right: medBlack },
        },
        progRxHeader: {
            fill: { fgColor: { rgb: "FFFFFF" } },
            font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "000000" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: { top: thinBlack, bottom: medBlack, left: medBlack, right: medBlack },
        },
        progRxCell: {
            fill: { fgColor: { rgb: "FFFFFF" } },
            font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "000000" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: { top: thinBlack, bottom: thinBlack, left: medBlack, right: medBlack },
        },
        dataCell: {
            fill: { fgColor: { rgb: "FFFFFF" } },
            font: { name: "Calibri", sz: 10, color: { rgb: "000000" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: { top: thinGray, bottom: thinGray, left: thinGray, right: thinGray },
        },
        svDataCell: {
            fill: { fgColor: { rgb: "FFFFFF" } },
            font: { name: "Calibri", sz: 10, color: { rgb: "000000" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: { top: thinBlack, bottom: thinBlack, left: thinBlack, right: thinBlack },
        },
        blackoutCell: {
            fill: { fgColor: { rgb: "000000" } },
            font: { name: "Calibri", sz: 10, color: { rgb: "000000" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: { top: thinBlack, bottom: thinBlack, left: thinBlack, right: thinBlack },
        },
    };

    const styleRange = (ws, r1, c1, r2, c2, styleObj) => {
        for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
                const addr = XLSX.utils.encode_cell({ r, c });
                if (!ws[addr]) ws[addr] = { t: "s", v: "" };
                ws[addr].s = styleObj;
            }
        }
    };

    // ════════════════════════════════════════════════════════════════════════
    // 1A. Export Single Vision SPH × CYL Matrix Grid (4 Quadrants: ++, -+, +-, --)
    // ════════════════════════════════════════════════════════════════════════
    const exportSphCylMatrix = () => {
        const prodName = selectedProduct?.productName || (searchTerm.trim().length > 1 ? searchTerm.trim() : "Single_Vision_Matrix");
        const allProducts = matrixData?.products || [];

        const lookup = new Map();
        const detectedSphs = new Set();
        const detectedCyls = new Set();

        allProducts.forEach(p => {
            let s = numPower(p.sph);
            let c = numPower(p.cyl);
            const a = numPower(p.addition);

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

        const posSphs = buildSvAxisValues(detectedSphs, { direction: "pos", startAbs: 0.00, defaultMaxAbs: 3.00 });
        const negSphs = buildSvAxisValues(detectedSphs, { direction: "neg", startAbs: 0.00, defaultMaxAbs: 3.00 });
        const posCyls = buildSvAxisValues(detectedCyls, { direction: "pos", startAbs: 0.25, defaultMaxAbs: 2.00 });
        const negCyls = buildSvAxisValues(detectedCyls, { direction: "neg", startAbs: 0.00, defaultMaxAbs: 2.00 });

        const actionLabel = action === "UPDATE_QTY" ? "Pairs" : (action === "UPDATE_SELLING_PRICE" ? "Selling Price (₹)" : (action === "UPDATE_BUYING_PRICE" ? "Buying Price (₹)" : (action === "UPDATE_MRP" ? "MRP (₹)" : "Pairs")));

        const maxCylCols = Math.max(posCyls.length, negCyls.length);
        const leftSphCol = 1;
        const leftCylStartCol = 2;
        const leftCylEndCol = leftCylStartCol + maxCylCols - 1;
        const rightSphCol = leftCylEndCol + 1;
        const rightCylStartCol = rightSphCol + 1;
        const rightCylEndCol = rightCylStartCol + maxCylCols - 1;
        const totalCols = rightCylEndCol + 2;

        const rows = [];
        const merges = [];
        const styleActions = [];
        const maxRows = Math.max(posSphs.length, negSphs.length);

        const addDualBlock = (cylGroupTitle, cylList) => {
            const cLen = cylList.length;
            const lEnd = leftCylStartCol + cLen - 1;
            const rEnd = rightCylStartCol + cLen - 1;

            // Blank spacer
            rows.push(new Array(totalCols).fill(""));

            // Row A: Yellow Banner
            const bannerIdx = rows.length;
            const bannerRow = new Array(totalCols).fill("");
            bannerRow[leftSphCol] = prodName;
            bannerRow[rightSphCol] = actionLabel;
            rows.push(bannerRow);
            merges.push({ s: { r: bannerIdx, c: leftSphCol }, e: { r: bannerIdx, c: lEnd } });
            merges.push({ s: { r: bannerIdx, c: rightSphCol }, e: { r: bannerIdx, c: rEnd } });
            styleActions.push((ws) => {
                styleRange(ws, bannerIdx, leftSphCol, bannerIdx, lEnd, xlStyles.yellowBanner);
                styleRange(ws, bannerIdx, rightSphCol, bannerIdx, rEnd, xlStyles.yellowBanner);
            });

            // Row B: Group Headers (SPH | Cyl (+) | SPH | Cyl (+))
            const groupIdx = rows.length;
            const groupRow = new Array(totalCols).fill("");
            groupRow[leftSphCol] = "SPH";
            groupRow[leftCylStartCol] = cylGroupTitle;
            groupRow[rightSphCol] = "SPH";
            groupRow[rightCylStartCol] = cylGroupTitle;
            rows.push(groupRow);
            merges.push({ s: { r: groupIdx, c: leftCylStartCol }, e: { r: groupIdx, c: lEnd } });
            merges.push({ s: { r: groupIdx, c: rightCylStartCol }, e: { r: groupIdx, c: rEnd } });
            styleActions.push((ws) => {
                styleRange(ws, groupIdx, leftSphCol, groupIdx, leftSphCol, xlStyles.groupHeader);
                styleRange(ws, groupIdx, leftCylStartCol, groupIdx, lEnd, xlStyles.groupHeader);
                styleRange(ws, groupIdx, rightSphCol, groupIdx, rightSphCol, xlStyles.groupHeader);
                styleRange(ws, groupIdx, rightCylStartCol, groupIdx, rEnd, xlStyles.groupHeader);
            });

            // Row C: Sub-Headers ((+) / CYL values | (-) / CYL values)
            const subIdx = rows.length;
            const subRow = new Array(totalCols).fill("");
            subRow[leftSphCol] = "(+)";
            subRow[rightSphCol] = "(-)";
            cylList.forEach((cVal, idx) => {
                const cLabel = cVal > 0 ? `+${cVal.toFixed(2)}` : cVal.toFixed(2);
                subRow[leftCylStartCol + idx] = cLabel;
                subRow[rightCylStartCol + idx] = cLabel;
            });
            rows.push(subRow);
            styleActions.push((ws) => {
                styleRange(ws, subIdx, leftSphCol, subIdx, lEnd, xlStyles.cyanHeader);
                styleRange(ws, subIdx, rightSphCol, subIdx, rEnd, xlStyles.cyanHeader);
            });

            // Data Rows
            for (let r = 0; r < maxRows; r++) {
                const rowIdx = rows.length;
                const rowData = new Array(totalCols).fill("");
                const hasLeft = r < posSphs.length;
                const hasRight = r < negSphs.length;

                if (hasLeft) {
                    const sVal = posSphs[r];
                    rowData[leftSphCol] = sVal === 0 ? "0.00" : `+${sVal.toFixed(2)}`;
                    cylList.forEach((cVal, cIdx) => {
                        const prod = lookup.get(`${sVal.toFixed(2)}_${cVal.toFixed(2)}`);
                        const val = getVal(prod);
                        rowData[leftCylStartCol + cIdx] = val === "" ? "" : val;
                    });
                }

                if (hasRight) {
                    const sVal = negSphs[r];
                    rowData[rightSphCol] = sVal === 0 ? "0.00" : sVal.toFixed(2);
                    cylList.forEach((cVal, cIdx) => {
                        const prod = lookup.get(`${sVal.toFixed(2)}_${cVal.toFixed(2)}`);
                        const val = getVal(prod);
                        rowData[rightCylStartCol + cIdx] = val === "" ? "" : val;
                    });
                }

                rows.push(rowData);
                styleActions.push((ws) => {
                    if (hasLeft) {
                        styleRange(ws, rowIdx, leftSphCol, rowIdx, leftSphCol, xlStyles.cyanSphCol);
                        styleRange(ws, rowIdx, leftCylStartCol, rowIdx, lEnd, xlStyles.svDataCell);
                    }
                    if (hasRight) {
                        styleRange(ws, rowIdx, rightSphCol, rowIdx, rightSphCol, xlStyles.cyanSphCol);
                        styleRange(ws, rowIdx, rightCylStartCol, rowIdx, rEnd, xlStyles.svDataCell);
                    }
                });
            }
        };

        // Top Block: ++ (Left) and -+ (Right)
        addDualBlock("Cyl (+)", posCyls);
        // Bottom Block: +- (Left) and -- (Right)
        addDualBlock("Cyl (-)", negCyls);

        rows.push(new Array(totalCols).fill(""));

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws["!merges"] = merges;
        styleActions.forEach(fn => fn(ws));

        const colWidths = [{ wch: 3 }];
        for (let c = 1; c < totalCols; c++) {
            colWidths.push({ wch: (c === leftSphCol || c === rightSphCol) ? 9 : 8 });
        }
        ws["!cols"] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Single Vision 4-Grid");

        const safeFilename = `${prodName.replace(/[^a-zA-Z0-9_-]/g, "_")}_SingleVision_4Quadrants.xlsx`;
        XLSX.writeFile(wb, safeFilename);

        toast.success(`Exported Single Vision 4 Quadrants (++, -+, +-, --) Excel for "${prodName}".`);
    };

    // Helper to clean axis string
    const cleanAxisStr = (ax) => {
        if (ax === null || ax === undefined || ax === "") return "";
        return String(ax).replace(/[°\s]/g, "").trim();
    };

    // Helper to format Distance Power in the first column: SPH/CYLxAXIS (e.g. 0.00/-0.25x90)
    const formatDistRxCell = (sVal, cVal, axVal) => {
        let sStr = "";
        if (sVal === 0) {
            sStr = "0.00";
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
            return `${sStr}/0.00x${axClean}`;
        }
        return sStr;
    };

    // Helper: Build exact Progressive/Bifocal table model for a given list of product rows
    const buildProgressiveTableModel = (productsList = []) => {
        const lookup = new Map();
        const detectedAdds = new Set();
        const comboKeySet = new Set();
        const combosList = [];

        productsList.forEach(p => {
            let s = numPower(p.sph) ?? 0;
            let c = numPower(p.cyl) ?? 0;
            const ax = cleanAxisStr(p.axis);
            const a = numPower(p.addition);

            if (a !== null && a > 0) {
                detectedAdds.add(a);
                const sStr = s.toFixed(2);
                const cStr = c.toFixed(2);
                const aStr = a.toFixed(2);
                lookup.set(`${sStr}_${cStr}_${ax}_${aStr}`, p);
            }

            const comboKey = `${s.toFixed(2)}_${c.toFixed(2)}_${ax}`;
            if (!comboKeySet.has(comboKey)) {
                comboKeySet.add(comboKey);
                combosList.push({ s, c, ax });
            }
        });

        if (combosList.length === 0) {
            const defaultSphs = [0.00, 0.25, 0.50, 0.75, 1.00, -0.25, -0.50, -0.75, -1.00];
            const defaultCyls = [-0.25, -0.50, -0.75, -1.00];
            const defaultAxis = "90";
            defaultSphs.forEach(s => {
                defaultCyls.forEach(c => {
                    combosList.push({ s, c, ax: defaultAxis });
                });
            });
        }

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

        const defaultAdds = [1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00];
        const hasCustomAddStep = Array.from(detectedAdds).some(
            a => Math.abs(Math.round(a / 0.25) * 0.25 - a) > 0.001
        );
        const addList = detectedAdds.size > 0
            ? (hasCustomAddStep
                ? Array.from(detectedAdds).sort((a, b) => a - b)
                : Array.from(new Set([...defaultAdds, ...Array.from(detectedAdds)])).sort((a, b) => a - b))
            : defaultAdds;

        return { lookup, combosList, addList };
    };

    // Helper: Export one or more Progressive/Bifocal product groups into a styled Excel workbook
    const exportProgressiveGroupsWorkbook = (groups, filename, sheetTabName) => {
        const rxCol = 1;
        const addStartCol = 2;
        const maxAddCols = Math.max(
            9,
            ...groups.map(g => g.model.addList.length)
        );
        const totalCols = addStartCol + maxAddCols + 1;

        const rows = [];
        const merges = [];
        const styleActions = [];
        const actionLabel = action === "UPDATE_QTY" ? "Pairs" : (action === "UPDATE_SELLING_PRICE" ? "Selling Price (₹)" : (action === "UPDATE_BUYING_PRICE" ? "Buying Price (₹)" : (action === "UPDATE_MRP" ? "MRP (₹)" : "Pairs")));

        groups.forEach((grp) => {
            const { productName: grpName, model } = grp;
            const { lookup, combosList, addList } = model;
            const numAddCols = addList.length;
            const addEndCol = addStartCol + numAddCols - 1;

            // Blank spacer above each product table
            rows.push(new Array(totalCols).fill(""));

            // Row 1: Yellow Banner with Product Name centered in visible window
            const bannerIdx = rows.length;
            const bannerRow = new Array(totalCols).fill("");
            const visibleBannerEnd = numAddCols > 10 ? rxCol + 9 : addEndCol;
            bannerRow[rxCol] = `${grpName} (${actionLabel})`;
            rows.push(bannerRow);
            merges.push({ s: { r: bannerIdx, c: rxCol }, e: { r: bannerIdx, c: visibleBannerEnd } });
            if (numAddCols > 10) {
                merges.push({ s: { r: bannerIdx, c: visibleBannerEnd + 1 }, e: { r: bannerIdx, c: addEndCol } });
            }
            styleActions.push((ws) => {
                styleRange(ws, bannerIdx, rxCol, bannerIdx, addEndCol, xlStyles.yellowBanner);
            });

            // Row 2: sph / cyl * axis | Add (+) — centered in visible window so it never goes off-screen
            const groupIdx = rows.length;
            const addHeaderRow = new Array(totalCols).fill("");
            const visibleAddEnd = numAddCols > 10 ? addStartCol + 8 : addEndCol;
            addHeaderRow[rxCol] = "sph / cyl * axis";
            addHeaderRow[addStartCol] = "Add (+)";
            if (numAddCols > 10) {
                addHeaderRow[visibleAddEnd + 1] = "Add (+)";
            }
            rows.push(addHeaderRow);
            merges.push({ s: { r: groupIdx, c: addStartCol }, e: { r: groupIdx, c: visibleAddEnd } });
            if (numAddCols > 10) {
                merges.push({ s: { r: groupIdx, c: visibleAddEnd + 1 }, e: { r: groupIdx, c: addEndCol } });
            }
            styleActions.push((ws) => {
                styleRange(ws, groupIdx, rxCol, groupIdx, rxCol, xlStyles.groupHeader);
                styleRange(ws, groupIdx, addStartCol, groupIdx, addEndCol, xlStyles.groupHeader);
            });

            // Row 3: empty cell below sph/cyl*axis | Light Cyan Addition values
            const subIdx = rows.length;
            const subHeaderRow = new Array(totalCols).fill("");
            subHeaderRow[rxCol] = "";
            addList.forEach((addVal, idx) => {
                subHeaderRow[addStartCol + idx] = addVal.toFixed(2);
            });
            rows.push(subHeaderRow);
            styleActions.push((ws) => {
                styleRange(ws, subIdx, rxCol, subIdx, rxCol, xlStyles.progRxHeader);
                styleRange(ws, subIdx, addStartCol, subIdx, addEndCol, xlStyles.cyanHeader);
            });

            // Row 4+: Data rows
            const dataStartIdx = rows.length;
            combosList.forEach((combo) => {
                const rowData = new Array(totalCols).fill("");
                rowData[rxCol] = formatDistRxCell(combo.s, combo.c, combo.ax);

                addList.forEach((addVal, aIdx) => {
                    const sStr = combo.s.toFixed(2);
                    const cStr = combo.c.toFixed(2);
                    const ax = combo.ax;
                    const aStr = addVal.toFixed(2);

                    const prod = lookup.get(`${sStr}_${cStr}_${ax}_${aStr}`);
                    rowData[addStartCol + aIdx] = getVal(prod);
                });

                rows.push(rowData);
            });
            const dataEndIdx = rows.length - 1;

            styleActions.push((ws) => {
                for (let r = dataStartIdx; r <= dataEndIdx; r++) {
                    styleRange(ws, r, rxCol, r, rxCol, xlStyles.progRxCell);
                    styleRange(ws, r, addStartCol, r, addEndCol, xlStyles.dataCell);
                }
            });
        });

        rows.push(new Array(totalCols).fill(""));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws["!merges"] = merges;
        styleActions.forEach(fn => fn(ws));

        const colWidths = [{ wch: 3 }, { wch: 20 }];
        for (let i = 0; i < maxAddCols; i++) colWidths.push({ wch: 10 });
        ws["!cols"] = colWidths;

        const cleanTitle = (sheetTabName || "Progressive_Matrix").substring(0, 31).replace(/[:\\/?*[\]]/g, "_");
        XLSX.utils.book_append_sheet(wb, ws, cleanTitle);
        XLSX.writeFile(wb, filename);
    };

    // ════════════════════════════════════════════════════════════════════════
    // 1B. Export Progressive / Bifocal (sph/cyl*axis × ADD) Matrix Grid
    // ════════════════════════════════════════════════════════════════════════
    const exportSphAddMatrix = () => {
        const prodName = selectedProduct?.productName || (searchTerm.trim().length > 1 ? searchTerm.trim() : "Progressive_Lens_Matrix");
        const allProducts = matrixData?.products || [];
        const model = buildProgressiveTableModel(allProducts);
        const safeFilename = `${prodName.replace(/[^a-zA-Z0-9_-]/g, "_")}_Progressive_ADD_Matrix.xlsx`;

        exportProgressiveGroupsWorkbook(
            [{ productName: prodName, model }],
            safeFilename,
            prodName
        );
        toast.success(`Exported Progressive / Bifocal (sph/cyl*axis × ADD) Excel for "${prodName}".`);
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

                // Helper to parse distance prescription string: SPH / CYL x AXIS
                const parseDistPower = (str, forceNegative = false) => {
                    if (str === null || str === undefined || str === "") return null;
                    const s = String(str).trim();
                    const sCompact = s.toLowerCase().replace(/\s+/g, "");
                    if (!s || s === "-" || sCompact.startsWith("sph/cyl") || sCompact === "rx" || s.toLowerCase().startsWith("distance rx")) return null;

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
                        sph: sphNum === 0 ? "0.00" : (sphNum > 0 ? `+${sphNum.toFixed(2)}` : sphNum.toFixed(2)),
                        cyl: cylNum !== null && !isNaN(cylNum) ? (cylNum === 0 ? "0.00" : (cylNum > 0 ? `+${cylNum.toFixed(2)}` : cylNum.toFixed(2))) : "0.00",
                        axis: axisStr,
                    };
                };

                const updatesMap = new Map();
                let detectedProductName = "";
                let detectedFormat = "";
                let totalPosCount = 0;
                let totalNegCount = 0;

                // Process all sheets in the workbook (supports 2x2 4-Quadrants Single Vision & Progressive/Bifocal)
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
                    if (!rawData || rawData.length < 3) return;

                    // 1. Auto-Detect Product Name
                    for (let r = 0; r < Math.min(5, rawData.length); r++) {
                        const row = rawData[r] || [];
                        for (let c = 0; c < row.length; c++) {
                            const cell = String(row[c]).trim();
                            const lc = cell.toLowerCase();
                            const lcCompact = lc.replace(/\s+/g, "");
                            if (
                                cell &&
                                !["sales order", "sph", "cyl", "cyl (+)", "cyl (-)", "add", "add (+)", "(+)", "(-)", "pairs", "price matrix", "power", "distance rx", "rx", "selling price (₹)", "buying price (₹)", "mrp (₹)"].includes(lc) &&
                                !lcCompact.startsWith("sph/cyl")
                            ) {
                                if (lc.startsWith("sales order -")) {
                                    const extracted = cell.substring("sales order -".length).replace(/\(.*?\)/g, "").trim();
                                    if (extracted && !detectedProductName) detectedProductName = extracted;
                                    break;
                                } else if (r <= 2 && cell.length > 2 && !detectedProductName) {
                                    detectedProductName = cell;
                                    break;
                                }
                            }
                        }
                    }

                    // 2. Classify Sheet Type (SPH × CYL vs SPH × ADD)
                    let isSphAdd = false;
                    let isSphCyl = false;
                    let headerRowIdx = -1;

                    // Priority 1: Check explicitly for ADD / sph/cyl*axis vs CYL
                    for (let r = 0; r < Math.min(10, rawData.length); r++) {
                        const row = (rawData[r] || []).map(c => String(c).trim().toLowerCase());
                        if (row.some(c => c.includes("add") || c.replace(/\s+/g, "").includes("sph/cyl") || c === "rx")) {
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

                    // Priority 2: Legacy dual-table ADD check (when neither "cyl" nor "add" label is present)
                    if (!isSphAdd && !isSphCyl) {
                        for (let r = 0; r < Math.min(10, rawData.length); r++) {
                            const row = (rawData[r] || []).map(c => String(c).trim().toLowerCase());
                            if (row.some(c => c === "(+)" || c === "+") && row.some(c => c === "(-)" || c === "-")) {
                                isSphAdd = true;
                                headerRowIdx = r;
                                break;
                            }
                        }
                    }

                    if (!isSphAdd && !isSphCyl) {
                        const sn = sheetName.toLowerCase();
                        if (sn.includes("add") || sn.includes("prog") || sn.includes("bifocal")) {
                            isSphAdd = true;
                        } else {
                            isSphCyl = true;
                        }
                    }

                    // ── A. PARSE SINGLE VISION (SPH × CYL — supports 2x2 4-Quadrants & single-table sheets) ──
                    if (isSphCyl) {
                        detectedFormat = "SPH_CYL";

                        // Find all group header rows containing CYL in the sheet (handles stacked Top & Bottom blocks)
                        const blockHeaderIndices = [];
                        for (let r = 0; r < rawData.length; r++) {
                            const row = (rawData[r] || []).map(c => String(c).trim().toLowerCase());
                            if (row.some(c => c === "cyl" || c.startsWith("cyl"))) {
                                blockHeaderIndices.push(r);
                            }
                        }
                        if (blockHeaderIndices.length === 0 && headerRowIdx >= 0) {
                            blockHeaderIndices.push(headerRowIdx);
                        }

                        blockHeaderIndices.forEach((grpIdx, bPos) => {
                            const subHeaderIdx = grpIdx + 1;
                            const groupHeaderRow = rawData[grpIdx] || [];
                            const subHeaderRow = rawData[subHeaderIdx] || [];
                            const blockEndRow = bPos + 1 < blockHeaderIndices.length
                                ? Math.max(subHeaderIdx + 1, blockHeaderIndices[bPos + 1] - 1)
                                : rawData.length;

                            // Find all SPH columns in this row (1 for single table, 2 for left/right side-by-side)
                            const sphCols = [];
                            for (let c = 0; c < groupHeaderRow.length; c++) {
                                const cell = String(groupHeaderRow[c] || "").trim().toLowerCase();
                                if (cell === "sph" || cell.startsWith("sph")) {
                                    sphCols.push(c);
                                }
                            }
                            if (sphCols.length === 0) {
                                for (let c = 0; c < subHeaderRow.length; c++) {
                                    const cell = String(subHeaderRow[c] || "").trim().toLowerCase();
                                    if (cell === "power" || cell === "sph" || cell === "(+)" || cell === "(-)") {
                                        sphCols.push(c);
                                    }
                                }
                            }
                            if (sphCols.length === 0) sphCols.push(0);

                            const subTables = sphCols.map((sphCol, idx) => {
                                const nextBoundary = idx + 1 < sphCols.length ? sphCols[idx + 1] : subHeaderRow.length;
                                const sphHint = String(subHeaderRow[sphCol] || "").trim().toLowerCase();
                                const isNegSph = sphHint.includes("-");

                                // Check CYL group header sign hint (e.g. "Cyl (-)")
                                let cylGroupHint = "";
                                for (let c = sphCol + 1; c < nextBoundary; c++) {
                                    const gCell = String(groupHeaderRow[c] || "").trim().toLowerCase();
                                    if (gCell) { cylGroupHint = gCell; break; }
                                }
                                const isNegCylGroup = cylGroupHint.includes("(-)");

                                const cylCols = [];
                                for (let c = sphCol + 1; c < nextBoundary; c++) {
                                    const raw = String(subHeaderRow[c] || "").replace(/\+/g, "").trim();
                                    const val = parseFloat(raw);
                                    if (!isNaN(val) && raw !== "") {
                                        const resolvedCyl = (isNegCylGroup && val > 0) ? -Math.abs(val) : val;
                                        cylCols.push({ colIdx: c, cylVal: resolvedCyl.toFixed(2) });
                                    }
                                }
                                return { sphCol, isNegSph, cylCols };
                            });

                            for (let r = subHeaderIdx + 1; r < blockEndRow; r++) {
                                const row = rawData[r];
                                if (!row || row.every(c => c === "" || c === undefined)) continue;

                                subTables.forEach(({ sphCol, isNegSph, cylCols }) => {
                                    if (cylCols.length === 0) return;
                                    const rawSph = String(row[sphCol] || "").replace(/\+/g, "").trim();
                                    let sphVal = parseFloat(rawSph);
                                    if (isNaN(sphVal) || rawSph === "") return;

                                    if (isNegSph && sphVal > 0) {
                                        sphVal = -Math.abs(sphVal);
                                    }

                                    const sphStr = sphVal.toFixed(2);
                                    const sphFormatted = sphVal === 0 ? "0.00" : (sphVal > 0 ? `+${sphVal.toFixed(2)}` : sphVal.toFixed(2));

                                    cylCols.forEach(({ colIdx, cylVal }) => {
                                        const cellRaw = row[colIdx];
                                        if (cellRaw !== "" && cellRaw !== undefined && cellRaw !== "-") {
                                            const valNum = parseFloat(String(cellRaw).trim());
                                            if (!isNaN(valNum)) {
                                                const updateObj = {
                                                    sph: sphFormatted,
                                                    cyl: cylVal,
                                                    value: valNum,
                                                };
                                                if (action === "UPDATE_QTY") updateObj.qty = valNum;
                                                else if (action === "UPDATE_SELLING_PRICE") updateObj.sellingPrice = valNum;
                                                else if (action === "UPDATE_BUYING_PRICE") updateObj.buyingPrice = valNum;
                                                else if (action === "UPDATE_MRP") updateObj.mrp = valNum;
                                                else {
                                                    updateObj.sellingPrice = valNum;
                                                    updateObj.buyingPrice = valNum;
                                                    updateObj.mrp = valNum;
                                                }

                                                const key = `${sphStr}_${cylVal}`;
                                                updatesMap.set(key, updateObj);
                                                if (sphVal >= 0) totalPosCount++;
                                                else totalNegCount++;
                                            }
                                        }
                                    });
                                });
                            }
                        });
                    }

                    // ── B. PARSE PROGRESSIVE / BIFOCAL (supports 1 or multiple stacked products) ──
                    else if (isSphAdd) {
                        detectedFormat = "SPH_ADD";

                        const stripActionSuffix = (str) =>
                            String(str || "")
                                .replace(/\s*\((Pairs|Pairs \/ Stock Qty|Selling Price \(₹\)|Buying Price \(₹\)|MRP \(₹\)|Quantity \/ Price|Update Stock Quantity|Update Selling Price Only|Update Buying Price Only|Update MRP Only|Progressive \/ Bifocal|Progressive|Bifocal)\)\s*$/i, "")
                                .trim();

                        const countAddCandidates = (row) => {
                            if (!row) return 0;
                            let count = 0;
                            for (let c = 0; c < row.length; c++) {
                                const raw = String(row[c] || "").replace(/\+/g, "").trim();
                                const val = parseFloat(raw);
                                if (!isNaN(val) && raw !== "" && val >= 0.20 && val <= 20.00) count++;
                            }
                            return count;
                        };

                        // Find every sub-header row in the sheet (each block has "sph / cyl * axis" or "Add (+)" + addition columns)
                        const progBlockIndices = [];
                        for (let r = 0; r < rawData.length; r++) {
                            const row = rawData[r] || [];
                            const rowStr = row.map(c => String(c || "").trim().toLowerCase()).join(" ");
                            const rowCompact = rowStr.replace(/\s+/g, "");

                            const isHeaderKeywordRow =
                                rowCompact.includes("sph/cyl") ||
                                rowStr.includes("add (+)") ||
                                rowStr.includes("add(-)") ||
                                (rowStr.includes("add") && (rowStr.includes("rx") || rowStr.includes("sph") || rowStr.includes("power")));

                            if (isHeaderKeywordRow) {
                                if (countAddCandidates(row) >= 2) {
                                    if (!progBlockIndices.includes(r)) progBlockIndices.push(r);
                                } else if (r + 1 < rawData.length && countAddCandidates(rawData[r + 1]) >= 1) {
                                    if (!progBlockIndices.includes(r + 1)) progBlockIndices.push(r + 1);
                                } else if (r + 2 < rawData.length && countAddCandidates(rawData[r + 2]) >= 1) {
                                    if (!progBlockIndices.includes(r + 2)) progBlockIndices.push(r + 2);
                                }
                            }
                        }

                        // Fallback: If no keyword row matched, find first row with >= 2 addition values
                        if (progBlockIndices.length === 0) {
                            for (let r = 0; r < Math.min(10, rawData.length); r++) {
                                if (countAddCandidates(rawData[r]) >= 2) {
                                    progBlockIndices.push(r);
                                    break;
                                }
                            }
                        }

                        if (progBlockIndices.length === 0) {
                            progBlockIndices.push(Math.min(2, rawData.length - 1));
                        }

                        progBlockIndices.forEach((subHeaderRowIdx, bPos) => {
                            const subHeaderRow = rawData[subHeaderRowIdx] || [];
                            const nextBlockStart = bPos + 1 < progBlockIndices.length
                                ? Math.max(subHeaderRowIdx + 1, progBlockIndices[bPos + 1] - 2)
                                : rawData.length;

                            // Extract product name from banner row 1-3 rows above this sub-header
                            let blockProdName = "";
                            for (let br = Math.max(0, subHeaderRowIdx - 3); br < subHeaderRowIdx; br++) {
                                const bRow = rawData[br] || [];
                                for (let bc = 0; bc < bRow.length; bc++) {
                                    const cell = stripActionSuffix(bRow[bc]);
                                    const lc = cell.toLowerCase();
                                    if (
                                        cell &&
                                        cell.length > 2 &&
                                        !["sph", "rx", "add", "add (+)", "add (-)", "(+)", "(-)", "pairs", "power"].includes(lc) &&
                                        !lc.startsWith("add") &&
                                        !lc.replace(/\s+/g, "").startsWith("sph/cyl")
                                    ) {
                                        blockProdName = lc.startsWith("sales order -")
                                            ? cell.substring("sales order -".length).replace(/\(.*?\)/g, "").trim()
                                            : cell;
                                        break;
                                    }
                                }
                                if (blockProdName) break;
                            }
                            if (!blockProdName) {
                                blockProdName = stripActionSuffix(detectedProductName) || selectedProduct?.productName || "";
                            }

                            // Find left distance column & addition start column
                            let firstAddCol = -1;
                            for (let c = 0; c < subHeaderRow.length; c++) {
                                const raw = String(subHeaderRow[c] || "").replace(/\+/g, "").trim();
                                const val = parseFloat(raw);
                                if (!isNaN(val) && raw !== "" && val >= 0.20 && val <= 20.00) {
                                    firstAddCol = c;
                                    break;
                                }
                            }

                            // Detect Rx Column (e.g. from "sph / cyl * axis" cell in row above or fallback)
                            let detectedRxCol = -1;
                            for (let rCheck = Math.max(0, subHeaderRowIdx - 2); rCheck <= subHeaderRowIdx; rCheck++) {
                                const rRow = rawData[rCheck] || [];
                                for (let c = 0; c < rRow.length; c++) {
                                    const val = String(rRow[c] || "").trim().toLowerCase().replace(/\s+/g, "");
                                    if (val.startsWith("sph/cyl") || val === "rx" || val.startsWith("distance")) {
                                        detectedRxCol = c;
                                        break;
                                    }
                                }
                                if (detectedRxCol >= 0) break;
                            }
                            const rxCol = detectedRxCol >= 0 ? detectedRxCol : (firstAddCol > 0 ? firstAddCol - 1 : 0);

                            // Check for right table (legacy Dual Table)
                            let rightSphCol = -1;
                            for (let c = Math.max(0, firstAddCol) + 2; c < subHeaderRow.length; c++) {
                                const cell = String(subHeaderRow[c] || "").trim().toLowerCase();
                                if (cell === "(-)" || (cell === "sph" && c > firstAddCol + 5)) {
                                    rightSphCol = c;
                                    break;
                                }
                            }

                            const leftAddCols = [];
                            const rightAddCols = [];
                            const endLeft = rightSphCol > 0 ? rightSphCol : subHeaderRow.length;

                            for (let c = firstAddCol; c < endLeft; c++) {
                                const raw = String(subHeaderRow[c] || "").replace(/\+/g, "").trim();
                                const val = parseFloat(raw);
                                if (!isNaN(val) && raw !== "") leftAddCols.push({ colIdx: c, addVal: val.toFixed(2) });
                            }

                            if (rightSphCol > 0) {
                                for (let c = rightSphCol + 1; c < subHeaderRow.length; c++) {
                                    const raw = String(subHeaderRow[c] || "").replace(/\+/g, "").trim();
                                    const val = parseFloat(raw);
                                    if (!isNaN(val) && raw !== "") rightAddCols.push({ colIdx: c, addVal: val.toFixed(2) });
                                }
                            }

                            for (let r = subHeaderRowIdx + 1; r < nextBlockStart; r++) {
                                const row = rawData[r];
                                if (!row || row.every(c => c === "" || c === undefined)) continue;

                                let rawLeft = row[rxCol];
                                let parsedLeft = parseDistPower(rawLeft, false);
                                if (!parsedLeft && firstAddCol > 0) {
                                    for (let c = 0; c < firstAddCol; c++) {
                                        const p = parseDistPower(row[c], false);
                                        if (p) {
                                            parsedLeft = p;
                                            break;
                                        }
                                    }
                                }

                                if (parsedLeft) {
                                    leftAddCols.forEach(({ colIdx, addVal }) => {
                                        const cellRaw = row[colIdx];
                                        if (cellRaw !== "" && cellRaw !== undefined && cellRaw !== "-") {
                                            const valNum = parseFloat(String(cellRaw).trim());
                                            if (!isNaN(valNum)) {
                                                const updateObj = {
                                                    productName: blockProdName,
                                                    sph: parsedLeft.sph,
                                                    cyl: parsedLeft.cyl,
                                                    axis: parsedLeft.axis,
                                                    addition: `+${addVal}`,
                                                    value: valNum,
                                                };
                                                if (action === "UPDATE_QTY") updateObj.qty = valNum;
                                                else if (action === "UPDATE_SELLING_PRICE") updateObj.sellingPrice = valNum;
                                                else if (action === "UPDATE_BUYING_PRICE") updateObj.buyingPrice = valNum;
                                                else if (action === "UPDATE_MRP") updateObj.mrp = valNum;
                                                else {
                                                    updateObj.sellingPrice = valNum;
                                                    updateObj.buyingPrice = valNum;
                                                    updateObj.mrp = valNum;
                                                }

                                                const key = `${blockProdName}__${parsedLeft.sph}_${parsedLeft.cyl || '0.00'}_${parsedLeft.axis || ''}_${addVal}`;
                                                updatesMap.set(key, updateObj);
                                                if (parseFloat(parsedLeft.sph) >= 0) totalPosCount++;
                                                else totalNegCount++;
                                            }
                                        }
                                    });
                                }

                                if (rightSphCol > 0) {
                                    const rawRight = row[rightSphCol];
                                    const parsedRight = parseDistPower(rawRight, true);
                                    if (parsedRight) {
                                        rightAddCols.forEach(({ colIdx, addVal }) => {
                                            const cellRaw = row[colIdx];
                                            if (cellRaw !== "" && cellRaw !== undefined && cellRaw !== "-") {
                                                const valNum = parseFloat(String(cellRaw).trim());
                                                if (!isNaN(valNum)) {
                                                    const updateObj = {
                                                        productName: blockProdName,
                                                        sph: parsedRight.sph,
                                                        cyl: parsedRight.cyl,
                                                        axis: parsedRight.axis,
                                                        addition: `+${addVal}`,
                                                        value: valNum,
                                                        isPositive: false,
                                                    };
                                                    if (action === "UPDATE_QTY") updateObj.qty = valNum;
                                                    else if (action === "UPDATE_SELLING_PRICE") updateObj.sellingPrice = valNum;
                                                    else if (action === "UPDATE_BUYING_PRICE") updateObj.buyingPrice = valNum;
                                                    else if (action === "UPDATE_MRP") updateObj.mrp = valNum;
                                                    else {
                                                        updateObj.sellingPrice = valNum;
                                                        updateObj.buyingPrice = valNum;
                                                        updateObj.mrp = valNum;
                                                    }

                                                    const key = `${blockProdName}__${parsedRight.sph}_${parsedRight.cyl || '0.00'}_${parsedRight.axis || ''}_${addVal}`;
                                                    updatesMap.set(key, updateObj);
                                                    totalNegCount++;
                                                }
                                            }
                                        });
                                    }
                                }
                            }
                        });
                    }
                });

                const cleanDetectedName = detectedProductName
                    ? detectedProductName
                        .replace(/\s*\((Pairs|Pairs \/ Stock Qty|Selling Price \(₹\)|Buying Price \(₹\)|MRP \(₹\)|Quantity \/ Price)\)\s*$/i, "")
                        .trim()
                    : "";

                const distinctParsedProducts = Array.from(
                    new Set(Array.from(updatesMap.values()).map(u => u.productName).filter(Boolean))
                );

                if (distinctParsedProducts.length <= 1 && cleanDetectedName) {
                    setSearchTerm(cleanDetectedName);
                    if (!selectedProduct || selectedProduct.productName?.toUpperCase() !== cleanDetectedName.toUpperCase()) {
                        setSelectedProduct({ productName: cleanDetectedName });
                        api.get(`/api/digi/product/lens/matrix-data?productName=${encodeURIComponent(cleanDetectedName)}`)
                            .then(res => {
                                if (res.data?.success) setMatrixData(res.data);
                            })
                            .catch(err => console.error("Auto matrix data fetch error:", err));
                    }
                }

                const updates = Array.from(updatesMap.values());
                if (updates.length === 0) {
                    throw new Error("No numeric values found in the uploaded matrix workbook cells.");
                }

                setParsedUpdates(updates);
                setMatrixStats({
                    totalCells: updates.length,
                    productCount: distinctParsedProducts.length || 1,
                    format: detectedFormat || "SPH_CYL",
                    formatLabel: detectedFormat === "SPH_ADD"
                        ? (distinctParsedProducts.length > 1
                            ? `Progressive / Bifocal (${distinctParsedProducts.length} Products)`
                            : "Progressive / Bifocal ((SPH/CYL×AXIS) × ADD)")
                        : "Single Vision (SPH × CYL)",
                    posCount: totalPosCount,
                    negCount: totalNegCount,
                    productName: distinctParsedProducts.length > 1
                        ? `${distinctParsedProducts.length} Progressive/Bifocal Products`
                        : (cleanDetectedName || selectedProduct?.productName),
                });
                setParseError("");
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
        const fallbackProdName = selectedProduct?.productName || matrixStats?.productName || searchTerm.trim();
        if (!parsedUpdates || parsedUpdates.length === 0) {
            return toast.error("No valid matrix updates to apply.");
        }

        // Group updates by productName (supports single product & multi-product Progressive sheets)
        const groupedByProd = new Map();
        parsedUpdates.forEach((u) => {
            const pName = (u.productName || fallbackProdName || "").trim();
            if (!pName) return;
            if (!groupedByProd.has(pName)) groupedByProd.set(pName, []);
            groupedByProd.get(pName).push(u);
        });

        if (groupedByProd.size === 0) {
            return toast.error("Please select a lens product in Step 1 or ensure product name is in the Excel banner.");
        }

        setSubmitting(true);
        try {
            const priceTypeLabel = action === "UPDATE_SELLING_PRICE" ? "Selling Price" : action === "UPDATE_BUYING_PRICE" ? "Buying Price" : action === "UPDATE_MRP" ? "MRP" : "Buying, Selling & MRP";
            let successCount = 0;
            let lastSuccessMsg = "";

            for (const [pName, prodUpdates] of groupedByProd.entries()) {
                const payload = {
                    productName: pName,
                    action,
                    priceType: priceTypeLabel,
                    updates: prodUpdates,
                };
                const res = await api.post("/api/digi/product/lens/matrix-update", payload);
                if (res.data?.success) {
                    successCount++;
                    lastSuccessMsg = res.data.message;
                } else {
                    throw new Error(res.data?.message || `Failed to update "${pName}"`);
                }
            }

            toast.success(
                groupedByProd.size > 1
                    ? `Updated ${parsedUpdates.length} combinations across ${successCount} product(s)!`
                    : (lastSuccessMsg || `Successfully updated ${parsedUpdates.length} lens combinations!`)
            );
            setUploadedFile(null);
            setParsedUpdates([]);
            setMatrixStats(null);

            const firstProdName = Array.from(groupedByProd.keys())[0];
            const targetProduct = selectedProduct?.productName
                ? selectedProduct
                : (firstProdName ? { productName: firstProdName } : null);
            if (targetProduct) {
                await handleSelectProduct(targetProduct);
            }

            if (typeof onRefreshInventory === "function") {
                onRefreshInventory();
            }
        } catch (err) {
            console.error("Apply matrix update error:", err);
            toast.error(err.response?.data?.message || err.message || "Failed to update lens combinations");
        } finally {
            setSubmitting(false);
        }
    };

    // Filter history based on search query & classification filter
    const filteredHistory = historyList.filter(h => {
        const classification = getLensClassification(h);

        if (historyCategoryFilter !== "ALL") {
            if (historyCategoryFilter === "SINGLE_VISION" && classification.type !== "Single Vision") return false;
            if (historyCategoryFilter === "PROGRESSIVE" && classification.type !== "Progressive" && classification.type !== "Progressive / Bifocal") return false;
            if (historyCategoryFilter === "BIFOCAL" && classification.type !== "Bifocal") return false;
        }

        if (!historySearch.trim()) return true;
        const q = historySearch.toLowerCase();
        return (
            (h.productName || "").toLowerCase().includes(q) ||
            (h.brand || "").toLowerCase().includes(q) ||
            (h.action || "").toLowerCase().includes(q) ||
            classification.label.toLowerCase().includes(q) ||
            classification.type.toLowerCase().includes(q)
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

    previewProducts.forEach(p => {
        const qtyNum = p.qty || 0;
        totalStockPreview += qtyNum;

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

            // Exact key only — prevents cross-contamination across cylinders/axes
            uiSphAddLookup.set(`${sStr}_${cStr}_${ax}_${aStr}`, p);
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

    const filteredUiCombosList = gridRxFilter.trim()
        ? uiCombosList.filter((combo) =>
            formatDistRxCell(combo.s, combo.c, combo.ax)
                .toLowerCase()
                .includes(gridRxFilter.trim().toLowerCase())
        )
        : uiCombosList;

    if (uiDetectedSphs.size === 0) uiDetectedSphs.add(0);
    if (uiDetectedCyls.size === 0) uiDetectedCyls.add(0);

    const defaultAdds = [1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00];
    const hasCustomUiAddStep = Array.from(uiDetectedAdds).some(
        a => Math.abs(Math.round(a / 0.25) * 0.25 - a) > 0.001
    );
    const uiAddList = uiDetectedAdds.size > 0
        ? (hasCustomUiAddStep
            ? Array.from(uiDetectedAdds).sort((a, b) => a - b)
            : Array.from(new Set([...defaultAdds, ...Array.from(uiDetectedAdds)])).sort((a, b) => a - b))
        : defaultAdds;

    // ── Single Vision 4 Quadrants Range Calculations (++, -+, +-, --) ──
    const qPosSphList = buildSvAxisValues(uiDetectedSphs, { direction: "pos", startAbs: 0.00, defaultMaxAbs: 3.00 });
    const qNegSphList = buildSvAxisValues(uiDetectedSphs, { direction: "neg", startAbs: 0.00, defaultMaxAbs: 3.00 });
    const qNegCylList = buildSvAxisValues(uiDetectedCyls, { direction: "neg", startAbs: 0.00, defaultMaxAbs: 2.00 });
    const qPosCylList = buildSvAxisValues(uiDetectedCyls, { direction: "pos", startAbs: 0.25, defaultMaxAbs: 2.00 });

    const svQuadrants = [
        {
            id: "SPH+_CYL+",
            code: "++",
            title: "++ | SPH (+) / Cyl (+)",
            shortTitle: "++ (SPH+ / CYL+)",
            sphSign: "(+)",
            cylGroupLabel: "Cyl (+)",
            isNegSphSide: false,
            sphs: qPosSphList,
            cyls: qPosCylList,
            filter: (p) => (numPower(p.sph) ?? 0) >= 0 && (numPower(p.cyl) ?? 0) > 0,
        },
        {
            id: "SPH-_CYL+",
            code: "-+",
            title: "-+ | SPH (-) / Cyl (+)",
            shortTitle: "-+ (SPH- / CYL+)",
            sphSign: "(-)",
            cylGroupLabel: "Cyl (+)",
            isNegSphSide: true,
            sphs: qNegSphList,
            cyls: qPosCylList,
            filter: (p) => (numPower(p.sph) ?? 0) <= 0 && (numPower(p.cyl) ?? 0) > 0,
        },
        {
            id: "SPH+_CYL-",
            code: "+-",
            title: "+- | SPH (+) / Cyl (-)",
            shortTitle: "+- (SPH+ / CYL-)",
            sphSign: "(+)",
            cylGroupLabel: "Cyl (-)",
            isNegSphSide: false,
            sphs: qPosSphList,
            cyls: qNegCylList,
            filter: (p) => (numPower(p.sph) ?? 0) >= 0 && (numPower(p.cyl) ?? 0) <= 0,
        },
        {
            id: "SPH-_CYL-",
            code: "--",
            title: "-- | SPH (-) / Cyl (-)",
            shortTitle: "-- (SPH- / CYL-)",
            sphSign: "(-)",
            cylGroupLabel: "Cyl (-)",
            isNegSphSide: true,
            sphs: qNegSphList,
            cyls: qNegCylList,
            filter: (p) => (numPower(p.sph) ?? 0) <= 0 && (numPower(p.cyl) ?? 0) <= 0,
        },
    ];

    svQuadrants.forEach(q => {
        q.items = previewProducts.filter(q.filter);
        q.count = q.items.length;
    });

    const renderPreviewCell = (item, cellKey, rxLabel) => {
        return (
            <td
                key={cellKey}
                className={`border border-gray-200 p-1.5 transition ${item ? "bg-emerald-50/40 hover:bg-emerald-100/50" : "bg-white"}`}
                title={item ? `Code: ${item.productCode}\nRx: ${rxLabel || ""}\nStock: ${item.qty} units\nSelling Price: ₹${item.sellingPrice ?? item.price ?? 0}\nBuying Price: ₹${item.buyingPrice ?? item.price ?? 0}\nMRP: ₹${item.mrp ?? 0}` : "No product combination"}
            >
                {item ? (
                    <div className="flex flex-col items-center justify-center">
                        {previewMetric === "qty" ? (
                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md font-bold text-xs ${(item.qty || 0) > 0 ? "bg-emerald-500 text-white shadow-2xs" : "bg-amber-100 text-amber-800"}`}>
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
    };

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-[96vw] xl:max-w-7xl max-h-[94vh] flex flex-col overflow-hidden border border-gray-200">

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
                                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                                    selectedProduct && matrixData
                                        ? (effectiveFormat === "SPH_CYL"
                                            ? "bg-blue-50 text-[#2980b9] border-blue-200"
                                            : selectedClassification.badgeClass)
                                        : "bg-blue-50 text-[#2980b9] border-blue-200"
                                }`}>
                                    {selectedProduct && matrixData
                                        ? (effectiveFormat === "SPH_CYL"
                                            ? "SINGLE VISION (SPH × CYL)"
                                            : `${selectedClassification.label.toUpperCase()} (sph/cyl*axis × ADD)`)
                                        : "SINGLE VISION & PROGRESSIVE / BIFOCAL"}
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
                                                    {effectiveFormat === "SPH_CYL" ? "Single Vision (SPH × CYL)" : "Progressive / Bifocal (sph/cyl*axis × ADD)"}
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

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                            <option value="UPDATE_SELLING_PRICE">Update Selling Price Only</option>
                                            <option value="UPDATE_BUYING_PRICE">Update Buying Price Only</option>
                                            <option value="UPDATE_MRP">Update MRP Only</option>
                                        </select>
                                    </div>

                                    {/* Download Button */}
                                    <div className="flex items-end">
                                        <button
                                            onClick={handleExportExcel}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
                                        >
                                            <FiDownload size={14} />
                                            <span>
                                                Export {effectiveFormat === "SPH_CYL" ? "SPH × CYL" : "sph/cyl*axis × ADD"} Excel (.xlsx)
                                            </span>
                                        </button>
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
                                                <span className="text-xs font-bold text-gray-800">Live Inventory Preview</span><span className="text-xs text-gray-500 font-medium">({totalStockPreview} units)</span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                {effectiveFormat === "SPH_ADD" && (
                                                    <div className="relative">
                                                        <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                                                        <input
                                                            type="text"
                                                            value={gridRxFilter}
                                                            onChange={(e) => setGridRxFilter(e.target.value)}
                                                            placeholder="Filter Rx (e.g. 0.00, -0.25, x90)..."
                                                            className="pl-7 pr-2.5 py-1 text-[11px] border border-gray-200 rounded-lg outline-none focus:border-[#2980b9] bg-white text-gray-700 w-48"
                                                        />
                                                    </div>
                                                )}

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
                                <div className="p-3 space-y-4">
                                    {effectiveFormat === "SPH_CYL" ? (
                                        /* Single Vision 4 Quadrant Tables (++, -+, +-, --) */
                                        <div className="space-y-4">
                                            {/* Quadrant Filter Tabs */}
                                            <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-medium">
                                                <button
                                                    type="button"
                                                    onClick={() => setSvQuadrantTab("all")}
                                                    className={`px-3 py-1 rounded-lg transition ${
                                                        svQuadrantTab === "all"
                                                            ? "bg-white text-blue-700 font-bold shadow-xs"
                                                            : "text-gray-600 hover:text-gray-900"
                                                    }`}
                                                >
                                                    All 4 Tables (++, -+, +-, --)
                                                </button>
                                                {svQuadrants.map(q => (
                                                    <button
                                                        key={q.id}
                                                        type="button"
                                                        onClick={() => setSvQuadrantTab(q.id)}
                                                        className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 ${
                                                            svQuadrantTab === q.id
                                                                ? "bg-white text-blue-700 font-bold shadow-xs"
                                                                : "text-gray-600 hover:text-gray-900"
                                                        }`}
                                                    >
                                                        <span>{q.title}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${q.count > 0 ? "bg-blue-100 text-blue-800" : "bg-gray-200 text-gray-600"}`}>
                                                            {q.count}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Render 4 Quadrant Tables (2x2 Grid when All, single full-width when filtered) */}
                                            <div className={svQuadrantTab === "all" ? "grid grid-cols-1 xl:grid-cols-2 gap-4" : "space-y-4"}>
                                                {svQuadrants
                                                    .filter(q => svQuadrantTab === "all" || svQuadrantTab === q.id)
                                                    .map(q => (
                                                        <div key={q.id} className="border-2 border-gray-900 rounded-lg overflow-hidden shadow-2xs bg-white">
                                                            {/* Yellow Banner Header matching Image 1 */}
                                                            <div className="bg-[#FFFF00] text-black px-3 py-1.5 text-xs font-extrabold flex items-center justify-between border-b-2 border-gray-900">
                                                                <span>{matrixData?.productName || selectedProduct?.productName} — {q.title}</span>
                                                                <span className="text-[11px] font-mono bg-white/80 px-2 py-0.5 rounded border border-gray-800">
                                                                    {q.count} variants
                                                                </span>
                                                            </div>

                                                            <div className="overflow-x-auto max-h-[360px]">
                                                                <table className="w-full border-collapse text-center text-xs">
                                                                    <thead className="sticky top-0 z-20">
                                                                        {/* Row 1: SPH | Cyl (+) or Cyl (-) */}
                                                                        <tr className="bg-white text-black font-extrabold text-xs">
                                                                            <th className="sticky left-0 z-30 bg-white px-2.5 py-1.5 text-center border-r-2 border-b border-gray-900 min-w-[75px] w-[75px]">
                                                                                SPH
                                                                            </th>
                                                                            <th colSpan={q.cyls.length} className="px-3 py-1.5 text-left border-b border-gray-900">
                                                                                <span className="sticky left-[85px] inline-block">
                                                                                    {q.cylGroupLabel}
                                                                                </span>
                                                                            </th>
                                                                        </tr>
                                                                        {/* Row 2: (+) / (-) & CYL values with Light Cyan #DAEEF3 */}
                                                                        <tr className="bg-[#DAEEF3] text-black font-extrabold text-xs">
                                                                            <th className="sticky left-0 z-30 bg-[#DAEEF3] text-black font-extrabold px-2.5 py-1.5 border-r-2 border-b-2 border-gray-900 text-center min-w-[75px]">
                                                                                {q.sphSign}
                                                                            </th>
                                                                            {q.cyls.map((cVal) => (
                                                                                <th key={`c_${q.id}_${cVal}`} className="px-2 py-1.5 text-xs border-r border-b-2 border-gray-900 min-w-[56px] bg-[#DAEEF3] text-black font-extrabold text-center">
                                                                                    {cVal > 0 ? `+${cVal.toFixed(2)}` : cVal.toFixed(2)}
                                                                                </th>
                                                                            ))}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {q.sphs.map((sVal) => {
                                                                            return (
                                                                                <tr key={`s_${q.id}_${sVal}`} className="hover:bg-blue-50/20">
                                                                                    <td className="sticky left-0 z-10 font-mono font-extrabold p-1.5 text-xs border-r-2 border-b border-gray-900 text-center bg-[#DAEEF3] text-black">
                                                                                        {sVal === 0 ? "0.00" : (sVal > 0 ? `+${sVal.toFixed(2)}` : sVal.toFixed(2))}
                                                                                    </td>
                                                                                    {q.cyls.map((cVal) => {
                                                                                        const key = `${sVal.toFixed(2)}_${cVal.toFixed(2)}`;
                                                                                        const item = uiSphCylLookup.get(key);
                                                                                        return renderPreviewCell(item, `${q.id}_${key}`, `SPH ${sVal > 0 ? '+' : ''}${sVal.toFixed(2)} | CYL ${cVal > 0 ? '+' : ''}${cVal.toFixed(2)}`);
                                                                                    })}
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Progressive / Bifocal Matrix matching Image 3 */
                                        <div className="border-2 border-gray-900 rounded-lg overflow-hidden shadow-2xs bg-white">
                                            <div className="bg-[#FFFF00] text-black px-3.5 py-2 text-xs font-extrabold flex items-center justify-between border-b-2 border-gray-900">
                                                <span>{matrixData?.productName || selectedProduct?.productName} (Progressive / Bifocal)</span>
                                                <span className="text-[11px] font-mono bg-white/80 px-2 py-0.5 rounded border border-gray-800">
                                                    {filteredUiCombosList.length}{gridRxFilter ? ` / ${uiCombosList.length}` : ""} combinations
                                                </span>
                                            </div>
                                            <div className="overflow-x-auto max-h-[420px]">
                                                <table className="w-full border-collapse text-center text-xs">
                                                    <thead className="sticky top-0 z-20">
                                                        {/* Row 1: sph / cyl * axis | Add (+) */}
                                                        <tr className="bg-white text-black font-extrabold text-xs">
                                                            <th className="sticky left-0 z-30 bg-white px-3.5 py-1.5 text-center border-r-2 border-b border-gray-900 min-w-[140px] w-[140px]">
                                                                sph / cyl * axis
                                                            </th>
                                                            <th colSpan={uiAddList.length} className="px-4 py-1.5 text-left border-b border-gray-900">
                                                                <span className="sticky left-[156px] inline-block">
                                                                    Add (+)
                                                                </span>
                                                            </th>
                                                        </tr>
                                                        {/* Row 2: empty cell below sph/cyl*axis | Light Cyan ADD values */}
                                                        <tr className="bg-[#DAEEF3] text-black font-extrabold text-xs">
                                                            <th className="sticky left-0 z-30 bg-white text-black font-extrabold px-3 py-2 border-r-2 border-b-2 border-gray-900 text-center min-w-[140px]">
                                                                
                                                            </th>
                                                            {uiAddList.map(a => (
                                                                <th key={a} className="p-2 border-r border-b-2 border-gray-900 min-w-[65px] bg-[#DAEEF3] text-black font-extrabold text-center">
                                                                    {a.toFixed(2)}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredUiCombosList.map((combo) => {
                                                            const rowLabel = formatDistRxCell(combo.s, combo.c, combo.ax);
                                                            return (
                                                                <tr key={`${combo.s}_${combo.c}_${combo.ax}`} className="hover:bg-blue-50/20">
                                                                    <td className="sticky left-0 z-10 bg-white font-mono font-extrabold p-2 border-r-2 border-b border-gray-900 text-center whitespace-nowrap text-black text-xs">
                                                                        {rowLabel}
                                                                    </td>
                                                                    {uiAddList.map(a => {
                                                                        const sStr = combo.s.toFixed(2);
                                                                        const cStr = combo.c.toFixed(2);
                                                                        const ax = combo.ax;
                                                                        const aStr = a.toFixed(2);
                                                                        const item = uiSphAddLookup.get(`${sStr}_${cStr}_${ax}_${aStr}`);
                                                                        return renderPreviewCell(item, `${combo.s}_${combo.c}_${combo.ax}_${a}`, `${rowLabel} | ADD +${aStr}`);
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
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1">
                                <div>
                                    <h3 className="text-xs sm:text-sm font-bold text-gray-800">
                                        Lens Generation &amp; Inventory History
                                    </h3>
                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                        Identifies Single Vision, Progressive, and Bifocal lenses with all power ranges and pricing
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:w-72">
                                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                                        <input
                                            type="text"
                                            value={historySearch}
                                            onChange={(e) => setHistorySearch(e.target.value)}
                                            placeholder="Search product, brand, or lens type..."
                                            className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-[#2980b9] bg-white text-gray-700"
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

                            {/* Lens Classification Filter Tabs */}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <button
                                    onClick={() => setHistoryCategoryFilter("ALL")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                                        historyCategoryFilter === "ALL"
                                            ? "bg-[#2980b9] text-white border-[#2980b9] shadow-2xs"
                                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                    }`}
                                >
                                    <span>All Lenses</span>
                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                                        historyCategoryFilter === "ALL" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                                    }`}>{historyCounts.all}</span>
                                </button>
                                <button
                                    onClick={() => setHistoryCategoryFilter("SINGLE_VISION")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                                        historyCategoryFilter === "SINGLE_VISION"
                                            ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                                            : "bg-white text-blue-800 border-blue-200 hover:bg-blue-50/60"
                                    }`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    <span>Single Vision (SPH × CYL)</span>
                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                                        historyCategoryFilter === "SINGLE_VISION" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"
                                    }`}>{historyCounts.sv}</span>
                                </button>
                                <button
                                    onClick={() => setHistoryCategoryFilter("PROGRESSIVE")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                                        historyCategoryFilter === "PROGRESSIVE"
                                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                                            : "bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50/60"
                                    }`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    <span>Progressive</span>
                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                                        historyCategoryFilter === "PROGRESSIVE" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                                    }`}>{historyCounts.prog}</span>
                                </button>
                                <button
                                    onClick={() => setHistoryCategoryFilter("BIFOCAL")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                                        historyCategoryFilter === "BIFOCAL"
                                            ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                                            : "bg-white text-purple-800 border-purple-200 hover:bg-purple-50/60"
                                    }`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                    <span>Bifocal</span>
                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                                        historyCategoryFilter === "BIFOCAL" ? "bg-white/20 text-white" : "bg-purple-100 text-purple-800"
                                    }`}>{historyCounts.bif}</span>
                                </button>
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
                                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-xs max-h-[60vh]">
                                    <table className="w-full text-xs text-left">
                                        <thead className="sticky top-0 z-10 bg-gray-100/95 shadow-2xs border-b border-gray-200">
                                            <tr className="text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                                                <th className="px-4 py-3 min-w-[210px]">Product Name &amp; Classification</th>
                                                <th className="px-3 py-3 text-center min-w-[130px]">Event / Action</th>
                                                <th className="px-3 py-3 text-center min-w-[80px]">Combinations</th>
                                                <th className="px-3 py-3 text-center min-w-[80px]">Total Stock</th>
                                                <th className="px-3 py-3 min-w-[180px]">Power Ranges</th>
                                                <th className="px-3 py-3 text-right min-w-[90px]">Buying Price</th>
                                                <th className="px-3 py-3 text-right min-w-[90px]">Selling Price</th>
                                                <th className="px-3 py-3 text-right min-w-[85px]">MRP</th>
                                                <th className="px-4 py-3 min-w-[130px]">Date &amp; Time</th>
                                                <th className="px-4 py-3 text-center min-w-[105px]">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {filteredHistory.map((item) => {
                                                const classification = getLensClassification(item);
                                                return (
                                                    <tr key={item._id || `${item.productName}_${item.timestamp}`} className="hover:bg-blue-50/40 transition">
                                                        <td className="px-4 py-3">
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                <span className="font-bold text-gray-900 text-xs sm:text-sm">{item.productName}</span>
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${classification.badgeClass}`}>
                                                                    <span className={`w-1.5 h-1.5 rounded-full mr-1 ${classification.dotColor}`}></span>
                                                                    {classification.label}
                                                                </span>
                                                            </div>
                                                            <div className="text-[11px] text-gray-400 font-normal mt-0.5">
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
                                                            <span className={`inline-block mt-1 px-1.5 py-0.5 text-[9px] font-bold rounded border ${classification.badgeClass}`}>
                                                                {classification.tag}
                                                            </span>
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
                                                );
                                            })}
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
