import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography,
  TextField, MenuItem, Button, Grid, Table, TableHead, TableRow,
  TableCell, TableBody, TableFooter, TableContainer, Paper, Alert,
  CircularProgress, Chip, Tooltip
} from '@mui/material';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import {
  executeVendorPayment,
  downloadPaymentReceipt,
  getVendorOrdersForLedger
} from '../../services/accountingService';

const getStatusBadge = (status) => {
  switch ((status || '').toUpperCase()) {
    case 'DELIVERED':
    case 'COMPLETED':
    case 'RECEIVED':
    case 'VERIFIED':
      return { bg: '#DEF7EC', text: '#03543F' };
    case 'DISPATCHED':
    case 'SHIPPED':
      return { bg: '#E1EFFE', text: '#1E429F' };
    case 'READYTODISPATCH':
    case 'READY':
      return { bg: '#E1F8F7', text: '#067A75' };
    case 'PROCESSING':
    case 'QC':
    case 'IN_TRANSIT':
      return { bg: '#FEF08A', text: '#854D0E' };
    case 'SUBMITTED':
    case 'APPROVED':
    case 'PENDING':
      return { bg: '#F3E8FF', text: '#6B21A8' };
    default:
      return { bg: '#F3F4F6', text: '#374151' };
  }
};

