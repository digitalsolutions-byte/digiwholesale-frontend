import { useState, useEffect, useCallback, useMemo } from "react";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getFilteredRowModel, flexRender } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { Icon } from "@iconify/react";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import * as repairService from "../../services/repairService";

/* ─── Constants ─────────────────────────────────────────────────────────── */
const STATUS_CFG = {
  PENDING: { cls: "bg-amber-100 text-amber-700 border-amber-200", icon: "mdi:clock-outline" },
  IN_PROGRESS: { cls: "bg-blue-100 text-blue-700 border-blue-200", icon: "mdi:progress-wrench" },
  COMPLETED: { cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: "mdi:check-circle-outline" },
  DELIVERED: { cls: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: "mdi:truck-check-outline" },
  CANCELLED: { cls: "bg-rose-100 text-rose-700 border-rose-200", icon: "mdi:close-circle-outline" },
};
const ALL_STATUSES = ["Pending", "In Progress", "Completed", "Delivered", "Cancelled"];
const FETCH_LIMIT = 100;
const PAGE_SIZE = 100;

const inputCls = "w-full bg-gray-50/50 border border-gray-100 rounded-full px-5 py-2.5 text-xs font-bold text-gray-700 outline-none focus:border-erp-accent/30 focus:ring-4 focus:ring-erp-accent/5 transition-all placeholder:text-gray-300";
const fmt = (v) => v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/* ─── Status Badge ──────────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const s = (status || "").toUpperCase().replace(" ", "_");
  const cfg = STATUS_CFG[s] || { cls: "bg-gray-100 text-gray-500 border-gray-200", icon: "mdi:help-circle-outline" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${cfg.cls}`}>
      <Icon icon={cfg.icon} className="text-sm" />
      {status || "—"}
    </span>
  );
};

/* ─── Detail Modal ──────────────────────────────────────────────────────── */
const DetailModal = ({ repair, onClose, onStatusChange, canDelete, onDelete }) => {
  const [status, setStatus] = useState(repair.status);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(repair);
    setDeleting(false);
  };

  const saveStatus = async () => {
    if (status === repair.status) return;
    try {
      setSaving(true);
      await repairService.updateRepairStatus(repair._id || repair.repairNumber, status);
      onStatusChange(repair.repairNumber, status);
      toast.success("Status updated");
    } catch { toast.error("Failed to update status"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all duration-300"
      onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col scale-in-center" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-erp-accent p-6 text-white flex justify-between items-center relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Icon icon="mdi:tools" className="text-2xl" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-widest">Repair #{repair.repairNumber}</h2>
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Repair Details</p>
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
              <h3 className="text-erp-accent font-black uppercase text-[10px] tracking-[0.2em] border-b border-erp-accent/10 pb-2">Customer Info</h3>
              <div className="space-y-4">
                <DetailItem label="Full Name" value={repair.customerName || repair.name} icon="mdi:account" />
                <DetailItem label="Mobile Number" value={repair.customerMobile || repair.mobile} icon="mdi:phone" />
                <DetailItem label="Email Address" value={repair.email} icon="mdi:email" />
              </div>
            </div>

            {/* Repair Info */}
            <div className="space-y-4">
              <h3 className="text-erp-accent font-black uppercase text-[10px] tracking-[0.2em] border-b border-erp-accent/10 pb-2">Repair Details</h3>
              <div className="space-y-4">
                <DetailItem label="Service Type" value={repair.repairType?.replace("_", " ")} icon="mdi:hammer-wrench" />
                <DetailItem label="Product Name" value={repair.productName || repair.item} icon="mdi:package-variant" />
                <DetailItem label="Est. Service Fee" value={repair.estimatedCost || repair.price ? `₹${(repair.estimatedCost || repair.price).toLocaleString()}` : "₹0"} icon="mdi:currency-inr" highlight />
                <DetailItem label="Repair Date" value={fmt(repair.repairDate || repair.createdAt)} icon="mdi:calendar" />
                <DetailItem label="Delivery Date" value={fmt(repair.deliveryDate)} icon="mdi:truck-delivery" />
              </div>
            </div>
          </div>

          {/* Issues & Remarks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Issues</h4>
              <p className="text-xs font-bold text-gray-700 bg-gray-50 p-4 rounded-2xl border border-gray-100 leading-relaxed min-h-[80px]">
                {repair.issueDescription || repair.issue || "No specific fault recorded"}
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notes</h4>
              <p className="text-xs font-bold text-gray-700 bg-gray-50 p-4 rounded-2xl border border-gray-100 leading-relaxed min-h-[80px]">
                {repair.remark || "No internal remarks"}
              </p>
            </div>
          </div>

          {/* Photos */}
          {(repair.attachments?.length > 0 || repair.images?.length > 0) && (
            <div className="space-y-4">
              <h3 className="text-erp-accent font-black uppercase text-[10px] tracking-[0.2em] border-b border-erp-accent/10 pb-2">Photos</h3>
              <div className="flex flex-wrap gap-4">
                {(repair.attachments || repair.images).map((img, i) => (
                  <a key={i} href={img} target="_blank" rel="noopener noreferrer"
                    className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm hover:shadow-xl hover:scale-105 transition-all duration-300">
                    <img src={img} alt="repair attachment" className="w-full h-full object-cover" />
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
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Change To</span>
                  <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls + " w-56"}>
                    {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </div>
              </div>
              <button
                onClick={saveStatus}
                disabled={saving || status === repair.status}
                className="w-full md:w-auto px-10 py-3 bg-erp-accent text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-erp-accent/20 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
              >
                {saving ? "Saving..." : "Save Status"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50/50 border-t border-gray-50 flex justify-between items-center">
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-6 py-3 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-full transition-all flex items-center gap-2 group"
            >
              <Icon icon={deleting ? "mdi:loading" : "mdi:trash-can-outline"} className={`text-lg ${deleting ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
              {deleting ? "Deleting..." : "Delete Repair"}
            </button>
          )}
          <button onClick={onClose} className="px-10 py-3 bg-white border border-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-gray-50 transition-all">
            Close
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

/* ─── Edit Repair Modal ─────────────────────────────────────────────────── */
const EditRepairModal = ({ repair, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: "", mobile: "", email: "", item: "", 
    price: "", deliveryDate: "", repairType: "", issue: "", remark: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (repair) {
      setForm({
        name: repair.customerName || repair.name || "",
        mobile: repair.customerMobile || repair.mobile || "",
        email: repair.email || "",
        item: repair.productName || repair.item || "",
        price: repair.estimatedCost || repair.price || "",
        deliveryDate: repair.deliveryDate ? new Date(repair.deliveryDate).toISOString().split('T')[0] : "",
        repairType: repair.repairType || "SERVICE",
        issue: repair.issueDescription || repair.issue || "",
        remark: repair.remark || ""
      });
    }
  }, [repair]);

  const update = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.mobile || !form.item) {
      return toast.error("Required fields missing");
    }
    try {
      setLoading(true);
      const { repairType, vendorId, ...payload } = form;
      const res = await repairService.updateRepair(repair._id || repair.repairNumber, payload);
      if (res.success) {
        toast.success("Repair updated");
        onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(err.message || "Failed to update");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="bg-erp-accent p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Icon icon="mdi:pencil-circle" className="text-3xl" />
            <h2 className="text-lg font-black uppercase tracking-widest">Edit Repair</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
            <Icon icon="mdi:close" className="text-2xl" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Customer Name</label>
              <input value={form.name} onChange={update("name")} className={inputCls} placeholder="Name" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Mobile</label>
              <input value={form.mobile} onChange={update("mobile")} className={inputCls} placeholder="Mobile" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Product Name</label>
              <input value={form.item} onChange={update("item")} className={inputCls} placeholder="Product" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Estimated Cost</label>
              <input type="number" value={form.price} onChange={update("price")} className={inputCls} placeholder="Cost" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Delivery Date</label>
            <input type="date" value={form.deliveryDate} onChange={update("deliveryDate")} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Issue Description</label>
            <textarea value={form.issue} onChange={update("issue")} className={inputCls + " h-24 py-3 rounded-2xl resize-none"} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Notes</label>
            <textarea value={form.remark} onChange={update("remark")} className={inputCls + " h-20 py-3 rounded-2xl resize-none"} />
          </div>
        </form>
        <div className="p-6 bg-gray-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-white border border-gray-100 rounded-full hover:bg-gray-100">Cancel</button>
          <button type="submit" onClick={handleSubmit} disabled={loading} className="px-10 py-2.5 bg-erp-accent text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-erp-accent/20 hover:scale-105 active:scale-95 disabled:opacity-50">
            {loading ? "Updating..." : "Update Repair"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════════════ */
export default function RepairList() {
  const user = useSelector(s => s.auth.user);
  const permissions = user?.permissions || [];
  const employeeType = (user?.EmployeeType?.name || user?.EmployeeType || "").toUpperCase();

  const checkPerm = (p) => {
    if (!permissions) return false;
    if (Array.isArray(permissions)) return permissions.includes(p);
    return !!permissions[p];
  };

  const canDelete = employeeType === "ADMIN" || employeeType === "SUPERADMIN" || checkPerm("DELETE REPAIR");

  const [allData, setAllData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editRepair, setEditRepair] = useState(null);
  const [globalFilter, setGlobalFilter] = useState("");

  const [keyword, setKeyword] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const dispatch = useDispatch();

  const fetchRepairs = useCallback(async (pg = 1, append = false) => {
    try {
      pg === 1 ? dispatch(showLoader()) : setLoadingMore(true);
      const data = await repairService.getAllRepairs(pg, FETCH_LIMIT);
      if (data.success) {
        setAllData(prev => append ? [...prev, ...(data.repairs || [])] : (data.repairs || []));
        setHasMore(data.hasMore);
        setPage(pg);
      }
    } catch { toast.error("Failed to load repairs"); }
    finally { dispatch(hideLoader()); setLoadingMore(false); }
  }, []);

  const searchRepairs = async () => {
    if (!startDate && !keyword) return toast.warning("Provide at least Start Date or Keyword");
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) return toast.warning("Invalid date range");

    try {
      setPage(1);
      dispatch(showLoader());
      const data = await repairService.searchRepairs({
        keyword: keyword?.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (data.success) {
        setFilteredData(data.repairsData || []);
        setIsSearching(true);
      } else toast.warning(data.message);
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
    console.log(repair, 'repair')
    const repairId = repair._id || repair.id;
    if (!repairId) return toast.error("Invalid repair ID");

    const result = await Swal.fire({
      title: "Confirm Deletion",
      text: `Delete repair #${repairId}? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#9CA3AF",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      background: "#fff",
      borderRadius: "2rem",
      customClass: {
        title: "text-lg font-black uppercase tracking-widest text-gray-700",
        htmlContainer: "text-xs font-bold text-gray-500",
        confirmButton: "px-10 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20",
        cancelButton: "px-10 py-3 rounded-full text-[10px] font-black uppercase tracking-widest"
      }
    });

    if (!result.isConfirmed) return;

    try {
      dispatch(showLoader());
      await repairService.deleteRepair(repairId);

      // Update UI state
      const filterFn = r => (r._id || r.id) !== repairId && r.repairNumber !== repair.repairNumber;
      setAllData(prev => prev.filter(filterFn));
      setFilteredData(prev => prev.filter(filterFn));

      // Close modal if open for this repair
      setSelected(prev => (prev?._id === repairId || prev?.repairNumber === repair.repairNumber) ? null : prev);

      toast.success("Repair record permanently deleted");
    } catch (err) {
      toast.error(err.message || "Delete failed");
    }
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
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={e => { e.stopPropagation(); setEditRepair(row.original); }}
            className="p-2 rounded-full hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-all"
          >
            <Icon icon="mdi:pencil" className="text-lg" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setSelected(row.original); }}
            className="p-2 rounded-full hover:bg-erp-accent/5 text-erp-accent/60 hover:text-erp-accent transition-all"
          >
            <Icon icon="mdi:eye" className="text-lg" />
          </button>
        </div>
      ),
    },
    {
      header: "Date",
      accessorKey: "repairDate",
      cell: ({ row }) => fmt(row.original.repairDate || row.original.createdAt),
    },
    { header: "Name", accessorFn: row => row.customerName || row.name },
    { header: "Mobile", accessorFn: row => row.customerMobile || row.mobile },
    { header: "Product", accessorFn: row => row.productName || row.item },
    {
      header: "Cost",
      accessorFn: row => row.estimatedCost || row.price,
      cell: ({ getValue }) => <span className="font-bold text-erp-accent">₹{getValue() || 0}</span>,
    },
    {
      header: "Promise Date",
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
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">

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
                {isSearching ? "Reset Filter" : "Refresh"}
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
            <h2 className="text-sm font-black text-gray-700 uppercase tracking-widest">Repairs</h2>
          </div>
          <div className="relative w-64 group">
            <Icon icon="mdi:filter-variant" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-erp-accent" />
            <input
              type="text" value={globalFilter ?? ""} onChange={e => setGlobalFilter(e.target.value)}
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
          canDelete={canDelete}
          onDelete={handleDeleteRepair}
        />
      )}

      {editRepair && (
        <EditRepairModal
          repair={editRepair}
          onClose={() => setEditRepair(null)}
          onSuccess={() => fetchRepairs(1)}
        />
      )}
    </div>
  );
}