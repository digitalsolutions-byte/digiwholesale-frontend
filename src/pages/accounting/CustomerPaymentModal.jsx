import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography,
  TextField, MenuItem, Button, Grid, Table, TableHead, TableRow,
  TableCell, TableBody, TableFooter, TableContainer, Paper, Alert,
  CircularProgress, Chip, Tooltip
} from '@mui/material';
import { toast } from 'react-toastify';
import { executeCustomerPayment, downloadPaymentReceipt, getCustomerOrdersForLedger } from '../../services/accountingService';
import { getBankAccounts } from '../../services/dropdownService';
import api from '../../services/apiInstance';

const getStatusBadge = (status) => {
  switch ((status || '').toUpperCase()) {
    case 'DELIVERED':
    case 'COMPLETED':
      return { bg: '#DEF7EC', text: '#03543F' };
    case 'DISPATCHED':
      return { bg: '#E1EFFE', text: '#1E429F' };
    case 'READYTODISPATCH':
      return { bg: '#E1F8F7', text: '#067A75' };
    case 'PROCESSING':
    case 'QC':
      return { bg: '#FEF08A', text: '#854D0E' };
    case 'SUBMITTED':
      return { bg: '#F3E8FF', text: '#6B21A8' };
    default:
      return { bg: '#F3F4F6', text: '#374151' };
  }
};

