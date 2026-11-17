import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import { useReactTable, getCoreRowModel, getFilteredRowModel, flexRender } from "@tanstack/react-table";
import api from "../../utils/api";
import { useDispatch } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import { Icon } from "@iconify/react";

/* ─── Date helpers ──────────────────────────────────────────────────────── */
const today = () => new Date().toISOString().split("T")[0];
const firstOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
};

const PRESETS = [
    { label: "Today", icon: "mdi:calendar-today", fn: () => ({ startDate: today(), endDate: today() }) },
    { label: "This Month", icon: "mdi:calendar-month", fn: () => ({ startDate: firstOfMonth(), endDate: today() }) },
    {
        label: "Last 7 Days", icon: "mdi:calendar-week", fn: () => {
            const d = new Date(); d.setDate(d.getDate() - 6);
            return { startDate: d.toISOString().split("T")[0], endDate: today() };
        }
    },
    {
        label: "Last 30 Days", icon: "mdi:calendar-range", fn: () => {
            const d = new Date(); d.setDate(d.getDate() - 29);
            return { startDate: d.toISOString().split("T")[0], endDate: today() };
        }
    },
];

/* ─── Status badge ──────────────────────────────────────────────────────── */
/* ─── Status badge ──────────────────────────────────────────────────────── */
const Badge = ({ v }) => {
    const cfg = {
        Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
        Delivered: "bg-[#2980B9]/10 text-[#2980B9] border-blue-200",
        Draft: "bg-gray-100 text-gray-600 border-gray-200",
        "In-process": "bg-amber-50 text-amber-700 border-amber-200",
        Pending: "bg-rose-50 text-rose-700 border-rose-200",
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cfg[v] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
            {v || "—"}
        </span>
    );
};

/* ─── Metric card ───────────────────────────────────────────────────────── */
const MetricCard = ({ label, value, sub, icon, highlight }) => (
    <div className={`group relative rounded-xl p-5 overflow-hidden border transition-all duration-300
        ${highlight
            ? "bg-[#2980B9] border-[#2980B9] text-white shadow-md"
            : "bg-white border-gray-200 shadow-sm hover:border-[#2980B9]/40"
        }`}>
        <div className="relative z-10 flex items-start justify-between">
            <div>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${highlight ? 'text-blue-100' : 'text-gray-400'}`}>{label}</p>
                <p className={`text-xl font-black leading-none ${highlight ? 'text-white' : 'text-gray-800'}`}>{value ?? 0}</p>
                {sub && <p className={`text-[11px] font-semibold mt-2 ${highlight ? 'text-blue-100' : 'text-gray-400'}`}>{sub}</p>}
            </div>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${highlight ? 'bg-white/20 text-white' : 'bg-blue-50 text-[#2980B9]'}`}>
                <Icon icon={icon} className="text-xl" />
            </div>
        </div>
    </div>
);

/* ─── Transaction pill ──────────────────────────────────────────────────── */
const TxnPill = ({ label, count, amount, icon, colorClass }) => (
    <div className={`flex items-center gap-3.5 px-5 py-3.5 rounded-xl border transition-all ${colorClass}`}>
        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm border border-gray-100">
            <Icon icon={icon} className="text-lg opacity-80" />
        </div>
        <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">{label}</p>
            <p className="text-xs font-black text-gray-800">{count ?? 0} Orders</p>
        </div>
        <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Revenue</p>
            <p className="text-xs font-black text-[#2980B9]">₹{amount?.toLocaleString() || 0}</p>
        </div>
    </div>
);

