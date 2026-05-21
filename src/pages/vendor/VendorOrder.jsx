import { useEffect, useMemo, useRef, useState } from "react";
import {
    useReactTable, getCoreRowModel, getPaginationRowModel,
    getFilteredRowModel, flexRender,
} from "@tanstack/react-table";
import { Icon } from "@iconify/react";
import * as vendorOrderService from "../../services/vendorOrderService";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";

const FETCH_LIMIT = 100;
const PAGE_SIZE = 100;

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI primitives
// ─────────────────────────────────────────────────────────────────────────────
const Modal = ({ onClose, children, maxWidth = "max-w-lg" }) => (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-all duration-300"
        onClick={onClose}>
        <div className={`relative bg-white rounded-[2.5rem] shadow-2xl w-full ${maxWidth} overflow-hidden scale-in-center`} onClick={e => e.stopPropagation()}>
            {children}
        </div>
    </div>
);

const ModalHeader = ({ title, subtitle, icon, onClose }) => (
    <div className="bg-erp-accent p-6 text-white flex justify-between items-center relative overflow-hidden flex-shrink-0">
        <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Icon icon={icon || "mdi:package-variant"} className="text-2xl" />
            </div>
            <div>
                <h2 className="text-xl font-bold leading-none">{title}</h2>
                {subtitle && <p className="text-xs text-white/80 mt-1">{subtitle}</p>}
            </div>
        </div>
        <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors relative z-10">
            <Icon icon="mdi:close" className="text-2xl" />
        </button>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
    </div>
);

const ModalFooter = ({ children }) => (
    <div className="flex items-center justify-end gap-3 px-8 py-6 border-t border-gray-50 bg-gray-50/30 flex-shrink-0">
        {children}
    </div>
);

const InfoRow = ({ label, value, icon }) => (
    <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-erp-accent/5 flex items-center justify-center flex-shrink-0">
            <Icon icon={icon || "mdi:information-outline"} className="text-erp-accent/60" />
        </div>
        <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-400 mb-0.5">{label}</span>
            <span className="text-sm font-bold text-gray-700">{value || "—"}</span>
        </div>
    </div>
);

const fieldCls = "w-full bg-gray-50/50 border border-gray-100 rounded-full px-5 py-2.5 text-sm text-gray-700 outline-none focus:border-erp-accent/30 focus:ring-4 focus:ring-erp-accent/5 transition-all placeholder:text-gray-300";
const readonlyCls = "w-full bg-gray-100/50 border border-gray-100 rounded-full px-5 py-2.5 text-sm font-semibold text-gray-400 outline-none cursor-default";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1.5 ml-4";

