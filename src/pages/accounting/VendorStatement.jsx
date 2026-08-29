import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Grid,
  Chip,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  MenuItem,
  CircularProgress
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [voucherType, setVoucherType] = useState('');

  const [payoutModalOpen, setPayoutModalOpen] = useState(false);

  const fetchStatement = async () => {
    try {
      setLoading(true);
      const res = await getVendorStatement(vendorId, {
        startDate,
        endDate,
        voucherType
      });
      setStatementData(res.data || null);
    } catch (err) {
      toast.error(err.message || 'Failed to load vendor statement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vendorId) {
      fetchStatement();
    }
  }, [vendorId, voucherType]);

  const summary = statementData?.summary || {};
  const stats = summary?.statistics || {};
  const transactions = statementData?.transactions || [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="text"
            startIcon={<Icon icon="lucide:arrow-left" />}
            onClick={() => navigate('/accounting/vendor-ledgers')}
            sx={{ textTransform: 'none' }}
          >
            Back to Vendors
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Vendor Payable Statement
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Icon icon="lucide:printer" />}
            onClick={() => window.print()}
            sx={{ borderRadius: '8px', textTransform: 'none' }}
          >
            Print
          </Button>
          <Button
            variant="contained"
            startIcon={<Icon icon="lucide:arrow-up-right" />}
            onClick={() => setPayoutModalOpen(true)}
            sx={{ borderRadius: '8px', textTransform: 'none', px: 2.5, backgroundColor: '#E11D48', '&:hover': { backgroundColor: '#BE123C' } }}
          >
            Record Payout
          </Button>
        </Box>
      </Box>

      {/* Vendor Profile Card */}
      {summary.vendor && (
        <Card sx={{ p: 3, mb: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={7}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {summary.vendor.firm || summary.vendor.name}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Contact Person: <strong>{summary.vendor.name}</strong> | Mobile: <strong>{summary.vendor.mobile}</strong>
              </Typography>
              {summary.vendor.gstin && (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  GSTIN: {summary.vendor.gstin}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Chip size="small" label={`Ledger: ${summary.ledgerMaster?.ledgerCode}`} />
                <Chip size="small" label={`Category: ${summary.ledgerMaster?.vendorCategory}`} />
                <Chip size="small" label={`Credit Terms: ${summary.ledgerMaster?.paymentTerms || 0} Days`} />
              </Box>
            </Grid>
            <Grid item xs={12} md={5} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>CURRENT OUTSTANDING PAYABLE</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#E11D48' }}>
                ₹{Number(stats.currentOutstanding || 0).toLocaleString()}
              </Typography>
            </Grid>
          </Grid>
        </Card>
      )}

      {/* Summary Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Opening Payable</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              ₹{Number(stats.openingBalance || 0).toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={4}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: '1px solid #FECDD3', backgroundColor: '#FFF1F2' }}>
            <Typography variant="caption" sx={{ color: '#E11D48' }}>Total Purchases (Credit)</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#E11D48' }}>
              ₹{Number(stats.totalCredit || 0).toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={4}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: '1px solid #A7F3D0', backgroundColor: '#ECFDF5' }}>
            <Typography variant="caption" sx={{ color: '#059669' }}>Total Payouts / Returns (Debit)</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#059669' }}>
              ₹{Number(stats.totalDebit || 0).toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filter Bar */}
      <Card sx={{ p: 2, mb: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              label="From Date"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="To Date"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              select
              label="Voucher Filter"
              size="small"
              value={voucherType}
              onChange={(e) => setVoucherType(e.target.value)}
              fullWidth
            >
              <MenuItem value="">All Vouchers</MenuItem>
              <MenuItem value="Purchase Invoice">Purchase Invoice</MenuItem>
              <MenuItem value="Payment Voucher">Payment Voucher</MenuItem>
              <MenuItem value="Debit Note">Debit Note (Return)</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              variant="contained"
              onClick={fetchStatement}
              startIcon={<Icon icon="lucide:filter" />}
              fullWidth
              sx={{ height: 40, borderRadius: '8px', textTransform: 'none' }}
            >
              Apply Filter
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : transactions.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            No transactions found for this vendor.
          </Typography>
        </Card>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Voucher Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Reference No.</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Narration / Details</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#059669' }}>Debit (Payout/Return ₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#E11D48' }}>Credit (Purchase ₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Running Payable (₹)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t._id} hover>
                  <TableCell>{new Date(t.transactionDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={t.voucherType}
                      color={t.voucherType === 'Payment Voucher' ? 'success' : t.voucherType === 'Debit Note' ? 'warning' : 'default'}
                      sx={{ fontWeight: 600, height: 22 }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                    {t.referenceNumber}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>{t.narration || '—'}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: t.debit > 0 ? '#059669' : 'inherit' }}>
                    {t.debit > 0 ? `₹${Number(t.debit).toLocaleString()}` : '—'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: t.credit > 0 ? '#E11D48' : 'inherit' }}>
                    {t.credit > 0 ? `₹${Number(t.credit).toLocaleString()}` : '—'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    ₹{Number(t.runningBalance || 0).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Payout Modal */}
      {summary.vendor && (
        <VendorPayoutModal
          open={payoutModalOpen}
          onClose={() => setPayoutModalOpen(false)}
          vendor={{
            _id: summary.vendor.id,
            firm: summary.vendor.firm,
            name: summary.vendor.name,
            mobile: summary.vendor.mobile,
            currentOutstanding: stats.currentOutstanding
          }}
          onSuccess={fetchStatement}
        />
      )}
    </Box>
  );
};

export default VendorStatement;
