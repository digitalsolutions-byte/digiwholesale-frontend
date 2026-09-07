import React, { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Button, Grid, Chip, IconButton,
  TextField, Table, TableHead, TableRow, TableCell, TableBody,
  Paper, CircularProgress, Divider, Alert
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getCustomerStatement, adjustDueFromAdvance, downloadPaymentReceipt } from '../../services/accountingService';
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

const CustomerKhataStatement = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState(false);
  const [summary, setSummary] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [filters, setFilters] = useState({ startDate: '', endDate: '' });
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState(null);

  const fetchStatement = async () => {
    try {
      setLoading(true);
      const res = await getCustomerStatement(customerId, filters);
      setSummary(res.data?.summary || {});
      const rawTxns = res.data?.transactions || [];
      const sorted = [...rawTxns].sort((a, b) => new Date(b.transactionDate || b.createdAt) - new Date(a.transactionDate || a.createdAt));
      setTransactions(sorted);
    } catch (err) {
      toast.error(err.message || 'Failed to load customer statement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) { fetchStatement(); }
  }, [customerId]);

  const stats = summary.statistics || {};
  const master = summary.ledgerMaster || {};
  const cust = summary.customer || {};
  const creditLimit = Number(master.creditLimit || 0);
  const creditUsed = Number(master.creditUsed || 0);
  const advanceAmount = Number(master.advanceAmount || 0);
  const availableCredit = Number(master.availableCredit !== undefined ? master.availableCredit : Math.max(0, creditLimit - creditUsed));
  const maxAdjustable = Math.min(creditUsed, advanceAmount);

  // ── Bulletproof Dedicated Print Engine (Zero CSS / Layout clipping) ──────────
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
    const gstin = cust.gstin || 'Unregistered';
    const addr = formatAddress(cust.address);
    const ledgerCode = master.ledgerCode || '—';
    const periodText = filters.startDate ? `${filters.startDate} to ${filters.endDate || 'Present'}` : 'Full History';
    const printDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const totalDebit = Number(stats.totalDebit || 0).toLocaleString('en-IN');
    const totalCredit = Number(stats.totalCredit || 0).toLocaleString('en-IN');
    const netBalanceText = creditUsed > 0
      ? `₹${creditUsed.toLocaleString('en-IN')} (Due / Receivable)`
      : advanceAmount > 0
      ? `₹${advanceAmount.toLocaleString('en-IN')} (Advance Balance)`
      : '₹0.00 (Settled)';

    const rowsHtml = transactions.length === 0
      ? '<tr><td colspan="7" style="padding:20px;text-align:center;color:#64748b;">No transactions recorded for this period.</td></tr>'
      : transactions.map((t, idx) => {
          const isDebit = Number(t.debit || 0) > 0;
          const isCredit = Number(t.credit || 0) > 0;
          const rb = Number(t.runningBalance || 0);
          const rbText = rb > 0
            ? `<span style="color:#b91c1c;font-weight:700;">₹${rb.toLocaleString('en-IN')} (Due)</span>`
            : rb < 0
            ? `<span style="color:#15803d;font-weight:700;">₹${Math.abs(rb).toLocaleString('en-IN')} (Adv)</span>`
            : '<span style="color:#64748b;">₹0.00</span>';

          return `
            <tr style="background-color: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'};">
              <td style="padding:6px 8px;text-align:center;color:#64748b;font-size:10px;">${idx + 1}</td>
              <td style="padding:6px 8px;white-space:nowrap;font-size:10.5px;">${new Date(t.transactionDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
              <td style="padding:6px 8px;font-family:monospace;font-weight:700;font-size:10.5px;">${t.referenceNumber || '—'}</td>
              <td style="padding:6px 8px;font-size:10.5px;color:#334155;">${t.narration || '—'}</td>
              <td style="padding:6px 8px;text-align:right;font-size:10.5px;${isDebit ? 'color:#b91c1c;font-weight:700;' : 'color:#94a3b8;'}">${isDebit ? '₹' + Number(t.debit).toLocaleString('en-IN') : '—'}</td>
              <td style="padding:6px 8px;text-align:right;font-size:10.5px;${isCredit ? 'color:#15803d;font-weight:700;' : 'color:#94a3b8;'}">${isCredit ? '₹' + Number(t.credit).toLocaleString('en-IN') : '—'}</td>
              <td style="padding:6px 8px;text-align:right;font-size:10.5px;">${rbText}</td>
            </tr>
          `;
        }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Statement - ${customerName}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 10mm 12mm 10mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            background: #ffffff;
            color: #0f172a;
            padding: 16px;
            font-size: 11px;
          }
          .header-bar {
            border-bottom: 2.5px solid #0284c7;
            padding-bottom: 12px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .brand-title {
            font-size: 24px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.5px;
          }
          .brand-title span {
            color: #0284c7;
          }
          .company-details {
            font-size: 10.5px;
            color: #475569;
            margin-top: 3px;
            line-height: 1.4;
          }
          .doc-header {
            text-align: right;
          }
          .doc-title {
            font-size: 18px;
            font-weight: 800;
            color: #0284c7;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .doc-meta {
            font-size: 10.5px;
            color: #64748b;
            margin-top: 3px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 12px;
            margin-bottom: 16px;
          }
          .info-box {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 10px 12px;
            background: #f8fafc;
          }
          .box-title {
            font-size: 10px;
            font-weight: 800;
            color: #0284c7;
            text-transform: uppercase;
            margin-bottom: 4px;
            letter-spacing: 0.5px;
          }
          .kpi-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 16px;
            text-align: center;
          }
          .kpi-card {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px;
            background: #f8fafc;
          }
          .kpi-card.highlight {
            background: ${creditUsed > 0 ? '#fee2e2' : '#f0fdf4'};
            border-color: ${creditUsed > 0 ? '#fca5a5' : '#86efac'};
          }
          .kpi-card-title {
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
          }
          .kpi-card-val {
            font-size: 12.5px;
            font-weight: 800;
            margin-top: 2px;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            text-align: left;
            font-size: 10.5px;
          }
          th {
            background: #f1f5f9;
            font-weight: 700;
            color: #1e293b;
            text-transform: uppercase;
            font-size: 10px;
          }
          tfoot tr {
            background: #f1f5f9;
            font-weight: 700;
          }
          .terms-grid {
            display: grid;
            grid-template-columns: 1.4fr 1fr;
            gap: 16px;
            margin-top: 16px;
            border-top: 1px solid #cbd5e1;
            padding-top: 12px;
            page-break-inside: avoid;
          }
          .terms-title {
            font-size: 10px;
            font-weight: 800;
            color: #475569;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .terms-list {
            margin: 0;
            padding-left: 14px;
            font-size: 9.5px;
            color: #64748b;
            line-height: 1.4;
          }
          .sign-box {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: flex-end;
            min-height: 65px;
          }
          .sign-line {
            border-top: 1px solid #94a3b8;
            width: 160px;
            text-align: center;
            padding-top: 3px;
            font-size: 9.5px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header-bar">
          <div>
            <div class="brand-title">Digi<span>Optics</span> Wholesale</div>
            <div class="company-details">
              WeWork Eldeco Centre, Block A, Shivalik Colony, Malviya Nagar, New Delhi 110017<br />
              <strong>GSTIN:</strong> GST9876543210 &nbsp;|&nbsp; <strong>Phone:</strong> +91 9650560526 &nbsp;|&nbsp; <strong>Email:</strong> billing@digioptics.com
            </div>
          </div>
          <div class="doc-header">
            <div class="doc-title">Statement of Account</div>
            <div class="doc-meta"><strong>Date:</strong> ${printDate}</div>
            <div class="doc-meta"><strong>Period:</strong> ${periodText}</div>
          </div>
        </div>

        <!-- Customer & Khata Summary Grid -->
        <div class="grid-2">
          <div class="info-box">
            <div class="box-title">Customer / Billed To</div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${customerName}</div>
            <div style="margin-top: 2px;"><strong>Contact Person:</strong> ${ownerName}</div>
            <div><strong>Mobile:</strong> ${mobile} &nbsp;|&nbsp; <strong>Email:</strong> ${email}</div>
            <div><strong>GSTIN:</strong> ${gstin}</div>
            ${addr ? `<div style="color: #64748b; margin-top: 2px;"><strong>Address:</strong> ${addr}</div>` : ''}
          </div>

          <div class="info-box">
            <div class="box-title">Khata / Account Summary</div>
            <div><strong>Ledger Code:</strong> <span style="font-family: monospace; font-weight: 700;">${ledgerCode}</span></div>
            <div><strong>Credit Limit:</strong> ₹${creditLimit.toLocaleString('en-IN')} &nbsp;|&nbsp; <strong>Terms:</strong> ${master.creditDays || 30} Days</div>
            <div><strong>Available Credit:</strong> ₹${availableCredit.toLocaleString('en-IN')}</div>
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between;">
              <strong>Account Position:</strong>
              <span style="font-weight: 800; color: ${creditUsed > 0 ? '#b91c1c' : advanceAmount > 0 ? '#15803d' : '#334155'};">
                ${netBalanceText}
              </span>
            </div>
          </div>
        </div>

        <!-- KPI Summary Cards -->
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-card-title">Total Invoiced (Debit)</div>
            <div class="kpi-card-val">₹${totalDebit}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card-title">Total Received (Credit)</div>
            <div class="kpi-card-val" style="color: #15803d;">₹${totalCredit}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card-title">Advance Balance</div>
            <div class="kpi-card-val" style="color: #0284c7;">₹${advanceAmount.toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card highlight">
            <div class="kpi-card-title" style="color: ${creditUsed > 0 ? '#991b1b' : '#166534'};">Net Closing Balance</div>
            <div class="kpi-card-val" style="color: ${creditUsed > 0 ? '#b91c1c' : '#15803d'}; font-weight: 900;">
              ${creditUsed > 0 ? '₹' + creditUsed.toLocaleString('en-IN') + ' (Due)' : advanceAmount > 0 ? '₹' + advanceAmount.toLocaleString('en-IN') + ' (Adv)' : '₹0.00'}
            </div>
          </div>
        </div>

        <!-- Statement Table -->
        <table>
          <thead>
            <tr>
              <th style="text-align: center; width: 35px;">#</th>
              <th style="width: 75px;">Date</th>
              <th style="width: 130px;">Ref / Voucher No.</th>
              <th>Particulars / Narration</th>
              <th style="text-align: right; width: 85px;">Debit (₹)</th>
              <th style="text-align: right; width: 85px;">Credit (₹)</th>
              <th style="text-align: right; width: 110px;">Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align: right; text-transform: uppercase;">Period Totals:</td>
              <td style="text-align: right; color: #b91c1c;">₹${totalDebit}</td>
              <td style="text-align: right; color: #15803d;">₹${totalCredit}</td>
              <td style="text-align: right; color: #0f172a;">${creditUsed > 0 ? '₹' + creditUsed.toLocaleString('en-IN') + ' (Due)' : advanceAmount > 0 ? '₹' + advanceAmount.toLocaleString('en-IN') + ' (Adv)' : '₹0.00'}</td>
            </tr>
          </tfoot>
        </table>

        <!-- Terms & Signatory -->
        <div class="terms-grid">
          <div>
            <div class="terms-title">Terms & Conditions:</div>
            <ul class="terms-list">
              <li>This is a computer-generated financial statement and requires no physical signature.</li>
              <li>Please verify all invoice and payment entries. Report any discrepancy within 7 days.</li>
              <li>Interest @18% p.a. is applicable on invoices overdue beyond the agreed credit period.</li>
              <li>All payments must be made strictly via RTGS/NEFT/UPI/Cheque in favor of DigiOptics Wholesale.</li>
            </ul>
          </div>
          <div class="sign-box">
            <div style="font-weight: 800; color: #0f172a;">For DigiOptics Wholesale</div>
            <div class="sign-line">Authorized Signatory</div>
          </div>
        </div>
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
      toast.success(res.message || (`₹${maxAdjustable.toLocaleString()} adjusted successfully from Advance!`));
      await fetchStatement();
    } catch (err) {
      toast.error(err.message || 'Failed to adjust advance');
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1300, mx: 'auto' }}>
      {/* Top Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/accounting/customer-khata')}
            startIcon={<Icon icon="lucide:arrow-left" />}
            sx={{ borderRadius: '8px', textTransform: 'none', color: '#0284C7', borderColor: '#BAE6FD' }}
          >
            Back to Khatas
          </Button>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon="lucide:file-spreadsheet" className="text-[#0284C7]" />
              Customer Khata Statement
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Complete ledger transactions, debits, credits, and live balance history
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {maxAdjustable > 0 && (
            <Button
              variant="outlined"
              color="secondary"
              disabled={adjusting}
              onClick={handleAutoAdjustAdvance}
              startIcon={adjusting ? <CircularProgress size={16} color="inherit" /> : <Icon icon="lucide:zap" />}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
            >
              Auto-Adjust Advance (₹{maxAdjustable.toLocaleString()})
            </Button>
          )}

          <Button
            variant="contained"
            color="success"
            onClick={() => setPaymentModalOpen(true)}
            startIcon={<Icon icon="lucide:circle-plus" />}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
          >
            Receive Payment
          </Button>

          <Button
            variant="contained"
            onClick={handlePrint}
            startIcon={<Icon icon="lucide:printer" />}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 700,
              backgroundColor: '#0284C7',
              '&:hover': { backgroundColor: '#0369A1' },
              boxShadow: '0 2px 8px rgba(2,132,199,0.25)'
            }}
          >
            Print Statement
          </Button>
        </Box>
      </Box>

      {/* Customer & Khata Summary Header Card */}
      {summary.customer && (
        <Card sx={{ p: 3, mb: 3, borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={7}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
                {summary.customer?.shopName || summary.customer?.ownerName}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Owner: <strong>{summary.customer?.ownerName || '—'}</strong> | Mobile: <strong>{summary.customer?.mobile || '—'}</strong>
              </Typography>
              {summary.customer?.gstin && (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                  GSTIN: {summary.customer?.gstin}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 2, mt: 1.5, flexWrap: 'wrap' }}>
                <Chip
                  label={`Ledger: ${master.ledgerCode || '—'}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                />
                <Chip
                  label={`Credit Limit: ₹${creditLimit.toLocaleString()}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label={`Terms: ${master.creditDays || 30} Days`}
                  size="small"
                  variant="outlined"
                />
                <Typography variant="caption" sx={{ alignSelf: 'center', color: 'text.secondary' }}>
                  Available Limit: ₹{availableCredit.toLocaleString()}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={5} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 700 }}>
                Current Account Position
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 900,
                  color: creditUsed > 0 ? '#EF4444' : advanceAmount > 0 ? '#10B981' : '#6B7280',
                  mt: 0.5
                }}
              >
                {creditUsed > 0
                  ? (`₹${creditUsed.toLocaleString()} (Due)`)
                  : advanceAmount > 0
                  ? (`₹${advanceAmount.toLocaleString()} (Advance)`)
                  : '₹0 (Settled)'}
              </Typography>
              <Chip
                size="small"
                label={creditUsed > 0 ? 'Payment Due (Receivable)' : advanceAmount > 0 ? 'Advance Balance Available' : 'Account Settled'}
                color={creditUsed > 0 ? 'error' : advanceAmount > 0 ? 'success' : 'default'}
                sx={{ mt: 1, fontWeight: 700 }}
              />
            </Grid>
          </Grid>
        </Card>
      )}

      {/* 4 Financial Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: '12px', border: '1px solid #FECDD3', backgroundColor: '#FFF1F2' }}>
            <Typography variant="caption" sx={{ color: '#E11D48', fontWeight: 700 }}>Credit Used (Receivable)</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#E11D48' }}>
              ₹{creditUsed.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>Total Invoiced (Debit)</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>
              ₹{Number(stats.totalDebit || 0).toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: '12px', border: '1px solid #A7F3D0', backgroundColor: '#ECFDF5' }}>
            <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700 }}>Total Received (Credit)</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#059669' }}>
              ₹{Number(stats.totalCredit || 0).toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: '12px', border: '1px solid #BAE6FD', backgroundColor: '#F0F9FF' }}>
            <Typography variant="caption" sx={{ color: '#0284C7', fontWeight: 700 }}>Advance Available (Jama)</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0284C7' }}>
              ₹{advanceAmount.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Date Filters Card */}
      <Card sx={{ p: 2, mb: 3, borderRadius: '12px', border: '1px solid #E2E8F0' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              type="date"
              size="small"
              label="From Date"
              InputLabelProps={{ shrink: true }}
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              type="date"
              size="small"
              label="To Date"
              InputLabelProps={{ shrink: true }}
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              variant="contained"
              onClick={fetchStatement}
              startIcon={<Icon icon="lucide:filter" />}
              fullWidth
              sx={{ borderRadius: '8px', textTransform: 'none', height: 40, backgroundColor: '#0284C7', '&:hover': { backgroundColor: '#0369A1' } }}
            >
              Apply Filter
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* Interactive Transactions Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : transactions.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            No transactions found for this customer khata in selected date range.
          </Typography>
        </Card>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Reference No.</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Narration / Details</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Debit (₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Credit (₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Running Balance (₹)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: 130 }}>Action / Receipt</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((txn, idx) => {
                const isDebit = Number(txn.debit || 0) > 0;
                const isCredit = Number(txn.credit || 0) > 0;
                const rb = Number(txn.runningBalance || 0);

                return (
                  <TableRow key={txn._id || idx} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {new Date(txn.transactionDate).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {txn.referenceNumber || '—'}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 320, color: 'text.secondary', fontSize: '0.85rem' }}>
                      {txn.narration || '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: isDebit ? 700 : 400, color: isDebit ? '#E11D48' : 'text.secondary' }}>
                      {isDebit ? (`₹${Number(txn.debit).toLocaleString()}`) : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: isCredit ? 700 : 400, color: isCredit ? '#059669' : 'text.secondary' }}>
                      {isCredit ? (`₹${Number(txn.credit).toLocaleString()}`) : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {rb > 0 ? (
                        <span style={{ color: '#EF4444' }}>{`₹${rb.toLocaleString()} (Due)`}</span>
                      ) : rb < 0 ? (
                        <span style={{ color: '#059669' }}>{`₹${Math.abs(rb).toLocaleString()} (Adv)`}</span>
                      ) : (
                        <span style={{ color: '#6B7280' }}>₹0</span>
                      )}
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                      {(isCredit || txn.voucherType === 'Receipt' || (txn.referenceNumber && txn.referenceNumber.startsWith('CPAY'))) ? (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={downloadingReceiptId === (txn.voucherId || txn.referenceNumber || txn._id)}
                          onClick={() => handleDownloadReceipt(txn)}
                          startIcon={
                            downloadingReceiptId === (txn.voucherId || txn.referenceNumber || txn._id) ? (
                              <CircularProgress size={13} color="inherit" />
                            ) : (
                              <Icon icon="lucide:file-text" />
                            )
                          }
                          sx={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: '8px',
                            py: 0.4,
                            px: 1.2,
                            borderColor: '#0284C7',
                            color: '#0284C7',
                            '&:hover': {
                              backgroundColor: '#E0F2FE',
                              borderColor: '#0369A1',
                            }
                          }}
                        >
                          Receipt PDF
                        </Button>
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Payment Modal */}
      {paymentModalOpen && (
        <CustomerPaymentModal
          open={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          customer={{
            _id: customerId,
            shopName: summary.customer?.shopName,
            ownerName: summary.customer?.ownerName,
            mobile: summary.customer?.mobile,
            creditLimit,
            creditUsed,
            advanceAmount,
            currentBalance: master.currentBalance
          }}
          onSuccess={() => fetchStatement()}
        />
      )}
    </Box>
  );
};

export default CustomerKhataStatement;
