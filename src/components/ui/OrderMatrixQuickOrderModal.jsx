import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
    FiX,
    FiSearch,
    FiGrid,
    FiCheckCircle,
    FiPackage,
    FiAlertCircle,
    FiRefreshCw,
    FiTrash2,
    FiPlus,
    FiMinus,
    FiLayers,
} from "react-icons/fi";
import { toast } from "react-toastify";
import api from "../../services/apiInstance";

// ── Shared Single Vision axis builder ──
const buildSvAxisValues = (detectedSet, { direction, startAbs, defaultMaxAbs = 2.00 }) => {
    const sign = direction === "pos" ? 1 : -1;
    const sideDetected = Array.from(detectedSet)
        .filter((v) => (direction === "pos" ? (startAbs === 0 ? v >= 0 : v > 0) : (startAbs === 0 ? v <= 0 : v < 0)))
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

const numPower = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = parseFloat(String(v).replace(/\+/g, "").trim());
    return isNaN(n) ? null : n;
};

const formatDistRxCell = (sph, cyl, axis) => {
    const s = sph === 0 ? "0.00" : (sph > 0 ? `+${sph.toFixed(2)}` : sph.toFixed(2));
    const c = cyl === 0 ? "0.00" : (cyl > 0 ? `+${cyl.toFixed(2)}` : cyl.toFixed(2));
    const ax = axis ? ` x ${axis}°` : "";
    return `${s} / ${c}${ax}`;
};

