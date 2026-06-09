import { useState, useEffect, useCallback, useMemo } from "react";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getFilteredRowModel, flexRender } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { Icon } from "@iconify/react";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import * as saleService from "../../services/saleService";

/* ─── Constants ─────────────────────────────────────────────────────────── */
const SALES_ITEMS = [
  "EYE TESTING",
  "CONTACT LENS SOLUTION",
  "LENS SPRAY",
  "CONTACT LENS CASE",
  "FRAME CHAIN",
  "SPECS CASE",
  "MISC",
  "OTHER",
  "FRAMES",
  "SUNGLASSES"
];

const FETCH_LIMIT = 20;
const PAGE_SIZE = 20;

const inputCls = "w-full bg-gray-50/50 border border-gray-100 rounded-full px-5 py-2.5 text-xs font-bold text-gray-700 outline-none focus:border-erp-accent/30 focus:ring-4 focus:ring-erp-accent/5 transition-all placeholder:text-gray-300";
const fmt = (v) => v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/* ─── Add / Edit Sale Modal ─────────────────────────────────────────────── */
const SaleModal = ({ sale, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    item: SALES_ITEMS[0],
    amount: '',
    qty: 1,
    discount: 0,
    subtotal: 0,
    gst: 0,
    gstAmt: 0,
    gstType: 'excluded',
    totalAmount: 0,
    paymentMode: 'CASH'
  });
  const [loading, setLoading] = useState(false);
  const isEdit = !!sale;

  useEffect(() => {
    if (sale) {
      setForm({
        item: sale.item || SALES_ITEMS[0],
        amount: sale.amount || '',
        qty: sale.qty || 1,
        discount: sale.discount || 0,
        subtotal: sale.subtotal || 0,
        gst: sale.gst || 0,
        gstAmt: sale.gstAmt || 0,
        gstType: sale.gstType || 'excluded',
        totalAmount: sale.totalAmount || 0,
        paymentMode: sale.paymentMode || 'CASH'
      });
    }
  }, [sale]);

  useEffect(() => {
    const amount = parseFloat(form.amount) || 0;
    const qty = parseInt(form.qty) || 1;
    const discount = parseFloat(form.discount) || 0;
    const gstPercent = parseFloat(form.gst) || 0;
    
    let subtotal = (amount * qty) - discount;
    if (subtotal < 0) subtotal = 0;

    let gstAmount = 0;
    let totalAmount = subtotal;

    if (form.gstType === 'excluded') {
      gstAmount = subtotal * (gstPercent / 100);
      totalAmount = subtotal + gstAmount;
    } else if (form.gstType === 'included') {
      gstAmount = subtotal - (subtotal / (1 + (gstPercent / 100)));
      totalAmount = subtotal;
    }

    setForm(prev => ({
      ...prev,
      subtotal: parseFloat(subtotal).toFixed(2),
      gstAmt: parseFloat(gstAmount).toFixed(2),
      totalAmount: parseFloat(totalAmount).toFixed(2)
    }));
  }, [form.amount, form.qty, form.discount, form.gst, form.gstType]);

  const update = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.item || !form.amount) {
      return toast.error("Please fill in required fields (Item, Amount).");
    }

    try {
      setLoading(true);
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        qty: parseInt(form.qty),
        discount: parseFloat(form.discount),
        subtotal: parseFloat(form.subtotal),
        gst: parseFloat(form.gst),
        gstAmt: parseFloat(form.gstAmt),
        totalAmount: parseFloat(form.totalAmount)
      };

      if (isEdit) {
        await saleService.updateSale(sale._id || sale.id, payload);
        toast.success("Sale updated successfully");
      } else {
        await saleService.createSale(payload);
        toast.success("Sale created successfully");
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="bg-erp-accent p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Icon icon={isEdit ? "mdi:pencil-circle" : "mdi:plus-circle"} className="text-3xl" />
            <h2 className="text-lg font-black uppercase tracking-widest">{isEdit ? "Edit Sale" : "New Sale"}</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
            <Icon icon="mdi:close" className="text-2xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1 lg:col-span-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Sales Item *</label>
              <select value={form.item} onChange={update("item")} className={inputCls}>
                {SALES_ITEMS.map((item, idx) => (
                  <option key={idx} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Amount *</label>
              <input type="number" value={form.amount} onChange={update("amount")} className={inputCls} placeholder="Amount" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Qty</label>
              <input type="number" value={form.qty} onChange={update("qty")} className={inputCls} placeholder="Qty" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Discount</label>
              <input type="number" value={form.discount} onChange={update("discount")} className={inputCls} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Subtotal</label>
              <input type="text" readOnly value={form.subtotal} className={`${inputCls} bg-gray-100 cursor-not-allowed`} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">GST %</label>
              <select value={form.gst} onChange={update("gst")} className={inputCls}>
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">GST Type</label>
              <select value={form.gstType} onChange={update("gstType")} className={inputCls}>
                <option value="excluded">Excluded</option>
                <option value="included">Included</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">GST Amt</label>
              <input type="text" readOnly value={form.gstAmt} className={`${inputCls} bg-gray-100 cursor-not-allowed`} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Total Amount</label>
              <input type="text" readOnly value={form.totalAmount} className={`${inputCls} bg-emerald-50 text-emerald-700 cursor-not-allowed text-lg`} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Payment Mode</label>
              <select value={form.paymentMode} onChange={update("paymentMode")} className={inputCls}>
                <option value="CASH">CASH</option>
                <option value="CARD">CARD</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
          </div>
        </form>

        <div className="p-6 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-white border border-gray-100 rounded-full hover:bg-gray-100">Cancel</button>
          <button type="submit" onClick={handleSubmit} disabled={loading} className="px-10 py-2.5 bg-erp-accent text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-erp-accent/20 hover:scale-105 active:scale-95 disabled:opacity-50">
            {loading ? "Saving..." : isEdit ? "Update Sale" : "Create Sale"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE: SALES LIST
   ══════════════════════════════════════════════════════════════════════════ */
export default function SalesList() {
  const user = useSelector(s => s.auth.user);
  const permissions = user?.permissions || [];
  const employeeType = (user?.EmployeeType?.name || user?.EmployeeType || "").toUpperCase();

  const checkPerm = (p) => {
    if (!permissions) return false;
    if (Array.isArray(permissions)) return permissions.includes(p);
    return !!permissions[p];
  };

  const canManage = employeeType === "ADMIN" || employeeType === "SUPERADMIN" || checkPerm("CanManageSales");
  const canDelete = employeeType === "ADMIN" || employeeType === "SUPERADMIN" || checkPerm("CanDeleteSales");

  const [allData, setAllData] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [globalFilter, setGlobalFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  const dispatch = useDispatch();

  const fetchSales = useCallback(async (pg = 1, append = false) => {
    try {
      pg === 1 ? dispatch(showLoader()) : setLoadingMore(true);
      const data = await saleService.getSales(pg, FETCH_LIMIT);
      console.log(data, "data")
      if (data) {
        // Handle pagination structure dynamically (assuming data.data or data.sales is the list)
        const items = Array.isArray(data) ? data : (data.data.sales || data.sales || []);
        console.log(items, 'items')
        setAllData(prev => append ? [...prev, ...items] : items);
        setPage(pg);
      }
    } catch {
      toast.error("Failed to load sales");
    }
    finally {
      dispatch(hideLoader());
      setLoadingMore(false);
    }
  }, [dispatch]);

  const handleDelete = async (sale) => {
    const saleId = sale._id || sale.id;
    if (!saleId) return toast.error("Invalid sale ID");

    const result = await Swal.fire({
      title: "Confirm Deletion",
      text: `Delete this sale record? This action cannot be undone.`,
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
      await saleService.deleteSale(saleId);
      setAllData(prev => prev.filter(s => (s._id || s.id) !== saleId));
      toast.success("Sale deleted successfully");
    } catch (err) {
      toast.error(err.message || "Delete failed");
    } finally {
      dispatch(hideLoader());
    }
  };

  const handleEdit = (sale) => {
    setSelectedSale(sale);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedSale(null);
    setIsModalOpen(true);
  };

  useEffect(() => { fetchSales(1); }, [fetchSales]);

  const columns = useMemo(() => [
    {
      header: "Date",
      accessorKey: "createdAt",
      cell: ({ row }) => fmt(row.original.createdAt || row.original.date),
    },
    // { header: "Customer Name", accessorFn: row => row.customerName },
    // { header: "Mobile", accessorFn: row => row.mobile },
    {
      header: "Item",
      accessorFn: row => row.item,
      cell: ({ getValue }) => <span className="font-bold text-erp-accent/80">{getValue()}</span>
    },
    {
      header: "Amount",
      accessorFn: row => row.price || row.amount,
      cell: ({ getValue }) => <span className="font-bold text-emerald-600">₹{getValue() || 0}</span>,
    },
    {
      header: "Action",
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-2">
          {canManage && (
            <button
              onClick={e => { e.stopPropagation(); handleEdit(row.original); }}
              className="p-2 rounded-full hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-all"
            >
              <Icon icon="mdi:pencil" className="text-lg" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={e => { e.stopPropagation(); handleDelete(row.original); }}
              className="p-2 rounded-full hover:bg-red-50 text-red-300 hover:text-red-500 transition-all"
            >
              <Icon icon="mdi:trash-can-outline" className="text-lg" />
            </button>
          )}
        </div>
      ),
    },
  ], [canManage, canDelete]);

  const table = useReactTable({
    data: allData,
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
      <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100/80 mb-2 flex items-center justify-between">
        <div className="relative w-full max-w-sm group">
          <Icon icon="mdi:magnify" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-erp-accent" />
          <input
            type="text" value={globalFilter ?? ""} onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Search sales..."
            className="w-full pl-11 pr-4 py-2.5 text-xs font-bold border border-gray-100 rounded-full outline-none focus:border-erp-accent/30 focus:ring-4 focus:ring-erp-accent/5 transition-all bg-gray-50/50"
          />
        </div>

        <button onClick={handleAdd} className="flex items-center gap-2 px-8 py-3 bg-erp-accent hover:bg-erp-accent/90 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-erp-accent/20 transition-all hover:scale-105 active:scale-95">
          <Icon icon="mdi:plus-circle" className="text-lg" />
          Add Sale
        </button>
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col min-h-[500px]">
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
                  <td colSpan={columns.length} className="py-32 text-center opacity-40">
                    <Icon icon="mdi:cash-register" className="text-6xl mx-auto mb-4 text-gray-300" />
                    <p className="text-xs font-black uppercase tracking-widest text-gray-500">No sales found</p>
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
            onClick={() => fetchSales(page + 1, true)}
            disabled={loadingMore}
            className={`px-10 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg transition-all
              ${loadingMore
                ? "bg-gray-100 text-gray-300 shadow-none cursor-not-allowed"
                : "bg-white border border-gray-100 text-gray-600 hover:bg-gray-50 shadow-gray-200/50"}`}
          >
            {loadingMore ? "Loading..." : "Load More"}
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

      {isModalOpen && (
        <SaleModal
          sale={selectedSale}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => fetchSales(1)}
        />
      )}
    </div>
  );
}
