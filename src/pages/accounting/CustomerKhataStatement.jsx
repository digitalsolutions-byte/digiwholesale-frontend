import React, { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Button, Grid, Chip, IconButton,
  TextField, MenuItem, Table, TableHead, TableRow, TableCell, TableBody,
  Paper, CircularProgress, Divider, Alert
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getCustomerStatement, adjustDueFromAdvance } from '../../services/accountingService';
import CustomerPaymentModal from './CustomerPaymentModal';

const CustomerKhataStatement = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState(false);
  const [summary, setSummary] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', voucherType: '' });
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const fetchStatement = async () => {
    try {
      setLoading(true);
      const res = await getCustomerStatement(customerId, filters);
      setSummary(res.data?.summary || {});
      setTransactions(res.data?.transactions || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load customer statement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) { fetchStatement(); }
  }, [customerId]);

  const handlePrint = () => { window.print(); };

  const stats = summary.statistics || {};
  const master = summary.ledgerMaster || {};
  const creditLimit = Number(master.creditLimit || 0);
  const creditUsed = Number(master.creditUsed || 0);
  const advanceAmount = Number(master.advanceAmount || 0);
  const availableCredit = Number(master.availableCredit !== undefined ? master.availableCredit : Math.max(0, creditLimit - creditUsed));
  const maxAdjustable = Math.min(creditUsed, advanceAmount);

  const handleAutoAdjustAdvance = async () => {
    if (maxAdjustable <= 0) return;
    try {
      setAdjusting(true);
      const res = await adjustDueFromAdvance({ customerId, amount: maxAdjustable });
      toast.success(res.message || ('₹' + maxAdjustable.toLocaleString() + ' adjusted successfully from Advance!'));
      await fetchStatement();
    } catch (err) {
      toast.error(err.message || 'Failed to adjust advance');
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Top Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Icon icon="lucide:arrow-left" />}
            onClick={() => navigate('/accounting/customer-ledgers')}
            sx={{ borderRadius: '8px', textTransform: 'none' }}
          >
            Back to Khatas
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Customer Khata Statement
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {creditUsed > 0 && advanceAmount > 0 && (
            <Button
              variant="contained"
              startIcon={<Icon icon="lucide:arrow-left-right" />}
              onClick={handleAutoAdjustAdvance}
              disabled={adjusting}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                backgroundColor: '#D97706',
                color: '#fff',
                fontWeight: 700,
                '&:hover': { backgroundColor: '#B45309' }
              }}
            >
              {adjusting ? 'Adjusting...' : ('Adjust ₹' + maxAdjustable.toLocaleString() + ' Due from Advance')}
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<Icon icon="lucide:printer" />}
            onClick={handlePrint}
            sx={{ borderRadius: '8px', textTransform: 'none' }}
          >
            Print Statement
          </Button>
          <Button
            variant="contained"
            startIcon={<Icon icon="lucide:arrow-down-left" />}
            onClick={() => setPaymentModalOpen(true)}
            sx={{ borderRadius: '8px', textTransform: 'none', backgroundColor: '#00A2FF', fontWeight: 600 }}
          >
            Collect Payment
          </Button>
        </Box>
      </Box>

      {/* Advance Adjustment Prompt Banner when both creditUsed and advance exist */}
      {creditUsed > 0 && advanceAmount > 0 && (
        <Alert
          severity="warning"
          icon={<Icon icon="lucide:arrow-left-right" style={{ fontSize: '24px' }} />}
          action={
            <Button
              variant="contained"
              size="small"
              onClick={handleAutoAdjustAdvance}
              disabled={adjusting}
              sx={{
                backgroundColor: '#B45309',
                color: '#fff',
                fontWeight: 700,
                textTransform: 'none',
                '&:hover': { backgroundColor: '#92400E' }
              }}
            >
              {adjusting ? 'Adjusting...' : ('Knock Off ₹' + maxAdjustable.toLocaleString() + ' Now')}
            </Button>
          }
          sx={{ mb: 3, borderRadius: '12px', alignItems: 'center' }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Available Advance Balance: ₹{advanceAmount.toLocaleString()} | Outstanding Due: ₹{creditUsed.toLocaleString()}
          </Typography>
          <Typography variant="body2">
            Customer ke paas advance jama hai aur credit due pending hai. Aap ₹{maxAdjustable.toLocaleString()} ko direct advance se adjust kar sakte hain.
          </Typography>
        </Alert>
      )}

      {/* Customer Header Card */}
      {summary.customer && (
        <Card sx={{ p: 3, mb: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={7}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {summary.customer.shopName}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Owner: <strong>{summary.customer.ownerName}</strong> | Mobile: <strong>{summary.customer.mobile}</strong>
              </Typography>
              {summary.customer.gstin && (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  GSTIN: {summary.customer.gstin}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                <Chip size="small" label={"Ledger: " + (master.ledgerCode || 'CUST-LED')} sx={{ fontWeight: 600 }} />
                <Chip size="small" label={"Credit Limit: ₹" + creditLimit.toLocaleString()} color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
                <Chip size="small" label={"Terms: " + (master.creditDays || 0) + " Days"} sx={{ fontWeight: 600 }} />
                <Chip size="small" label={"Available Limit: ₹" + availableCredit.toLocaleString()} color="info" sx={{ fontWeight: 600 }} />
              </Box>
            </Grid>
            <Grid item xs={12} md={5} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.5 }}>
                CURRENT ACCOUNT POSITION
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  color: creditUsed > 0 ? '#EF4444' : advanceAmount > 0 ? '#10B981' : '#6B7280',
                  mt: 0.5
                }}
              >
                {creditUsed > 0
                  ? ('₹' + creditUsed.toLocaleString() + ' (Due)')
                  : advanceAmount > 0
                  ? ('₹' + advanceAmount.toLocaleString() + ' (Advance)')
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

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: '1px solid #FECDD3', backgroundColor: '#FFF1F2' }}>
            <Typography variant="caption" sx={{ color: '#E11D48', fontWeight: 700 }}>Credit Used (Receivable)</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#E11D48' }}>
              ₹{creditUsed.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>Total Invoiced (Debit)</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              ₹{Number(stats.totalDebit || 0).toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: '1px solid #A7F3D0', backgroundColor: '#ECFDF5' }}>
            <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700 }}>Total Received (Credit)</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#059669' }}>
              ₹{Number(stats.totalCredit || 0).toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: '1px solid #A7F3D0', backgroundColor: '#ECFDF5' }}>
            <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700 }}>Advance Available (Jama)</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#059669' }}>
              ₹{advanceAmount.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Card sx={{ p: 2, mb: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
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
            <TextField
              select
              size="small"
              label="Voucher Type"
              value={filters.voucherType}
              onChange={(e) => setFilters({ ...filters, voucherType: e.target.value })}
              fullWidth
            >
              <MenuItem value="">All Vouchers</MenuItem>
              <MenuItem value="Sales Invoice">Sales Invoice</MenuItem>
              <MenuItem value="Receipt">Payment Receipt</MenuItem>
              <MenuItem value="Journal Voucher">Journal Voucher (Adjustment)</MenuItem>
              <MenuItem value="Debit Note">Debit Note (Penalty / Charge)</MenuItem>
              <MenuItem value="Credit Note">Credit Note</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
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
        <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Voucher Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Reference No.</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Narration / Details</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Debit (₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Credit (₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Running Balance (₹)</TableCell>
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
                      {new Date(txn.transactionDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={txn.voucherType}
                        color={
                          txn.voucherType === 'Receipt'
                            ? 'success'
                            : txn.voucherType === 'Sales Invoice'
                            ? 'primary'
                            : txn.voucherType === 'Journal Voucher'
                            ? 'warning'
                            : txn.voucherType === 'Debit Note'
                            ? 'error'
                            : 'default'
                        }
                        sx={{ fontWeight: 600, height: 22 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {txn.referenceNumber || '—'}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 320, color: 'text.secondary', fontSize: '0.85rem' }}>
                      {txn.narration || '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: isDebit ? 700 : 400, color: isDebit ? '#E11D48' : 'text.secondary' }}>
                      {isDebit ? ('₹' + Number(txn.debit).toLocaleString()) : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: isCredit ? 700 : 400, color: isCredit ? '#059669' : 'text.secondary' }}>
                      {isCredit ? ('₹' + Number(txn.credit).toLocaleString()) : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {rb > 0 ? (
                        <span style={{ color: '#EF4444' }}>{'₹' + rb.toLocaleString() + ' (Due)'}</span>
                      ) : rb < 0 ? (
                        <span style={{ color: '#059669' }}>{'₹' + Math.abs(rb).toLocaleString() + ' (Adv)'}</span>
                      ) : (
                        <span style={{ color: '#6B7280' }}>₹0</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}

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