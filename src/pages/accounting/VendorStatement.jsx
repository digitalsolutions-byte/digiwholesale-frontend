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
      setStatementData(res.data || null);
    } catch (err) {
      toast.error(err.message || 'Failed to load vendor statement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vendorId) fetchStatement();
  }, [vendorId]);

  const summary = statementData?.summary || {};
  const stats = summary.statistics || {};
  const master = summary.ledgerMaster || {};
  const transactions = statementData?.transactions || [];

  const currentOutstanding = Number(master.currentOutstanding || 0);
  const totalCredit = Number(stats.totalCredit || 0);
  const totalDebit = Number(stats.totalDebit || 0);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Icon icon="lucide:arrow-left" />}
            onClick={() => navigate('/accounting/vendor-ledgers')}
            sx={{ borderRadius: '8px', textTransform: 'none' }}
          >
            Back to Vendors
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Vendor Khata Statement
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<Icon icon="lucide:printer" />}
            onClick={() => window.print()}
            sx={{ borderRadius: '8px', textTransform: 'none' }}
          >
            Print Statement
          </Button>
          <Button
            variant="contained"
            startIcon={<Icon icon="lucide:arrow-up-right" />}
            onClick={() => setPayoutModalOpen(true)}
            sx={{ borderRadius: '8px', textTransform: 'none', backgroundColor: '#E11D48', fontWeight: 600, '&:hover': { backgroundColor: '#BE123C' } }}
          >
            Record Payout
          </Button>
        </Box>
      </Box>

      {summary.vendor && (
        <Card sx={{ p: 3, mb: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={7}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {summary.vendor.firm || summary.vendor.name}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Contact: <strong>{summary.vendor.name}</strong> | Mobile: <strong>{summary.vendor.mobile}</strong>
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
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.5 }}>
                CURRENT OUTSTANDING PAYABLE
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
      )}

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

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : transactions.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            No transactions found for this vendor khata in selected date range.
          </Typography>
        </Card>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Reference No.</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Narration / Details</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#059669' }}>Debit / Paid Out (₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#E11D48' }}>Credit / Purchased (₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Running Payable (₹)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((t, idx) => {
                const isDebit  = Number(t.debit  || 0) > 0;
                const isCredit = Number(t.credit || 0) > 0;
                const rb = Number(t.runningBalance || 0);
                return (
                  <TableRow key={t._id || idx} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {new Date(t.transactionDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {t.referenceNumber || '—'}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 320, color: 'text.secondary', fontSize: '0.85rem' }}>
                      {t.narration || '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: isDebit ? 700 : 400, color: isDebit ? '#059669' : 'text.secondary' }}>
                      {isDebit ? `₹${Number(t.debit).toLocaleString()}` : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: isCredit ? 700 : 400, color: isCredit ? '#E11D48' : 'text.secondary' }}>
                      {isCredit ? `₹${Number(t.credit).toLocaleString()}` : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {rb > 0 ? (
                        <span style={{ color: '#E11D48' }}>₹{rb.toLocaleString()} (Due)</span>
                      ) : rb < 0 ? (
                        <span style={{ color: '#059669' }}>₹{Math.abs(rb).toLocaleString()} (Adv)</span>
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

      {payoutModalOpen && summary.vendor && (
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
