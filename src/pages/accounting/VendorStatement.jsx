import React, { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Button, Grid, Chip, IconButton,
  TextField, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, Paper, CircularProgress, Divider, Alert,
  LinearProgress, Tooltip, Collapse
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  getVendorStatement,
  downloadPaymentReceipt,
  downloadVendorLedgerStatement,
} from '../../services/accountingService';
import VendorPayoutModal from './VendorPayoutModal';

const formatAddress = (addr) => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  if (typeof addr === 'object') {
    const parts = [addr.address, addr.city, addr.state, addr.zipCode, addr.country].filter(Boolean);
    return parts.join(', ') || addr.branchName || '';
  }
  return '';
};

const getPurchaseStatusBadge = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'received':
    case 'closed':
      return { bg: '#DEF7EC', text: '#03543F', border: '#BCF0DA' };
    case 'partiallyreceived':
      return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
    case 'submitted':
      return { bg: '#EDE9FE', text: '#5B21B6', border: '#DDD6FE' };
    default:
      return { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
  }
};

const VendorStatement = () => {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [monthlyBreakdown, setMonthlyBreakdown] = useState([]);
  const [filters, setFilters] = useState({ startDate: '', endDate: '' });
  const [showMonthlySummary, setShowMonthlySummary] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [selectedPurchaseForPayout, setSelectedPurchaseForPayout] = useState(null);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const toggleExpandRow = (id) => setExpandedRowId((prev) => (prev === id ? null : id));
  const [downloadingReceiptId, setDownloadingReceiptId] = useState(null);
  const [downloadingStatement, setDownloadingStatement] = useState(false);
  const [statementError, setStatementError] = useState(null);

  const fetchStatement = async (customFilters = filters) => {
    try {
      setLoading(true);
      setStatementError(null);
      const res = await getVendorStatement(vendorId, customFilters);
      const data = res.data || {};
      setSummary(data.summary || {});
      const rawTxns = data.transactions || [];
      const sorted = [...rawTxns].sort(
        (a, b) => new Date(a.transactionDate || a.createdAt) - new Date(b.transactionDate || b.createdAt)
      );
      setTransactions(sorted);
      setOrders(data.orders || []);
      setMonthlyBreakdown(data.monthlyBreakdown || []);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load vendor statement';
      setStatementError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vendorId) fetchStatement();
  }, [vendorId]);

  const stats = summary.statistics || {};
  const master = summary.ledgerMaster || {};
  const vendor = summary.vendor || {};

  const currentOutstanding = Number(master.currentOutstanding !== undefined ? master.currentOutstanding : stats.currentOutstanding || 0);
  const totalDebit = Number(stats.totalDebit || 0);
  const totalCredit = Number(stats.totalCredit || 0);
  const openingBalance = Number(stats.openingBalance || master.openingBalance || 0);

  // Build orders lookup map
  const ordersMap = {};
  orders.forEach(ord => {
    if (ord.orderId) ordersMap[String(ord.orderId)] = ord;
    if (ord._id) ordersMap[String(ord._id)] = ord;
    if (ord.orderNumber) ordersMap[ord.orderNumber] = ord;
  });

  // Detect unrecorded purchase orders not yet in the transactions list
  const existingOrderRefs = new Set(
    transactions.flatMap(t => [
      String(t.orderId || ''), String(t.voucherId || ''),
      String(t.referenceNumber || ''), String(t.orderNumber || '')
    ]).filter(Boolean)
  );

  const unrecordedOrderTxns = orders
    .filter(ord => {
      const oid = String(ord.orderId || ord._id || '');
      const onum = String(ord.orderNumber || '');
      if ((oid && existingOrderRefs.has(oid)) || (onum && existingOrderRefs.has(onum))) return false;
      if (filters.startDate || filters.endDate) {
        const ordDate = new Date(ord.orderDate || ord.createdAt);
        if (filters.startDate && ordDate < new Date(filters.startDate)) return false;
        if (filters.endDate) {
          const endD = new Date(filters.endDate);
          endD.setHours(23, 59, 59, 999);
          if (ordDate > endD) return false;
        }
      }
      return true;
    })
    .map(ord => ({
      _id: ord._id || ord.orderId,
      voucherId: ord.orderId || ord._id,
      orderId: ord.orderId || ord._id,
      orderNumber: ord.orderNumber,
      referenceNumber: ord.orderNumber,
      voucherType: 'Purchase Invoice',
      transactionDate: ord.orderDate || ord.createdAt,
      createdAt: ord.createdAt,
      credit: Number(ord.grandTotal || ord.totalOrderPrice || 0),
      debit: 0,
      runningBalance: Number(ord.balanceDue || 0),
      vendorName: ord.vendorName || vendor.firm || vendor.name || 'Vendor',
      items: ord.items || [],
      orderStatus: ord.orderStatus || 'Submitted',
      orderGrandTotal: Number(ord.grandTotal || ord.totalOrderPrice || 0),
      orderPaidAmount: Number(ord.paidAmount || 0),
      orderBalanceDue: Number(ord.balanceDue || 0),
      partPaymentStatus: ord.paymentStatus,
      partPaymentPercentage: ord.partPaymentPercentage,
      orderPayments: ord.orderPayments || [],
      taxableAmount: ord.taxableAmount,
      gstAmount: ord.gstAmount,
      shippingCharges: Number(ord.shippingCharges || 0),
      otherCharges: Number(ord.otherCharges || 0),
      createdByName: 'Staff',
    }));

  // Collect payment refs already grouped under orders
  const allocatedPaymentRefs = new Set();
  orders.forEach(ord => {
    (ord.orderPayments || []).forEach(p => {
      if (p.paymentNumber) allocatedPaymentRefs.add(String(p.paymentNumber));
      if (p.referenceNumber) allocatedPaymentRefs.add(String(p.referenceNumber));
      if (p.paymentId) allocatedPaymentRefs.add(String(p.paymentId));
    });
  });

  // Filter standalone transactions
  const standaloneTransactions = transactions.filter(t => {
    if (filters.startDate || filters.endDate) {
      const txDate = new Date(t.transactionDate || t.createdAt);
      if (filters.startDate && txDate < new Date(filters.startDate)) return false;
      if (filters.endDate) {
        const endD = new Date(filters.endDate);
        endD.setHours(23, 59, 59, 999);
        if (txDate > endD) return false;
      }
    }

    const isPayout = Boolean(
      (t.referenceNumber && t.referenceNumber.startsWith('VPAY')) ||
      t.voucherType === 'Payment Voucher' ||
      (Number(t.debit) > 0 && !t.referenceNumber?.startsWith('PO-'))
    );
    if (!isPayout) return true;

    const isAllocated =
      t.isOrderAllocatedPayment ||
      allocatedPaymentRefs.has(String(t.referenceNumber || '')) ||
      allocatedPaymentRefs.has(String(t.voucherId || '')) ||
      allocatedPaymentRefs.has(String(t._id || ''));
    return !isAllocated;
  });

  const seenUnifiedKeys = new Set();
  const unifiedTransactions = [...standaloneTransactions, ...unrecordedOrderTxns]
    .filter(t => {
      const key = t.orderNumber || (t.voucherId ? String(t.voucherId) : (t.referenceNumber || String(t._id)));
      if (seenUnifiedKeys.has(key)) return false;
      seenUnifiedKeys.add(key);
      return true;
    })
    .sort((a, b) => new Date(a.transactionDate || a.createdAt) - new Date(b.transactionDate || b.createdAt));

  const numberToWordsINR = (num) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const inWords = (n) => {
      let str = '';
      if (n > 19) {
        str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
      } else {
        str += a[n];
      }
      return str;
    };
    num = Math.floor(Math.abs(Number(num) || 0));
    if (num === 0) return 'Zero Rupees Only';
    let words = '';
    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const hundred = Math.floor(num / 100);
    const rem = num % 100;
    if (crore > 0) words += (crore > 99 ? inWords(Math.floor(crore / 100)) + 'Hundred ' + inWords(crore % 100) : inWords(crore)) + 'Crore ';
    if (lakh > 0) words += inWords(lakh) + 'Lakh ';
    if (thousand > 0) words += inWords(thousand) + 'Thousand ';
    if (hundred > 0) words += inWords(hundred) + 'Hundred ';
    if (rem > 0) words += inWords(rem);
    return (words.trim() || 'Zero') + ' Rupees Only';
  };

  // Browser Print / Save as PDF Engine
  const printHTMLDocument = (htmlContent, title) => {
    const printWindow = window.open('', '_blank', 'width=950,height=800');
    if (!printWindow) {
      toast.error('Popup window was blocked by your browser. Please allow popups for this site to print or save PDF.');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    if (title) {
      printWindow.document.title = title;
    }
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const fmtNum = (n) =>
    Number(n || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const fmtD = (d) =>
    d
      ? new Date(d)
          .toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
          .replace(/\//g, '-')
      : '—';

  const formatModeLabel = (mode) => {
    if (!mode) return 'Bank Transfer';
    const m = String(mode).toUpperCase();
    if (m === 'UPI') return 'UPI / QR Code';
    if (m === 'CASH') return 'Cash Payment';
    if (m === 'BANK_TRANSFER') return 'Bank Transfer / NEFT';
    if (m === 'CHEQUE') return 'Cheque / DD';
    return String(mode).replace(/_/g, ' ');
  };

  // Generate Vendor / Supplier Ledger Statement HTML
  const generateVendorStatementHTML = () => {
    const wholesaler = summary.wholesaler || {};
    const wholesalerName = wholesaler.companyName || 'SAANCHI & CO.';
    const companyAddress = wholesaler.address || '3RD FLOOR, PEOPLES TV BUILDING, RAJA RAMMOHAN ROY ROAD,\nHAKIMPARA, SILIGURI';
    const companyPhone = wholesaler.phone || '0353-4075631';
    const companyEmail = wholesaler.email || 'support@digioptics.com';
    const rawCompanyGstin = wholesaler.gstin || master.gstin || '';
    const companyGstin = (rawCompanyGstin && !String(rawCompanyGstin).startsWith('http') && !String(rawCompanyGstin).includes('/'))
      ? String(rawCompanyGstin).trim()
      : '19AFWFS3883G1Z2';
    const companyLogo = wholesaler.logo || '';

    const partyName = vendor.firm || vendor.name || 'Vendor';
    const partyContact = vendor.mobile || vendor.phone || '-';
    const rawPartyGstin = vendor.gstNumber || vendor.gstin || '';
    const partyGstin = (rawPartyGstin && !String(rawPartyGstin).startsWith('http') && !String(rawPartyGstin).includes('/'))
      ? String(rawPartyGstin).trim()
      : 'URP';
    const partyAddress = formatAddress(vendor.address) || '-';
    const ledgerCode = master.ledgerCode || `VEND-LED-${String(vendorId || '').slice(-6).toUpperCase()}`;
    const paymentTerms = master.paymentTerms || vendor.paymentTerms || 30;

    let statementPeriod = filters.startDate
      ? `From ${fmtD(filters.startDate)} To ${filters.endDate ? fmtD(filters.endDate) : 'Today'}`
      : '';

    if (!statementPeriod && unifiedTransactions && unifiedTransactions.length > 0) {
      const validDates = unifiedTransactions
        .map(t => new Date(t.transactionDate || t.orderDate || t.createdAt).getTime())
        .filter(time => !isNaN(time) && time > 0)
        .sort((a, b) => a - b);
      if (validDates.length > 0) {
        const fromStr = fmtD(new Date(validDates[0]));
        const toStr = fmtD(new Date(validDates[validDates.length - 1]));
        statementPeriod = fromStr === toStr ? fromStr : `From ${fromStr} To ${toStr}`;
      }
    }
    if (!statementPeriod) {
      statementPeriod = `As of ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}`;
    }

    const rowsHtml = unifiedTransactions
      .map((t, idx) => {
        const d = fmtD(t.transactionDate || t.orderDate || t.createdAt);
        const isPurchase = Boolean(
          t.voucherType === 'Purchase Invoice' ||
          (t.referenceNumber && String(t.referenceNumber).startsWith('PO-')) ||
          (t.orderGrandTotal != null && Number(t.orderGrandTotal) > 0)
        );
        const isPayout = Boolean(
          (t.referenceNumber && t.referenceNumber.startsWith('VPAY')) ||
          t.voucherType === 'Payment Voucher' ||
          (!isPurchase && Number(t.debit) > 0)
        );

        const orderTotal = Number(t.orderGrandTotal != null ? t.orderGrandTotal : t.credit || 0);
        const paidAmount = Number(t.orderPaidAmount != null ? t.orderPaidAmount : 0);
        const dueAmount = t.orderBalanceDue != null
          ? Number(t.orderBalanceDue)
          : Math.max(0, orderTotal - paidAmount);

        const matchedOrder = ordersMap[String(t.orderId)] || ordersMap[t.orderNumber] || ordersMap[t.referenceNumber] || null;
        const paymentsList = (Array.isArray(t.orderPayments) && t.orderPayments.length > 0) ? t.orderPayments : (matchedOrder?.orderPayments || []);
        const orderItems = (t.items && t.items.length > 0) ? t.items : (matchedOrder?.items || []);
        const isFullyPaid = isPurchase && dueAmount <= 0 && orderTotal > 0;

        const creditStr = isPurchase && orderTotal > 0 ? fmtNum(orderTotal) : (Number(t.credit || 0) > 0 ? fmtNum(t.credit) : '0.00');
        const debitStr = Number(t.debit || 0) > 0 ? fmtNum(t.debit) : '0.00';
        const balStr = isPurchase
          ? (isFullyPaid ? 'Paid' : `₹${fmtNum(dueAmount)} (Payable)`)
          : (Number(t.debit || 0) > 0 ? `₹${fmtNum(t.debit)} (Paid)` : (t.runningBalance != null ? `₹${fmtNum(t.runningBalance)}` : '—'));

        const balColor = isFullyPaid ? '#15803d' : (isPurchase && dueAmount > 0 ? '#b91c1c' : '#0f172a');
        const ref = t.orderNumber || t.referenceNumber || t.voucherId || '—';

        let particulars = '';
        if (isPayout) {
          const detectedMode = t.paymentMode || (t.narration?.toLowerCase().includes('upi') ? 'UPI' : t.narration?.toLowerCase().includes('cash') ? 'CASH' : 'BANK_TRANSFER');
          particulars = `<span style="display:inline-block; font-weight:700; color:#059669; background:#dcfce7; padding:1px 4px; border-radius:2px; font-size:8px; margin-right:4px;">[${formatModeLabel(detectedMode)}]</span> Payout / Payment Disbursed`;
          if (t.narration && !t.narration.toLowerCase().includes('payout issued') && !t.narration.toLowerCase().includes('payment issued')) {
            particulars += ` &bull; ${t.narration}`;
          }
        } else if (isPurchase) {
          particulars = 'Purchase Invoice';
          const rawNarration = t.narration || t.description || '';
          const isAutoGenerated = /Purchase Order #|Total:|Vendor:/i.test(rawNarration);
          if (rawNarration && !isAutoGenerated) {
            particulars += ` &bull; ${rawNarration}`;
          }
        } else {
          particulars = t.voucherType || t.description || 'General Ledger Entry';
        }

        // Purchase Items sub-table
        const orderCreatedDate = t.orderDate || t.createdAt || matchedOrder?.orderDate || matchedOrder?.createdAt;
        const itemsRow = (isPurchase && orderItems.length > 0)
          ? `
          <tr style="background:#fff8f8; border-bottom:1px solid #fca5a5;">
            <td colspan="7" style="padding:4px 6px 6px 6px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px; padding-bottom:2px; border-bottom:1px dashed #fca5a5; font-size:8.5px;">
                <span style="font-weight:800; color:#b91c1c; text-transform:uppercase; letter-spacing:0.3px;">
                  Purchase Items (${orderItems.length} Product${orderItems.length > 1 ? 's' : ''}) &bull; PO Ref: <strong style="font-family:monospace; color:#0284c7;">${ref}</strong> &bull; Order Created: <strong style="font-family:monospace; color:#0f172a;">${fmtD(orderCreatedDate)}</strong>
                </span>
                <span style="color:#475569; font-weight:600;">
                  PO Status: <strong>${t.orderStatus || matchedOrder?.orderStatus || 'Submitted'}</strong> &bull; Invoiced Total: <strong style="color:#b91c1c;">₹${creditStr}</strong>
                </span>
              </div>
              <table style="width:100%; border-collapse:collapse; background:#ffffff; border:1px solid #f87171; font-size:8px;">
                <thead>
                  <tr style="background:#fee2e2; border-bottom:1px solid #f87171; font-weight:700; color:#7f1d1d;">
                    <th style="width:28px; border-right:1px solid #fca5a5; padding:2.5px 3px; text-align:center;">#</th>
                    <th style="border-right:1px solid #fca5a5; padding:2.5px 5px; text-align:left;">Product / Item Name</th>
                    <th style="width:95px; border-right:1px solid #fca5a5; padding:2.5px 4px; text-align:left;">Brand</th>
                    <th style="width:80px; border-right:1px solid #fca5a5; padding:2.5px 4px; text-align:center;">Category / Type</th>
                    <th style="width:90px; border-right:1px solid #fca5a5; padding:2.5px 4px; text-align:center;">Item Code / Ref</th>
                    <th style="width:40px; border-right:1px solid #fca5a5; padding:2.5px 4px; text-align:center;">Qty</th>
                    <th style="width:85px; border-right:1px solid #fca5a5; padding:2.5px 5px; text-align:right;">Buying Price (₹)</th>
                    <th style="width:85px; padding:2.5px 5px; text-align:right;">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${orderItems.map((item, iIdx) => {
                    const itemName = item.itemName || item.productName || item.name || 'Product';
                    const brand = item.brand || item.brandName || '—';
                    const category = item.category || item.categoryName || item.orderType || 'STOCK';
                    const code = item.code || item.productCode || item.hsnSac || ref || '—';
                    const buyingPrice = Number(item.buyingPrice || item.price || 0);
                    const qty = Number(item.qty || 1);
                    const discount = Number(item.discountAmount || 0);
                    const lineTotal = buyingPrice * qty - discount;
                    return `
                      <tr style="border-bottom:1px solid #fee2e2;">
                        <td style="border-right:1px solid #fca5a5; padding:2.5px 3px; text-align:center; font-weight:700; color:#64748b;">${iIdx + 1}</td>
                        <td style="border-right:1px solid #fca5a5; padding:2.5px 5px; font-weight:600; color:#0f172a;">${itemName}</td>
                        <td style="border-right:1px solid #fca5a5; padding:2.5px 4px; color:#334155;">${brand}</td>
                        <td style="border-right:1px solid #fca5a5; padding:2.5px 4px; text-align:center; font-weight:600; color:#475569;">${category}</td>
                        <td style="border-right:1px solid #fca5a5; padding:2.5px 4px; text-align:center; font-family:monospace; color:#0284c7;">${code}</td>
                        <td style="border-right:1px solid #fca5a5; padding:2.5px 4px; text-align:center; font-weight:700; color:#0f172a;">${qty}</td>
                        <td style="border-right:1px solid #fca5a5; padding:2.5px 5px; text-align:right; font-family:monospace; font-weight:700; color:#475569;">₹${fmtNum(buyingPrice)}</td>
                        <td style="padding:2.5px 5px; text-align:right; font-family:monospace; font-weight:700; color:#0f172a;">₹${fmtNum(lineTotal)}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </td>
          </tr>`
          : '';

        // Payment Breakdown sub-table
        const paymentsRow = (paymentsList && paymentsList.length > 0)
          ? `
          <tr style="background:#f8fafc; border-bottom:1.5px solid #000000;">
            <td colspan="7" style="padding:4px 6px 6px 6px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px; padding-bottom:2px; border-bottom:1px dashed #cbd5e1; font-size:8.5px;">
                <span style="font-weight:800; color:#0369a1; text-transform:uppercase; letter-spacing:0.3px;">
                  Payment Breakdown &amp; Installments (${paymentsList.length} Record${paymentsList.length > 1 ? 's' : ''})
                </span>
                <span style="color:#475569; font-weight:600;">
                  Purchase Total: <strong>₹${creditStr}</strong> &bull; Total Paid: <strong style="color:#15803d;">₹${fmtNum(paidAmount)}</strong> &bull; Balance Payable: <strong style="color:${dueAmount > 0 ? '#b91c1c' : '#15803d'};">₹${fmtNum(dueAmount)}</strong>
                </span>
              </div>
              <table style="width:100%; border-collapse:collapse; background:#ffffff; border:1px solid #94a3b8; font-size:8px;">
                <thead>
                  <tr style="background:#e2e8f0; border-bottom:1px solid #94a3b8; font-weight:700; color:#334155;">
                    <th style="width:44px; border-right:1px solid #cbd5e1; padding:2.5px 3px; text-align:center;">Inst. #</th>
                    <th style="width:74px; border-right:1px solid #cbd5e1; padding:2.5px 4px; text-align:center;">Payment Date</th>
                    <th style="width:115px; border-right:1px solid #cbd5e1; padding:2.5px 5px; text-align:left;">Payment Method</th>
                    <th style="width:145px; border-right:1px solid #cbd5e1; padding:2.5px 5px; text-align:left;">Ref / Voucher / UTR</th>
                    <th style="border-right:1px solid #cbd5e1; padding:2.5px 5px; text-align:left;">Narration / Remarks</th>
                    <th style="width:85px; border-right:1px solid #cbd5e1; padding:2.5px 5px; text-align:right;">Amount (₹)</th>
                    <th style="width:62px; padding:2.5px 3px; text-align:center;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${paymentsList.map((p, pIdx) => {
                    const pDate = fmtD(p.paymentDate || p.createdAt || t.transactionDate);
                    const pMode = formatModeLabel(p.paymentMode);
                    const pRef = p.referenceNumber || p.paymentNumber || p.paymentId || '—';
                    let pRemarks = p.remarks || 'Payout Issued';
                    if (p.utrNumber && p.utrNumber !== pRef) pRemarks += ` (UTR: ${p.utrNumber})`;
                    if (p.bankName) pRemarks += ` [${p.bankName}]`;
                    const pStatus = p.status || 'CLEARED';
                    const isCleared = pStatus === 'CLEARED' || pStatus === 'PAID' || pStatus === 'COMPLETED';
                    return `
                      <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="border-right:1px solid #cbd5e1; padding:2.5px 3px; text-align:center; font-weight:700; color:#475569;">#${pIdx + 1}</td>
                        <td style="border-right:1px solid #cbd5e1; padding:2.5px 4px; text-align:center; font-family:monospace; color:#1e293b;">${pDate}</td>
                        <td style="border-right:1px solid #cbd5e1; padding:2.5px 5px; font-weight:600; color:#0f172a;">${pMode}</td>
                        <td style="border-right:1px solid #cbd5e1; padding:2.5px 5px; font-family:monospace; font-weight:700; color:#0284c7;">${pRef}</td>
                        <td style="border-right:1px solid #cbd5e1; padding:2.5px 5px; color:#475569;">${pRemarks}</td>
                        <td style="border-right:1px solid #cbd5e1; padding:2.5px 5px; text-align:right; font-family:monospace; font-weight:700; color:#15803d;">₹${fmtNum(p.amount)}</td>
                        <td style="padding:2.5px 3px; text-align:center;">
                          <span style="font-weight:700; font-size:7.5px; padding:1px 3px; border-radius:2px; ${isCleared ? 'background:#dcfce7; color:#15803d; border:0.5px solid #86efac;' : 'background:#fef3c7; color:#b45309; border:0.5px solid #fde68a;'}">
                            ${pStatus}
                          </span>
                        </td>
                      </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </td>
          </tr>`
          : '';

        const separatorRow = idx > 0
          ? `<tr style="height: 10px;"><td colspan="7" style="height: 10px; padding: 0; background: #f1f5f9; border-top: 1.5px solid #000000; border-bottom: 1px solid #000000;"></td></tr>`
          : '';

        return `
          ${separatorRow}
          <tr style="border-bottom: 1px solid #000000;">
            <td style="border-right:1px solid #000; padding:5px 4px; text-align:center; font-size:10px; font-weight:700;">${idx + 1}</td>
            <td style="border-right:1px solid #000; padding:5px 4px; text-align:center; font-family:monospace; font-size:9.5px;">${d}</td>
            <td style="border-right:1px solid #000; padding:5px 6px; font-family:monospace; font-weight:700; font-size:10px; color:#0284c7;">${ref}</td>
            <td style="border-right:1px solid #000; padding:5px 6px; font-size:9.5px; color:#1e293b;">${particulars}</td>
            <td style="border-right:1px solid #000; padding:5px 6px; text-align:right; font-family:monospace; font-size:10px; font-weight:700; color:#059669;">${debitStr}</td>
            <td style="border-right:1px solid #000; padding:5px 6px; text-align:right; font-family:monospace; font-size:10px; font-weight:600; color:#b91c1c;">${creditStr}</td>
            <td style="padding:5px 6px; text-align:right; font-family:monospace; font-size:10px; font-weight:700; color:${balColor};">${balStr}</td>
          </tr>
          ${itemsRow}
          ${paymentsRow}
        `;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Vendor Statement - ${partyName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: Arial, Helvetica, "Segoe UI", Roboto, sans-serif;
      font-size: 10px;
      color: #000000;
      background: #ffffff;
      line-height: 1.3;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
  </style>
</head>
<body>
  <div style="width: 100%; max-width: 800px; margin: 0 auto; border: 1.5px solid #000000; background: #ffffff;">

    <!-- 1. Header: Logo, Wholesaler Info, Statement Meta -->
    <table style="width: 100%; border-collapse: collapse; border-bottom: 1.5px solid #000000;">
      <tr>
        <td style="width: 125px; padding: 6px; vertical-align: middle; text-align: center; border-right: 1px solid #000000;">
          ${companyLogo ? `<img src="${companyLogo}" alt="Logo" style="max-width: 110px; max-height: 52px; object-fit: contain;" />` : `<div style="font-weight: 900; font-size: 13px;">${wholesalerName}</div>`}
        </td>
        <td style="padding: 6px 12px; vertical-align: middle;">
          <div style="font-weight: 900; font-size: 15px; color: #000000; text-transform: uppercase; letter-spacing: 0.5px;">${wholesalerName}</div>
          <div style="font-size: 9.5px; color: #1e293b; margin-top: 2px; line-height: 1.35; white-space: pre-line;">${companyAddress}</div>
          <div style="font-size: 9.5px; color: #1e293b; margin-top: 2px;">Phone: <strong>${companyPhone}</strong> | Email: <strong>${companyEmail}</strong></div>
          <div style="font-size: 9px; color: #475569; margin-top: 1px;">GSTIN: <strong style="font-family:monospace;">${companyGstin}</strong></div>
        </td>
        <td style="width: 210px; padding: 6px 10px; vertical-align: middle; border-left: 1px solid #000000; font-size: 9px; line-height: 1.4;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="font-weight: 700; width: 90px;">Statement Date:</td>
              <td style="font-weight: 600; font-family: monospace;">${fmtD(new Date())}</td>
            </tr>
            <tr>
              <td style="font-weight: 700;">Period:</td>
              <td style="font-weight: 700; color: #0f172a; font-size: 8.5px;">${statementPeriod}</td>
            </tr>
            <tr>
              <td style="font-weight: 700;">Ledger Code:</td>
              <td style="font-weight: 800; font-family: monospace; color: #0284c7;">${ledgerCode}</td>
            </tr>
            <tr>
              <td style="font-weight: 700;">Payment Terms:</td>
              <td style="font-weight: 600;">${paymentTerms} Days</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- 2. Title Banner -->
    <div style="text-align: center; font-weight: 800; font-size: 11px; padding: 4px 0; letter-spacing: 1px; background: #f8fafc; border-bottom: 1.5px solid #000000; text-transform: uppercase; color: #0f172a;">
      VENDOR / SUPPLIER LEDGER STATEMENT
    </div>

    <!-- 3. Vendor Details -->
    <div style="padding: 6px 12px; border-bottom: 1.5px solid #000000; font-size: 9.5px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 50%; vertical-align: top; padding-right: 10px;">
            <div style="font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase;">Supplier / Vendor Information:</div>
            <div style="font-weight: 800; font-size: 12px; color: #000000; margin-top: 1px;">${partyName.toUpperCase()}</div>
            <div style="margin-top: 2px;">Contact Mobile: <strong style="font-family:monospace;">${partyContact}</strong></div>
            <div>GSTIN / Tax ID: <strong style="font-family:monospace;">${partyGstin}</strong></div>
          </td>
          <td style="width: 50%; vertical-align: top; padding-left: 10px; border-left: 1px solid #000000;">
            <div style="font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase;">Billing / Dispatch Address:</div>
            <div style="margin-top: 2px; line-height: 1.35; color: #1e293b;">${partyAddress}</div>
            <div style="margin-top: 3px;">Account Category: <strong>Manufacturer / Optical Supplier</strong></div>
          </td>
        </tr>
      </table>
    </div>

    <!-- 4. Financial KPI Strip -->
    <table style="width: 100%; border-collapse: collapse; border-bottom: 1.5px solid #000000; font-size: 9.5px; background: #f8fafc;">
      <tr>
        <td style="width: 33.33%; padding: 5px 8px; border-right: 1px solid #000000; text-align: center;">
          <div style="font-size: 8.5px; font-weight: 700; color: #475569; text-transform: uppercase;">Total Purchased (Credit)</div>
          <div style="font-size: 11.5px; font-weight: 800; font-family: monospace; color: #b91c1c; margin-top: 2px;">₹${fmtNum(totalCredit)}</div>
        </td>
        <td style="width: 33.33%; padding: 5px 8px; border-right: 1px solid #000000; text-align: center;">
          <div style="font-size: 8.5px; font-weight: 700; color: #475569; text-transform: uppercase;">Total Paid Out (Debit)</div>
          <div style="font-size: 11.5px; font-weight: 800; font-family: monospace; color: #15803d; margin-top: 2px;">₹${fmtNum(totalDebit)}</div>
        </td>
        <td style="width: 33.33%; padding: 5px 8px; text-align: center;">
          <div style="font-size: 8.5px; font-weight: 700; color: #475569; text-transform: uppercase;">Net Balance Payable</div>
          <div style="font-size: 11.5px; font-weight: 800; font-family: monospace; color: ${currentOutstanding > 0 ? '#b91c1c' : '#15803d'}; margin-top: 2px;">
            ${currentOutstanding > 0 ? `₹${fmtNum(currentOutstanding)} (Payable)` : '₹0.00 (Settled)'}
          </div>
        </td>
      </tr>
    </table>

    <!-- 5. Transactions Table -->
    <table style="width: 100%; border-collapse: collapse; font-size: 9.5px;">
      <thead>
        <tr style="background: #ffffff; border-bottom: 1px solid #000000; font-weight: 700;">
          <th style="width: 28px; border-right: 1px solid #000; padding: 4px 2px; text-align: center;">#</th>
          <th style="width: 75px; border-right: 1px solid #000; padding: 4px 4px; text-align: center;">Date</th>
          <th style="width: 130px; border-right: 1px solid #000; padding: 4px 6px; text-align: left;">Ref No.</th>
          <th style="border-right: 1px solid #000; padding: 4px 6px; text-align: left;">Particulars &amp; Narration</th>
          <th style="width: 95px; border-right: 1px solid #000; padding: 4px 6px; text-align: right;">Paid Out (₹)</th>
          <th style="width: 95px; border-right: 1px solid #000; padding: 4px 6px; text-align: right;">Purchased (₹)</th>
          <th style="width: 110px; padding: 4px 6px; text-align: right;">Balance (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || `<tr><td colspan="7" style="text-align:center; padding:15px; color:#64748B;">No transactions recorded.</td></tr>`}
      </tbody>
    </table>

    <!-- 6. Bottom Summary & Declaration -->
    <table style="width: 100%; border-collapse: collapse; border-top: 1.5px solid #000000;">
      <tr>
        <td style="width: 58%; padding: 8px 12px; vertical-align: top; border-right: 1px solid #000000; font-size: 9px; line-height: 1.45;">
          <div style="font-weight: 800; text-transform: uppercase; font-size: 9px; color: #0f172a; margin-bottom: 3px;">Declaration &amp; Notes:</div>
          <div style="color: #475569; font-size: 8.5px; line-height: 1.45;">
            &bull; This is an authentic computer-generated Vendor / Supplier Ledger Statement.<br/>
            &bull; Product buying prices, item codes, and order creation dates are tracked per supplier purchase invoices.<br/>
            &bull; All payments and voucher disbursements are subject to bank realization.<br/>
            &bull; For any ledger reconciliation queries, please contact our accounts department within 7 working days.
          </div>
        </td>
        <td style="width: 42%; padding: 6px 10px; vertical-align: top; font-size: 10px;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
            <tr style="border-bottom: 1px solid #000000;">
              <td style="padding: 3px 0; font-weight: 700;">Total Invoiced / Purchased:</td>
              <td style="padding: 3px 0; text-align: right; font-weight: 700; font-family: monospace; color: #b91c1c;">₹${fmtNum(totalCredit)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #000000;">
              <td style="padding: 3px 0; font-weight: 700;">Total Paid Out (Debit):</td>
              <td style="padding: 3px 0; text-align: right; font-weight: 700; font-family: monospace; color: #15803d;">₹${fmtNum(totalDebit)}</td>
            </tr>
            <tr style="border-bottom: 1.5px solid #000000; background: #f8fafc;">
              <td style="padding: 4px 0; font-weight: 800; font-size: 10px;">Net Outstanding Payable:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 800; font-size: 11px; font-family: monospace; color: ${currentOutstanding > 0 ? '#b91c1c' : '#15803d'};">
                ₹${fmtNum(currentOutstanding)}
              </td>
            </tr>
          </table>

          <div style="text-align: right; margin-top: 14px;">
            <div style="font-size: 9.5px; font-weight: 700;">For ${wholesalerName}</div>
            <div style="height: 38px;"></div>
            <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; border-top: 1px dashed #000000; display: inline-block; padding-top: 2px;">
              Authorised Signatory
            </div>
          </div>
        </td>
      </tr>
    </table>

    <div style="font-size: 8px; color: #64748b; padding: 4px 8px; border-top: 1px solid #000000; display: flex; justify-content: space-between;">
      <div>System-generated supplier statement. Optical Wholesale ERP Ledger.</div>
      <div>Generated on: ${fmtD(new Date())} | ${wholesalerName}</div>
    </div>
  </div>
</body>
</html>`;
  };

  // Generate Vendor Payout Voucher HTML (matches original backend paymentReceiptTemplate.js design)
  const generateVendorPayoutVoucherHTML = (txn) => {
    const wholesaler = summary.wholesaler || {};
    const wholesalerName = wholesaler.companyName || 'SAANCHI & CO.';
    const companyAddress = wholesaler.address || '3RD FLOOR, PEOPLES TV BUILDING, RAJA RAMMOHAN ROY ROAD,\nHAKIMPARA, SILIGURI';
    const companyPhone = wholesaler.phone || '0353-4075631';
    const rawCompanyGstin = wholesaler.gstin || master.gstin || '';
    const companyGstin = (rawCompanyGstin && !String(rawCompanyGstin).startsWith('http') && !String(rawCompanyGstin).includes('/'))
      ? String(rawCompanyGstin).trim()
      : '19AFWFS3883G1Z2';
    const companyLogo = wholesaler.logo || '';

    const partyName = vendor.firm || vendor.name || 'Vendor Partner';
    const partyContact = vendor.mobile || vendor.phone || '-';
    const rawPartyGstin = vendor.gstNumber || vendor.gstin || '';
    const partyGstin = (rawPartyGstin && !String(rawPartyGstin).startsWith('http') && !String(rawPartyGstin).includes('/'))
      ? String(rawPartyGstin).trim()
      : 'URP';
    const partyAddress = formatAddress(vendor.address) || '-';

    let receiptNo = txn.referenceNumber || txn.voucherId || txn._id || 'VPAY';
    if (!receiptNo || receiptNo === '0') {
      receiptNo = `VPAY-${String(Date.now()).slice(-6)}`;
    }

    const receiptDate = fmtD(txn.transactionDate || txn.createdAt || new Date());
    const detectedMode = txn.paymentMode || (txn.narration?.toLowerCase().includes('upi') ? 'UPI' : txn.narration?.toLowerCase().includes('cash') ? 'CASH' : 'BANK_TRANSFER');
    const modeName = formatModeLabel(detectedMode);
    const refNumber = txn.referenceNumber || txn.voucherId || '-';
    const totalPaidAmount = Number(txn.debit || txn.amount || txn.credit || 0);
    const amountInWords = numberToWordsINR(totalPaidAmount);

    let statementPeriod = filters.startDate
      ? `From ${fmtD(filters.startDate)} To ${filters.endDate ? fmtD(filters.endDate) : 'Today'}`
      : `Payout Date: ${receiptDate}`;

    // Link to purchase order if available
    const matchedOrder = ordersMap[String(txn.orderId)] || ordersMap[txn.orderNumber] || ordersMap[txn.referenceNumber] || null;
    const orderItems = (txn.items && txn.items.length > 0) ? txn.items : (matchedOrder?.items || []);
    const txnIsPurchase = Boolean(txn.voucherType === 'Purchase Invoice' || (txn.referenceNumber && String(txn.referenceNumber).startsWith('PO-')) || txn.orderGrandTotal != null);
    const hasOrder = Boolean(matchedOrder || (txnIsPurchase && orderItems.length > 0) || txn.orderNumber);

    let tableHeaderHtml = '';
    let tableRowsHtml = '';

    if (orderItems.length > 0) {
      tableHeaderHtml = `
        <tr style="background:#ffffff; border-bottom:1px solid #000000; font-size:9.5px; font-weight:700;">
          <th style="width:28px; border-right:1px solid #000; padding:4px 2px; text-align:center;">#</th>
          <th style="border-right:1px solid #000; padding:4px 6px; text-align:left;">Product / Item Name</th>
          <th style="width:95px; border-right:1px solid #000; padding:4px 4px; text-align:left;">Brand</th>
          <th style="width:85px; border-right:1px solid #000; padding:4px 4px; text-align:center;">Category / Type</th>
          <th style="width:95px; border-right:1px solid #000; padding:4px 4px; text-align:center;">Item Code / Ref</th>
          <th style="width:40px; border-right:1px solid #000; padding:4px 4px; text-align:center;">Qty</th>
          <th style="width:85px; border-right:1px solid #000; padding:4px 6px; text-align:right;">Buying Price (₹)</th>
          <th style="width:90px; padding:4px 6px; text-align:right;">Total (₹)</th>
        </tr>
      `;

      tableRowsHtml = orderItems.map((item, idx) => {
        const itemName = item.itemName || item.productName || item.name || 'Product';
        const brand = item.brand || item.brandName || '—';
        const category = item.category || item.categoryName || item.orderType || 'STOCK';
        const code = item.code || item.productCode || item.hsnSac || refNumber || '—';
        const buyingPrice = Number(item.buyingPrice || item.price || 0);
        const qty = Number(item.qty || 1);
        const discount = Number(item.discountAmount || 0);
        const lineTotal = buyingPrice * qty - discount;
        return `
          <tr style="border-bottom:1px solid #000000;">
            <td style="border-right:1px solid #000; padding:3px 2px; text-align:center; font-size:10px;">${idx + 1}</td>
            <td style="border-right:1px solid #000; padding:3px 6px; font-size:10px; font-weight:600; color:#0f172a;">${itemName}</td>
            <td style="border-right:1px solid #000; padding:3px 4px; font-size:10px; color:#334155;">${brand}</td>
            <td style="border-right:1px solid #000; padding:3px 4px; text-align:center; font-size:9.5px; font-weight:600; color:#475569;">${category}</td>
            <td style="border-right:1px solid #000; padding:3px 4px; text-align:center; font-size:10px; font-family:monospace; color:#0284c7;">${code}</td>
            <td style="border-right:1px solid #000; padding:3px 4px; text-align:center; font-size:10px; font-weight:700;">${qty}</td>
            <td style="border-right:1px solid #000; padding:3px 6px; text-align:right; font-size:10px; font-family:monospace; font-weight:700; color:#475569;">₹${fmtNum(buyingPrice)}</td>
            <td style="padding:3px 6px; text-align:right; font-size:10px; font-weight:700; font-family:monospace; color:#0f172a;">₹${fmtNum(lineTotal)}</td>
          </tr>
        `;
      }).join('');
    } else {
      tableHeaderHtml = `
        <tr style="background:#ffffff; border-bottom:1px solid #000000; font-size:9.5px; font-weight:700;">
          <th style="width:28px; border-right:1px solid #000; padding:4px 2px; text-align:center;">#</th>
          <th style="border-right:1px solid #000; padding:4px 6px; text-align:left;">Transaction Description / Particulars</th>
          <th style="width:130px; border-right:1px solid #000; padding:4px 4px; text-align:center;">Payment Mode</th>
          <th style="width:140px; border-right:1px solid #000; padding:4px 6px; text-align:left;">Reference # / UTR</th>
          <th style="width:120px; border-right:1px solid #000; padding:4px 6px; text-align:right;">Amount Paid (₹)</th>
          <th style="width:75px; padding:4px 4px; text-align:center;">Status</th>
        </tr>
      `;

      tableRowsHtml = `
        <tr style="border-bottom:1px solid #000000;">
          <td style="border-right:1px solid #000; padding:3px 2px; text-align:center; font-size:10px;">1</td>
          <td style="border-right:1px solid #000; padding:3px 6px; font-size:10px; font-weight:600;">Vendor Payout Disbursement / Supplier Account Clearance</td>
          <td style="border-right:1px solid #000; padding:3px 4px; text-align:center; font-size:9.5px;">${modeName}</td>
          <td style="border-right:1px solid #000; padding:3px 6px; font-size:10px; font-family:monospace; font-weight:600; color:#0284c7;">${refNumber}</td>
          <td style="border-right:1px solid #000; padding:3px 6px; text-align:right; font-size:10px; font-weight:700; font-family:monospace;">₹${fmtNum(totalPaidAmount)}</td>
          <td style="padding:3px 4px; text-align:center; font-size:9px; font-weight:700; color:#15803d;">CLEARED</td>
        </tr>
      `;
    }

    const orderTotalAmount = Number(matchedOrder?.grandTotal || matchedOrder?.totalOrderPrice || txn.orderGrandTotal || 0);
    const orderDueBalance = Number(matchedOrder?.balanceDue || txn.orderBalanceDue || 0);
    const orderCreatedDate = fmtD(matchedOrder?.orderDate || matchedOrder?.createdAt || txn.transactionDate);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Vendor Payout Voucher - ${receiptNo}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 6mm 8mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, "Segoe UI", Roboto, sans-serif;
      color: #000000;
      background: #ffffff;
      font-size: 10.5px;
      line-height: 1.25;
    }
    .invoice-wrapper {
      width: 100%;
      border: 1.5px solid #000000;
      background: #ffffff;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <!-- Header -->
    <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:8px 12px; border-bottom:1.5px solid #000000;">
      <div style="width:130px; min-height:50px; display:flex; align-items:center;">
        ${companyLogo ? `<img src="${companyLogo}" alt="Logo" style="max-height:55px; max-width:130px; object-fit:contain;" />` : ''}
      </div>
      <div style="flex:1; text-align:center; padding:0 10px;">
        <div style="font-size:13.5px; font-weight:700; margin-bottom:2px; text-transform:uppercase;">Vendor Payout Voucher</div>
        <div style="font-size:19px; font-weight:800; color:#0284c7; letter-spacing:0.5px; margin-bottom:2px;">${wholesalerName.toUpperCase()}</div>
        <div style="font-size:9.5px; font-weight:600; line-height:1.25; color:#1e293b; white-space:pre-line;">${companyAddress.toUpperCase()}</div>
        <div style="font-size:10px; font-weight:600; color:#1e293b; margin-top:1px;">Contact No. ${companyPhone}</div>
        <div style="font-size:10.5px; font-weight:700; margin-top:2px;">GST No : ${companyGstin}</div>
      </div>
      <div style="width:110px; text-align:right;">
        <div style="font-size:11px; font-weight:700;">Original Copy</div>
        <div style="font-size:8.5px; color:#64748b; margin-top:2px;">Supplier Voucher</div>
      </div>
    </div>

    <!-- Vendor Details & Voucher Meta 2 Columns -->
    <div style="display:flex; border-bottom:1.5px solid #000000;">
      <!-- Left Column: Vendor Details -->
      <div style="flex:1.2; padding:6px 10px; border-right:1px solid #000000; font-size:10.5px; line-height:1.35;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="width:110px; font-weight:700; vertical-align:top;">Vendor / Supplier :</td>
            <td style="font-weight:800; font-size:11.5px; color:#000;">${partyName.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="font-weight:700; vertical-align:top;">Contact Mobile :</td>
            <td style="font-family:monospace; font-weight:600;">${partyContact}</td>
          </tr>
          ${partyGstin && partyGstin !== 'URP' ? `
          <tr>
            <td style="font-weight:700; vertical-align:top;">GST No :</td>
            <td style="font-weight:600; font-family:monospace;">${partyGstin}</td>
          </tr>` : ''}
          <tr>
            <td style="font-weight:700; vertical-align:top;">Address :</td>
            <td style="color:#1e293b;">${partyAddress}</td>
          </tr>
        </table>
      </div>

      <!-- Right Column: Voucher Meta -->
      <div style="flex:0.8; padding:6px 10px; font-size:10.5px; line-height:1.35;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="width:100px; font-weight:700;">Voucher No :</td>
            <td style="font-weight:800; font-family:monospace; font-size:11.5px; color:#0284c7;">${receiptNo}</td>
          </tr>
          <tr>
            <td style="font-weight:700;">Payout Date :</td>
            <td style="font-weight:700; font-family:monospace;">${receiptDate}</td>
          </tr>
          <tr>
            <td style="font-weight:700;">Payment Mode :</td>
            <td style="font-weight:600;">${modeName}</td>
          </tr>
          <tr>
            <td style="font-weight:700;">Ref # / UTR :</td>
            <td style="font-family:monospace; font-weight:600;">${refNumber}</td>
          </tr>
          <tr>
            <td style="font-weight:700;">Period / Date :</td>
            <td style="font-size:9.5px; color:#475569;">${statementPeriod}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- If Linked Purchase Order, Summary Bar -->
    ${hasOrder ? `
    <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:6px 12px; border-bottom:1px solid #000000; font-size:10px;">
      <div>
        <span style="font-weight:700;">PO Reference:</span> <span style="font-family:monospace; font-weight:700; color:#0284c7;">${matchedOrder?.orderNumber || txn.orderNumber || refNumber}</span>
        &nbsp;|&nbsp; <span style="font-weight:700;">Order Created:</span> <span style="font-family:monospace; font-weight:700; color:#0f172a;">${orderCreatedDate}</span>
        &nbsp;|&nbsp; <span style="font-weight:700;">Status:</span> <span style="font-weight:700; color:#059669;">${matchedOrder?.orderStatus || 'Submitted'}</span>
      </div>
      <div>
        ${orderTotalAmount > 0 ? `<span style="font-weight:700;">PO Total:</span> <span style="font-family:monospace; font-weight:700;">₹${fmtNum(orderTotalAmount)}</span> &nbsp;|&nbsp; ` : ''}
        <span style="font-weight:700;">Remaining Balance Due:</span> <span style="font-family:monospace; font-weight:800; color:${orderDueBalance > 0 ? '#b91c1c' : '#15803d'};">₹${fmtNum(orderDueBalance)}</span>
      </div>
    </div>` : ''}

    <!-- Items / Particulars Table -->
    <table style="width:100%; border-collapse:collapse; border-bottom:1.5px solid #000000;">
      <thead>
        ${tableHeaderHtml}
      </thead>
      <tbody>
        ${tableRowsHtml}
        <!-- Integrated Total Row -->
        <tr style="font-weight:800; font-size:10.5px; border-top:1px solid #000;">
          <td colspan="${orderItems.length > 0 ? 6 : 4}" style="border-right:1px solid #000; padding:4px 6px; text-align:right;">Total Amount Disbursed / Paid</td>
          <td style="border-right:1px solid #000; padding:4px 6px; text-align:right; font-family:monospace; color:#15803d;">₹${fmtNum(totalPaidAmount)}</td>
          <td style="padding:4px 4px; text-align:center; font-size:9px; color:#15803d;">PAID OUT</td>
        </tr>
      </tbody>
    </table>

    <!-- Bottom Section: Words, Terms, Signatures -->
    <div style="display:flex; padding:8px 10px; font-size:9.5px;">
      <!-- Left Column -->
      <div style="flex:1.2; padding-right:15px; border-right:1px solid #000000;">
        <div style="margin-bottom:6px;">
          <span style="font-weight:700;">Total Amount ( In Words ) :</span><br>
          <span style="font-weight:800; font-size:10.5px;">${amountInWords}</span>
        </div>
        ${txn.narration ? `
        <div style="margin-bottom:6px;">
          <span style="font-weight:700;">Payment Remarks / Narration :</span>
          <div style="font-size:9.5px; color:#1e293b; margin-top:1px;">${txn.narration}</div>
        </div>` : ''}
        <div>
          <span style="font-weight:700; text-decoration:underline;">Declaration</span>
          <div style="font-size:8.5px; color:#1e293b; line-height:1.3; margin-top:2px;">
            This is an authenticated computer-generated vendor payout voucher confirming disbursement of funds against supplier purchase orders / ledger account.
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div style="flex:0.8; padding-left:15px; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
            <span style="font-weight:700;">Amount Cleared :</span>
            <span style="font-weight:800; font-family:monospace; color:#15803d;">₹${fmtNum(totalPaidAmount)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
            <span style="font-weight:700;">Balance Payable to Vendor :</span>
            <span style="font-weight:800; font-family:monospace; color:${currentOutstanding > 0 ? '#b91c1c' : '#15803d'};">₹${fmtNum(currentOutstanding)}</span>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:25px;">
          <div style="text-align:center;">
            <div style="font-size:9px; font-weight:700; border-top:1px dashed #000; padding-top:2px;">Vendor / Payee Acknowledgment</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:10.5px; font-weight:800; color:#0284c7;">${wholesalerName.toUpperCase()}</div>
            <div style="font-size:9px; font-weight:700; margin-top:22px; border-top:1px dashed #000; padding-top:2px;">Authorised Signatory</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  // Generate Purchase Order / Vendor Invoice HTML
  const generatePurchaseOrderHTML = (txnOrOrder) => {
    const wholesaler = summary.wholesaler || {};
    const wholesalerName = wholesaler.companyName || 'SAANCHI & CO.';
    const companyAddress = wholesaler.address || '3RD FLOOR, PEOPLES TV BUILDING, RAJA RAMMOHAN ROY ROAD,\nHAKIMPARA, SILIGURI';
    const companyPhone = wholesaler.phone || '0353-4075631';
    const rawCompanyGstin = wholesaler.gstin || master.gstin || '';
    const companyGstin = (rawCompanyGstin && !String(rawCompanyGstin).startsWith('http') && !String(rawCompanyGstin).includes('/'))
      ? String(rawCompanyGstin).trim()
      : '19AFWFS3883G1Z2';
    const companyLogo = wholesaler.logo || '';

    const partyName = vendor.firm || vendor.name || 'Vendor';
    const partyContact = vendor.mobile || vendor.phone || '-';
    const rawPartyGstin = vendor.gstNumber || vendor.gstin || '';
    const partyGstin = (rawPartyGstin && !String(rawPartyGstin).startsWith('http') && !String(rawPartyGstin).includes('/'))
      ? String(rawPartyGstin).trim()
      : 'URP';
    const partyAddress = formatAddress(vendor.address) || '-';

    const matchedOrder = ordersMap[String(txnOrOrder.orderId)] || ordersMap[txnOrOrder.orderNumber] || ordersMap[txnOrOrder.referenceNumber] || txnOrOrder;
    const poNumber = matchedOrder.orderNumber || txnOrOrder.referenceNumber || txnOrOrder.voucherId || 'PO';
    const orderCreatedDate = fmtD(matchedOrder.orderDate || matchedOrder.createdAt || txnOrOrder.transactionDate);
    const orderItems = (matchedOrder.items && matchedOrder.items.length > 0) ? matchedOrder.items : (txnOrOrder.items || []);

    const grandTotal = Number(matchedOrder.grandTotal || matchedOrder.totalOrderPrice || txnOrOrder.orderGrandTotal || txnOrOrder.credit || 0);
    const paidAmount = Number(matchedOrder.paidAmount || txnOrOrder.orderPaidAmount || 0);
    const balanceDue = Number(matchedOrder.balanceDue != null ? matchedOrder.balanceDue : (grandTotal - paidAmount));
    const paymentsList = (Array.isArray(matchedOrder.orderPayments) && matchedOrder.orderPayments.length > 0) ? matchedOrder.orderPayments : (txnOrOrder.orderPayments || []);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Purchase Order - ${poNumber}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #000; background: #fff; margin: 0; padding: 0; }
    table { width: 100%; border-collapse: collapse; }
  </style>
</head>
<body>
  <div style="border: 1.5px solid #000; width: 100%; max-width: 800px; margin: 0 auto; background: #fff;">
    <!-- Header -->
    <table style="border-bottom: 1.5px solid #000;">
      <tr>
        <td style="width: 125px; padding: 6px; text-align: center; border-right: 1px solid #000;">
          ${companyLogo ? `<img src="${companyLogo}" alt="Logo" style="max-width: 110px; max-height: 52px; object-fit: contain;" />` : `<div style="font-weight: 900; font-size: 13px;">${wholesalerName}</div>`}
        </td>
        <td style="padding: 6px 12px;">
          <div style="font-weight: 900; font-size: 15px; text-transform: uppercase;">${wholesalerName}</div>
          <div style="font-size: 9.5px; color: #1e293b; white-space: pre-line;">${companyAddress}</div>
          <div style="font-size: 9.5px; margin-top: 2px;">Phone: <strong>${companyPhone}</strong> | GSTIN: <strong style="font-family:monospace;">${companyGstin}</strong></div>
        </td>
        <td style="width: 210px; padding: 6px 10px; border-left: 1px solid #000; font-size: 9px; line-height: 1.4;">
          <table style="width: 100%;">
            <tr><td style="font-weight: 700;">PO Ref No:</td><td style="font-weight: 800; font-family: monospace; color: #0284c7;">${poNumber}</td></tr>
            <tr><td style="font-weight: 700;">PO Created:</td><td style="font-weight: 700; font-family: monospace;">${orderCreatedDate}</td></tr>
            <tr><td style="font-weight: 700;">PO Status:</td><td style="font-weight: 700; color: #059669;">${matchedOrder.orderStatus || 'Submitted'}</td></tr>
          </table>
        </td>
      </tr>
    </table>

    <div style="text-align: center; font-weight: 800; font-size: 11px; padding: 4px 0; background: #f8fafc; border-bottom: 1.5px solid #000; text-transform: uppercase;">
      PURCHASE ORDER &bull; SUPPLIER INVOICE
    </div>

    <!-- Vendor Details -->
    <div style="padding: 6px 12px; border-bottom: 1.5px solid #000; font-size: 9.5px;">
      <table style="width: 100%;">
        <tr>
          <td style="width: 50%; vertical-align: top; padding-right: 10px;">
            <div style="font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase;">Vendor / Supplier:</div>
            <div style="font-weight: 800; font-size: 12px; margin-top: 1px;">${partyName.toUpperCase()}</div>
            <div style="margin-top: 2px;">Mobile: <strong style="font-family:monospace;">${partyContact}</strong> | GSTIN: <strong style="font-family:monospace;">${partyGstin}</strong></div>
          </td>
          <td style="width: 50%; vertical-align: top; padding-left: 10px; border-left: 1px solid #000;">
            <div style="font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase;">Delivery &amp; Billing Address:</div>
            <div style="margin-top: 2px; color: #1e293b;">${partyAddress}</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Items Table -->
    <table style="width: 100%; border-bottom: 1.5px solid #000; font-size: 9.5px;">
      <thead>
        <tr style="background: #ffffff; border-bottom: 1px solid #000; font-weight: 700;">
          <th style="width: 28px; border-right: 1px solid #000; padding: 4px 2px; text-align: center;">#</th>
          <th style="border-right: 1px solid #000; padding: 4px 6px; text-align: left;">Product / Item Name</th>
          <th style="width: 95px; border-right: 1px solid #000; padding: 4px 4px; text-align: left;">Brand</th>
          <th style="width: 85px; border-right: 1px solid #000; padding: 4px 4px; text-align: center;">Category / Type</th>
          <th style="width: 95px; border-right: 1px solid #000; padding: 4px 4px; text-align: center;">Item Code / Ref</th>
          <th style="width: 40px; border-right: 1px solid #000; padding: 4px 4px; text-align: center;">Qty</th>
          <th style="width: 90px; border-right: 1px solid #000; padding: 4px 6px; text-align: right;">Buying Price (₹)</th>
          <th style="width: 95px; padding: 4px 6px; text-align: right;">Total (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${orderItems.map((item, idx) => {
          const itemName = item.itemName || item.productName || item.name || 'Product';
          const brand = item.brand || item.brandName || '—';
          const category = item.category || item.categoryName || item.orderType || 'STOCK';
          const code = item.code || item.productCode || item.hsnSac || poNumber || '—';
          const buyingPrice = Number(item.buyingPrice || item.price || 0);
          const qty = Number(item.qty || 1);
          const discount = Number(item.discountAmount || 0);
          const lineTotal = buyingPrice * qty - discount;
          return `
            <tr style="border-bottom: 1px solid #000;">
              <td style="border-right: 1px solid #000; padding: 4px 2px; text-align: center; font-size: 10px;">${idx + 1}</td>
              <td style="border-right: 1px solid #000; padding: 4px 6px; font-size: 10px; font-weight: 600;">${itemName}</td>
              <td style="border-right: 1px solid #000; padding: 4px 4px; font-size: 10px;">${brand}</td>
              <td style="border-right: 1px solid #000; padding: 4px 4px; text-align: center; font-size: 9.5px; font-weight: 600;">${category}</td>
              <td style="border-right: 1px solid #000; padding: 4px 4px; text-align: center; font-family: monospace; color: #0284c7;">${code}</td>
              <td style="border-right: 1px solid #000; padding: 4px 4px; text-align: center; font-weight: 700;">${qty}</td>
              <td style="border-right: 1px solid #000; padding: 4px 6px; text-align: right; font-family: monospace; font-weight: 700;">₹${fmtNum(buyingPrice)}</td>
              <td style="padding: 4px 6px; text-align: right; font-family: monospace; font-weight: 700;">₹${fmtNum(lineTotal)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <!-- Totals & Payment Summary -->
    <table style="width: 100%; border-top: 1.5px solid #000;">
      <tr>
        <td style="width: 58%; padding: 8px 12px; vertical-align: top; border-right: 1px solid #000; font-size: 9px;">
          <div style="font-weight: 800; text-transform: uppercase; margin-bottom: 4px;">Amount In Words:</div>
          <div style="font-weight: 700; font-size: 10px; color: #0f172a; margin-bottom: 8px;">${numberToWordsINR(grandTotal)}</div>
          <div style="font-weight: 700; color: #475569;">
            &bull; Payment breakdown has ${paymentsList.length} recorded installment${paymentsList.length > 1 ? 's' : ''}.<br/>
            &bull; Subject to acceptance of optical inspection and realization of payments.
          </div>
        </td>
        <td style="width: 42%; padding: 6px 10px; font-size: 10px;">
          <table style="width: 100%;">
            <tr style="border-bottom: 1px solid #000;"><td style="padding: 3px 0; font-weight: 700;">PO Grand Total:</td><td style="text-align: right; font-weight: 700; font-family: monospace;">₹${fmtNum(grandTotal)}</td></tr>
            <tr style="border-bottom: 1px solid #000;"><td style="padding: 3px 0; font-weight: 700;">Total Paid Out:</td><td style="text-align: right; font-weight: 700; font-family: monospace; color: #15803d;">₹${fmtNum(paidAmount)}</td></tr>
            <tr style="border-bottom: 1.5px solid #000; background: #f8fafc;"><td style="padding: 4px 0; font-weight: 800;">Balance Due to Vendor:</td><td style="text-align: right; font-weight: 800; font-family: monospace; color: ${balanceDue > 0 ? '#b91c1c' : '#15803d'};">₹${fmtNum(balanceDue)}</td></tr>
          </table>
          <div style="text-align: right; margin-top: 16px;">
            <div style="font-size: 9.5px; font-weight: 700;">For ${wholesalerName}</div>
            <div style="height: 34px;"></div>
            <div style="font-size: 9px; font-weight: 800; border-top: 1px dashed #000; display: inline-block; padding-top: 2px;">Authorised Signatory</div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
  };

  const handlePrintStatement = () => {
    try {
      const html = generateVendorStatementHTML();
      const safeName = (vendor.firm || vendor.name || 'vendor').replace(/[^a-z0-9]/gi, '-').toLowerCase();
      printHTMLDocument(html, `VendorStatement-${safeName}`);
      toast.success('Vendor statement opened for printing / PDF saving');
    } catch (err) {
      toast.error('Failed to generate vendor statement: ' + err.message);
    }
  };

  const handlePrintReceipt = (txn) => {
    try {
      const html = generateVendorPayoutVoucherHTML(txn);
      const refKey = txn.referenceNumber || txn.voucherId || txn._id || 'payout';
      printHTMLDocument(html, `VendorPayoutVoucher-${refKey}`);
      toast.success('Vendor payout voucher opened for printing / PDF saving');
    } catch (err) {
      toast.error('Failed to generate payout voucher: ' + err.message);
    }
  };

  const handlePrintPurchaseOrder = (txnOrOrder) => {
    try {
      const html = generatePurchaseOrderHTML(txnOrOrder);
      const refKey = txnOrOrder.orderNumber || txnOrOrder.referenceNumber || txnOrOrder.voucherId || 'PO';
      printHTMLDocument(html, `PurchaseOrder-${refKey}`);
      toast.success('Purchase order opened for printing / PDF saving');
    } catch (err) {
      toast.error('Failed to generate purchase order: ' + err.message);
    }
  };

  const handleDownloadReceipt = async (txn) => {
    // Instant client-side PDF opening
    handlePrintReceipt(txn);
  };

  const handleDownloadLedgerStatement = async () => {
    // Instant client-side PDF opening
    handlePrintStatement();
  };

  const handleFilterMonth = (monthKey) => {
    if (!monthKey) return;
    const [yr, mo] = monthKey.split('-').map(Number);
    const start = new Date(yr, mo - 1, 1).toISOString().split('T')[0];
    const end = new Date(yr, mo, 0).toISOString().split('T')[0];
    const newFilters = { startDate: start, endDate: end };
    setFilters(newFilters);
    fetchStatement(newFilters);
    toast.info(`Filtered transactions for ${monthKey}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={40} />
          <Typography sx={{ mt: 2, color: 'text.secondary' }}>Loading vendor statement…</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* ── Top Action Bar ────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/accounting/vendor-ledgers')}
            startIcon={<Icon icon="lucide:arrow-left" />}
            sx={{ borderRadius: '8px', textTransform: 'none', color: '#0284C7', borderColor: '#BAE6FD' }}
          >
            Back to Vendors
          </Button>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>Vendor Account Statement</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Supplier purchases, payouts &amp; live ledger
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={() => setShowMonthlySummary(prev => !prev)}
            startIcon={<Icon icon={showMonthlySummary ? 'lucide:chevron-up' : 'lucide:calendar'} />}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, borderColor: '#94A3B8', color: '#475569' }}
          >
            Monthly Summary
          </Button>
          <Button
            variant="outlined"
            onClick={handleDownloadLedgerStatement}
            disabled={downloadingStatement}
            startIcon={downloadingStatement ? <CircularProgress size={16} color="inherit" /> : <Icon icon="lucide:download" />}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, borderColor: '#6366F1', color: '#6366F1', '&:hover': { backgroundColor: '#EEF2FF' } }}
          >
            {downloadingStatement ? 'Downloading…' : 'Download Statement'}
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setSelectedPurchaseForPayout(null);
              setPayoutModalOpen(true);
            }}
            startIcon={<Icon icon="lucide:arrow-up-right" />}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, backgroundColor: '#E11D48', '&:hover': { backgroundColor: '#BE123C' } }}
          >
            Record Payout
          </Button>
        </Box>
      </Box>

      {/* ── Vendor Header Card ─────────────────────────────────────────── */}
      <Card sx={{ p: 3, mb: 3, borderRadius: '16px', border: '1px solid #E2E8F0' }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={7}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Box sx={{ width: 42, height: 42, borderRadius: '10px', backgroundColor: '#E11D48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon icon="solar:shop-bold" style={{ color: '#fff', fontSize: 22 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  {vendor.firm || vendor.name || 'Supplier'}
                </Typography>
                {vendor.firm && vendor.name && (
                  <Typography variant="caption" sx={{ color: '#64748B' }}>Contact: {vendor.name}</Typography>
                )}
              </Box>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Mobile: <strong>{vendor.mobile || '—'}</strong>
              {vendor.email && <> | Email: <strong>{vendor.email}</strong></>}
            </Typography>
            {(vendor.gstin || vendor.gstNumber) && (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                GSTIN: <strong style={{ fontFamily: 'monospace' }}>{vendor.gstin || vendor.gstNumber}</strong>
              </Typography>
            )}
            {formatAddress(vendor.address) && (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                Address: {formatAddress(vendor.address)}
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
              <Chip size="small" label={`Ledger: ${master.ledgerCode || 'VEND-LED'}`} sx={{ fontWeight: 600, fontSize: '0.72rem' }} />
              {master.paymentTerms && <Chip size="small" label={`Terms: ${master.paymentTerms} Days`} variant="outlined" sx={{ fontWeight: 600, fontSize: '0.72rem' }} />}
              <Chip size="small" label={`${unifiedTransactions.length} Transactions`} sx={{ fontWeight: 600, fontSize: '0.72rem', backgroundColor: '#F1F5F9', color: '#475569' }} />
            </Box>
          </Grid>

          <Grid item xs={12} md={5} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 700 }}>
              Net Balance Payable to Vendor
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: currentOutstanding > 0 ? '#E11D48' : '#059669', mt: 0.5 }}>
              {currentOutstanding > 0
                ? `₹${currentOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Payable)`
                : '₹0.00 (Settled)'}
            </Typography>
            <Chip
              size="small"
              label={currentOutstanding > 0 ? 'Payment Due to Vendor' : 'Account Settled'}
              color={currentOutstanding > 0 ? 'error' : 'success'}
              sx={{ mt: 1, fontWeight: 700 }}
            />
          </Grid>
        </Grid>
      </Card>

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Outstanding Payable', value: currentOutstanding, color: '#1d8705e6', bg: '#ECFDF5', border: '#A7F3D0', icon: 'solar:bill-list-bold' },
          { label: 'Total Paid Out (Debit)', value: totalDebit, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: 'solar:money-bag-bold' },
          { label: 'Total Purchased (Credit)', value: totalCredit, color: '#B91C1C', bg: '#FFF1F2', border: '#FECDD3', icon: 'solar:cart-large-2-bold' },
          { label: 'Opening Balance', value: openingBalance, color: '#475569', bg: '#F8FAFC', border: '#E2E8F0', icon: 'solar:history-bold' },
        ].map((kpi, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: `1px solid ${kpi.border}`, backgroundColor: kpi.bg }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Icon icon={kpi.icon} style={{ color: kpi.color, fontSize: 18 }} />
                <Typography variant="caption" sx={{ color: kpi.color, fontWeight: 700 }}>{kpi.label}</Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: kpi.color }}>
                ₹{kpi.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ── Monthly Summary Collapse ───────────────────────────────────── */}
      <Collapse in={showMonthlySummary} timeout="auto" unmountOnExit>
        <Card sx={{ mb: 3, borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <Box sx={{ px: 2.5, py: 1.5, backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon icon="solar:calendar-bold" style={{ color: '#6366F1', fontSize: 18 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>
              Monthly Breakdown ({monthlyBreakdown.length} months)
            </Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#F1F5F9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Month</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#B91C1C' }}>Purchased (₹)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#059669' }}>Paid Out (₹)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Net Movement (₹)</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Transactions</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Filter</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {monthlyBreakdown.map((m) => (
                  <TableRow key={m.month} hover>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{m.monthLabel}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#B91C1C', fontSize: '0.8rem' }}>
                      ₹{Number(m.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#059669', fontSize: '0.8rem' }}>
                      ₹{Number(m.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.8rem', color: m.netMovement > 0 ? '#B91C1C' : '#059669' }}>
                      ₹{Number(m.netMovement || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align="center">
                      <Chip size="small" label={m.transactionsCount} sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                    </TableCell>
                    <TableCell align="center">
                      <Button size="small" onClick={() => handleFilterMonth(m.month)}
                        sx={{ textTransform: 'none', fontSize: '0.7rem', py: 0.25, px: 1, borderRadius: '6px', color: '#6366F1', '&:hover': { backgroundColor: '#EEF2FF' } }}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {monthlyBreakdown.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>No monthly data available</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Collapse>

      {/* ── Date Filter ───────────────────────────────────────────────── */}
      <Card sx={{ p: 2, mb: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              type="date" size="small" label="From Date"
              InputLabelProps={{ shrink: true }}
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              type="date" size="small" label="To Date"
              InputLabelProps={{ shrink: true }}
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={6} sm={2}>
            <Button variant="contained" onClick={() => fetchStatement(filters)}
              startIcon={<Icon icon="lucide:filter" />}
              fullWidth sx={{ borderRadius: '8px', textTransform: 'none', height: 40, backgroundColor: '#0284C7' }}>
              Apply
            </Button>
          </Grid>
          <Grid item xs={6} sm={2}>
            <Button variant="outlined" onClick={() => { const f = { startDate: '', endDate: '' }; setFilters(f); fetchStatement(f); }}
              startIcon={<Icon icon="lucide:x" />}
              fullWidth sx={{ borderRadius: '8px', textTransform: 'none', height: 40 }}>
              Clear
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* ── Statement Table ───────────────────────────────────────────── */}
      {statementError ? (
        <Alert severity="error" sx={{ borderRadius: '12px', mb: 3 }}>{statementError}</Alert>
      ) : unifiedTransactions.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
          <Icon icon="solar:file-corrupted-bold" style={{ fontSize: 48, color: '#CBD5E1', marginBottom: 12 }} />
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            No transactions found for this vendor in the selected date range.
          </Typography>
          {(filters.startDate || filters.endDate) && (
            <Button size="small" onClick={() => { const f = { startDate: '', endDate: '' }; setFilters(f); fetchStatement(f); }}
              sx={{ mt: 2, textTransform: 'none' }}>
              Clear Filter
            </Button>
          )}
        </Card>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ width: 44, p: 0.5 }} />
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#475569' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#475569' }}>Reference No.</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#475569' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#475569' }}>Vendor / Firm</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#475569' }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#059669' }}>Paid Out (₹)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#B91C1C' }}>Purchased (₹)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Balance</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', minWidth: 120 }}>Payment Progress</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {unifiedTransactions.map((txn, idx) => {
                  const rowKey = txn.orderNumber || (txn.voucherId ? String(txn.voucherId) : (txn.referenceNumber || String(txn._id)));
                  const isPurchase = Boolean(
                    txn.voucherType === 'Purchase Invoice' ||
                    (txn.referenceNumber && String(txn.referenceNumber).startsWith('PO-')) ||
                    (txn.orderGrandTotal != null && Number(txn.orderGrandTotal) > 0)
                  );
                  const isPayout = Boolean(
                    (txn.referenceNumber && txn.referenceNumber.startsWith('VPAY')) ||
                    txn.voucherType === 'Payment Voucher' ||
                    (!isPurchase && Number(txn.debit) > 0)
                  );

                  const orderTotal = Number(txn.orderGrandTotal != null ? txn.orderGrandTotal : txn.credit || 0);
                  const paidAmount = Number(txn.orderPaidAmount != null ? txn.orderPaidAmount : 0);
                  const dueAmount = txn.orderBalanceDue != null
                    ? Number(txn.orderBalanceDue)
                    : Math.max(0, orderTotal - paidAmount);
                  const purchaseBadge = getPurchaseStatusBadge(txn.orderStatus);
                  const matchedOrder = ordersMap[String(txn.orderId)] || ordersMap[txn.orderNumber] || ordersMap[txn.referenceNumber] || null;
                  const paymentsList = (Array.isArray(txn.orderPayments) && txn.orderPayments.length > 0) ? txn.orderPayments : (matchedOrder?.orderPayments || []);
                  const hasParts = paymentsList.length > 0;
                  const isExpanded = expandedRowId === rowKey;
                  const orderItems = txn.items?.length > 0 ? txn.items : (matchedOrder?.items || []);
                  const pct = orderTotal > 0 ? Math.min(100, Math.round((paidAmount / orderTotal) * 100)) : 0;
                  const isFullyPaid = dueAmount <= 0 && isPurchase && orderTotal > 0;
                  const isPartPaid = paidAmount > 0 && dueAmount > 0;
                  const hasExpandableContent = hasParts || (isPurchase && orderItems.length > 0) || isPurchase;

                  let entryType = txn.voucherType || 'Entry';
                  let typeBadge = { bg: '#F3F4F6', text: '#6B7280' };
                  if (isPurchase) {
                    entryType = 'Purchase Invoice';
                    typeBadge = { bg: '#ECFDF5', text: '#065F46' };
                  } else if (isPayout) {
                    entryType = 'Vendor Payout';
                    typeBadge = { bg: '#ECFDF5', text: '#065F46' };
                  }

                  return (
                    <React.Fragment key={rowKey}>
                      <TableRow hover sx={{ backgroundColor:  'inherit' }}>
                        {/* Expand Arrow */}
                        <TableCell sx={{ width: 44, p: 0.5, textAlign: 'center' }}>
                          {hasExpandableContent ? (
                            <IconButton size="small" onClick={() => toggleExpandRow(rowKey)}
                              sx={{ color: isExpanded ? '#E11D48' : '#64748B', p: 0.5 }}>
                              <Icon icon={isExpanded ? 'solar:alt-arrow-down-bold' : 'solar:alt-arrow-right-bold'} width={16} />
                            </IconButton>
                          ) : null}
                        </TableCell>

                        {/* Date */}
                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#475569' }}>
                          {txn.orderDate || txn.transactionDate
                            ? new Date(txn.orderDate || txn.transactionDate).toLocaleDateString('en-IN')
                            : '—'}
                        </TableCell>

                        {/* Ref */}
                        <TableCell sx={{ minWidth: 160, fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem', color: '#0F172A' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <span>{txn.referenceNumber || txn.voucherId || '—'}</span>
                            {hasParts && (
                              <Chip size="small" label={`${paymentsList.length} Pay${paymentsList.length > 1 ? 's' : ''}`}
                                onClick={() => toggleExpandRow(rowKey)}
                                sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600, backgroundColor: isExpanded ? '#FECDD3' : '#FEE2E2', color: '#991B1B', cursor: 'pointer' }} />
                            )}
                          </Box>
                        </TableCell>

                        {/* Type */}
                        <TableCell>
                          <Chip size="small" label={entryType}
                            sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600, backgroundColor: typeBadge.bg, color: typeBadge.text }} />
                        </TableCell>

                        {/* Vendor */}
                        <TableCell sx={{ minWidth: 170 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.78rem', color: '#0F172A' }}>
                            {txn.vendorName || vendor.firm || vendor.name || 'Vendor'}
                          </Typography>
                        </TableCell>

                        {/* Status */}
                        <TableCell sx={{ minWidth: 120 }}>
                          {txn.orderStatus ? (
                            <Chip size="small" label={txn.orderStatus}
                              sx={{ backgroundColor: purchaseBadge.bg, color: purchaseBadge.text, fontWeight: 600, fontSize: '0.68rem', height: 20 }} />
                          ) : isPayout ? (
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                              <Chip size="small" label="Paid Out"
                                sx={{ backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 600, fontSize: '0.68rem', height: 20 }} />
                            </Box>
                          ) : (
                            <Chip size="small" label="Completed"
                              sx={{ backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 600, fontSize: '0.68rem', height: 20 }} />
                          )}
                        </TableCell>

                        {/* Debit (Paid Out) */}
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#059669', fontSize: '0.8rem' }}>
                          {Number(txn.debit || 0) > 0
                            ? `₹${Number(txn.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : '—'}
                        </TableCell>

                        {/* Credit (Purchased) */}
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#B91C1C', fontSize: '0.8rem' }}>
                          {isPurchase && orderTotal > 0
                            ? `₹${orderTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : Number(txn.credit || 0) > 0
                              ? `₹${Number(txn.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                              : '—'}
                        </TableCell>

                        {/* Balance */}
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                          {isPurchase ? (
                            isFullyPaid ? (
                              <span style={{ color: '#059669', fontWeight: 700 }}>Paid</span>
                            ) : (
                              <span style={{ color: '#E11D48', fontWeight: 700 }}>
                                ₹{dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Payable)
                              </span>
                            )
                          ) : (
                            <span style={{ color: '#059669' }}>
                              {Number(txn.debit) > 0
                                ? `₹${Number(txn.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Paid)`
                                : '—'}
                            </span>
                          )}
                        </TableCell>

                        {/* Payment Progress */}
                        <TableCell sx={{ minWidth: 120 }}>
                          {isPurchase ? (
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: '100%' }}>
                                  <LinearProgress variant="determinate" value={pct}
                                    sx={{
                                      height: 5, borderRadius: 3, backgroundColor: '#E2E8F0',
                                      '& .MuiLinearProgress-bar': {
                                        backgroundColor: isFullyPaid ? '#10B981' : isPartPaid ? '#F59E0B' : '#94A3B8'
                                      }
                                    }} />
                                </Box>
                                <Typography variant="caption" sx={{ minWidth: 35, fontWeight: 600, color: '#475569', fontSize: '0.68rem' }}>
                                  {pct}%
                                </Typography>
                              </Box>
                              <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.65rem' }}>
                                {isFullyPaid ? 'Fully Paid' : isPartPaid ? 'Part Paid' : '0% Paid (Due)'}
                              </Typography>
                            </Box>
                          ) : (
                            <Chip size="small" label="100% Paid"
                              sx={{ backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 600, fontSize: '0.65rem', height: 20 }} />
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            {isPurchase && dueAmount > 0 && (
                              <Tooltip title="Part Pay / Allocate Payout for this Purchase" arrow>
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setSelectedPurchaseForPayout(
                                        matchedOrder || {
                                          _id: txn.orderId || txn._id,
                                          orderId: txn.orderId || txn._id,
                                          orderNumber: txn.orderNumber || txn.referenceNumber,
                                          balanceDue: dueAmount,
                                          grandTotal: orderTotal
                                        }
                                      );
                                      setPayoutModalOpen(true);
                                    }}
                                    sx={{ color: '#E11D48', p: 0.5, backgroundColor: '#FFF1F2', '&:hover': { backgroundColor: '#FFE4E6' } }}
                                  >
                                    <Icon icon="lucide:arrow-up-right" width={15} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                            {isPayout && (
                              <Tooltip title="Download Payout Receipt" arrow>
                                <span>
                                  <IconButton size="small" onClick={() => handleDownloadReceipt(txn)}
                                    disabled={downloadingReceiptId === (txn.voucherId || txn.referenceNumber || txn._id)}
                                    sx={{ color: '#059669', p: 0.5, backgroundColor: '#ECFDF5', '&:hover': { backgroundColor: '#D1FAE5' } }}>
                                    <Icon icon="lucide:receipt" width={15} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                            <Tooltip title="Download Ledger Statement" arrow>
                              <span>
                                <IconButton size="small" onClick={handleDownloadLedgerStatement}
                                  disabled={downloadingStatement}
                                  sx={{ color: '#6366F1', p: 0.5, backgroundColor: '#EEF2FF', '&:hover': { backgroundColor: '#E0E7FF' } }}>
                                  <Icon icon="lucide:book-open" width={15} />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>

                      {/* ── Expanded Details Row ────────────────────────── */}
                      {hasExpandableContent && (
                        <TableRow sx={{ backgroundColor: '#FFF8F8' }}>
                          <TableCell colSpan={11} sx={{ py: 0, px: 2, borderBottom: isExpanded ? '1px solid #FCE7F3' : 'none' }}>
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box sx={{ py: 2, px: 2, my: 1.5, backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #FECDD3', borderLeft: '4px solid #E11D48', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

                                {/* Parties Meta */}
                                <Box sx={{ mb: 2, p: 1.5, borderRadius: '6px', border: '1px solid #FECDD3', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                                  <Box>
                                    <Typography variant="caption" sx={{ color: '#E11D48', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', display: 'block' }}>
                                      Vendor / Supplier Details
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A', fontSize: '0.8rem' }}>
                                      {txn.vendorName || vendor.firm || vendor.name || 'Vendor'}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>
                                      Mobile: {vendor.mobile || 'N/A'} | GST: {vendor.gstin || vendor.gstNumber || 'Unregistered'}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', display: 'block' }}>
                                      Purchase Info
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A', fontSize: '0.8rem' }}>
                                      PO: {txn.orderNumber || txn.referenceNumber || '—'}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>
                                      Created by: {txn.createdByName || 'Staff'}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {isPurchase && dueAmount > 0 && (
                                      <Button
                                        size="small"
                                        variant="contained"
                                        startIcon={<Icon icon="lucide:arrow-up-right" width={15} />}
                                        onClick={() => {
                                          setSelectedPurchaseForPayout(
                                            matchedOrder || {
                                              _id: txn.orderId || txn._id,
                                              orderId: txn.orderId || txn._id,
                                              orderNumber: txn.orderNumber || txn.referenceNumber,
                                              balanceDue: dueAmount,
                                              grandTotal: orderTotal
                                            }
                                          );
                                          setPayoutModalOpen(true);
                                        }}
                                        sx={{
                                          textTransform: 'none',
                                          fontSize: '0.75rem',
                                          fontWeight: 700,
                                          backgroundColor: '#E11D48',
                                          '&:hover': { backgroundColor: '#BE123C' },
                                          height: 32,
                                          px: 1.75,
                                          borderRadius: '6px'
                                        }}
                                      >
                                        Part Pay (₹{dueAmount.toLocaleString()})
                                      </Button>
                                    )}
                                    {isPayout && (
                                      <Button size="small" variant="contained"
                                        startIcon={<Icon icon="lucide:receipt" width={15} />}
                                        onClick={() => handleDownloadReceipt(txn)}
                                        disabled={downloadingReceiptId === (txn.voucherId || txn.referenceNumber || txn._id)}
                                        sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#059669', '&:hover': { backgroundColor: '#047857' }, height: 32, px: 1.75, borderRadius: '6px' }}>
                                        Download Receipt
                                      </Button>
                                    )}
                                    <Button size="small" variant="outlined"
                                      startIcon={<Icon icon="lucide:book-open" width={15} />}
                                      onClick={handleDownloadLedgerStatement}
                                      disabled={downloadingStatement}
                                      sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600, color: '#6366F1', borderColor: '#818CF8', backgroundColor: '#EEF2FF', '&:hover': { backgroundColor: '#E0E7FF', borderColor: '#6366F1' }, height: 32, px: 1.75, borderRadius: '6px' }}>
                                      Download Statement
                                    </Button>
                                  </Box>
                                </Box>

                                {/* Order Items Table */}
                                {isPurchase && orderItems.length > 0 && (
                                  <Box sx={{ mb: hasParts ? 2 : 0 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '0.8rem', mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                      <Icon icon="lucide:package" style={{ color: '#E11D48', fontSize: 14 }} />
                                      Purchase Items ({orderItems.length})
                                      {(txn.taxableAmount != null || matchedOrder?.taxableAmount != null) && (
                                        <Chip size="small" label={vendor.gstin || vendor.gstNumber ? 'GST Purchase' : 'Non-GST'}
                                          sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600, backgroundColor: '#FEF2F2', color: '#991B1B', ml: 1 }} />
                                      )}
                                    </Typography>
                                    <Table size="small">
                                      <TableHead sx={{ backgroundColor: '#F1F5F9' }}>
                                        <TableRow>
                                          <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569', width: 40 }}>#</TableCell>
                                          <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Item / Product</TableCell>
                                          <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Brand</TableCell>
                                          <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Type</TableCell>
                                          <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Qty</TableCell>
                                          <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Rate (₹)</TableCell>
                                          <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Amount (₹)</TableCell>
                                          <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>GST %</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {orderItems.map((item, iIdx) => {
                                          const price = Number(item.price || item.buyingPrice || 0);
                                          const qty = Number(item.qty || 0);
                                          const discount = Number(item.discountAmount || 0);
                                          const amount = price * qty - discount;
                                          const hasRx = item.orderType === 'RX' || (item.rx?.powers?.length > 0);
                                          return (
                                            <TableRow key={iIdx} hover>
                                              <TableCell sx={{ fontSize: '0.72rem', color: '#64748B' }}>{iIdx + 1}</TableCell>
                                              <TableCell sx={{ fontSize: '0.72rem', color: '#0F172A', fontWeight: 500 }}>
                                                <Box>
                                                  <span>{item.itemName || item.productName || item.name || 'Product'}</span>
                                                  {item.code && <Typography variant="caption" sx={{ display: 'block', color: '#0284C7', fontFamily: 'monospace', fontSize: '0.65rem' }}>Code: {item.code}</Typography>}
                                                  {hasRx && item.rx?.powers?.length > 0 && (
                                                    <Typography variant="caption" sx={{ display: 'block', color: '#7C3AED', fontSize: '0.65rem' }}>
                                                      RX: {item.rx.powers.slice(0, 2).map(p => `SPH ${p.sph || 0} / CYL ${p.cyl || 0}`).join(' | ')}
                                                      {item.rx.powers.length > 2 && ` +${item.rx.powers.length - 2} more`}
                                                    </Typography>
                                                  )}
                                                </Box>
                                              </TableCell>
                                              <TableCell sx={{ fontSize: '0.72rem', color: '#475569' }}>
                                                {item.brand || item.brandName || '—'}
                                              </TableCell>
                                              <TableCell>
                                                <Chip size="small"
                                                  label={item.orderType || 'STOCK'}
                                                  sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600, backgroundColor: hasRx ? '#F5F3FF' : '#F0FDF4', color: hasRx ? '#6D28D9' : '#15803D' }} />
                                              </TableCell>
                                              <TableCell align="center" sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#0F172A' }}>
                                                {qty}
                                              </TableCell>
                                              <TableCell align="right" sx={{ fontSize: '0.72rem', color: '#475569' }}>
                                                ₹{price.toLocaleString('en-IN')}
                                              </TableCell>
                                              <TableCell align="right" sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#0F172A' }}>
                                                ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                              </TableCell>
                                              <TableCell align="center" sx={{ fontSize: '0.72rem', color: '#475569' }}>
                                                {item.gst ? `${item.gst}%` : '—'}
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>

                                    {/* Tax Summary */}
                                    {(matchedOrder || isPurchase) && (
                                      <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                                        <Typography variant="caption" sx={{ color: '#475569' }}>
                                          Taxable: <strong>₹{Number((matchedOrder?.taxableAmount ?? txn.taxableAmount) || 0).toLocaleString('en-IN')}</strong>
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#475569' }}>
                                          GST: <strong>₹{Number((matchedOrder?.gstAmount ?? txn.gstAmount) || 0).toLocaleString('en-IN')}</strong>
                                        </Typography>
                                        {Number(matchedOrder?.shippingCharges ?? txn.shippingCharges ?? 0) > 0 && (
                                          <Typography variant="caption" sx={{ color: '#475569' }}>
                                            Freight: <strong>₹{Number(matchedOrder?.shippingCharges ?? txn.shippingCharges).toLocaleString('en-IN')}</strong>
                                          </Typography>
                                        )}
                                        {Number(matchedOrder?.otherCharges ?? txn.otherCharges ?? 0) > 0 && (
                                          <Typography variant="caption" sx={{ color: '#475569' }}>
                                            Other Charges: <strong>₹{Number(matchedOrder?.otherCharges ?? txn.otherCharges).toLocaleString('en-IN')}</strong>
                                          </Typography>
                                        )}
                                        <Typography variant="caption" sx={{ color: '#0F172A', fontWeight: 700 }}>
                                          Grand Total: ₹{Number((matchedOrder?.grandTotal ?? txn.orderGrandTotal ?? orderTotal) || 0).toLocaleString('en-IN')}
                                        </Typography>
                                      </Box>
                                    )}
                                  </Box>
                                )}

                                {/* Payment History */}
                                {hasParts && (
                                  <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                        <Icon icon="lucide:wallet" style={{ color: '#059669', fontSize: 14 }} />
                                        Payment History ({paymentsList.length})
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: '#475569' }}>
                                        Paid: <strong style={{ color: '#059669' }}>₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> of ₹{orderTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        &nbsp;|&nbsp; Remaining: <strong style={{ color: dueAmount > 0 ? '#EF4444' : '#059669' }}>
                                          {dueAmount > 0 ? `₹${dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Payable)` : 'Settled'}
                                        </strong>
                                      </Typography>
                                    </Box>
                                    <Table size="small">
                                      <TableHead sx={{ backgroundColor: '#F1F5F9' }}>
                                        <TableRow>
                                          <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569', width: 40 }}>#</TableCell>
                                          <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Payment Date</TableCell>
                                          <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Ref / Voucher</TableCell>
                                          <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Mode</TableCell>
                                          <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Remarks</TableCell>
                                          <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Amount (₹)</TableCell>
                                          <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Status</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {paymentsList.map((p, pIdx) => (
                                          <TableRow key={p.paymentId || p.paymentNumber || pIdx} hover>
                                            <TableCell sx={{ fontSize: '0.72rem', color: '#64748B' }}>{pIdx + 1}</TableCell>
                                            <TableCell sx={{ fontSize: '0.72rem', color: '#334155', whiteSpace: 'nowrap' }}>
                                              {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : 'N/A'}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 600, color: '#0284C7' }}>
                                              {p.referenceNumber || p.paymentNumber}
                                            </TableCell>
                                            <TableCell>
                                              <Chip size="small"
                                                label={
                                                  p.paymentMode === 'UPI' ? 'UPI / QR' :
                                                    p.paymentMode === 'CASH' ? 'Cash' :
                                                      p.paymentMode === 'BANK_TRANSFER' ? 'Bank Transfer' :
                                                        p.paymentMode === 'CHEQUE' ? 'Cheque' :
                                                          (p.paymentMode ? String(p.paymentMode).replace(/_/g, ' ') : 'Bank')
                                                }
                                                sx={{
                                                  height: 20, fontSize: '0.65rem', fontWeight: 600,
                                                  backgroundColor: p.paymentMode === 'UPI' ? '#F5F3FF' :
                                                    p.paymentMode === 'CASH' ? '#FEF3C7' : '#F0FDF4',
                                                  color: p.paymentMode === 'UPI' ? '#6D28D9' :
                                                    p.paymentMode === 'CASH' ? '#B45309' : '#15803D'
                                                }} />
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.72rem', color: '#475569' }}>
                                              <Box>
                                                <span>{p.remarks || 'Vendor Payout'}</span>
                                                {p.utrNumber && p.utrNumber !== (p.referenceNumber || p.paymentNumber) && (
                                                  <Typography variant="caption" sx={{ display: 'block', color: '#0284C7', fontFamily: 'monospace', fontSize: '0.65rem' }}>
                                                    UTR: {p.utrNumber}
                                                  </Typography>
                                                )}
                                              </Box>
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669' }}>
                                              ₹{Number(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell align="center">
                                              <Chip size="small" label={p.status || 'CLEARED'}
                                                sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, backgroundColor: '#DCFCE7', color: '#15803D' }} />
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </Box>
                                )}
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Table Footer Summary */}
          <Box sx={{ px: 2.5, py: 1.5, backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: 3, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700 }}>
              Total Purchased: <span style={{ color: '#B91C1C' }}>₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </Typography>
            <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700 }}>
              Total Paid Out: <span style={{ color: '#059669' }}>₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </Typography>
            <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700 }}>
              Net Payable: <span style={{ color: currentOutstanding > 0 ? '#E11D48' : '#059669', fontWeight: 800 }}>
                ₹{currentOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {currentOutstanding > 0 ? '(Payable)' : '(Settled)'}
              </span>
            </Typography>
          </Box>
        </Paper>
      )}

      {/* ── Vendor Payout Modal ───────────────────────────────────────── */}
      {payoutModalOpen && (
        <VendorPayoutModal
          open={payoutModalOpen}
          onClose={() => {
            setPayoutModalOpen(false);
            setSelectedPurchaseForPayout(null);
          }}
          vendor={{
            _id: vendor.id || vendor._id || vendorId,
            id: vendor.id || vendor._id || vendorId,
            firm: vendor.firm || vendor.name,
            name: vendor.name || vendor.firm,
            mobile: vendor.mobile,
            email: vendor.email,
            gstNumber: vendor.gstin || vendor.gstNumber,
            currentOutstanding,
            creditLimit: Number(vendor.creditLimit || master.creditLimit || 0),
            creditUsed: currentOutstanding > 0 ? currentOutstanding : 0,
            pendingDue: currentOutstanding > 0 ? currentOutstanding : 0,
            advanceAmount: currentOutstanding < 0 ? Math.abs(currentOutstanding) : 0,
            isGSTRegistered: Boolean(vendor.gstin || vendor.gstNumber),
            tdsApplicable: master.tdsApplicable,
            tdsSection: master.tdsSection,
            tdsPercentage: master.tdsPercentage,
          }}
          initialPurchase={selectedPurchaseForPayout}
          onSuccess={() => fetchStatement()}
        />
      )}
    </Box>
  );
};

export default VendorStatement;