const VendorPayoutModal = ({ open, onClose, vendor, initialPurchase, initialOrder, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [unpaidPurchases, setUnpaidPurchases] = useState([]);
  const [formData, setFormData] = useState({
    amount: '',
    paymentMode: 'BANK_TRANSFER',
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

  const targetInitial = initialPurchase || initialOrder;

  useEffect(() => {
    const vendorId = vendor?._id || vendor?.id;
    if (open && vendorId) {
      fetchPurchases(vendorId);
      const hasDue = targetInitial && Number(targetInitial.balanceDue || 0) > 0;
      const initAmt = hasDue ? targetInitial.balanceDue : '';
      setFormData({
        amount: initAmt ? String(initAmt) : '',
        paymentMode: 'BANK_TRANSFER',
        paymentDetails: {
          utrNumber: '',
          receiverUpiId: '',
          chequeNumber: '',
          bankName: '',
          chequeDate: '',
          cashVoucherNo: '',
          remarks: hasDue ? `Part payment for Purchase #${targetInitial.orderNumber}` : ''
        }
      });
      if (hasDue && (targetInitial.orderId || targetInitial._id)) {
        const pId = targetInitial.orderId || targetInitial._id;
        setAllocations({ [pId]: Number(initAmt) });
      } else {
        setAllocations({});
      }
    }
  }, [open, vendor, targetInitial]);

  const fetchPurchases = async (vendorId) => {
    try {
      setPurchasesLoading(true);
      let ords = [];
      const res = await getVendorOrdersForLedger(vendorId);
      ords = res.data?.orders || res.orders || [];

      const pendingPurchases = ords.filter((p) => Number(p.balanceDue || 0) > 0);

      // Sort strictly from Past to Recent (Oldest purchases first - FIFO)
      const sortedPastToRecent = [...pendingPurchases].sort((a, b) => {
        const timeA = new Date(a.orderDate || a.createdAt || 0).getTime();
        const timeB = new Date(b.orderDate || b.createdAt || 0).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return (a.orderNumber || '').localeCompare(b.orderNumber || '');
      });

      setUnpaidPurchases(sortedPastToRecent);
    } catch (err) {
      console.warn('Failed to load pending purchases:', err);
    } finally {
      setPurchasesLoading(false);
    }
  };

  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + (Number(val) || 0), 0);
  const enteredAmount = Number(formData.amount) || 0;

  const rawPendingDue = Number(
    vendor?.pendingDue !== undefined
      ? vendor.pendingDue
      : vendor?.currentOutstanding > 0
        ? vendor.currentOutstanding
        : 0
  );
  const pendingCreditUsed = Math.max(0, rawPendingDue);

  const rawAdvance = Number(
    vendor?.advanceAmount !== undefined
      ? vendor.advanceAmount
      : vendor?.currentOutstanding < 0
        ? Math.abs(vendor.currentOutstanding)
        : 0
  );
  const currentAdvance = Math.max(0, rawAdvance);
  const creditLimit = Number(vendor?.creditLimit || 0);

  const adjustedAgainstCreditUsed = Math.min(enteredAmount, pendingCreditUsed);
  const remainingCreditUsedAfterPayment = Math.max(0, pendingCreditUsed - enteredAmount);
  const excessNewAdvance = Math.max(0, enteredAmount - pendingCreditUsed);

  // Total due across all pending purchases
  const totalDueAcrossPurchases = unpaidPurchases.reduce((sum, p) => {
    const grandTotal = Number(p.grandTotal || p.totalAmount || 0);
    const paidSoFar = Number(p.paidAmount || 0);
    const due = Number(p.balanceDue !== undefined ? p.balanceDue : Math.max(0, grandTotal - paidSoFar));
    return sum + due;
  }, 0);

  // Required allocation when unpaid purchases are present: min(enteredAmount, totalDueAcrossPurchases)
  const requiredAllocation = unpaidPurchases.length > 0 ? Math.min(enteredAmount, totalDueAcrossPurchases) : enteredAmount;
  const unallocatedAmount = enteredAmount > 0 ? Math.max(0, requiredAllocation - totalAllocated) : 0;
  const isOverAllocated = totalAllocated > enteredAmount;
  const isAllocationIncomplete = unpaidPurchases.length > 0 && enteredAmount > 0 && totalAllocated < requiredAllocation;

  // Auto-Split: Bottom to Top (matches customer module behaviour)
  const handleAutoSplit = () => {
    let remaining = enteredAmount;
    const newAlloc = {};

    unpaidPurchases.forEach((p) => {
      const id = p.orderId || p._id;
      newAlloc[id] = 0;
    });

    for (let i = unpaidPurchases.length - 1; i >= 0; i--) {
      if (remaining <= 0) break;
      const p = unpaidPurchases[i];
      const id = p.orderId || p._id;
      const grandTotal = Number(p.grandTotal || p.totalAmount || 0);
      const paidSoFar = Number(p.paidAmount || 0);
      const due = Number(p.balanceDue !== undefined ? p.balanceDue : Math.max(0, grandTotal - paidSoFar));

      const toAlloc = Math.min(remaining, due);
      newAlloc[id] = toAlloc;
      remaining -= toAlloc;
    }

    setAllocations(newAlloc);
  };

  const handleSetFullAllocation = (p) => {
    const key = p.orderId || p._id;
    const due = Number(p.balanceDue || p.grandTotal || 0);
    const newAllocs = { ...allocations, [key]: due };
    setAllocations(newAllocs);
    const sum = Object.values(newAllocs).reduce((s, v) => s + Number(v || 0), 0);
    if (sum > enteredAmount) {
      setFormData((prev) => ({ ...prev, amount: String(sum) }));
    }
  };

  const handleSubmit = async () => {
    try {
      if (!enteredAmount || enteredAmount <= 0) {
        toast.warning('Please enter a valid payout amount');
        return;
      }

      // Validation: Full distribution required before issuing payout
      if (unpaidPurchases.length > 0 && totalAllocated < requiredAllocation) {
        toast.warning(`Please allocate the full amount: ₹${unallocatedAmount.toLocaleString()} remains unallocated.`);
        return;
      }

      if (totalAllocated > enteredAmount) {
        toast.warning(`Total allocated (₹${totalAllocated.toLocaleString()}) cannot exceed payout amount (₹${enteredAmount.toLocaleString()}).`);
        return;
      }

      setLoading(true);
      const allocationList = Object.keys(allocations).map((pId) => {
        const p = unpaidPurchases.find((o) => (o.orderId || o._id) === pId);
        return {
          invoiceId: pId,
          invoiceNumber: p?.orderNumber || 'PUR-REF',
          invoiceModel: 'VendorPurchase',
          invoiceTotal: Number(p?.grandTotal || 0),
          allocatedAmount: Number(allocations[pId])
        };
      }).filter((a) => a.allocatedAmount > 0);

      const payload = {
        vendorId: vendor._id || vendor.id,
        grossAmount: enteredAmount,
        amount: enteredAmount,
        paymentMode: formData.paymentMode,
        allocations: allocationList,
        paymentDetails: formData.paymentDetails
      };

      const res = await executeVendorPayment(payload);
      const createdPayment = res?.data || res;
      toast.success(
        res?.message || `Vendor payout of ₹${enteredAmount.toLocaleString()} recorded successfully!`
      );

      if (createdPayment?._id) {
        try {
          await downloadPaymentReceipt(createdPayment._id, `Payment-Advice-${createdPayment.paymentNumber || 'VPAY'}`);
        } catch (dlErr) {
          console.warn('Payment advice download skipped:', dlErr);
        }
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Vendor payout execution failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#0F172A', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Icon icon="lucide:arrow-up-right" style={{ color: '#E11D48', fontSize: '24px' }} />
        Record Vendor Payout & Part Payment Allocation
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Vendor Header Card */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                {vendor?.firm || vendor?.name || 'Vendor'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.25 }}>
                Contact: {vendor?.name || '—'} | Mobile: {vendor?.mobile || '—'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                Email: {vendor?.email || '—'}{vendor?.gstNumber ? ` | GSTIN: ${vendor.gstNumber}` : ''}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                <Chip size="small" label={`Limit: ₹${creditLimit.toLocaleString()}`} sx={{ fontSize: '0.72rem', height: 22 }} />
                {vendor?.isGSTRegistered || vendor?.gstNumber ? (
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
                {vendor?.tdsApplicable && (
                  <Chip
                    size="small"
                    label={`TDS: ${vendor.tdsSection || 'Sec'} (${vendor.tdsPercentage || 0}%)`}
                    sx={{
                      backgroundColor: '#FEF3C7',
                      color: '#92400E',
                      border: '1px solid #FCD34D',
                      fontWeight: 600,
                      fontSize: '0.72rem',
                      height: 22
                    }}
                  />
                )}
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block' }}>
                PENDING DUE (PAYABLE)
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: pendingCreditUsed > 0 ? '#E11D48' : '#059669', mt: 0.25 }}>
                {pendingCreditUsed > 0 ? `₹${Number(pendingCreditUsed).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '₹0 (Settled)'}
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
              label="Payout Amount to Settle (₹)"
              type="number"
              size="small"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              fullWidth
              required
              helperText="Gross payout amount issued to vendor"
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
              <MenuItem value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</MenuItem>
              <MenuItem value="CHEQUE">Cheque (A/C Payee)</MenuItem>
              <MenuItem value="UPI">UPI Transfer</MenuItem>
              <MenuItem value="CASH">Cash Voucher</MenuItem>
            </TextField>
          </Grid>
        </Grid>

        {/* Live Settlement Breakdown Alert */}
        {enteredAmount > 0 && (
          <Alert severity={isOverAllocated ? "error" : isAllocationIncomplete ? "warning" : "info"} variant="outlined" sx={{ mb: 3, borderRadius: '8px' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Settlement Allocation:
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#334155' }}>
              • <strong>₹{adjustedAgainstCreditUsed.toLocaleString()}</strong> will clear pending payable due.
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: '#334155' }}>
              • Remaining payable due after payment: <strong>₹{remainingCreditUsedAfterPayment.toLocaleString()}</strong>.
            </Typography>
            {excessNewAdvance > 0 && (
              <Typography variant="caption" sx={{ display: 'block', color: '#059669', fontWeight: 600 }}>
                • Excess <strong>₹{excessNewAdvance.toLocaleString()}</strong> will be recorded as Vendor Advance balance.
              </Typography>
            )}

            {unpaidPurchases.length > 0 && (
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
                        ? `❌ Over-allocated: ₹${totalAllocated.toLocaleString()} exceeds payout amount by ₹${(totalAllocated - enteredAmount).toLocaleString()}`
                        : `✓ Full amount of ₹${totalAllocated.toLocaleString()} is fully distributed across purchases`
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
        {formData.paymentMode === 'BANK_TRANSFER' && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Bank Reference / UTR Number"
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
            <Grid item xs={12} sm={6}>
              <TextField
                label="Remitter / Beneficiary Bank Name"
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
                label="Receiver UPI ID / VPA"
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
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Cheque Date"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={formData.paymentDetails.chequeDate}
                onChange={(e) => setFormData({
                  ...formData,
                  paymentDetails: { ...formData.paymentDetails, chequeDate: e.target.value }
                })}
                fullWidth
                required
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

        {/* Purchase Part Payment Section */}
        {purchasesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : unpaidPurchases.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                  Track Part Payment Against Specific Purchases
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                  Entire payout amount must be allocated across purchases before recording payout.
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
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569' }}>Purchase #</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569' }}>Purchase Date</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569' }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569' }}>Purchase Total</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569' }}>Paid Amount</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569' }}>Due Balance</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569', width: '180px' }}>Pay / Allocate (₹)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {unpaidPurchases.map((p) => {
                    const pId = p.orderId || p._id;
                    const grandTotal = Number(p.grandTotal || p.totalAmount || 0);
                    const paidSoFar = Number(p.paidAmount || 0);
                    const dueBalance = Number(p.balanceDue !== undefined ? p.balanceDue : Math.max(0, grandTotal - paidSoFar));
                    const currentAlloc = Number(allocations[pId] || 0);
                    const isPartPay = currentAlloc > 0 && currentAlloc < dueBalance;
                    const badge = getStatusBadge(p.orderStatus);

                    const dateStr = p.orderDate || p.createdAt
                      ? new Date(p.orderDate || p.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })
                      : '—';

                    return (
                      <TableRow key={pId} hover sx={{ backgroundColor: currentAlloc > 0 ? '#F0FDF4' : 'inherit' }}>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.75rem' }}>
                          {p.orderNumber || pId.slice(-6).toUpperCase()}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.72rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                          {dateStr}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={p.orderStatus || 'Submitted'}
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
                              value={allocations[pId] !== undefined ? allocations[pId] : ''}
                              placeholder="0"
                              onChange={(e) => {
                                const rawVal = e.target.value;
                                const val = rawVal === '' ? '' : Math.max(0, Number(rawVal) || 0);
                                setAllocations({ ...allocations, [pId]: val });
                              }}
                              inputProps={{ min: 0, max: dueBalance, style: { textAlign: 'right', padding: '3px 6px', fontSize: '0.75rem' } }}
                              sx={{ width: 90 }}
                            />
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => handleSetFullAllocation(p)}
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
                      Total Pending Purchases Due: ₹{(pendingCreditUsed > 0 && Math.abs(totalDueAcrossPurchases - pendingCreditUsed) < 1 ? pendingCreditUsed : totalDueAcrossPurchases).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
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
                  ⚠️ ₹{unallocatedAmount.toLocaleString()} remains unallocated. Payout cannot be recorded until all payout money (₹{enteredAmount.toLocaleString()}) is distributed across purchases.
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
                  ❌ Over-allocated: Total allocated (₹{totalAllocated.toLocaleString()}) exceeds payout amount (₹{enteredAmount.toLocaleString()}) by ₹{(totalAllocated - enteredAmount).toLocaleString()}. Please adjust purchase allocations before recording payout.
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
              ? `Cannot record payout: Allocate remaining ₹${unallocatedAmount.toLocaleString()} across purchases before proceeding.`
              : isOverAllocated
                ? `Cannot record payout: Total allocated exceeds payout amount by ₹${(totalAllocated - enteredAmount).toLocaleString()}.`
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
                backgroundColor: '#E11D48',
                '&:hover': { backgroundColor: '#BE123C' },
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
                `Confirm & Issue Payout (₹${enteredAmount.toLocaleString()})`
              )}
            </Button>
          </span>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
};

export default VendorPayoutModal;