const CustomerPaymentModal = ({ open, onClose, customer, initialOrder, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [unpaidOrders, setUnpaidOrders] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
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
      bankAccountId: '',
      bankAccountName: '',
      bankAccountNumber: '',
      isPostDated: false,
      remarks: ''
    }
  });
  const [allocations, setAllocations] = useState({});

  const fetchBankAccounts = async () => {
    try {
      setBankLoading(true);
      const res = await getBankAccounts({ isActive: true });
      const accs = res.data || [];
      setBankAccounts(accs);
      const defaultAcc = accs.find((a) => a.isDefault) || accs[0];
      if (defaultAcc) {
        setFormData((prev) => ({
          ...prev,
          paymentDetails: {
            ...prev.paymentDetails,
            bankAccountId: prev.paymentDetails.bankAccountId || defaultAcc._id,
            bankAccountName: prev.paymentDetails.bankAccountName || `${defaultAcc.bankName} - A/C ${defaultAcc.accountNumber.slice(-4)}`,
            bankAccountNumber: prev.paymentDetails.bankAccountNumber || defaultAcc.accountNumber,
            receiverUpiId: prev.paymentDetails.receiverUpiId || defaultAcc.upiId || ''
          }
        }));
      }
    } catch (err) {
      console.warn('Failed to load bank accounts:', err);
    } finally {
      setBankLoading(false);
    }
  };

  useEffect(() => {
    if (open && customer?._id) {
      fetchOrders(customer._id);
      fetchBankAccounts();
      const hasDue = initialOrder && Number(initialOrder.balanceDue || 0) > 0;
      const initAmt = hasDue ? initialOrder.balanceDue : '';
      setFormData({
        amount: initAmt ? String(initAmt) : '',
        paymentMode: 'UPI',
        paymentDetails: {
          utrNumber: '',
          receiverUpiId: '',
          chequeNumber: '',
          bankName: '',
          chequeDate: '',
          cashVoucherNo: '',
          bankAccountId: '',
          bankAccountName: '',
          bankAccountNumber: '',
          isPostDated: false,
          remarks: hasDue ? `Part payment for Order #${initialOrder.orderNumber}` : ''
        }
      });
      if (hasDue && initialOrder.orderId) {
        setAllocations({ [initialOrder.orderId]: Number(initAmt) });
      } else {
        setAllocations({});
      }
    }
  }, [open, customer, initialOrder]);

  const isFutureDate = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d.getTime() > today.getTime();
  };

  const handleChequeDateChange = (dateVal) => {
    const isFuture = isFutureDate(dateVal);
    setFormData((prev) => ({
      ...prev,
      paymentDetails: {
        ...prev.paymentDetails,
        chequeDate: dateVal,
        isPostDated: isFuture ? true : prev.paymentDetails.isPostDated
      }
    }));
  };

  const handleBankAccountSelect = (accId) => {
    const selected = bankAccounts.find((a) => a._id === accId);
    if (!selected) return;
    setFormData((prev) => ({
      ...prev,
      paymentDetails: {
        ...prev.paymentDetails,
        bankAccountId: selected._id,
        bankAccountName: `${selected.bankName} - A/C ${selected.accountNumber.slice(-4)}`,
        bankAccountNumber: selected.accountNumber,
        receiverUpiId: prev.paymentMode === 'UPI' && selected.upiId ? selected.upiId : prev.paymentDetails.receiverUpiId
      }
    }));
  };

  const fetchOrders = async (customerId) => {
    try {
      setOrdersLoading(true);
      let ords = [];
      try {
        const res = await getCustomerOrdersForLedger(customerId);
        ords = res.data?.orders || [];
      } catch (e) {
        const fallback = await api.get('/api/order/get-all-orders');
        const all = fallback.data?.data || fallback.data?.orders || [];
        ords = all.filter(
          (o) => o.customer?.customerId === customerId || o.customer?.id === customerId || o.customerId === customerId
        ).map((o) => ({
          _id: o._id,
          orderId: o._id,
          orderNumber: o.orders?.[0]?.orderNumber || o.orderNumber || o._id.slice(-6).toUpperCase(),
          orderDate: o.createdAt,
          createdAt: o.createdAt,
          orderStatus: o.orders?.[0]?.status || o.status || 'Submitted',
          grandTotal: Number(o.summary?.grandTotal || o.totalOrderPrice || o.price || 0),
          paidAmount: Number(o.advanceAmount || 0),
          balanceDue: Math.max(0, Number(o.summary?.grandTotal || o.totalOrderPrice || o.price || 0) - Number(o.advanceAmount || 0)),
          isGSTRegistered: Boolean(customer?.isGSTRegistered)
        }));
      }

      const pendingOrds = ords.filter((o) => Number(o.balanceDue || 0) > 0);
      const targetList = pendingOrds;

      // Sort strictly from Past to Recent (Oldest orders first - FIFO)
      const sortedPastToRecent = [...targetList].sort((a, b) => {
        const timeA = new Date(a.orderDate || a.createdAt || 0).getTime();
        const timeB = new Date(b.orderDate || b.createdAt || 0).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return (a.orderNumber || '').localeCompare(b.orderNumber || '');
      });

      setUnpaidOrders(sortedPastToRecent);
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

  // Total due across all pending orders
  const totalDueAcrossOrders = unpaidOrders.reduce((sum, ord) => {
    const grandTotal = Number(ord.grandTotal || ord.totalOrderPrice || 0);
    const paidSoFar = Number(ord.paidAmount || ord.advanceAmount || 0);
    const due = Number(ord.balanceDue !== undefined ? ord.balanceDue : Math.max(0, grandTotal - paidSoFar));
    return sum + due;
  }, 0);

  // Required allocation when unpaid orders are present: min(enteredAmount, totalDueAcrossOrders)
  const requiredAllocation = unpaidOrders.length > 0 ? Math.min(enteredAmount, totalDueAcrossOrders) : enteredAmount;
  const unallocatedAmount = enteredAmount > 0 ? Math.max(0, requiredAllocation - totalAllocated) : 0;
  const isOverAllocated = totalAllocated > enteredAmount;
  const isAllocationIncomplete = unpaidOrders.length > 0 && enteredAmount > 0 && totalAllocated < requiredAllocation;

  // Auto-Split: Bottom to Top (Fills the bottom-most order first, then proceeds upwards)
  const handleAutoSplit = () => {
    let remaining = enteredAmount;
    const newAlloc = {};

    // Initialize all orders with 0
    unpaidOrders.forEach((ord) => {
      const id = ord.orderId || ord._id;
      newAlloc[id] = 0;
    });

    // Iterate backwards from the bottom row to the top row
    for (let i = unpaidOrders.length - 1; i >= 0; i--) {
      if (remaining <= 0) break;
      const ord = unpaidOrders[i];
      const id = ord.orderId || ord._id;
      const grandTotal = Number(ord.grandTotal || ord.totalOrderPrice || 0);
      const paidSoFar = Number(ord.paidAmount || ord.advanceAmount || 0);
      const due = Number(ord.balanceDue !== undefined ? ord.balanceDue : Math.max(0, grandTotal - paidSoFar));

      const toAlloc = Math.min(remaining, due);
      newAlloc[id] = toAlloc;
      remaining -= toAlloc;
    }

    setAllocations(newAlloc);
  };

  const handleSetFullAllocation = (ord) => {
    const key = ord.orderId || ord._id;
    const due = Number(ord.balanceDue || ord.grandTotal || 0);
    const newAllocs = { ...allocations, [key]: due };
    setAllocations(newAllocs);
    const sum = Object.values(newAllocs).reduce((s, v) => s + Number(v || 0), 0);
    if (sum > enteredAmount) {
      setFormData(prev => ({ ...prev, amount: String(sum) }));
    }
  };

  const handleSubmit = async () => {
    try {
      if (!enteredAmount || enteredAmount <= 0) {
        toast.warning('Please enter a valid payment amount');
        return;
      }

      // Validation: Full distribution required before recording payment
      if (unpaidOrders.length > 0 && totalAllocated < requiredAllocation) {
        toast.warning(`Please allocate the full amount: ₹${unallocatedAmount.toLocaleString()} remains unallocated.`);
        return;
      }

      if (totalAllocated > enteredAmount) {
        toast.warning(`Total allocated (₹${totalAllocated.toLocaleString()}) cannot exceed received amount (₹${enteredAmount.toLocaleString()}).`);
        return;
      }

      if (['UPI', 'CHEQUE', 'BANK_TRANSFER'].includes(formData.paymentMode)) {
        if (!formData.paymentDetails.bankAccountId) {
          toast.warning('Please select the company bank account where this payment was received.');
          return;
        }
      }

      if (formData.paymentMode === 'CHEQUE') {
        if (!formData.paymentDetails.chequeNumber?.trim()) {
          toast.warning('Please enter the Cheque Number.');
          return;
        }
        if (!formData.paymentDetails.bankName?.trim()) {
          toast.warning('Please enter the Customer Bank Name.');
          return;
        }
        if (!formData.paymentDetails.chequeDate) {
          toast.warning('Please select the Cheque Date.');
          return;
        }
      }

      const isPDC = formData.paymentMode === 'CHEQUE' && Boolean(formData.paymentDetails.isPostDated);

      setLoading(true);
      const allocationList = Object.keys(allocations).map((ordId) => {
        const ord = unpaidOrders.find((o) => (o.orderId || o._id) === ordId);
        return {
          invoiceId: ordId,
          invoiceNumber: ord?.orderNumber || 'ORD-REF',
          invoiceTotal: Number(ord?.grandTotal || ord?.totalOrderPrice || 0),
          allocatedAmount: Number(allocations[ordId])
        };
      }).filter((a) => a.allocatedAmount > 0);

      const payload = {
        customerId: customer._id,
        amount: enteredAmount,
        paymentMode: formData.paymentMode,
        allocations: allocationList,
        isPostDated: isPDC,
        paymentDetails: {
          ...formData.paymentDetails,
          isPostDated: isPDC,
        }
      };

      const res = await executeCustomerPayment(payload);
      const createdPayment = res?.data || res;

      if (isPDC) {
        toast.success(`Post-Dated Cheque of ₹${enteredAmount.toLocaleString()} registered successfully! (Pending Clearance)`);
      } else {
        toast.success(`Payment of ₹${enteredAmount.toLocaleString()} recorded successfully!`);
      }

      if (createdPayment?._id && !isPDC) {
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#0F172A', borderBottom: '1px solid #E2E8F0' }}>
        Collect Customer Payment & Part Payment Allocation
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Customer Header Card */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                {customer?.shopName || customer?.ownerName || 'Customer'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.25 }}>
                Owner: {customer?.ownerName || '—'} | Mobile: {customer?.mobile || '—'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                <Chip size="small" label={`Limit: ₹${creditLimit.toLocaleString()}`} sx={{ fontSize: '0.72rem', height: 22 }} />
                {customer?.isGSTRegistered ? (
                  <Chip
                    size="small"
                    label="GST Registered"
                    sx={{
                      backgroundColor: '#ECFDF5',
                      color: '#065F46',
                      border: '1px solid #A7F3D0',
                      fontWeight: 600,
                      fontSize: '0.72rem',
                      height: 22
                    }}
                  />
                ) : (
                  <Chip size="small" label="Non-GST" sx={{ fontSize: '0.72rem', height: 22 }} />
                )}
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block' }}>
                PENDING DUE (RECEIVABLE)
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: pendingCreditUsed > 0 ? '#E11D48' : '#059669', mt: 0.25 }}>
                {pendingCreditUsed > 0 ? `₹${Number(pendingCreditUsed).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '₹0 (Clear)'}
              </Typography>
              {currentAdvance > 0 && (
                <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600, display: 'block', mt: 0.25 }}>
                  Advance Available: ₹{currentAdvance.toLocaleString()}
                </Typography>
              )}
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
              <MenuItem value="UPI">UPI (GooglePay / PhonePe / Paytm)</MenuItem>
              <MenuItem value="CASH">Cash Counter</MenuItem>
              <MenuItem value="CHEQUE">Cheque (A/C Payee)</MenuItem>
              <MenuItem value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</MenuItem>
            </TextField>
          </Grid>
        </Grid>

        {/* Live Settlement Breakdown Alert */}
        {enteredAmount > 0 && (
          <Alert
            severity={
              formData.paymentMode === 'CHEQUE' && formData.paymentDetails.isPostDated
                ? "warning"
                : isOverAllocated ? "error" : isAllocationIncomplete ? "warning" : "info"
            }
            variant="outlined"
            sx={{ mb: 3, borderRadius: '8px' }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formData.paymentMode === 'CHEQUE' && formData.paymentDetails.isPostDated
                ? "Post-Dated Cheque (PDC) Settlement Policy:"
                : "Settlement Allocation:"}
            </Typography>
            {formData.paymentMode === 'CHEQUE' && formData.paymentDetails.isPostDated ? (
              <>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#92400E', fontWeight: 600 }}>
                  • This payment of ₹{enteredAmount.toLocaleString()} will be registered as <strong>PENDING CLEARANCE</strong>.
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: '#78350F' }}>
                  • Cheque Date: <strong>{formData.paymentDetails.chequeDate ? new Date(formData.paymentDetails.chequeDate).toLocaleDateString() : '—'}</strong>. Outstanding ledger balance (₹{pendingCreditUsed.toLocaleString()}) will <strong>NOT</strong> decrease immediately.
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: '#78350F' }}>
                  • Once the cheque clears on/after maturity, mark as <strong>Cleared</strong> in Cheque Clearance to reflect ₹{adjustedAgainstCreditUsed.toLocaleString()} towards due balance and distribute across orders.
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#334155' }}>
                  • <strong>₹{adjustedAgainstCreditUsed.toLocaleString()}</strong> will clear pending credit due.
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: '#334155' }}>
                  • Remaining due after payment: <strong>₹{remainingCreditUsedAfterPayment.toLocaleString()}</strong>.
                </Typography>
                {excessNewAdvance > 0 && (
                  <Typography variant="caption" sx={{ display: 'block', color: '#059669', fontWeight: 600 }}>
                    • Excess <strong>₹{excessNewAdvance.toLocaleString()}</strong> will be added to Advance balance.
                  </Typography>
                )}
              </>
            )}

            {unpaidOrders.length > 0 && (
              <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed #CBD5E1' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      color: isAllocationIncomplete ? '#B45309' : isOverAllocated ? '#DC2626' : '#059669'
                    }}
                  >
                    {isAllocationIncomplete
                      ? `⚠️ Distributed ₹${totalAllocated.toLocaleString()} of ₹${requiredAllocation.toLocaleString()} (₹${unallocatedAmount.toLocaleString()} remaining to allocate)`
                      : isOverAllocated
                        ? `❌ Over-allocated: ₹${totalAllocated.toLocaleString()} exceeds received amount by ₹${(totalAllocated - enteredAmount).toLocaleString()}`
                        : `✓ Full amount of ₹${totalAllocated.toLocaleString()} is fully distributed across orders`
                    }
                  </Typography>
                  {isAllocationIncomplete && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleAutoSplit}
                      sx={{
                        textTransform: 'none',
                        fontSize: '0.7rem',
                        py: 0.25,
                        px: 1,
                        backgroundColor: '#0284C7',
                        '&:hover': { backgroundColor: '#0369A1' }
                      }}
                    >
                      Auto-Allocate Remaining ₹{unallocatedAmount.toLocaleString()}
                    </Button>
                  )}
                </Box>
              </Box>
            )}
          </Alert>
        )}

        {/* Mode Specific Details */}
        {formData.paymentMode === 'UPI' && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="Deposit To Bank Account *"
                size="small"
                value={formData.paymentDetails.bankAccountId || ''}
                onChange={(e) => handleBankAccountSelect(e.target.value)}
                fullWidth
                required
                helperText={bankAccounts.length === 0 ? "No bank account found in Settings" : "Select company account"}
              >
                {bankAccounts.map((b) => (
                  <MenuItem key={b._id} value={b._id}>
                    {b.bankName} - ••••{b.accountNumber?.slice(-4)} ({b.accountType || 'Current'}){b.isDefault ? ' [Primary]' : ''}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
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
            <Grid item xs={12} sm={4}>
              <TextField
                label="Receiver UPI ID"
                size="small"
                value={formData.paymentDetails.receiverUpiId}
                onChange={(e) => setFormData({
                  ...formData,
                  paymentDetails: { ...formData.paymentDetails, receiverUpiId: e.target.value }
                })}
                fullWidth
                helperText="Auto-filled from selected account or custom"
              />
            </Grid>
          </Grid>
        )}

        {formData.paymentMode === 'CHEQUE' && (
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Cheque Number *"
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
                  label="Customer Bank Name *"
                  placeholder="e.g. HDFC Bank, SBI"
                  size="small"
                  value={formData.paymentDetails.bankName}
                  onChange={(e) => setFormData({
                    ...formData,
                    paymentDetails: { ...formData.paymentDetails, bankName: e.target.value }
                  })}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Cheque Date *"
                  type="date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={formData.paymentDetails.chequeDate}
                  onChange={(e) => handleChequeDateChange(e.target.value)}
                  fullWidth
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Deposit To Company Bank Account *"
                  size="small"
                  value={formData.paymentDetails.bankAccountId || ''}
                  onChange={(e) => handleBankAccountSelect(e.target.value)}
                  fullWidth
                  required
                  helperText={bankAccounts.length === 0 ? "No bank account found in Settings" : "Select company account to deposit cheque"}
                >
                  {bankAccounts.map((b) => (
                    <MenuItem key={b._id} value={b._id}>
                      {b.bankName} - ••••{b.accountNumber?.slice(-4)} ({b.accountType || 'Current'}){b.isDefault ? ' [Primary]' : ''}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.25,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: '8px',
                    borderColor: formData.paymentDetails.isPostDated ? '#F59E0B' : '#E2E8F0',
                    backgroundColor: formData.paymentDetails.isPostDated ? '#FFFBEB' : '#F8FAFC'
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem', color: formData.paymentDetails.isPostDated ? '#92400E' : '#334155' }}>
                      Post-Dated Cheque (PDC)
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>
                      {formData.paymentDetails.isPostDated
                        ? 'Clears on maturity; balance updates only on clearance'
                        : 'Cheque will be credited immediately upon collection'}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant={formData.paymentDetails.isPostDated ? "contained" : "outlined"}
                    color={formData.paymentDetails.isPostDated ? "warning" : "inherit"}
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      paymentDetails: { ...prev.paymentDetails, isPostDated: !prev.paymentDetails.isPostDated }
                    }))}
                    sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0.4, px: 1.25, fontWeight: 700 }}
                  >
                    {formData.paymentDetails.isPostDated ? "PDC: YES" : "PDC: NO"}
                  </Button>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {formData.paymentMode === 'BANK_TRANSFER' && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="Deposit To Bank Account *"
                size="small"
                value={formData.paymentDetails.bankAccountId || ''}
                onChange={(e) => handleBankAccountSelect(e.target.value)}
                fullWidth
                required
                helperText={bankAccounts.length === 0 ? "No bank account found in Settings" : "Select company account"}
              >
                {bankAccounts.map((b) => (
                  <MenuItem key={b._id} value={b._id}>
                    {b.bankName} - ••••{b.accountNumber?.slice(-4)} ({b.accountType || 'Current'}){b.isDefault ? ' [Primary]' : ''}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Bank Reference / UTR No. *"
                size="small"
                value={formData.paymentDetails.utrNumber}
                onChange={(e) => setFormData({
                  ...formData,
                  paymentDetails: { ...formData.paymentDetails, utrNumber: e.target.value }
                })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Remitter Bank Name"
                placeholder="e.g. SBI, HDFC"
                size="small"
                value={formData.paymentDetails.bankName}
                onChange={(e) => setFormData({
                  ...formData,
                  paymentDetails: { ...formData.paymentDetails, bankName: e.target.value }
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
                label="Remarks"
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

        {/* Order Part Payment Section */}
        {ordersLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : unpaidOrders.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                  Track Part Payment Against Specific Orders
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                  Entire received amount must be allocated across orders before recording payment.
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                onClick={handleAutoSplit}
                disabled={enteredAmount <= 0}
                sx={{
                  textTransform: 'none',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#0284C7',
                  borderColor: '#BAE6FD',
                  backgroundColor: '#F0F9FF',
                  '&:hover': { backgroundColor: '#E0F2FE' }
                }}
              >
                Auto-Split{enteredAmount > 0 ? ` ₹${enteredAmount.toLocaleString()}` : ""}
              </Button>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '8px', border: '1px solid #E2E8F0', overflowX: 'auto', width: '100%' }}>
              <Table size="small" sx={{ minWidth: 680 }}>
                <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569' }}>Order #</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569' }}>Order Date</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569' }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569' }}>Order Total</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569' }}>Paid Amount</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569' }}>Due Balance</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569', width: '180px' }}>Pay / Allocate (₹)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {unpaidOrders.map((ord) => {
                    const ordId = ord.orderId || ord._id;
                    const grandTotal = Number(ord.grandTotal || ord.totalOrderPrice || 0);
                    const paidSoFar = Number(ord.paidAmount || ord.advanceAmount || 0);
                    const dueBalance = Number(ord.balanceDue !== undefined ? ord.balanceDue : Math.max(0, grandTotal - paidSoFar));
                    const currentAlloc = Number(allocations[ordId] || 0);
                    const isPartPay = currentAlloc > 0 && currentAlloc < dueBalance;
                    const badge = getStatusBadge(ord.orderStatus);

                    const dateStr = ord.orderDate || ord.createdAt
                      ? new Date(ord.orderDate || ord.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })
                      : '—';

                    return (
                      <TableRow key={ordId} hover sx={{ backgroundColor: currentAlloc > 0 ? '#F0FDF4' : 'inherit' }}>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.75rem' }}>
                          {ord.orderNumber || ordId.slice(-6).toUpperCase()}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.72rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                          {dateStr}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={ord.orderStatus || 'Submitted'}
                            sx={{
                              backgroundColor: badge.bg,
                              color: badge.text,
                              fontWeight: 600,
                              fontSize: '0.68rem',
                              height: 18
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                          ₹{grandTotal.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#059669', fontWeight: 500, fontSize: '0.75rem' }}>
                          ₹{paidSoFar.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#DC2626', fontWeight: 600, fontSize: '0.75rem' }}>
                          ₹{dueBalance.toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                            <TextField
                              type="number"
                              size="small"
                              value={allocations[ordId] !== undefined ? allocations[ordId] : ''}
                              placeholder="0"
                              onChange={(e) => {
                                const rawVal = e.target.value;
                                const val = rawVal === '' ? '' : Math.max(0, Number(rawVal) || 0);
                                setAllocations({ ...allocations, [ordId]: val });
                              }}
                              inputProps={{ min: 0, max: dueBalance, style: { textAlign: 'right', padding: '3px 6px', fontSize: '0.75rem' } }}
                              sx={{ width: 90 }}
                            />
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => handleSetFullAllocation(ord)}
                              sx={{ minWidth: 32, px: 0.5, fontSize: '0.68rem', fontWeight: 600, textTransform: 'none' }}
                            >
                              Full
                            </Button>
                          </Box>
                          {isPartPay && (
                            <Typography variant="caption" sx={{ color: '#B45309', fontWeight: 600, display: 'block', fontSize: '0.65rem', mt: 0.25 }}>
                              Part Pay (₹{(dueBalance - currentAlloc).toLocaleString()} rem)
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter sx={{ backgroundColor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell colSpan={5} sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#1E293B' }}>
                      Total Pending Orders Due: ₹{(pendingCreditUsed > 0 && Math.abs(totalDueAcrossOrders - pendingCreditUsed) < 1 ? pendingCreditUsed : totalDueAcrossOrders).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>
                      Allocated:
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        color: isAllocationIncomplete ? '#B45309' : isOverAllocated ? '#DC2626' : '#059669'
                      }}
                    >
                      ₹{totalAllocated.toLocaleString()} / ₹{requiredAllocation.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </TableContainer>

            {/* Incomplete / Over allocation reminder notice */}
            {isAllocationIncomplete && (
              <Box sx={{ mt: 1.5, p: 1.5, borderRadius: '8px', backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#92400E' }}>
                  ⚠️ ₹{unallocatedAmount.toLocaleString()} remains unallocated. Payment cannot be recorded until all received money (₹{enteredAmount.toLocaleString()}) is distributed across orders.
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleAutoSplit}
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    py: 0.5,
                    px: 1.5,
                    backgroundColor: '#D97706',
                    '&:hover': { backgroundColor: '#B45309' }
                  }}
                >
                  Auto-Allocate Remaining ₹{unallocatedAmount.toLocaleString()}
                </Button>
              </Box>
            )}

            {isOverAllocated && (
              <Box sx={{ mt: 1.5, p: 1.5, borderRadius: '8px', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#991B1B' }}>
                  ❌ Over-allocated: Total allocated (₹{totalAllocated.toLocaleString()}) exceeds received amount (₹{enteredAmount.toLocaleString()}) by ₹{(totalAllocated - enteredAmount).toLocaleString()}. Please adjust order allocations before recording payment.
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid #E2E8F0' }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: '#64748B', fontWeight: 600 }}>
          Cancel
        </Button>
        <Tooltip
          title={
            isAllocationIncomplete
              ? `Cannot record payment: Allocate remaining ₹${unallocatedAmount.toLocaleString()} across orders before proceeding.`
              : isOverAllocated
                ? `Cannot record payment: Total allocated exceeds received amount by ₹${(totalAllocated - enteredAmount).toLocaleString()}.`
                : ''
          }
        >
          <span>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading || enteredAmount <= 0 || isAllocationIncomplete || isOverAllocated}
              sx={{
                textTransform: 'none',
                backgroundColor: '#0284C7',
                '&:hover': { backgroundColor: '#0369A1' },
                '&.Mui-disabled': {
                  backgroundColor: '#94A3B8',
                  color: '#FFFFFF'
                },
                fontWeight: 600,
                borderRadius: '6px',
                px: 2.5
              }}
            >
              {loading ? (
                <CircularProgress size={18} color="inherit" />
              ) : isAllocationIncomplete ? (
                `Allocate Remaining (₹${unallocatedAmount.toLocaleString()})`
              ) : (
                `Record Payment (₹${enteredAmount.toLocaleString()})`
              )}
            </Button>
          </span>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
};

export default CustomerPaymentModal;
