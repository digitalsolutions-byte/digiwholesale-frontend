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
  getCustomerStatement,
  adjustDueFromAdvance,
  downloadPaymentReceipt,
  downloadOrderChallan,
  downloadOrderInvoice,
  downloadCustomerLedgerStatement,
  sendPaymentDueReminder
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
      const sorted = [...rawTxns].sort((a, b) => new Date(b.transactionDate || b.createdAt) - new Date(a.transactionDate || a.createdAt));
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

  useEffect(() => {
    if (customerId) {
      fetchStatement();
    }
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
      return (!oid || !existingOrderRefs.has(oid)) && (!onum || !existingOrderRefs.has(onum));
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
      partPaymentStatus: ord.paymentStatus,
      partPaymentPercentage: ord.partPaymentPercentage,
      orderPayments: ord.orderPayments || [],
      isGSTInvoice: Boolean(ord.isGSTRegistered),
      taxableAmount: ord.taxableAmount,
      gstAmount: ord.gstAmount,
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

  const unifiedTransactions = [...standaloneTransactions, ...unrecordedOrderTxns].sort(
    (a, b) => new Date(b.transactionDate || b.createdAt) - new Date(a.transactionDate || a.createdAt)
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

  // Print Engine
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=950,height=800');
    if (!printWindow) {
      window.print();
      return;
    }

    const customerName = cust.shopName || cust.ownerName || 'Customer';
    const ownerName = cust.ownerName || '—';
    const mobile = cust.mobile || '—';
    const email = cust.email || '—';
    const gstin = cust.gstin || cust.gstNumber || cust.GSTNo || 'N/A';
    const addr = formatAddress(cust.address);
    const ledgerCode = master.ledgerCode || 'LEDGER';
    const totalDebit = Number(displayTotalInvoiced).toLocaleString('en-IN');
    const totalCredit = Number(displayTotalReceived).toLocaleString('en-IN');

    const rowsHtml = unifiedTransactions
      .map((t, idx) => {
        const d = t.transactionDate ? new Date(t.transactionDate).toLocaleDateString('en-IN') : '—';
        const orderTotal = Number(t.orderGrandTotal != null ? t.orderGrandTotal : t.debit || 0);
        const paidAmount = Math.max(Number(t.orderPaidAmount != null ? t.orderPaidAmount : 0), Number(t.credit || 0));
        const dueAmount = t.orderBalanceDue != null && Number(t.orderBalanceDue) <= (orderTotal - paidAmount)
          ? Number(t.orderBalanceDue)
          : Math.max(0, orderTotal - paidAmount);
        const debit = orderTotal > 0 ? `₹${Number(orderTotal).toLocaleString('en-IN')}` : (t.debit > 0 ? `₹${Number(t.debit).toLocaleString('en-IN')}` : '—');
        const credit = paidAmount > 0 ? `₹${Number(paidAmount).toLocaleString('en-IN')}` : (t.credit > 0 ? `₹${Number(t.credit).toLocaleString('en-IN')}` : '—');
        const bal = t.runningBalance != null
          ? (t.runningBalance > 0
              ? `₹${Number(t.runningBalance).toLocaleString('en-IN')} (Due)`
              : t.runningBalance < 0
                ? `₹${Number(Math.abs(t.runningBalance)).toLocaleString('en-IN')} (Adv)`
                : '₹0.00')
          : dueAmount > 0
            ? `₹${Number(dueAmount).toLocaleString('en-IN')} (Due)`
            : (orderTotal > 0 ? 'Paid (₹0)' : '₹0');

        const paymentDetailsHtml = (t.orderPayments && t.orderPayments.length > 0)
          ? `<tr style="background:#f8fafc;"><td colspan="7" style="padding:4px 12px;font-size:10px;color:#64748B;">
               <strong>Grouped Payment History:</strong> ${t.orderPayments.map(p => `${p.referenceNumber || p.paymentNumber || 'Receipt'}: ₹${Number(p.amount || 0).toLocaleString('en-IN')} (${p.paymentMode || 'Paid'})`).join(' &bull; ')}
             </td></tr>`
          : '';

        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${d}</td>
            <td style="font-family:monospace;font-weight:600;">${t.referenceNumber || t.voucherId || '—'}</td>
            <td>${t.description || t.voucherType || '—'}</td>
            <td style="text-align:right;color:#b91c1c;font-weight:600;">${debit}</td>
            <td style="text-align:right;color:#15803d;font-weight:600;">${credit}</td>
            <td style="text-align:right;font-weight:700;">${bal}</td>
          </tr>
          ${paymentDetailsHtml}
        `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Customer Ledger Statement - ${customerName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: #1e293b; padding: 24px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 20px; font-weight: 800; color: #0f172a; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
          .info-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 11px; line-height: 1.6; }
          .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
          .kpi-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f8fafc; text-align: left; padding: 8px; border-bottom: 1px solid #cbd5e1; font-weight: 700; color: #475569; }
          td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">${customerName}</div>
            <div style="color: #64748b; font-size: 11px;">Customer Ledger Statement & Audit Report</div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64748b;">
            Generated on: ${new Date().toLocaleDateString('en-IN')}
          </div>
        </div>

        <div class="grid-2">
          <div class="info-box">
            <div style="font-weight: 700; color: #0284c7; margin-bottom: 4px;">CUSTOMER DETAILS</div>
            <div><strong>${customerName}</strong> (Owner: ${ownerName})</div>
            <div>Mobile: ${mobile} | Email: ${email}</div>
            <div>Address: ${addr || '—'}</div>
            <div>Tax Status: <strong>${isGST ? `GST Registered (${gstin})` : 'Non-GST Customer'}</strong></div>
          </div>
          <div class="info-box">
            <div style="font-weight: 700; color: #0284c7; margin-bottom: 4px;">CREDIT TERMS & LIMIT</div>
            <div>Ledger Code: <strong>${ledgerCode}</strong></div>
            <div>Credit Limit: <strong>₹${creditLimit.toLocaleString('en-IN')}</strong> (${master.creditDays || 30} Days Window)</div>
            <div>Limit Utilized: <strong>${creditPercentage}%</strong> (Available: ₹${availableCredit.toLocaleString('en-IN')})</div>
            <div>Current Position: <strong>${creditUsed > 0 ? `₹${creditUsed.toLocaleString('en-IN')} (Due)` : `₹${advanceAmount.toLocaleString('en-IN')} (Advance)`}</strong></div>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi-card"><div>Total Invoiced</div><div style="font-weight:700;font-size:13px;color:#b91c1c;">₹${totalDebit}</div></div>
          <div class="kpi-card"><div>Total Collected</div><div style="font-weight:700;font-size:13px;color:#15803d;">₹${totalCredit}</div></div>
          <div class="kpi-card"><div>Advance Available</div><div style="font-weight:700;font-size:13px;color:#0284c7;">₹${advanceAmount.toLocaleString('en-IN')}</div></div>
          <div class="kpi-card"><div>Closing Due Balance</div><div style="font-weight:700;font-size:13px;color:${creditUsed > 0 ? '#b91c1c' : '#15803d'};">₹${creditUsed.toLocaleString('en-IN')}</div></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th><th>Date</th><th>Ref No.</th><th>Particulars</th><th style="text-align:right;">Debit (₹)</th><th style="text-align:right;">Credit (₹)</th><th style="text-align:right;">Balance</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const [downloadingDocId, setDownloadingDocId] = useState(null);
  const [downloadingChallanId, setDownloadingChallanId] = useState(null);
  const [downloadingStatement, setDownloadingStatement] = useState(false);

  const handleDownloadLedgerStatement = async () => {
    if (!customerId) {
      toast.error('Customer ID missing');
      return;
    }
    try {
      setDownloadingStatement(true);
      const safeName = (summary.customer?.shopName || summary.customer?.ownerName || 'Customer').replace(/[^a-z0-9]/gi, '-');
      await downloadCustomerLedgerStatement(customerId, `Ledger-Statement-${safeName}`);
      toast.success('Customer Ledger Statement downloaded successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to download ledger statement');
    } finally {
      setDownloadingStatement(false);
    }
  };

  const handleDownloadOrderChallan = async (txn) => {
    const orderId = txn.orderId || txn.voucherId;
    const orderNumber = txn.orderNumber || txn.referenceNumber || 'Order';
    if (!orderId) {
      toast.error('Order ID not available for challan download');
      return;
    }
    try {
      setDownloadingChallanId(orderId);
      await downloadOrderChallan(orderId, `Challan-${orderNumber}`);
      toast.success('Delivery Challan downloaded successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to download delivery challan');
    } finally {
      setDownloadingChallanId(null);
    }
  };

  const handleDownloadOrderInvoice = async (txn) => {
    const orderId = txn.orderId || txn.voucherId;
    const orderNumber = txn.orderNumber || txn.referenceNumber || 'Order';
    if (!orderId) {
      toast.error('Order ID not available for invoice download');
      return;
    }
    try {
      setDownloadingDocId(orderId);
      await downloadOrderInvoice(orderId, orderNumber, `Invoice-${orderNumber}`);
      toast.success('Order Invoice downloaded successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to download invoice');
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleDownloadReceipt = async (txnOrPayment) => {
    let paymentId = null;
    let paymentRef = 'CPAY';

    if (txnOrPayment.paymentId && !String(txnOrPayment.paymentId).startsWith('ADV')) {
      paymentId = txnOrPayment.paymentId;
      paymentRef = txnOrPayment.referenceNumber || txnOrPayment.paymentNumber || 'Receipt';
    } else {
      const payments = txnOrPayment.orderPayments || ordersMap[String(txnOrPayment.orderId)]?.orderPayments || [];
      const validPayments = payments.filter(p => p.paymentId && !String(p.paymentId).startsWith('ADV'));
      const target = validPayments.length > 0 ? validPayments[validPayments.length - 1] : payments[payments.length - 1];

      if (target && target.paymentId && !String(target.paymentId).startsWith('ADV')) {
        paymentId = target.paymentId;
        paymentRef = target.referenceNumber || target.paymentNumber || 'Receipt';
      } else {
        paymentId = txnOrPayment.voucherId || txnOrPayment._id;
        paymentRef = txnOrPayment.referenceNumber || 'Receipt';
      }
    }

    if (!paymentId) {
      toast.error('Payment receipt not available for this record');
      return;
    }

    try {
      setDownloadingReceiptId(paymentId);
      await downloadPaymentReceipt(paymentId, `Receipt-${paymentRef}`);
      toast.success('Payment receipt downloaded successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to download receipt');
    } finally {
      setDownloadingReceiptId(null);
    }
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
                Owner: <strong>{summary.customer?.ownerName || '—'}</strong> | Mobile: <strong>{summary.customer?.mobile || '—'}</strong> | Email: <strong>{summary.customer?.email || '—'}</strong>
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
                    const paidAmount = Math.max(Number(txn.orderPaidAmount != null ? txn.orderPaidAmount : 0), Number(txn.credit || 0));
                    const dueAmount = txn.orderBalanceDue != null && Number(txn.orderBalanceDue) <= (orderTotal - paidAmount)
                      ? Number(txn.orderBalanceDue)
                      : Math.max(0, orderTotal - paidAmount);
                    const orderBadge = getStatusBadge(txn.orderStatus);
                    const matchedOrder = ordersMap[String(txn.orderId)] || ordersMap[txn.orderNumber] || ordersMap[txn.referenceNumber] || null;
                    const paymentsList = (Array.isArray(txn.orderPayments) && txn.orderPayments.length > 0) ? txn.orderPayments : (matchedOrder?.orderPayments || []);
                    const hasParts = paymentsList.length > 0;
                    const isExpanded = expandedRowId === rowKey;
                    const orderItems = txn.items?.length > 0 ? txn.items : (matchedOrder?.items || []);
                    const pct = orderTotal > 0 ? Math.min(100, Math.round((paidAmount / orderTotal) * 100)) : 0;
                    const isFullyPaid = dueAmount <= 0 && isOrder;
                    const isPartPaid = paidAmount > 0 && dueAmount > 0;

                    // Determine entry type
                    let entryType = txn.description || txn.voucherType || 'Entry';
                    let typeBadge = { bg: '#F3F4F6', text: '#6B7280' };
                    if (isOrder) {
                      entryType = 'Sale Invoice';
                      typeBadge = { bg: '#EEF2FF', text: '#4338CA' };
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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <span>{txn.referenceNumber || txn.voucherId || '—'}</span>
                              {hasParts && (
                                <Chip size="small" label={`${paymentsList.length} ${paymentsList.length === 1 ? 'Pay' : 'Pays'}`}
                                  onClick={() => toggleExpandRow(rowKey)}
                                  sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600,
                                    backgroundColor: isExpanded ? '#BAE6FD' : '#E0F2FE', color: '#0369A1', cursor: 'pointer' }} />
                              )}
                            </Box>
                          </TableCell>

                          {/* Type */}
                          <TableCell>
                            <Chip size="small" label={entryType}
                              sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600,
                                backgroundColor: typeBadge.bg, color: typeBadge.text }} />
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
                                sx={{ backgroundColor: orderBadge.bg, color: orderBadge.text,
                                  fontWeight: 600, fontSize: '0.68rem', height: 20 }} />
                            ) : isPayment ? (
                              <Chip size="small" label="Received"
                                sx={{ backgroundColor: '#DCFCE7', color: '#15803D',
                                  fontWeight: 600, fontSize: '0.68rem', height: 20 }} />
                            ) : (
                              <Typography variant="caption" sx={{ color: '#94A3B8' }}>—</Typography>
                            )}
                          </TableCell>

                          {/* Debit */}
                          <TableCell align="right" sx={{ fontWeight: 600, color: '#0F172A', fontSize: '0.8rem' }}>
                            {orderTotal > 0 && isOrder ? `₹${orderTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : Number(txn.debit || 0) > 0 ? `₹${Number(txn.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                          </TableCell>

                          {/* Credit */}
                          <TableCell align="right" sx={{ fontWeight: 700, color: (Math.max(paidAmount, Number(txn.credit || 0)) > 0) ? '#059669' : '#94A3B8', fontSize: '0.8rem' }}>
                            {Math.max(paidAmount, Number(txn.credit || 0)) > 0
                              ? `₹${Math.max(paidAmount, Number(txn.credit || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : '—'}
                          </TableCell>

                          {/* Balance */}
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                            {txn.runningBalance != null ? (
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ color: txn.runningBalance > 0 ? '#E11D48' : txn.runningBalance < 0 ? '#059669' : '#64748B' }}>
                                  {txn.runningBalance > 0
                                    ? `₹${Number(txn.runningBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Due)`
                                    : txn.runningBalance < 0
                                      ? `₹${Number(Math.abs(txn.runningBalance)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Adv)`
                                      : '₹0.00'}
                                </span>
                                {isOrder && (
                                  <Typography variant="caption" sx={{ fontSize: '0.67rem', color: isFullyPaid ? '#059669' : '#DC2626', fontWeight: 600 }}>
                                    {isFullyPaid ? 'Order Paid ✓' : `Order Due: ₹${dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                  </Typography>
                                )}
                              </Box>
                            ) : isOrder ? (
                              <span style={{ color: dueAmount > 0 ? '#EF4444' : '#059669' }}>
                                {dueAmount > 0 ? `₹${dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Due)` : 'Paid ✓'}
                              </span>
                            ) : (
                              <span style={{ color: '#64748B' }}>—</span>
                            )}
                          </TableCell>

                          {/* Payment Progress */}
                          <TableCell sx={{ minWidth: 120 }}>
                            {isOrder ? (
                              <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: '100%' }}>
                                    <LinearProgress variant="determinate" value={pct}
                                      sx={{ height: 5, borderRadius: 3, backgroundColor: '#E2E8F0',
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
                                  {isFullyPaid ? 'Fully Paid' : isPartPaid ? 'Part Paid' : 'Unpaid'}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="caption" sx={{ color: '#CBD5E1' }}>—</Typography>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                              {isOrder && (
                                <Tooltip title="Download Delivery Challan" arrow>
                                  <span>
                                    <IconButton size="small" onClick={() => handleDownloadOrderChallan(txn)}
                                      disabled={downloadingChallanId === (txn.orderId || txn.voucherId)}
                                      sx={{ color: '#0284C7', p: 0.5, backgroundColor: '#F0F9FF', '&:hover': { backgroundColor: '#E0F2FE' } }}>
                                      <Icon icon="lucide:truck" width={15} />
                                    </IconButton>
                                  </span>
                                </Tooltip>
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
                              {isOrder && (
                                <Tooltip title="Download Order Invoice" arrow>
                                  <span>
                                    <IconButton size="small" onClick={() => handleDownloadOrderInvoice(txn)}
                                      disabled={downloadingDocId === (txn.orderId || txn.voucherId)}
                                      sx={{ color: '#0D9488', p: 0.5, backgroundColor: '#F0FDFA', '&:hover': { backgroundColor: '#CCFBF1' } }}>
                                      <Icon icon="solar:bill-list-bold" width={15} />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}
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
                                        Owner: {cust.ownerName || '—'} | Mob: {cust.mobile || '—'} | GST: {cust.gstin || (cust.isGSTRegistered ? 'Registered' : 'Non-GST')}
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
                                      {isOrder && (
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
                                                {item.brand || item.brandName || '—'}
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
                                      {matchedOrder && (
                                        <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                          <Typography variant="caption" sx={{ color: '#475569' }}>
                                            Taxable: <strong>₹{Number(matchedOrder.taxableAmount || 0).toLocaleString('en-IN')}</strong>
                                          </Typography>
                                          <Typography variant="caption" sx={{ color: '#475569' }}>
                                            GST: <strong>₹{Number(matchedOrder.gstAmount || 0).toLocaleString('en-IN')}</strong>
                                          </Typography>
                                          <Typography variant="caption" sx={{ color: '#0F172A', fontWeight: 700 }}>
                                            Grand Total: ₹{Number(matchedOrder.grandTotal || 0).toLocaleString('en-IN')}
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
                                          &nbsp;|&nbsp; Due: <strong style={{ color: dueAmount > 0 ? '#EF4444' : '#059669' }}>₹{dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
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
                                                {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : '—'}
                                              </TableCell>
                                              <TableCell sx={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 600, color: '#0284C7' }}>
                                                {p.referenceNumber || p.paymentNumber}
                                              </TableCell>
                                              <TableCell sx={{ fontSize: '0.72rem', color: '#475569' }}>
                                                {p.paymentMode || 'Bank'}
                                              </TableCell>
                                              <TableCell sx={{ fontSize: '0.72rem', color: '#475569' }}>
                                                {p.remarks || (pIdx === 0 && p.paymentNumber?.startsWith('ADV') ? 'Booking Advance' : 'Part Payment')}
                                              </TableCell>
                                              <TableCell align="right" sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669' }}>
                                                ₹{Number(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                              </TableCell>
                                              <TableCell align="center">
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                                  <Chip size="small" label="CLEARED"
                                                    sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, backgroundColor: '#DCFCE7', color: '#15803D' }} />
                                                  <Tooltip title="Download Receipt" arrow>
                                                    <span>
                                                      <IconButton size="small" onClick={() => handleDownloadReceipt(p)}
                                                        disabled={downloadingReceiptId === (p.paymentId || p.paymentNumber)}
                                                        sx={{ color: '#059669', p: 0.25, '&:hover': { backgroundColor: '#DCFCE7' } }}>
                                                        <Icon icon="lucide:receipt" width={13} />
                                                      </IconButton>
                                                    </span>
                                                  </Tooltip>
                                                </Box>
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
    </Box>
  );
};

export default CustomerKhataStatement;