const OrderStatusBadge = ({ value }) => {
    const map = {
        COMPLETED: { cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: "mdi:check-circle-outline" },
        RECEIVED: { cls: "bg-blue-100 text-blue-700 border-blue-200", icon: "mdi:tray-arrow-down" },
        RETURN: { cls: "bg-amber-100 text-amber-700 border-amber-200", icon: "mdi:keyboard-return" },
        PENDING: { cls: "bg-gray-100 text-gray-500 border-gray-200", icon: "mdi:clock-outline" },
        CANCELLED: { cls: "bg-rose-100 text-rose-700 border-rose-200", icon: "mdi:close-circle-outline" },
    };
    const cfg = map[value] || { cls: "bg-gray-100 text-gray-400 border-gray-200", icon: "mdi:help-circle-outline" };
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.cls}`}>
            <Icon icon={cfg.icon} className="text-sm" />
            {value || "—"}
        </span>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Keyword input with vendor-order suggestion dropdown
// ─────────────────────────────────────────────────────────────────────────────
function OrderKeywordInput({ value, onChange }) {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef(null);
    const containerRef = useRef(null);

    const fetchSuggestions = async (q) => {
        if (!q || q.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
        try {
            setSearching(true);
            const data = await vendorOrderService.getVendorOrderSuggestions(q);
            if (data.success) { setSuggestions(data.data || []); setShowSuggestions(true); }
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
        const orderMatch = s._id ? s._id.toLowerCase().includes(q) : false;
        const mobileMatch = s.mobile ? s.mobile.toLowerCase().includes(q) : false;

        let filled = s.name || s._id || "";
        if (orderMatch && !nameMatch && !mobileMatch) filled = s._id;
        else if (mobileMatch && !nameMatch && !orderMatch) filled = s.mobile;
        else filled = s.name || s._id || "";

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
        <div ref={containerRef} className="relative flex flex-col flex-1 min-w-[220px]">
            <label className="text-xs font-semibold text-gray-500 ml-4 mb-2">Search</label>
            <div className="relative group">
                <Icon icon="mdi:magnify" className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-erp-accent text-lg" />
                {searching && (
                    <Icon icon="mdi:loading" className="absolute right-12 top-1/2 -translate-y-1/2 text-erp-accent animate-spin text-lg" />
                )}
                <input
                    type="text"
                    value={value}
                    onChange={handleChange}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="Search by vendor name, order # or mobile..."
                    className={fieldCls + " pl-12 pr-12"}
                />
                {value && !searching && (
                    <button onClick={() => { onChange(""); setSuggestions([]); setShowSuggestions(false); }}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition">
                        <Icon icon="mdi:close-circle" className="text-lg" />
                    </button>
                )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-3 z-50 bg-white border border-gray-100 rounded-[2rem] shadow-2xl overflow-hidden scale-in-center">
                    <div className="px-6 py-3 bg-erp-accent/5 border-b border-erp-accent/10">
                        <p className="text-xs font-bold text-erp-accent">Suggestions</p>
                    </div>
                    <ul className="max-h-64 overflow-y-auto custom-scrollbar">
                        {suggestions.map((s, i) => (
                            <li key={i}>
                                <button onMouseDown={() => handleSelect(s)}
                                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-erp-accent/[0.02] transition-colors text-left border-b border-gray-50 last:border-0">
                                    <div className="w-10 h-10 rounded-2xl bg-erp-accent/5 border border-erp-accent/10 flex items-center justify-center flex-shrink-0">
                                        <Icon icon="mdi:package-variant-closed" className="text-xl text-erp-accent/60" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">{s.name || "-"}</p>
                                        <p className="text-xs text-gray-400 truncate">
                                            #{s._id || ""}
                                            {s.mobile ? ` · ${s.mobile}` : ""}
                                        </p>
                                    </div>
                                    {s.status && <OrderStatusBadge value={s.status} />}
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
export default function VendorOrder() {
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
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [viewOrder, setViewOrder] = useState(false);
    const [orderProducts, setOrderProducts] = useState([]);

    const [returnSingleModal, setReturnSingleModal] = useState(false);
    const [returnAllModal, setReturnAllModal] = useState(false);
    const [singleReturnData, setSingleReturnData] = useState(null);
    const [allReturnProducts, setAllReturnProducts] = useState([]);

    const [statusModal, setStatusModal] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState("");
    const [statusLoading, setStatusLoading] = useState(false);

    const dispatch = useDispatch();

    // ── fetch ────────────────────────────────────────────────────────────────
    const fetchVendorOrders = async (pageNumber = 1, append = false) => {
        try {
            pageNumber === 1 ? setLoading(true) : setLoadingMore(true);
            dispatch(showLoader());
            const data = await vendorOrderService.getAllVendorOrders(pageNumber, FETCH_LIMIT);
            if (data.success) {
                setAllData(prev => append ? [...prev, ...(data.orders || [])] : (data.orders || []));
                setHasMore(data.hasMore);
                setPage(pageNumber);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); setLoadingMore(false); dispatch(hideLoader()); }
    };

    useEffect(() => { fetchVendorOrders(1, false); }, []);

    const fetchVendorOrderDetails = async (orderrow) => {
        try {
            dispatch(showLoader());
            const orderId = orderrow._id || orderrow._id;
            const data = await vendorOrderService.getVendorOrderById(orderId);
            if (data.success) setOrderProducts(data.items);
            else setOrderProducts([]);
        } catch { toast.error("Failed to load items"); setOrderProducts([]); }
        finally { dispatch(hideLoader()); }
    };

    const searchVendorsOrders = async () => {
        if (!fromDate && !toDate && !keyword) return toast.warning("Provide at least one filter");
        if ((fromDate && !toDate) || (!fromDate && toDate)) return toast.warning("Select both dates");
        if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) return toast.warning("Invalid date range");
        if (keyword && keyword.trim().length < 4) return toast.warning("Keyword too short");
        try {
            setLoading(true); dispatch(showLoader());
            const data = await vendorOrderService.searchVendorOrders({ startDate: fromDate || undefined, endDate: toDate || undefined, keyword: keyword || undefined });
            if (data.success) { setFilteredData(data.orders || []); setIsSearching(true); }
            else toast.warning(data.message);
        } catch (err) { toast.error(err.response?.data?.message || "Search failed"); }
        finally { setLoading(false); dispatch(hideLoader()); }
    };

    const handleResetSearch = () => { setFilteredData([]); setIsSearching(false); setFromDate(""); setToDate(""); setKeyword(""); };

    const handleLoadMore = () => {
        if (!hasMore || loadingMore) return;
        fetchVendorOrders(page + 1, true);
    };

    const handleRefresh = () => {
        Swal.fire({
            title: "Reload Database?", text: "Live orders will be synchronized.", icon: "question",
            showCancelButton: true, confirmButtonColor: "#2980B9", cancelButtonColor: "#9ca3af",
            confirmButtonText: "Reload",
        }).then(r => { if (r.isConfirmed) fetchVendorOrders(1, false); });
    };

    const handleDeleteVendorOrder = async (order) => {
        console.log("order", order)
        const result = await Swal.fire({
            title: "Confirm Deletion", text: `Delete order #${order._id}?`, icon: "warning",
            showCancelButton: true, confirmButtonColor: "#EF4444", cancelButtonColor: "#9CA3AF",
            confirmButtonText: "Yes, Delete"
        });
        if (!result.isConfirmed) return;
        try {
            dispatch(showLoader());
            const orderId = order._id || order._id;
            const data = await vendorOrderService.deleteVendorOrder(orderId);
            if (data.success) {
                setAllData(prev => prev.filter(v => (v._id || v._id) !== (order._id || order._id)));
                setFilteredData(prev => prev.filter(v => (v._id || v._id) !== (order._id || order._id)));
                toast.success("Order deleted");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Operation failed");
        } finally { dispatch(hideLoader()); }
    };

    const handleSingleReturnSubmit = async () => {
        const damaged = +singleReturnData.damagedQty || 0;
        const missing = +singleReturnData.missingQty || 0;
        if (damaged === 0 && missing === 0) return toast.error("Specify damaged/missing qty");
        if (damaged + missing > singleReturnData.quantity) return toast.error("Return qty exceeds stock");
        try {
            dispatch(showLoader());
            const orderId = selectedOrder._id || selectedOrder._id;
            const data = await vendorOrderService.updateVendorOrderIssues(orderId, [{ itemId: singleReturnData._id, damageQty: damaged, missingQty: missing, remark: singleReturnData.remark || "" }]);
            if (data.success) {
                toast.success("Issues recorded");
                setReturnSingleModal(false); setSingleReturnData(null); setViewOrder(false);
            }
        } catch (err) { toast.error(err.response?.data?.message || "Update failed"); }
        finally { dispatch(hideLoader()); }
    };

    const handleAllReturnSubmit = async () => {
        if (!allReturnProducts.length) return toast.error("Nothing to return");
        for (let p of allReturnProducts) {
            const total = (+p.damagedQty || 0) + (+p.missingQty || 0);
            if (total === 0) return toast.error(`Specify return qty for ${p.productName}`);
            if (total > p.quantity) return toast.error(`Stock overflow for ${p.productName}`);
        }
        try {
            dispatch(showLoader());
            const orderId = selectedOrder._id || selectedOrder._id;
            const data = await vendorOrderService.updateVendorOrderIssues(orderId, allReturnProducts.map(p => ({ itemId: p._id, damageQty: +p.damagedQty || 0, missingQty: +p.missingQty || 0, remark: p.remark || "" })));
            toast.success("Bulk return completed");
            setReturnAllModal(false); setAllReturnProducts([]); setViewOrder(false);
        } catch (err) { toast.error(err.response?.data?.message || "Operation failed"); }
        finally { dispatch(hideLoader()); }
    };

    const handleStatusUpdate = async () => {
        try {
            setStatusLoading(true); dispatch(showLoader());
            const orderId = selectedOrder._id || selectedOrder._id;
            const data = await vendorOrderService.updateVendorOrderStatus(orderId, selectedStatus);
            toast.success("Status synchronized");
            setStatusModal(false);
            fetchVendorOrders(1, false);
        } catch (err) {
            toast.error(err.response?.data?.message || "Update failed");
            console.log(err, 'err')
        }
        finally { setStatusLoading(false); dispatch(hideLoader()); }
    };

    const columns = useMemo(() => [
        {
            header: "Action", id: "actions",
            cell: ({ row }) => {
                const o = row.original;
                return (
                    <div className="flex items-center justify-center gap-1">
                        <button onClick={e => { e.stopPropagation(); setSelectedOrder(o); fetchVendorOrderDetails(o); setViewOrder(true); }}
                            className="p-2 rounded-full hover:bg-erp-accent/5 text-erp-accent/60 hover:text-erp-accent transition-all" title="View Details">
                            <Icon icon="mdi:eye" className="text-lg" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setSelectedOrder(o); setSelectedStatus(o.status); setStatusModal(true); }}
                            className="p-2 rounded-full hover:bg-emerald-50 text-emerald-500/60 hover:text-emerald-500 transition-all" title="Update Status">
                            <Icon icon="mdi:sync" className="text-lg" />
                        </button>
                    </div>
                );
            },
        },
        { header: "Date", accessorKey: "createdAt", cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString("en-IN") : "-" },
        // { header: "Order #", accessorKey: "Order ID", cell: ({ getValue }) => <span className="font-bold text-gray-800">#{getValue()}</span> },
        { header: "Vendor", accessorKey: "name", cell: ({ getValue }) => <span className="font-bold text-gray-700 text-xs">{getValue() || "—"}</span> },
        { header: "Mobile", accessorKey: "mobile" },
        { header: "Status", accessorKey: "status", cell: ({ getValue }) => <OrderStatusBadge value={getValue()} /> },
        { header: "Total", accessorKey: "grandTotal", cell: ({ getValue }) => <span className="font-bold text-erp-accent">₹{getValue()?.toLocaleString() ?? 0}</span> },
        {
            header: "Manage", id: "delete",
            cell: ({ row }) => (
                <button onClick={e => { e.stopPropagation(); handleDeleteVendorOrder(row.original); }}
                    className="p-2 rounded-full hover:bg-red-50 text-red-300 hover:text-red-500 transition-all mx-auto block" title="Delete Order">
                    <Icon icon="mdi:trash-can-outline" className="text-lg" />
                </button>
            ),
        },
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
    const pages = Array.from({ length: totalPages }, (_, i) => i);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-300">
            <Icon icon="mdi:loading" className="text-6xl animate-spin mb-4 opacity-10" />
            <p className="text-sm font-bold">Loading...</p>
        </div>
    );

    return (
        <div className="w-full flex flex-col gap-6 animate-in fade-in duration-500">

            {/* ── Page Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
                    <p className="text-sm text-gray-500 mt-1">Track orders</p>
                </div>
            </div>

            {/* ── Filter bar ── */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 p-8">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                    <div className="flex flex-wrap items-end gap-6 flex-1">
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-semibold text-gray-500 ml-4">Sync</span>
                            <button onClick={handleRefresh}
                                className="flex items-center gap-2 bg-erp-accent/10 hover:bg-erp-accent text-erp-accent hover:text-white px-6 py-2.5 text-xs font-bold rounded-full transition-all group">
                                <Icon icon="mdi:sync" className="text-lg group-hover:rotate-180 transition-transform duration-700" />
                                Reload
                            </button>
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-semibold text-gray-500 ml-4">Dates</span>
                            <div className="flex items-center gap-3">
                                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className={fieldCls + " w-40"} />
                                <span className="text-xs font-bold text-gray-300">to</span>
                                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className={fieldCls + " w-40"} />
                            </div>
                        </div>

                        <OrderKeywordInput value={keyword} onChange={setKeyword} />
                    </div>

                    <button onClick={searchVendorsOrders}
                        className="w-full lg:w-auto flex items-center justify-center gap-2 bg-erp-accent hover:bg-erp-accent/90 active:scale-95 text-white text-xs font-bold px-10 py-3 rounded-full transition-all shadow-xl shadow-erp-accent/20 whitespace-nowrap">
                        <Icon icon="mdi:filter-variant" className="text-xl" /> Search
                    </button>
                </div>
            </div>

            {/* ── Table card ── */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/40 overflow-hidden flex flex-col min-h-[600px]">

                <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-6 bg-erp-accent rounded-full" />
                        <h2 className="text-sm font-black text-gray-700 uppercase tracking-widest">All Orders</h2>
                    </div>
                    <div className="relative w-64 group">
                        <Icon icon="mdi:magnify" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-erp-accent" />
                        <input type="text" value={globalFilter ?? ""} onChange={e => setGlobalFilter(e.target.value)}
                            placeholder="Search..."
                            className="w-full pl-11 pr-4 py-2.5 text-[10px] font-black border border-gray-100 rounded-full outline-none focus:border-erp-accent/30 focus:ring-4 focus:ring-erp-accent/5 transition-all bg-white"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar flex-1">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-erp-accent text-white">
                                {table.getHeaderGroups().map(hg => hg.headers.map(h => (
                                    <th key={h.id} className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] border-r border-white/10 last:border-r-0 whitespace-nowrap">
                                        {flexRender(h.column.columnDef.header, h.getContext())}
                                    </th>
                                )))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {table.getRowModel().rows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="py-32 text-center opacity-20">
                                        <Icon icon="mdi:package-variant-closed-remove" className="text-6xl mx-auto mb-4" />
                                        <p className="text-xs font-black uppercase tracking-widest">Empty procurement log</p>
                                    </td>
                                </tr>
                            ) : table.getRowModel().rows.map(row => (
                                <tr key={row.id} className="hover:bg-erp-accent/[0.02] transition-all group">
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="px-6 py-4 text-center">
                                            <div className="text-[11px] font-bold text-gray-600 group-hover:text-gray-900 transition-colors">
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
                <div className="p-8 border-t border-gray-50 bg-gray-50/30 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <button
                        onClick={isSearching ? handleResetSearch : handleLoadMore}
                        disabled={loadingMore || (!isSearching && !hasMore)}
                        className={`px-10 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg transition-all
                            ${loadingMore || (!isSearching && !hasMore)
                                ? "bg-gray-100 text-gray-300 shadow-none cursor-not-allowed"
                                : isSearching ? "bg-white border border-gray-100 text-gray-600 hover:bg-gray-50"
                                    : "bg-erp-accent text-white shadow-erp-accent/20 hover:scale-105 active:scale-95"}`}
                    >
                        {loadingMore ? "Fetching Data..." : isSearching ? "Clear All Filters" : "Load More Logs"}
                    </button>
                    <div className="flex items-center gap-2">
                        <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
                            className="p-2.5 rounded-full bg-white border border-gray-100 text-gray-400 hover:text-erp-accent disabled:opacity-30 transition-all">
                            <Icon icon="mdi:chevron-left" className="text-xl" />
                        </button>
                        <div className="flex items-center gap-1 px-4">
                            {pages.slice(Math.max(0, currentPage - 2), Math.min(totalPages, currentPage + 3)).map(p => (
                                <button key={p} onClick={() => table.setPageIndex(p)}
                                    className={`w-9 h-9 rounded-full text-[10px] font-black transition-all ${p === currentPage ? "bg-erp-accent text-white shadow-lg shadow-erp-accent/20 scale-110" : "bg-white text-gray-400 border border-gray-100 hover:bg-gray-50"}`}>
                                    {p + 1}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
                            className="p-2.5 rounded-full bg-white border border-gray-100 text-gray-400 hover:text-erp-accent disabled:opacity-30 transition-all">
                            <Icon icon="mdi:chevron-right" className="text-xl" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── View Order Details Modal ── */}
            {viewOrder && selectedOrder && (
                <Modal onClose={() => setViewOrder(false)} maxWidth="max-w-7xl">
                    <ModalHeader title="Order Details" subtitle={`#${selectedOrder._id} · ${selectedOrder.name}`} icon="mdi:file-eye-outline" onClose={() => setViewOrder(false)} />

                    <div className="p-8 overflow-y-auto custom-scrollbar flex-1 max-h-[70vh] space-y-8">
                        {/* Summary metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <InfoRow label="Vendor Identity" value={selectedOrder.name} icon="mdi:account-tie" />
                            <InfoRow label="Contact Mobile" value={selectedOrder.mobile} icon="mdi:phone" />
                            <InfoRow label="Email Channel" value={selectedOrder.email} icon="mdi:email" />
                            <div>
                                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 block">Status</span>
                                <OrderStatusBadge value={selectedOrder.status} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                            <InfoRow label="Order Timestamp" value={new Date(selectedOrder.createdAt).toLocaleString("en-GB")} icon="mdi:calendar-clock" />
                            <InfoRow label="Taxable Amount" value={`₹${selectedOrder.subTotal?.toLocaleString()}`} icon="mdi:cash" />
                            <InfoRow label="GST Contribution" value={`₹${selectedOrder.gstTotal?.toLocaleString()}`} icon="mdi:receipt-text-outline" />
                            <InfoRow label="Final Invoice Total" value={<span className="text-erp-accent">₹{selectedOrder.grandTotal?.toLocaleString()}</span>} icon="mdi:currency-inr" />
                        </div>

                        {selectedOrder.notes && (
                            <div className="space-y-2">
                                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest ml-4">Procurement Notes</span>
                                <p className="text-[11px] font-bold text-gray-600 bg-gray-50 p-4 rounded-2xl border border-gray-100">{selectedOrder.notes}</p>
                            </div>
                        )}

                        {/* Product List */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-4 bg-erp-accent rounded-full" />
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Product List</h3>
                            </div>
                            <div className="overflow-x-auto rounded-[2rem] border border-gray-100 shadow-inner">
                                <table className="w-full border-collapse">
                                    <thead className="bg-erp-accent text-white">
                                        <tr className="whitespace-nowrap">
                                            {["Ret", "Code", "Category", "Description", "Qty", "Price", "Sub", "Tax", "Total", "Est. Date"].map((h, i) => (
                                                <th key={i} className="px-5 py-3 text-center text-[9px] font-black uppercase tracking-widest border-r border-white/10 last:border-0">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {orderProducts.map((p, idx) => (
                                            <tr key={idx} className="hover:bg-erp-accent/[0.02] transition-colors whitespace-nowrap">
                                                <td className="px-4 py-3 text-center">
                                                    {selectedOrder.status === "RECEIVED" && (
                                                        <button onClick={() => { setSingleReturnData(p); setReturnSingleModal(true); }}
                                                            className="p-2 rounded-full hover:bg-erp-accent/5 text-erp-accent/60 hover:text-erp-accent transition-all" title="Return Item">
                                                            <Icon icon="mdi:keyboard-return" className="text-sm" />
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-[10px] font-bold text-gray-500">{p.productCode}</td>
                                                <td className="px-4 py-3 text-[10px] font-black uppercase tracking-tighter text-gray-400">{p.category}</td>
                                                <td className="px-4 py-3 text-[11px] font-black text-gray-700">{p.productName}</td>
                                                <td className="px-4 py-3 text-center text-[11px] font-black text-gray-500">{p.quantity}</td>
                                                <td className="px-4 py-3 text-center text-[10px] font-bold">₹{p.price?.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-center text-[10px] font-bold">₹{p.subTotal?.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-center text-[9px] font-black text-gray-400">{p.gstPercent}% (₹{p.gstAmount})</td>
                                                <td className="px-4 py-3 text-center text-[11px] font-black text-erp-accent">₹{p.total?.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 opacity-60">
                                                    {p.expectedDate ? new Date(p.expectedDate).toLocaleDateString("en-IN") : "—"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <ModalFooter>
                        {selectedOrder.status === "RECEIVED" && (
                            <button onClick={() => {
                                setAllReturnProducts(orderProducts.map(p => ({ ...p, damagedQty: "", missingQty: "", remark: "" })));
                                setReturnAllModal(true);
                            }}
                                className="flex items-center gap-2 px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-erp-accent rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-erp-accent/20">
                                <Icon icon="mdi:keyboard-return" className="text-lg" /> Return All Items
                            </button>
                        )}
                        <button onClick={() => setViewOrder(false)}
                            className="px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-white border border-gray-100 rounded-full hover:bg-gray-50 transition-all">
                            Close
                        </button>
                    </ModalFooter>
                </Modal>
            )}

            {/* ── Single Return Modal ── */}
            {returnSingleModal && singleReturnData && (
                <Modal onClose={() => setReturnSingleModal(false)} maxWidth="max-w-2xl">
                    <ModalHeader title="Return Item" subtitle={`Adding return for order #${selectedOrder?._id}`} icon="mdi:keyboard-return" onClose={() => setReturnSingleModal(false)} />
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        <div className="bg-gray-50 rounded-[2rem] border border-gray-100 p-6 grid grid-cols-2 md:grid-cols-3 gap-6">
                            {[
                                ["Order Ref", selectedOrder?._id],
                                ["SKU Code", singleReturnData.productCode],
                                ["Category", singleReturnData.category],
                                ["Item Label", singleReturnData.productName],
                                ["Original Qty", singleReturnData.quantity],
                                ["Unit Value", `₹${singleReturnData.price?.toLocaleString()}`],
                            ].map(([lbl, val]) => (
                                <div key={lbl}>
                                    <label className={labelCls}>{lbl}</label>
                                    <input value={val} readOnly className={readonlyCls} />
                                </div>
                            ))}
                        </div>
                        <div className="bg-white rounded-[2rem] border border-erp-accent/10 p-6 space-y-6 shadow-xl shadow-erp-accent/5">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-4 bg-erp-accent rounded-full" />
                                <h3 className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Return Details</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelCls}>Damaged Quantity</label>
                                    <div className="relative">
                                        <Icon icon="mdi:image-broken" className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" />
                                        <input type="number" min="0" placeholder="0 Units"
                                            value={singleReturnData.damagedQty || ""}
                                            onChange={e => setSingleReturnData({ ...singleReturnData, damagedQty: e.target.value })}
                                            className={fieldCls + " pl-12"}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Missing Quantity</label>
                                    <div className="relative">
                                        <Icon icon="mdi:package-variant-remove" className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" />
                                        <input type="number" min="0" placeholder="0 Units"
                                            value={singleReturnData.missingQty || ""}
                                            onChange={e => setSingleReturnData({ ...singleReturnData, missingQty: e.target.value })}
                                            className={fieldCls + " pl-12"}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Note</label>
                                <div className="relative">
                                    <Icon icon="mdi:comment-text-outline" className="absolute left-5 top-5 text-gray-300" />
                                    <textarea placeholder="Describe the condition or reason for return..."
                                        value={singleReturnData.remark || ""}
                                        onChange={e => setSingleReturnData({ ...singleReturnData, remark: e.target.value })}
                                        className={fieldCls + " pl-12 h-24 rounded-[1.5rem] py-4 resize-none"}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <ModalFooter>
                        <button onClick={() => setReturnSingleModal(false)}
                            className="px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-white border border-gray-100 rounded-full hover:bg-gray-50 transition-all">
                            Discard
                        </button>
                        <button onClick={handleSingleReturnSubmit}
                            className="px-10 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-erp-accent rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-erp-accent/20">
                            Save Return
                        </button>
                    </ModalFooter>
                </Modal>
            )}

            {/* ── Return All Modal ── (Truncated similar logic for brevity, following the same theme) ── */}
            {returnAllModal && (
                <Modal onClose={() => setReturnAllModal(false)} maxWidth="max-w-6xl">
                    <ModalHeader title="Return All" subtitle={`Reviewing ${allReturnProducts.length} items for return`} icon="mdi:layers-triple-outline" onClose={() => setReturnAllModal(false)} />
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {allReturnProducts.map((product, index) => (
                            <div key={index} className="bg-gray-50/50 border border-gray-100 rounded-[2rem] p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-erp-accent/5 flex items-center justify-center font-black text-xs text-erp-accent">
                                            {index + 1}
                                        </div>
                                        <p className="text-[11px] font-black text-gray-700 uppercase tracking-widest">{product.productName}</p>
                                    </div>
                                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">#{product.productCode}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className={labelCls}>Ordered Stock</label>
                                        <input value={`${product.quantity} Units`} readOnly className={readonlyCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Damaged</label>
                                        <input type="number" min="0" placeholder="0"
                                            value={product.damagedQty || ""}
                                            onChange={e => { const u = [...allReturnProducts]; u[index].damagedQty = e.target.value; setAllReturnProducts(u); }}
                                            className={fieldCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Missing</label>
                                        <input type="number" min="0" placeholder="0"
                                            value={product.missingQty || ""}
                                            onChange={e => { const u = [...allReturnProducts]; u[index].missingQty = e.target.value; setAllReturnProducts(u); }}
                                            className={fieldCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Remark</label>
                                        <input type="text" placeholder="Note..."
                                            value={product.remark || ""}
                                            onChange={e => { const u = [...allReturnProducts]; u[index].remark = e.target.value; setAllReturnProducts(u); }}
                                            className={fieldCls}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <ModalFooter>
                        <button onClick={() => setReturnAllModal(false)}
                            className="px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-white border border-gray-100 rounded-full hover:bg-gray-50 transition-all">
                            Cancel
                        </button>
                        <button onClick={handleAllReturnSubmit}
                            className="px-12 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-erp-accent rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl shadow-erp-accent/20">
                            Save All Returns
                        </button>
                    </ModalFooter>
                </Modal>
            )}

            {/* ── Update Order Status Modal ── */}
            {statusModal && selectedOrder && (
                <Modal onClose={() => setStatusModal(false)} maxWidth="max-w-md">
                    <ModalHeader title="Update Status" subtitle={`Order ID: ${selectedOrder._id}`} icon="mdi:sync" onClose={() => setStatusModal(false)} />
                    <div className="p-8 space-y-8">
                        <div className="flex items-center justify-between p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Current State</span>
                                <OrderStatusBadge value={selectedOrder.status} />
                            </div>
                            <Icon icon="mdi:arrow-right" className="text-gray-300 text-xl" />
                            <div className="flex flex-col text-right">
                                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">New Status</span>
                                <OrderStatusBadge value={selectedStatus} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={labelCls}>Select Status</label>
                            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className={fieldCls + " h-12"}>
                                {["PENDING", "RECEIVED", "RETURN", "COMPLETED", "CANCELLED"].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        <div className="p-6 bg-erp-accent/5 rounded-[2rem] border border-erp-accent/10 flex items-start gap-4">
                            <Icon icon="mdi:alert-circle-outline" className="text-xl text-erp-accent mt-0.5" />
                            <p className="text-[10px] font-bold text-erp-accent/70 leading-relaxed uppercase  ">
                                Transitioning the order status will affect downstream stock levels and financial auditing. Please verify before confirming.
                            </p>
                        </div>
                    </div>
                    <ModalFooter>
                        <button onClick={() => setStatusModal(false)}
                            className="px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-white border border-gray-100 rounded-full hover:bg-gray-50 transition-all">
                            Cancel
                        </button>
                        <button onClick={handleStatusUpdate} disabled={statusLoading}
                            className="px-10 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-erp-accent rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-erp-accent/20 disabled:opacity-50">
                            {statusLoading ? <Icon icon="mdi:loading" className="animate-spin text-xl" /> : "Confirm State Change"}
                        </button>
                    </ModalFooter>
                </Modal>
            )}
        </div>
    );
}