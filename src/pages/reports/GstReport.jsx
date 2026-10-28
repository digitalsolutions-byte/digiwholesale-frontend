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

  // Fetch report
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.gstRate !== "ALL") params.gstRate = filters.gstRate;
      if (filters.productType !== "ALL") params.productType = filters.productType;
      if (filters.taxType !== "ALL") params.taxType = filters.taxType;
      if (filters.search) params.search = filters.search;

      const data = await getGstReport(params);
      if (data) {
        setReportData(data);
      }
    } catch (err) {
      console.error("Error fetching GST Report:", err);
      toast.error(err.message || "Failed to load GST reports");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Reset page when tab or filters change
  useEffect(() => {
    setPage(1);
  }, [activeTab, filters]);

  // Date Preset handlers
  const handleDatePreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    let start = "";
    let end = "";

    const toYMD = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    if (preset === "TODAY") {
      start = toYMD(now);
      end = toYMD(now);
    } else if (preset === "YESTERDAY") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      start = toYMD(y);
      end = toYMD(y);
    } else if (preset === "THIS_WEEK") {
      const day = now.getDay() || 7; // Monday = 1
      const mon = new Date(now);
      mon.setDate(now.getDate() - (day - 1));
      start = toYMD(mon);
      end = toYMD(now);
    } else if (preset === "THIS_MONTH") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      start = toYMD(first);
      end = toYMD(now);
    } else if (preset === "LAST_MONTH") {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      start = toYMD(first);
      end = toYMD(last);
    } else if (preset === "THIS_QUARTER") {
      const currQuarter = Math.floor(now.getMonth() / 3);
      const first = new Date(now.getFullYear(), currQuarter * 3, 1);
      start = toYMD(first);
      end = toYMD(now);
    } else if (preset === "THIS_FY") {
      // Indian Financial Year: April 1 to March 31
      const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const first = new Date(fyYear, 3, 1);
      start = toYMD(first);
      end = toYMD(now);
    } else {
      // ALL TIME
      start = "";
      end = "";
    }

    setFilters((prev) => ({ ...prev, startDate: start, endDate: end }));
  };

  // Download Excel Workbook
  const handleDownloadFullWorkbook = async () => {
    try {
      setExporting(true);
      await downloadGstWorkbook(filters);
      toast.success("GST Workbook exported successfully!");
    } catch (err) {
      console.warn("Backend export failed, falling back to client-side sheetjs:", err);
      exportClientWorkbook();
    } finally {
      setExporting(false);
    }
  };

  // Client-side fallback workbook export
  const exportClientWorkbook = () => {
    try {
      const wb = XLSX.utils.book_new();

      const outData = (reportData.outputReport || []).map((r) => ({
        "S.no.": r.sNo,
        "Branch Name": r.branchName,
        "Branch GST Number": r.branchGstNumber,
        "Bill No": r.billNo,
        "Order Date": r.orderDate,
        "Invoice Date": r.invoiceDate,
        "Created Date": r.createdDate,
        "Name of the Party": r.partyName,
        "Company Name": r.companyName,
        "GST Number": r.gstNumber,
        "State": r.state,
        "Tax Type": r.taxType,
        "Product Type": r.productType,
        "HSN/SAC": r.hsnSac,
        "Qty": r.qty,
        "Total Number of Pieces": r.totalPieces,
        "Total Retail Price": r.totalRetailPrice,
        "Total Base Price": r.totalBasePrice,
        "GST%": r.gstPercent,
        "Total SGST (Rs.)": r.sgst,
        "Total CGST (Rs.)": r.cgst,
        "Total IGST (Rs.)": r.igst,
        "Total GST (Rs.)": r.totalGst,
        "Total Gross Amount (Rs.)": r.totalGross,
        "Total Discount (Rs.)": r.totalDiscount,
        "Total Net Amount (Rs.)": r.totalNetAmount,
      }));

      const inData = (reportData.inputReport || []).map((r) => ({
        "S.no.": r.sNo,
        "Branch Name": r.branchName,
        "Branch GST Number": r.branchGstNumber,
        "Bill No": r.billNo,
        "Type": r.type,
        "Created Date": r.createdDate,
        "Purchase Date": r.purchaseDate,
        "Name of the Party": r.partyName,
        "GST Number": r.gstNumber,
        "State": r.state,
        "Quantity": r.quantity,
        "Pieces Per Box": r.piecesPerBox,
        "Total Number of Pieces": r.totalPieces,
        "Total Retail Price": r.totalRetailPrice,
        "HSN/SAC": r.hsnSac,
        "Total Base Price": r.totalBasePrice,
        "GST%": r.gstPercent,
        "Total SGST (Rs.)": r.sgst,
        "Total CGST (Rs.)": r.cgst,
        "Total IGST (Rs.)": r.igst,
        "Total GST (Rs.)": r.totalGst,
        "Total Gross Amount (Rs.)": r.totalGross,
        "Total Discount (Rs.)": r.totalDiscount,
        "Total Net Amount (Rs.)": r.totalNetAmount,
      }));

      const consData = (reportData.consolidatedReport || []).map((r) => ({
        "S.no.": r.sNo,
        "HSN/SAC": r.hsnSac,
        "Quantity": r.quantity,
        "Total Retail Price": r.totalRetailPrice,
        "Total Base Price": r.totalBasePrice,
        "GST%": r.gstPercent,
        "Total SGST (Rs.)": r.sgst,
        "Total CGST (Rs.)": r.cgst,
        "Total IGST (Rs.)": r.igst,
        "Total GST (Rs.)": r.totalGst,
        "Total Gross Amount (Rs.)": r.totalGross,
        "Total Item Discount (Rs.)": r.totalDiscount,
        "Total Net Amount (Rs.)": r.totalNetAmount,
      }));

      

      XLSX.utils.book_append_sheet(wb, wsOut, "GST Output Report");
      XLSX.utils.book_append_sheet(wb, wsIn, "GST Input Report");
      XLSX.utils.book_append_sheet(wb, wsCons, "GST Consolidated Report");

      XLSX.writeFile(wb, `GST_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Workbook downloaded successfully!");
    } catch (e) {
      console.error("Client export failed:", e);
      toast.error("Failed to generate Excel file");
    }
  };

  // Active records by tab
  const currentRecords = useMemo(() => {
    if (activeTab === "OUTPUT") return reportData.outputReport || [];
    if (activeTab === "INPUT") return reportData.inputReport || [];
    return reportData.consolidatedReport || [];
  }, [activeTab, reportData]);

  // Paginated records
  const paginatedRecords = useMemo(() => {
    if (pageSize === "ALL") return currentRecords;
    const start = (page - 1) * pageSize;
    return currentRecords.slice(start, start + pageSize);
  }, [currentRecords, page, pageSize]);

  const totalPages = pageSize === "ALL" ? 1 : Math.ceil(currentRecords.length / pageSize) || 1;

  // Active Tab Totals Calculation
  const tabTotals = useMemo(() => {
    return currentRecords.reduce(
      (acc, r) => {
        acc.qty += Number(r.qty || r.quantity || 0);
        acc.pieces += Number(r.totalPieces || r.quantity || 0);
        acc.retailPrice += Number(r.totalRetailPrice || 0);
        acc.basePrice += Number(r.totalBasePrice || 0);
        acc.sgst += Number(r.sgst || 0);
        acc.cgst += Number(r.cgst || 0);
        acc.igst += Number(r.igst || 0);
        acc.totalGst += Number(r.totalGst || 0);
        acc.gross += Number(r.totalGross || 0);
        acc.discount += Number(r.totalDiscount || 0);
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
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      {/* ── 1. Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
              <Icon icon="solar:document-text-bold" width={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">
                GST Reports &amp; Tax Filings
              </h1>
              <p className="text-xs md:text-sm text-slate-500 font-medium">
                Output (Sales), Input (Purchases) &amp; Consolidated HSN summaries for GSTR-1, GSTR-3B &amp; Reconciliation.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition border border-slate-200"
            title="Refresh Data"
          >
            <Icon icon="solar:refresh-bold" className={loading ? "animate-spin" : ""} width={16} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition border border-slate-200"
          >
            <Icon icon="solar:printer-bold" width={16} />
            <span>Print View</span>
          </button>

          <button
            onClick={handleDownloadFullWorkbook}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition disabled:opacity-50"
          >
            <Icon icon={exporting ? "eos-icons:loading" : "solar:file-download-bold"} width={18} />
            <span>{exporting ? "Exporting..." : "Export Full GST Workbook (.xlsx)"}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Financial Summary KPI Cards ──────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Card 1: Output Taxable */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Sales Taxable
            </span>
            <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Icon icon="solar:cart-bold" width={14} />
            </span>
          </div>
          <div className="mt-2 text-lg md:text-xl font-black font-mono text-slate-900">
            {fmtCurrency(reportData.summary.totalOutputTaxable)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-medium">
            {reportData.meta.totalOutputCount} Billed Items
          </div>
        </div>

        {/* Card 2: Output GST */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Output GST (Liability)
            </span>
            <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Icon icon="solar:tag-price-bold" width={14} />
            </span>
          </div>
          <div className="mt-2 text-lg md:text-xl font-black font-mono text-amber-600">
            {fmtCurrency(reportData.summary.totalOutputGst)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-medium">
            Net Sales: {fmtCurrency(reportData.summary.totalOutputNet)}
          </div>
        </div>

        {/* Card 3: Input Taxable */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Purchase Taxable
            </span>
            <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Icon icon="solar:box-bold" width={14} />
            </span>
          </div>
          <div className="mt-2 text-lg md:text-xl font-black font-mono text-slate-900">
            {fmtCurrency(reportData.summary.totalInputTaxable)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-medium">
            {reportData.meta.totalInputCount} Purchase Items
          </div>
        </div>

        {/* Card 4: Input GST */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Input GST (ITC)
            </span>
            <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Icon icon="solar:shield-check-bold" width={14} />
            </span>
          </div>
          <div className="mt-2 text-lg md:text-xl font-black font-mono text-emerald-600">
            {fmtCurrency(reportData.summary.totalInputGst)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-medium">
            Net Purchases: {fmtCurrency(reportData.summary.totalInputNet)}
          </div>
        </div>

        {/* Card 5: Net Payable */}
        <div className="col-span-2 md:col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Net Tax {reportData.summary.netGstPayable >= 0 ? "Payable" : "Credit"}
            </span>
            <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${reportData.summary.netGstPayable >= 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
              <Icon icon="solar:wallet-money-bold" width={14} />
            </span>
          </div>
          <div className={`mt-2 text-lg md:text-xl font-black font-mono ${reportData.summary.netGstPayable >= 0 ? "text-red-600" : "text-emerald-600"}`}>
            {fmtCurrency(Math.abs(reportData.summary.netGstPayable))}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-500">
            {reportData.summary.netGstPayable >= 0 ? "(Liability - ITC)" : "(Excess ITC Available)"}
          </div>
        </div>
      </div>

      {/* ── 3. Filters & Controls ────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        {/* Date presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Icon icon="solar:calendar-bold" width={14} />
            Period:
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
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                datePreset === preset.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Input Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100">
          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => {
                setDatePreset("CUSTOM");
                setFilters((p) => ({ ...p, startDate: e.target.value }));
              }}
              className="w-full text-xs font-medium px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => {
                setDatePreset("CUSTOM");
                setFilters((p) => ({ ...p, endDate: e.target.value }));
              }}
              className="w-full text-xs font-medium px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* GST Rate Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              GST Rate
            </label>
            <select
              value={filters.gstRate}
              onChange={(e) => setFilters((p) => ({ ...p, gstRate: e.target.value }))}
              className="w-full text-xs font-semibold px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Product Type
            </label>
            <select
              value={filters.productType}
              onChange={(e) => setFilters((p) => ({ ...p, productType: e.target.value }))}
              className="w-full text-xs font-semibold px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Tax Type
            </label>
            <select
              value={filters.taxType}
              onChange={(e) => setFilters((p) => ({ ...p, taxType: e.target.value }))}
              className="w-full text-xs font-semibold px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All (Inc / Exc)</option>
              <option value="EXCLUDED">EXCLUDED (Base + Tax)</option>
              <option value="INCLUDED">INCLUDED (Tax in Price)</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Search Party / Bill / HSN
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Party, Bill #, GSTIN..."
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                className="w-full text-xs font-medium pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Icon
                icon="solar:magnifer-linear"
                width={14}
                className="absolute left-2.5 top-2 text-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Tabs Navigation ─────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("OUTPUT")}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
              activeTab === "OUTPUT"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Icon icon="solar:bill-check-bold" width={16} />
            <span>GST Output Report (Sales)</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === "OUTPUT" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {reportData.outputReport.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("INPUT")}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
              activeTab === "INPUT"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Icon icon="solar:box-minimalistic-bold" width={16} />
            <span>GST Input Report (Purchase)</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === "INPUT" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {reportData.inputReport.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("CONSOLIDATED")}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
              activeTab === "CONSOLIDATED"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Icon icon="solar:pie-chart-2-bold" width={16} />
            <span>GST Consolidated (HSN Summary)</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === "CONSOLIDATED" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {reportData.consolidatedReport.length}
            </span>
          </button>
        </div>

        {/* Page size selector */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Show:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(e.target.value === "ALL" ? "ALL" : Number(e.target.value));
              setPage(1);
            }}
            className="bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-1 rounded-lg text-xs"
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <Icon icon="eos-icons:loading" width={36} className="mx-auto mb-2 text-blue-600" />
            <p className="text-sm font-semibold text-slate-600">Calculating GST reports &amp; tax slabs...</p>
          </div>
        ) : currentRecords.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Icon icon="solar:document-medicine-linear" width={48} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No transactions recorded for the selected filter criteria.</p>
            <p className="text-xs text-slate-400 mt-1">Try switching to &quot;All Time&quot; or clear the search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[640px]">
            {/* ── TAB 1: OUTPUT REPORT ── */}
            {activeTab === "OUTPUT" && (
              <table className="w-full text-[11px] border-collapse text-left">
                <thead className="bg-[#ea580c] text-white font-black sticky top-0 z-20 border-b-2 border-orange-800 shadow-md tracking-wide">
                  <tr>
                    <th className="py-2.5 px-2 text-center w-12 border-r border-orange-600/60">#</th>
                    <th className="py-2.5 px-3 whitespace-nowrap border-r border-orange-600/60">Branch Name</th>
                    <th className="py-2.5 px-3 whitespace-nowrap border-r border-orange-600/60">Branch GST</th>
                    <th className="py-2.5 px-3 whitespace-nowrap border-r border-orange-600/60">Bill No</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap text-center border-r border-orange-600/60">Order Date</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap text-center border-r border-orange-600/60">Invoice Date</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap text-center border-r border-orange-600/60">Created Date</th>
                    <th className="py-2.5 px-3 whitespace-nowrap border-r border-orange-600/60">Name of Party</th>
                    <th className="py-2.5 px-3 whitespace-nowrap border-r border-orange-600/60">Company Name</th>
                    <th className="py-2.5 px-3 whitespace-nowrap border-r border-orange-600/60">GST Number</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap border-r border-orange-600/60">State</th>
                    <th className="py-2.5 px-2 whitespace-nowrap text-center border-r border-orange-600/60">Tax Type</th>
                    <th className="py-2.5 px-2 whitespace-nowrap text-center border-r border-orange-600/60">Product</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap text-center border-r border-orange-600/60">HSN/SAC</th>
                    <th className="py-2.5 px-2 text-right border-r border-orange-600/60">Qty</th>
                    <th className="py-2.5 px-2 text-right border-r border-orange-600/60">Pieces</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap border-r border-orange-600/60">Retail Price (₹)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap border-r border-orange-600/60">Base Price (₹)</th>
                    <th className="py-2.5 px-2 text-center border-r border-orange-600/60">GST%</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap border-r border-orange-600/60">SGST (₹)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap border-r border-orange-600/60">CGST (₹)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap border-r border-orange-600/60">IGST (₹)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap border-r border-orange-600/60 bg-orange-800 text-white font-black">Total GST (₹)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap border-r border-orange-600/60">Gross (₹)</th>
                    <th className="py-2.5 px-2.5 text-right whitespace-nowrap border-r border-orange-600/60">Discount (₹)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap bg-orange-900 text-white font-black">Net Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedRecords.map((r, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/40 transition">
                      <td className="py-2 px-2 text-center text-slate-500 font-mono border-r border-slate-200">{r.sNo}</td>
                      <td className="py-2 px-3 whitespace-nowrap font-semibold text-slate-800 border-r border-slate-200">{r.branchName}</td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-[10px] text-slate-600 border-r border-slate-200">{r.branchGstNumber}</td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono font-bold text-blue-700 border-r border-slate-200">{r.billNo}</td>
                      <td className="py-2 px-2.5 whitespace-nowrap text-center font-mono text-[10px] text-slate-600 border-r border-slate-200">{r.orderDate}</td>
                      <td className="py-2 px-2.5 whitespace-nowrap text-center font-mono text-[10px] text-slate-600 border-r border-slate-200">{r.invoiceDate}</td>
                      <td className="py-2 px-2.5 whitespace-nowrap text-center font-mono text-[10px] text-slate-600 border-r border-slate-200">{r.createdDate}</td>
                      <td className="py-2 px-3 whitespace-nowrap font-bold text-slate-900 border-r border-slate-200">{r.partyName}</td>
                      <td className="py-2 px-3 whitespace-nowrap text-slate-700 border-r border-slate-200">{r.companyName}</td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-[10px] text-slate-600 border-r border-slate-200">{r.gstNumber}</td>
                      <td className="py-2 px-2.5 whitespace-nowrap font-semibold text-slate-700 border-r border-slate-200">{r.state}</td>
                      <td className="py-2 px-2 text-center whitespace-nowrap border-r border-slate-200">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${r.taxType === "INCLUDED" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700"}`}>
                          {r.taxType}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center whitespace-nowrap font-semibold text-slate-700 border-r border-slate-200">{r.productType}</td>
                      <td className="py-2 px-2.5 text-center whitespace-nowrap font-mono font-bold text-slate-800 border-r border-slate-200">{r.hsnSac}</td>
                      <td className="py-2 px-2 text-right font-mono border-r border-slate-200">{r.qty}</td>
                      <td className="py-2 px-2 text-right font-mono border-r border-slate-200">{r.totalPieces}</td>
                      <td className="py-2 px-3 text-right font-mono border-r border-slate-200">{fmtNum(r.totalRetailPrice)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 border-r border-slate-200">{fmtNum(r.totalBasePrice)}</td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-blue-700 border-r border-slate-200">{r.gstPercent}%</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700 border-r border-slate-200">{fmtNum(r.sgst)}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700 border-r border-slate-200">{fmtNum(r.cgst)}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700 border-r border-slate-200">{fmtNum(r.igst)}</td>
                      <td className="py-2 px-3 text-right font-mono font-black text-amber-800 bg-amber-50/50 border-r border-slate-200">{fmtNum(r.totalGst)}</td>
                      <td className="py-2 px-3 text-right font-mono border-r border-slate-200">{fmtNum(r.totalGross)}</td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-600 border-r border-slate-200">{fmtNum(r.totalDiscount)}</td>
                      <td className="py-2 px-3 text-right font-mono font-black text-emerald-800 bg-emerald-50/50">{fmtNum(r.totalNetAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                {/* Footer Sum Totals */}
                <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={14} className="py-2.5 px-3 text-right uppercase tracking-wider text-[10px] text-slate-600 border-r border-orange-600/60">
                      Total ({currentRecords.length} Items):
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono border-r border-orange-600/60">{tabTotals.qty}</td>
                    <td className="py-2.5 px-2 text-right font-mono border-r border-orange-600/60">{tabTotals.pieces}</td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-orange-600/60">{fmtNum(tabTotals.retailPrice)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-blue-800 border-r border-orange-600/60">{fmtNum(tabTotals.basePrice)}</td>
                    <td className="py-2.5 px-2 text-center border-r border-orange-600/60">—</td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-orange-600/60">{fmtNum(tabTotals.sgst)}</td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-orange-600/60">{fmtNum(tabTotals.cgst)}</td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-orange-600/60">{fmtNum(tabTotals.igst)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-900 bg-amber-100/70 border-r border-orange-600/60">{fmtNum(tabTotals.totalGst)}</td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-orange-600/60">{fmtNum(tabTotals.gross)}</td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-red-600 border-r border-orange-600/60">{fmtNum(tabTotals.discount)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-900 bg-emerald-100/80">{fmtNum(tabTotals.net)}</td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* ── TAB 2: INPUT REPORT ── */}
            {activeTab === "INPUT" && (
              <table className="w-full text-[11px] border-collapse text-left">
                <thead className="bg-[#ea580c] text-white font-black sticky top-0 z-20 border-b-2 border-orange-800 shadow-md tracking-wide">
                  <tr>
                    <th className="py-2.5 px-2 text-center w-12 border-r border-orange-600/60">#</th>
                    <th className="py-2.5 px-3 whitespace-nowrap border-r border-orange-600/60">Branch Name</th>
                    <th className="py-2.5 px-3 whitespace-nowrap border-r border-orange-600/60">Branch GST</th>
                    <th className="py-2.5 px-3 whitespace-nowrap border-r border-orange-600/60">Bill No</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap text-center border-r border-orange-600/60">Type</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap text-center border-r border-orange-600/60">Created Date</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap text-center border-r border-orange-600/60">Purchase Date</th>
                    <th className="py-2.5 px-3 whitespace-nowrap border-r border-orange-600/60">Name of Party</th>
                    <th className="py-2.5 px-3 whitespace-nowrap border-r border-orange-600/60">GST Number</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap border-r border-orange-600/60">State</th>
                    <th className="py-2.5 px-2 text-right border-r border-orange-600/60">Quantity</th>
                    <th className="py-2.5 px-2 text-right border-r border-orange-600/60">Pieces/Box</th>
                    <th className="py-2.5 px-2 text-right border-r border-orange-600/60">Total Pieces</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap border-r border-orange-600/60">Retail Price (₹)</th>
                    <th className="py-2.5 px-2.5 text-center whitespace-nowrap border-r border-orange-600/60">HSN/SAC</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap border-r border-orange-600/60">Base Price (₹)</th>
                    <th className="py-2.5 px-2 text-center border-r border-orange-600/60">GST%</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap border-r border-orange-600/60">SGST (₹)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap border-r border-orange-600/60">CGST (₹)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap border-r border-orange-600/60">IGST (₹)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap border-r border-orange-600/60 bg-orange-800 text-white font-black">Total GST (₹)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap border-r border-orange-600/60">Gross (₹)</th>
                    <th className="py-2.5 px-2.5 text-right whitespace-nowrap border-r border-orange-600/60">Discount (₹)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap bg-orange-900 text-white font-black">Net Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedRecords.map((r, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/40 transition">
                      <td className="py-2 px-2 text-center text-slate-500 font-mono border-r border-slate-200">{r.sNo}</td>
                      <td className="py-2 px-3 whitespace-nowrap font-semibold text-slate-800 border-r border-slate-200">{r.branchName}</td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-[10px] text-slate-600 border-r border-slate-200">{r.branchGstNumber}</td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono font-bold text-slate-700 border-r border-slate-200">{r.billNo}</td>
                      <td className="py-2 px-2.5 whitespace-nowrap text-center border-r border-slate-200">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {r.type}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap text-center font-mono text-[10px] text-slate-600 border-r border-slate-200">{r.createdDate}</td>
                      <td className="py-2 px-2.5 whitespace-nowrap text-center font-mono text-[10px] text-slate-600 border-r border-slate-200">{r.purchaseDate}</td>
                      <td className="py-2 px-3 whitespace-nowrap font-bold text-slate-900 border-r border-slate-200">{r.partyName}</td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-[10px] text-slate-600 border-r border-slate-200">{r.gstNumber}</td>
                      <td className="py-2 px-2.5 whitespace-nowrap font-semibold text-slate-700 border-r border-slate-200">{r.state}</td>
                      <td className="py-2 px-2 text-right font-mono border-r border-slate-200">{r.quantity}</td>
                      <td className="py-2 px-2 text-right font-mono border-r border-slate-200">{r.piecesPerBox}</td>
                      <td className="py-2 px-2 text-right font-mono border-r border-slate-200">{r.totalPieces}</td>
                      <td className="py-2 px-3 text-right font-mono border-r border-slate-200">{fmtNum(r.totalRetailPrice)}</td>
                      <td className="py-2 px-2.5 text-center whitespace-nowrap font-mono font-bold text-slate-800 border-r border-slate-200">{r.hsnSac}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 border-r border-slate-200">{fmtNum(r.totalBasePrice)}</td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-blue-700 border-r border-slate-200">{r.gstPercent}%</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700 border-r border-slate-200">{fmtNum(r.sgst)}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700 border-r border-slate-200">{fmtNum(r.cgst)}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700 border-r border-slate-200">{fmtNum(r.igst)}</td>
                      <td className="py-2 px-3 text-right font-mono font-black text-amber-800 bg-amber-50/50 border-r border-slate-200">{fmtNum(r.totalGst)}</td>
                      <td className="py-2 px-3 text-right font-mono border-r border-slate-200">{fmtNum(r.totalGross)}</td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-600 border-r border-slate-200">{fmtNum(r.totalDiscount)}</td>
                      <td className="py-2 px-3 text-right font-mono font-black text-emerald-800 bg-emerald-50/50">{fmtNum(r.totalNetAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                {/* Footer Sum Totals */}
                <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={10} className="py-2.5 px-3 text-right uppercase tracking-wider text-[10px] text-slate-600 border-r border-orange-600/60">
                      Total ({currentRecords.length} Items):
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono border-r border-orange-600/60">{tabTotals.qty}</td>
                    <td className="py-2.5 px-2 text-right font-mono border-r border-orange-600/60">—</td>
                    <td className="py-2.5 px-2 text-right font-mono border-r border-orange-600/60">{tabTotals.pieces}</td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-orange-600/60">{fmtNum(tabTotals.retailPrice)}</td>
                    <td className="py-2.5 px-2.5 text-center border-r border-orange-600/60">—</td>
                    <td className="py-2.5 px-3 text-right font-mono text-blue-800 border-r border-orange-600/60">{fmtNum(tabTotals.basePrice)}</td>
                    <td className="py-2.5 px-2 text-center border-r border-orange-600/60">—</td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-orange-600/60">{fmtNum(tabTotals.sgst)}</td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-orange-600/60">{fmtNum(tabTotals.cgst)}</td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-orange-600/60">{fmtNum(tabTotals.igst)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-900 bg-amber-100/70 border-r border-orange-600/60">{fmtNum(tabTotals.totalGst)}</td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-orange-600/60">{fmtNum(tabTotals.gross)}</td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-red-600 border-r border-orange-600/60">{fmtNum(tabTotals.discount)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-900 bg-emerald-100/80">{fmtNum(tabTotals.net)}</td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* ── TAB 3: CONSOLIDATED REPORT ── */}
            {activeTab === "CONSOLIDATED" && (
              <table className="w-full text-[11px] border-collapse text-left">
                <thead className="bg-[#ea580c] text-white font-black sticky top-0 z-20 border-b-2 border-orange-800 shadow-md tracking-wide">
                  <tr>
                    <th className="py-2.5 px-2 text-center w-12 border-r border-orange-600/60">#</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap border-r border-orange-600/60">HSN/SAC</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap border-r border-orange-600/60">Quantity</th>
                    <th className="py-2.5 px-4 text-right whitespace-nowrap border-r border-orange-600/60">Total Retail Price (₹)</th>
                    <th className="py-2.5 px-4 text-right whitespace-nowrap border-r border-orange-600/60">Total Base Price (₹)</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap border-r border-orange-600/60">GST%</th>
                    <th className="py-2.5 px-3.5 text-right whitespace-nowrap border-r border-orange-600/60">Total SGST (₹)</th>
                    <th className="py-2.5 px-3.5 text-right whitespace-nowrap border-r border-orange-600/60">Total CGST (₹)</th>
                    <th className="py-2.5 px-3.5 text-right whitespace-nowrap border-r border-orange-600/60">Total IGST (₹)</th>
                    <th className="py-2.5 px-4 text-right whitespace-nowrap border-r border-orange-600/60 bg-orange-800 text-white font-black">Total GST (₹)</th>
                    <th className="py-2.5 px-4 text-right whitespace-nowrap border-r border-orange-600/60">Total Gross (₹)</th>
                    <th className="py-2.5 px-3.5 text-right whitespace-nowrap border-r border-orange-600/60">Item Discount (₹)</th>
                    <th className="py-2.5 px-4 text-right whitespace-nowrap bg-orange-900 text-white font-black">Total Net Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedRecords.map((r, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/40 transition">
                      <td className="py-2.5 px-2 text-center text-slate-500 font-mono border-r border-slate-200">{r.sNo}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 border-r border-slate-200">{r.hsnSac}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 border-r border-slate-200">{r.quantity}</td>
                      <td className="py-2.5 px-4 text-right font-mono border-r border-slate-200">{fmtNum(r.totalRetailPrice)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 border-r border-slate-200">{fmtNum(r.totalBasePrice)}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700 border-r border-slate-200">{r.gstPercent}%</td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-slate-700 border-r border-slate-200">{fmtNum(r.sgst)}</td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-slate-700 border-r border-slate-200">{fmtNum(r.cgst)}</td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-slate-700 border-r border-slate-200">{fmtNum(r.igst)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-black text-amber-800 bg-amber-50/50 border-r border-slate-200">{fmtNum(r.totalGst)}</td>
                      <td className="py-2.5 px-4 text-right font-mono border-r border-slate-200">{fmtNum(r.totalGross)}</td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-slate-600 border-r border-slate-200">{fmtNum(r.totalDiscount)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-black text-emerald-800 bg-emerald-50/50">{fmtNum(r.totalNetAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                {/* Footer Sum Totals */}
                <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={2} className="py-2.5 px-3 text-right uppercase tracking-wider text-[10px] text-slate-600 border-r border-orange-600/60">
                      Consolidated Total:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-orange-600/60">{tabTotals.qty}</td>
                    <td className="py-2.5 px-4 text-right font-mono border-r border-orange-600/60">{fmtNum(tabTotals.retailPrice)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-blue-800 border-r border-orange-600/60">{fmtNum(tabTotals.basePrice)}</td>
                    <td className="py-2.5 px-3 text-center border-r border-orange-600/60">—</td>
                    <td className="py-2.5 px-3.5 text-right font-mono border-r border-orange-600/60">{fmtNum(tabTotals.sgst)}</td>
                    <td className="py-2.5 px-3.5 text-right font-mono border-r border-orange-600/60">{fmtNum(tabTotals.cgst)}</td>
                    <td className="py-2.5 px-3.5 text-right font-mono border-r border-orange-600/60">{fmtNum(tabTotals.igst)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-amber-900 bg-amber-100/70 border-r border-orange-600/60">{fmtNum(tabTotals.totalGst)}</td>
                    <td className="py-2.5 px-4 text-right font-mono border-r border-orange-600/60">{fmtNum(tabTotals.gross)}</td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-red-600 border-r border-orange-600/60">{fmtNum(tabTotals.discount)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-900 bg-emerald-100/80">{fmtNum(tabTotals.net)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}

        {/* ── 6. Pagination Footer ───────────────────────────────── */}
        {!loading && currentRecords.length > 0 && pageSize !== "ALL" && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
            <div>
              Showing{" "}
              <strong>
                {Math.min(currentRecords.length, (page - 1) * pageSize + 1)}
              </strong>{" "}
              to{" "}
              <strong>
                {Math.min(currentRecords.length, page * pageSize)}
              </strong>{" "}
              of <strong>{currentRecords.length}</strong> entries
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1 rounded bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition font-semibold"
              >
                Previous
              </button>
              <span className="px-3 py-1 font-bold">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2.5 py-1 rounded bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition font-semibold"
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
