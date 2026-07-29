import { useState } from "react";
import api from "../../utils/api";
import { toast } from "react-toastify";
import { Icon } from "@iconify/react";

const fmt = (n) =>
  `₹${Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
const today = () => new Date().toISOString().split("T")[0];
const firstOfMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0]; };

const StatCard = ({ icon, label, value, sub, color = "blue" }) => {
  const themes = {
    orange: "bg-orange-50 text-orange-600 border-orange-200",
    green: "bg-emerald-50 text-emerald-600 border-emerald-200",
    red: "bg-rose-50 text-rose-600 border-rose-200",
    blue: "bg-blue-50 text-[#2980B9] border-blue-200",
    teal: "bg-teal-50 text-teal-600 border-teal-200"
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-start gap-4 hover:border-[#2980B9]/30 transition-all">
      <div className={`p-3 rounded-lg ${themes[color] || themes.blue} flex-shrink-0 flex items-center justify-center`}>
        <Icon icon={icon} className="text-xl" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-lg font-black text-gray-800 truncate">{value}</p>
        {sub && <p className="text-[11px] font-semibold text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

const DataCard = ({ title, icon, children, footer }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2.5 bg-gray-50/80">
      <div className="w-6 h-6 rounded bg-[#2980B9]/10 text-[#2980B9] flex items-center justify-center">
        <Icon icon={icon} className="text-sm" />
      </div>
      <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest">{title}</h3>
    </div>
    <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[350px] custom-scrollbar">
      {children}
    </div>
    {footer !== undefined && (
      <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/50">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{footer}</p>
      </div>
    )}
  </div>
);

const InnerTable = ({ headers, rows, emptyMsg = "No records available", highlightLast = false }) => (
  <table className="w-full border-collapse">
    <thead className="sticky top-0 bg-gray-100/90 z-10 border-b border-gray-200 backdrop-blur-sm">
      <tr>
        {headers.map((h, i) => (
          <th key={i} className="px-5 py-2.5 text-left text-[10px] font-extrabold text-gray-600 uppercase tracking-wider whitespace-nowrap border-r border-gray-200/60 last:border-r-0">
            {h}
          </th>
        ))}
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100 bg-white">
      {rows.length === 0
        ? <tr><td colSpan={headers.length} className="px-5 py-8 text-center text-xs font-bold uppercase tracking-wider text-gray-400">{emptyMsg}</td></tr>
        : rows.map((row, i) => {
          const hi = highlightLast && i === rows.length - 1;
          return (
            <tr key={i} className={`transition-colors ${hi ? "bg-[#2980B9] text-white" : "hover:bg-blue-50/30"}`}>
              {row.map((cell, j) => (
                <td key={j} className={`px-5 py-2.5 whitespace-nowrap text-xs font-semibold border-r border-gray-50 last:border-r-0 ${hi ? "text-white font-extrabold" : "text-gray-700"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          );
        })
      }
    </tbody>
  </table>
);

const footerText = (arr, label = "entries") =>
  arr?.length ? `Total ${arr.length} ${label} found` : `No ${label} recorded`;

