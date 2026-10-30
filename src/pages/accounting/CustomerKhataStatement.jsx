import React, { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Button, Grid, Chip, IconButton,
  TextField, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, Paper, CircularProgress, Divider, Alert,
  LinearProgress, Tooltip, Collapse,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  getCustomerStatement,
  adjustDueFromAdvance,
  downloadPaymentReceipt,
  downloadOrderChallan,
  downloadOrderInvoice,
  downloadCustomerLedgerStatement,
  sendPaymentDueReminder,
  updateChequeStatus
} from '../../services/accountingService';
import CustomerPaymentModal from './CustomerPaymentModal';

const formatAddress = (addr) => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  if (typeof addr === 'object') {
    const parts = [
      addr.address,
      addr.city,
      addr.state,
      addr.zipCode,
      addr.country
    ].filter(Boolean);
    return parts.join(', ') || addr.branchName || '';
  }
  return '';
};

const getStatusBadge = (status) => {
  switch ((status || '').toUpperCase()) {
    case 'DELIVERED':
    case 'COMPLETED':
      return { bg: '#DEF7EC', text: '#03543F', border: '#BCF0DA' };
    case 'DISPATCHED':
      return { bg: '#E1EFFE', text: '#1E429F', border: '#B4C6FC' };
    case 'READYTODISPATCH':
      return { bg: '#E1F8F7', text: '#067A75', border: '#AFECE7' };
    case 'PROCESSING':
    case 'QC':
      return { bg: '#FEF08A', text: '#854D0E', border: '#FDE047' };
    case 'SUBMITTED':
      return { bg: '#F3E8FF', text: '#6B21A8', border: '#E9D5FF' };
    case 'CANCELLED':
      return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' };
    default:
      return { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
  }
};

const CustomerKhataStatement = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState(false);
  const [summary, setSummary] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [monthlyBreakdown, setMonthlyBreakdown] = useState([]);
  const [filters, setFilters] = useState({ startDate: '', endDate: '' });
  const [showMonthlySummary, setShowMonthlySummary] = useState(false);

  // Payment Modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);

  // Cheque Action Modals state (PDC Clear / Bounce)
  const [clearChequeModal, setClearChequeModal] = useState({
    open: false,
    payment: null,
    order: null,
    clearanceDate: new Date().toISOString().split('T')[0],
    submitting: false,
  });

  const [bounceChequeModal, setBounceChequeModal] = useState({
    open: false,
    payment: null,
    order: null,
    bounceReason: 'Insufficient Funds',
    customReason: '',
    submitting: false,
  });

  const [retryChequeModal, setRetryChequeModal] = useState({
    open: false,
    payment: null,
    order: null,
    retryNotes: 'Customer confirmed balance available; re-presented to bank.',
    submitting: false,
  });

  const [expandedRowId, setExpandedRowId] = useState(null);
  const toggleExpandRow = (id) => setExpandedRowId((prev) => (prev === id ? null : id));
  const [downloadingReceiptId, setDownloadingReceiptId] = useState(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [notApproved, setNotApproved] = useState(false);
  const [statementError, setStatementError] = useState(null);

  const fetchStatement = async (customFilters = filters) => {
    try {
      setLoading(true);
      setNotApproved(false);
      setStatementError(null);
      const res = await getCustomerStatement(customerId, customFilters);
      setSummary(res.data?.summary || {});
      const rawTxns = res.data?.transactions || [];
      const sorted = [...rawTxns].sort((a, b) => new Date(a.transactionDate || a.createdAt) - new Date(b.transactionDate || b.createdAt));
      setTransactions(sorted);
      setOrders(res.data?.orders || []);
      setMonthlyBreakdown(res.data?.monthlyBreakdown || []);
    } catch (err) {
      const isUnapproved = err.response?.data?.errorCode === 'CUSTOMER_NOT_APPROVED';
      setNotApproved(isUnapproved);
      const msg = err.response?.data?.message || err.message || 'Failed to load customer statement';
      setStatementError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenClearCheque = (payment, order) => {
    setClearChequeModal({
      open: true,
      payment,
      order,
      clearanceDate: new Date().toISOString().split('T')[0],
      submitting: false,
    });
  };

  const handleConfirmClearCheque = async () => {
    if (!clearChequeModal.payment) return;
    try {
      setClearChequeModal(prev => ({ ...prev, submitting: true }));
      await updateChequeStatus(clearChequeModal.payment.paymentId, {
        status: 'CLEARED',
        clearanceDate: clearChequeModal.clearanceDate || new Date().toISOString(),
      });
      toast.success(`Cheque #${clearChequeModal.payment.chequeNumber || ''} marked as CLEARED! ₹${Number(clearChequeModal.payment.amount || 0).toLocaleString()} credited.`);
      setClearChequeModal({ open: false, payment: null, order: null, clearanceDate: '', submitting: false });
      window.dispatchEvent(new Event('cheque-status-updated'));
      await fetchStatement();
    } catch (err) {
      toast.error(err.message || 'Failed to clear cheque');
      setClearChequeModal(prev => ({ ...prev, submitting: false }));
    }
  };

  const handleOpenBounceCheque = (payment, order) => {
    setBounceChequeModal({
      open: true,
      payment,
      order,
      bounceReason: 'Insufficient Funds',
      customReason: '',
      submitting: false,
    });
  };

  const handleConfirmBounceCheque = async () => {
    if (!bounceChequeModal.payment) return;
    try {
      setBounceChequeModal(prev => ({ ...prev, submitting: true }));
      const reason = bounceChequeModal.bounceReason === 'Other'
        ? (bounceChequeModal.customReason || 'Cheque Bounced')
        : bounceChequeModal.bounceReason;
      await updateChequeStatus(bounceChequeModal.payment.paymentId, {
        status: 'BOUNCED',
        bounceReason: reason,
      });
      toast.warn(`Cheque #${bounceChequeModal.payment.chequeNumber || ''} marked as BOUNCED. ₹500 penalty debited.`);
      setBounceChequeModal({ open: false, payment: null, order: null, bounceReason: '', customReason: '', submitting: false });
      window.dispatchEvent(new Event('cheque-status-updated'));
      await fetchStatement();
    } catch (err) {
      toast.error(err.message || 'Failed to bounce cheque');
      setBounceChequeModal(prev => ({ ...prev, submitting: false }));
    }
  };

  const handleOpenRetryCheque = (payment, order) => {
    setRetryChequeModal({
      open: true,
      payment,
      order,
      retryNotes: 'Customer confirmed balance available; re-presented to bank.',
      submitting: false,
    });
  };

  const handleConfirmRetryCheque = async () => {
    if (!retryChequeModal.payment) return;
    try {
      setRetryChequeModal(prev => ({ ...prev, submitting: true }));
      await updateChequeStatus(retryChequeModal.payment.paymentId, {
        status: 'RETRY',
        retryNotes: retryChequeModal.retryNotes || 'Re-presented to bank for clearance',
      });
      toast.success(`Cheque #${retryChequeModal.payment.chequeNumber || ''} re-presented to bank! Status is now IN CLEARING.`);
      setRetryChequeModal({ open: false, payment: null, order: null, retryNotes: '', submitting: false });
      window.dispatchEvent(new Event('cheque-status-updated'));
      await fetchStatement();
    } catch (err) {
      toast.error(err.message || 'Failed to retry cheque');
      setRetryChequeModal(prev => ({ ...prev, submitting: false }));
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchStatement();
    }
    const handleChequeUpdated = () => {
      if (customerId) fetchStatement();
    };
    window.addEventListener('cheque-status-updated', handleChequeUpdated);
    return () => window.removeEventListener('cheque-status-updated', handleChequeUpdated);
  }, [customerId]);

  const stats = summary.statistics || {};
  const master = summary.ledgerMaster || {};
  const cust = summary.customer || {};

  const creditLimit = Number(master.creditLimit || 0);
  const creditUsed = Number(master.creditUsed || 0);
  const advanceAmount = Number(master.advanceAmount || 0);
  const availableCredit = Number(master.availableCredit !== undefined ? master.availableCredit : Math.max(0, creditLimit - creditUsed));
  const creditPercentage = Number(master.creditPercentage !== undefined ? master.creditPercentage : (creditLimit > 0 ? ((creditUsed / creditLimit) * 100).toFixed(1) : 0));
  const creditStatus = master.creditStatus || (creditLimit > 0 && creditUsed >= creditLimit ? 'EXCEEDED' : (creditLimit > 0 && creditUsed >= 0.8 * creditLimit ? 'WARNING_20_PERCENT' : 'HEALTHY'));
  const exceededAmount = Number(master.exceededAmount || (creditUsed > creditLimit ? creditUsed - creditLimit : 0));
  const is20PercentAlert = master.is20PercentAlert || creditStatus === 'WARNING_20_PERCENT';
  const isExceededAlert = master.isExceededAlert || creditStatus === 'EXCEEDED';
  const isGST = Boolean(cust.isGSTRegistered);

  const maxAdjustable = Math.min(creditUsed, advanceAmount);

  // Build orders lookup map for enriching transaction rows with full order details
  const ordersMap = {};
  orders.forEach(ord => {
    if (ord.orderId) ordersMap[String(ord.orderId)] = ord;
    if (ord._id) ordersMap[String(ord._id)] = ord;
    if (ord.orderNumber) ordersMap[ord.orderNumber] = ord;
  });

  // Build unified transactions list: merge ledger transactions with any orders not yet recorded as separate transactions
  const existingOrderRefs = new Set(
    transactions
      .flatMap(t => [String(t.orderId || ''), String(t.voucherId || ''), String(t.referenceNumber || ''), String(t.orderNumber || '')])
      .filter(Boolean)
  );

  const unrecordedOrderTxns = orders
    .filter(ord => {
      const oid = String(ord.orderId || ord._id || '');
      const onum = String(ord.orderNumber || '');
      if ((oid && existingOrderRefs.has(oid)) || (onum && existingOrderRefs.has(onum))) {
        return false;
      }
      // Strictly respect date filter if active
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
      voucherType: 'Sales Invoice',
      transactionDate: ord.orderDate || ord.createdAt,
      createdAt: ord.createdAt,
      debit: Number(ord.grandTotal || ord.totalOrderPrice || 0),
      credit: Number(ord.paidAmount || ord.advanceAmount || 0),
      runningBalance: Number(ord.balanceDue || 0),
      customerName: ord.customerName || cust.shopName || cust.ownerName || 'Customer',
      vendorName: ord.vendorName || summary.wholesalerProfile?.companyName,
      items: ord.items || [],
      challanUrl: ord.challanUrl,
      invoiceUrl: ord.invoiceUrl,
      hasChallan: Boolean(ord.challanUrl || ord.hasChallan),
      hasInvoice: Boolean(ord.invoiceUrl || ord.hasInvoice),
      orderStatus: ord.orderStatus || 'Submitted',
      orderGrandTotal: Number(ord.grandTotal || ord.totalOrderPrice || 0),
      orderPaidAmount: Number(ord.paidAmount || ord.advanceAmount || 0),
      orderBalanceDue: Number(ord.balanceDue || 0),
      pdcWaitingAmount: Number(ord.pdcWaitingAmount || 0),
      partPaymentStatus: ord.paymentStatus,
      partPaymentPercentage: ord.partPaymentPercentage,
      orderPayments: ord.orderPayments || [],
      isGSTInvoice: Boolean(ord.isGSTRegistered),
      taxableAmount: ord.taxableAmount,
      gstAmount: ord.gstAmount,
      shippingCharges: Number(ord.shippingCharges || 0),
      otherCharges: Number(ord.otherCharges || 0),
      createdByName: ord.salesPersonName || 'Sales Staff',
    }));

  // Collect all payment voucher numbers and IDs that are allocated/grouped under orders
  const allocatedPaymentRefs = new Set();
  orders.forEach(ord => {
    (ord.orderPayments || []).forEach(p => {
      if (p.paymentNumber) allocatedPaymentRefs.add(String(p.paymentNumber));
      if (p.referenceNumber) allocatedPaymentRefs.add(String(p.referenceNumber));
      if (p.paymentId) allocatedPaymentRefs.add(String(p.paymentId));
    });
  });

  // Filter out standalone payment rows that are already grouped under an order's dropdown
  const standaloneTransactions = transactions.filter(t => {
    // Strictly respect date filter if active
    if (filters.startDate || filters.endDate) {
      const txDate = new Date(t.transactionDate || t.createdAt);
      if (filters.startDate && txDate < new Date(filters.startDate)) return false;
      if (filters.endDate) {
        const endD = new Date(filters.endDate);
        endD.setHours(23, 59, 59, 999);
        if (txDate > endD) return false;
      }
    }

    const isPayment = Boolean(
      (t.referenceNumber && t.referenceNumber.startsWith('CPAY')) ||
      t.voucherType === 'Receipt' ||
      t.voucherType === 'Advance' ||
      (!t.voucherType?.toLowerCase().includes('invoice') && Number(t.credit) > 0 && !t.referenceNumber?.startsWith('BO-'))
    );
    if (!isPayment) return true; // Keep all orders / invoices / credit notes etc.

    // If allocated to an order, keep the ledger clean and hide the duplicate standalone row
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
    .sort(
      (a, b) => new Date(a.transactionDate || a.createdAt) - new Date(b.transactionDate || b.createdAt)
    );

  const displayTotalInvoiced = Number(stats.totalDebit || 0) || unifiedTransactions.reduce((acc, t) => acc + Number(t.orderGrandTotal != null ? t.orderGrandTotal : t.debit || 0), 0);
  const displayTotalReceived = Number(stats.totalCredit || 0) || unifiedTransactions.reduce((acc, t) => acc + Number(t.orderPaidAmount != null ? t.orderPaidAmount : t.credit || 0), 0);

  const handleOpenPartPayment = (ord) => {
    setSelectedOrderForPayment(ord);
    setPaymentModalOpen(true);
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

  // Shared formatting helpers
  const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatModeLabel = (mode) => {
    if (!mode) return 'Direct Payment';
    const m = String(mode).toUpperCase();
    if (m === 'ADVANCE_ADJUSTMENT') return 'Advance Adjustment';
    if (m === 'UPI') return 'UPI / QR Code';
    if (m === 'CASH') return 'Cash Payment';
    if (m === 'BANK_TRANSFER') return 'Bank Transfer / NEFT';
    if (m === 'CHEQUE') return 'Cheque / DD';
    return String(mode).replace(/_/g, ' ');
  };

  const numberToWordsINR = (num) => {
    const n = Math.round(Number(num || 0));
    if (!n || isNaN(n)) return 'Zero Rupees Only';
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function inWords(val) {
      let str = '';
      if (val > 99) { str += a[Math.floor(val / 100)] + 'Hundred '; val %= 100; }
      if (val > 19) { str += b[Math.floor(val / 10)] + (val % 10 !== 0 ? ' ' + a[val % 10] : ' '); } else if (val > 0) { str += a[val]; }
      return str;
    }
    let crore = Math.floor(n / 10000000); let rem = n % 10000000;
    let lakh = Math.floor(rem / 100000); rem %= 100000;
    let thousand = Math.floor(rem / 1000); rem %= 1000;
    let words = '';
    if (crore > 0) words += inWords(crore) + 'Crore ';
    if (lakh > 0) words += inWords(lakh) + 'Lakh ';
    if (thousand > 0) words += inWords(thousand) + 'Thousand ';
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

  // Generate Customer Ledger Statement HTML
  const generateStatementHTML = () => {
    const wholesaler = summary.wholesaler || {};
    const wholesalerName = wholesaler.companyName || 'Anish DigiOptics Wholesaler';
    const companyAddress = wholesaler.address || 'New Delhi, India';
    const companyPhone = wholesaler.phone || '9650560526';
    const companyEmail = wholesaler.email || 'support@digioptics.com';
    const rawCompanyGstin = wholesaler.gstin || master.gstin || '';
    const companyGstin = (rawCompanyGstin && !String(rawCompanyGstin).startsWith('http') && !String(rawCompanyGstin).includes('/'))
      ? String(rawCompanyGstin).trim()
      : 'Unregistered';

    let statementPeriod = filters.startDate
      ? `${new Date(filters.startDate).toLocaleDateString('en-IN').replace(/\//g, '-')} to ${filters.endDate ? new Date(filters.endDate).toLocaleDateString('en-IN').replace(/\//g, '-') : 'Today'}`
      : '';

    if (!statementPeriod && unifiedTransactions && unifiedTransactions.length > 0) {
      const validDates = unifiedTransactions
        .map(t => new Date(t.transactionDate || t.orderDate || t.createdAt).getTime())
        .filter(time => !isNaN(time) && time > 0)
        .sort((a, b) => a - b);
      if (validDates.length > 0) {
        const fromStr = new Date(validDates[0]).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
        const toStr = new Date(validDates[validDates.length - 1]).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
        statementPeriod = fromStr === toStr ? fromStr : `${fromStr} to ${toStr}`;
      }
    }
    if (!statementPeriod) {
      statementPeriod = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    }

    const companyLogo = wholesaler.logo || '';
    const bank = wholesaler.bankDetails || {
      bankName: 'HDFC BANK',
      accountNo: '50200084729104',
      ifscCode: 'HDFC0000247',
      branch: 'SILIGURI BRANCH',
      holderName: wholesalerName,
      upiId: `${companyPhone}@upi`
    };

    const customerName = cust.shopName || cust.ownerName || 'Customer';
    const ownerName = cust.ownerName || 'N/A';
    const mobile = cust.mobile || 'N/A';
    const email = cust.email || 'N/A';
    const gstin = cust.gstin || cust.gstNumber || cust.GSTNo || 'Unregistered';
    const addr = formatAddress(cust.address) || 'N/A';
    const ledgerCode = master.ledgerCode || `CUST-LED-${String(customerId || '').slice(-6).toUpperCase()}`;

    const totalDebitVal = Number(displayTotalInvoiced || 0);
    const totalCreditVal = Number(displayTotalReceived || 0);
    const advanceVal = Number(advanceAmount || 0);
    const closingDueVal = Number(creditUsed || 0);

    const rowsHtml = unifiedTransactions
      .map((t, idx) => {
        const d = t.transactionDate ? new Date(t.transactionDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '0';
        const orderTotal = Number(t.orderGrandTotal != null ? t.orderGrandTotal : t.debit || 0);
        const paidAmount = Math.max(Number(t.orderPaidAmount != null ? t.orderPaidAmount : 0), Number(t.credit || 0));
        const dueAmount = t.orderBalanceDue != null && Number(t.orderBalanceDue) <= (orderTotal - paidAmount)
          ? Number(t.orderBalanceDue)
          : Math.max(0, orderTotal - paidAmount);

        const isDirectPayment = Boolean(
          (t.referenceNumber && String(t.referenceNumber).startsWith('CPAY')) ||
          t.voucherType === 'Receipt' ||
          t.voucherType === 'Advance' ||
          (!t.voucherType?.toLowerCase().includes('invoice') && Number(t.credit) > 0 && !t.referenceNumber?.startsWith('BO-'))
        );

        const isOrder = !isDirectPayment && Boolean(
          (t.referenceNumber && (String(t.referenceNumber).startsWith('BO-') || String(t.referenceNumber).startsWith('ORD-'))) ||
          t.orderNumber ||
          t.voucherType === 'Sales Invoice' ||
          t.voucherType === 'Invoice' ||
          (t.orderGrandTotal != null && Number(t.orderGrandTotal) > 0)
        );

        const debit = orderTotal > 0 && isOrder ? fmtNum(orderTotal) : (Number(t.debit) > 0 ? fmtNum(t.debit) : '0.00');
        const credit = isOrder ? (paidAmount > 0 ? fmtNum(paidAmount) : '0.00') : (Number(t.credit) > 0 ? fmtNum(t.credit) : '0.00');
        const bal = isOrder
          ? (dueAmount <= 0 ? 'Paid' : `${fmtNum(dueAmount)} (Due)`)
          : (dueAmount > 0
              ? `${fmtNum(dueAmount)} (Due)`
              : (t.runningBalance != null && t.runningBalance !== 0
                  ? (t.runningBalance > 0
                      ? `${fmtNum(t.runningBalance)} (Due)`
                      : `${fmtNum(Math.abs(t.runningBalance))} (Adv)`)
                  : (Number(t.credit) > 0 ? `${fmtNum(t.credit)} (Adv)` : '0.00')));

        const isDue = bal.includes('(Due)');

        let particularsText = '';
        if (isDirectPayment) {
          const detectedMode = t.paymentMode || (t.narration?.toLowerCase().includes('upi') ? 'UPI' : t.narration?.toLowerCase().includes('cash') ? 'CASH' : 'BANK_TRANSFER');
          particularsText = `<span style="display:inline-block; font-weight:700; color:#059669; background:#dcfce7; padding:1px 4px; border-radius:2px; font-size:8px; margin-right:4px;">[${formatModeLabel(detectedMode)}]</span> Payment Received`;
          if (t.narration && !t.narration.toLowerCase().includes('sales invoice for order') && !t.narration.toLowerCase().includes('payment received via')) {
            particularsText += ` &bull; ${t.narration}`;
          }
        } else if (isOrder) {
          const matchedOrder = ordersMap[String(t.orderId)] || ordersMap[t.orderNumber] || ordersMap[t.referenceNumber] || null;
          const isDC = Boolean(
            (matchedOrder?.customer?.billingMode && matchedOrder.customer.billingMode.toUpperCase() === 'DC') ||
            (matchedOrder?.billingMode && matchedOrder.billingMode.toUpperCase() === 'DC') ||
            (cust?.billingMode && cust.billingMode.toUpperCase() === 'DC') ||
            (cust?.billToAddress?.billingMode && cust.billToAddress.billingMode.toUpperCase() === 'DC') ||
            (t?.billingMode && t.billingMode.toUpperCase() === 'DC') ||
            t.voucherType === 'Delivery Challan' ||
            (t?.hasChallan && !t?.hasInvoice) ||
            (t?.challanUrl && !t?.invoiceUrl)
          );
          particularsText = isDC ? 'Delivery Challan' : 'Sales Invoice';
          const rawNarration = t.narration || t.description || '';
          const isAutoGenerated = /Sales Invoice for Order|Total:|Advance Paid:|Added to Credit|Wholesale Order/i.test(rawNarration);
          if (rawNarration && !isAutoGenerated) {
            particularsText += ` &bull; ${rawNarration}`;
          }
        } else {
          particularsText = t.voucherType || t.description || 'General Ledger Entry';
        }

        const paymentDetailsHtml = (t.orderPayments && t.orderPayments.length > 0)
          ? `<tr style="border-bottom: 1.5px solid #000000; background: #f8fafc;">
               <td colspan="7" style="padding: 4px 6px 6px 6px;">
                 <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px; padding-bottom:2px; border-bottom:1px dashed #cbd5e1; font-size:8.5px;">
                   <span style="font-weight:800; color:#0369a1; text-transform:uppercase; letter-spacing:0.3px;">
                     Payment Breakdown &amp; Installments (${t.orderPayments.length} Record${t.orderPayments.length > 1 ? 's' : ''})
                   </span>
                   <span style="color:#475569; font-weight:600;">
                     Order Total: <strong>₹${debit}</strong> &bull; Total Paid: <strong style="color:#15803d;">₹${credit}</strong> &bull; Balance Due: <strong style="color:${dueAmount > 0 ? '#b91c1c' : '#15803d'};">₹${fmtNum(dueAmount)}</strong>
                   </span>
                 </div>
                 <table style="width:100%; border-collapse:collapse; background:#ffffff; border:1px solid #94a3b8; font-size:8px;">
                   <thead>
                     <tr style="background:#e2e8f0; border-bottom:1px solid #94a3b8; font-weight:700; color:#334155;">
                       <th style="width:44px; border-right:1px solid #cbd5e1; padding:2.5px 3px; text-align:center;">Inst. #</th>
                       <th style="width:74px; border-right:1px solid #cbd5e1; padding:2.5px 4px; text-align:center;">Payment Date</th>
                       <th style="width:115px; border-right:1px solid #cbd5e1; padding:2.5px 5px; text-align:left;">Payment Method</th>
                       <th style="width:145px; border-right:1px solid #cbd5e1; padding:2.5px 5px; text-align:left;">Ref / Voucher / UTR</th>
                       <th style="border-right:1px solid #cbd5e1; padding:2.5px 5px; text-align:left;">Narration / Payment Details</th>
                       <th style="width:85px; border-right:1px solid #cbd5e1; padding:2.5px 5px; text-align:right;">Amount (₹)</th>
                       <th style="width:62px; padding:2.5px 3px; text-align:center;">Status</th>
                     </tr>
                   </thead>
                   <tbody>
                     ${t.orderPayments
            .map((p, pIdx) => {
              const pDate = p.paymentDate
                ? new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
                : d;
              const pMode = formatModeLabel(p.paymentMode);
              const pRef = p.referenceNumber || p.paymentNumber || p.paymentId || '-';
              let pRemarks = p.remarks || (p.paymentMode === 'ADVANCE_ADJUSTMENT' ? 'Adjusted from Customer Advance Balance' : 'Part-Payment Received');
              if (p.utrNumber && p.utrNumber !== pRef) {
                pRemarks += ` (UTR: ${p.utrNumber})`;
              }
              if (p.bankName) {
                pRemarks += ` [${p.bankName}]`;
              }
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
                               <span style="font-weight:700; font-size:7.5px; padding:1px 3px; border-radius:2px; ${isCleared ? 'background:#dcfce7; color:#15803d; border:0.5px solid #86efac;' : 'background:#fef3c7; color:#b45309; border:0.5px solid #fde68a;'}">${pStatus}</span>
                             </td>
                           </tr>
                         `;
            })
            .join('')}
                   </tbody>
                 </table>
               </td>
             </tr>`
          : '';

        const separatorHtml = idx > 0
          ? `
          <tr style="height: 14px;">
            <td colspan="7" style="height: 14px; padding: 0; background: #f1f5f9; border-top: 2px solid #000000; border-bottom: 1.5px solid #000000;"></td>
          </tr>
          `
          : '';

        return `
          ${separatorHtml}
          <tr style="border-bottom: 1px solid #000000;">
            <td style="border-right: 1px solid #000000; padding: 6px 4px; text-align: center; font-size: 9px; color: #475569; font-weight: 700;">${idx + 1}</td>
            <td style="border-right: 1px solid #000000; padding: 6px 4px; text-align: center; font-size: 9px;">${d}</td>
            <td style="border-right: 1px solid #000000; padding: 6px 6px; font-family: monospace; font-size: 9px; font-weight: 700; color: #0284c7;">${t.referenceNumber || t.voucherId || '0'}</td>
            <td style="border-right: 1px solid #000000; padding: 6px 6px; font-size: 9px;">${particularsText}</td>
            <td style="border-right: 1px solid #000000; padding: 6px 6px; text-align: right; font-family: monospace; font-size: 9px; font-weight: 600;">${debit}</td>
            <td style="border-right: 1px solid #000000; padding: 6px 6px; text-align: right; font-family: monospace; font-size: 9px; font-weight: 600; color: #059669;">${credit}</td>
            <td style="padding: 6px 6px; text-align: right; font-family: monospace; font-size: 9px; font-weight: 700; color: ${isDue ? '#b91c1c' : '#15803d'};">${bal}</td>
          </tr>
          ${paymentDetailsHtml}
        `;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Customer-Ledger-Statement-${customerName.replace(/[^a-z0-9]/gi, '-')}</title>
  <style>
    @page { size: A4 portrait; margin: 6mm 8mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; padding: 0; font-family: Arial, Helvetica, "Segoe UI", Roboto, sans-serif; color: #000000; background: #ffffff; font-size: 10px; line-height: 1.25; }
    .invoice-wrapper { width: 100%; border: 1.5px solid #000000; background: #ffffff; box-sizing: border-box; }
    table { width: 100%; border-collapse: collapse; }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <!-- Top Header: Logo, Wholesaler info & Date/Ledger -->
    <table style="border-bottom: 1.5px solid #000000;">
      <tr>
        <td style="width: 22%; padding: 6px; border-right: 1px solid #000000; vertical-align: middle; text-align: center;">
          ${companyLogo ? `<img src="${companyLogo}" alt="Logo" style="max-height: 48px; max-width: 140px; object-fit: contain;" />` : `<div style="font-size: 16px; font-weight: 900; color: #0284c7; letter-spacing: -0.5px;">Digi<span style="color: #059669;">Optics</span></div><div style="font-size: 7.5px; color: #64748b; font-weight: 600; text-transform: uppercase;">Wholesale ERP</div>`}
        </td>
        <td style="width: 48%; padding: 6px 10px; border-right: 1px solid #000000; vertical-align: top;">
          <div style="font-size: 14px; font-weight: 900; text-transform: uppercase; color: #000000; line-height: 1.15;">
            ${wholesalerName}
          </div>
          <div style="font-size: 9.5px; color: #1e293b; margin-top: 2px;">
            ${companyAddress}
          </div>
          <div style="font-size: 9px; color: #1e293b; margin-top: 2px;">
            Phone: <strong>${companyPhone}</strong> | Email: <strong>${companyEmail}</strong>
          </div>
        </td>
        <td style="width: 32%; padding: 6px 10px; vertical-align: top; font-size: 9px; line-height: 1.4;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="font-weight: 750;">Statement Date:</td><td style="font-family: monospace; font-weight: 600;">${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}</td></tr>
            <tr><td style="font-weight: 750;">Period :</td><td style="font-weight: 700; color: #0f172a; font-size: 8.5px;">${statementPeriod}</td></tr>
            <tr><td style="font-weight: 750;">Ledger Code :</td><td style="font-family: monospace; font-weight: 700; color: #0284c7;">${ledgerCode}</td></tr>
            <tr><td style="font-weight: 750;">Credit Terms :</td><td style="font-weight: 600;">${master.creditDays || 30} Days Credit</td></tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Banner -->
    <div style="border-bottom: 1.5px solid #000000; text-align: center; font-size: 11px; font-weight: 900; letter-spacing: 0.8px; padding: 4px; text-transform: uppercase; background: #ffffff;">
      CUSTOMER STATEMENT 
    </div>

    <!-- Customer Details & Credit Terms -->
    <div style="display: flex; border-bottom: 1.5px solid #000000;">
      <div style="flex: 1; border-right: 1px solid #000000; padding: 6px 10px; font-size: 9.5px; line-height: 1.35;">
        <div style="font-weight: 800; font-size: 9.5px; text-transform: uppercase; color: #0284c7; margin-bottom: 2px;">CUSTOMER / BUYER DETAILS</div>
        <div style="font-size: 11px; font-weight: 800; color: #000000; text-transform: uppercase;">${customerName}</div>
        <div style="font-size: 9px; color: #1e293b; margin-top: 1px;">
          Owner: <strong>${ownerName}</strong> | Mob: <strong>${mobile}</strong> | Email: ${email}
        </div>
        <div style="font-size: 9px; color: #334155; margin-top: 1px;">
          Address: ${addr}
        </div>
        <div style="font-size: 9px; font-weight: 700; margin-top: 1px;">
          GSTIN: <span style="font-family: monospace;">${gstin}</span>
        </div>
      </div>
      <div style="flex: 1; padding: 6px 10px; font-size: 9.5px; line-height: 1.35;">
        <div style="font-weight: 800; font-size: 9.5px; text-transform: uppercase; color: #059669; margin-bottom: 2px;">CREDIT &amp; ACCOUNT TERMS</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5px;">
          <tr><td style="font-weight: 750; width: 95px;">Ledger Code:</td><td style="font-family: monospace; font-weight: 700;">${ledgerCode}</td></tr>
          <tr><td style="font-weight: 750;">Credit Limit:</td><td style="font-weight: 600;">₹${fmtNum(creditLimit)} (${master.creditDays || 30} days)</td></tr>
          <tr><td style="font-weight: 750;">Available Credit:</td><td style="font-weight: 600;">₹${fmtNum(availableCredit)}</td></tr>
          <tr><td style="font-weight: 750;">Account Status:</td><td style="font-weight: 700; color: ${closingDueVal > 0 ? '#b91c1c' : '#15803d'};">${closingDueVal > 0 ? `₹${fmtNum(closingDueVal)} (Due)` : `₹${fmtNum(advanceVal)} (Advance)`}</td></tr>
        </table>
      </div>
    </div>

    <!-- Financial KPI Strip -->
    <table style="width: 100%; border-collapse: collapse; border-bottom: 1.5px solid #000000; font-size: 9.5px; background: #f8fafc;">
      <tr>
        <td style="width: 25%; padding: 5px 8px; border-right: 1px solid #000000; text-align: center;">
          <div style="font-size: 8.5px; font-weight: 700; color: #475569; text-transform: uppercase;">Total Invoiced</div>
          <div style="font-size: 11.5px; font-weight: 800; font-family: monospace; color: #0f172a; margin-top: 2px;">₹${fmtNum(totalDebitVal)}</div>
        </td>
        <td style="width: 25%; padding: 5px 8px; border-right: 1px solid #000000; text-align: center;">
          <div style="font-size: 8.5px; font-weight: 700; color: #475569; text-transform: uppercase;">Total Collected</div>
          <div style="font-size: 11.5px; font-weight: 800; font-family: monospace; color: #15803d; margin-top: 2px;">₹${fmtNum(totalCreditVal)}</div>
        </td>
        <td style="width: 25%; padding: 5px 8px; border-right: 1px solid #000000; text-align: center;">
          <div style="font-size: 8.5px; font-weight: 700; color: #475569; text-transform: uppercase;">Advance Available</div>
          <div style="font-size: 11.5px; font-weight: 800; font-family: monospace; color: #0284c7; margin-top: 2px;">₹${fmtNum(advanceVal)}</div>
        </td>
        <td style="width: 25%; padding: 5px 8px; text-align: center;">
          <div style="font-size: 8.5px; font-weight: 700; color: #475569; text-transform: uppercase;">Net Outstanding Due</div>
          <div style="font-size: 11.5px; font-weight: 800; font-family: monospace; color: ${closingDueVal > 0 ? '#b91c1c' : '#15803d'}; margin-top: 2px;">₹${fmtNum(closingDueVal)}</div>
        </td>
      </tr>
    </table>

    <!-- Transactions Table -->
    <table style="width: 100%; border-collapse: collapse; font-size: 9.5px;">
      <thead>
        <tr style="background: #ffffff; border-bottom: 1px solid #000000; font-weight: 700;">
          <th style="width: 28px; border-right: 1px solid #000; padding: 4px 2px; text-align: center;">#</th>
          <th style="width: 75px; border-right: 1px solid #000; padding: 4px 4px; text-align: center;">Date</th>
          <th style="width: 130px; border-right: 1px solid #000; padding: 4px 6px; text-align: left;">Ref No.</th>
          <th style="border-right: 1px solid #000; padding: 4px 6px; text-align: left;">Particulars &amp; Narration</th>
          <th style="width: 95px; border-right: 1px solid #000; padding: 4px 6px; text-align: right;">Debit (₹)</th>
          <th style="width: 95px; border-right: 1px solid #000; padding: 4px 6px; text-align: right;">Credit (₹)</th>
          <th style="width: 110px; padding: 4px 6px; text-align: right;">Balance (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <!-- Bottom Summary: Declaration & Authorised Signatory -->
    <table style="width: 100%; border-collapse: collapse; border-top: 1.5px solid #000000;">
      <tr>
        <td style="width: 58%; padding: 8px 12px; vertical-align: top; border-right: 1px solid #000000; font-size: 9px; line-height: 1.45;">
          <div style="font-weight: 800; text-transform: uppercase; font-size: 9px; color: #0f172a; margin-bottom: 3px;">Declaration &amp; Notes:</div>
          <div style="color: #475569; font-size: 8.5px; line-height: 1.45;">
            &bull; This is an authentic computer-generated Customer Khata Statement.<br/>
            &bull; All transactions, invoices, and payment receipts are recorded subject to realization.<br/>
            &bull; For any discrepancies or reconciliation requests, please contact our accounts department within 7 days.
          </div>
        </td>
        <td style="width: 38%; padding: 6px 10px; vertical-align: top; font-size: 10px;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
            <tr style="border-bottom: 1px solid #000000;">
              <td style="padding: 3px 0; font-weight: 700;">Total Invoiced:</td>
              <td style="padding: 3px 0; text-align: right; font-weight: 700; font-family: monospace;">₹${fmtNum(totalDebitVal)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #000000;">
              <td style="padding: 3px 0; font-weight: 700;">Total Received:</td>
              <td style="padding: 3px 0; text-align: right; font-weight: 700; font-family: monospace; color: #15803d;">₹${fmtNum(totalCreditVal)}</td>
            </tr>
            <tr style="border-bottom: 1.5px solid #000000; background: #f8fafc;">
              <td style="padding: 4px 0; font-weight: 800; font-size: 10px;">Net Outstanding Due:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 800; font-size: 11px; font-family: monospace; color: ${closingDueVal > 0 ? '#b91c1c' : '#15803d'};">
                ₹${fmtNum(closingDueVal)}
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
      <div>System-generated account statement. Subject to realization of cheques/drafts.</div>
      <div>Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')} | ${wholesalerName}</div>
    </div>
  </div>
</body>
</html>`;
  };

  // Generate Payment Receipt Voucher HTML (matches original backend paymentReceiptTemplate.js design)
  const generatePaymentReceiptHTML = (txnOrPayment) => {
    const wholesaler = summary.wholesaler || {};
    const companyName = wholesaler.companyName || 'SAANCHI & CO.';
    const companyAddress = wholesaler.address || '3RD FLOOR, PEOPLES TV BUILDING, RAJA RAMMOHAN ROY ROAD,\nHAKIMPARA, SILIGURI';
    const companyPhone = wholesaler.phone || '0353-4075631';
    const rawCompanyGstin = wholesaler.gstin || master.gstin || '';
    const companyGstin = (rawCompanyGstin && !String(rawCompanyGstin).startsWith('http') && !String(rawCompanyGstin).includes('/'))
      ? String(rawCompanyGstin).trim()
      : '19AFWFS3883G1Z2';
    const finalLogo = wholesaler.logo || '';

    const partyName = cust.shopName || cust.customerName || cust.ownerName || 'Customer';
    const partyContact = cust.mobileNo1 || cust.mobile || cust.phone || '-';
    const rawPartyGstin = cust.gstNumber || cust.gstin || cust.GSTNo || '';
    const partyGstin = (rawPartyGstin && !String(rawPartyGstin).startsWith('http') && !String(rawPartyGstin).includes('/'))
      ? String(rawPartyGstin).trim()
      : 'URP';
    const partyAddress = formatAddress(cust.address) || cust.billToAddress?.address || '-';

    const isOrderReceipt = Boolean(txnOrPayment.orderPayments && txnOrPayment.orderPayments.length > 0) || Boolean(txnOrPayment.orderNumber && (txnOrPayment.orderGrandTotal || txnOrPayment.debit));
    const orderTotal = Number(txnOrPayment.orderGrandTotal != null ? txnOrPayment.orderGrandTotal : txnOrPayment.debit || 0);
    const paidAmount = Math.max(Number(txnOrPayment.orderPaidAmount != null ? txnOrPayment.orderPaidAmount : 0), Number(txnOrPayment.credit || 0));
    const dueAmount = txnOrPayment.orderBalanceDue != null && Number(txnOrPayment.orderBalanceDue) <= (orderTotal - paidAmount)
      ? Number(txnOrPayment.orderBalanceDue)
      : Math.max(0, orderTotal - paidAmount);

    let receiptNo = txnOrPayment.referenceNumber || txnOrPayment.paymentNumber || txnOrPayment.paymentId || txnOrPayment.voucherId || 'RCP';
    if (!receiptNo || receiptNo === '0') {
      receiptNo = `RCP-${String(Date.now()).slice(-6)}`;
    }

    const fmtD = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '-');
    const receiptDate = fmtD(txnOrPayment.transactionDate || txnOrPayment.paymentDate || txnOrPayment.createdAt || new Date());

    const detectedMode = txnOrPayment.paymentMode || (txnOrPayment.narration?.toLowerCase().includes('upi') ? 'UPI' : txnOrPayment.narration?.toLowerCase().includes('cash') ? 'CASH' : 'BANK_TRANSFER');
    const modeLabels = {
      CASH: "Cash Voucher",
      UPI: "UPI Transfer",
      CHEQUE: "Cheque Payment",
      BANK_TRANSFER: "Bank Transfer / NEFT / RTGS",
      NEFT: "NEFT Transfer",
      RTGS: "RTGS Transfer",
      ONLINE: "Online Payment Gateway",
      ADVANCE_ADJUSTMENT: "Advance Balance Adjustment",
    };
    const modeName = modeLabels[detectedMode] || detectedMode;

    const refNumber =
      txnOrPayment.paymentDetails?.referenceNumber ||
      txnOrPayment.referenceNumber ||
      txnOrPayment.paymentNumber ||
      txnOrPayment.utrNumber ||
      txnOrPayment.transactionId ||
      receiptNo ||
      '-';

    const totalReceivedAmount = isOrderReceipt && (paidAmount > 0)
      ? Number(paidAmount)
      : Number(txnOrPayment.amount != null ? txnOrPayment.amount : (Number(txnOrPayment.credit) > 0 ? txnOrPayment.credit : (txnOrPayment.grossAmount || orderTotal || 0)));

    const amountInWords = numberToWordsINR(totalReceivedAmount);
    const narration = txnOrPayment.remarks || txnOrPayment.narration || txnOrPayment.description || '';

    // Build Table Rows
    let tableHeaderHtml = '';
    let tableRowsHtml = '';

    if (isOrderReceipt && Array.isArray(txnOrPayment.orderPayments) && txnOrPayment.orderPayments.length > 0) {
      tableHeaderHtml = `
        <tr style="background:#ffffff; border-bottom:1px solid #000000; font-size:9.5px; font-weight:700;">
          <th style="width:28px; border-right:1px solid #000; padding:4px 2px; text-align:center;">#</th>
          <th style="width:85px; border-right:1px solid #000; padding:4px 4px; text-align:left;">Payment Date</th>
          <th style="border-right:1px solid #000; padding:4px 6px; text-align:left;">Voucher / Ref #</th>
          <th style="width:110px; border-right:1px solid #000; padding:4px 4px; text-align:center;">Payment Mode</th>
          <th style="border-right:1px solid #000; padding:4px 6px; text-align:left;">Remarks / Payment Type</th>
          <th style="width:110px; border-right:1px solid #000; padding:4px 6px; text-align:right;">Amount (₹)</th>
          <th style="width:65px; padding:4px 4px; text-align:center;">Status</th>
        </tr>
      `;

      tableRowsHtml = txnOrPayment.orderPayments
        .map((p, idx) => `
          <tr style="border-bottom:1px solid #000000;">
            <td style="border-right:1px solid #000; padding:3px 2px; text-align:center; font-size:10px;">${idx + 1}</td>
            <td style="border-right:1px solid #000; padding:3px 4px; font-size:10px; font-family:monospace;">${fmtD(p.paymentDate)}</td>
            <td style="border-right:1px solid #000; padding:3px 6px; font-size:10px; font-family:monospace; font-weight:700; color:#0284c7;">${p.referenceNumber || p.paymentNumber || "-"}</td>
            <td style="border-right:1px solid #000; padding:3px 4px; text-align:center; font-size:9.5px;">${modeLabels[p.paymentMode] || p.paymentMode || "Advance / Bank"}</td>
            <td style="border-right:1px solid #000; padding:3px 6px; font-size:10px; color:#1e293b;">${p.remarks || (idx === 0 && (p.paymentNumber?.startsWith("ADV") || p.referenceNumber?.startsWith("ADV")) ? "Booking Advance" : "Part Payment Installment")}</td>
            <td style="border-right:1px solid #000; padding:3px 6px; text-align:right; font-size:10px; font-weight:700; font-family:monospace;">${fmtNum(p.amount)}</td>
            <td style="padding:3px 4px; text-align:center; font-size:9px; font-weight:700; color:#15803d;">CLEARED</td>
          </tr>
        `)
        .join("");
    } else {
      tableHeaderHtml = `
        <tr style="background:#ffffff; border-bottom:1px solid #000000; font-size:9.5px; font-weight:700;">
          <th style="width:28px; border-right:1px solid #000; padding:4px 2px; text-align:center;">#</th>
          <th style="border-right:1px solid #000; padding:4px 6px; text-align:left;">Transaction Description / Particulars</th>
          <th style="width:130px; border-right:1px solid #000; padding:4px 4px; text-align:center;">Payment Mode</th>
          <th style="width:140px; border-right:1px solid #000; padding:4px 6px; text-align:left;">Reference # / UTR</th>
          <th style="width:120px; border-right:1px solid #000; padding:4px 6px; text-align:right;">Amount Received (₹)</th>
          <th style="width:75px; padding:4px 4px; text-align:center;">Status</th>
        </tr>
      `;

      tableRowsHtml = `
        <tr style="border-bottom:1px solid #000000;">
          <td style="border-right:1px solid #000; padding:3px 2px; text-align:center; font-size:10px;">1</td>
          <td style="border-right:1px solid #000; padding:3px 6px; font-size:10px; font-weight:600;">${narration || 'Direct Customer Khata Account Collection'}</td>
          <td style="border-right:1px solid #000; padding:3px 4px; text-align:center; font-size:9.5px;">${modeName}</td>
          <td style="border-right:1px solid #000; padding:3px 6px; font-size:10px; font-family:monospace; font-weight:600; color:#0284c7;">${refNumber}</td>
          <td style="border-right:1px solid #000; padding:3px 6px; text-align:right; font-size:10px; font-weight:700; font-family:monospace;">${fmtNum(totalReceivedAmount)}</td>
          <td style="padding:3px 4px; text-align:center; font-size:9px; font-weight:700; color:#15803d;">CLEARED</td>
        </tr>
      `;
    }

    const orderNumber = txnOrPayment.orderNumber || (isOrderReceipt ? receiptNo : null);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payment Receipt - ${receiptNo}</title>
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
        ${finalLogo ? `<img src="${finalLogo}" alt="Logo" style="max-height:55px; max-width:130px; object-fit:contain;" />` : ""}
      </div>
      <div style="flex:1; text-align:center; padding:0 10px;">
        <div style="font-size:13.5px; font-weight:700; margin-bottom:2px;">Payment Receipt / Voucher</div>
        <div style="font-size:19px; font-weight:800; color:#0284c7; letter-spacing:0.5px; margin-bottom:2px;">${companyName.toUpperCase()}</div>
        <div style="font-size:9.5px; font-weight:600; line-height:1.25; color:#1e293b; white-space:pre-line;">${companyAddress.toUpperCase()}</div>
        <div style="font-size:10px; font-weight:600; color:#1e293b; margin-top:1px;">Contact No. ${companyPhone}</div>
        <div style="font-size:10.5px; font-weight:700; margin-top:2px;">GST No : ${companyGstin}</div>
      </div>
      <div style="width:110px; text-align:right;">
        <div style="font-size:11px; font-weight:700;">Original Copy</div>
      </div>
    </div>

    <!-- Party Details & Receipt Meta 2 Columns -->
    <div style="display:flex; border-bottom:1.5px solid #000000;">
      <!-- Left Column: Party Details -->
      <div style="flex:1.2; padding:6px 10px; border-right:1px solid #000000; font-size:10.5px; line-height:1.35;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="width:85px; font-weight:700; vertical-align:top;">Customer / Party Details :</td>
            <td style="font-weight:800; font-size:11.5px; color:#000;">${partyName.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="font-weight:700; vertical-align:top;">Mobile :</td>
            <td style="font-family:monospace; font-weight:600;">${partyContact}</td>
          </tr>
          ${partyGstin && partyGstin !== "URP" && partyGstin !== "Unregistered" ? `
          <tr>
            <td style="font-weight:700; vertical-align:top;">GST No :</td>
            <td style="font-weight:600; font-family:monospace;">${partyGstin}</td>
          </tr>` : ""}
          <tr>
            <td style="font-weight:700; vertical-align:top;">Address :</td>
            <td style="color:#1e293b;">${partyAddress}</td>
          </tr>
        </table>
      </div>

      <!-- Right Column: Receipt Meta Details -->
      <div style="flex:0.8; padding:6px 10px; font-size:10.5px; line-height:1.35;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="width:95px; font-weight:700;">Receipt No :</td>
            <td style="font-weight:800; font-family:monospace; font-size:11.5px; color:#0284c7;">${receiptNo}</td>
          </tr>
          <tr>
            <td style="font-weight:700;">Receipt Date :</td>
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
        </table>
      </div>
    </div>

    <!-- If Order Receipt, Order Summary Bar -->
    ${isOrderReceipt && orderNumber ? `
    <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:6px 12px; border-bottom:1px solid #000000; font-size:10px;">
      <div>
        <span style="font-weight:700;">Order Number:</span> <span style="font-family:monospace; font-weight:700; color:#0284c7;">${orderNumber}</span>
        &nbsp;|&nbsp; <span style="font-weight:700;">Order Status:</span> <span style="font-weight:700; color:#059669;">${txnOrPayment.orderStatus || "Submitted"}</span>
      </div>
      <div>
        <span style="font-weight:700;">Order Total:</span> <span style="font-family:monospace; font-weight:700;">₹${fmtNum(orderTotal)}</span>
        &nbsp;|&nbsp; <span style="font-weight:700;">Remaining Balance Due:</span> <span style="font-family:monospace; font-weight:800; color:${dueAmount > 0 ? '#b91c1c' : '#15803d'};">₹${fmtNum(dueAmount)}</span>
      </div>
    </div>` : ""}

    <!-- Items / Payments Table -->
    <table style="width:100%; border-collapse:collapse; border-bottom:1.5px solid #000000;">
      <thead>
        ${tableHeaderHtml}
      </thead>
      <tbody>
        ${tableRowsHtml}
        <!-- Integrated Total Row -->
        <tr style="font-weight:800; font-size:10.5px; border-top:1px solid #000;">
          <td colspan="${isOrderReceipt && Array.isArray(txnOrPayment.orderPayments) && txnOrPayment.orderPayments.length > 0 ? 5 : 4}" style="border-right:1px solid #000; padding:4px 6px; text-align:right;">Total Amount Received</td>
          <td style="border-right:1px solid #000; padding:4px 6px; text-align:right; font-family:monospace; color:#15803d;">₹${fmtNum(totalReceivedAmount)}</td>
          <td style="padding:4px 4px; text-align:center; font-size:9px; color:#15803d;">PAID</td>
        </tr>
      </tbody>
    </table>

    <!-- Bottom Section: Words, Terms, QR Code, Signature -->
    <div style="display:flex; padding:8px 10px; font-size:9.5px;">
      <!-- Left Column -->
      <div style="flex:1.2; padding-right:15px; border-right:1px solid #000000;">
        <div style="margin-bottom:6px;">
          <span style="font-weight:700;">Total Amount ( In Words ) :</span><br>
          <span style="font-weight:800; font-size:10.5px;">${amountInWords}</span>
        </div>
        ${narration ? `
        <div style="margin-bottom:6px;">
          <span style="font-weight:700;">Payment Remarks / Narration :</span>
          <div style="font-size:9.5px; color:#1e293b; margin-top:1px;">${narration}</div>
        </div>` : ""}
        <div>
          <span style="font-weight:700; text-decoration:underline;">Declaration</span>
          <div style="font-size:8.5px; color:#1e293b; line-height:1.3; margin-top:2px;">
            This is an authenticated computer-generated payment voucher and official acknowledgment of money received and credited to the respective customer ledger account.
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div style="flex:0.8; padding-left:15px; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
            <span style="font-weight:700;">Amount Cleared :</span>
            <span style="font-weight:800; font-family:monospace; color:#15803d;">₹${fmtNum(totalReceivedAmount)}</span>
          </div>
          ${isOrderReceipt && orderNumber ? `
          <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
            <span style="font-weight:700;">Remaining Due :</span>
            <span style="font-weight:800; font-family:monospace; color:${dueAmount > 0 ? '#b91c1c' : '#15803d'};">₹${fmtNum(dueAmount)}</span>
          </div>` : ""}
        </div>

        <div style="text-align:right; margin-top:20px;">
          <div style="font-size:11px; font-weight:800; color:#0284c7;">${companyName.toUpperCase()}</div>
          <div style="font-size:9.5px; font-weight:700; margin-top:28px;">Authorised Signatory</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  // Helper function matching backend deliveryChallanTemplate.js renderOpticalDocumentHTML
  const renderOpticalDocumentHTML = (txn, docType = 'INVOICE') => {
    const isChallan = docType === 'CHALLAN';
    const title = isChallan ? 'Delivery Challan' : 'Sale Invoice';
    const numberLabel = isChallan ? 'Challan No :' : 'Invoice No :';
    const dateLabel = isChallan ? 'Challan Date :' : 'Invoice Date :';

    const wholesaler = summary.wholesaler || {};
    const wholesalerName = wholesaler.companyName || 'SAANCHI & CO.';
    const wholesalerAddress = wholesaler.address || '3RD FLOOR, PEOPLES TV BUILDING, RAJA RAMMOHAN ROY ROAD,\nHAKIMPARA, SILIGURI';
    const wholesalerPhone = wholesaler.phone || '0353-4075631';
    const rawCompanyGstin = wholesaler.gstin || master.gstin || '';
    const wholesalerGstin = (rawCompanyGstin && !String(rawCompanyGstin).startsWith('http') && !String(rawCompanyGstin).includes('/'))
      ? String(rawCompanyGstin).trim()
      : '19AFWFS3883G1Z2';
    const finalLogo = wholesaler.logo || '';

    const customerName = cust.shopName || cust.customerName || cust.ownerName || 'Customer';
    const customerPhone = cust.mobile || cust.mobileNo1 || cust.phone || 'N/A';
    const rawCustomerGstin = cust.gstin || cust.gstNumber || cust.GSTNo || '';
    const customerGstin = (rawCustomerGstin && !String(rawCustomerGstin).startsWith('http') && !String(rawCustomerGstin).includes('/'))
      ? String(rawCustomerGstin).trim()
      : '';
    const customerAddress = formatAddress(cust.address) || cust.billToAddress?.address || 'N/A';

    const matchedOrder = ordersMap[String(txn.orderId)] || ordersMap[txn.orderNumber] || ordersMap[txn.referenceNumber] || txn;
    const docNumber = matchedOrder.orderNumber || txn.orderNumber || txn.referenceNumber || (isChallan ? 'CH-001' : 'INV-001');
    const docDate = txn.transactionDate || txn.createdAt || matchedOrder.createdAt || matchedOrder.orderDate || new Date();
    const deliveryDate = matchedOrder.deliveryDate || matchedOrder.estimatedDeliveryDate || null;
    const deliveryBy = matchedOrder.deliveryBy || matchedOrder.salesPersonName || '60';

    const fmtPower = (val) => {
      if (val === undefined || val === null || val === '') return '0.00';
      const num = Number(val);
      if (isNaN(num)) return String(val);
      if (num > 0) return `+${num.toFixed(2)}`;
      return num.toFixed(2);
    };

    const fmtAxis = (val) => {
      if (val === undefined || val === null || val === '') return '0';
      const num = Number(val);
      return isNaN(num) ? String(val) : String(Math.round(num));
    };

    const fmtD = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '-');

    let itemIndex = 1;
    let parsedItems = [];
    let subTotal = 0;
    let totalQty = 0;
    let hsnMap = new Map();

    const accumulateHsn = (hsn, taxable, cgstRate, sgstRate, igstRate) => {
      const key = hsn || '90015000';
      if (!hsnMap.has(key)) {
        hsnMap.set(key, { taxable: 0, cgstRate, sgstRate, igstRate });
      }
      const entry = hsnMap.get(key);
      entry.taxable += taxable;
    };

    const orderList = Array.isArray(matchedOrder.orders) && matchedOrder.orders.length > 0
      ? matchedOrder.orders
      : (Array.isArray(matchedOrder.items) && matchedOrder.items.length > 0
        ? [{ items: matchedOrder.items, cgst: matchedOrder.cgst || 2.5, sgst: matchedOrder.sgst || 2.5, igst: matchedOrder.igst || 0, orderNumber: docNumber }]
        : (Array.isArray(txn.items) && txn.items.length > 0
          ? [{ items: txn.items, cgst: 2.5, sgst: 2.5, igst: 0, orderNumber: docNumber }]
          : []));

    if (orderList.length > 0) {
      for (const order of orderList) {
        const cgstRate = parseFloat(order.cgst || 2.5);
        const sgstRate = parseFloat(order.sgst || 2.5);
        const igstRate = parseFloat(order.igst || 0);

        for (const item of (order.items || [])) {
          const itemName = item.itemName || item.materialDescription || item.productName || item.lensType || 'Optical Item';
          const hsn = item.hsnSac || item.hsn || '90015000';
          const price = Number(item.price || item.unitRate || item.sellingPrice || 0);
          const discPct = Number(item.discountPercent || 0);
          const discAmt = Number(item.discountAmount || item.discount || 0);
          const rxRef = item.rx?.orderReference || (item.orderNo ? `Rx Order No. - ${item.orderNo}` : (order.orderNumber ? `Rx Order No. - ${order.orderNumber}` : ''));

          const powers = item.rx?.powers || [];
          const rPower = powers.find(p => p.side === 'R' || p.side === 'Right') || (item.rPower ? { ...item.rPower, side: 'R' } : null);
          const lPower = powers.find(p => p.side === 'L' || p.side === 'Left') || (item.lPower ? { ...item.lPower, side: 'L' } : null);

          if (rPower && lPower) {
            const rQty = 1;
            const rPrice = price;
            const rDiscAmt = discAmt > 0 ? (discAmt / 2) : (rPrice * rQty * discPct / 100);
            const rAmt = (rPrice * rQty) - rDiscAmt;
            parsedItems.push({
              sn: itemIndex++,
              itemName,
              rxRef,
              eye: 'R',
              sph: fmtPower(rPower.sph),
              cyl: fmtPower(rPower.cyl),
              axis: fmtAxis(rPower.axis),
              add: fmtPower(rPower.add),
              qty: rQty,
              price: rPrice,
              discPct,
              discAmt: rDiscAmt,
              amt: rAmt,
            });
            subTotal += rAmt;
            totalQty += rQty;
            accumulateHsn(hsn, rAmt, cgstRate, sgstRate, igstRate);

            const lQty = 1;
            const lPrice = price;
            const lDiscAmt = discAmt > 0 ? (discAmt / 2) : (lPrice * lQty * discPct / 100);
            const lAmt = (lPrice * lQty) - lDiscAmt;
            parsedItems.push({
              sn: itemIndex++,
              itemName,
              rxRef,
              eye: 'L',
              sph: fmtPower(lPower.sph),
              cyl: fmtPower(lPower.cyl),
              axis: fmtAxis(lPower.axis),
              add: fmtPower(lPower.add),
              qty: lQty,
              price: lPrice,
              discPct,
              discAmt: lDiscAmt,
              amt: lAmt,
            });
            subTotal += lAmt;
            totalQty += lQty;
            accumulateHsn(hsn, lAmt, cgstRate, sgstRate, igstRate);
          } else if (rPower || lPower) {
            const p = rPower || lPower;
            const side = rPower ? 'R' : 'L';
            const qty = Number(item.quantity || item.qty || 1);
            const iDiscAmt = discAmt > 0 ? discAmt : (price * qty * discPct / 100);
            const iAmt = (price * qty) - iDiscAmt;
            parsedItems.push({
              sn: itemIndex++,
              itemName,
              rxRef,
              eye: side,
              sph: fmtPower(p.sph),
              cyl: fmtPower(p.cyl),
              axis: fmtAxis(p.axis),
              add: fmtPower(p.add),
              qty,
              price,
              discPct,
              discAmt: iDiscAmt,
              amt: iAmt,
            });
            subTotal += iAmt;
            totalQty += qty;
            accumulateHsn(hsn, iAmt, cgstRate, sgstRate, igstRate);
          } else {
            const qty = Number(item.quantity || item.qty || 1);
            const iDiscAmt = discAmt > 0 ? discAmt : (price * qty * discPct / 100);
            const iAmt = Number(item.netValue || item.value || (price * qty - iDiscAmt));
            const hasPower = item.sph !== undefined || item.cyl !== undefined;
            parsedItems.push({
              sn: itemIndex++,
              itemName,
              rxRef: item.code ? `Item Code: ${item.code}` : (item.orderNo ? `Rx Order No. - ${item.orderNo}` : ''),
              eye: item.side || item.eye || '-',
              sph: hasPower ? fmtPower(item.sph) : '-',
              cyl: hasPower ? fmtPower(item.cyl) : '-',
              axis: hasPower ? fmtAxis(item.axis) : '-',
              add: hasPower ? fmtPower(item.add) : '-',
              qty,
              price: price || (qty > 0 ? iAmt / qty : iAmt),
              discPct,
              discAmt: iDiscAmt,
              amt: iAmt,
            });
            subTotal += iAmt;
            totalQty += qty;
            accumulateHsn(hsn, iAmt, cgstRate, sgstRate, igstRate);
          }
        }
      }
    }

    if (parsedItems.length === 0) {
      const orderTotalFallback = Number(matchedOrder.grandTotal || matchedOrder.totalOrderPrice || txn.orderGrandTotal || txn.debit || 0);
      const taxableFallback = Number(matchedOrder.taxableAmount || (orderTotalFallback > 0 ? Number((orderTotalFallback / 1.05).toFixed(2)) : 0));
      parsedItems.push({
        sn: 1,
        itemName: `Wholesale Optical Order #${docNumber}`,
        rxRef: txn.referenceNumber ? `Ref: ${txn.referenceNumber}` : '',
        eye: '-',
        sph: '-',
        cyl: '-',
        axis: '-',
        add: '-',
        qty: 1,
        price: taxableFallback,
        discPct: 0,
        discAmt: 0,
        amt: taxableFallback,
      });
      subTotal = taxableFallback;
      totalQty = 1;
      accumulateHsn('90015000', taxableFallback, 2.5, 2.5, 0);
    }

    const shippingCharges = Number(matchedOrder.shippingCharges || txn.shippingCharges || 0);
    const otherCharges = Number(matchedOrder.otherCharges || txn.otherCharges || 0);

    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalTaxable = 0;
    const hsnRows = [];

    for (const [hsn, info] of hsnMap.entries()) {
      const sgst = (info.taxable * info.sgstRate) / 100;
      const cgst = (info.taxable * info.cgstRate) / 100;
      const igst = (info.taxable * info.igstRate) / 100;
      const rowTax = sgst + cgst + igst;
      totalTaxable += info.taxable;
      totalSgst += sgst;
      totalCgst += cgst;
      totalIgst += igst;
      hsnRows.push({
        hsn,
        taxable: info.taxable,
        sgstRate: info.sgstRate,
        sgst,
        cgstRate: info.cgstRate,
        cgst,
        igstRate: info.igstRate,
        igst,
        totalTax: rowTax,
      });
    }

    const finalCgst = Number(matchedOrder.cgstAmount ?? totalCgst);
    const finalSgst = Number(matchedOrder.sgstAmount ?? totalSgst);
    const finalIgst = Number(matchedOrder.igstAmount ?? totalIgst);
    const totalTaxes = finalCgst + finalSgst + finalIgst;

    const rawGrandTotal = subTotal + shippingCharges + otherCharges + totalTaxes;
    const explicitGrandTotal = Number(matchedOrder.grandTotal || matchedOrder.totalOrderPrice || txn.orderGrandTotal || txn.debit || 0);
    const grandTotal = explicitGrandTotal > 0 ? Math.round(explicitGrandTotal) : Math.round(rawGrandTotal);
    const roundOff = Number((grandTotal - rawGrandTotal).toFixed(2));

    const paidAmount = Math.max(Number(matchedOrder.paidAmount ?? matchedOrder.totalPaidAmount ?? matchedOrder.advanceAmount ?? txn.orderPaidAmount ?? txn.credit ?? 0), 0);
    const dueAmount = matchedOrder.balanceDue != null && Number(matchedOrder.balanceDue) <= (grandTotal - paidAmount)
      ? Number(matchedOrder.balanceDue)
      : Math.max(0, grandTotal - paidAmount);
    const amountInWords = numberToWordsINR(grandTotal);

    const bankDetails = wholesaler.bankDetails || {};
    const bankAccountNo = bankDetails.bankAccountNo || bankDetails.accountNo || '0828073000000655';
    const bankIFSC = bankDetails.bankIFSC || bankDetails.ifscCode || 'SIBL0000828';
    const bankName = bankDetails.bankName || 'South Indian Bank Ltd.';
    const bankBranch = bankDetails.bankBranch || bankDetails.branch || 'Siliguri Branch.';

    const renderedItemRows = parsedItems.map((item) => `
      <tr style="border-bottom:1px solid #000000;">
        <td style="border-right:1px solid #000; padding:3px 2px; text-align:center; vertical-align:top; font-size:10px;">${item.sn}</td>
        <td style="border-right:1px solid #000; padding:3px 6px; text-align:left; vertical-align:top;">
          <div style="font-weight:700; font-size:10px; color:#000; text-transform:uppercase;">${item.itemName}</div>
          ${item.rxRef ? `<div style="font-size:9px; color:#334155; margin-top:1px;">${item.rxRef}</div>` : ''}
        </td>
        <td style="border-right:1px solid #000; padding:3px 2px; text-align:center; vertical-align:top; font-weight:700; font-size:10px;">${item.eye}</td>
        <td style="border-right:1px solid #000; padding:3px 2px; text-align:center; vertical-align:top; font-size:10px; font-family:monospace;">${item.sph}</td>
        <td style="border-right:1px solid #000; padding:3px 2px; text-align:center; vertical-align:top; font-size:10px; font-family:monospace;">${item.cyl}</td>
        <td style="border-right:1px solid #000; padding:3px 2px; text-align:center; vertical-align:top; font-size:10px; font-family:monospace;">${item.axis}</td>
        <td style="border-right:1px solid #000; padding:3px 2px; text-align:center; vertical-align:top; font-size:10px; font-family:monospace;">${item.add}</td>
        <td style="border-right:1px solid #000; padding:3px 2px; text-align:center; vertical-align:top; font-size:10px; font-weight:600;">${item.qty}</td>
        <td style="border-right:1px solid #000; padding:3px 4px; text-align:right; vertical-align:top; font-size:10px; font-family:monospace;">${fmtNum(item.price)}</td>
        <td style="border-right:1px solid #000; padding:3px 2px; text-align:center; vertical-align:top; font-size:10px;">${item.discPct || '0'}</td>
        <td style="border-right:1px solid #000; padding:3px 4px; text-align:right; vertical-align:top; font-size:10px; font-family:monospace;">${fmtNum(item.discAmt)}</td>
        <td style="padding:3px 6px; text-align:right; vertical-align:top; font-size:10px; font-weight:700; font-family:monospace;">${fmtNum(item.amt)}</td>
      </tr>
    `).join('');

    const hsnRowsHtml = hsnRows.map(r => `
      <tr style="border-bottom:1px solid #000000;">
        <td style="border-right:1px solid #000; padding:2px 4px; font-family:monospace;">${r.hsn}</td>
        <td style="border-right:1px solid #000; padding:2px 4px; text-align:right; font-family:monospace;">${fmtNum(r.taxable)}</td>
        <td style="border-right:1px solid #000; padding:2px 4px;">${r.sgstRate.toFixed(2)}</td>
        <td style="border-right:1px solid #000; padding:2px 4px; text-align:right; font-family:monospace;">${fmtNum(r.sgst)}</td>
        <td style="border-right:1px solid #000; padding:2px 4px;">${r.cgstRate.toFixed(2)}</td>
        <td style="border-right:1px solid #000; padding:2px 4px; text-align:right; font-family:monospace;">${fmtNum(r.cgst)}</td>
        <td style="border-right:1px solid #000; padding:2px 4px;">${r.igstRate.toFixed(2)}</td>
        <td style="border-right:1px solid #000; padding:2px 4px; text-align:right; font-family:monospace;">${fmtNum(r.igst)}</td>
        <td style="padding:2px 4px; text-align:right; font-weight:700; font-family:monospace;">${fmtNum(r.totalTax)}</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} - ${docNumber}</title>
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
        ${finalLogo ? `<img src="${finalLogo}" alt="Logo" style="max-height:55px; max-width:130px; object-fit:contain;" />` : ''}
      </div>
      <div style="flex:1; text-align:center; padding:0 10px;">
        <div style="font-size:13.5px; font-weight:700; margin-bottom:2px;">${title}</div>
        <div style="font-size:19px; font-weight:800; color:#0284c7; letter-spacing:0.5px; margin-bottom:2px;">${wholesalerName.toUpperCase()}</div>
        <div style="font-size:9.5px; font-weight:600; line-height:1.25; color:#1e293b; white-space:pre-line;">${wholesalerAddress.toUpperCase()}</div>
        <div style="font-size:10px; font-weight:600; color:#1e293b; margin-top:1px;">Contact No. ${wholesalerPhone}</div>
        <div style="font-size:10.5px; font-weight:700; margin-top:2px;">GST No : ${wholesalerGstin}</div>
      </div>
      <div style="width:110px; text-align:right;">
        <div style="font-size:11px; font-weight:700;">Original Copy</div>
      </div>
    </div>

    <!-- Customer & Doc Info 2 Columns -->
    <div style="display:flex; border-bottom:1.5px solid #000000;">
      <!-- Left Column: Party Details -->
      <div style="flex:1.2; padding:6px 10px; border-right:1px solid #000000; font-size:10.5px; line-height:1.35;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="width:85px; font-weight:700; vertical-align:top;">Party Name :</td>
            <td style="font-weight:800; font-size:11.5px; color:#000;">${customerName.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="font-weight:700; vertical-align:top;">Mobile :</td>
            <td style="font-family:monospace; font-weight:600;">${customerPhone}</td>
          </tr>
          ${customerGstin ? `
          <tr>
            <td style="font-weight:700; vertical-align:top;">GST No :</td>
            <td style="font-weight:600; font-family:monospace;">${customerGstin}</td>
          </tr>` : ''}
          <tr>
            <td style="font-weight:700; vertical-align:top;">Address :</td>
            <td style="color:#1e293b;">${customerAddress}</td>
          </tr>
        </table>
      </div>

      <!-- Right Column: Doc Details -->
      <div style="flex:0.8; padding:6px 10px; font-size:10.5px; line-height:1.35;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="width:95px; font-weight:700;">${numberLabel}</td>
            <td style="font-weight:800; font-family:monospace; font-size:11.5px;">${docNumber}</td>
          </tr>
          <tr>
            <td style="font-weight:700;">${dateLabel}</td>
            <td style="font-weight:700; font-family:monospace;">${fmtD(docDate)}</td>
          </tr>
          <tr>
            <td style="font-weight:700;">Delivery Date :</td>
            <td style="font-family:monospace;">${deliveryDate ? fmtD(deliveryDate) : '-'}</td>
          </tr>
          <tr>
            <td style="font-weight:700;">Delivery By :</td>
            <td style="font-weight:600;">${deliveryBy}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Items Table -->
    <table style="width:100%; border-collapse:collapse; border-bottom:1.5px solid #000000;">
      <thead>
        <tr style="background:#ffffff; border-bottom:1px solid #000000; font-size:9.5px; font-weight:700;">
          <th style="width:26px; border-right:1px solid #000; padding:4px 2px; text-align:center;">Sn.</th>
          <th style="border-right:1px solid #000; padding:4px 6px; text-align:left;">Particulars_detail</th>
          <th style="width:26px; border-right:1px solid #000; padding:4px 2px; text-align:center;">Eye</th>
          <th style="width:42px; border-right:1px solid #000; padding:4px 2px; text-align:center;">Sph</th>
          <th style="width:42px; border-right:1px solid #000; padding:4px 2px; text-align:center;">Cyl</th>
          <th style="width:34px; border-right:1px solid #000; padding:4px 2px; text-align:center;">Axis</th>
          <th style="width:42px; border-right:1px solid #000; padding:4px 2px; text-align:center;">Add</th>
          <th style="width:28px; border-right:1px solid #000; padding:4px 2px; text-align:center;">Qty</th>
          <th style="width:55px; border-right:1px solid #000; padding:4px 4px; text-align:right;">Price</th>
          <th style="width:34px; border-right:1px solid #000; padding:4px 2px; text-align:center;">Dis%</th>
          <th style="width:44px; border-right:1px solid #000; padding:4px 4px; text-align:right;">Dis.</th>
          <th style="width:62px; padding:4px 6px; text-align:right;">Amt</th>
        </tr>
      </thead>
      <tbody>
        ${renderedItemRows}
        <!-- Integrated Totals Inside Table Grid -->
        <tr style="border-top:1px solid #000;">
          <td colspan="7" style="border-right:1px solid #000; border-bottom:1px solid #000;"></td>
          <td colspan="4" style="border-right:1px solid #000; border-bottom:1px solid #000; padding:3px 6px; font-weight:700; text-align:right;">Total Value</td>
          <td style="border-bottom:1px solid #000; padding:3px 6px; text-align:right; font-family:monospace; font-weight:600;">${fmtNum(subTotal)}</td>
        </tr>
        <tr style="border-bottom:1px solid #000;">
          <td colspan="7" style="border-right:1px solid #000; border-bottom:1px solid #000;"></td>
          <td colspan="4" style="border-right:1px solid #000; border-bottom:1px solid #000; padding:3px 6px; font-weight:700; text-align:right;">Rounded Off ${roundOff >= 0 ? '(+)' : '(-)'}</td>
          <td style="border-bottom:1px solid #000; padding:3px 6px; text-align:right; font-family:monospace; font-weight:600;">${fmtNum(Math.abs(roundOff))}</td>
        </tr>
        <tr style="border-bottom:1px solid #000;">
          <td colspan="7" style="border-right:1px solid #000; border-bottom:1px solid #000;"></td>
          <td colspan="4" style="border-right:1px solid #000; border-bottom:1px solid #000; padding:3px 6px; font-weight:700; text-align:right;">Freight Charges</td>
          <td style="border-bottom:1px solid #000; padding:3px 6px; text-align:right; font-family:monospace; font-weight:600;">${fmtNum(shippingCharges)}</td>
        </tr>
        ${otherCharges !== 0 ? `
        <tr style="border-bottom:1px solid #000;">
          <td colspan="7" style="border-right:1px solid #000; border-bottom:1px solid #000;"></td>
          <td colspan="4" style="border-right:1px solid #000; border-bottom:1px solid #000; padding:3px 6px; font-weight:700; text-align:right;">Other Charges</td>
          <td style="border-bottom:1px solid #000; padding:3px 6px; text-align:right; font-family:monospace; font-weight:600;">${fmtNum(otherCharges)}</td>
        </tr>` : ''}
        ${finalCgst > 0 ? `
        <tr style="border-bottom:1px solid #000;">
          <td colspan="7" style="border-right:1px solid #000; border-bottom:1px solid #000;"></td>
          <td colspan="4" style="border-right:1px solid #000; border-bottom:1px solid #000; padding:3px 6px; font-weight:700; text-align:right;">CGST</td>
          <td style="border-bottom:1px solid #000; padding:3px 6px; text-align:right; font-family:monospace; font-weight:600;">${fmtNum(finalCgst)}</td>
        </tr>` : ''}
        ${finalSgst > 0 ? `
        <tr style="border-bottom:1px solid #000;">
          <td colspan="7" style="border-right:1px solid #000; border-bottom:1px solid #000;"></td>
          <td colspan="4" style="border-right:1px solid #000; border-bottom:1px solid #000; padding:3px 6px; font-weight:700; text-align:right;">SGST</td>
          <td style="border-bottom:1px solid #000; padding:3px 6px; text-align:right; font-family:monospace; font-weight:600;">${fmtNum(finalSgst)}</td>
        </tr>` : ''}
        ${finalIgst > 0 ? `
        <tr style="border-bottom:1px solid #000;">
          <td colspan="7" style="border-right:1px solid #000; border-bottom:1px solid #000;"></td>
          <td colspan="4" style="border-right:1px solid #000; border-bottom:1px solid #000; padding:3px 6px; font-weight:700; text-align:right;">IGST</td>
          <td style="border-bottom:1px solid #000; padding:3px 6px; text-align:right; font-family:monospace; font-weight:600;">${fmtNum(finalIgst)}</td>
        </tr>` : ''}
        <tr style="font-weight:800; font-size:10.5px; border-bottom:1.5px solid #000000;">
          <td colspan="7" style="border-right:1px solid #000; padding:4px 6px; text-align:center;">Total</td>
          <td style="border-right:1px solid #000; padding:4px 2px; text-align:center;">${totalQty}</td>
          <td colspan="3" style="border-right:1px solid #000;"></td>
          <td style="padding:4px 6px; text-align:right; font-family:monospace;">${fmtNum(grandTotal)}</td>
        </tr>
      </tbody>
    </table>

    <!-- HSN Summary Table -->
    <table style="width:100%; border-collapse:collapse; border-bottom:1.5px solid #000000; font-size:9px; text-align:center;">
      <thead>
        <tr style="border-bottom:1px solid #000; font-weight:700;">
          <th style="border-right:1px solid #000; padding:2px 4px;">HSN</th>
          <th style="border-right:1px solid #000; padding:2px 4px;">Taxable</th>
          <th style="border-right:1px solid #000; padding:2px 4px;">SGST %</th>
          <th style="border-right:1px solid #000; padding:2px 4px;">SGST</th>
          <th style="border-right:1px solid #000; padding:2px 4px;">CGST %</th>
          <th style="border-right:1px solid #000; padding:2px 4px;">CGST</th>
          <th style="border-right:1px solid #000; padding:2px 4px;">IGST %</th>
          <th style="border-right:1px solid #000; padding:2px 4px;">IGST</th>
          <th style="padding:2px 4px;">Total.Tax</th>
        </tr>
      </thead>
      <tbody>
        ${hsnRowsHtml}
        <tr style="border-top:1px solid #000; font-weight:700;">
          <td style="border-right:1px solid #000; padding:2px 4px;">Total</td>
          <td style="border-right:1px solid #000; padding:2px 4px; text-align:right; font-family:monospace;">${fmtNum(totalTaxable)}</td>
          <td style="border-right:1px solid #000; padding:2px 4px;"></td>
          <td style="border-right:1px solid #000; padding:2px 4px; text-align:right; font-family:monospace;">${fmtNum(totalSgst)}</td>
          <td style="border-right:1px solid #000; padding:2px 4px;"></td>
          <td style="border-right:1px solid #000; padding:2px 4px; text-align:right; font-family:monospace;">${fmtNum(totalCgst)}</td>
          <td style="border-right:1px solid #000; padding:2px 4px;"></td>
          <td style="border-right:1px solid #000; padding:2px 4px; text-align:right; font-family:monospace;">${fmtNum(totalIgst)}</td>
          <td style="padding:2px 4px; text-align:right; font-family:monospace;">${fmtNum(totalTaxes)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Bottom Section: Words, Terms, Bank, QR Code, Signature -->
    <div style="display:flex; padding:6px 10px; font-size:9.5px;">
      <!-- Left Column -->
      <div style="flex:1.2; padding-right:15px; border-right:1px solid #000000;">
        <div style="margin-bottom:5px;">
          <span style="font-weight:700;">Total ${isChallan ? 'Challan' : 'Invoice'} value ( In Words ) :</span><br>
          <span style="font-weight:800; font-size:10px;">${amountInWords}</span>
        </div>
        <div style="margin-bottom:6px;">
          <span style="font-weight:700; text-decoration:underline;">Terms & Condition</span>
          <div style="font-size:8.5px; color:#1e293b; line-height:1.3; margin-top:1px;">
            1.Bills Generated are to be paid in Full. 2.Goods once sold will not be returned back 3.Interest @18% will be charged after the expiry of due date. 4.Cheque dishonour will attract a Penality.
          </div>
        </div>
        <div>
          <span style="font-weight:700; text-decoration:underline;">Bank Details :</span>
          <div style="font-size:9px; line-height:1.3; margin-top:1px;">
            <strong>${wholesalerName.toUpperCase()},</strong><br>
            Account No- ${bankAccountNo}<br>
            IFSC- ${bankIFSC}<br>
            ${bankName},<br>
            ${bankBranch}
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div style="flex:0.8; padding-left:15px; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; justify-content:space-between; font-size:10.5px; margin-bottom:2px;">
            <span style="font-weight:700;">Paid Amount :</span>
            <span style="font-weight:700; font-family:monospace;">${fmtNum(paidAmount)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:10.5px; margin-bottom:4px;">
            <span style="font-weight:700;">Due Amount :</span>
            <span style="font-weight:800; font-family:monospace; color:${dueAmount > 0 ? '#b91c1c' : '#15803d'};">${fmtNum(dueAmount)}</span>
          </div>
        </div>

        <div style="text-align:right; margin-top:15px;">
          <div style="font-size:11px; font-weight:800; color:#0284c7;">${wholesalerName.toUpperCase()}</div>
          <div style="font-size:9.5px; font-weight:700; margin-top:28px;">Authorised Signatory</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  // Generate Order Tax Invoice HTML (matches original backend deliveryChallanTemplate.js renderOpticalDocumentHTML INVOICE design)
  const generateOrderInvoiceHTML = (txn) => {
    return renderOpticalDocumentHTML(txn, 'INVOICE');
  };

  // Generate Order Delivery Challan HTML (matches original backend deliveryChallanTemplate.js renderOpticalDocumentHTML CHALLAN design)
  const generateOrderChallanHTML = (txn) => {
    return renderOpticalDocumentHTML(txn, 'CHALLAN');
  };

  // Top Bar Action: Print Statement
  const handlePrint = () => {
    const safeName = (cust.shopName || cust.ownerName || 'Customer').replace(/[^a-z0-9]/gi, '-');
    const html = generateStatementHTML();
    printHTMLDocument(html, `Customer-Ledger-Statement-${safeName}`);
  };

  const [downloadingDocId, setDownloadingDocId] = useState(null);
  const [downloadingChallanId, setDownloadingChallanId] = useState(null);
  const [downloadingStatement, setDownloadingStatement] = useState(false);

  // 1. Download / Print Ledger Statement
  const handleDownloadLedgerStatement = () => {
    const safeName = (cust.shopName || cust.ownerName || 'Customer').replace(/[^a-z0-9]/gi, '-');
    const html = generateStatementHTML();
    printHTMLDocument(html, `Customer-Ledger-Statement-${safeName}`);
    toast.success('Customer Ledger Statement opened in print / save as PDF dialog!');
  };

  // 2. Download / Print Order Delivery Challan
  const handleDownloadOrderChallan = (txn) => {
    const orderNumber = txn.orderNumber || txn.referenceNumber || txn.orderId || 'Order';
    const html = generateOrderChallanHTML(txn);
    printHTMLDocument(html, `Delivery-Challan-${orderNumber}`);
    toast.success(`Delivery Challan #${orderNumber} opened in print / save as PDF dialog!`);
  };

  // 3. Download / Print Order Tax Invoice
  const handleDownloadOrderInvoice = (txn) => {
    const orderNumber = txn.orderNumber || txn.referenceNumber || txn.orderId || 'Order';
    const html = generateOrderInvoiceHTML(txn);
    printHTMLDocument(html, `Tax-Invoice-${orderNumber}`);
    toast.success(`Tax Invoice #${orderNumber} opened in print / save as PDF dialog!`);
  };

  // 4. Download / Print Payment Receipt
  const handleDownloadReceipt = (txnOrPayment) => {
    let identifier = txnOrPayment.referenceNumber || txnOrPayment.paymentNumber || txnOrPayment.paymentId || txnOrPayment.voucherId || txnOrPayment.orderNumber || 'RCP';
    const html = generatePaymentReceiptHTML(txnOrPayment);
    printHTMLDocument(html, `Payment-Receipt-${identifier}`);
    toast.success(`Payment Receipt #${identifier} opened in print / save as PDF dialog!`);
  };

  const handleAutoAdjustAdvance = async () => {
    if (maxAdjustable <= 0) return;
    try {
      setAdjusting(true);
      const res = await adjustDueFromAdvance({ customerId, amount: maxAdjustable });
      toast.success(res.message || `₹${maxAdjustable.toLocaleString()} adjusted successfully from Advance!`);
      await fetchStatement();
    } catch (err) {
      toast.error(err.message || 'Failed to adjust advance');
    } finally {
      setAdjusting(false);
    }
  };

  const handleSendDueReminder = async () => {
    if (creditUsed <= 0) {
      toast.info('Customer has no outstanding balance due.');
      return;
    }
    const customerTitle = cust.shopName || cust.ownerName || 'Customer';
    const confirmed = window.confirm(
      `Send payment reminder for ₹${creditUsed.toLocaleString('en-IN')} to ${customerTitle}?`
    );
    if (!confirmed) return;

    try {
      setSendingReminder(true);
      const res = await sendPaymentDueReminder({ partyId: customerId, entityType: 'Customer' });
      toast.success(res.message || 'Payment due reminder sent successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to send payment due reminder');
    } finally {
      setSendingReminder(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1320, mx: 'auto' }}>
      {/* Top Header Bar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          mb: 3,
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/accounting/customer-ledgers')}
            startIcon={<Icon icon="lucide:arrow-left" fontSize={16} />}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              color: '#475569',
              borderColor: '#CBD5E1',
              fontWeight: 600,
              fontSize: '0.8125rem'
            }}
          >
            Back
          </Button>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
              Customer Ledger Statement
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              Ledger transactions, live balance history, order status & part-payment records
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
          {maxAdjustable > 0 && (
            <Button
              variant="outlined"
              color="secondary"
              disabled={adjusting}
              onClick={handleAutoAdjustAdvance}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem' }}
            >
              {adjusting ? 'Adjusting...' : `Auto-Adjust (₹${maxAdjustable.toLocaleString()})`}
            </Button>
          )}

          {creditUsed > 0 && (
            <Button
              variant="outlined"
              color="warning"
              disabled={sendingReminder}
              onClick={handleSendDueReminder}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem' }}
            >
              {sendingReminder ? 'Sending...' : 'Send Reminder'}
            </Button>
          )}

          <Button
            variant="contained"
            color="success"
            onClick={() => {
              setSelectedOrderForPayment(null);
              setPaymentModalOpen(true);
            }}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem' }}
          >
            Receive Payment
          </Button>

          <Button
            variant="outlined"
            onClick={handlePrint}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
              color: '#475569',
              borderColor: '#CBD5E1',
              fontSize: '0.8125rem'
            }}
          >
            Print
          </Button>

          <Button
            variant="contained"
            disabled={downloadingStatement}
            onClick={handleDownloadLedgerStatement}
            startIcon={<Icon icon="lucide:file-down" width={16} />}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
              backgroundColor: '#4338CA',
              '&:hover': { backgroundColor: '#3730A3' },
              fontSize: '0.8125rem',
              color: '#FFFFFF'
            }}
          >
            {downloadingStatement ? 'Downloading...' : 'Download Statement'}
          </Button>
        </Box>
      </Box>

      {/* Credit Limit Alert Banners */}
      {isExceededAlert && (
        <Alert
          severity="error"
          variant="outlined"
          sx={{
            mb: 2.5,
            borderRadius: '10px',
            backgroundColor: '#FEF2F2',
            borderColor: '#FCA5A5',
            fontWeight: 500
          }}
          action={
            <Button
              color="error"
              size="small"
              variant="contained"
              onClick={() => {
                setSelectedOrderForPayment(null);
                setPaymentModalOpen(true);
              }}
              sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '6px' }}
            >
              Collect Due Now
            </Button>
          }
        >
          Credit Limit Exceeded: Customer has utilized ₹{creditUsed.toLocaleString()} which exceeds the sanctioned limit of ₹{creditLimit.toLocaleString()} by ₹{exceededAmount.toLocaleString()}.
        </Alert>
      )}

      {is20PercentAlert && !isExceededAlert && (
        <Alert
          severity="warning"
          variant="outlined"
          sx={{
            mb: 2.5,
            borderRadius: '10px',
            backgroundColor: '#FFFBEB',
            borderColor: '#FDE68A',
            fontWeight: 500
          }}
        >
          20% Threshold Warning: Customer has reached {creditPercentage}% credit limit usage. Only ₹{availableCredit.toLocaleString()} limit remaining.
        </Alert>
      )}

      {/* Customer Profile Card */}
      {summary.customer && (
        <Card
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            mb: 3,
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF'
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={7}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A' }}>
                  {summary.customer?.shopName || summary.customer?.ownerName}
                </Typography>
                {isGST ? (
                  <Chip
                    label={`GST (${cust.gstin || cust.gstNumber || 'Registered'})`}
                    size="small"
                    sx={{
                      backgroundColor: '#ECFDF5',
                      color: '#065F46',
                      border: '1px solid #A7F3D0',
                      fontWeight: 600,
                      fontSize: '0.75rem'
                    }}
                  />
                ) : (
                  <Chip
                    label="Non-GST Customer"
                    size="small"
                    sx={{
                      backgroundColor: '#F8FAFC',
                      color: '#64748B',
                      border: '1px solid #E2E8F0',
                      fontWeight: 600,
                      fontSize: '0.75rem'
                    }}
                  />
                )}
              </Box>

              <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
                Owner: <strong>{summary.customer?.ownerName || 'N/A'}</strong> | Mobile: <strong>{summary.customer?.mobile || 'N/A'}</strong> | Email: <strong>{summary.customer?.email || 'N/A'}</strong>
              </Typography>
              {summary.customer?.address && (
                <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 0.25 }}>
                  Address: {formatAddress(summary.customer?.address)}
                </Typography>
              )}

              {/* Credit Limit & Utilization */}
              <Box sx={{ mt: 2, p: 2, backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75, flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569' }}>
                    Credit Limit: <strong>₹{creditLimit.toLocaleString()}</strong> ({master.creditDays || 30} Days Window)
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      color: creditStatus === 'EXCEEDED' ? '#DC2626' : creditStatus === 'WARNING_20_PERCENT' ? '#D97706' : '#16A34A'
                    }}
                  >
                    {creditStatus === 'EXCEEDED'
                      ? `Exceeded (${creditPercentage}% used)`
                      : creditStatus === 'WARNING_20_PERCENT'
                        ? `20% Warning (${creditPercentage}% used)`
                        : `Safe (${creditPercentage}% used)`}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, creditPercentage)}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#E2E8F0',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: creditStatus === 'EXCEEDED' ? '#EF4444' : creditStatus === 'WARNING_20_PERCENT' ? '#F59E0B' : '#10B981'
                    }
                  }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.72rem' }}>
                    Credit Used: ₹{creditUsed.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#0284C7', fontWeight: 600, fontSize: '0.72rem' }}>
                    Available Limit: ₹{availableCredit.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={5} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Typography variant="caption" sx={{ color: '#64748B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
                CURRENT NET POSITION
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: creditUsed > 0 ? '#E11D48' : advanceAmount > 0 ? '#059669' : '#64748B',
                  mt: 0.5,
                  fontSize: { xs: '1.75rem', sm: '2.1rem' }
                }}
              >
                {creditUsed > 0
                  ? `₹${creditUsed.toLocaleString()} (Due)`
                  : advanceAmount > 0
                    ? `₹${advanceAmount.toLocaleString()} (Advance)`
                    : '₹0 (Settled)'}
              </Typography>
              <Chip
                size="small"
                label={creditUsed > 0 ? 'Pending Payment Due' : advanceAmount > 0 ? 'Advance Credit Available' : 'All Clear / Settled'}
                sx={{
                  mt: 1,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  backgroundColor: creditUsed > 0 ? '#FEF2F2' : advanceAmount > 0 ? '#ECFDF5' : '#F8FAFC',
                  color: creditUsed > 0 ? '#991B1B' : advanceAmount > 0 ? '#065F46' : '#64748B',
                  border: '1px solid',
                  borderColor: creditUsed > 0 ? '#FECDD3' : advanceAmount > 0 ? '#A7F3D0' : '#E2E8F0'
                }}
              />
            </Grid>
          </Grid>
        </Card>
      )}

      {/* 4 Financial Stat Cards */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>Total Credit Due</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#E11D48', mt: 0.25 }}>
              ₹{creditUsed.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>Total Invoiced</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A', mt: 0.25 }}>
              ₹{Number(displayTotalInvoiced || 0).toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>Total Received</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#059669', mt: 0.25 }}>
              ₹{Number(displayTotalReceived || 0).toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>Advance Available</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0284C7', mt: 0.25 }}>
              ₹{advanceAmount.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Monthly Summary - Collapsible */}
      <Card elevation={0} sx={{ mb: 3, borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
        <Box
          sx={{
            p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer', '&:hover': { backgroundColor: '#FAFBFC' },
            borderBottom: showMonthlySummary ? '1px solid #E2E8F0' : 'none'
          }}
          onClick={() => setShowMonthlySummary(!showMonthlySummary)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Icon icon="lucide:calendar-range" style={{ color: '#0284C7', fontSize: 18 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>Monthly Breakdown Summary</Typography>
            <Chip size="small" label={`${monthlyBreakdown.length} months`} sx={{ fontSize: '0.68rem', height: 20 }} />
          </Box>
          <IconButton size="small" sx={{ color: '#64748B' }}>
            <Icon icon={showMonthlySummary ? 'lucide:chevron-up' : 'lucide:chevron-down'} />
          </IconButton>
        </Box>
        <Collapse in={showMonthlySummary}>
          {monthlyBreakdown.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.78rem' }}>Month &amp; Year</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.78rem' }}>Invoiced Sales (₹)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.78rem' }}>Collections (₹)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.78rem' }}>Net Movement (₹)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.78rem' }}>Txns</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.78rem' }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {monthlyBreakdown.map((mb) => {
                    const isNetPositive = mb.netMovement > 0;
                    return (
                      <TableRow key={mb.month} hover>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#0F172A' }}>{mb.monthLabel || mb.month}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: '#E11D48', fontSize: '0.8rem' }}>₹{Number(mb.totalDebit || 0).toLocaleString()}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: '#059669', fontSize: '0.8rem' }}>₹{Number(mb.totalCredit || 0).toLocaleString()}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: isNetPositive ? '#E11D48' : '#059669', fontSize: '0.8rem' }}>
                          {isNetPositive ? `+₹${mb.netMovement.toLocaleString()} (Added)` : `-₹${Math.abs(mb.netMovement).toLocaleString()} (Cleared)`}
                        </TableCell>
                        <TableCell align="center"><Chip size="small" label={`${mb.transactionsCount}`} sx={{ fontSize: '0.68rem', height: 20 }} /></TableCell>
                        <TableCell align="center">
                          <Button size="small" variant="text" onClick={(e) => { e.stopPropagation(); handleFilterMonth(mb.month); }}
                            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', color: '#0284C7' }}>
                            View Month
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#64748B' }}>No monthly data recorded yet.</Typography>
            </Box>
          )}
        </Collapse>
      </Card>

      <Box>
        {/* Date Filter Bar */}
        <Card elevation={0} sx={{ p: 2, mb: 3, borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
          <Grid container spacing={1.5} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                type="date"
                label="From Date"
                size="small"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                type="date"
                label="To Date"
                size="small"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
            <Grid item xs={6} sm={2}>
              <Button
                variant="contained"
                onClick={() => fetchStatement(filters)}
                fullWidth
                sx={{ borderRadius: '8px', textTransform: 'none', height: 40, backgroundColor: '#0284C7', fontWeight: 600 }}
              >
                Apply
              </Button>
            </Grid>
            <Grid item xs={6} sm={2}>
              <Button
                variant="outlined"
                onClick={() => {
                  const clear = { startDate: '', endDate: '' };
                  setFilters(clear);
                  fetchStatement(clear);
                }}
                fullWidth
                sx={{ borderRadius: '8px', textTransform: 'none', height: 40, color: '#64748B', borderColor: '#CBD5E1', fontWeight: 600 }}
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </Card>

        {/* Table */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={32} />
          </Box>
        ) : unifiedTransactions.length === 0 ? (
          <Card elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              No transactions found for this customer ledger in the selected date range.
            </Typography>
          </Card>
        ) : (
          <TableContainer component={Paper} elevation={0}
            sx={{ borderRadius: '10px', border: '1px solid #E2E8F0', overflowX: 'auto', width: '100%' }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon icon="lucide:book-open" style={{ color: '#0284C7', fontSize: 16 }} />
                Unified Ledger — {unifiedTransactions.length} Entries | {orders.length} Wholesale Orders
              </Typography>
              {filters.startDate && (
                <Chip size="small" label={`Filtered: ${filters.startDate} → ${filters.endDate || 'Now'}`}
                  onDelete={() => { const c = { startDate: '', endDate: '' }; setFilters(c); fetchStatement(c); }}
                  sx={{ fontSize: '0.68rem', height: 22 }} />
              )}
            </Box>
            <Table sx={{ minWidth: 1100 }}>
              <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ width: 44, p: 0.5, textAlign: 'center' }} />
                  <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>Ref / Invoice #</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>Customer &amp; Vendor</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>Order Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>Debit (₹)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>Credit (₹)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>Balance</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem', minWidth: 120 }}>Payment Progress</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {unifiedTransactions.map((txn, idx) => {
                  const rowKey = txn._id || txn.voucherId || txn.referenceNumber || idx;
                  const isPayment = Boolean(
                    (txn.referenceNumber && txn.referenceNumber.startsWith('CPAY')) ||
                    txn.voucherType === 'Receipt' ||
                    txn.voucherType === 'Advance' ||
                    (!txn.voucherType?.toLowerCase().includes('invoice') && Number(txn.credit) > 0 && !txn.referenceNumber?.startsWith('BO-'))
                  );
                  const isOrder = !isPayment && Boolean(
                    (txn.referenceNumber && txn.referenceNumber.startsWith('BO-')) ||
                    txn.voucherType === 'Sales Invoice' ||
                    txn.voucherType === 'Invoice' ||
                    txn.orderStatus ||
                    (txn.orderGrandTotal != null && Number(txn.orderGrandTotal) > 0)
                  );
                  const orderTotal = Number(txn.orderGrandTotal != null ? txn.orderGrandTotal : txn.debit || 0);
                  const matchedOrder = ordersMap[String(txn.orderId)] || ordersMap[txn.orderNumber] || ordersMap[txn.referenceNumber] || null;
                  const paymentsList = (Array.isArray(txn.orderPayments) && txn.orderPayments.length > 0) ? txn.orderPayments : (matchedOrder?.orderPayments || []);
                  const paidAmount = Math.max(Number(txn.orderPaidAmount != null ? txn.orderPaidAmount : (matchedOrder?.orderPaidAmount || 0)), Number(txn.credit || 0));
                  const pdcWaitingAmount = Number(txn.pdcWaitingAmount || matchedOrder?.pdcWaitingAmount || 0);
                  const dueAmount = txn.orderBalanceDue != null && Number(txn.orderBalanceDue) <= (orderTotal - paidAmount)
                    ? Number(txn.orderBalanceDue)
                    : Math.max(0, orderTotal - paidAmount);
                  const orderBadge = getStatusBadge(txn.orderStatus);
                  const hasParts = paymentsList.length > 0;
                  const isExpanded = expandedRowId === rowKey;
                  const orderItems = txn.items?.length > 0 ? txn.items : (matchedOrder?.items || []);
                  const pct = orderTotal > 0 ? Math.min(100, Math.round((paidAmount / orderTotal) * 100)) : 0;
                  const isFullyPaid = dueAmount <= 0 && isOrder;
                  const isPartPaid = paidAmount > 0 && dueAmount > 0;

                  // Exact same condition as Orders page (AllOrdersList.jsx): customer.billingMode === 'DC'
                  const isDC = Boolean(
                    (matchedOrder?.customer?.billingMode && matchedOrder.customer.billingMode.toUpperCase() === 'DC') ||
                    (matchedOrder?.billingMode && matchedOrder.billingMode.toUpperCase() === 'DC') ||
                    (cust?.billingMode && cust.billingMode.toUpperCase() === 'DC') ||
                    (cust?.billToAddress?.billingMode && cust.billToAddress.billingMode.toUpperCase() === 'DC') ||
                    (txn?.billingMode && txn.billingMode.toUpperCase() === 'DC') ||
                    (txn?.hasChallan && !txn?.hasInvoice) ||
                    (txn?.challanUrl && !txn?.invoiceUrl)
                  );

                  // Determine entry type
                  let entryType = txn.description || txn.voucherType || 'Entry';
                  let typeBadge = { bg: '#F3F4F6', text: '#6B7280' };
                  if (isOrder) {
                    entryType = isDC ? 'Delivery Challan' : 'Sale Invoice';
                    typeBadge = isDC ? { bg: '#E0F2FE', text: '#0369A1' } : { bg: '#EEF2FF', text: '#4338CA' };
                  } else if (isPayment) {
                    entryType = txn.voucherType === 'Advance' ? 'Advance' : 'Payment';
                    typeBadge = { bg: '#ECFDF5', text: '#065F46' };
                  }

                  const hasExpandableContent = hasParts || (isOrder && orderItems.length > 0) || isOrder;

                  return (
                    <React.Fragment key={rowKey}>
                      <TableRow hover sx={{ backgroundColor: isExpanded ? '#F0F9FF' : 'inherit' }}>
                        {/* Expand Arrow */}
                        <TableCell sx={{ width: 44, p: 0.5, textAlign: 'center' }}>
                          {hasExpandableContent ? (
                            <IconButton size="small" onClick={() => toggleExpandRow(rowKey)}
                              sx={{ color: isExpanded ? '#0284C7' : '#64748B', p: 0.5 }}
                              title={isExpanded ? 'Hide details' : 'View order items, vendor, & payment details'}>
                              <Icon icon={isExpanded ? 'solar:alt-arrow-down-bold' : 'solar:alt-arrow-right-bold'} width={16} />
                            </IconButton>
                          ) : null}
                        </TableCell>

                        {/* Date */}
                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#475569' }}>
                          {txn.orderDate || txn.transactionDate ? new Date(txn.orderDate || txn.transactionDate).toLocaleDateString('en-IN') : '—'}
                        </TableCell>

                        {/* Ref / Invoice # */}
                        <TableCell sx={{ minWidth: 160, fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem', color: '#0F172A' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                            <span>{txn.referenceNumber || txn.voucherId || '0'}</span>
                            {hasParts && (
                              <Chip size="small" label={`${paymentsList.length} ${paymentsList.length === 1 ? 'Pay' : 'Pays'}`}
                                onClick={() => toggleExpandRow(rowKey)}
                                sx={{
                                  height: 18, fontSize: '0.62rem', fontWeight: 600,
                                  backgroundColor: isExpanded ? '#BAE6FD' : '#E0F2FE', color: '#0369A1', cursor: 'pointer'
                                }} />
                            )}
                            {pdcWaitingAmount > 0 && (
                              <Tooltip title={`Post-Dated Cheque waiting for clearance: ₹${pdcWaitingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} arrow>
                                <Chip size="small"
                                  icon={<Icon icon="lucide:clock" width={11} />}
                                  label={`PDC: ₹${pdcWaitingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Waiting`}
                                  onClick={() => toggleExpandRow(rowKey)}
                                  sx={{
                                    height: 18, fontSize: '0.62rem', fontWeight: 700,
                                    backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', cursor: 'pointer'
                                  }} />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>

                        {/* Type */}
                        <TableCell>
                          <Chip size="small" label={entryType}
                            sx={{
                              height: 20, fontSize: '0.68rem', fontWeight: 600,
                              backgroundColor: typeBadge.bg, color: typeBadge.text
                            }} />
                        </TableCell>

                        {/* Customer & Vendor */}
                        <TableCell sx={{ minWidth: 170 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.78rem', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {txn.customerName || cust.shopName || cust.ownerName || 'Customer'}
                          </Typography>
                          {/* <Typography variant="caption" sx={{ color: '#0284C7', fontWeight: 500, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Icon icon="solar:shop-2-bold" width={11} />
                              {txn.vendorName || summary.wholesaler?.companyName || 'Digi-Optics'}
                            </Typography> */}
                        </TableCell>

                        {/* Status */}
                        <TableCell sx={{ minWidth: 120 }}>
                          {txn.orderStatus ? (
                            <Chip size="small" label={txn.orderStatus}
                              sx={{
                                backgroundColor: orderBadge.bg, color: orderBadge.text,
                                fontWeight: 600, fontSize: '0.68rem', height: 20
                              }} />
                          ) : isPayment ? (
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                              <Chip size="small" label="Received"
                                sx={{
                                  backgroundColor: '#DCFCE7', color: '#15803D',
                                  fontWeight: 600, fontSize: '0.68rem', height: 20
                                }} />
                              <Chip size="small"
                                label={
                                  txn.paymentMode === 'ADVANCE_ADJUSTMENT' ? 'Advance' :
                                    txn.paymentMode === 'UPI' ? 'UPI' :
                                      txn.paymentMode === 'CASH' ? 'Cash' :
                                        txn.paymentMode === 'BANK_TRANSFER' ? 'Bank' :
                                          (txn.narration?.toLowerCase().includes('upi') ? 'UPI' : txn.narration?.toLowerCase().includes('cash') ? 'Cash' : 'Bank')
                                }
                                sx={{
                                  backgroundColor: '#EFF6FF', color: '#1D4ED8',
                                  fontWeight: 600, fontSize: '0.62rem', height: 18
                                }} />
                            </Box>
                          ) : (
                            <Chip size="small" label="Completed" sx={{ backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 600, fontSize: '0.68rem', height: 20 }} />
                          )}
                        </TableCell>

                        {/* Debit */}
                        <TableCell align="right" sx={{ fontWeight: 600, color: '#0F172A', fontSize: '0.8rem' }}>
                          {orderTotal > 0 && isOrder ? `₹${orderTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : Number(txn.debit || 0) > 0 ? `₹${Number(txn.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00'}
                        </TableCell>

                        {/* Credit */}
                        <TableCell align="right" sx={{ fontWeight: 700, color: (isOrder ? paidAmount > 0 : Number(txn.credit || 0) > 0) ? '#059669' : '#94A3B8', fontSize: '0.8rem' }}>
                          {isOrder
                            ? (paidAmount > 0 ? `₹${paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00')
                            : (Number(txn.credit || 0) > 0 ? `₹${Number(txn.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00')}
                        </TableCell>

                        {/* Balance */}
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                          {isOrder ? (
                            isFullyPaid ? (
                              <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.82rem' }}>
                                Paid
                              </span>
                            ) : (
                              <span style={{ color: '#E11D48', fontWeight: 700, fontSize: '0.82rem' }}>
                                ₹{dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Due)
                              </span>
                            )
                          ) : (
                            <span style={{ color: (Number(txn.runningBalance) < 0 || Number(txn.credit) > 0) ? '#059669' : Number(txn.runningBalance) > 0 ? '#E11D48' : '#64748B' }}>
                              {txn.runningBalance != null && txn.runningBalance !== 0
                                ? (txn.runningBalance < 0
                                    ? `₹${Number(Math.abs(txn.runningBalance)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Adv)`
                                    : `₹${Number(txn.runningBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Due)`)
                                : (Number(txn.credit) > 0 ? `₹${Number(txn.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Adv)` : '₹0.00')}
                            </span>
                          )}
                        </TableCell>

                        {/* Payment Progress */}
                        <TableCell sx={{ minWidth: 120 }}>
                          {isOrder ? (
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
                            <Chip size="small" label="100% Received" sx={{ backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 600, fontSize: '0.65rem', height: 20 }} />
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            {(paidAmount > 0 || hasParts || isPayment) && (
                              <Tooltip title="Download Payment Receipt" arrow>
                                <span>
                                  <IconButton size="small" onClick={() => handleDownloadReceipt(txn)}
                                    disabled={downloadingReceiptId === (txn.orderId || txn.voucherId || txn._id)}
                                    sx={{ color: '#059669', p: 0.5, backgroundColor: '#ECFDF5', '&:hover': { backgroundColor: '#D1FAE5' } }}>
                                    <Icon icon="lucide:receipt" width={15} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                            {isOrder && (
                              isDC ? (
                                <Tooltip title="Download Delivery Challan" arrow>
                                  <span>
                                    <IconButton size="small" onClick={() => handleDownloadOrderChallan(txn)}
                                      disabled={downloadingChallanId === (txn.orderId || txn.voucherId)}
                                      sx={{ color: '#0284C7', p: 0.5, backgroundColor: '#F0F9FF', '&:hover': { backgroundColor: '#E0F2FE' } }}>
                                      <Icon icon="lucide:truck" width={15} />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              ) : (
                                <Tooltip title="Download Order Invoice" arrow>
                                  <span>
                                    <IconButton size="small" onClick={() => handleDownloadOrderInvoice(txn)}
                                      disabled={downloadingDocId === (txn.orderId || txn.voucherId)}
                                      sx={{ color: '#0D9488', p: 0.5, backgroundColor: '#F0FDFA', '&:hover': { backgroundColor: '#CCFBF1' } }}>
                                      <Icon icon="solar:bill-list-bold" width={15} />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )
                            )}
                            <Tooltip title="Download Ledger Statement" arrow>
                              <span>
                                <IconButton size="small" onClick={handleDownloadLedgerStatement}
                                  disabled={downloadingStatement}
                                  sx={{ color: '#4338CA', p: 0.5, backgroundColor: '#EEF2FF', '&:hover': { backgroundColor: '#E0E7FF' } }}>
                                  <Icon icon="lucide:book-open" width={15} />
                                </IconButton>
                              </span>
                            </Tooltip>
                            {isOrder && dueAmount > 0 && (
                              <Tooltip title={`Pay ₹${dueAmount.toLocaleString()} due`} arrow>
                                <Button size="small" variant="outlined" color="success"
                                  onClick={() => handleOpenPartPayment(matchedOrder || { orderId: txn.orderId, orderNumber: txn.orderNumber, grandTotal: orderTotal, paidAmount, balanceDue: dueAmount })}
                                  sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.68rem', borderRadius: '6px', px: 1, py: 0.25, minWidth: 'auto' }}>
                                  Pay
                                </Button>
                              </Tooltip>
                            )}
                            {isOrder && txn.orderId && (
                              <Tooltip title="View Order Details" arrow>
                                <IconButton size="small" onClick={() => navigate(`/orders/${txn.orderId}`)}
                                  sx={{ color: '#64748B', p: 0.5 }}>
                                  <Icon icon="lucide:external-link" width={14} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>

                      {/* Expandable Details: Order Items + Parties + Payment Installments */}
                      {hasExpandableContent && (
                        <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                          <TableCell colSpan={11} sx={{ py: 0, px: 2, borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none' }}>
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box sx={{ py: 2, px: 2, my: 1.5, backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #CBD5E1', borderLeft: '4px solid #0284C7', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

                                {/* Parties Meta Box: Customer (Buyer) & Wholesaler (Vendor) */}
                                <Box sx={{ mb: 2, p: 1.5, backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                                  <Box>
                                    <Typography variant="caption" sx={{ color: '#0284C7', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', display: 'block' }}>
                                      Buyer (Customer Details)
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A', fontSize: '0.8rem' }}>
                                      {txn.customerName || cust.shopName || cust.ownerName || 'Customer'}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>
                                      Owner: {cust.ownerName || 'N/A'} | Mob: {cust.mobile || 'N/A'} | GST: {cust.gstin || (cust.isGSTRegistered ? 'Registered' : 'Non-GST')}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', display: 'block' }}>
                                      Seller (Wholesaler / Vendor)
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A', fontSize: '0.8rem' }}>
                                      {txn.vendorName || summary.wholesaler?.companyName}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>
                                      Sales Person: {txn.createdByName || 'Sales Staff'} | {summary.wholesaler?.phone ? `Contact: ${summary.wholesaler.phone}` : ''}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {(paidAmount > 0 || hasParts || isPayment) && (
                                      <Button
                                        size="small"
                                        variant="contained"
                                        startIcon={<Icon icon="lucide:receipt" width={15} />}
                                        onClick={() => handleDownloadReceipt(txn)}
                                        disabled={downloadingReceiptId === (txn.orderId || txn.voucherId || txn._id)}
                                        sx={{
                                          textTransform: 'none',
                                          fontSize: '0.75rem',
                                          fontWeight: 600,
                                          backgroundColor: '#059669',
                                          '&:hover': { backgroundColor: '#047857' },
                                          height: 32,
                                          px: 1.75,
                                          borderRadius: '6px'
                                        }}
                                      >
                                        {downloadingReceiptId === (txn.orderId || txn.voucherId || txn._id) ? 'Downloading Receipt...' : 'Download Payment Receipt'}
                                      </Button>
                                    )}
                                    {isOrder && (
                                      isDC ? (
                                        <Button
                                          size="small"
                                          variant="contained"
                                          startIcon={<Icon icon="lucide:truck" width={15} />}
                                          onClick={() => handleDownloadOrderChallan(txn)}
                                          disabled={downloadingChallanId === (txn.orderId || txn.voucherId)}
                                          sx={{
                                            textTransform: 'none',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            backgroundColor: '#0284C7',
                                            '&:hover': { backgroundColor: '#0369A1' },
                                            height: 32,
                                            px: 1.75,
                                            borderRadius: '6px'
                                          }}
                                        >
                                          {downloadingChallanId === (txn.orderId || txn.voucherId) ? 'Downloading Challan...' : 'Download Delivery Challan'}
                                        </Button>
                                      ) : (
                                        <Button
                                          size="small"
                                          variant="contained"
                                          startIcon={<Icon icon="solar:bill-list-bold" width={15} />}
                                          onClick={() => handleDownloadOrderInvoice(txn)}
                                          disabled={downloadingDocId === (txn.orderId || txn.voucherId)}
                                          sx={{
                                            textTransform: 'none',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            backgroundColor: '#0D9488',
                                            '&:hover': { backgroundColor: '#0F766E' },
                                            height: 32,
                                            px: 1.75,
                                            borderRadius: '6px'
                                          }}
                                        >
                                          {downloadingDocId === (txn.orderId || txn.voucherId) ? 'Downloading Invoice...' : 'Download Order Invoice'}
                                        </Button>
                                      )
                                    )}
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      startIcon={<Icon icon="lucide:book-open" width={15} />}
                                      onClick={handleDownloadLedgerStatement}
                                      disabled={downloadingStatement}
                                      sx={{
                                        textTransform: 'none',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: '#4338CA',
                                        borderColor: '#818CF8',
                                        backgroundColor: '#EEF2FF',
                                        '&:hover': { backgroundColor: '#E0E7FF', borderColor: '#4338CA' },
                                        height: 32,
                                        px: 1.75,
                                        borderRadius: '6px'
                                      }}
                                    >
                                      {downloadingStatement ? 'Downloading Statement...' : 'Download Ledger Statement'}
                                    </Button>
                                  </Box>
                                </Box>

                                {/* Order Items Table */}
                                {isOrder && orderItems.length > 0 && (
                                  <Box sx={{ mb: hasParts ? 2 : 0 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '0.8rem', mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                      <Icon icon="lucide:package" style={{ color: '#0284C7', fontSize: 14 }} />
                                      Order Items ({orderItems.length}) — {matchedOrder?.isGSTRegistered ? `GST (${matchedOrder?.gstNumber || 'Registered'})` : 'Non-GST'}
                                    </Typography>
                                    <Table size="small">
                                      <TableHead sx={{ backgroundColor: '#F1F5F9' }}>
                                        <TableRow>
                                          <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569', width: 40 }}>#</TableCell>
                                          <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Item / Product</TableCell>
                                          <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Brand</TableCell>
                                          <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Qty</TableCell>
                                          <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Rate (₹)</TableCell>
                                          <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Amount (₹)</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {orderItems.map((item, iIdx) => (
                                          <TableRow key={iIdx} hover>
                                            <TableCell sx={{ fontSize: '0.72rem', color: '#64748B' }}>{iIdx + 1}</TableCell>
                                            <TableCell sx={{ fontSize: '0.72rem', color: '#0F172A', fontWeight: 500 }}>
                                              {item.productName || item.name || item.itemName || 'Product'}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.72rem', color: '#475569' }}>
                                              {item.brand || item.brandName || 'Standard'}
                                            </TableCell>
                                            <TableCell align="center" sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#0F172A' }}>
                                              {item.qty || item.quantity || 1}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontSize: '0.72rem', color: '#475569' }}>
                                              ₹{Number(item.rate || item.price || item.unitPrice || 0).toLocaleString('en-IN')}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#0F172A' }}>
                                              ₹{Number(item.amount || item.totalPrice || ((item.qty || 1) * (item.rate || item.price || 0))).toLocaleString('en-IN')}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                    {/* Tax Summary */}
                                    {(matchedOrder || isOrder) && (
                                      <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                                        <Typography variant="caption" sx={{ color: '#475569' }}>
                                          Taxable: <strong>₹{Number((matchedOrder?.taxableAmount ?? txn.taxableAmount) || 0).toLocaleString('en-IN')}</strong>
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#475569' }}>
                                          GST: <strong>₹{Number((matchedOrder?.gstAmount ?? txn.gstAmount) || 0).toLocaleString('en-IN')}</strong>
                                        </Typography>
                                        {Number(matchedOrder?.shippingCharges ?? txn.shippingCharges ?? 0) > 0 && (
                                          <Typography variant="caption" sx={{ color: '#475569' }}>
                                            Shipping / Freight: <strong>₹{Number(matchedOrder?.shippingCharges ?? txn.shippingCharges).toLocaleString('en-IN')}</strong>
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

                                {/* Payment Installments Table */}
                                {hasParts && (
                                  <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                        <Icon icon="lucide:wallet" style={{ color: '#059669', fontSize: 14 }} />
                                        Payment History ({paymentsList.length})
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: '#475569' }}>
                                        Received: <strong style={{ color: '#059669' }}>₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> of ₹{orderTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        {pdcWaitingAmount > 0 && (
                                          <>
                                            &nbsp;|&nbsp; PDC (In-Clearing): <strong style={{ color: '#D97706' }}>₹{pdcWaitingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                                          </>
                                        )}
                                        &nbsp;|&nbsp; Due: <strong style={{ color: dueAmount > 0 ? '#EF4444' : '#059669' }}>{dueAmount > 0 ? `₹${dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Paid'}</strong>
                                      </Typography>
                                    </Box>
                                    <Table size="small">
                                      <TableHead sx={{ backgroundColor: '#F1F5F9' }}>
                                        <TableRow>
                                          <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569', width: 35 }}>#</TableCell>
                                          <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Payment Date</TableCell>
                                          <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Ref / Voucher</TableCell>
                                          <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Mode</TableCell>
                                          <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Remarks & Cheque Details</TableCell>
                                          <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Amount (₹)</TableCell>
                                          <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Status</TableCell>
                                          <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#475569' }}>Actions</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {paymentsList.map((p, pIdx) => {
                                          const isCheque = p.paymentMode === 'CHEQUE';
                                          const isPDC = Boolean(p.isPostDated);
                                          const chqDate = p.chequeDate ? new Date(p.chequeDate) : null;
                                          let expDate = p.chequeExpiryDate ? new Date(p.chequeExpiryDate) : null;
                                          if (!expDate && chqDate) {
                                            expDate = new Date(chqDate);
                                            expDate.setMonth(expDate.getMonth() + 3);
                                          }
                                          const todayEnd = new Date();
                                          todayEnd.setHours(23, 59, 59, 999);
                                          const startOfToday = new Date();
                                          startOfToday.setHours(0, 0, 0, 0);

                                          const isMatured = !isPDC || (chqDate && chqDate <= todayEnd);
                                          const isChequeExpired = p.status === 'EXPIRED' || p.chequeStatus === 'EXPIRED' || Boolean(expDate && !p.isCredited && new Date() > expDate);
                                          const isChequeBounced = p.status === 'BOUNCED' || p.chequeStatus === 'BOUNCED';
                                          const isChequeInClearing = isCheque && isPDC && !p.isCredited && !isChequeBounced && !isChequeExpired;
                                          const canRetryCheque = isChequeBounced && !isChequeExpired;
                                          const daysUntilExpiry = expDate ? Math.max(0, Math.ceil((expDate.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24))) : 0;
                                          const isExpiringSoon = !isChequeExpired && !p.isCredited && daysUntilExpiry <= 15;
                                          const daysUntilMaturity = chqDate ? Math.max(0, Math.ceil((chqDate.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24))) : 0;

                                          return (
                                            <TableRow key={p.paymentId || p.paymentNumber || pIdx} hover>
                                              <TableCell sx={{ fontSize: '0.72rem', color: '#64748B' }}>{pIdx + 1}</TableCell>
                                              <TableCell sx={{ fontSize: '0.72rem', color: '#334155', whiteSpace: 'nowrap' }}>
                                                {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : 'N/A'}
                                              </TableCell>
                                              <TableCell sx={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 600, color: '#0284C7' }}>
                                                {p.referenceNumber || p.paymentNumber}
                                              </TableCell>
                                              <TableCell sx={{ fontSize: '0.72rem', color: '#475569' }}>
                                                <Chip
                                                  size="small"
                                                  label={
                                                    p.paymentMode === 'ADVANCE_ADJUSTMENT' ? 'Advance Adjustment' :
                                                      p.paymentMode === 'UPI' ? 'UPI / QR' :
                                                        p.paymentMode === 'CASH' ? 'Cash' :
                                                          p.paymentMode === 'BANK_TRANSFER' ? 'Bank Transfer' :
                                                            p.paymentMode === 'CHEQUE' ? (p.isPostDated ? 'Cheque (PDC)' : 'Cheque') :
                                                              (p.paymentMode ? String(p.paymentMode).replace(/_/g, ' ') : 'Bank')
                                                  }
                                                  sx={{
                                                    height: 20,
                                                    fontSize: '0.65rem',
                                                    fontWeight: 600,
                                                    backgroundColor:
                                                      p.paymentMode === 'ADVANCE_ADJUSTMENT' ? '#EFF6FF' :
                                                        p.paymentMode === 'UPI' ? '#F5F3FF' :
                                                          p.paymentMode === 'CASH' ? '#FEF3C7' : '#F0FDF4',
                                                    color:
                                                      p.paymentMode === 'ADVANCE_ADJUSTMENT' ? '#1D4ED8' :
                                                        p.paymentMode === 'UPI' ? '#6D28D9' :
                                                          p.paymentMode === 'CASH' ? '#B45309' : '#15803D'
                                                  }}
                                                />
                                              </TableCell>
                                              <TableCell sx={{ fontSize: '0.72rem', color: '#475569' }}>
                                                <Box>
                                                  <span>{p.remarks || (pIdx === 0 && p.paymentNumber?.startsWith('ADV') ? 'Booking Advance' : 'Part Payment')}</span>
                                                  {isCheque && (
                                                    <Box sx={{ mt: 0.5 }}>
                                                      {p.chequeNumber && (
                                                        <Typography variant="caption" sx={{ display: 'block', color: '#0F172A', fontWeight: 600, fontSize: '0.67rem' }}>
                                                          Cheque No: <span style={{ fontFamily: 'monospace' }}>#{p.chequeNumber}</span>
                                                        </Typography>
                                                      )}
                                                      {p.chequeDate && (
                                                        <Typography variant="caption" sx={{ display: 'block', color: '#D97706', fontWeight: 600, fontSize: '0.67rem' }}>
                                                          Cheque Date: {new Date(p.chequeDate).toLocaleDateString('en-IN')}
                                                        </Typography>
                                                      )}
                                                      {expDate && (
                                                        <Typography variant="caption" sx={{ display: 'block', color: isChequeExpired ? '#DC2626' : (isExpiringSoon ? '#C2410C' : '#64748B'), fontWeight: (isChequeExpired || isExpiringSoon) ? 700 : 500, fontSize: '0.65rem' }}>
                                                          Validity (3M): {new Date(expDate).toLocaleDateString('en-IN')} {isChequeExpired ? '(Expired)' : (isExpiringSoon ? `(${daysUntilExpiry}d left - Expiring Soon!)` : '')}
                                                        </Typography>
                                                      )}
                                                      {p.retryCount > 0 && (
                                                        <Typography variant="caption" sx={{ display: 'block', color: '#0284C7', fontWeight: 600, fontSize: '0.65rem' }}>
                                                          Retried: {p.retryCount} time{p.retryCount > 1 ? 's' : ''}
                                                        </Typography>
                                                      )}
                                                      {p.bankAccountName && (
                                                        <Typography variant="caption" sx={{ display: 'block', color: '#475569', fontSize: '0.65rem' }}>
                                                          Bank: {p.bankAccountName}
                                                        </Typography>
                                                      )}
                                                    </Box>
                                                  )}
                                                  {p.utrNumber && p.utrNumber !== (p.referenceNumber || p.paymentNumber) && (
                                                    <Typography variant="caption" sx={{ display: 'block', color: '#0284C7', fontFamily: 'monospace', fontSize: '0.65rem' }}>
                                                      UTR: {p.utrNumber}
                                                    </Typography>
                                                  )}
                                                </Box>
                                              </TableCell>
                                              <TableCell align="right" sx={{ fontSize: '0.72rem', fontWeight: 700, color: isChequeInClearing ? '#D97706' : isChequeExpired ? '#94A3B8' : isChequeBounced ? '#DC2626' : '#059669' }}>
                                                ₹{Number(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                              </TableCell>
                                              <TableCell align="center">
                                                <Chip size="small"
                                                  icon={isChequeInClearing ? <Icon icon="lucide:clock" width={11} /> : isChequeExpired ? <Icon icon="lucide:calendar-x" width={11} /> : undefined}
                                                  label={
                                                    isChequeExpired
                                                      ? 'EXPIRED (>3M)'
                                                      : isChequeBounced
                                                      ? 'BOUNCED'
                                                      : isChequeInClearing
                                                      ? (!isMatured
                                                          ? `PDC (DUE ${chqDate ? chqDate.toLocaleDateString('en-IN') : 'FUTURE'})`
                                                          : (p.retryCount > 0 ? `IN CLEARING (RETRY #${p.retryCount})` : 'IN CLEARING'))
                                                      : 'CLEARED'
                                                  }
                                                  sx={{
                                                    height: 19, fontSize: '0.6rem', fontWeight: 700,
                                                    backgroundColor:
                                                      isChequeExpired ? '#F1F5F9' :
                                                      isChequeBounced ? '#FEE2E2' :
                                                      isChequeInClearing ? (!isMatured ? '#EFF6FF' : '#FEF3C7') : '#DCFCE7',
                                                    color:
                                                      isChequeExpired ? '#64748B' :
                                                      isChequeBounced ? '#991B1B' :
                                                      isChequeInClearing ? (!isMatured ? '#1D4ED8' : '#92400E') : '#15803D',
                                                    border: `1px solid ${
                                                      isChequeExpired ? '#CBD5E1' :
                                                      isChequeBounced ? '#FECACA' :
                                                      isChequeInClearing ? (!isMatured ? '#BFDBFE' : '#FDE68A') : '#BBF7D0'
                                                    }`
                                                  }} />
                                              </TableCell>
                                              <TableCell align="center">
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, flexWrap: 'nowrap' }}>
                                                  {isChequeInClearing && isMatured && (
                                                    <>
                                                      <Tooltip title={`Mark Cheque #${p.chequeNumber || ''} as Cleared (Credit ₹${Number(p.amount).toLocaleString()} to order)`} arrow>
                                                        <Button
                                                          size="small"
                                                          variant="contained"
                                                          color="success"
                                                          startIcon={<Icon icon="lucide:check-circle-2" width={13} />}
                                                          onClick={() => handleOpenClearCheque(p, txn)}
                                                          sx={{
                                                            textTransform: 'none',
                                                            fontSize: '0.68rem',
                                                            fontWeight: 700,
                                                            py: 0.25,
                                                            px: 0.85,
                                                            minHeight: 22,
                                                            height: 24,
                                                            backgroundColor: '#16A34A',
                                                            whiteSpace: 'nowrap',
                                                            '&:hover': { backgroundColor: '#15803D' }
                                                          }}
                                                        >
                                                          Clear Cheque
                                                        </Button>
                                                      </Tooltip>

                                                      <Tooltip title={`Mark Cheque #${p.chequeNumber || ''} as Bounced (₹500 penalty will be debited)`} arrow>
                                                        <Button
                                                          size="small"
                                                          variant="outlined"
                                                          color="error"
                                                          startIcon={<Icon icon="lucide:alert-triangle" width={13} />}
                                                          onClick={() => handleOpenBounceCheque(p, txn)}
                                                          sx={{
                                                            textTransform: 'none',
                                                            fontSize: '0.68rem',
                                                            fontWeight: 700,
                                                            py: 0.25,
                                                            px: 0.85,
                                                            minHeight: 22,
                                                            height: 24,
                                                            borderColor: '#EF4444',
                                                            color: '#DC2626',
                                                            whiteSpace: 'nowrap',
                                                            '&:hover': { backgroundColor: '#FEE2E2', borderColor: '#DC2626' }
                                                          }}
                                                        >
                                                          Bounce
                                                        </Button>
                                                      </Tooltip>
                                                    </>
                                                  )}

                                                  {isChequeInClearing && !isMatured && (
                                                    <Tooltip title={`Actions (Clear / Bounce) unlock on maturity date (${chqDate ? chqDate.toLocaleDateString('en-IN') : 'N/A'}, ${daysUntilMaturity} days left)`} arrow>
                                                      <Chip
                                                        size="small"
                                                        icon={<Icon icon="lucide:clock" width={12} />}
                                                        label={`Matures in ${daysUntilMaturity}d`}
                                                        sx={{
                                                          height: 22,
                                                          fontSize: '0.65rem',
                                                          fontWeight: 600,
                                                          backgroundColor: '#F0F9FF',
                                                          color: '#0284C7',
                                                          border: '1px solid #BAE6FD',
                                                        }}
                                                      />
                                                    </Tooltip>
                                                  )}

                                                  {canRetryCheque && (
                                                    <Tooltip title={`Re-present Cheque #${p.chequeNumber || ''} to bank within 3 months validity`} arrow>
                                                      <Button
                                                        size="small"
                                                        variant="contained"
                                                        startIcon={<Icon icon="lucide:refresh-cw" width={13} />}
                                                        onClick={() => handleOpenRetryCheque(p, txn)}
                                                        sx={{
                                                          textTransform: 'none',
                                                          fontSize: '0.68rem',
                                                          fontWeight: 700,
                                                          py: 0.25,
                                                          px: 0.85,
                                                          minHeight: 22,
                                                          height: 24,
                                                          backgroundColor: '#2980B9',
                                                          whiteSpace: 'nowrap',
                                                          '&:hover': { backgroundColor: '#1F618D' }
                                                        }}
                                                      >
                                                        Retry Cheque
                                                      </Button>
                                                    </Tooltip>
                                                  )}

                                                  <Tooltip title="Download Receipt" arrow>
                                                    <span>
                                                      <IconButton size="small" onClick={() => handleDownloadReceipt({ ...p, orderId: txn.orderId || txn.voucherId || txn._id, orderNumber: txn.orderNumber })}
                                                        disabled={downloadingReceiptId === (p.paymentId || p.paymentNumber)}
                                                        sx={{ color: '#059669', p: 0.25, '&:hover': { backgroundColor: '#DCFCE7' } }}>
                                                        <Icon icon="lucide:receipt" width={13} />
                                                      </IconButton>
                                                    </span>
                                                  </Tooltip>
                                                </Box>
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })}
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
        )}
      </Box>





      {/* Payment Modal */}
      {paymentModalOpen && (
        <CustomerPaymentModal
          open={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedOrderForPayment(null);
          }}
          customer={{
            _id: customerId,
            shopName: cust.shopName,
            ownerName: cust.ownerName,
            mobile: cust.mobile,
            creditLimit,
            creditUsed,
            advanceAmount,
            isGSTRegistered: isGST
          }}
          initialOrder={selectedOrderForPayment}
          onSuccess={() => fetchStatement()}
        />
      )}

      {/* Clear Cheque Confirmation Dialog */}
      <Dialog
        open={clearChequeModal.open}
        onClose={() => !clearChequeModal.submitting && setClearChequeModal(prev => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon icon="lucide:check-circle-2" style={{ color: '#16A34A', fontSize: 22 }} />
          Clear Cheque & Credit Order
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
            Confirm that this cheque has been successfully cleared in your bank account?
          </Typography>

          <Box sx={{ p: 2, backgroundColor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0', mb: 2 }}>
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Cheque Number</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                  #{clearChequeModal.payment?.chequeNumber || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Cheque Maturity Date</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#D97706' }}>
                  {clearChequeModal.payment?.chequeDate ? new Date(clearChequeModal.payment.chequeDate).toLocaleDateString('en-IN') : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Amount to Credit</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#16A34A', fontSize: '1rem' }}>
                  ₹{Number(clearChequeModal.payment?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Order Ref</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#0284C7' }}>
                  {clearChequeModal.order?.orderNumber || clearChequeModal.order?.referenceNumber || 'N/A'}
                </Typography>
              </Grid>
              {clearChequeModal.payment?.bankAccountName && (
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Deposited Bank Account</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#334155' }}>
                    {clearChequeModal.payment.bankAccountName}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>

          <TextField
            fullWidth
            size="small"
            type="date"
            label="Bank Clearance Date"
            value={clearChequeModal.clearanceDate}
            onChange={(e) => setClearChequeModal(prev => ({ ...prev, clearanceDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />

          <Alert severity="success" sx={{ fontSize: '0.75rem', py: 0.5 }}>
            ₹{Number(clearChequeModal.payment?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} will now be credited to this order and will reduce customer due balance.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            disabled={clearChequeModal.submitting}
            onClick={() => setClearChequeModal(prev => ({ ...prev, open: false }))}
            sx={{ textTransform: 'none', color: '#64748B', borderColor: '#CBD5E1' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            disabled={clearChequeModal.submitting}
            onClick={handleConfirmClearCheque}
            startIcon={clearChequeModal.submitting ? <CircularProgress size={16} color="inherit" /> : <Icon icon="lucide:check-circle-2" width={16} />}
            sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: '#16A34A', '&:hover': { backgroundColor: '#15803D' } }}
          >
            {clearChequeModal.submitting ? 'Clearing...' : 'Confirm Clearance (Credit Amount)'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bounce Cheque Confirmation Dialog */}
      <Dialog
        open={bounceChequeModal.open}
        onClose={() => !bounceChequeModal.submitting && setBounceChequeModal(prev => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', color: '#DC2626', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon icon="lucide:alert-triangle" style={{ color: '#DC2626', fontSize: 22 }} />
          Mark Cheque as Bounced
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
            Are you sure this cheque was rejected or bounced by the bank?
          </Typography>

          <Box sx={{ p: 2, backgroundColor: '#FEF2F2', borderRadius: 2, border: '1px solid #FECACA', mb: 2 }}>
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#991B1B', display: 'block' }}>Cheque Number</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#991B1B', fontFamily: 'monospace' }}>
                  #{bounceChequeModal.payment?.chequeNumber || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#991B1B', display: 'block' }}>Uncredited Amount</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#991B1B' }}>
                  ₹{Number(bounceChequeModal.payment?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Bounce Reason</InputLabel>
            <Select
              value={bounceChequeModal.bounceReason}
              label="Bounce Reason"
              onChange={(e) => setBounceChequeModal(prev => ({ ...prev, bounceReason: e.target.value }))}
            >
              <MenuItem value="Insufficient Funds">Insufficient Funds</MenuItem>
              <MenuItem value="Signature Mismatch">Signature Mismatch</MenuItem>
              <MenuItem value="Cheque Expired / Stale">Cheque Expired / Stale</MenuItem>
              <MenuItem value="Account Closed">Account Closed</MenuItem>
              <MenuItem value="Payment Stopped by Drawer">Payment Stopped by Drawer</MenuItem>
              <MenuItem value="Other">Other Reason</MenuItem>
            </Select>
          </FormControl>

          {bounceChequeModal.bounceReason === 'Other' && (
            <TextField
              fullWidth
              size="small"
              label="Specify Reason"
              value={bounceChequeModal.customReason}
              onChange={(e) => setBounceChequeModal(prev => ({ ...prev, customReason: e.target.value }))}
              sx={{ mb: 2 }}
            />
          )}

          <Alert severity="warning" sx={{ fontSize: '0.75rem', py: 0.5 }}>
            The cheque amount of ₹{Number(bounceChequeModal.payment?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} will NOT be credited, and a ₹500 bounce penalty will be debited to customer khata.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            disabled={bounceChequeModal.submitting}
            onClick={() => setBounceChequeModal(prev => ({ ...prev, open: false }))}
            sx={{ textTransform: 'none', color: '#64748B', borderColor: '#CBD5E1' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={bounceChequeModal.submitting}
            onClick={handleConfirmBounceCheque}
            startIcon={bounceChequeModal.submitting ? <CircularProgress size={16} color="inherit" /> : <Icon icon="lucide:alert-triangle" width={16} />}
            sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: '#DC2626', '&:hover': { backgroundColor: '#B91C1C' } }}
          >
            {bounceChequeModal.submitting ? 'Marking Bounced...' : 'Confirm Cheque Bounce'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for Retrying / Re-presenting Cheque */}
      <Dialog
        open={retryChequeModal.open}
        onClose={() => !retryChequeModal.submitting && setRetryChequeModal(prev => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', color: '#2980B9', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon icon="lucide:refresh-cw" style={{ color: '#2980B9', fontSize: 20 }} />
          Re-present / Retry Bounced Cheque
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Typography variant="body2" sx={{ color: '#5D6D7E', mb: 2 }}>
            Confirm re-presenting this bounced cheque to the bank for clearance?
          </Typography>

          <Box sx={{ p: 2, backgroundColor: '#EBF5FB', borderRadius: '8px', border: '1px solid #D4E6F1', mb: 2 }}>
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#1B4F72', display: 'block' }}>Cheque Number</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#154360', fontFamily: 'monospace' }}>
                  #{retryChequeModal.payment?.chequeNumber || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#1B4F72', display: 'block' }}>Cheque Amount</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#154360' }}>
                  ₹{Number(retryChequeModal.payment?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#1B4F72', display: 'block' }}>Re-presentation</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#2980B9' }}>
                  Attempt #{Number(retryChequeModal.payment?.retryCount || 0) + 1}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#1B4F72', display: 'block' }}>3-Month Expiry</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#2C3E50' }}>
                  {retryChequeModal.payment?.chequeExpiryDate
                    ? new Date(retryChequeModal.payment.chequeExpiryDate).toLocaleDateString('en-IN')
                    : 'Within 90 Days'}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <TextField
            fullWidth
            size="small"
            multiline
            rows={2}
            label="Re-presentation Notes"
            value={retryChequeModal.retryNotes}
            onChange={(e) => setRetryChequeModal(prev => ({ ...prev, retryNotes: e.target.value }))}
            placeholder="e.g., Customer confirmed funds replenished; re-presenting."
            sx={{ mb: 2 }}
          />

          <Alert severity="info" sx={{ fontSize: '0.75rem', py: 0.5, borderRadius: '8px' }}>
            Upon confirming, cheque status will return to <strong>IN CLEARING</strong>. You will be able to confirm clearance or bounce again when bank processes it.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, borderTop: '1px solid #E2E8F0' }}>
          <Button
            variant="outlined"
            disabled={retryChequeModal.submitting}
            onClick={() => setRetryChequeModal(prev => ({ ...prev, open: false }))}
            sx={{ textTransform: 'none', color: '#7F8C8D', borderColor: '#D5DBDB' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={retryChequeModal.submitting}
            onClick={handleConfirmRetryCheque}
            startIcon={retryChequeModal.submitting ? <CircularProgress size={16} color="inherit" /> : <Icon icon="lucide:refresh-cw" width={16} />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              backgroundColor: '#2980B9',
              boxShadow: 'none',
              '&:hover': { backgroundColor: '#1F618D' },
            }}
          >
            {retryChequeModal.submitting ? 'Re-presenting...' : 'Confirm Re-presentation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerKhataStatement;
