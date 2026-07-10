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
const Badge = ({ v }) => {
    const cfg = {
        Active: "bg-emerald-100 text-emerald-700 border-emerald-200",
        Delivered: "bg-blue-100 text-blue-700 border-blue-200",
        Draft: "bg-gray-100 text-gray-500 border-gray-200",
        "In-process": "bg-amber-100 text-amber-700 border-amber-200",
        Pending: "bg-rose-100 text-rose-700 border-rose-200",
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${cfg[v] || "bg-gray-100 text-gray-500 border-gray-200"}`}>
            {v || "—"}
        </span>
    );
};

/* ─── Metric card ───────────────────────────────────────────────────────── */
const MetricCard = ({ label, value, sub, icon, highlight }) => (
    <div className={`group relative rounded-[2rem] p-6 overflow-hidden border transition-all duration-300 hover:-translate-y-1
        ${highlight
            ? "bg-erp-accent border-erp-accent shadow-xl shadow-erp-accent/20"
            : "bg-white border-gray-100 shadow-sm hover:shadow-xl hover:border-erp-accent/20"
        }`}>
        <div className="relative z-10">
            <div className={`w-10 h-10 rounded-2xl mb-4 flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${highlight ? 'bg-white/20' : 'bg-erp-accent/5'}`}>
                <Icon icon={icon} className={`text-xl ${highlight ? 'text-white' : 'text-erp-accent'}`} />
            </div>
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${highlight ? 'text-white/70' : 'text-gray-400'}`}>{label}</p>
            <p className={`text-2xl font-black leading-none ${highlight ? 'text-white' : 'text-gray-800'}`}>{value ?? 0}</p>
            {sub && <p className={`text-[11px] font-bold mt-2 ${highlight ? 'text-white/60' : 'text-gray-400'}`}>{sub}</p>}
        </div>
        {highlight && <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />}
    </div>
);

/* ─── Transaction pill ──────────────────────────────────────────────────── */
const TxnPill = ({ label, count, amount, icon, colorClass }) => (
    <div className={`flex items-center gap-4 px-6 py-4 rounded-[1.5rem] border transition-all hover:shadow-md ${colorClass}`}>
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <Icon icon={icon} className="text-xl opacity-70" />
        </div>
        <div className="flex-1">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5">{label}</p>
            <p className="text-sm font-black text-gray-800">{count ?? 0} Orders</p>
        </div>
        <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Revenue</p>
            <p className="text-xs font-black text-erp-accent">₹{amount?.toLocaleString() || 0}</p>
        </div>
    </div>
);

/* ─── Section wrapper ───────────────────────────────────────────────────── */
const Section = ({ icon, title, badge, children }) => (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden mb-8">
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-50 bg-gray-50/30">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-erp-accent/5 border border-erp-accent/10 text-erp-accent flex items-center justify-center">
                    <Icon icon={icon} className="text-xl" />
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-black text-gray-700 uppercase tracking-[0.2em]">{title}</span>
                    {badge !== undefined && <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{badge} records found</span>}
                </div>
            </div>
        </div>
        <div className="p-8">{children}</div>
    </div>
);

/* ─── Data table ────────────────────────────────────────────────────────── */
const DataTable = ({ table, colCount, empty = "No records found" }) => {
    const rows = table.getRowModel().rows;
    return (
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] rounded-[2rem] border border-gray-100 custom-scrollbar">
            <table className="w-full border-collapse">
                <thead className="sticky top-0 z-20 bg-erp-accent text-white">
                    {table.getHeaderGroups().map(hg => (
                        <tr key={hg.id}>
                            {hg.headers.map(h => (
                                <th key={h.id} className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] border-r border-white/10 last:border-r-0 whitespace-nowrap">
                                    {flexRender(h.column.columnDef.header, h.getContext())}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={colCount} className="py-24 text-center">
                                <Icon icon="mdi:database-off-outline" className="text-5xl mx-auto mb-3 opacity-10" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">
                                    {empty}
                                </p>
                            </td>
                        </tr>
                    ) : rows.map((row, i) => (
                        <tr key={row.id} className="hover:bg-erp-accent/[0.02] transition-colors group">
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Main Analytical Report</h1>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-1">Cross-Module Performance & Financial Intelligence</p>
                </div>
                {fetched && (
                    <div className="flex items-center gap-2 px-6 py-2 bg-white border border-gray-100 rounded-full shadow-sm">
                        <Icon icon="mdi:calendar-range" className="text-erp-accent" />
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                            {fromDate} <span className="mx-2 opacity-30">→</span> {toDate}
                        </span>
                    </div>
                )}
            </div>

            {/* ══ FILTER BAR ══════════════════════════════════════════════════ */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 p-8">
                <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-end justify-between">

                    {/* Preset pills */}
                    <div className="flex flex-col gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2 ml-4">
                            <Icon icon="mdi:clock-fast" className="text-lg text-erp-accent" /> Timeline Presets
                        </p>
                        <div className="flex gap-3 flex-wrap">
                            {PRESETS.map((p, i) => (
                                <button
                                    key={p.label}
                                    onClick={() => applyPreset(i)}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-300
                                        ${activePreset === i
                                            ? "bg-erp-accent text-white border-erp-accent shadow-lg shadow-erp-accent/20 scale-105"
                                            : "bg-white text-gray-400 border-gray-100 hover:border-erp-accent/30 hover:text-erp-accent"
                                        }`}
                                >
                                    <Icon icon={p.icon} className="text-lg" />
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom date range */}
                    <div className="flex flex-col sm:flex-row gap-4 items-end w-full lg:w-auto">
                        <div className="w-full sm:w-auto">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-2 ml-4">Start Date</p>
                            <input
                                type="date" value={fromDate}
                                onChange={e => { setFromDate(e.target.value); setActivePreset(null); }}
                                className={inputCls}
                            />
                        </div>
                        <div className="w-full sm:w-auto">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-2 ml-4">End Date</p>
                            <input
                                type="date" value={toDate}
                                onChange={e => { setToDate(e.target.value); setActivePreset(null); }}
                                className={inputCls}
                            />
                        </div>
                        <button
                            onClick={() => fetchReport(fromDate, toDate)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-erp-accent hover:bg-erp-accent/90 active:scale-95 text-white text-[10px] font-black uppercase tracking-[0.2em] px-10 py-3 rounded-full transition-all shadow-xl shadow-erp-accent/20 whitespace-nowrap"
                        >
                            <Icon icon="mdi:file-chart-outline" className="text-xl" /> Generate Insights
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