export default function OrderMatrixQuickOrderModal({
    isOpen,
    onClose,
    onAddProducts,
    initialProduct = null,
    targetRowIndex = null
}) {
    // ── Search & Selection State ──
    const [searchTerm, setSearchTerm] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [searching, setSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const searchTimeoutRef = useRef(null);

    // ── Matrix Data State ──
    const [matrixLoading, setMatrixLoading] = useState(false);
    const [matrixData, setMatrixData] = useState(null);

    // ── UI Filters, Quadrants & Pricing Display ──
    const [svQuadrantTab, setSvQuadrantTab] = useState("all"); // "all" | "SPH+_CYL+" | "SPH-_CYL+" | "SPH+_CYL-" | "SPH-_CYL-"
    const [priceMetric, setPriceMetric] = useState("sellingPrice"); // "sellingPrice" | "buyingPrice" | "mrp"
    const [gridRxFilter, setGridRxFilter] = useState("");
    const [quickFillQty, setQuickFillQty] = useState("");

    // ── Order Quantities Map (cellKey -> { qty, item, sph, cyl, axis, addition }) ──
    const [orderQtyMap, setOrderQtyMap] = useState({});

    // ── Fetch Matrix Data for a product name ──
    const fetchMatrixForProductName = async (prodName, prefillVariants = null) => {
        if (!prodName || !prodName.trim()) return;
        const cleanName = prodName.trim();
        setSelectedProduct({ productName: cleanName });
        setSearchTerm(cleanName);
        setShowSuggestions(false);
        setGridRxFilter("");

        setMatrixLoading(true);
        try {
            const res = await api.get(`/api/digi/product/lens/matrix-data?productName=${encodeURIComponent(cleanName)}`);
            if (res.data?.success) {
                const data = res.data;
                setMatrixData(data);

                // Pre-populate quantities if prefillVariants are provided
                if (prefillVariants && Array.isArray(prefillVariants) && prefillVariants.length > 0) {
                    const initMap = {};
                    const productsList = data.products || [];

                    const flatList = [];
                    prefillVariants.forEach(v => {
                        if (v.items && Array.isArray(v.items) && v.items.length > 0) {
                            flatList.push(...v.items);
                        } else {
                            flatList.push(v);
                        }
                    });

                    flatList.forEach(variant => {
                        const s = numPower(variant.sph) ?? 0;
                        const c = numPower(variant.cyl) ?? 0;
                        const a = numPower(variant.addition);
                        const ax = variant.axis || "";
                        const qty = Number(variant.qty || 1);

                        const matchedItem = productsList.find(p => {
                            const ps = numPower(p.sph) ?? 0;
                            const pc = numPower(p.cyl) ?? 0;
                            const pa = numPower(p.addition);
                            const pax = p.axis || "";
                            if (a !== null && a > 0) {
                                return ps === s && pc === c && pa === a && pax === ax;
                            }
                            return ps === s && pc === c;
                        });

                        if (a !== null && a > 0) {
                            const cellKey = `${s.toFixed(2)}_${c.toFixed(2)}_${ax}_${a.toFixed(2)}`;
                            initMap[cellKey] = {
                                qty,
                                item: matchedItem || variant,
                                sph: s.toFixed(2),
                                cyl: c.toFixed(2),
                                axis: ax,
                                addition: a.toFixed(2)
                            };
                        } else {
                            const qId = s >= 0
                                ? (c > 0 ? "SPH+_CYL+" : "SPH+_CYL-")
                                : (c > 0 ? "SPH-_CYL+" : "SPH-_CYL-");
                            const key = `${s.toFixed(2)}_${c.toFixed(2)}`;
                            const cellKey = `${qId}_${key}`;
                            initMap[cellKey] = {
                                qty,
                                item: matchedItem || variant,
                                sph: s.toFixed(2),
                                cyl: c.toFixed(2),
                                axis: ax,
                                addition: ""
                            };
                        }
                    });
                    setOrderQtyMap(initMap);
                } else {
                    setOrderQtyMap({});
                }
            } else {
                toast.error(res.data?.message || "Failed to load lens matrix data");
            }
        } catch (err) {
            console.error("Failed to load matrix data:", err);
            toast.error(err.response?.data?.message || "Failed to load matrix data");
        } finally {
            setMatrixLoading(false);
        }
    };

    // ── Handle Modal Open / Close / Initial Product Injection ──
    useEffect(() => {
        if (isOpen) {
            const initName = initialProduct?.productName || initialProduct?.itemName || (typeof initialProduct === "string" ? initialProduct : "");
            if (initName) {
                fetchMatrixForProductName(initName, initialProduct?.groupedVariants);
            } else {
                setSearchTerm("");
                setSelectedProduct(null);
                setMatrixData(null);
                setOrderQtyMap({});
            }
            setGridRxFilter("");
            setQuickFillQty("");
        } else {
            setSearchTerm("");
            setSuggestions([]);
            setSelectedProduct(null);
            setMatrixData(null);
            setOrderQtyMap({});
            setGridRxFilter("");
            setQuickFillQty("");
        }
    }, [isOpen, initialProduct]);

    // ── Search Lens Products (Debounced) ──
    useEffect(() => {
        if (!searchTerm || searchTerm.trim().length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        if (selectedProduct && selectedProduct.productName === searchTerm.trim()) {
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
    }, [searchTerm, selectedProduct]);

    // ── Format Detection (Single Vision vs Progressive) ──
    const effectiveFormat = useMemo(() => {
        if (!matrixData) return "SPH_CYL";
        const hasAdditions = (matrixData.additionValues && matrixData.additionValues.length > 0) ||
            (matrixData.products && matrixData.products.some(p => p.addition && p.addition !== "0.00" && p.addition !== ""));
        return hasAdditions ? "SPH_ADD" : "SPH_CYL";
    }, [matrixData]);

    // ── Pre-calculate Lookups & Ranges ──
    const previewProducts = matrixData?.products || [];
    const uiSphCylLookup = new Map();
    const uiSphAddLookup = new Map();
    const uiDetectedSphs = new Set();
    const uiDetectedCyls = new Set();
    const uiDetectedAdds = new Set();
    const uiCombosList = [];
    const uiComboKeySet = new Set();

    previewProducts.forEach((p) => {
        let s = numPower(p.sph);
        let c = numPower(p.cyl);
        let a = numPower(p.addition);
        const ax = p.axis || "";

        if (s !== null) uiDetectedSphs.add(s);
        if (c !== null) uiDetectedCyls.add(c);
        if (a !== null && a > 0) uiDetectedAdds.add(a);

        if (s !== null && c !== null) {
            uiSphCylLookup.set(`${s.toFixed(2)}_${c.toFixed(2)}`, p);
        }
        if (a !== null && a > 0) {
            const sVal = s ?? 0;
            const cVal = c ?? 0;
            uiSphAddLookup.set(`${sVal.toFixed(2)}_${cVal.toFixed(2)}_${ax}_${a.toFixed(2)}`, p);
        }

        const sVal = s ?? 0;
        const cVal = c ?? 0;
        const comboKey = `${sVal.toFixed(2)}_${cVal.toFixed(2)}_${ax}`;
        if (!uiComboKeySet.has(comboKey)) {
            uiComboKeySet.add(comboKey);
            uiCombosList.push({ s: sVal, c: cVal, ax });
        }
    });

    // Optical Sort for Progressive Row list
    uiCombosList.sort((a, b) => {
        const groupA = a.s === 0 ? 0 : (a.s > 0 ? 1 : 2);
        const groupB = b.s === 0 ? 0 : (b.s > 0 ? 1 : 2);
        if (groupA !== groupB) return groupA - groupB;
        if (groupA === 1) { if (a.s !== b.s) return a.s - b.s; }
        else if (groupA === 2) { if (a.s !== b.s) return b.s - a.s; }
        if (a.c !== b.c) return a.c - b.c;
        return (parseInt(a.ax, 10) || 0) - (parseInt(b.ax, 10) || 0);
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
    const uiAddList = uiDetectedAdds.size > 0
        ? Array.from(new Set([...defaultAdds, ...Array.from(uiDetectedAdds)])).sort((a, b) => a - b)
        : defaultAdds;

    // Single Vision 4 Quadrant Values (Matches exact optical specifications)
    const qPosSphList = buildSvAxisValues(uiDetectedSphs, { direction: "pos", startAbs: 0.00, defaultMaxAbs: 3.00 });
    const qNegSphList = buildSvAxisValues(uiDetectedSphs, { direction: "neg", startAbs: 0.25, defaultMaxAbs: 3.00 });
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
            filter: (p) => (numPower(p.sph) ?? 0) < 0 && (numPower(p.cyl) ?? 0) > 0,
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
            filter: (p) => (numPower(p.sph) ?? 0) < 0 && (numPower(p.cyl) ?? 0) <= 0,
        },
    ];

    svQuadrants.forEach(q => {
        q.items = previewProducts.filter(q.filter);
        q.count = q.items.length;
    });

    // ── Handle Quantity Input in Cell ──
    const handleQtyChange = (cellKey, item, sph, cyl, axis, addition, val) => {
        const num = parseInt(val, 10);
        setOrderQtyMap(prev => {
            const next = { ...prev };
            if (!val || isNaN(num) || num <= 0) {
                delete next[cellKey];
            } else {
                next[cellKey] = {
                    qty: num,
                    item,
                    sph,
                    cyl,
                    axis: axis || "",
                    addition: addition || "",
                };
            }
            return next;
        });
    };

    // ── Increment / Decrement Quick Stepper ──
    const adjustQty = (cellKey, item, sph, cyl, axis, addition, delta) => {
        const current = orderQtyMap[cellKey]?.qty || 0;
        const nextVal = Math.max(0, current + delta);
        handleQtyChange(cellKey, item, sph, cyl, axis, addition, nextVal === 0 ? "" : nextVal);
    };

    // ── Quick Fill All Visible Cells with a set Quantity ──
    const handleQuickFill = () => {
        const fillNum = parseInt(quickFillQty, 10);
        if (!fillNum || fillNum <= 0) {
            return toast.info("Please enter a valid positive quantity to quick fill.");
        }

        const updated = { ...orderQtyMap };
        let count = 0;

        if (effectiveFormat === "SPH_CYL") {
            const quadsToFill = svQuadrantTab === "all"
                ? svQuadrants
                : svQuadrants.filter(q => q.id === svQuadrantTab);

            quadsToFill.forEach(q => {
                q.sphs.forEach(sVal => {
                    q.cyls.forEach(cVal => {
                        const key = `${sVal.toFixed(2)}_${cVal.toFixed(2)}`;
                        const cellKey = `${q.id}_${key}`;
                        const item = uiSphCylLookup.get(key);
                        if (item) {
                            updated[cellKey] = {
                                qty: fillNum,
                                item,
                                sph: sVal.toFixed(2),
                                cyl: cVal.toFixed(2),
                                axis: "",
                                addition: "",
                            };
                            count++;
                        }
                    });
                });
            });
        } else {
            filteredUiCombosList.forEach(combo => {
                uiAddList.forEach(a => {
                    const aStr = a.toFixed(2);
                    const sStr = combo.s.toFixed(2);
                    const cStr = combo.c.toFixed(2);
                    const cellKey = `${combo.s}_${combo.c}_${combo.ax}_${a}`;
                    const item = uiSphAddLookup.get(`${sStr}_${cStr}_${combo.ax}_${aStr}`);
                    if (item) {
                        updated[cellKey] = {
                            qty: fillNum,
                            item,
                            sph: sStr,
                            cyl: cStr,
                            axis: combo.ax || "",
                            addition: aStr,
                        };
                        count++;
                    }
                });
            });
        }

        setOrderQtyMap(updated);
        toast.success(`Quick-filled ${count} combinations with ${fillNum} pcs each.`);
    };

    const handleClearAll = () => {
        setOrderQtyMap({});
        toast.info("Cleared all selected matrix quantities.");
    };

    // ── Cart / Totals Calculations (Respecting Range-Based Pricing) ──
    const selectedEntries = Object.values(orderQtyMap);
    const selectedPowersCount = selectedEntries.length;
    const totalSelectedQty = selectedEntries.reduce((sum, e) => sum + (e.qty || 0), 0);
    const totalEstimatedAmount = selectedEntries.reduce((sum, e) => {
        const itemPrice = priceMetric === "buyingPrice"
            ? Number(e.item?.buyingPrice ?? e.item?.price ?? 0)
            : priceMetric === "mrp"
            ? Number(e.item?.mrp ?? 0)
            : Number(e.item?.sellingPrice ?? e.item?.price ?? matrixData?.minSellingPrice ?? 0);
        return sum + (itemPrice * (e.qty || 0));
    }, 0);

    // ── Helper to format optical range summary ──
    const formatRangeSummary = (entries) => {
        const sphNums = [];
        const cylNums = [];
        const addNums = [];
        const axisVals = [];

        entries.forEach(e => {
            const s = numPower(e.sph);
            const c = numPower(e.cyl);
            const a = numPower(e.addition);
            if (s !== null) sphNums.push(s);
            if (c !== null) cylNums.push(c);
            if (a !== null && a > 0) addNums.push(a);
            if (e.axis && e.axis !== "0" && e.axis !== "") axisVals.push(e.axis);
        });

        const parts = [];
        const fmt = (n) => (n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2));

        if (sphNums.length > 0) {
            const minS = Math.min(...sphNums);
            const maxS = Math.max(...sphNums);
            parts.push(minS === maxS ? `SPH: ${fmt(minS)}` : `SPH: ${fmt(minS)} to ${fmt(maxS)}`);
        }
        if (cylNums.length > 0) {
            const minC = Math.min(...cylNums);
            const maxC = Math.max(...cylNums);
            parts.push(minC === maxC ? `CYL: ${fmt(minC)}` : `CYL: ${fmt(minC)} to ${fmt(maxC)}`);
        }
        if (addNums.length > 0) {
            const minA = Math.min(...addNums);
            const maxA = Math.max(...addNums);
            parts.push(minA === maxA ? `ADD: +${minA.toFixed(2)}` : `ADD: +${minA.toFixed(2)} to +${maxA.toFixed(2)}`);
        }
        if (axisVals.length > 0) {
            const uniqueAxes = Array.from(new Set(axisVals));
            parts.push(`AXIS: ${uniqueAxes.join(", ")}°`);
        }

        return parts.length > 0 ? parts.join(" | ") : "Standard Power";
    };

    // ── Build Range Groups for contiguous combinations on same row / power ──
    // ── Build 2D Range Groups for contiguous combinations (both SPH & CYL/ADD) ──
    const build2DChunkRangeObj = (block) => {
        const fmt = (n) => (n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2));
        const allEntries = block.flatMap(r => r.chunk);
        const totalQty = allEntries.reduce((sum, e) => sum + Number(e.qty || 1), 0);
        const first = allEntries[0];
        const firstItem = first.item;

        const isProg = block[0].isProg;
        const c = block[0].c;
        const ax = block[0].ax;
        const price = block[0].price;
        const minSec = block[0].minSec;
        const maxSec = block[0].maxSec;

        const allS = block.map(r => r.s);
        const minS = Math.min(...allS);
        const maxS = Math.max(...allS);

        const sStr = minS === maxS ? fmt(minS) : `${fmt(minS)} to ${fmt(maxS)}`;
        const sphLabel = `SPH: ${sStr}`;

        let secLabel = "";
        if (isProg) {
            secLabel = minSec === maxSec ? `ADD: +${minSec.toFixed(2)}` : `ADD: +${minSec.toFixed(2)} to +${maxSec.toFixed(2)}`;
        } else {
            secLabel = minSec === maxSec ? `CYL: ${fmt(minSec)}` : `CYL: ${fmt(minSec)} to ${fmt(maxSec)}`;
        }

        const axStr = ax && ax !== "0" ? ` x${ax}°` : "";
        const cStr = isProg && c !== 0 ? ` / CYL: ${fmt(c)}` : "";
        const label = `${sphLabel}${cStr} / ${secLabel}${axStr}`;

        const items = allEntries.map(e => ({
            productId: e.item?._id || e.item?.id || e.productId || "",
            productCode: e.item?.productCode || e.item?.code || e.productCode || "",
            sph: e.sph !== undefined ? e.sph : (e.sNum !== undefined ? fmt(e.sNum) : ""),
            cyl: e.cyl !== undefined ? e.cyl : (e.cNum !== undefined ? fmt(e.cNum) : ""),
            axis: e.axis || "",
            addition: e.addition !== undefined ? e.addition : (e.aNum !== undefined ? `+${Number(e.aNum).toFixed(2)}` : ""),
            qty: Number(e.qty || 1),
            price: Number(e.unitPrice || price),
            sellingPrice: Number(e.sVal || e.item?.sellingPrice || e.item?.price || price),
            buyingPrice: Number(e.bVal || e.item?.buyingPrice || e.item?.price || price),
            mrp: Number(e.mrpVal || e.item?.mrp || 0),
            availableStock: Number(e.item?.qty ?? e.availableStock ?? 0),
        }));

        return {
            id: `range_${minS.toFixed(2)}_${maxS.toFixed(2)}_${minSec.toFixed(2)}_${maxSec.toFixed(2)}`,
            label,
            isProg,
            sph: sStr,
            cyl: !isProg ? (minSec === maxSec ? fmt(minSec) : `${fmt(minSec)} to ${fmt(maxSec)}`) : (c !== 0 ? fmt(c) : "0.00"),
            addition: isProg ? (minSec === maxSec ? `+${minSec.toFixed(2)}` : `+${minSec.toFixed(2)} to +${maxSec.toFixed(2)}`) : "",
            axis: ax || "",
            minS,
            maxS,
            minSec,
            maxSec,
            price,
            sellingPrice: Number(first.sVal || firstItem?.sellingPrice || firstItem?.price || price),
            buyingPrice: Number(first.bVal || firstItem?.buyingPrice || firstItem?.price || price),
            mrp: Number(first.mrpVal || firstItem?.mrp || 0),
            qty: totalQty,
            variantsCount: allEntries.length,
            isRange: allEntries.length > 1,
            availableStock: Math.min(...allEntries.map(e => Number(e.item?.qty ?? e.availableStock ?? 0))),
            productCode: firstItem?.productCode || firstItem?.code || first.productCode || "",
            items,
        };
    };

    const buildRangeGroups = (entries) => {
        if (!entries || entries.length === 0) return [];

        const sphGroups = new Map();

        entries.forEach(entry => {
            const s = numPower(entry.sph) ?? 0;
            const c = numPower(entry.cyl) ?? 0;
            const a = numPower(entry.addition);
            const ax = entry.axis || "";
            const price = Number(entry.unitPrice || entry.price || 0);
            const isProg = a !== null && a > 0;

            const groupKey = isProg
                ? `PROG_${s.toFixed(2)}_${c.toFixed(2)}_${ax}_${price.toFixed(2)}`
                : `SV_${s.toFixed(2)}_${ax}_${price.toFixed(2)}`;

            if (!sphGroups.has(groupKey)) {
                sphGroups.set(groupKey, {
                    isProg,
                    s,
                    c,
                    ax,
                    price,
                    entries: [],
                });
            }
            sphGroups.get(groupKey).entries.push({
                ...entry,
                sNum: s,
                cNum: c,
                aNum: a,
                ax,
            });
        });

        // 1) First pass: group contiguous secondary powers (CYL or ADD) for each SPH row
        const rowChunks = [];

        sphGroups.forEach(group => {
            const { isProg, s, c, ax, price, entries: grpEntries } = group;

            if (isProg) {
                grpEntries.sort((x, y) => (x.aNum ?? 0) - (y.aNum ?? 0));
                let chunk = [grpEntries[0]];

                for (let i = 1; i < grpEntries.length; i++) {
                    const prev = grpEntries[i - 1].aNum ?? 0;
                    const curr = grpEntries[i].aNum ?? 0;
                    if (Math.abs(curr - prev) <= 0.26) {
                        chunk.push(grpEntries[i]);
                    } else {
                        const addVals = chunk.map(e => e.aNum ?? 0);
                        rowChunks.push({
                            isProg: true,
                            s,
                            c,
                            ax,
                            price,
                            minSec: Math.min(...addVals),
                            maxSec: Math.max(...addVals),
                            chunk
                        });
                        chunk = [grpEntries[i]];
                    }
                }
                if (chunk.length > 0) {
                    const addVals = chunk.map(e => e.aNum ?? 0);
                    rowChunks.push({
                        isProg: true,
                        s,
                        c,
                        ax,
                        price,
                        minSec: Math.min(...addVals),
                        maxSec: Math.max(...addVals),
                        chunk
                    });
                }
            } else {
                grpEntries.sort((x, y) => (x.cNum ?? 0) - (y.cNum ?? 0));
                let chunk = [grpEntries[0]];

                for (let i = 1; i < grpEntries.length; i++) {
                    const prev = grpEntries[i - 1].cNum ?? 0;
                    const curr = grpEntries[i].cNum ?? 0;
                    if (Math.abs(curr - prev) <= 0.26) {
                        chunk.push(grpEntries[i]);
                    } else {
                        const cylVals = chunk.map(e => e.cNum ?? 0);
                        rowChunks.push({
                            isProg: false,
                            s,
                            c: 0,
                            ax,
                            price,
                            minSec: Math.min(...cylVals),
                            maxSec: Math.max(...cylVals),
                            chunk
                        });
                        chunk = [grpEntries[i]];
                    }
                }
                if (chunk.length > 0) {
                    const cylVals = chunk.map(e => e.cNum ?? 0);
                    rowChunks.push({
                        isProg: false,
                        s,
                        c: 0,
                        ax,
                        price,
                        minSec: Math.min(...cylVals),
                        maxSec: Math.max(...cylVals),
                        chunk
                    });
                }
            }
        });

        // 2) Second pass: merge row chunks across contiguous SPH values that share identical secondary ranges & price
        const secGroups = new Map();

        rowChunks.forEach(rc => {
            const secKey = `${rc.isProg}_${(rc.c ?? 0).toFixed(2)}_${rc.ax}_${rc.price.toFixed(2)}_${rc.minSec.toFixed(2)}_${rc.maxSec.toFixed(2)}`;
            if (!secGroups.has(secKey)) {
                secGroups.set(secKey, []);
            }
            secGroups.get(secKey).push(rc);
        });

        const rangeGroups = [];

        secGroups.forEach(chunksForSec => {
            // Sort chunks by SPH ascending
            chunksForSec.sort((a, b) => a.s - b.s);

            let block = [chunksForSec[0]];
            for (let i = 1; i < chunksForSec.length; i++) {
                const prevS = chunksForSec[i - 1].s;
                const currS = chunksForSec[i].s;
                if (Math.abs(currS - prevS) <= 0.26) {
                    block.push(chunksForSec[i]);
                } else {
                    rangeGroups.push(build2DChunkRangeObj(block));
                    block = [chunksForSec[i]];
                }
            }
            if (block.length > 0) {
                rangeGroups.push(build2DChunkRangeObj(block));
            }
        });

        rangeGroups.sort((a, b) => {
            if (a.minS !== b.minS) return a.minS - b.minS;
            return (a.minSec ?? 0) - (b.minSec ?? 0);
        });

        return rangeGroups;
    };

    // ── Final: Construct Order Wizard Rows and Add to Order (Grouped by Price Break) ──
    const handleAddSelectedToOrder = () => {
        if (selectedEntries.length === 0 || totalSelectedQty <= 0) {
            return toast.error("Please enter quantity for at least one lens power.");
        }

        // Group selected entries by price break (unitPrice)
        const groupsMap = new Map();

        selectedEntries.forEach(entry => {
            const { qty, item, sph, cyl, axis, addition } = entry;
            const sVal = Number(item?.sellingPrice ?? item?.price ?? matrixData?.minSellingPrice ?? 0);
            const bVal = Number(item?.buyingPrice ?? item?.price ?? matrixData?.minBuyingPrice ?? 0);
            const mrpVal = Number(item?.mrp ?? sVal ?? 0);

            const unitPrice = priceMetric === "buyingPrice"
                ? (bVal > 0 ? bVal : sVal)
                : priceMetric === "mrp"
                ? (mrpVal > 0 ? mrpVal : sVal)
                : (sVal > 0 ? sVal : bVal);

            // Group key by unit price (price break)
            const groupKey = `price_${unitPrice.toFixed(2)}`;

            if (!groupsMap.has(groupKey)) {
                groupsMap.set(groupKey, {
                    unitPrice,
                    sellingPrice: sVal,
                    buyingPrice: bVal,
                    mrp: mrpVal,
                    entries: [],
                });
            }
            groupsMap.get(groupKey).entries.push({
                ...entry,
                sVal,
                bVal,
                mrpVal,
                unitPrice,
            });
        });

        const newOrderProducts = Array.from(groupsMap.values()).map(group => {
            const totalGroupQty = group.entries.reduce((sum, e) => sum + Number(e.qty || 0), 0);
            const prodName = matrixData?.productName || group.entries[0]?.item?.productName || "Lens";
            const brandVal = matrixData?.brand || group.entries[0]?.item?.brand || "";
            const catVal = matrixData?.category || group.entries[0]?.item?.category || "LENS";
            const firstItem = group.entries[0]?.item;
            const rangeSummary = formatRangeSummary(group.entries);

            // Build range-grouped variants list (groups contiguous powers on the same SPH)
            const groupedVariants = buildRangeGroups(group.entries);

            // Representative power values
            const sphNums = group.entries.map(e => numPower(e.sph)).filter(n => n !== null);
            const cylNums = group.entries.map(e => numPower(e.cyl)).filter(n => n !== null);
            const addNums = group.entries.map(e => numPower(e.addition)).filter(n => n !== null && n > 0);
            const axisVals = group.entries.map(e => e.axis).filter(Boolean);

            const minS = sphNums.length > 0 ? Math.min(...sphNums) : 0;
            const maxS = sphNums.length > 0 ? Math.max(...sphNums) : 0;
            const minC = cylNums.length > 0 ? Math.min(...cylNums) : 0;
            const maxC = cylNums.length > 0 ? Math.max(...cylNums) : 0;
            const minA = addNums.length > 0 ? Math.min(...addNums) : 0;
            const maxA = addNums.length > 0 ? Math.max(...addNums) : 0;

            const fmtP = (n) => (n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2));
            const repSph = minS === maxS ? fmtP(minS) : `${fmtP(minS)} to ${fmtP(maxS)}`;
            const repCyl = minC === maxC ? fmtP(minC) : `${fmtP(minC)} to ${fmtP(maxC)}`;
            const repAdd = addNums.length > 0 ? (minA === maxA ? `+${minA.toFixed(2)}` : `+${minA.toFixed(2)} to +${maxA.toFixed(2)}`) : "";

            return {
                qty: totalGroupQty,
                unit: "pair",
                price: group.unitPrice,
                basePrice: group.unitPrice,
                buyingPrice: group.buyingPrice,
                sellingPrice: group.sellingPrice,
                mrp: group.mrp,
                discount: 0,
                brand: brandVal,
                category: catVal,
                photos: [],
                powerMode: "both",
                productMode: "stock",
                orderType: "stock",
                availability: group.entries.some(e => (e.item?.qty ?? 0) > 0) ? "in-house" : "order",
                hasPrism: "no",
                isGroupedVariant: true,
                powerRangeSummary: rangeSummary,
                groupedVariants,
                powerTable: {
                    R: { sph: repSph, cyl: repCyl, axis: axisVals[0] || "", add: repAdd, dia: "70" },
                    L: { sph: repSph, cyl: repCyl, axis: axisVals[0] || "", add: repAdd, dia: "70" },
                },
                selectedSide: "both",
                prismTable: {
                    R: { prism: "", base: "" },
                    L: { prism: "", base: "" },
                },
                centrationData: {
                    R: { pd: "", corridor: "", fittingHeight: "" },
                    L: { pd: "", corridor: "", fittingHeight: "" },
                },
                gst: Number(firstItem?.gst || 12),
                hsnSac: firstItem?.hsnSac || "9001",
                productId: firstItem?._id || firstItem?.id || "",
                productName: prodName,
                itemName: prodName,
                productCode: firstItem?.productCode || firstItem?.code || "",
                code: firstItem?.productCode || firstItem?.code || "",
            };
        });

        if (typeof onAddProducts === "function") {
            onAddProducts(newOrderProducts, targetRowIndex);
            toast.success(`Successfully applied ${selectedEntries.length} power combinations (${totalSelectedQty} pairs across ${newOrderProducts.length} price break item${newOrderProducts.length > 1 ? 's' : ''}) to order!`);
        }

        onClose();
    };

    // ── Render Cell Function (Exact Image 2 Match with Stock, Range Price, and Qty Input) ──
    const renderOrderCell = (item, cellKey, rxLabel, sphStr, cylStr, axisStr, addStr) => {
        const entry = orderQtyMap[cellKey];
        const qtyVal = entry?.qty || "";
        const isSelected = Boolean(entry && entry.qty > 0);
        const liveStock = item ? (item.qty ?? 0) : 0;
        
        // Exact price for this specific cell according to its generated range
        const activePrice = item
            ? (priceMetric === "buyingPrice"
                ? (item.buyingPrice ?? item.price ?? 0)
                : priceMetric === "mrp"
                ? (item.mrp ?? 0)
                : (item.sellingPrice ?? item.price ?? 0))
            : (matrixData?.minSellingPrice || 0);

        return (
            <td
                key={cellKey}
                className={`border border-gray-300 p-1 text-center transition select-none ${
                    isSelected
                        ? "bg-emerald-50/95 border-emerald-500 ring-2 ring-emerald-400/60 z-1 shadow-sm"
                        : item
                        ? liveStock > 0
                            ? "bg-white hover:bg-blue-50/60"
                            : "bg-gray-50/80 hover:bg-gray-100/60"
                        : "bg-gray-100/40 opacity-40"
                }`}
                title={item ? `Product: ${matrixData?.productName}\nCode: ${item.productCode || "N/A"}\nRx: ${rxLabel}\nStock: ${liveStock} units\nPrice: ₹${activePrice}` : "Combination not configured"}
            >
                {item ? (
                    <div className="flex flex-col items-center justify-center gap-1 min-w-[72px] py-0.5">
                        {/* Top: Warehouse Stock Badge + Range Price */}
                        <div className="flex items-center justify-between w-full px-1 text-[10px] leading-none">
                            <span
                                className={`inline-flex items-center justify-center px-1.5 py-0.2 rounded font-extrabold text-[10px] ${
                                    liveStock > 0 ? "bg-emerald-500 text-white shadow-2xs" : "bg-gray-200 text-gray-500"
                                }`}
                                title={`Warehouse Stock: ${liveStock} units`}
                            >
                                {liveStock}
                            </span>
                            <span
                                className="font-mono font-bold text-[#2980b9] text-[10px]"
                                title={`${priceMetric === "buyingPrice" ? "Buying" : priceMetric === "mrp" ? "MRP" : "Selling"} Price: ₹${activePrice}`}
                            >
                                ₹{activePrice}
                            </span>
                        </div>

                        {/* Bottom: Order Quantity Stepper Input */}
                        <div className="flex items-center gap-0.5 w-full">
                            {isSelected && (
                                <button
                                    type="button"
                                    onClick={() => adjustQty(cellKey, item, sphStr, cylStr, axisStr, addStr, -1)}
                                    className="w-4 h-5 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 flex items-center justify-center text-[10px] font-extrabold active:scale-95 transition"
                                >
                                    -
                                </button>
                            )}
                            <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={qtyVal}
                                onChange={(e) => handleQtyChange(cellKey, item, sphStr, cylStr, axisStr, addStr, e.target.value)}
                                className={`w-full py-0.5 px-0.5 text-center font-extrabold font-mono text-xs rounded border outline-none transition ${
                                    isSelected
                                        ? "bg-white border-emerald-500 text-emerald-900 shadow-2xs font-extrabold"
                                        : "bg-white border-gray-300 text-gray-800 hover:border-gray-400 focus:border-[#2980b9] focus:ring-1 focus:ring-blue-100"
                                }`}
                            />
                            {isSelected && (
                                <button
                                    type="button"
                                    onClick={() => adjustQty(cellKey, item, sphStr, cylStr, axisStr, addStr, 1)}
                                    className="w-4 h-5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px] font-extrabold active:scale-95 transition"
                                >
                                    +
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-10 text-gray-300 font-mono text-xs">
                        —
                    </div>
                )}
            </td>
        );
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-[96vw] xl:max-w-7xl max-h-[94vh] flex flex-col overflow-hidden border border-gray-200">

                {/* ── Modal Header ── */}
                <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#2980b9] to-blue-500 text-white flex items-center justify-center shadow-md">
                            <FiGrid size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-extrabold text-gray-900">
                                    Lens Matrix Combination Selection
                                </h2>
                                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 uppercase tracking-wider border border-emerald-200">
                                    Live Stock & Range Pricing
                                </span>
                                {targetRowIndex !== null && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                                        Row #{targetRowIndex + 1}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Enter order quantities across visual power matrix. Prices reflect each combination's configured range.
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

                {/* ── Modal Body (Scrollable) ── */}
                <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-gray-50/40 space-y-4">

                    {/* Step 1: Selected Lens Product / Search */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-[#2980b9] text-white flex items-center justify-center text-[10px] font-bold">1</div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                    Selected Lens Product
                                </h3>
                            </div>
                            {selectedProduct && (
                                <button
                                    onClick={() => {
                                        setSelectedProduct(null);
                                        setMatrixData(null);
                                        setSearchTerm("");
                                        setOrderQtyMap({});
                                    }}
                                    className="text-[11px] text-red-500 hover:underline font-semibold"
                                >
                                    Change / Search Another Product
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
                                    placeholder="Type lens product name (e.g. ANISH SINGLE 1, MACAULAY MOON)..."
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
                                            onClick={() => fetchMatrixForProductName(p.productName)}
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
                                                <span className="text-[11px] font-bold text-emerald-700">Stock: {p.totalQty || 0}</span>
                                                <p className="text-[10px] text-gray-400">₹{p.minSellingPrice || p.minPrice || 0} - ₹{p.maxSellingPrice || p.maxPrice || 0}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected Product Summary Card */}
                        {selectedProduct && matrixData && (
                            <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-extrabold text-blue-900">{matrixData.productName}</p>
                                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                                            effectiveFormat === "SPH_CYL"
                                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                        }`}>
                                            {effectiveFormat === "SPH_CYL" ? "Single Vision (SPH × CYL)" : "Progressive / Bifocal (sph/cyl*axis × ADD)"}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-blue-700 mt-0.5">
                                        {matrixData.totalCount} Power Combinations in Database • Category: {matrixData.category || "LENS"} • Brand: {matrixData.brand || "—"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2.5 text-xs">
                                    <div className="bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs flex flex-col items-center">
                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">WAREHOUSE STOCK</span>
                                        <span className="font-extrabold text-xs sm:text-sm text-emerald-600">
                                            {matrixData.totalStockQty != null ? matrixData.totalStockQty : (selectedProduct.totalStock ?? selectedProduct.totalQty ?? 0)} <span className="text-[10px] font-normal text-gray-500">Units</span>
                                        </span>
                                    </div>
                                    <div className="bg-white px-3 py-1.5 rounded-xl border border-blue-100 shadow-2xs flex flex-col items-center">
                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">RANGE SELLING PRICE</span>
                                        <span className="font-bold text-xs sm:text-sm text-[#2980b9]">
                                            ₹{matrixData.minSellingPrice || 0} {matrixData.maxSellingPrice && matrixData.maxSellingPrice !== matrixData.minSellingPrice ? `- ₹${matrixData.maxSellingPrice}` : ""}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step 2: The Interactive Ordering Grid */}
                    {matrixLoading ? (
                        <div className="py-16 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2 bg-white rounded-2xl border border-gray-200">
                            <div className="w-6 h-6 border-2 border-[#2980b9] border-t-transparent rounded-full animate-spin" />
                            <span>Loading live lens matrix combinations & range pricing...</span>
                        </div>
                    ) : selectedProduct && matrixData ? (
                        <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                            {/* Grid Toolbar & Quick Fill Controls */}
                            <div className="p-3 bg-gray-50/90 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <FiGrid className="text-[#2980b9]" size={15} />
                                    <span className="text-xs font-bold text-gray-800">
                                        {effectiveFormat === "SPH_CYL" ? "Single Vision 4 Quadrant Grid" : "Progressive Matrix"}
                                    </span>
                                    <span className="text-[11px] text-gray-500 font-medium">
                                        (Green pill = Live Stock • Blue = Range Price • Enter Order Qty)
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2.5">
                                    {/* Price Metric Dropdown */}
                                    <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-2 py-1 rounded-xl text-[11px] shadow-2xs">
                                        <span className="text-gray-500 font-semibold text-[10px] uppercase">CELL PRICE:</span>
                                        <select
                                            value={priceMetric}
                                            onChange={(e) => setPriceMetric(e.target.value)}
                                            className="text-xs font-bold text-gray-800 bg-transparent outline-none cursor-pointer"
                                        >
                                            <option value="sellingPrice">Selling Price (₹)</option>
                                            <option value="buyingPrice">Buying Price (₹)</option>
                                            <option value="mrp">MRP (₹)</option>
                                        </select>
                                    </div>

                                    {/* Progressive Rx Filter */}
                                    {effectiveFormat === "SPH_ADD" && (
                                        <div className="relative">
                                            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={11} />
                                            <input
                                                type="text"
                                                value={gridRxFilter}
                                                onChange={(e) => setGridRxFilter(e.target.value)}
                                                placeholder="Filter Rx (e.g. 0.00, -0.25)..."
                                                className="pl-7 pr-2.5 py-1 text-[11px] border border-gray-200 rounded-lg outline-none focus:border-[#2980b9] bg-white text-gray-700 w-44"
                                            />
                                        </div>
                                    )}

                                    {/* Quick Fill Box */}
                                    <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-2.5 py-1 rounded-xl text-[11px] shadow-2xs">
                                        <span className="text-gray-500 font-semibold text-[10px] uppercase">Quick Fill:</span>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="Qty"
                                            value={quickFillQty}
                                            onChange={(e) => setQuickFillQty(e.target.value)}
                                            className="w-12 px-1.5 py-0.5 text-xs text-center border border-gray-200 rounded-md font-bold text-gray-800 outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleQuickFill}
                                            className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-[#2980b9] font-bold rounded-md transition text-[10px]"
                                            title="Fill this quantity in all configured power combinations"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* View Content: Single Vision 4 Quadrants (Image 2 style) vs Progressive Grid */}
                            <div className="p-3">
                                {effectiveFormat === "SPH_CYL" ? (
                                    <div className="space-y-4">
                                        {/* Quadrant Selector Tabs */}
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
                                                    <span>{q.shortTitle}</span>
                                                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-200 text-gray-700 font-bold">
                                                        {q.count}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>

                                        {/* 4 Quadrant Tables: 2x2 Grid when All 4 selected (Matching Image 2) */}
                                        <div className={svQuadrantTab === "all" ? "grid grid-cols-1 xl:grid-cols-2 gap-4" : "space-y-4"}>
                                            {svQuadrants
                                                .filter(q => svQuadrantTab === "all" || svQuadrantTab === q.id)
                                                .map(q => (
                                                    <div key={q.id} className="border-2 border-gray-900 rounded-lg overflow-hidden shadow-2xs bg-white">
                                                        {/* Yellow Banner Header matching Image 2 */}
                                                        <div className="bg-[#FFFF00] text-black px-3 py-1.5 text-xs font-extrabold flex items-center justify-between border-b-2 border-gray-900">
                                                            <span>{matrixData?.productName || selectedProduct?.productName} — {q.title}</span>
                                                            <span className="text-[11px] font-mono bg-white/90 text-black px-2 py-0.5 rounded border border-gray-900 font-extrabold shadow-2xs">
                                                                {q.count} variants
                                                            </span>
                                                        </div>

                                                        <div className="overflow-x-auto max-h-[380px]">
                                                            <table className="w-full border-collapse text-center text-xs">
                                                                <thead className="sticky top-0 z-20">
                                                                    {/* Row 1: SPH | Cyl Group Label */}
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
                                                                    {/* Row 2: Sign (+) / (-) & CYL values with Light Cyan #DAEEF3 */}
                                                                    <tr className="bg-[#DAEEF3] text-black font-extrabold text-xs">
                                                                        <th className="sticky left-0 z-30 bg-[#DAEEF3] text-black font-extrabold px-2.5 py-1.5 border-r-2 border-b-2 border-gray-900 text-center min-w-[75px]">
                                                                            {q.sphSign}
                                                                        </th>
                                                                        {q.cyls.map((cVal) => (
                                                                            <th key={`c_${q.id}_${cVal}`} className="px-2 py-1.5 text-xs border-r border-b-2 border-gray-900 min-w-[62px] bg-[#DAEEF3] text-black font-extrabold text-center">
                                                                                {cVal > 0 ? `+${cVal.toFixed(2)}` : cVal.toFixed(2)}
                                                                            </th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {q.sphs.map((sVal) => {
                                                                        const sphStr = sVal === 0 ? "0.00" : (sVal > 0 ? `+${sVal.toFixed(2)}` : sVal.toFixed(2));
                                                                        return (
                                                                            <tr key={`s_${q.id}_${sVal}`} className="hover:bg-blue-50/20">
                                                                                <td className="sticky left-0 z-10 font-mono font-extrabold p-1.5 text-xs border-r-2 border-b border-gray-900 text-center bg-[#DAEEF3] text-black">
                                                                                    {sphStr}
                                                                                </td>
                                                                                {q.cyls.map((cVal) => {
                                                                                    const cylStr = cVal === 0 ? "0.00" : (cVal > 0 ? `+${cVal.toFixed(2)}` : cVal.toFixed(2));
                                                                                    const key = `${sVal.toFixed(2)}_${cVal.toFixed(2)}`;
                                                                                    const cellKey = `${q.id}_${key}`;
                                                                                    const item = uiSphCylLookup.get(key);
                                                                                    const rxLabel = `SPH ${sphStr} | CYL ${cylStr}`;
                                                                                    return renderOrderCell(item, cellKey, rxLabel, sVal.toFixed(2), cVal.toFixed(2), "", "");
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
                                    /* Progressive / Bifocal Grid */
                                    <div className="border-2 border-gray-900 rounded-lg overflow-hidden shadow-2xs bg-white">
                                        <div className="bg-[#FFFF00] text-black px-3 py-1.5 text-xs font-extrabold flex items-center justify-between border-b-2 border-gray-900">
                                            <span>{matrixData?.productName || selectedProduct?.productName} — Progressive / Bifocal (sph/cyl*axis × ADD)</span>
                                            <span className="text-[11px] font-mono bg-white/90 text-black px-2 py-0.5 rounded border border-gray-900 font-extrabold">
                                                {filteredUiCombosList.length} rows × {uiAddList.length} ADD steps
                                            </span>
                                        </div>
                                        <div className="overflow-x-auto max-h-[480px]">
                                            <table className="w-full border-collapse text-center text-xs">
                                                <thead className="sticky top-0 z-20">
                                                    <tr className="bg-[#DAEEF3] text-black font-extrabold text-xs">
                                                        <th className="sticky left-0 z-30 bg-[#DAEEF3] p-2 text-left border-r-2 border-b-2 border-gray-900 min-w-[140px]">
                                                            SPH / CYL * AXIS
                                                        </th>
                                                        {uiAddList.map(a => (
                                                            <th key={a} className="p-2 border-r border-b-2 border-gray-900 font-bold min-w-[70px] text-gray-900 text-center">
                                                                +{a.toFixed(2)}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredUiCombosList.map((combo) => {
                                                        const rowLabel = formatDistRxCell(combo.s, combo.c, combo.ax);
                                                        const sStr = combo.s.toFixed(2);
                                                        const cStr = combo.c.toFixed(2);

                                                        return (
                                                            <tr key={`prog_${rowLabel}`} className="hover:bg-blue-50/20">
                                                                <td className="sticky left-0 z-10 font-mono font-bold p-1.5 text-xs border-r-2 border-b border-gray-900 text-left bg-white text-gray-800 whitespace-nowrap">
                                                                    {rowLabel}
                                                                </td>
                                                                {uiAddList.map(a => {
                                                                    const aStr = a.toFixed(2);
                                                                    const cellKey = `${combo.s}_${combo.c}_${combo.ax}_${a}`;
                                                                    const item = uiSphAddLookup.get(`${sStr}_${cStr}_${combo.ax}_${aStr}`);
                                                                    const rxLabel = `${rowLabel} | ADD +${aStr}`;
                                                                    return renderOrderCell(item, cellKey, rxLabel, sStr, cStr, combo.ax || "", aStr);
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
                        </div>
                    ) : (
                        <div className="p-12 text-center text-xs text-gray-400 bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center gap-2">
                            <FiSearch size={28} className="text-gray-300" />
                            <span>Select or search a lens product above to open its interactive ordering matrix.</span>
                        </div>
                    )}
                </div>

                {/* ── Sticky Cart Bar (Always Visible at Bottom) ── */}
                <div className="p-3 sm:p-4 bg-white border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 shadow-lg flex-shrink-0 z-20">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">SELECTED:</span>
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold text-xs">
                                {selectedPowersCount} Combinations
                            </span>
                        </div>

                        <div className="h-4 w-px bg-gray-200 hidden sm:block" />

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">TOTAL QUANTITY:</span>
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                                {totalSelectedQty} Pairs
                            </span>
                        </div>

                        <div className="h-4 w-px bg-gray-200 hidden sm:block" />

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">EST. SUBTOTAL:</span>
                            <span className="text-sm sm:text-base font-extrabold text-gray-900 font-mono">
                                ₹{totalEstimatedAmount.toLocaleString("en-IN")}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">
                                (with range prices)
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {selectedPowersCount > 0 && (
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="px-3 py-2 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 text-xs font-bold transition flex items-center gap-1"
                            >
                                <FiTrash2 size={13} />
                                <span>Clear</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleAddSelectedToOrder}
                            disabled={selectedPowersCount === 0 || totalSelectedQty <= 0}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 transition disabled:opacity-40 disabled:pointer-events-none active:scale-95"
                        >
                            <FiCheckCircle size={15} />
                            <span>
                                {targetRowIndex !== null
                                    ? `Apply to Row #${targetRowIndex + 1} (${totalSelectedQty} Pairs)`
                                    : `Add to Order (${totalSelectedQty} Pairs)`}
                            </span>
                        </button>
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
}
