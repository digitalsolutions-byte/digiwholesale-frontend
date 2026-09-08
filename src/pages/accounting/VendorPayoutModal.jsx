import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Grid,
  Divider,
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import { executeVendorPayment } from '../../services/accountingService';

const VendorPayoutModal = ({ open, onClose, vendor, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    grossAmount: '',
    paymentMode: 'BANK_TRANSFER',
    paymentDetails: {
      utrNumber: '',
      chequeNumber: '',
      bankName: '',
      chequeDate: '',
      receiverUpiId: '',
      remarks: ''
    }
  });

  useEffect(() => {
    if (open && vendor) {
      setFormData({
        grossAmount: '',
        paymentMode: 'BANK_TRANSFER',
        paymentDetails: {
          utrNumber: '',
          chequeNumber: '',
          bankName: '',
          chequeDate: '',
          receiverUpiId: '',
          remarks: ''
        }
      });
    }
  }, [open, vendor]);

  const amount = Number(formData.grossAmount) || 0;

  const handleSubmit = async () => {
    try {
      if (!amount || amount <= 0) {
        toast.warning('Please enter a valid payout amount');
        return;
      }

      setLoading(true);

      const payload = {
        vendorId: vendor._id || vendor.id,
        grossAmount: amount,
        paymentMode: formData.paymentMode,
        paymentDetails: formData.paymentDetails
      };

      const res = await executeVendorPayment(payload);
      toast.success(
        res?.message ||
        `Vendor payout of ₹${amount.toLocaleString()} processed successfully! Receipt sent to vendor email.`
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Vendor payout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Icon icon="lucide:arrow-up-right" style={{ color: '#E11D48', fontSize: '24px' }} />
        Vendor Payout Execution (Outflow)
      </DialogTitle>

      <DialogContent dividers>
        {/* Vendor Header */}
        <Paper elevation={0} sx={{ p: 2, mb: 2.5, backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={7}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>
                {vendor?.firm || vendor?.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                Contact: <strong>{vendor?.name || '—'}</strong> | Mobile: <strong>{vendor?.mobile || '—'}</strong>
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                Email: <strong style={{ color: vendor?.email ? '#0284C7' : '#94A3B8' }}>{vendor?.email || 'No email configured'}</strong>
                {vendor?.gstNumber ? ` | GSTIN: ${vendor.gstNumber}` : ''}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={5} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                Current Payable Outstanding
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#E11D48' }}>
                ₹{Number(vendor?.currentOutstanding || 0).toLocaleString()}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Email Auto-Dispatch Notice */}
        <Alert
          severity={vendor?.email ? "info" : "warning"}
          icon={<Icon icon={vendor?.email ? "lucide:mail-check" : "lucide:alert-triangle"} style={{ fontSize: '18px' }} />}
          sx={{ mb: 2.5, borderRadius: '8px', fontSize: '0.8rem', py: 0.5 }}
        >
          {vendor?.email ? (
            <span>
              Official <strong>Payment Advice Voucher PDF</strong> will be automatically generated and emailed to <strong>{vendor.email}</strong> upon submission.
            </span>
          ) : (
            <span>
              No email configured for this vendor. Payout voucher will be recorded in ledger and downloadable from vendor statement.
            </span>
          )}
        </Alert>

        {/* Payout Amounts */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Payout Amount to Settle (₹)"
              type="number"
              size="small"
              value={formData.grossAmount}
              onChange={(e) => setFormData({ ...formData, grossAmount: e.target.value })}
              fullWidth
              required
              helperText="Enter payment amount to settle outstanding"
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

        {/* Dynamic Mode Reference */}
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
              />
            </Grid>
            <Grid item xs={12} sm={6}>
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
              />
            </Grid>
          </Grid>
        )}

        {formData.paymentMode === 'UPI' && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
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
            <Grid item xs={12} sm={6}>
              <TextField
                label="Transaction / Reference Remarks"
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

        {/* Payout Summary Breakdown */}
        <Paper elevation={0} sx={{ p: 2.5, backgroundColor: '#EFF6FF', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
          <Grid container spacing={2} alignItems="center" justifyContent="space-between">
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Net Amount to Pay</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#059669' }}>₹{amount.toLocaleString()}</Typography>
            </Grid>
            <Grid item xs={6} sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Payment Mode</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1E293B' }}>
                {formData.paymentMode.replace('_', ' ')}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !amount}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Icon icon="lucide:check" />}
          sx={{ borderRadius: '8px', textTransform: 'none', px: 3, backgroundColor: '#E11D48', '&:hover': { backgroundColor: '#BE123C' } }}
        >
          Confirm & Issue Payout
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VendorPayoutModal;
