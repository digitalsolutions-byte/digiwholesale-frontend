import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  MenuItem,
  CircularProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import { getPaymentsList } from '../../services/accountingService';

const PaymentList = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (search) params.search = search;

      const res = await getPaymentsList(params);
      setPayments(res.data?.payments || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [typeFilter]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon icon="lucide:receipt" style={{ color: '#00A2FF' }} />
            Payments & Voucher Register
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Complete audit record of Customer Inflows, Vendor Outflows, Cheques, UPI, and Bank Vouchers
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Card sx={{ mb: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={typeFilter}
          onChange={(e, val) => setTypeFilter(val)}
          sx={{ px: 2, pt: 1 }}
        >
          <Tab value="ALL" label="All Vouchers" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab value="CUSTOMER_INFLOW" label="Customer Receipts (Inflow)" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab value="VENDOR_OUTFLOW" label="Vendor Payouts (Outflow)" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>
      </Card>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : payments.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            No payment vouchers found.
          </Typography>
        </Card>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Voucher No.</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Party Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Mode</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Gross (₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Net Paid (₹)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((p) => {
                const isInflow = p.type === 'CUSTOMER_INFLOW';
                return (
                  <TableRow key={p._id} hover>
                    <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                      {p.paymentNumber}
                    </TableCell>
                    <TableCell>{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={isInflow ? 'Inflow' : 'Outflow'}
                        color={isInflow ? 'success' : 'error'}
                        sx={{ height: 22, fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{p.partyName || 'Party'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={p.paymentMode} variant="outlined" sx={{ height: 22 }} />
                    </TableCell>
                    <TableCell align="right">₹{Number(p.grossAmount || 0).toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: isInflow ? '#059669' : '#E11D48' }}>
                      ₹{Number(p.netAmountPaid || p.grossAmount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={p.status}
                        color={p.status === 'COMPLETED' || p.status === 'CLEARED' ? 'success' : p.status === 'BOUNCED' ? 'error' : 'default'}
                        sx={{ height: 22, fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => setSelectedVoucher(p)}
                        sx={{ textTransform: 'none' }}
                      >
                        View Slip
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Voucher Slip Modal */}
      <Dialog open={Boolean(selectedVoucher)} onClose={() => setSelectedVoucher(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid #E5E7EB' }}>
          Payment Voucher Receipt
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedVoucher && (
            <Box>
              <Paper elevation={0} sx={{ p: 2, mb: 2, backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>VOUCHER NUMBER</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                  {selectedVoucher.paymentNumber}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Date: {new Date(selectedVoucher.createdAt).toLocaleString()}
                </Typography>
              </Paper>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Party Name</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{selectedVoucher.partyName}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Payment Mode</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{selectedVoucher.paymentMode}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Gross Amount</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>₹{Number(selectedVoucher.grossAmount).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Net Amount</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#059669' }}>
                    ₹{Number(selectedVoucher.netAmountPaid).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>

              {selectedVoucher.advanceAmount > 0 && (
                <Typography variant="body2" sx={{ color: '#D97706', fontWeight: 600, mb: 1 }}>
                  Advance Balance Credited: ₹{Number(selectedVoucher.advanceAmount).toLocaleString()}
                </Typography>
              )}

              {selectedVoucher.paymentDetails && (
                <Paper elevation={0} sx={{ p: 1.5, backgroundColor: '#F3F4F6', borderRadius: '6px' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>Payment Reference Details:</Typography>
                  {selectedVoucher.paymentDetails.utrNumber && (
                    <Typography variant="caption" sx={{ display: 'block' }}>UTR: {selectedVoucher.paymentDetails.utrNumber}</Typography>
                  )}
                  {selectedVoucher.paymentDetails.chequeNumber && (
                    <Typography variant="caption" sx={{ display: 'block' }}>Cheque: #{selectedVoucher.paymentDetails.chequeNumber} ({selectedVoucher.paymentDetails.bankName})</Typography>
                  )}
                  {selectedVoucher.paymentDetails.receiverUpiId && (
                    <Typography variant="caption" sx={{ display: 'block' }}>UPI ID: {selectedVoucher.paymentDetails.receiverUpiId}</Typography>
                  )}
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedVoucher(null)} sx={{ textTransform: 'none' }}>Close</Button>
          <Button variant="contained" onClick={() => window.print()} sx={{ textTransform: 'none' }}>Print Voucher</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentList;
