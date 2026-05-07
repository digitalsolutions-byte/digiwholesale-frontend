import { useState, useEffect, useCallback, useMemo } from "react";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getFilteredRowModel, flexRender } from "@tanstack/react-table";
import api from "../../utils/api";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { Icon } from "@iconify/react";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";

/* ─── Constants ─────────────────────────────────────────────────────────── */
const STATUS_CFG = {
  Pending: { cls: "bg-amber-100 text-amber-700 border-amber-200", icon: "mdi:clock-outline" },
  "In Progress": { cls: "bg-blue-100 text-blue-700 border-blue-200", icon: "mdi:progress-wrench" },
  Completed: { cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: "mdi:check-circle-outline" },
  Cancelled: { cls: "bg-rose-100 text-rose-700 border-rose-200", icon: "mdi:close-circle-outline" },
};
const ALL_STATUSES = ["Pending", "In Progress", "Completed", "Cancelled"];
const FETCH_LIMIT = 100;
const PAGE_SIZE = 100;

const inputCls = "w-full bg-gray-50/50 border border-gray-100 rounded-full px-5 py-2.5 text-xs font-bold text-gray-700 outline-none focus:border-erp-accent/30 focus:ring-4 focus:ring-erp-accent/5 transition-all placeholder:text-gray-300";
const fmt = (v) => v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/* ─── Status Badge ──────────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || { cls: "bg-gray-100 text-gray-500 border-gray-200", icon: "mdi:help-circle-outline" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${cfg.cls}`}>
      <Icon icon={cfg.icon} className="text-sm" />
      {status || "—"}
    </span>
  );
};

/* ─── Detail Modal ──────────────────────────────────────────────────────── */
const DetailModal = ({ repair, onClose, onStatusChange }) => {
  const [status, setStatus] = useState(repair.status);
  const [saving, setSaving] = useState(false);

  const saveStatus = async () => {
    if (status === repair.status) return;
    try {
      setSaving(true);
      await api.patch(`/repair/${repair.repairNumber}/status`, { status });
      onStatusChange(repair.repairNumber, status);
      toast.success("Status updated");
    } catch { toast.error("Failed to update status"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col scale-in-center" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-erp-accent p-6 text-white flex justify-between items-center relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Icon icon="mdi:tools" className="text-2xl" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-widest">Repair #{repair.repairNumber}</h2>
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Details & Status Management</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors relative z-10">
            <Icon icon="mdi:close" className="text-2xl" />
          </button>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Customer Info */}
            <div className="space-y-4">
              <h3 className="text-erp-accent font-black uppercase text-[10px] tracking-[0.2em] border-b border-erp-accent/10 pb-2">Customer Information</h3>
              <div className="space-y-4">
                <DetailItem label="Full Name" value={repair.name} icon="mdi:account" />
                <DetailItem label="Mobile Number" value={repair.mobile} icon="mdi:phone" />
                <DetailItem label="Email Address" value={repair.email} icon="mdi:email" />
              </div>
            </div>

            {/* Repair Info */}
            <div className="space-y-4">
              <h3 className="text-erp-accent font-black uppercase text-[10px] tracking-[0.2em] border-b border-erp-accent/10 pb-2">Repair Particulars</h3>
              <div className="space-y-4">
                <DetailItem label="Item Description" value={repair.item} icon="mdi:package-variant" />
                <DetailItem label="Repair Price" value={repair.price ? `₹${repair.price.toLocaleString()}` : "₹0"} icon="mdi:currency-inr" highlight />
                <DetailItem label="Repair Date" value={fmt(repair.repairDate || repair.createdAt)} icon="mdi:calendar" />
                <DetailItem label="Est. Delivery" value={fmt(repair.deliveryDate)} icon="mdi:truck-delivery" />
              </div>
            </div>
          </div>

          {/* Issues & Remarks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reported Issue</h4>
              <p className="text-xs font-bold text-gray-700 bg-gray-50 p-4 rounded-2xl border border-gray-100 leading-relaxed min-h-[80px]">
                {repair.issue || "No specific issue recorded"}
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Internal Remarks</h4>
              <p className="text-xs font-bold text-gray-700 bg-gray-50 p-4 rounded-2xl border border-gray-100 leading-relaxed min-h-[80px]">
                {repair.remark || "No internal remarks"}
              </p>
            </div>
          </div>

          {/* Photos */}
          {repair.images?.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-erp-accent font-black uppercase text-[10px] tracking-[0.2em] border-b border-erp-accent/10 pb-2">Verification Photos</h3>
              <div className="flex flex-wrap gap-4">
                {repair.images.map((img, i) => (
                  <a key={i} href={img} target="_blank" rel="noopener noreferrer" 
                     className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm hover:shadow-xl hover:scale-105 transition-all duration-300">
                    <img src={img} alt="repair" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Status Update */}
          <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Status</span>
                  <StatusBadge status={repair.status} />
                </div>
                <Icon icon="mdi:arrow-right" className="text-gray-300 text-xl hidden md:block" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Update To</span>
                  <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls + " w-48"}>
                    {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <button
                onClick={saveStatus}
                disabled={saving || status === repair.status}
                className="w-full md:w-auto px-8 py-3 bg-erp-accent text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-erp-accent/20 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
              >
                {saving ? "Updating..." : "Confirm Update"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50/50 border-t border-gray-50 flex justify-end">
          <button onClick={onClose} className="px-10 py-3 bg-white border border-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-gray-50 transition-all">
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({ label, value, icon, highlight }) => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-full bg-erp-accent/5 flex items-center justify-center flex-shrink-0">
      <Icon icon={icon} className="text-erp-accent/60" />
    </div>
    <div className="flex flex-col">
      <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{label}</span>
      <span className={`text-[11px] font-bold ${highlight ? 'text-erp-accent' : 'text-gray-700'}`}>{value || "—"}</span>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function RepairList() {
  const { permissions = {}, role } = useSelector(s => s.auth.user || {});
  const checkPerm = (p) => Array.isArray(permissions) ? permissions.includes(p) : !!permissions[p];
  const canDelete = role === "ADMIN" || role === "SUPERADMIN" || checkPerm("DELETE REPAIR");

  const [allData, setAllData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState(null);
  const [globalFilter, setGlobalFilter] = useState("");

  const [keyword, setKeyword] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const dispatch = useDispatch();

  const fetchRepairs = useCallback(async (pg = 1, append = false) => {
    try {
      pg === 1 ? dispatch(showLoader()) : setLoadingMore(true);
      const res = await api.get(`/repair?page=${pg}&limit=${FETCH_LIMIT}`);
      if (res.data.success) {
        setAllData(prev => append ? [...prev, ...(res.data.repairs || [])] : (res.data.repairs || []));
        setHasMore(res.data.hasMore);
        setPage(pg);
      }
    } catch { toast.error("Failed to load repairs"); }
    finally { dispatch(hideLoader()); setLoadingMore(false); }
  }, []);

  const searchRepairs = async () => {
    if (!startDate && !endDate && !keyword) return toast.warning("Provide at least one filter");
    if ((startDate && !endDate) || (!startDate && endDate)) return toast.warning("Select both dates");
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) return toast.warning("Invalid date range");
    if (keyword && keyword.trim().length < 4) return toast.warning("Keyword too short");

    try {
      setPage(1);
      dispatch(showLoader());
      const res = await api.post("/repair/search", {
        keyword: keyword?.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (res.data.success) {
        setFilteredData(res.data.repairsData || []);
        setIsSearching(true);
      } else toast.warning(res.data.message);
    } catch { toast.error("Search failed"); }
    finally { dispatch(hideLoader()); }
  };

  const handleResetSearch = () => {
    setFilteredData([]); setIsSearching(false);
    setKeyword(""); setStartDate(""); setEndDate("");
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    fetchRepairs(page + 1, true);
  };

  const handleDeleteRepair = async (repair) => {
    const result = await Swal.fire({
      title: "Confirm Deletion",
      text: `Delete repair #${repair.repairNumber}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#9CA3AF",
      confirmButtonText: "Yes, Delete"
    });
    if (!result.isConfirmed) return;
    try {
      dispatch(showLoader());
      await api.delete(`/repair/${repair.repairNumber}`);
      setAllData(prev => prev.filter(r => r.repairNumber !== repair.repairNumber));
      setFilteredData(prev => prev.filter(r => r.repairNumber !== repair.repairNumber));
      toast.success("Repair deleted");
    } catch { toast.error("Delete failed"); }
    finally { dispatch(hideLoader()); }
  };

  const handleStatusChange = (id, newStatus) => {
    const update = arr => arr.map(r => r.repairNumber === id ? { ...r, status: newStatus } : r);
    setAllData(update);
    setFilteredData(update);
    setSelected(prev => prev?.repairNumber === id ? { ...prev, status: newStatus } : prev);
  };

  useEffect(() => { fetchRepairs(1); }, []);

  const columns = useMemo(() => [
    {
      header: "Action",
      id: "actions",
      cell: ({ row }) => (
        <button
          onClick={e => { e.stopPropagation(); setSelected(row.original); }}
          className="p-2 rounded-full hover:bg-erp-accent/5 text-erp-accent/60 hover:text-erp-accent transition-all"
        >
          <Icon icon="mdi:eye" className="text-lg" />
        </button>
      ),
    },
    {
      header: "Date",
      accessorKey: "repairDate",
      cell: ({ row }) => fmt(row.original.repairDate || row.original.createdAt),
    },
    { header: "Name", accessorKey: "name" },
    { header: "Mobile", accessorKey: "mobile" },
    { header: "Item", accessorKey: "item" },
    {
      header: "Price",
      accessorKey: "price",
      cell: ({ getValue }) => <span className="font-bold text-erp-accent">₹{getValue() || 0}</span>,
    },
    {
      header: "Delivery",
      accessorKey: "deliveryDate",
      cell: ({ getValue }) => fmt(getValue()),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ getValue }) => <StatusBadge status={getValue()} />,
    },
    {
      header: "Delete",
      id: "delete",
      cell: ({ row }) => canDelete ? (
        <button
          onClick={e => { e.stopPropagation(); handleDeleteRepair(row.original); }}
          className="p-2 rounded-full hover:bg-red-50 text-red-300 hover:text-red-500 transition-all mx-auto block"
        >
          <Icon icon="mdi:trash-can-outline" className="text-lg" />
        </button>
      ) : "—",
    },
  ], [canDelete]);

  const table = useReactTable({
    data: isSearching ? filteredData : allData,
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
  const pages = Array.from({ length: totalPages }, (_, i) => i);

  return (
    <div className="p-6 min-h-screen bg-gray-50/50">

      {/* ── Filter Bar ── */}
      <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100/80 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="flex flex-wrap items-end gap-6 flex-1">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Quick Refresh</span>
              <button
                onClick={isSearching ? handleResetSearch : () => fetchRepairs(1)}
                className="flex items-center gap-2 bg-erp-accent/10 hover:bg-erp-accent text-erp-accent hover:text-white px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-all group"
              >
                <Icon icon="mdi:refresh" className="text-lg group-hover:rotate-180 transition-transform duration-700" />
                {isSearching ? "Reset Filter" : "Reload Repairs"}
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Date Range</span>
              <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls + " w-40"} />
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-tighter">to</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls + " w-40"} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Search Keyword</span>
              <div className="relative group">
                <Icon icon="mdi:magnify" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-erp-accent" />
                <input
                  type="text" value={keyword} onChange={e => setKeyword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && searchRepairs()}
                  placeholder="Customer name, mobile or item..."
                  className={inputCls + " pl-12 pr-4"}
                />
              </div>
            </div>
          </div>

          <button onClick={searchRepairs} className="px-10 py-3 bg-erp-accent hover:bg-erp-accent/90 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-erp-accent/20 transition-all hover:scale-105 active:scale-95">
            Filter Results
          </button>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col min-h-[600px]">
        <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
          <div className="flex items-center gap-3">
            <div className="w-2 h-6 bg-erp-accent rounded-full" />
            <h2 className="text-sm font-black text-gray-700 uppercase tracking-widest">Repair Log</h2>
          </div>
          <div className="relative w-64 group">
            <Icon icon="mdi:filter-variant" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-erp-accent" />
            <input
              type="text" value={globalFilter ?? ""} onChange={e => setGlobalFilter(e.target.value)}
              placeholder="Quick search records..."
              className="w-full pl-11 pr-4 py-2.5 text-[10px] font-black border border-gray-100 rounded-full outline-none focus:border-erp-accent/30 focus:ring-4 focus:ring-erp-accent/5 transition-all bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-erp-accent text-white">
                {table.getHeaderGroups().map(hg => hg.headers.map(h => (
                  <th key={h.id} className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] border-r border-white/10 last:border-r-0">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                )))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-32 text-center opacity-20">
                    <Icon icon="mdi:tools-off" className="text-6xl mx-auto mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">No repairs matching criteria</p>
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
                : isSearching ? "bg-white border border-gray-100 text-gray-600 hover:bg-gray-50 shadow-gray-200/50"
                : "bg-erp-accent text-white shadow-erp-accent/20 hover:scale-105 active:scale-95"}`}
          >
            {loadingMore ? "Loading Records..." : isSearching ? "Reset All Filters" : "Load More Data"}
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

      {selected && (
        <DetailModal
          repair={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}