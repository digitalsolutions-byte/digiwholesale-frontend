import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography,
  TextField, MenuItem, Button, Grid, Table, TableHead, TableRow,
  TableCell, TableBody, Divider, Paper, Alert, CircularProgress, Chip
} from '@mui/material';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import { executeCustomerPayment, downloadPaymentReceipt } from '../../services/accountingService';
import api from '../../services/apiInstance';

const CustomerPaymentModal = ({ open, onClose, customer, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [unpaidOrders, setUnpaidOrders] = useState([]);
  const [formData, setFormData] = useState({
    amount: '',
    paymentMode: 'UPI',
    paymentDetails: {
      utrNumber: '',
      receiverUpiId: '',
      chequeNumber: '',
      bankName: '',
      chequeDate: '',
      cashVoucherNo: '',
      remarks: ''
    }
  });
  const [allocations, setAllocations] = useState({});

  useEffect(() => {
    if (open && customer?._id) {
      fetchCustomerOrders(customer._id);
      setFormData({
        amount: '',
        paymentMode: 'UPI',
        paymentDetails: {
          utrNumber: '',
          receiverUpiId: '',
          chequeNumber: '',
          bankName: '',
          chequeDate: '',
          cashVoucherNo: '',
          remarks: ''
        }
      });
      setAllocations({});
    }
  }, [open, customer]);

  const fetchCustomerOrders = async (customerId) => {
    try {
      setOrdersLoading(true);
      const res = await api.get('/api/order/all-orders');
      const allOrders = res.data?.data || res.data?.orders || [];
      const custOrders = allOrders.filter(
        (o) => o.customer?.customerId === customerId || o.customer?.id === customerId || o.customerId === customerId
      );
      setUnpaidOrders(custOrders.slice(0, 10));
    } catch (err) {
      console.warn('Failed to load pending orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + (Number(val) || 0), 0);
  const enteredAmount = Number(formData.amount) || 0;
  const pendingCreditUsed = Number(customer?.creditUsed || 0);
  const currentAdvance = Number(customer?.advanceAmount || 0);
  const creditLimit = Number(customer?.creditLimit || 0);

  const adjustedAgainstCreditUsed = Math.min(enteredAmount, pendingCreditUsed);
  const remainingCreditUsedAfterPayment = Math.max(0, pendingCreditUsed - enteredAmount);
  const excessNewAdvance = Math.max(0, enteredAmount - pendingCreditUsed);

  const handleAutoSplit = () => {
    let remaining = enteredAmount;
    const newAlloc = {};
    unpaidOrders.forEach((ord) => {
      if (remaining <= 0) return;
      const ordTotal = Number(ord.totalOrderPrice || ord.price || 5000);
      const toAlloc = Math.min(remaining, ordTotal);
      newAlloc[ord._id] = toAlloc;
      remaining -= toAlloc;
    });
    setAllocations(newAlloc);
  };

  const handleSubmit = async () => {
    try {
      if (!enteredAmount || enteredAmount <= 0) {
        toast.warning('Please enter a valid payment amount');
        return;
      }
      setLoading(true);
      const allocationList = Object.keys(allocations).map((ordId) => {
        const ord = unpaidOrders.find((o) => o._id === ordId);
        return {
          invoiceId: ordId,
          invoiceNumber: ord?.orderNumber || 'ORD-REF',
          invoiceTotal: Number(ord?.totalOrderPrice || ord?.price || 0),
          allocatedAmount: Number(allocations[ordId])
        };
      }).filter((a) => a.allocatedAmount > 0);

      const payload = {
        customerId: customer._id,
        amount: enteredAmount,
        paymentMode: formData.paymentMode,
        allocations: allocationList,
        paymentDetails: formData.paymentDetails
      };

            const res = await executeCustomerPayment(payload);
      const createdPayment = res?.data || res;
      toast.success(`Payment of ₹${enteredAmount.toLocaleString()} recorded! Receipt sent to customer email.`);
      
      if (createdPayment?._id) {
        try {
          await downloadPaymentReceipt(createdPayment._id, `Receipt-${createdPayment.paymentNumber || 'CPAY'}`);
        } catch (dlErr) {
          console.warn('Receipt download skipped:', dlErr);
        }
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Payment execution failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #E2E8F0' }}>
        <Icon icon="lucide:arrow-down-left" style={{ color: '#10B981', fontSize: '24px' }} />
        Collect Customer Payment (Inflow)
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {/* Customer Header Card */}
        <Paper elevation={0} sx={{ p: 2.5, mb: 3, backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {customer?.shopName || customer?.ownerName || 'Customer'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Owner: {customer?.ownerName} | Mobile: {customer?.mobile}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Chip size="small" label={"Credit Limit: ₹" + creditLimit.toLocaleString()} />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Box sx={{ display: 'inline-block', textAlign: 'right' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block' }}>
                  PENDING RECEIVABLE (CREDIT USED)
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: pendingCreditUsed > 0 ? '#EF4444' : '#10B981' }}>
                  {pendingCreditUsed > 0 ? ('₹' + pendingCreditUsed.toLocaleString()) : '₹0 (Clear)'}
                </Typography>
                {currentAdvance > 0 && (
                  <Chip size="small" label={"Existing Advance: ₹" + currentAdvance.toLocaleString()} color="success" sx={{ mt: 0.5, fontWeight: 700 }} />
                )}
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Payment Amount & Mode */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Payment Amount Received (₹)"
              type="number"
              size="small"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              fullWidth
              required
              helperText="Gross amount received from customer"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Payment Mode"
              size="small"
              value={formData.paymentMode}
              onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
              fullWidth
            >
              <MenuItem value="UPI">UPI</MenuItem>
              <MenuItem value="CASH">Cash Counter</MenuItem>
              <MenuItem value="CHEQUE">Cheque (A/C Payee)</MenuItem>
              <MenuItem value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</MenuItem>
            </TextField>
          </Grid>
        </Grid>

        {/* Live Settlement Breakdown Alert */}
        {enteredAmount > 0 && (
          <Alert severity="info" sx={{ mb: 3, borderRadius: '10px' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Payment Settlement Breakdown (Auto-Rule):
            </Typography>
            <Typography variant="body2">
              • <strong>₹{adjustedAgainstCreditUsed.toLocaleString()}</strong> will be adjusted to settle pending Credit Used (Receivable).
            </Typography>
            <Typography variant="body2">
              • Remaining Credit Used (Due): <strong>₹{remainingCreditUsedAfterPayment.toLocaleString()}</strong>.
            </Typography>
            {excessNewAdvance > 0 ? (
              <Typography variant="body2" sx={{ color: '#059669', fontWeight: 700 }}>
                • Excess <strong>₹{excessNewAdvance.toLocaleString()}</strong> will be credited to Customer's Advance Khata (Total Advance: ₹{(currentAdvance + excessNewAdvance).toLocaleString()}).
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                • Advance generated: ₹0 (Advance tabhi create hota hai jab Credit Used ₹0 ho jaye).
              </Typography>
            )}
          </Alert>
        )}

        {/* Dynamic Mode Details */}
        {formData.paymentMode === 'UPI' && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="UPI Transaction ID / UTR No."
                size="small"
                value={formData.paymentDetails.utrNumber}
                onChange={(e) => setFormData({
                  ...formData,
                  paymentDetails: { ...formData.paymentDetails, utrNumber: e.target.value }
                })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Receiver UPI ID"
                size="small"
                value={formData.paymentDetails.receiverUpiId}
                onChange={(e) => setFormData({
                  ...formData,
                  paymentDetails: { ...formData.paymentDetails, receiverUpiId: e.target.value }
                })}
                fullWidth
              />
            </Grid>
          </Grid>
        )}

        {formData.paymentMode === 'CHEQUE' && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Cheque Number"
                size="small"
                value={formData.paymentDetails.chequeNumber}
                onChange={(e) => setFormData({
                  ...formData,
                  paymentDetails: { ...formData.paymentDetails, chequeNumber: e.target.value }
                })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Bank Name"
                size="small"
                value={formData.paymentDetails.bankName}
                onChange={(e) => setFormData({
                  ...formData,
                  paymentDetails: { ...formData.paymentDetails, bankName: e.target.value }
                })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                type="date"
                label="Cheque Date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={formData.paymentDetails.chequeDate}
                onChange={(e) => setFormData({
                  ...formData,
                  paymentDetails: { ...formData.paymentDetails, chequeDate: e.target.value }
                })}
                fullWidth
              />
            </Grid>
          </Grid>
        )}

        {formData.paymentMode === 'CASH' && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Cash Receipt / Voucher No."
                size="small"
                value={formData.paymentDetails.cashVoucherNo}
                onChange={(e) => setFormData({
                  ...formData,
                  paymentDetails: { ...formData.paymentDetails, cashVoucherNo: e.target.value }
                })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Remarks / Notes"
                size="small"
                value={formData.paymentDetails.remarks}
                onChange={(e) => setFormData({
                  ...formData,
                  paymentDetails: { ...formData.paymentDetails, remarks: e.target.value }
                })}
                fullWidth
              />
            </Grid>
          </Grid>
        )}

        {/* Invoice Allocations Section */}
        {unpaidOrders.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Split Payment Across Open Orders ({unpaidOrders.length} Pending)
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={handleAutoSplit}
                disabled={enteredAmount <= 0}
                sx={{ textTransform: 'none', borderRadius: '6px', fontSize: '0.75rem' }}
              >
                Auto-Split ₹{enteredAmount}
              </Button>
            </Box>

            <Paper variant="outlined" sx={{ borderRadius: '8px', overflow: 'hidden' }}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Order No.</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Bill Total (₹)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, width: '160px' }}>Allocated (₹)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {unpaidOrders.map((ord) => {
                    const ordTotal = Number(ord.totalOrderPrice || ord.price || 0);
                    return (
                      <TableRow key={ord._id}>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {ord.orderNumber || ord._id.slice(-6).toUpperCase()}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>
                          {new Date(ord.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right">₹{ordTotal.toLocaleString()}</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            size="small"
                            value={allocations[ord._id] || ''}
                            onChange={(e) => setAllocations({
                              ...allocations,
                              [ord._id]: Number(e.target.value)
                            })}
                            inputProps={{ max: ordTotal, min: 0, style: { textAlign: 'right', padding: '4px 8px' } }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, borderTop: '1px solid #E2E8F0' }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || enteredAmount <= 0}
          sx={{ textTransform: 'none', backgroundColor: '#10B981', fontWeight: 700 }}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : 'Confirm & Post Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomerPaymentModal;