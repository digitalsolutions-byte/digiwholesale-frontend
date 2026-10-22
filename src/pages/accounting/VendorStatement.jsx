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

  const handleDownloadReceipt = async (txn) => {
    const refKey = txn.voucherId || txn.referenceNumber || txn._id;
    try {
      setDownloadingReceiptId(refKey);
      await downloadPaymentReceipt(refKey, `VendorPayoutReceipt-${txn.referenceNumber || refKey}`);
      toast.success('Payout receipt downloaded successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to download receipt');
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  const handleDownloadLedgerStatement = async () => {
    try {
      setDownloadingStatement(true);
      const safeName = (vendor.firm || vendor.name || 'vendor').replace(/[^a-z0-9]/gi, '-').toLowerCase();
      await downloadVendorLedgerStatement(
        vendorId,
        `VendorStatement-${safeName}`,
        true,
        filters
      );
      toast.success('Vendor ledger statement downloaded');
    } catch (err) {
      toast.error(err.message || 'Failed to download statement');
    } finally {
      setDownloadingStatement(false);
    }
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
