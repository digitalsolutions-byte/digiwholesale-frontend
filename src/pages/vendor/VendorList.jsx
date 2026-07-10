import { useEffect, useMemo, useRef, useState } from "react";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getFilteredRowModel, flexRender } from "@tanstack/react-table";
import { Icon } from "@iconify/react";
import {
    FiInfo, FiEdit2, FiTrash2, FiRefreshCw, FiX, FiUser, FiPhone,
    FiMail, FiMapPin, FiFileText, FiCreditCard, FiMessageSquare,
    FiBriefcase, FiSearch, FiChevronLeft, FiChevronRight, FiShoppingCart, FiPlusCircle,
} from "react-icons/fi";
import * as vendorService from "../../services/vendorService";
import * as vendorOrderService from "../../services/vendorOrderService";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import { useDispatch, useSelector } from "react-redux";

const FETCH_LIMIT = 100;
const PAGE_SIZE = 100;

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI primitives
// ─────────────────────────────────────────────────────────────────────────────
const Modal = ({ onClose, children, maxWidth = "max-w-lg" }) => (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-all duration-300"
        onClick={onClose}>
        <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidth} animate-fadeIn`} onClick={e => e.stopPropagation()}>
            {children}
        </div>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(.97) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}.animate-fadeIn{animation:fadeIn .18s ease both}`}</style>
    </div>
);

const ModalHeader = ({ title, subtitle, onClose }) => (
    <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
        <div>
            <h2 className="text-sm font-bold text-gray-800">{title}</h2>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition">
            <FiX size={15} />
        </button>
    </div>
);

const ModalFooter = ({ children }) => (
    <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">
        {children}
    </div>
);

const InfoRow = ({ label, value }) => (
    <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-gray-800 break-words">{value || "-"}</p>
    </div>
);

const SectionTitle = ({ children }) => (
    <div className="flex items-center gap-2 mb-4">
        <span className="w-1 h-5 rounded-full bg-erp-accent inline-block shadow-lg shadow-erp-accent/30" />
        <h3 className="text-xs font-bold text-gray-500">{children}</h3>
    </div>
);

const fieldCls = "w-full bg-gray-50/50 border border-gray-100 rounded-full px-5 py-2.5 text-sm text-gray-700 outline-none focus:border-erp-accent/30 focus:ring-4 focus:ring-erp-accent/5 transition-all placeholder:text-gray-300";
const labelCls = "text-xs font-semibold text-gray-500 block mb-1.5 ml-4";
const iconInputCls = "w-full pl-12 pr-5 py-2.5 text-sm text-gray-700 bg-gray-50/50 border border-gray-100 rounded-full outline-none focus:border-erp-accent/30 focus:ring-4 focus:ring-erp-accent/5 transition-all placeholder:text-gray-300";