/* ─── Section wrapper ───────────────────────────────────────────────────── */
const Section = ({ icon, title, badge, children }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#2980B9]/10 text-[#2980B9] flex items-center justify-center">
                    <Icon icon={icon} className="text-lg" />
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-black text-gray-800 uppercase tracking-widest">{title}</span>
                    {badge !== undefined && <span className="text-[10px] font-medium text-gray-400">{badge} records found</span>}
                </div>
            </div>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

/* ─── Data table ────────────────────────────────────────────────────────── */
const DataTable = ({ table, colCount, empty = "No records found" }) => {
    const rows = table.getRowModel().rows;
    return (
        <div className="overflow-x-auto overflow-y-auto max-h-[550px] rounded-lg border border-gray-200 custom-scrollbar">
            <table className="w-full border-collapse">
                <thead className="sticky top-0 z-20 bg-gray-100/90 border-b border-gray-200 backdrop-blur-sm">
                    {table.getHeaderGroups().map(hg => (
                        <tr key={hg.id}>
                            {hg.headers.map(h => (
                                <th key={h.id} className="px-5 py-3 text-center text-[10px] font-extrabold text-gray-600 uppercase tracking-wider border-r border-gray-200/60 last:border-r-0 whitespace-nowrap">
                                    {flexRender(h.column.columnDef.header, h.getContext())}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={colCount} className="py-16 text-center">
                                <Icon icon="mdi:database-off-outline" className="text-4xl mx-auto mb-2 opacity-20 text-gray-400" />
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                    {empty}
                                </p>
                            </td>
                        </tr>
                    ) : rows.map((row) => (
                        <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                            {row.getVisibleCells().map(cell => (
                                <td key={cell.id} className="px-5 py-3 text-center border-r border-gray-50 last:border-r-0">
                                    <div className="text-xs font-semibold text-gray-700">
                                        {flexRender(cell.column.columnDef.cell ?? cell.column.columnDef.accessorKey, cell.getContext())}
                                    </div>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export default function MainReport() {
    const dispatch = useDispatch();

    /* ── Date state ── */
    const [activePreset, setActivePreset] = useState(0); // "Today" by default
    const [fromDate, setFromDate] = useState(() => today());
    const [toDate, setToDate] = useState(() => today());

    /* ── Data state ── */
    const [jobCards, setJobCards] = useState([]);
    const [deliveredJC, setDeliveredJC] = useState([]);
    const [commissionByDelivered, setCommissionByDelivered] = useState([]);
    const [totalJobCards, setTotalJobCards] = useState(0);
    const [deliveredCount, setDeliveredCount] = useState(0);
    const [totalAdvance, setTotalAdvance] = useState(0);
    const [totalBalance, setTotalBalance] = useState(0);
    const [deliveredTotalSum, setDeliveredTotalSum] = useState(0);
    const [deliveredJcBalanceReceived, setDeliveredJcBalanceReceived] = useState(0);
    const [transactionSummary, setTransactionSummary] = useState({});
    const [totalCommission, setTotalCommission] = useState(0);
    const [afterDeliveryCommission, setAfterDeliveryCommission] = useState(0);
    const [fetched, setFetched] = useState(false);

    /* ── Apply preset ── */
    const applyPreset = (idx) => {
        setActivePreset(idx);
        const { startDate, endDate } = PRESETS[idx].fn();
        setFromDate(startDate);
        setToDate(endDate);
        return { startDate, endDate };
    };

    /* ── Fetch ── */
    const fetchReport = useCallback(async (start, end) => {
        if (!start || !end) return toast.error("Please select date range");
        if (end < start) return toast.error("Invalid date range");
        try {
            dispatch(showLoader());
            const res = await api.post("/api/jc/report/main", { startDate: start, endDate: end });
            if (res.data?.success) {
                const r = res.data;
                setJobCards(r.jobCards || []);
                setDeliveredJC(r.deliveredJobCards || []);
                setTotalAdvance(r.totalAdvance || 0);
                setTotalBalance(r.totalBalance || 0);
                setTotalJobCards(r.totalJobCards || 0);
                setDeliveredTotalSum(r.deliveredTotalSum || 0);
                setDeliveredJcBalanceReceived(r.deliveredJcBalanceReceived || 0);
                setTransactionSummary(r.transactionSummary || {});
                setDeliveredCount(r.deliveredCount || 0);
                setTotalCommission(r.totalCommissionCreated || 0);
                setAfterDeliveryCommission(r.totalCommissionDelivered || 0);
                setCommissionByDelivered(r.commissionByDelivered || []);
                setFetched(true);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to fetch report");
        } finally {
            dispatch(hideLoader());
        }
    }, [dispatch]);

    /* ── Auto-fetch Today on mount ── */
    useEffect(() => {
        const { startDate, endDate } = PRESETS[0].fn();
        fetchReport(startDate, endDate);
    }, []);

    /* ── Date formatting ── */
    const fmt = (v) => v ? new Date(v).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true
    }) : "—";

    /* ── Columns ── */
    const bookingCols = useMemo(() => [
        { 
            header: "Date", 
            accessorKey: "createdAt", 
            cell: ({ row }) => fmt(row.original.createdAt) 
        },
        { 
            header: "Customer", 
            accessorKey: "customer", 
            cell: ({ row }) => <span className="font-black text-gray-800">{row.original.customer?.customerName || row.original.customerName || "—"}</span> 
        },
        { 
            header: "Mobile", 
            accessorKey: "mobile", 
            cell: ({ row }) => row.original.customer?.mobile || row.original.customer?.customerMobile || row.original.mobile || "—" 
        },
        { 
            header: "Delivery Date", 
            accessorKey: "deliveryDate", 
            cell: ({ row }) => fmt(row.original.deliveryDate || row.original.submittedAt || row.original.createdAt) 
        },
        {
            header: "Txn", 
            accessorKey: "productMode", 
            cell: ({ row }) => <span className="text-[9px] font-black uppercase text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full">{row.original.productMode || row.original.transactionType || "—"}</span>
        },
        { 
            header: "Total", 
            accessorKey: "totalOrderPrice", 
            cell: ({ row }) => <span className="font-black text-erp-accent">₹{(row.original.totalOrderPrice ?? row.original.total ?? 0).toLocaleString()}</span> 
        },
        { 
            header: "Advance", 
            accessorKey: "advance", 
            cell: ({ row }) => `₹${(row.original.advance ?? 0).toLocaleString()}` 
        },
        {
            header: "Balance", 
            accessorKey: "balance", 
            cell: ({ row }) => {
                const total = row.original.totalOrderPrice ?? row.original.total ?? 0;
                const adv = row.original.advance ?? 0;
                const bal = row.original.balance ?? (total - adv);
                return <span className={`font-black ${Number(bal) > 0 ? "text-rose-500" : "text-emerald-500"}`}>₹{bal?.toLocaleString() ?? 0}</span>
            }
        },
        { 
            header: "Status", 
            accessorKey: "status", 
            cell: ({ row }) => <Badge v={row.original.status} /> 
        },
        { 
            header: "Process", 
            accessorKey: "pstatus", 
            cell: ({ row }) => <Badge v={row.original.status || row.original.pstatus} /> 
        },
    ], []);

    const deliveredCols = useMemo(() => [
        { 
            header: "Date", 
            accessorKey: "createdAt", 
            cell: ({ row }) => fmt(row.original.createdAt) 
        },
        { 
            header: "Customer", 
            accessorKey: "customer", 
            cell: ({ row }) => <span className="font-black text-gray-800">{row.original.customer?.customerName || row.original.customerName || "—"}</span> 
        },
        { 
            header: "Mobile", 
            accessorKey: "mobile", 
            cell: ({ row }) => row.original.customer?.mobile || row.original.customer?.customerMobile || row.original.mobile || "—" 
        },
        { 
            header: "Delivered", 
            accessorKey: "deliveredDate", 
            cell: ({ row }) => fmt(row.original.deliveredDate || row.original.updatedAt) 
        },
        {
            header: "Txn", 
            accessorKey: "productMode", 
            cell: ({ row }) => <span className="text-[9px] font-black uppercase text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full">{row.original.productMode || row.original.transactionType || "—"}</span>
        },
        { 
            header: "Total", 
            accessorKey: "totalOrderPrice", 
            cell: ({ row }) => <span className="font-black text-erp-accent">₹{(row.original.totalOrderPrice ?? row.original.total ?? 0).toLocaleString()}</span> 
        },
        { 
            header: "Advance", 
            accessorKey: "advance", 
            cell: ({ row }) => `₹${(row.original.advance ?? 0).toLocaleString()}` 
        },
        {
            header: "Balance", 
            accessorKey: "balance", 
            cell: ({ row }) => {
                const total = row.original.totalOrderPrice ?? row.original.total ?? 0;
                const adv = row.original.advance ?? 0;
                const bal = row.original.balance ?? (total - adv);
                return <span className={`font-black ${Number(bal) > 0 ? "text-rose-500" : "text-emerald-500"}`}>₹{bal?.toLocaleString() ?? 0}</span>
            }
        },
        { 
            header: "Status", 
            accessorKey: "status", 
            cell: ({ row }) => <Badge v={row.original.status} /> 
        },
        { 
            header: "Process", 
            accessorKey: "pstatus", 
            cell: ({ row }) => <Badge v={row.original.status || row.original.pstatus} /> 
        },
    ], []);

    const commissionCols = useMemo(() => [
        { 
            header: "Employee", 
            accessorKey: "bookedByName", 
            cell: ({ row }) => <span className="font-black text-gray-800 uppercase">{row.original.bookedByName || row.original.employeeName || "—"}</span> 
        },
        { 
            header: "Commission", 
            accessorKey: "totalCommission", 
            cell: ({ row }) => <span className="font-black text-orange-500 text-sm">₹{(row.original.totalCommission ?? 0).toLocaleString()}</span> 
        },
        { 
            header: "Orders", 
            accessorKey: "count", 
            cell: ({ row }) => <span className="font-black text-gray-400">{row.original.count ?? 0}</span> 
        },
    ], []);

    const bookingTable = useReactTable({ data: jobCards, columns: bookingCols, getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel() });
    const deliveredTable = useReactTable({ data: deliveredJC, columns: deliveredCols, getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel() });
    const commissionTable = useReactTable({ data: commissionByDelivered, columns: commissionCols, getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel() });

    const bookingTotal = Object.values(transactionSummary).reduce((acc, curr) => acc + (curr.totalAmount || 0), 0)
        || jobCards.reduce((acc, curr) => acc + (curr.totalOrderPrice || 0), 0);

    const inputCls = "w-full bg-gray-50/50 border border-gray-100 rounded-full px-5 py-2.5 text-xs font-bold text-gray-700 outline-none focus:border-erp-accent/30 focus:ring-4 focus:ring-erp-accent/5 transition-all";

    return (
        <div className="w-full flex flex-col gap-6 animate-in fade-in duration-500">

            {/* ══ HEADER ══════════════════════════════════════════════════════ */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h1 className="text-xl font-black text-gray-800 uppercase tracking-widest">Analytical Main Report</h1>
                    <p className="text-[11px] text-gray-400 font-medium">Cross-Module Performance & Financial Intelligence</p>
                </div>
                {fetched && (
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-[#2980B9] text-xs font-bold uppercase">
                        <Icon icon="mdi:calendar-range" className="text-base" />
                        <span>{fromDate} <span className="mx-1 opacity-40">→</span> {toDate}</span>
                    </div>
                )}
            </div>

            {/* ══ FILTER BAR ══════════════════════════════════════════════════ */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                    {/* Preset pills */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-2 flex items-center gap-1">
                            <Icon icon="mdi:clock-fast" className="text-sm text-[#2980B9]" /> Presets:
                        </span>
                        {PRESETS.map((p, i) => (
                            <button
                                key={p.label}
                                onClick={() => applyPreset(i)}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all
                                    ${activePreset === i
                                        ? "bg-[#2980B9] text-white border-[#2980B9] shadow-sm"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-[#2980B9] hover:text-[#2980B9]"
                                    }`}
                            >
                                <Icon icon={p.icon} className="text-sm" />
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Custom date range */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center w-full lg:w-auto">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">From</span>
                            <input
                                type="date" value={fromDate}
                                onChange={e => { setFromDate(e.target.value); setActivePreset(null); }}
                                className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-700 outline-none focus:border-[#2980B9]"
                            />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">To</span>
                            <input
                                type="date" value={toDate}
                                onChange={e => { setToDate(e.target.value); setActivePreset(null); }}
                                className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-700 outline-none focus:border-[#2980B9]"
                            />
                        </div>
                        <button
                            onClick={() => fetchReport(fromDate, toDate)}
                            className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-[#2980B9] hover:bg-[#2471a3] text-white text-xs font-bold uppercase tracking-wider px-5 py-2 rounded-lg transition-all shadow-sm active:scale-95"
                        >
                            <Icon icon="mdi:file-chart-outline" className="text-base" /> Generate
                        </button>
                    </div>
                </div>
            </div>

            {/* ══ BOOKING SECTION ══════════════════════════════════════════════ */}
            <Section icon="mdi:book-check-outline" title="Booking Performance" badge={jobCards.length}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {Object.keys(transactionSummary).length > 0 ? (
                        Object.entries(transactionSummary).map(([key, data]) => {
                            const icons = {
                                CASH: "mdi:cash",
                                UPI: "mdi:qrcode-scan",
                                CARD: "mdi:credit-card-outline",
                                Submitted: "mdi:file-document-outline",
                                Processing: "mdi:clock-outline",
                                Completed: "mdi:check-circle-outline",
                                Cancelled: "mdi:close-circle-outline",
                                Draft: "mdi:file-edit-outline"
                            };
                            const colors = {
                                CASH: "bg-emerald-50 border-emerald-100/50",
                                UPI: "bg-sky-50 border-sky-100/50",
                                CARD: "bg-indigo-50 border-indigo-100/50",
                                Submitted: "bg-amber-50 border-amber-100/50",
                                Processing: "bg-blue-50 border-blue-100/50",
                                Completed: "bg-emerald-50 border-emerald-100/50",
                                Cancelled: "bg-rose-50 border-rose-100/50",
                                Draft: "bg-gray-50 border-gray-100/50"
                            };
                            return (
                                <TxnPill 
                                    key={key}
                                    label={key} 
                                    count={data?.count} 
                                    amount={data?.totalAmount} 
                                    icon={icons[key] || "mdi:chart-bar"} 
                                    colorClass={colors[key] || "bg-gray-50 border-gray-100/50"} 
                                />
                            );
                        })
                    ) : (
                        <>
                            <TxnPill label="Cash Liquidity" count={0} amount={0} icon="mdi:cash" colorClass="bg-emerald-50 border-emerald-100/50" />
                            <TxnPill label="Digital UPI" count={0} amount={0} icon="mdi:qrcode-scan" colorClass="bg-sky-50 border-sky-100/50" />
                            <TxnPill label="Card Terminal" count={0} amount={0} icon="mdi:credit-card-outline" colorClass="bg-indigo-50 border-indigo-100/50" />
                        </>
                    )}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <MetricCard label="Job Cards Issued" value={totalJobCards} icon="mdi:file-document-outline" />
                    <MetricCard label="Gross Revenue" value={`₹${bookingTotal.toLocaleString()}`} icon="mdi:currency-inr" highlight />
                    <MetricCard label="Security Advance" value={`₹${totalAdvance.toLocaleString()}`} icon="mdi:hand-coin-outline" />
                    <MetricCard label="Outstanding" value={`₹${totalBalance.toLocaleString()}`} icon="mdi:alert-circle-outline" sub="Total balance to collect" />
                </div>

                <DataTable table={bookingTable} colCount={bookingCols.length} empty="No job cards indexed in this period" />
            </Section>

            {/* ══ DELIVERED SECTION ════════════════════════════════════════════ */}
            <Section icon="mdi:truck-check-outline" title="Fulfillment Metrics" badge={deliveredJC.length}>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <MetricCard label="Orders Fulfilled" value={deliveredCount} icon="mdi:package-variant-closed-check" />
                    <MetricCard label="Balance Cleared" value={`₹${deliveredJcBalanceReceived.toLocaleString()}`} icon="mdi:cash-check" />
                    <MetricCard label="Fulfilled Value" value={`₹${deliveredTotalSum.toLocaleString()}`} icon="mdi:chart-areaspline" />
                    <MetricCard label="Payable Commission" value={`₹${afterDeliveryCommission.toLocaleString()}`} icon="mdi:account-cash" highlight />
                </div>
                <DataTable table={deliveredTable} colCount={deliveredCols.length} empty="No fulfillment events recorded" />
            </Section>

            {/* ══ COMMISSION SECTION ═══════════════════════════════════════════ */}
            <Section icon="mdi:medal-outline" title="Staff Commissions" badge={commissionByDelivered.length}>
                <DataTable table={commissionTable} colCount={commissionCols.length} empty="Zero commission activities" />
            </Section>

        </div>
    );
}