export default function DailyReport() {
  const [form, setForm] = useState({ startDate: today(), endDate: today() });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const validate = () => {
    const e = {};
    if (!form.startDate) e.startDate = "Required";
    if (!form.endDate) e.endDate = "Required";
    if (form.startDate && form.endDate && form.startDate > form.endDate) e.endDate = "End date must be after start date";
    if (form.endDate && form.endDate > today()) e.endDate = "Cannot be in future";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFetch = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.post("/api/jc/report/daily", form);
      if (res.data.success) {
        setReport(res.data); toast.success("Report generated");
      }
      else toast.error(res.data.message || "Operation failed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Communication error");
    } finally { setLoading(false); }
  };

  const presets = [
    { label: "Today", fn: () => ({ startDate: today(), endDate: today() }) },
    { label: "This Month", fn: () => ({ startDate: firstOfMonth(), endDate: today() }) },
    { label: "Last 7 Days", fn: () => { const d = new Date(); d.setDate(d.getDate() - 6); return { startDate: d.toISOString().split("T")[0], endDate: today() }; } },
    { label: "Last 30 Days", fn: () => { const d = new Date(); d.setDate(d.getDate() - 29); return { startDate: d.toISOString().split("T")[0], endDate: today() }; } },
  ];

  const inputCls = (err) =>
    `w-full pl-12 pr-4 py-3 text-xs font-bold text-gray-700 bg-gray-50 border rounded-full outline-none transition-all ${err ? "border-red-300 focus:ring-4 focus:ring-red-50" : "border-gray-100 focus:border-erp-accent/30 focus:ring-4 focus:ring-erp-accent/5 hover:border-erp-accent/20"}`;

  const d = report;
  const ds = d?.dashboardSummary;

  const salesTxMap = {};
  (d?.sales?.transactionSummary || []).forEach(t => { salesTxMap[t._id] = t.totalAmount; });
  const jcTxMap = {};
  (d?.jobCardStatus?.transactionTypeSummary || []).forEach(t => { jcTxMap[t._id] = t.totalAmount; });

  const cashInHand = (jcTxMap["CASH"] || 0) + (salesTxMap["CASH"] || 0);
  const credit = (jcTxMap["CARD"] || 0) + (salesTxMap["CARD"] || 0);
  const upi = (jcTxMap["UPI"] || 0) + (salesTxMap["UPI"] || 0);
  const totalSales = (d?.sales?.totalSalesAmount || 0) + (d?.jobCards?.deliveredSummary?.totalAmount || 0);
  const expense = d?.expenses?.totalExpenseAmount || 0;

  const txRows = d?.jobCardStatus?.transactionTypeSummary || [];
  const txTotal = txRows.reduce((acc, t) => acc + (t.totalAmount || 0), 0);
  const txDisplay = [
    ...txRows.map(t => [t._id || "N/A", fmt(t.totalAmount)]),
    ["Aggregate Total", fmt(txTotal)],
  ];

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-500">

      {/* ══ HEADER ══════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-gray-800 uppercase tracking-widest">Business Daily Report</h1>
          <p className="text-[11px] text-gray-400 font-medium">Daily Revenue, Collections & Expense Overview</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-2 flex items-center gap-1">
            <Icon icon="mdi:clock-fast" className="text-sm text-[#2980B9]" /> Presets:
          </span>
          {presets.map(({ label, fn }) => (
            <button key={label} type="button" onClick={() => { setForm(fn()); setErrors({}); }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border border-gray-200 text-gray-600 hover:border-[#2980B9] hover:text-[#2980B9] bg-white transition-all">
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3 items-center w-full lg:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Start</span>
              <input type="date" value={form.startDate} max={today()}
                onChange={(e) => { setForm(p => ({ ...p, startDate: e.target.value })); setErrors(p => ({ ...p, startDate: "" })); }}
                className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-700 outline-none focus:border-[#2980B9]" />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">End</span>
              <input type="date" value={form.endDate} min={form.startDate} max={today()}
                onChange={(e) => { setForm(p => ({ ...p, endDate: e.target.value })); setErrors(p => ({ ...p, endDate: "" })); }}
                className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-700 outline-none focus:border-[#2980B9]" />
            </div>
          </div>
          <button type="button" onClick={handleFetch} disabled={loading}
            className="w-full lg:w-auto flex items-center justify-center gap-1.5 px-6 py-2 bg-[#2980B9] hover:bg-[#2471a3] text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all disabled:opacity-50 active:scale-95">
            {loading ? (
              <Icon icon="mdi:loading" className="animate-spin text-base" />
            ) : (
              <Icon icon="mdi:lightning-bolt" className="text-base" />
            )}
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>

      {!report && !loading && (
        <div className="flex flex-col items-center justify-center py-32 text-gray-200">
          <Icon icon="mdi:file-chart-outline" className="text-8xl mb-4 opacity-10" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em]">Awaiting date selection</p>
        </div>
      )}

      {report && (
        <div className="space-y-8 scale-in-center">
          {/* Primary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard icon="mdi:trending-up" label="Total Collection" value={fmt(ds?.netCollection)} color="green" />
            <StatCard icon="mdi:chart-bell-curve-cumulative" label="Net Profit" value={fmt(ds?.netProfit)} color={ds?.netProfit >= 0 ? "teal" : "red"} />
            <StatCard icon="mdi:basket-plus-outline" label="Other Sales" value={fmt(d?.sales?.totalSalesAmount)} sub={`${d?.sales?.totalRecords} invoices`} color="blue" />
            <StatCard icon="mdi:trending-down" label="Total Expenses" value={fmt(expense)} sub={`${d?.expenses?.totalRecords} records`} color="red" />
          </div>

          {/* Job Card Specifics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard icon="mdi:file-document-multiple-outline" label="Completed Orders" value={d?.jobCards?.deliveredSummary?.count ?? 0} color="blue" />
            <StatCard icon="mdi:currency-inr" label="Total Value" value={fmt(d?.jobCards?.deliveredSummary?.totalAmount)} color="blue" />
            <StatCard icon="mdi:cash-check" label="Amount Collected" value={fmt(d?.jobCards?.deliveredSummary?.totalCollected)} color="green" />
            <StatCard icon="mdi:clock-alert-outline" label="Pending Balance" value={fmt(d?.jobCards?.deliveredSummary?.totalBalance)} color="red" />
          </div>

          {/* Detailed Data Grids */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <DataCard title="Expense List" icon="mdi:format-list-bulleted" footer={footerText(d?.expenses?.data, "expenses")}>
              <InnerTable
                headers={["Date", "Name", "Category", "Amount"]}
                rows={(d?.expenses?.data || []).map(e => [fmtDate(e.createdAt), e.name || e.title || "-", e.type || e.category || "-", fmt(e.amount)])}
              />
            </DataCard>

            <DataCard title="Items Sold" icon="mdi:package-variant" footer={footerText(d?.products?.data, "items")}>
              <InnerTable
                headers={["Category", "Item Name"]}
                rows={(d?.products?.data || []).map(p => [p.finalCategory || "-", p.finalProductName || "-"])}
              />
            </DataCard>

            <DataCard title="Category Sales" icon="mdi:chart-pie" footer={footerText(d?.products?.categoryCount, "categories")}>
              <InnerTable
                headers={["Category", "Qty Sold"]}
                rows={(d?.products?.categoryCount || []).map(c => [c._id || "-", c.count])}
              />
            </DataCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <DataCard title="Cash & Bank Summary" icon="mdi:bank-transfer" footer="Consolidated Payments">
              <InnerTable
                headers={["Total Sales", "Card/Credit", "Cash", "UPI", "Expenses", "Cash in Hand"]}
                rows={[[
                  <span className="font-black text-gray-900">{fmt(totalSales)}</span>,
                  fmt(credit), fmt(cashInHand), fmt(upi), fmt(expense),
                  <span className={`font-black ${cashInHand - expense >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{fmt(cashInHand - expense)}</span>,
                ]]}
              />
            </DataCard>

            <DataCard title="Payment Modes" icon="mdi:swap-horizontal" footer={footerText(txRows, "payment modes")}>
              <InnerTable headers={["Mode", "Amount"]} highlightLast={true} rows={txDisplay} />
            </DataCard>

            <DataCard title="Other Sales List" icon="mdi:cart-outline" footer={footerText(d?.sales?.data, "sales")}>
              <InnerTable
                headers={["Date", "Item", "Mode", "Amount"]}
                rows={(d?.sales?.data || []).map(s => [
                  fmtDate(s.createdAt),
                  s.item || "-",
                  <span className="px-3 py-1 text-[9px] font-black rounded-full bg-gray-50 border border-gray-100 text-gray-400 uppercase tracking-widest">{s.paymentMode || "-"}</span>,
                  <span className="font-black text-emerald-500">{fmt(s.amount)}</span>,
                ])}
              />
            </DataCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-8">
            <DataCard title="Orders Summary" icon="mdi:truck-check-outline" footer="Completed orders">
              <InnerTable
                headers={["Completed Orders", "Total Collection"]}
                rows={[[
                  <div className="flex items-center gap-2"><Icon icon="mdi:package-variant-closed" className="text-erp-accent" /> {d?.jobCards?.deliveredSummary?.count ?? 0}</div>,
                  <div className="font-black text-emerald-500">{fmt(d?.jobCards?.deliveredSummary?.totalCollected || 0)}</div>
                ]]}
              />
            </DataCard>

            <DataCard title="Prescriptions Issued" icon="mdi:file-certificate-outline" footer="Vision test metrics">
              <InnerTable
                headers={["Certificates Issued", "Revenue"]}
                rows={[[
                  <div className="flex items-center gap-2"><Icon icon="mdi:eye-outline" className="text-erp-accent" /> {d?.prescriptions?.totalRecords ?? 0}</div>,
                  <span className="font-black text-emerald-500">{fmt(d?.prescriptions?.totalAmount || 0)}</span>,
                ]]}
              />
            </DataCard>
          </div>
        </div>
      )}
    </div>
  );
}