// ─────────────────────────────────────────────────────────────────────────────
// Keyword input with vendor suggestion dropdown
// ─────────────────────────────────────────────────────────────────────────────
function VendorKeywordInput({ value, onChange }) {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef(null);
    const containerRef = useRef(null);

    const fetchSuggestions = async (q) => {
        if (!q || q.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
        try {
            setSearching(true);
            const res = await api.get("/api/vendor/suggestion", { params: { q } });
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
        const nameMatch = s.name ? s.name.toLowerCase().includes(q) : false;
        const mobileMatch = s.mobile ? s.mobile.toLowerCase().includes(q) : false;
        const firmMatch = s.firm ? s.firm.toLowerCase().includes(q) : false;

        let filled = s.name || s.mobile || "";
        if (mobileMatch && !nameMatch && !firmMatch) filled = s.mobile;
        else if (firmMatch && !nameMatch && !mobileMatch) filled = s.firm;
        else filled = s.name || s.mobile || "";

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
        <div ref={containerRef} className="relative flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1">Keyword</label>
            <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={13} />
                {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-blue-300 border-t-transparent rounded-full animate-spin pointer-events-none" />
                )}
                <input
                    type="text"
                    value={value}
                    onChange={handleChange}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="Name or firm..."
                    className="pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 hover:border-gray-300 transition w-56 text-gray-700 placeholder:text-gray-300"
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
                    <div className="px-3 py-2 bg-blue-50 border-b border-gray-100">
                        <p className="text-xs font-bold text-gray-400">Suggestions</p>
                    </div>
                    <ul className="max-h-52 overflow-y-auto">
                        {suggestions.map((s, i) => (
                            <li key={i}>
                                <button onMouseDown={() => handleSelect(s)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 transition text-left">
                                    <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                                        <FiBriefcase size={11} className="text-blue-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">{s.name || "-"}</p>
                                        <p className="text-xs text-gray-400 truncate">
                                            {s.firm || ""}
                                            {s.mobile ? ` · ${s.mobile}` : ""}
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

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function VendorList() {
    const [allData, setAllData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [keyword, setKeyword] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [globalFilter, setGlobalFilter] = useState("");
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [viewVendor, setViewVendor] = useState(false);
    const [editVendor, setEditVendor] = useState(null);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [notes, setNotes] = useState("");
    const dispatch = useDispatch();
    const permissions = useSelector(s => s?.auth?.user?.permissions || {});
    const checkPerm = (p) => Array.isArray(permissions) ? permissions.includes(p) : !!permissions[p];

    const todayDate = new Date().toISOString().split("T")[0];

    const emptyRow = { productCode: "", category: "", productName: "", quantity: 1, price: "", gstPercent: "0", expectedDate: "" };
    const [orderRows, setOrderRows] = useState([emptyRow]);

    const handleAddRow = () => setOrderRows(prev => [...prev, emptyRow]);
    const handleRemoveRow = (i) => setOrderRows(prev => prev.filter((_, idx) => idx !== i));
    const handleChangeRow = (i, field, val) => setOrderRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
    const handleClearOrder = () => { setOrderRows([emptyRow]); setNotes(""); };

    // ============ fetch Vendor data pagination ============
    const fetchVendors = async (pageNumber = 1, append = false) => {
        try {
            pageNumber === 1 ? setLoading(true) : setLoadingMore(true);
            dispatch(showLoader());
            const data = await vendorService.getAllVendors(pageNumber, FETCH_LIMIT);
            if (data.success) {
                setAllData(prev => append ? [...prev, ...(data.vendors || [])] : (data.vendors || []));
                setHasMore(data.hasMore);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); setLoadingMore(false); dispatch(hideLoader()); }
    };

    useEffect(() => { fetchVendors(1, false); }, []);

    // ============ date & keyword search filter ============
    const searchVendors = async () => {
        if (!fromDate && !toDate && !keyword) { toast.warning("Please provide at least one filter."); return; }
        if ((fromDate && !toDate) || (!fromDate && toDate)) { toast.warning("Please select both From and To dates."); return; }
        if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) { toast.warning("From date cannot be greater than To date."); return; }
        if (keyword && keyword.trim().length < 4) { toast.warning("Keyword must be at least 4 characters."); return; }
        try {
            setLoading(true); dispatch(showLoader());
            const data = await vendorService.searchVendors({ startDate: fromDate || undefined, endDate: toDate || undefined, keyword: keyword || undefined });
            if (data.success) { setFilteredData(data.vendors || []); setIsSearching(true); }
            else toast.warning(data.message);
        } catch (err) { toast.error(err.response?.data?.message || "Search failed"); }
        finally { setLoading(false); dispatch(hideLoader()); }
    };

    const handleResetSearch = () => { setFilteredData([]); setIsSearching(false); setFromDate(""); setToDate(""); setKeyword(""); };

    // ============ Load more data ================
    const handleLoadMore = () => {
        if (!hasMore || loadingMore) return;
        const next = page + 1; setPage(next); fetchVendors(next, true);
    };

    // ============ Page Refresh ================
    const handleRefresh = () => {
        Swal.fire({
            title: "Are you sure?", text: "The page will be refreshed.", icon: "warning",
            showCancelButton: true, confirmButtonColor: "#2980B9", cancelButtonColor: "#9ca3af",
            confirmButtonText: "Yes, refresh!",
        }).then(r => { if (r.isConfirmed) window.location.reload(); });
    };

    // ============ Delete vendor ================
    const handleDeleteVendor = async (vendor) => {
        const result = await Swal.fire({
            title: "Are you sure?", text: `Delete vendor (${vendor.name})?`, icon: "warning",
            showCancelButton: true, confirmButtonColor: "#dc2626", cancelButtonColor: "#6b7280",
        });
        if (!result.isConfirmed) return;
        try {
            dispatch(showLoader());
            const data = await vendorService.deleteVendor(vendor._id || vendor.vendorNumber);
            if (data.success) {
                setAllData(prev => prev.filter(v => v.vendorNumber !== vendor.vendorNumber));
                setFilteredData(prev => prev.filter(v => v.vendorNumber !== vendor.vendorNumber));
                Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false });
            }
        } catch (error) {
            Swal.fire("Error", error.response?.data?.message || "Error", "error");
        } finally { dispatch(hideLoader()); }
    };

    const handleSubmitOrder = async () => {
        if (!selectedVendor || (!selectedVendor._id && !selectedVendor.vendorNumber)) {
            toast.error("Please select a vendor");
            return;
        }
        if (!orderRows || orderRows.length === 0) { toast.error("Please add at least one product"); return; }
        for (let i = 0; i < orderRows.length; i++) {
            const r = orderRows[i];
            if (!r.productCode) { toast.error(`Row ${i + 1}: Product Code is required`); return; }
            if (!r.category) { toast.error(`Row ${i + 1}: Category is required`); return; }
            if (!r.productName) { toast.error(`Row ${i + 1}: Product Name is required`); return; }
            if (!r.quantity || Number(r.quantity) <= 0) { toast.error(`Row ${i + 1}: Quantity must be greater than 0`); return; }
            if (!r.price || Number(r.price) <= 0) { toast.error(`Row ${i + 1}: Price must be greater than 0`); return; }
            if (!r.expectedDate) { toast.error(`Row ${i + 1}: Expected Date is required`); return; }
        }
        try {
            dispatch(showLoader());
            const data = await vendorOrderService.createVendorOrder({
                vendorId: selectedVendor._id || selectedVendor.vendorNumber,
                notes,
                items: orderRows.map(r => ({
                    productCode: r.productCode,
                    category: r.category,
                    productName: r.productName,
                    quantity: Number(r.quantity),
                    price: Number(r.price),
                    gstPercent: Number(r.gstPercent || 0),
                    expectedDate: r.expectedDate,
                })),
            });
            if (data.success) {
                toast.success(`Purchase Order Created Successfully: #${data.order?.orderNumber || ''}`);
                handleClearOrder();
                setShowOrderModal(false);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create purchase order");
        } finally { dispatch(hideLoader()); }
    };

    // ── columns ──────────────────────────────────────────────────────────────
    const columns = useMemo(() => [
        {
            header: "Action", id: "actions",
            cell: ({ row }) => {
                const v = row.original;
                return (
                    <div className="flex items-center justify-center gap-0.5">
                        <button onClick={e => { e.stopPropagation(); setEditVendor(v); }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition" title="Edit">
                            <FiEdit2 size={14} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setSelectedVendor(v); setViewVendor(true); }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400 transition" title="View Details">
                            <FiInfo size={14} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setSelectedVendor(v); setShowOrderModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-500 transition" title="Place Order">
                            <FiShoppingCart size={14} />
                        </button>
                    </div>
                );
            },
        },
        { header: "Date", accessorKey: "createdAt", cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString("en-IN") : "-" },
        // { header: "ID", accessorKey: "vendorNumber" },
        { header: "Name", accessorKey: "name" },
        { header: "Firm", accessorKey: "firm" },
        { header: "Mobile", accessorKey: "mobile" },
        { header: "Email", accessorKey: "email" },
        { header: "Address", accessorKey: "address" },
        { header: "GST", accessorKey: "gstNumber", cell: ({ getValue }) => getValue() || "-" },
        { header: "Payment Terms", accessorKey: "paymentTerms", cell: ({ getValue }) => getValue() || "-" },
        { header: "Note", accessorKey: "notes", cell: ({ getValue }) => <span className="text-gray-500 text-xs">{getValue() || "-"}</span> },

        ...(checkPerm("DELETE VENDOR") ? [{
            header: "Delete",
            id: "delete",
            cell: ({ row }) => {
                const v = row.original;
                return (
                    <div className="flex items-center justify-center">
                        <button
                            onClick={e => { e.stopPropagation(); handleDeleteVendor(v); }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500 transition"
                            title="Delete"
                        >
                            <FiTrash2 size={14} />
                        </button>
                    </div>
                );
            },
        }] : [])
    ], []);

    const table = useReactTable({
        data: isSearching ? filteredData : allData,
        columns, state: { globalFilter },
        onGlobalFilterChange: setGlobalFilter,
        initialState: { pagination: { pageIndex: 0, pageSize: PAGE_SIZE } },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const currentPage = table.getState().pagination.pageIndex;
    const totalPages = table.getPageCount();
    const MAX_PAGES = 5;
    const startPage = Math.max(0, currentPage - Math.floor(MAX_PAGES / 2));
    const endPage = Math.min(totalPages, startPage + MAX_PAGES);
    const pages = Array.from({ length: endPage - startPage }, (_, i) => startPage + i);

    // order summary
    const orderSummary = orderRows.reduce((acc, r) => {
        const base = (Number(r.quantity) || 0) * (Number(r.price) || 0);
        const gst = (base * (Number(r.gstPercent) || 0)) / 100;
        acc.subtotal += base; acc.gstTotal += gst; acc.grandTotal += base + gst;
        return acc;
    }, { subtotal: 0, gstTotal: 0, grandTotal: 0 });

    if (loading) return (
        <div className="flex items-center justify-center h-48 text-gray-400 gap-3">
            <div className="w-5 h-5 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading vendors...</span>
        </div>
    );

    return (
        <div className="w-full flex flex-col gap-6 animate-in fade-in duration-500">

            {/* ── Filter bar ── */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 mb-6">
                <div className="flex flex-wrap items-end gap-6">
                    <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-bold text-gray-500 ml-2">Period</span>
                        <div className="flex items-center gap-2">
                            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                                className="bg-gray-50/50 border border-gray-100 px-4 py-2 rounded-full text-xs font-semibold outline-none focus:border-erp-accent/30 focus:ring-4 focus:ring-erp-accent/5 hover:border-erp-accent/20 transition-all w-40 text-gray-700"
                            />
                            <span className="text-xs font-bold text-gray-300">to</span>
                            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                                className="bg-gray-50/50 border border-gray-100 px-4 py-2 rounded-full text-xs font-semibold outline-none focus:border-erp-accent/30 focus:ring-4 focus:ring-erp-accent/5 hover:border-erp-accent/20 transition-all w-40 text-gray-700"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 flex-1 min-w-[240px]">
                        <span className="text-xs font-bold text-gray-500 ml-2">Search</span>
                        <VendorKeywordInput value={keyword} onChange={setKeyword} />
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-bold text-gray-500 ml-2">Actions</span>
                            <button onClick={handleRefresh}
                                className="flex items-center gap-2 bg-erp-accent/10 hover:bg-erp-accent text-erp-accent hover:text-white px-5 py-2.5 text-xs font-bold rounded-full transition-all duration-300 shadow-sm hover:shadow-md group">
                                <Icon icon="mdi:refresh" className="text-lg group-hover:rotate-180 transition-transform duration-700" /> Refresh
                            </button>
                        </div>
                        {isSearching && (
                            <button onClick={handleResetSearch}
                                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-2.5 text-xs font-bold rounded-full transition-all">
                                Clear
                            </button>
                        )}
                        <button onClick={searchVendors}
                            className="flex items-center gap-2 bg-erp-accent hover:bg-erp-accent/90 text-white px-8 py-2.5 text-xs font-bold rounded-full transition-all shadow-lg shadow-erp-accent/20 hover:scale-105 active:scale-95">
                            <Icon icon="mdi:magnify" className="text-lg" /> Search
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Table card ── */}
            <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden min-h-[600px] flex flex-col">

                {/* Table top bar */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-gray-50 bg-gray-50/30">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-6 bg-erp-accent rounded-full" />
                        <h2 className="text-sm font-bold text-gray-700">Vendors</h2>
                    </div>
                    <div className="relative w-64 group">
                        <Icon icon="mdi:filter-variant" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-erp-accent transition-colors" />
                        <input type="text" value={globalFilter ?? ""} onChange={e => setGlobalFilter(e.target.value)}
                            placeholder="Filter..."
                            className="w-full pl-11 pr-4 py-2.5 text-sm font-semibold border border-gray-100 rounded-full outline-none focus:border-erp-accent/30 focus:ring-4 focus:ring-erp-accent/5 transition-all text-gray-600 placeholder:text-gray-300 bg-white"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto custom-scrollbar flex-1">
                    <table className="w-full border-collapse min-w-[1200px]">
                        <thead>
                            {table.getHeaderGroups().map(hg => (
                                <tr key={hg.id} className="bg-erp-accent text-white">
                                    {hg.headers.map(h => (
                                        <th key={h.id} className="px-6 py-4 text-center text-xs font-bold border-r border-white/10 last:border-r-0">
                                            {flexRender(h.column.columnDef.header, h.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {table.getRowModel().rows.length === 0 && (
                                <tr><td colSpan={columns.length} className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-3 opacity-20">
                                        <Icon icon="mdi:account-off-outline" className="text-6xl" />
                                        <p className="text-sm font-bold">No vendors found</p>
                                    </div>
                                </td></tr>
                            )}
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id} className="hover:bg-erp-accent/[0.02] transition-colors group">
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="px-6 py-4 text-center">
                                            <div className="text-xs font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">
                                                {flexRender(cell.column.columnDef.cell ?? cell.column.columnDef.accessorKey, cell.getContext())}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-8 py-6 border-t border-gray-50 bg-gray-50/30">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={isSearching ? handleResetSearch : handleLoadMore}
                            disabled={loadingMore || (!isSearching && !hasMore)}
                            className={`px-8 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm hover:shadow-md
                                ${loadingMore || (!isSearching && !hasMore)
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : isSearching ? "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                                        : "bg-erp-accent text-white hover:bg-erp-accent/90"}`}
                        >
                            {loadingMore ? "Loading..." : isSearching ? "Reset Filters" : "Load More"}
                        </button>
                        {!isSearching && (
                            <span className="text-xs font-bold text-gray-400">
                                {allData.length} records
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
                            className="p-2.5 rounded-full border border-gray-100 text-gray-400 hover:bg-white hover:text-erp-accent disabled:opacity-30 transition-all shadow-sm">
                            <Icon icon="mdi:chevron-left" className="text-xl" />
                        </button>
                        <div className="flex items-center gap-1.5 px-4">
                            {pages.map(p => (
                                <button key={p} onClick={() => table.setPageIndex(p)}
                                    className={`w-9 h-9 text-[10px] font-black rounded-full transition-all shadow-sm ${p === currentPage ? "bg-erp-accent text-white scale-110 shadow-lg shadow-erp-accent/20" : "bg-white text-gray-400 hover:bg-gray-50 hover:text-erp-accent border border-gray-50"}`}>
                                    {p + 1}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
                            className="p-2.5 rounded-full border border-gray-100 text-gray-400 hover:bg-white hover:text-erp-accent disabled:opacity-30 transition-all shadow-sm">
                            <Icon icon="mdi:chevron-right" className="text-xl" />
                        </button>
                    </div>
                </div>
            </div>


            {/* ── View Vendor Modal ── */}
            {viewVendor && selectedVendor && (
                <Modal onClose={() => { setSelectedVendor(null); setViewVendor(false); }} maxWidth="max-w-2xl">
                    <ModalHeader
                        title="Vendor Details"
                        subtitle="Complete vendor information overview"
                        onClose={() => { setSelectedVendor(null); setViewVendor(false); }}
                    />
                    <div className="px-6 py-5 space-y-5">
                        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
                            <SectionTitle>Basic Information</SectionTitle>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                                <InfoRow label="Date Added" value={selectedVendor.createdAt ? new Date(selectedVendor.createdAt).toLocaleString("en-GB") : "-"} />
                                <InfoRow label="Vendor ID" value={selectedVendor.vendorNumber} />
                                <InfoRow label="Vendor Name" value={selectedVendor.name} />
                                <InfoRow label="Mobile" value={selectedVendor.mobile} />
                                <InfoRow label="Email" value={selectedVendor.email} />
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
                            <SectionTitle>Business Information</SectionTitle>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                                <InfoRow label="Firm Name" value={selectedVendor.firm} />
                                <InfoRow label="GST Number" value={selectedVendor.gstNumber} />
                                <InfoRow label="Payment Terms" value={selectedVendor.paymentTerms} />
                                <div className="col-span-2 md:col-span-3">
                                    <InfoRow label="Address" value={selectedVendor.address} />
                                </div>
                            </div>
                        </div>
                        {selectedVendor.notes && (
                            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                                <SectionTitle>Additional Notes</SectionTitle>
                                <p className="text-sm text-gray-700">{selectedVendor.notes}</p>
                            </div>
                        )}
                    </div>
                    <ModalFooter>
                        <button onClick={() => { setSelectedVendor(null); setViewVendor(false); }}
                            className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                            Close
                        </button>
                    </ModalFooter>
                </Modal>
            )}

            {/* ── Purchase Order Modal ── */}
            {showOrderModal && (
                <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-fadeIn transition-all duration-300">
                    <div className="bg-white w-full max-w-7xl h-[88%] sm:h-[92%] rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/20">

                        {/* Header */}
                        <div className="flex items-center justify-between px-8 py-6 bg-erp-accent text-white flex-shrink-0 relative overflow-hidden">
                            <div className="relative z-10 flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                                    <Icon icon="mdi:cart-plus" className="text-2xl" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Order</h2>
                                    {selectedVendor && (
                                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-1 flex items-center gap-2">
                                            <Icon icon="mdi:account-tie" /> Vendor: {selectedVendor.name} {selectedVendor.firm ? `• ${selectedVendor.firm}` : ""}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => { setShowOrderModal(false); handleClearOrder(); }}
                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all group relative z-10">
                                <Icon icon="mdi:close" className="text-2xl group-hover:rotate-90 transition-transform" />
                            </button>
                            {/* Decorative background shape */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6 bg-gray-50/50 custom-scrollbar">
                            <div className="space-y-6">
                                {orderRows.map((row, index) => (
                                    <div key={index} className="relative bg-white border border-gray-100 rounded-[2rem] p-6 shadow-xl shadow-gray-200/40 hover:shadow-gray-200/60 transition-all animate-slideUp">
                                        <div className="flex items-center justify-between mb-6 border-b border-gray-50 pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-lg bg-erp-accent/5 flex items-center justify-center">
                                                    <span className="text-[10px] font-black text-erp-accent">{index + 1}</span>
                                                </div>
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Product Specification</span>
                                            </div>
                                            {orderRows.length > 1 && (
                                                <button onClick={() => handleRemoveRow(index)}
                                                    className="w-8 h-8 rounded-full hover:bg-rose-50 text-rose-300 hover:text-rose-500 transition-all flex items-center justify-center">
                                                    <Icon icon="mdi:trash-can-outline" className="text-lg" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4 sm:gap-6">
                                            {[
                                                { label: "Product Code", field: "productCode", type: "text", placeholder: "e.g. PRD-001" },
                                                { label: "Category", field: "category", type: "text", placeholder: "e.g. Frame" },
                                                { label: "Product Name", field: "productName", type: "text", placeholder: "Full product description..." },
                                                { label: "Quantity", field: "quantity", type: "number", placeholder: "Qty", min: "1", step: "1" },
                                                { label: "Price / Unit", field: "price", type: "number", placeholder: "₹ 0.00", min: "0", step: "0.01" },
                                            ].map(({ label, field, type, placeholder, min, step }) => (
                                                <div key={field} className={`flex flex-col ${field === "productName" ? "sm:col-span-2 lg:col-span-1 2xl:col-span-1" : ""}`}>
                                                    <label className={labelCls}>{label}</label>
                                                    <input type={type} min={min} step={step} placeholder={placeholder}
                                                        value={row[field]}
                                                        onChange={e => handleChangeRow(index, field, field === "quantity" ? Math.floor(e.target.value) : e.target.value)}
                                                        className={fieldCls}
                                                    />
                                                </div>
                                            ))}
                                            <div className="flex flex-col">
                                                <label className={labelCls}>GST %</label>
                                                <select value={row.gstPercent} onChange={e => handleChangeRow(index, "gstPercent", e.target.value)} className={fieldCls}>
                                                    <option value="0">Select GST</option>
                                                    {[5, 12, 18, 28].map(g => <option key={g} value={g}>{g}% Tax</option>)}
                                                </select>
                                            </div>
                                            <div className="flex flex-col">
                                                <label className={labelCls}>Expected Date</label>
                                                <input type="date" min={todayDate} value={row.expectedDate}
                                                    onChange={e => handleChangeRow(index, "expectedDate", e.target.value)}
                                                    className={fieldCls}
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-6 flex justify-end pt-4 border-t border-gray-50/50">
                                            <div className="flex items-center gap-3 bg-erp-accent/[0.03] px-6 py-2 rounded-full border border-erp-accent/5">
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Row Valuation</span>
                                                <span className="text-sm font-black text-erp-accent">
                                                    ₹ {((Number(row.quantity) || 0) * (Number(row.price) || 0) * (1 + (Number(row.gstPercent) || 0) / 100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button onClick={handleAddRow}
                                className="w-full flex items-center justify-center gap-3 py-6 border-2 border-dashed border-erp-accent/10 bg-erp-accent/[0.02] hover:bg-erp-accent/5 hover:border-erp-accent/30 rounded-[2rem] transition-all group">
                                <Icon icon="mdi:plus-circle" className="text-2xl text-erp-accent/40 group-hover:text-erp-accent group-hover:scale-110 transition-all" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-erp-accent">Add Product Line Item</span>
                            </button>
                        </div>

                        {/* Footer */}
                        <div className="px-10 py-8 border-t border-gray-100 bg-white flex-shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
                            <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-8">
                                {/* Notes */}
                                <div className="w-full lg:w-1/2 space-y-3">
                                    <label className={labelCls}>Administrative Notes (Optional)</label>
                                    <div className="relative group">
                                        <Icon icon="mdi:note-text-outline" className="absolute left-5 top-5 text-gray-300 group-focus-within:text-erp-accent transition-colors" />
                                        <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                                            placeholder="Specify shipping terms, quality benchmarks or special vendor instructions..."
                                            className="w-full bg-gray-50/50 border border-gray-100 rounded-[1.5rem] pl-12 pr-5 py-4 text-xs font-bold text-gray-700 outline-none focus:border-erp-accent/30 focus:ring-4 focus:ring-erp-accent/5 transition-all placeholder:text-gray-300 resize-none"
                                        />
                                    </div>
                                </div>

                                {/* Totals */}
                                <div className="w-full lg:w-80 bg-gray-50/50 border border-gray-100 rounded-[2rem] p-6 space-y-3 shadow-inner">
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Net Amount</span>
                                        <span className="text-xs font-bold text-gray-700">₹ {orderSummary.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">GST Surcharge</span>
                                        <span className="text-xs font-bold text-gray-700">₹ {orderSummary.gstTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="h-px bg-gray-100 mx-2 my-1" />
                                    <div className="flex justify-between items-center px-2 pt-1">
                                        <span className="text-[10px] font-black text-erp-accent uppercase tracking-[0.2em]">Grand Total</span>
                                        <span className="text-xl font-black text-erp-accent">₹ {orderSummary.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center justify-between gap-4">
                                <button onClick={handleClearOrder}
                                    className="flex items-center gap-2 px-8 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 bg-white border border-gray-100 rounded-full hover:bg-gray-50 hover:text-gray-600 transition-all">
                                    <Icon icon="mdi:refresh" className="text-lg" /> Reset Order
                                </button>
                                <div className="flex gap-4">
                                    <button onClick={() => { setShowOrderModal(false); handleClearOrder(); }}
                                        className="px-8 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-gray-600 transition-all">
                                        Cancel
                                    </button>
                                    <button onClick={handleSubmitOrder}
                                        className="flex items-center gap-3 px-12 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-white bg-erp-accent hover:bg-erp-accent/90 active:scale-95 rounded-full transition-all shadow-xl shadow-erp-accent/30">
                                        <Icon icon="mdi:cart-check" className="text-xl" /> Create Order
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Vendor Modal ── */}
            {editVendor && (
                <EditVendorModal
                    vendor={editVendor}
                    onClose={() => setEditVendor(null)}
                    onSuccess={() => fetchVendors()}
                />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit Vendor Modal
// ─────────────────────────────────────────────────────────────────────────────
function EditVendorModal({ vendor, onClose, onSuccess }) {
    const [form, setForm] = useState({
        name: "", firm: "", mobile: "", email: "", address: "", gstNumber: "", paymentTerms: "", notes: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (vendor) {
            setForm({
                name: vendor.name || "", firm: vendor.firm || "", mobile: vendor.mobile || "",
                email: vendor.email || "", address: vendor.address || "", gstNumber: vendor.gstNumber || "",
                paymentTerms: vendor.paymentTerms || "", notes: vendor.notes || "",
            });
        }
    }, [vendor]);

    const update = field => e => setForm(prev => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async () => {
        setError("");
        if (!form.name.trim()) return setError("Vendor name is required.");
        try {
            setLoading(true);
            const response = await vendorService.updateVendor(vendor._id || vendor.vendorNumber, form);
            if (response.success) {
                toast.success(response.message || "Vendor updated successfully");
                onSuccess?.();
                onClose();
            } else {
                toast.error(response.message);
            }
        } catch (err) {
            setError(err?.response?.data?.message || "Failed to update vendor.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal onClose={onClose} maxWidth="max-w-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-50 bg-gray-50/30 rounded-t-2xl">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-erp-accent/10 flex items-center justify-center text-erp-accent shadow-inner">
                        <Icon icon="mdi:account-edit" className="text-2xl" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-widest text-gray-800">Edit Vendor</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Update partner credentials</p>
                    </div>
                </div>
                <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-all group">
                    <Icon icon="mdi:close" className="text-2xl group-hover:rotate-90 transition-transform" />
                </button>
            </div>

            {/* Fields */}
            <div className="px-8 py-8 space-y-6">
                {error && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-500 text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl animate-shake">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <label className={labelCls}>Legal Name <span className="text-rose-400">*</span></label>
                        <div className="relative group">
                            <Icon icon="mdi:account-outline" className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-erp-accent transition-colors" />
                            <input type="text" placeholder="John Doe" value={form.name} onChange={update("name")} className={iconInputCls} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className={labelCls}>Firm / Company</label>
                        <div className="relative group">
                            <Icon icon="mdi:office-building-outline" className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-erp-accent transition-colors" />
                            <input type="text" placeholder="Acme Corp" value={form.firm} onChange={update("firm")} className={iconInputCls} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className={labelCls}>Contact Mobile</label>
                        <div className="relative group">
                            <Icon icon="mdi:phone-outline" className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-erp-accent transition-colors" />
                            <input type="tel" placeholder="9876543210" value={form.mobile} onChange={update("mobile")} className={iconInputCls} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className={labelCls}>Email Address</label>
                        <div className="relative group">
                            <Icon icon="mdi:email-outline" className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-erp-accent transition-colors" />
                            <input type="email" placeholder="vendor@example.com" value={form.email} onChange={update("email")} className={iconInputCls} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className={labelCls}>GST Registration</label>
                        <div className="relative group">
                            <Icon icon="mdi:file-certificate-outline" className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-erp-accent transition-colors" />
                            <input type="text" placeholder="GSTIN-0000" value={form.gstNumber} onChange={update("gstNumber")} className={iconInputCls} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className={labelCls}>Payment Terms</label>
                        <div className="relative group">
                            <Icon icon="mdi:credit-card-outline" className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-erp-accent transition-colors" />
                            <input type="text" placeholder="Net 30 / Advance" value={form.paymentTerms} onChange={update("paymentTerms")} className={iconInputCls} />
                        </div>
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                        <label className={labelCls}>Business Address</label>
                        <div className="relative group">
                            <Icon icon="mdi:map-marker-outline" className="absolute left-5 top-4 text-gray-300 group-focus-within:text-erp-accent transition-colors" />
                            <textarea rows={2} placeholder="Full operational address..." value={form.address} onChange={update("address")}
                                className="w-full bg-gray-50/50 border border-gray-100 rounded-[1.5rem] pl-12 pr-5 py-4 text-xs font-bold text-gray-700 outline-none focus:border-erp-accent/30 focus:ring-4 focus:ring-erp-accent/5 transition-all placeholder:text-gray-300 resize-none"
                            />
                        </div>
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                        <label className={labelCls}>Internal Observations</label>
                        <div className="relative group">
                            <Icon icon="mdi:comment-quote-outline" className="absolute left-5 top-4 text-gray-300 group-focus-within:text-erp-accent transition-colors" />
                            <textarea rows={2} placeholder="Any additional notes..." value={form.notes} onChange={update("notes")}
                                className="w-full bg-gray-50/50 border border-gray-100 rounded-[1.5rem] pl-12 pr-5 py-4 text-xs font-bold text-gray-700 outline-none focus:border-erp-accent/30 focus:ring-4 focus:ring-erp-accent/5 transition-all placeholder:text-gray-300 resize-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 border-t border-gray-50 bg-gray-50/30 flex justify-end gap-4 rounded-b-2xl">
                <button onClick={onClose} className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-all">
                    Cancel
                </button>
                <button onClick={handleSubmit} disabled={loading}
                    className="flex items-center gap-3 px-10 py-3 text-[10px] font-black uppercase tracking-widest text-white bg-erp-accent hover:bg-erp-accent/90 active:scale-95 disabled:opacity-50 rounded-full transition-all shadow-xl shadow-erp-accent/20">
                    {loading ? <Icon icon="mdi:loading" className="animate-spin text-lg" /> : <Icon icon="mdi:content-save-check" className="text-lg" />}
                    {loading ? "Saving Changes..." : "Update Changes"}
                </button>
            </div>
        </Modal>
    );
}