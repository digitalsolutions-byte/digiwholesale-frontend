import React, { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Button, Grid, Chip, Paper,
  Table, TableHead, TableRow, TableCell, TableBody,
  TextField, CircularProgress, Divider
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getVendorStatement } from '../../services/accountingService';
import VendorPayoutModal from './VendorPayoutModal';

const VendorStatement = () => {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statementData, setStatementData] = useState(null);
  const [filters, setFilters] = useState({ startDate: '', endDate: '' });
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);

  const fetchStatement = async () => {
    try {
      setLoading(true);
      const res = await getVendorStatement(vendorId, filters);
      const data = res.data || {};
      const txns = data.transactions || [];
      const sorted = [...txns].sort((a, b) => new Date(b.transactionDate || b.createdAt) - new Date(a.transactionDate || a.createdAt));
      setStatementData({ ...data, transactions: sorted });
    } catch (err) {
      toast.error(err.message || 'Failed to load vendor statement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vendorId) { fetchStatement(); }
  }, [vendorId]);

  const handlePrint = () => { window.print(); };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const vendor = statementData?.vendor || {};
  const master = statementData?.ledgerMaster || {};
  const stats = statementData?.statistics || {};
  const transactions = statementData?.transactions || [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1300, mx: 'auto' }}>

      {/* ════════════════════════════════════════════════════════════════════════
          PRINT ONLY VIEW: Executive Vendor Statement
          ════════════════════════════════════════════════════════════════════════ */}
      <div className="print-only statement-print-wrapper" style={{ display: 'none' }}>
        {/* Letterhead */}
        <div style={{ borderBottom: '2px solid #0284c7', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.5px' }}>
              Digi<span style={{ color: '#0284c7' }}>Optics</span> Wholesale
            </div>
            <div style={{ fontSize: '10.5px', color: '#475569', marginTop: '2px' }}>
              WeWork Eldeco Centre, Block A, Shivalik Colony, Malviya Nagar, New Delhi 110017
            </div>
            <div style={{ fontSize: '10.5px', color: '#475569' }}>
              <strong>GSTIN:</strong> GST9876543210 &nbsp;|&nbsp; <strong>Phone:</strong> +91 9650560526
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase' }}>
              Vendor Account Statement
            </div>
            <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '3px' }}>
              <strong>Date:</strong> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>
              <strong>Period:</strong> {filters.startDate ? `${filters.startDate} to ${filters.endDate || 'Present'}` : 'Full History'}
            </div>
          </div>
        </div>

        {/* Vendor & Ledger Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px 12px', backgroundColor: '#f8fafc' }}>
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', marginBottom: '4px' }}>Vendor / Supplier Details</div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{vendor.name || vendor.firmName || 'Supplier'}</div>
            <div style={{ fontSize: '11px', color: '#334155', marginTop: '2px' }}><strong>Contact Person:</strong> {vendor.contactPerson || '—'}</div>
            <div style={{ fontSize: '11px', color: '#334155' }}><strong>Mobile:</strong> {vendor.mobile || '—'} &nbsp;|&nbsp; <strong>GSTIN:</strong> {vendor.gstNumber || 'Unregistered'}</div>
          </div>

          <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px 12px', backgroundColor: '#f8fafc' }}>
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', marginBottom: '4px' }}>Khata / Balance Overview</div>
            <div style={{ fontSize: '11px', color: '#334155' }}><strong>Ledger Code:</strong> {master.ledgerCode || '—'}</div>
            <div style={{ fontSize: '11px', color: '#334155' }}><strong>Total Purchases (Credit):</strong> ₹{Number(stats.totalCredit || 0).toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: '#334155' }}><strong>Total Payouts (Debit):</strong> ₹{Number(stats.totalDebit || 0).toLocaleString()}</div>
            <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Net Payable to Vendor:</span>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#b91c1c' }}>
                ₹{Number(master.currentBalance || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <table className="statement-print-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center', width: '35px' }}>#</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'left', width: '75px' }}>Date</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'left', width: '130px' }}>Ref No.</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'left' }}>Particulars / Narration</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'right', width: '90px' }}>Debit (Payout)</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'right', width: '90px' }}>Credit (Purchase)</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'right', width: '105px' }}>Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn, idx) => (
              <tr key={txn._id || idx} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center', color: '#64748b', fontSize: '10px' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', whiteSpace: 'nowrap', fontSize: '10.5px' }}>
                  {new Date(txn.transactionDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', fontFamily: 'monospace', fontWeight: '700', fontSize: '10.5px' }}>
                  {txn.referenceNumber || '—'}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', fontSize: '10.5px', color: '#334155' }}>
                  {txn.narration || '—'}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'right', color: Number(txn.debit || 0) > 0 ? '#15803d' : '#94a3b8', fontSize: '10.5px', fontWeight: Number(txn.debit || 0) > 0 ? '700' : '400' }}>
                  {Number(txn.debit || 0) > 0 ? `₹${Number(txn.debit).toLocaleString()}` : '—'}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'right', color: Number(txn.credit || 0) > 0 ? '#b91c1c' : '#94a3b8', fontSize: '10.5px', fontWeight: Number(txn.credit || 0) > 0 ? '700' : '400' }}>
                  {Number(txn.credit || 0) > 0 ? `₹${Number(txn.credit).toLocaleString()}` : '—'}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'right', fontWeight: '700', fontSize: '10.5px' }}>
                  ₹{Number(txn.runningBalance || 0).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SCREEN VIEW: Interactive View
          ════════════════════════════════════════════════════════════════════════ */}
      <Box className="no-print">
        {/* Top Actions */}
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
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
                Vendor Account Statement
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Supplier purchases, debit notes, payouts and live ledger
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setPayoutModalOpen(true)}
              startIcon={<Icon icon="lucide:arrow-up-right" />}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, backgroundColor: '#0284C7' }}
            >
              Record Payout
            </Button>
            <Button
              variant="outlined"
              onClick={handlePrint}
              startIcon={<Icon icon="lucide:printer" />}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, borderColor: '#0284C7', color: '#0284C7' }}
            >
              Print Statement
            </Button>
          </Box>
        </Box>

        {/* Vendor Header Card */}
        <Card sx={{ p: 3, mb: 3, borderRadius: '16px', border: '1px solid #E2E8F0' }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={7}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
                {vendor.name || vendor.firmName}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Contact: <strong>{vendor.contactPerson || '—'}</strong> | Mobile: <strong>{vendor.mobile || '—'}</strong>
              </Typography>
              {summary.vendor.gstin && (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  GSTIN: {summary.vendor.gstin}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                <Chip size="small" label={`Ledger: ${master.ledgerCode || 'VEND-LED'}`} sx={{ fontWeight: 600 }} />
                <Chip size="small" label={`Category: ${master.vendorCategory || '—'}`} variant="outlined" sx={{ fontWeight: 600 }} />
                <Chip size="small" label={`Terms: ${master.paymentTerms || 0} Days`} sx={{ fontWeight: 600 }} />
                {master.tdsApplicable && (
                  <Chip size="small" label={`TDS: ${master.tdsSection} (${master.tdsPercentage}%)`} color="warning" sx={{ fontWeight: 600 }} />
                )}
              </Box>
            </Grid>

            <Grid item xs={12} md={5} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 700 }}>
                Net Balance Payable to Vendor
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: currentOutstanding > 0 ? '#E11D48' : '#6B7280', mt: 0.5 }}>
                {currentOutstanding > 0 ? `₹${currentOutstanding.toLocaleString()} (Payable)` : '₹0 (Settled)'}
              </Typography>
              <Chip
                size="small"
                label={currentOutstanding > 0 ? 'Payment Due (Payable)' : 'Account Settled'}
                color={currentOutstanding > 0 ? 'error' : 'default'}
                sx={{ mt: 1, fontWeight: 700 }}
              />
            </Grid>
          </Grid>
        </Card>


        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: '1px solid #FECDD3', backgroundColor: '#FFF1F2' }}>
              <Typography variant="caption" sx={{ color: '#E11D48', fontWeight: 700 }}>Outstanding Payable</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#E11D48' }}>
                ₹{currentOutstanding.toLocaleString()}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>Total Purchased (Credit)</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                ₹{totalCredit.toLocaleString()}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: '1px solid #A7F3D0', backgroundColor: '#ECFDF5' }}>
              <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700 }}>Total Paid Out (Debit)</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#059669' }}>
                ₹{totalDebit.toLocaleString()}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>Opening Balance</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                ₹{Number(stats.openingBalance || 0).toLocaleString()}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Card sx={{ p: 2, mb: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
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
            <Grid item xs={12} sm={4}>
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
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                onClick={fetchStatement}
                startIcon={<Icon icon="lucide:filter" />}
                fullWidth
                sx={{ borderRadius: '8px', textTransform: 'none', height: 40, backgroundColor: '#00A2FF' }}
              >
                Apply Filter
              </Button>
            </Grid>
          </Grid>
        </Card>

        {/* Statement Table */}
        <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Reference No.</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Narration / Details</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#059669' }}>Debit (Payout/Return ₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#E11D48' }}>Credit (Purchase ₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Running Balance (₹)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((txn, idx) => (
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
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#059669' }}>
                    {Number(txn.debit || 0) > 0 ? (`₹${Number(txn.debit).toLocaleString()}`) : '—'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#E11D48' }}>
                    {Number(txn.credit || 0) > 0 ? (`₹${Number(txn.credit).toLocaleString()}`) : '—'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    ₹{Number(txn.runningBalance || 0).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      {/* Vendor Payout Modal */}
      {payoutModalOpen && (
        <VendorPayoutModal
          open={payoutModalOpen}
          onClose={() => setPayoutModalOpen(false)}
          vendor={{
            _id: summary.vendor.id,
            firm: summary.vendor.firm,
            name: summary.vendor.name,
            mobile: summary.vendor.mobile,
            gstNumber: summary.vendor.gstin,
            pan: master.pan,
            currentOutstanding,
            tdsApplicable: master.tdsApplicable,
            tdsSection: master.tdsSection,
            tdsPercentage: master.tdsPercentage
          }}
          onSuccess={fetchStatement}
        />
      )}
    </Box>
  );
};

export default VendorStatement;
