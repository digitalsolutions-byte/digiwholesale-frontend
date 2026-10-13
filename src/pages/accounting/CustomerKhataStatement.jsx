import React, { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Button, Grid, Chip, IconButton,
  TextField, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, Paper, CircularProgress, Divider, Alert,
  LinearProgress, Tabs, Tab, Tooltip, Collapse
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  getCustomerStatement,
  adjustDueFromAdvance,
  downloadPaymentReceipt,
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
  const [activeTab, setActiveTab] = useState(0);

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
    setActiveTab(0);
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
    const totalDebit = Number(stats.totalDebit || 0).toLocaleString('en-IN');
    const totalCredit = Number(stats.totalCredit || 0).toLocaleString('en-IN');

    const rowsHtml = transactions
      .map((t, idx) => {
        const d = t.transactionDate ? new Date(t.transactionDate).toLocaleDateString('en-IN') : '—';
        const debit = t.debit > 0 ? `₹${Number(t.debit).toLocaleString('en-IN')}` : '—';
        const credit = t.credit > 0 ? `₹${Number(t.credit).toLocaleString('en-IN')}` : '—';
        const bal = t.runningBalance > 0
          ? `₹${Number(t.runningBalance).toLocaleString('en-IN')} (Due)`
          : t.runningBalance < 0
            ? `₹${Number(Math.abs(t.runningBalance)).toLocaleString('en-IN')} (Adv)`
            : '₹0';
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

  const handleDownloadReceipt = async (txn) => {
    const refKey = txn.voucherId || txn.referenceNumber || txn._id;
    try {
      setDownloadingReceiptId(refKey);
      await downloadPaymentReceipt(refKey, `Receipt-${txn.referenceNumber || 'CPAY'}`);
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
              ₹{Number(stats.totalDebit || 0).toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>Total Received</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#059669', mt: 0.25 }}>
              ₹{Number(stats.totalCredit || 0).toLocaleString()}
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

      {/* Tabs */}
      <Card elevation={0} sx={{ mb: 3, borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          sx={{ px: 2, borderBottom: '1px solid #E2E8F0' }}
        >
          <Tab
            label={`Ledger Statement (${transactions.length})`}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' }}
          />
          <Tab
            label={`Orders & Part Payments (${orders.length})`}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' }}
          />
          <Tab
            label={`Monthly View (${monthlyBreakdown.length})`}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' }}
          />
        </Tabs>
      </Card>

      {/* TAB 0: Ledger Transactions */}
      {activeTab === 0 && (
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
          ) : transactions.length === 0 ? (
            <Card elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <Typography variant="body2" sx={{ color: '#64748B' }}>
                No transactions found for this customer ledger in the selected date range.
              </Typography>
            </Card>
          ) : (
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                overflowX: 'auto',
                width: '100%'
              }}
            >
              <Table sx={{ minWidth: 950 }}>
                <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ width: 44, p: 0.5, textAlign: 'center' }} />
                    <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Order Date</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Ref / Order #</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Sales Person / User</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Order Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Order Total (₹)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Payment Received (₹)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Remaining Due (₹)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Receipt</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((txn, idx) => {
                    const rowKey = txn._id || txn.voucherId || txn.referenceNumber || idx;
                    const isOrder = Boolean(txn.orderGrandTotal != null || txn.orderStatus || (txn.referenceNumber && txn.referenceNumber.startsWith('BO-')) || txn.voucherType === 'Sales Invoice');
                    const orderTotal = Number(txn.orderGrandTotal != null ? txn.orderGrandTotal : txn.debit || 0);
                    const paidAmount = Number(txn.orderPaidAmount != null ? txn.orderPaidAmount : txn.credit || 0);
                    const dueAmount = Number(txn.orderBalanceDue != null ? txn.orderBalanceDue : Math.max(0, orderTotal - paidAmount));
                    const orderBadge = getStatusBadge(txn.orderStatus);
                    const paymentsList = Array.isArray(txn.orderPayments) ? txn.orderPayments : [];
                    const hasParts = paymentsList.length > 0;
                    const isExpanded = expandedRowId === rowKey;

                    return (
                      <React.Fragment key={rowKey}>
                        <TableRow hover sx={{ backgroundColor: isExpanded ? '#F0F9FF' : 'inherit' }}>
                          <TableCell sx={{ width: 44, p: 0.5, textAlign: 'center' }}>
                            {hasParts ? (
                              <IconButton
                                size="small"
                                onClick={() => toggleExpandRow(rowKey)}
                                sx={{ color: isExpanded ? '#0284C7' : '#64748B', p: 0.5 }}
                                title={isExpanded ? 'Hide payment installments' : 'View payment installments'}
                              >
                                <Icon icon={isExpanded ? 'solar:alt-arrow-down-bold' : 'solar:alt-arrow-right-bold'} width={16} />
                              </IconButton>
                            ) : null}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8125rem', color: '#475569' }}>
                            {txn.orderDate || txn.transactionDate ? new Date(txn.orderDate || txn.transactionDate).toLocaleDateString('en-IN') : '—'}
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8125rem', color: '#0F172A' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <span>{txn.referenceNumber || txn.voucherId || '—'}</span>
                              {hasParts && (
                                <Chip
                                  size="small"
                                  label={`${paymentsList.length} ${paymentsList.length === 1 ? 'Payment' : 'Payments'}`}
                                  onClick={() => toggleExpandRow(rowKey)}
                                  sx={{
                                    height: 18,
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    backgroundColor: isExpanded ? '#BAE6FD' : '#E0F2FE',
                                    color: '#0369A1',
                                    cursor: 'pointer'
                                  }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8125rem', color: '#0F172A' }}>
                              {txn.createdByName || 'Sales Staff'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {txn.orderStatus ? (
                              <Chip
                                size="small"
                                label={txn.orderStatus}
                                sx={{
                                  backgroundColor: orderBadge.bg,
                                  color: orderBadge.text,
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                  height: 20
                                }}
                              />
                            ) : (
                              <Typography variant="caption" sx={{ color: '#94A3B8' }}>—</Typography>
                            )}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, color: '#0F172A', fontSize: '0.8125rem' }}>
                            {orderTotal > 0 ? `₹${orderTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : (isOrder ? '₹0.00' : '—')}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: paidAmount > 0 ? '#059669' : '#94A3B8', fontSize: '0.8125rem' }}>
                            {paidAmount > 0 ? `₹${paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00'}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                            {isOrder ? (
                              dueAmount > 0 ? (
                                <span style={{ color: '#EF4444' }}>{`₹${dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Due)`}</span>
                              ) : (
                                <span style={{ color: '#059669' }}>₹0.00 (Paid)</span>
                              )
                            ) : (
                              <span style={{ color: '#64748B' }}>—</span>
                            )}
                          </TableCell>
                          <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                            {Boolean(isOrder || Number(txn.credit) > 0 || txn.voucherType === 'Receipt' || (txn.referenceNumber && txn.referenceNumber.startsWith('CPAY'))) ? (
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => handleDownloadReceipt(txn)}
                                disabled={downloadingReceiptId === (txn.voucherId || txn.referenceNumber || txn._id)}
                                sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600, color: '#0284C7', py: 0.25 }}
                              >
                                {downloadingReceiptId === (txn.voucherId || txn.referenceNumber || txn._id) ? 'Generating...' : 'Download'}
                              </Button>
                            ) : (
                              <Typography variant="caption" sx={{ color: '#CBD5E1' }}>—</Typography>
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Expandable Sub-row for Part Payments */}
                        {hasParts && (
                          <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                            <TableCell colSpan={9} sx={{ py: 0, px: 2, borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none' }}>
                              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                <Box sx={{ py: 1.5, px: 2, my: 1, backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #CBD5E1', borderLeft: '4px solid #0284C7', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '0.8125rem' }}>
                                      Payments Received for Order #{txn.referenceNumber || txn.voucherId}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#475569' }}>
                                      Total Received: <strong style={{ color: '#059669' }}>₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> of ₹{orderTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &nbsp;|&nbsp; Remaining Due: <strong style={{ color: dueAmount > 0 ? '#EF4444' : '#059669' }}>₹{dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                    </Typography>
                                  </Box>
                                  <Table size="small">
                                    <TableHead sx={{ backgroundColor: '#F1F5F9' }}>
                                      <TableRow>
                                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569', width: 40 }}>#</TableCell>
                                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569' }}>Payment Date</TableCell>
                                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569' }}>Payment Ref / Voucher</TableCell>
                                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569' }}>Mode</TableCell>
                                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569' }}>Payment Type / Remarks</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569' }}>Amount Received (₹)</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569' }}>Status</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {paymentsList.map((p, pIdx) => (
                                        <TableRow key={p.paymentId || p.paymentNumber || pIdx} hover>
                                          <TableCell sx={{ fontSize: '0.75rem', color: '#64748B' }}>{pIdx + 1}</TableCell>
                                          <TableCell sx={{ fontSize: '0.75rem', color: '#334155', whiteSpace: 'nowrap' }}>
                                            {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : '—'}
                                          </TableCell>
                                          <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 600, color: '#0284C7' }}>
                                            {p.referenceNumber || p.paymentNumber}
                                          </TableCell>
                                          <TableCell sx={{ fontSize: '0.75rem', color: '#475569' }}>
                                            {p.paymentMode || 'Advance / Bank'}
                                          </TableCell>
                                          <TableCell sx={{ fontSize: '0.75rem', color: '#475569' }}>
                                            {p.remarks || (pIdx === 0 && p.paymentNumber?.startsWith('ADV') ? 'Initial Booking Advance' : 'Part Payment')}
                                          </TableCell>
                                          <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>
                                            ₹{Number(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </TableCell>
                                          <TableCell align="center">
                                            <Chip
                                              size="small"
                                              label="CLEARED"
                                              sx={{ height: 18, fontSize: '0.625rem', fontWeight: 700, backgroundColor: '#DCFCE7', color: '#15803D' }}
                                            />
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
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
      )}

      {/* TAB 1: Orders & Part Payment Tracking */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A' }}>
              Part Payment & Order Breakdown Tracking
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              Track order-level advance, installment payments, and outstanding balances
            </Typography>
          </Box>

          {orders.length === 0 ? (
            <Card elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <Typography variant="body2" sx={{ color: '#64748B' }}>
                No bulk orders found for this customer.
              </Typography>
            </Card>
          ) : (
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                overflowX: 'auto',
                width: '100%'
              }}
            >
              <Table sx={{ minWidth: 900 }}>
                <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Order #</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Tax Type</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Order Total</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Paid Amount</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Due Balance</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Part Payment Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.map((ord) => {
                    const badge = getStatusBadge(ord.orderStatus);
                    const grandTotal = Number(ord.grandTotal || 0);
                    const paid = Number(ord.paidAmount || 0);
                    const due = Number(ord.balanceDue || 0);
                    const pct = grandTotal > 0 ? Math.min(100, Math.round((paid / grandTotal) * 100)) : 0;
                    const isFullyPaid = due <= 0;
                    const isPartPaid = paid > 0 && due > 0;

                    return (
                      <TableRow key={ord.orderId || ord._id} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#0284C7', fontSize: '0.8125rem' }}>
                          {ord.orderNumber}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8125rem', color: '#475569' }}>
                          {ord.orderDate ? new Date(ord.orderDate).toLocaleDateString('en-IN') : '—'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={ord.orderStatus || 'Submitted'}
                            sx={{
                              backgroundColor: badge.bg,
                              color: badge.text,
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              height: 20
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={ord.hasGST ? 'GST' : 'Non-GST'}
                            sx={{
                              backgroundColor: ord.hasGST ? '#ECFDF5' : '#F8FAFC',
                              color: ord.hasGST ? '#065F46' : '#64748B',
                              border: '1px solid',
                              borderColor: ord.hasGST ? '#A7F3D0' : '#E2E8F0',
                              fontSize: '0.7rem',
                              height: 20
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                          ₹{grandTotal.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#059669', fontWeight: 600, fontSize: '0.8125rem' }}>
                          ₹{paid.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ color: due > 0 ? '#E11D48' : '#64748B', fontWeight: 700, fontSize: '0.8125rem' }}>
                          {due > 0 ? `₹${due.toLocaleString()}` : 'Settled'}
                        </TableCell>
                        <TableCell sx={{ minWidth: 150 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: '100%', mr: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={pct}
                                sx={{
                                  height: 5,
                                  borderRadius: 3,
                                  backgroundColor: '#E2E8F0',
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: isFullyPaid ? '#10B981' : isPartPaid ? '#F59E0B' : '#94A3B8'
                                  }
                                }}
                              />
                            </Box>
                            <Typography variant="caption" sx={{ minWidth: 35, fontWeight: 600, color: '#475569', fontSize: '0.7rem' }}>
                              {pct}%
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.7rem' }}>
                            {isFullyPaid ? 'Fully Paid' : isPartPaid ? 'Part Payment' : 'Unpaid'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {due > 0 ? (
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              onClick={() => handleOpenPartPayment(ord)}
                              sx={{
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                borderRadius: '6px',
                                px: 1,
                                py: 0.25
                              }}
                            >
                              Pay Due
                            </Button>
                          ) : (
                            <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600 }}>Cleared</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* TAB 2: Monthly Breakdown View */}
      {activeTab === 2 && (
        <Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A' }}>
              Monthly Accounting & Invoicing View
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              Summary of monthly debits (sales invoices) vs credits (receipts)
            </Typography>
          </Box>

          {monthlyBreakdown.length === 0 ? (
            <Card elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <Typography variant="body2" sx={{ color: '#64748B' }}>
                No monthly transactions recorded yet.
              </Typography>
            </Card>
          ) : (
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                overflowX: 'auto',
                width: '100%'
              }}
            >
              <Table sx={{ minWidth: 750 }}>
                <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Month & Year</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Invoiced Sales (Debit ₹)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Collections Received (Credit ₹)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Net Monthly Movement (₹)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Transactions</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {monthlyBreakdown.map((mb) => {
                    const isNetPositive = mb.netMovement > 0;
                    return (
                      <TableRow key={mb.month} hover>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem', color: '#0F172A' }}>
                          {mb.monthLabel || mb.month}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: '#E11D48', fontSize: '0.8125rem' }}>
                          ₹{Number(mb.totalDebit || 0).toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: '#059669', fontSize: '0.8125rem' }}>
                          ₹{Number(mb.totalCredit || 0).toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: isNetPositive ? '#E11D48' : '#059669', fontSize: '0.8125rem' }}>
                          {isNetPositive
                            ? `+₹${mb.netMovement.toLocaleString()} (Added)`
                            : `-₹${Math.abs(mb.netMovement).toLocaleString()} (Cleared)`}
                        </TableCell>
                        <TableCell align="center">
                          <Chip size="small" label={`${mb.transactionsCount} txns`} sx={{ fontSize: '0.7rem', height: 20 }} />
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => handleFilterMonth(mb.month)}
                            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', color: '#0284C7' }}
                          >
                            View Month
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

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
