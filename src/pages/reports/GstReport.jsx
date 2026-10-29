import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { getGstReport, downloadGstWorkbook } from "../../services/gstReportService";

const fmtNum = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtCurrency = (n) => `₹${fmtNum(n)}`;

export default function GstReport() {
  const [activeTab, setActiveTab] = useState("OUTPUT"); // 'OUTPUT' | 'INPUT' | 'CONSOLIDATED'
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    gstRate: "ALL",
    productType: "ALL",
    taxType: "ALL",
    search: "",
  });

  const [datePreset, setDatePreset] = useState("ALL_TIME");

  // Report Data
  const [reportData, setReportData] = useState({
    meta: {
      wholesalerName: "Sid Optics",
      wholesalerGSTIN: "GST9876543210",
      wholesalerState: "DELHI",
      totalOutputCount: 0,
      totalInputCount: 0,
      totalConsolidatedCount: 0,
    },
    summary: {
      totalOutputTaxable: 0,
      totalOutputGst: 0,
      totalOutputNet: 0,
      totalInputTaxable: 0,
      totalInputGst: 0,
      totalInputNet: 0,
      netGstPayable: 0,
      netGstStatus: "PAYABLE",
    },
    outputReport: [],
    inputReport: [],
    consolidatedReport: [],
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Fetch report data
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.gstRate && filters.gstRate !== "ALL") params.gstRate = filters.gstRate;
      if (filters.productType && filters.productType !== "ALL") params.productType = filters.productType;
      if (filters.taxType && filters.taxType !== "ALL") params.taxType = filters.taxType;

      const res = await getGstReport(params);
      const d = (res?.meta || res?.outputReport || res?.summary)
        ? res
        : (res?.data?.data || res?.data || res || {});

      setReportData({
        meta: d.meta || {
          wholesalerName: "Sid Optics",
          wholesalerGSTIN: "GST9876543210",
          wholesalerState: "DELHI",
          totalOutputCount: (d.outputReport || []).length,
          totalInputCount: (d.inputReport || []).length,
          totalConsolidatedCount: (d.consolidatedReport || []).length,
        },
        summary: d.summary || {
          totalOutputTaxable: 0,
          totalOutputGst: 0,
          totalOutputNet: 0,
          totalInputTaxable: 0,
          totalInputGst: 0,
          totalInputNet: 0,
          netGstPayable: 0,
          netGstStatus: "PAYABLE",
        },
        outputReport: d.outputReport || [],
        inputReport: d.inputReport || [],
        consolidatedReport: d.consolidatedReport || [],
      });
      setPage(1);
    } catch (err) {
      console.error("Error fetching GST report:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to load GST reports");
    } finally {
      setLoading(false);
    }
  }, [filters.startDate, filters.endDate, filters.gstRate, filters.productType, filters.taxType]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Date Preset handler
  const handleDatePreset = (presetId) => {
    setDatePreset(presetId);
    const now = new Date();
    let start = "";
    let end = now.toISOString().split("T")[0];

    const toYMD = (d) => d.toISOString().split("T")[0];

    switch (presetId) {
      case "TODAY":
        start = end;
        break;
      case "YESTERDAY": {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        start = toYMD(y);
        end = start;
        break;
      }
      case "THIS_WEEK": {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(d.setDate(diff));
        start = toYMD(mon);
        break;
      }
      case "THIS_MONTH": {
        const m = new Date(now.getFullYear(), now.getMonth(), 1);
        start = toYMD(m);
        break;
      }
      case "LAST_MONTH": {
        const mStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const mEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        start = toYMD(mStart);
        end = toYMD(mEnd);
        break;
      }
      case "THIS_QUARTER": {
        const currQ = Math.floor(now.getMonth() / 3);
        const qStart = new Date(now.getFullYear(), currQ * 3, 1);
        start = toYMD(qStart);
        break;
      }
      case "THIS_FY": {
        const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        start = `${fyYear}-04-01`;
        break;
      }
      case "ALL_TIME":
      default:
        start = "";
        end = "";
        break;
    }

    setFilters((p) => ({ ...p, startDate: start, endDate: end }));
  };

  // Full XLSX Download via Backend Stream
  const handleDownloadFullWorkbook = async () => {
    try {
      setExporting(true);
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.gstRate && filters.gstRate !== "ALL") params.gstRate = filters.gstRate;
      if (filters.productType && filters.productType !== "ALL") params.productType = filters.productType;
      if (filters.taxType && filters.taxType !== "ALL") params.taxType = filters.taxType;

      await downloadGstWorkbook(params);
      toast.success("GST 3-Sheet Workbook downloaded successfully!");
    } catch (err) {
      console.warn("Backend workbook export failed, falling back to client-side XLSX:", err);
      try {
        const wb = XLSX.utils.book_new();

        // Sheet 1: Output
        const outSheet = XLSX.utils.json_to_sheet(reportData.outputReport || []);
        XLSX.utils.book_append_sheet(wb, outSheet, "GST Output Report");

        // Sheet 2: Input
        const inSheet = XLSX.utils.json_to_sheet(reportData.inputReport || []);
        XLSX.utils.book_append_sheet(wb, inSheet, "GST Input Report");

        // Sheet 3: Consolidated
        const conSheet = XLSX.utils.json_to_sheet(reportData.consolidatedReport || []);
        XLSX.utils.book_append_sheet(wb, conSheet, "GST Consolidated Report");

        XLSX.writeFile(wb, `GST_Report_${Date.now()}.xlsx`);
        toast.success("Downloaded GST Report (.xlsx)");
      } catch (clientErr) {
        toast.error("Export failed: " + (clientErr.message || "Unknown error"));
      }
    } finally {
      setExporting(false);
    }
  };

  // Client-side text search filtering
  const currentRecords = useMemo(() => {
    let list = [];
    if (activeTab === "OUTPUT") list = reportData.outputReport || [];
    else if (activeTab === "INPUT") list = reportData.inputReport || [];
    else list = reportData.consolidatedReport || [];

    const q = (filters.search || "").trim().toLowerCase();
    if (!q) return list;

    return list.filter((r) => {
      const party = (r.partyName || r.nameOfTheParty || "").toLowerCase();
      const comp = (r.companyName || "").toLowerCase();
      const bill = (r.billNo || "").toLowerCase();
      const gst = (r.gstNumber || "").toLowerCase();
      const hsn = String(r.hsnSac || "").toLowerCase();
      const branch = (r.branchName || "").toLowerCase();
      const state = (r.state || "").toLowerCase();
      return (
        party.includes(q) ||
        comp.includes(q) ||
        bill.includes(q) ||
        gst.includes(q) ||
        hsn.includes(q) ||
        branch.includes(q) ||
        state.includes(q)
      );
    });
  }, [activeTab, reportData, filters.search]);

  // Paginated records
  const paginatedRecords = useMemo(() => {
    if (pageSize === "ALL") return currentRecords;
    const startIdx = (page - 1) * pageSize;
    return currentRecords.slice(startIdx, startIdx + pageSize);
  }, [currentRecords, page, pageSize]);

  const totalPages = useMemo(() => {
    if (pageSize === "ALL" || currentRecords.length === 0) return 1;
    return Math.ceil(currentRecords.length / pageSize);
  }, [currentRecords, pageSize]);

  // Tab dynamic subtotals
  const tabTotals = useMemo(() => {
    return currentRecords.reduce(
      (acc, r) => {
        acc.qty += Number(r.qty || r.quantity || 0);
        acc.pieces += Number(r.totalPieces || r.totalNumberOfPieces || 0);
        acc.retailPrice += Number(r.totalRetailPrice || 0);
        acc.basePrice += Number(r.totalBasePrice || 0);
        acc.sgst += Number(r.sgst || r.totalSgst || 0);
        acc.cgst += Number(r.cgst || r.totalCgst || 0);
        acc.igst += Number(r.igst || r.totalIgst || 0);
        acc.totalGst += Number(r.totalGst || 0);
        acc.gross += Number(r.totalGross || r.totalGrossAmount || 0);
        acc.discount += Number(r.totalDiscount || r.totalItemDiscount || 0);
        acc.net += Number(r.totalNetAmount || 0);
        return acc;
      },
      {
        qty: 0,
        pieces: 0,
        retailPrice: 0,
        basePrice: 0,
        sgst: 0,
        cgst: 0,
        igst: 0,
        totalGst: 0,
        gross: 0,
        discount: 0,
        net: 0,
      }
    );
  }, [currentRecords]);

  return (
    <div className="p-4 md:p-6 bg-[#F4F7F9] min-h-screen text-slate-800 space-y-6 font-sans">
      {/* ── 1. Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#2980B9]/10 text-[#2980B9] flex items-center justify-center font-bold shadow-inner">
            <Icon icon="lucide:file-spreadsheet" width={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">
                GST Reports &amp; Tax Filings
              </h1>
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-sky-50 text-[#1F618D] border border-sky-100">
                ERP Compliance
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Output (Sales), Input (Purchases) &amp; Consolidated HSN summaries for GSTR-1, GSTR-3B &amp; Reconciliation.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition border border-slate-200 shadow-sm disabled:opacity-50"
            title="Refresh Data"
          >
            <Icon icon="lucide:refresh-cw" className={loading ? "animate-spin text-[#2980B9]" : "text-slate-500"} width={15} />
            <span>Refresh</span>
          </button>

        
          <button
            onClick={handleDownloadFullWorkbook}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#2980B9] hover:bg-[#1F618D] text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition disabled:opacity-50"
          >
            <Icon icon={exporting ? "lucide:loader-2" : "lucide:download"} className={exporting ? "animate-spin" : ""} width={16} />
            <span>{exporting ? "Exporting..." : "Export Full GST Workbook (.xlsx)"}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Financial Summary KPI Cards ──────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Card 1: Output Taxable */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-[#2980B9]/40 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
              Sales Taxable
            </span>
            <span className="w-7 h-7 rounded-lg bg-blue-50 text-[#2980B9] flex items-center justify-center">
              <Icon icon="lucide:shopping-cart" width={15} />
            </span>
          </div>
          <div className="mt-2.5 text-lg md:text-xl font-black font-mono text-slate-900">
            {fmtCurrency(reportData.summary.totalOutputTaxable)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-semibold">
            {reportData.meta.totalOutputCount || reportData.outputReport.length} Billed Items
          </div>
        </div>

        {/* Card 2: Output GST */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-amber-300 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
              Output GST (Liability)
            </span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Icon icon="lucide:badge-percent" width={15} />
            </span>
          </div>
          <div className="mt-2.5 text-lg md:text-xl font-black font-mono text-amber-600">
            {fmtCurrency(reportData.summary.totalOutputGst)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-semibold">
            Net Sales: {fmtCurrency(reportData.summary.totalOutputNet)}
          </div>
        </div>

        {/* Card 3: Input Taxable */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-[#2980B9]/40 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
              Purchase Taxable
            </span>
            <span className="w-7 h-7 rounded-lg bg-sky-50 text-[#1F618D] flex items-center justify-center">
              <Icon icon="lucide:package" width={15} />
            </span>
          </div>
          <div className="mt-2.5 text-lg md:text-xl font-black font-mono text-slate-900">
            {fmtCurrency(reportData.summary.totalInputTaxable)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-semibold">
            {reportData.meta.totalInputCount || reportData.inputReport.length} Purchase Items
          </div>
        </div>

        {/* Card 4: Input GST */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-300 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
              Input GST (ITC)
            </span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Icon icon="lucide:shield-check" width={15} />
            </span>
          </div>
          <div className="mt-2.5 text-lg md:text-xl font-black font-mono text-emerald-600">
            {fmtCurrency(reportData.summary.totalInputGst)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-semibold">
            Net Purchases: {fmtCurrency(reportData.summary.totalInputNet)}
          </div>
        </div>

        {/* Card 5: Net Payable */}
        <div className="col-span-2 md:col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
              Net Tax {reportData.summary.netGstPayable >= 0 ? "Payable" : "Credit"}
            </span>
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${reportData.summary.netGstPayable >= 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
              <Icon icon="lucide:wallet" width={15} />
            </span>
          </div>
          <div className={`mt-2.5 text-lg md:text-xl font-black font-mono ${reportData.summary.netGstPayable >= 0 ? "text-rose-600" : "text-emerald-600"}`}>
            {fmtCurrency(Math.abs(reportData.summary.netGstPayable))}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-500">
            {reportData.summary.netGstPayable >= 0 ? "(Liability - ITC)" : "(Excess ITC Available)"}
          </div>
        </div>
      </div>

      {/* ── 3. Filters & Controls ────────────────────────────────── */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        {/* Date presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1.5">
            <Icon icon="lucide:calendar" className="text-[#2980B9]" width={15} />
            Presets:
          </span>
          {[
            { id: "ALL_TIME", label: "All Time" },
            { id: "TODAY", label: "Today" },
            { id: "YESTERDAY", label: "Yesterday" },
            { id: "THIS_WEEK", label: "This Week" },
            { id: "THIS_MONTH", label: "This Month" },
            { id: "LAST_MONTH", label: "Last Month" },
            { id: "THIS_QUARTER", label: "This Quarter" },
            { id: "THIS_FY", label: "This FY" },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleDatePreset(preset.id)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all ${
                datePreset === preset.id
                  ? "bg-[#2980B9] text-white border-[#2980B9] shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-[#2980B9] hover:text-[#2980B9]"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Input Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 pt-3 border-t border-slate-100">
          {/* Start Date */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => {
                setDatePreset("CUSTOM");
                setFilters((p) => ({ ...p, startDate: e.target.value }));
              }}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-slate-700 outline-none focus:border-[#2980B9] focus:ring-2 focus:ring-[#2980B9]/10 transition"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => {
                setDatePreset("CUSTOM");
                setFilters((p) => ({ ...p, endDate: e.target.value }));
              }}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-slate-700 outline-none focus:border-[#2980B9] focus:ring-2 focus:ring-[#2980B9]/10 transition"
            />
          </div>

          {/* GST Rate Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              GST Rate
            </label>
            <select
              value={filters.gstRate}
              onChange={(e) => setFilters((p) => ({ ...p, gstRate: e.target.value }))}
              className="w-full text-xs font-bold px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-slate-700 outline-none focus:border-[#2980B9] focus:ring-2 focus:ring-[#2980B9]/10 transition"
            >
              <option value="ALL">All Rates</option>
              <option value="0">0% (Nil / Exempted)</option>
              <option value="5">5%</option>
              <option value="6">6%</option>
              <option value="9">9%</option>
              <option value="10">10%</option>
              <option value="11">11%</option>
              <option value="12">12%</option>
              <option value="18">18%</option>
              <option value="28">28%</option>
            </select>
          </div>

          {/* Product Type */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Product Type
            </label>
            <select
              value={filters.productType}
              onChange={(e) => setFilters((p) => ({ ...p, productType: e.target.value }))}
              className="w-full text-xs font-bold px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-slate-700 outline-none focus:border-[#2980B9] focus:ring-2 focus:ring-[#2980B9]/10 transition"
            >
              <option value="ALL">All Types</option>
              <option value="FRAME">Frames</option>
              <option value="LENS">Lenses</option>
              <option value="SUNGLASS">Sunglasses</option>
              <option value="ACCESSORIES">Accessories</option>
            </select>
          </div>

          {/* Tax Type */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Tax Type
            </label>
            <select
              value={filters.taxType}
              onChange={(e) => setFilters((p) => ({ ...p, taxType: e.target.value }))}
              className="w-full text-xs font-bold px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-slate-700 outline-none focus:border-[#2980B9] focus:ring-2 focus:ring-[#2980B9]/10 transition"
            >
              <option value="ALL">All (Inc / Exc)</option>
              <option value="EXCLUDED">EXCLUDED (Base + Tax)</option>
              <option value="INCLUDED">INCLUDED (Tax in Price)</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Search Party / Bill / HSN
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Party, Bill #, GSTIN..."
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                className="w-full text-xs font-semibold pl-8 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-slate-700 outline-none focus:border-[#2980B9] focus:ring-2 focus:ring-[#2980B9]/10 transition"
              />
              <Icon
                icon="lucide:search"
                width={15}
                className="absolute left-2.5 top-2.5 text-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Tabs Navigation ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Tab 1: Output */}
          <button
            onClick={() => { setActiveTab("OUTPUT"); setPage(1); }}
            className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 ${
              activeTab === "OUTPUT"
                ? "bg-[#1F618D] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-[#2980B9]/40"
            }`}
          >
            <Icon icon="lucide:arrow-up-right" width={16} />
            <span>GST Output Report (Sales)</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeTab === "OUTPUT" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              {reportData.outputReport.length}
            </span>
          </button>

          {/* Tab 2: Input */}
          <button
            onClick={() => { setActiveTab("INPUT"); setPage(1); }}
            className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 ${
              activeTab === "INPUT"
                ? "bg-[#1F618D] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-[#2980B9]/40"
            }`}
          >
            <Icon icon="lucide:arrow-down-left" width={16} />
            <span>GST Input Report (Purchase)</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeTab === "INPUT" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              {reportData.inputReport.length}
            </span>
          </button>

          {/* Tab 3: Consolidated */}
          <button
            onClick={() => { setActiveTab("CONSOLIDATED"); setPage(1); }}
            className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 ${
              activeTab === "CONSOLIDATED"
                ? "bg-[#1F618D] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-[#2980B9]/40"
            }`}
          >
            <Icon icon="lucide:layers" width={16} />
            <span>GST Consolidated (HSN Summary)</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeTab === "CONSOLIDATED" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              {reportData.consolidatedReport.length}
            </span>
          </button>
        </div>

        {/* Page size selector */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-wider">
          <span>Show:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(e.target.value === "ALL" ? "ALL" : Number(e.target.value));
              setPage(1);
            }}
            className="bg-white border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs outline-none focus:border-[#2980B9]"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value="ALL">All</option>
          </select>
        </div>
      </div>

      {/* ── 5. Main Tables ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <Icon icon="lucide:loader-2" width={36} className="mx-auto mb-2 text-[#2980B9] animate-spin" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Calculating GST reports &amp; tax slabs...</p>
          </div>
        ) : currentRecords.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Icon icon="lucide:file-question" width={48} className="mx-auto mb-3 text-slate-300" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">No transactions recorded for the selected filter criteria.</p>
            <p className="text-xs text-slate-400 mt-1">Try switching to &quot;All Time&quot; or clearing the search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[640px] custom-scrollbar">
            {/* ── TAB 1: OUTPUT REPORT ── */}
            {activeTab === "OUTPUT" && (
              <table className="w-full text-xs border-collapse text-left">
                <thead className="sticky top-0 z-20 bg-[#F8FAFC] border-b border-slate-200 backdrop-blur-sm shadow-sm">
                  <tr>
                    <th className="py-3 px-2 text-center w-12 border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider whitespace-nowrap">#</th>
                    <th className="py-3 px-3 whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Branch Name</th>
                    <th className="py-3 px-3 whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Branch GST</th>
                    <th className="py-3 px-3 whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Bill No</th>
                    <th className="py-3 px-2.5 whitespace-nowrap text-center border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Order Date</th>
                    <th className="py-3 px-2.5 whitespace-nowrap text-center border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Invoice Date</th>
                    <th className="py-3 px-2.5 whitespace-nowrap text-center border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Created Date</th>
                    <th className="py-3 px-3 whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Name of Party</th>
                    <th className="py-3 px-3 whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Company Name</th>
                    <th className="py-3 px-3 whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">GST Number</th>
                    <th className="py-3 px-2.5 whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">State</th>
                    <th className="py-3 px-2 whitespace-nowrap text-center border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Tax Type</th>
                    <th className="py-3 px-2 whitespace-nowrap text-center border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Product</th>
                    <th className="py-3 px-2.5 whitespace-nowrap text-center border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">HSN/SAC</th>
                    <th className="py-3 px-2 text-right border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Qty</th>
                    <th className="py-3 px-2 text-right border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Pieces</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Retail Price (₹)</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Base Price (₹)</th>
                    <th className="py-3 px-2 text-center border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">GST%</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">SGST (₹)</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">CGST (₹)</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">IGST (₹)</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-[#1F618D] bg-sky-50/70 uppercase tracking-wider">Total GST (₹)</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Gross (₹)</th>
                    <th className="py-3 px-2.5 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Discount (₹)</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap text-[10px] font-black text-[#1F618D] bg-blue-50/70 uppercase tracking-wider">Net Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-medium">
                  {paginatedRecords.map((r, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-2.5 px-2 text-center text-slate-400 font-mono border-r border-slate-100">{r.sNo}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-800 border-r border-slate-100">{r.branchName}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500 border-r border-slate-100">{r.branchGstNumber}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-[#2980B9] border-r border-slate-100">{r.billNo}</td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap text-center font-mono text-[11px] text-slate-500 border-r border-slate-100">{r.orderDate}</td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap text-center font-mono text-[11px] text-slate-500 border-r border-slate-100">{r.invoiceDate}</td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap text-center font-mono text-[11px] text-slate-500 border-r border-slate-100">{r.createdDate}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-800 border-r border-slate-100">{r.partyName}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 border-r border-slate-100">{r.companyName}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500 border-r border-slate-100">{r.gstNumber}</td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap font-semibold text-slate-700 border-r border-slate-100">{r.state}</td>
                      <td className="py-2.5 px-2 text-center whitespace-nowrap border-r border-slate-100">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${r.taxType === "INCLUDED" ? "bg-purple-50 text-purple-700 border border-purple-100" : "bg-slate-50 text-slate-600 border border-slate-200"}`}>
                          {r.taxType}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center whitespace-nowrap font-bold text-slate-700 border-r border-slate-100">{r.productType}</td>
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap font-mono font-bold text-slate-800 border-r border-slate-100">{r.hsnSac}</td>
                      <td className="py-2.5 px-2 text-right font-mono border-r border-slate-100">{r.qty}</td>
                      <td className="py-2.5 px-2 text-right font-mono border-r border-slate-100">{r.totalPieces}</td>
                      <td className="py-2.5 px-3 text-right font-mono border-r border-slate-100">{fmtNum(r.totalRetailPrice)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 border-r border-slate-100">{fmtNum(r.totalBasePrice)}</td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-[#2980B9] border-r border-slate-100">{r.gstPercent}%</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 border-r border-slate-100">{fmtNum(r.sgst)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 border-r border-slate-100">{fmtNum(r.cgst)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 border-r border-slate-100">{fmtNum(r.igst)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-[#1F618D] bg-sky-50/50 border-r border-slate-100">{fmtNum(r.totalGst)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 border-r border-slate-100">{fmtNum(r.totalGross)}</td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-500 border-r border-slate-100">{fmtNum(r.totalDiscount)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 bg-blue-50/40">{fmtNum(r.totalNetAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                {/* Footer Sum Totals */}
                <tfoot className="sticky bottom-0 z-10 bg-slate-100/95 font-bold text-slate-800 border-t-2 border-slate-300 backdrop-blur-sm">
                  <tr>
                    <td colSpan={14} className="py-2.5 px-3 text-right uppercase tracking-wider text-[10px] text-slate-600 border-r border-slate-200/80">
                      Subtotal ({currentRecords.length} Items):
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono border-r border-slate-200/80">{tabTotals.qty}</td>
                    <td className="py-2.5 px-2 text-right font-mono border-r border-slate-200/80">{tabTotals.pieces}</td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-slate-200/80">{fmtNum(tabTotals.retailPrice)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900 border-r border-slate-200/80">{fmtNum(tabTotals.basePrice)}</td>
                    <td className="py-2.5 px-2 text-center border-r border-slate-200/80">—</td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-slate-200/80">{fmtNum(tabTotals.sgst)}</td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-slate-200/80">{fmtNum(tabTotals.cgst)}</td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-slate-200/80">{fmtNum(tabTotals.igst)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-[#1F618D] bg-sky-100/70 border-r border-slate-200/80">{fmtNum(tabTotals.totalGst)}</td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-slate-200/80">{fmtNum(tabTotals.gross)}</td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-rose-600 border-r border-slate-200/80">{fmtNum(tabTotals.discount)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-[#1F618D] bg-blue-100/80">{fmtNum(tabTotals.net)}</td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* ── TAB 2: INPUT REPORT ── */}
            {activeTab === "INPUT" && (
              <table className="w-full text-xs border-collapse text-left">
                <thead className="sticky top-0 z-20 bg-[#F8FAFC] border-b border-slate-200 backdrop-blur-sm shadow-sm">
                  <tr>
                    <th className="py-3 px-2 text-center w-12 border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider whitespace-nowrap">#</th>
                    <th className="py-3 px-3 whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Branch Name</th>
                    <th className="py-3 px-3 whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Branch GST</th>
                    <th className="py-3 px-3 whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Bill No</th>
                    <th className="py-3 px-2.5 whitespace-nowrap text-center border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Type</th>
                    <th className="py-3 px-2.5 whitespace-nowrap text-center border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Created Date</th>
                    <th className="py-3 px-2.5 whitespace-nowrap text-center border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Purchase Date</th>
                    <th className="py-3 px-3 whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Name of Party</th>
                    <th className="py-3 px-3 whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">GST Number</th>
                    <th className="py-3 px-2.5 whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">State</th>
                    <th className="py-3 px-2 text-right border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Quantity</th>
                    <th className="py-3 px-2 text-right border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Pieces/Box</th>
                    <th className="py-3 px-2 text-right border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Total Pieces</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Retail Price (₹)</th>
                    <th className="py-3 px-2.5 text-center whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">HSN/SAC</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Base Price (₹)</th>
                    <th className="py-3 px-2 text-center border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">GST%</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">SGST (₹)</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">CGST (₹)</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">IGST (₹)</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-[#1F618D] bg-sky-50/70 uppercase tracking-wider">Total GST (₹)</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Gross (₹)</th>
                    <th className="py-3 px-2.5 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Discount (₹)</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap text-[10px] font-black text-[#1F618D] bg-blue-50/70 uppercase tracking-wider">Net Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-medium">
                  {paginatedRecords.map((r, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-2.5 px-2 text-center text-slate-400 font-mono border-r border-slate-100">{r.sNo}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-800 border-r border-slate-100">{r.branchName}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500 border-r border-slate-100">{r.branchGstNumber}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-slate-700 border-r border-slate-100">{r.billNo}</td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap text-center border-r border-slate-100">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {r.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap text-center font-mono text-[11px] text-slate-500 border-r border-slate-100">{r.createdDate}</td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap text-center font-mono text-[11px] text-slate-500 border-r border-slate-100">{r.purchaseDate}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-800 border-r border-slate-100">{r.partyName}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500 border-r border-slate-100">{r.gstNumber}</td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap font-semibold text-slate-700 border-r border-slate-100">{r.state}</td>
                      <td className="py-2.5 px-2 text-right font-mono border-r border-slate-100">{r.quantity}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-400 border-r border-slate-100">{r.piecesPerBox || "—"}</td>
                      <td className="py-2.5 px-2 text-right font-mono border-r border-slate-100">{r.totalNumberOfPieces}</td>
                      <td className="py-2.5 px-3 text-right font-mono border-r border-slate-100">{fmtNum(r.totalRetailPrice)}</td>
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap font-mono font-bold text-slate-800 border-r border-slate-100">{r.hsnSac || "—"}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 border-r border-slate-100">{fmtNum(r.totalBasePrice)}</td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-[#2980B9] border-r border-slate-100">{r.gstPercent}%</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 border-r border-slate-100">{fmtNum(r.sgst)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 border-r border-slate-100">{fmtNum(r.cgst)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 border-r border-slate-100">{fmtNum(r.igst)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-[#1F618D] bg-sky-50/50 border-r border-slate-100">{fmtNum(r.totalGst)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 border-r border-slate-100">{fmtNum(r.totalGross)}</td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-500 border-r border-slate-100">{fmtNum(r.totalDiscount)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 bg-blue-50/40">{fmtNum(r.totalNetAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                {/* Footer Sum Totals */}
                <tfoot className="sticky bottom-0 z-10 bg-slate-100/95 font-bold text-slate-800 border-t-2 border-slate-300 backdrop-blur-sm">
                  <tr>
                    <td colSpan={10} className="py-2.5 px-3 text-right uppercase tracking-wider text-[10px] text-slate-600 border-r border-slate-200/80">
                      Subtotal ({currentRecords.length} Items):
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono border-r border-slate-200/80">{tabTotals.qty}</td>
                    <td className="py-2.5 px-2 text-right font-mono border-r border-slate-200/80">—</td>
                    <td className="py-2.5 px-2 text-right font-mono border-r border-slate-200/80">{tabTotals.pieces}</td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-slate-200/80">{fmtNum(tabTotals.retailPrice)}</td>
                    <td className="py-2.5 px-2.5 text-center border-r border-slate-200/80">—</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900 border-r border-slate-200/80">{fmtNum(tabTotals.basePrice)}</td>
                    <td className="py-2.5 px-2 text-center border-r border-slate-200/80">—</td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-slate-200/80">{fmtNum(tabTotals.sgst)}</td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-slate-200/80">{fmtNum(tabTotals.cgst)}</td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-slate-200/80">{fmtNum(tabTotals.igst)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-[#1F618D] bg-sky-100/70 border-r border-slate-200/80">{fmtNum(tabTotals.totalGst)}</td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-slate-200/80">{fmtNum(tabTotals.gross)}</td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-rose-600 border-r border-slate-200/80">{fmtNum(tabTotals.discount)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-[#1F618D] bg-blue-100/80">{fmtNum(tabTotals.net)}</td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* ── TAB 3: CONSOLIDATED HSN REPORT ── */}
            {activeTab === "CONSOLIDATED" && (
              <table className="w-full text-xs border-collapse text-left">
                <thead className="sticky top-0 z-20 bg-[#F8FAFC] border-b border-slate-200 backdrop-blur-sm shadow-sm">
                  <tr>
                    <th className="py-3 px-2 text-center w-12 border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider whitespace-nowrap">#</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">HSN/SAC</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Quantity</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Total Retail Price (₹)</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Total Base Price (₹)</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">GST%</th>
                    <th className="py-3 px-3.5 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Total SGST (₹)</th>
                    <th className="py-3 px-3.5 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Total CGST (₹)</th>
                    <th className="py-3 px-3.5 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Total IGST (₹)</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-[#1F618D] bg-sky-50/70 uppercase tracking-wider">Total GST (₹)</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Total Gross (₹)</th>
                    <th className="py-3 px-3.5 text-right whitespace-nowrap border-r border-slate-200/80 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Item Discount (₹)</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap text-[10px] font-black text-[#1F618D] bg-blue-50/70 uppercase tracking-wider">Total Net Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-medium">
                  {paginatedRecords.map((r, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-2.5 px-2 text-center text-slate-400 font-mono border-r border-slate-100">{r.sNo}</td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono font-bold text-slate-800 border-r border-slate-100">{r.hsnSac}</td>
                      <td className="py-2.5 px-3 text-right font-mono border-r border-slate-100">{r.quantity}</td>
                      <td className="py-2.5 px-4 text-right font-mono border-r border-slate-100">{fmtNum(r.totalRetailPrice)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800 border-r border-slate-100">{fmtNum(r.totalBasePrice)}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-[#2980B9] border-r border-slate-100">{r.gstPercent}%</td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-slate-600 border-r border-slate-100">{fmtNum(r.sgst)}</td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-slate-600 border-r border-slate-100">{fmtNum(r.cgst)}</td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-slate-600 border-r border-slate-100">{fmtNum(r.igst)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-black text-[#1F618D] bg-sky-50/50 border-r border-slate-100">{fmtNum(r.totalGst)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-700 border-r border-slate-100">{fmtNum(r.totalGross)}</td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-slate-500 border-r border-slate-100">{fmtNum(r.totalDiscount)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900 bg-blue-50/40">{fmtNum(r.totalNetAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                {/* Footer Sum Totals */}
                <tfoot className="sticky bottom-0 z-10 bg-slate-100/95 font-bold text-slate-800 border-t-2 border-slate-300 backdrop-blur-sm">
                  <tr>
                    <td colSpan={2} className="py-2.5 px-3 text-right uppercase tracking-wider text-[10px] text-slate-600 border-r border-slate-200/80">
                      Consolidated Total:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-slate-200/80">{tabTotals.qty}</td>
                    <td className="py-2.5 px-4 text-right font-mono border-r border-slate-200/80">{fmtNum(tabTotals.retailPrice)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-900 border-r border-slate-200/80">{fmtNum(tabTotals.basePrice)}</td>
                    <td className="py-2.5 px-3 text-center border-r border-slate-200/80">—</td>
                    <td className="py-2.5 px-3.5 text-right font-mono border-r border-slate-200/80">{fmtNum(tabTotals.sgst)}</td>
                    <td className="py-2.5 px-3.5 text-right font-mono border-r border-slate-200/80">{fmtNum(tabTotals.cgst)}</td>
                    <td className="py-2.5 px-3.5 text-right font-mono border-r border-slate-200/80">{fmtNum(tabTotals.igst)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-[#1F618D] bg-sky-100/70 border-r border-slate-200/80">{fmtNum(tabTotals.totalGst)}</td>
                    <td className="py-2.5 px-4 text-right font-mono border-r border-slate-200/80">{fmtNum(tabTotals.gross)}</td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-rose-600 border-r border-slate-200/80">{fmtNum(tabTotals.discount)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-[#1F618D] bg-blue-100/80">{fmtNum(tabTotals.net)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}

        {/* ── 6. Pagination Footer ───────────────────────────────── */}
        {!loading && currentRecords.length > 0 && pageSize !== "ALL" && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
            <div className="font-medium">
              Showing <strong className="text-slate-800">{Math.min(currentRecords.length, (page - 1) * pageSize + 1)}</strong> to <strong className="text-slate-800">{Math.min(currentRecords.length, page * pageSize)}</strong> of <strong className="text-slate-800">{currentRecords.length}</strong> entries
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition font-bold text-xs shadow-sm"
              >
                Previous
              </button>
              <span className="px-3 py-1 font-bold text-slate-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition font-bold text-xs shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
