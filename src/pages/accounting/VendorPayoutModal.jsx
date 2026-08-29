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
  FormControlLabel,
  Checkbox,
  CircularProgress
} from '@mui/material';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import { executeVendorPayment } from '../../services/accountingService';

const VendorPayoutModal = ({ open, onClose, vendor, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    grossAmount: '',
    applyTds: false,
    tdsSection: '194Q',
    tdsPercentage: 0.1,
    debitNoteDeducted: 0,
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
        applyTds: Boolean(vendor.tdsApplicable),
        tdsSection: vendor.tdsSection || '194Q',
        tdsPercentage: vendor.tdsPercentage || 0.1,
        debitNoteDeducted: 0,
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

  const gross = Number(formData.grossAmount) || 0;
  const tdsAmt = formData.applyTds ? Math.round((gross * Number(formData.tdsPercentage || 0)) / 100) : 0;
  const debitNoteAmt = Number(formData.debitNoteDeducted) || 0;
  const netPaid = Math.max(0, gross - tdsAmt - debitNoteAmt);

  const handleSubmit = async () => {
    try {
      if (!gross || gross <= 0) {
        toast.warning('Please enter a valid gross payout amount');
        return;
      }

      setLoading(true);

      const payload = {
        vendorId: vendor._id || vendor.id,
        grossAmount: gross,
        tdsDeducted: tdsAmt,
        tdsSection: formData.applyTds ? formData.tdsSection : null,
        debitNoteDeducted: debitNoteAmt,
        paymentMode: formData.paymentMode,
        paymentDetails: formData.paymentDetails
      };

      await executeVendorPayment(payload);
      toast.success(`Vendor payout of ₹${netPaid} processed successfully!`);
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
        <Paper elevation={0} sx={{ p: 2, mb: 3, backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {vendor?.firm || vendor?.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                Contact: {vendor?.name} | Mobile: {vendor?.mobile}
              </Typography>
              {vendor?.gstNumber && (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  GSTIN: {vendor.gstNumber} | PAN: {vendor.pan || '—'}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} sm={6} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                Current Payable Outstanding
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#E11D48' }}>
                ₹{Number(vendor?.currentOutstanding || 0).toLocaleString()}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Payout Amounts */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Gross Bill Amount to Settle (₹)"
              type="number"
              size="small"
              value={formData.grossAmount}
              onChange={(e) => setFormData({ ...formData, grossAmount: e.target.value })}
              fullWidth
              required
              helperText="Gross invoice value before TDS and Return deductions"
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

        {/* TDS & Debit Note Deductions */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, backgroundColor: '#FFFBEB', borderRadius: '10px', border: '1px solid #FDE68A' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#D97706', mb: 1.5 }}>
            Statutory Deductions & Adjustments (TDS / Debit Notes)
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.applyTds}
                    onChange={(e) => setFormData({ ...formData, applyTds: e.target.checked })}
                  />
                }
                label="Deduct TDS (Income Tax)"
              />
            </Grid>
            {formData.applyTds && (
              <>
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    size="small"
                    label="TDS Section"
                    value={formData.tdsSection}
                    onChange={(e) => setFormData({ ...formData, tdsSection: e.target.value })}
                    fullWidth
                  >
                    <MenuItem value="194Q">Sec 194Q (Goods Purchase - 0.1%)</MenuItem>
                    <MenuItem value="194C">Sec 194C (Contractor/Jobwork - 1%/2%)</MenuItem>
                    <MenuItem value="194J">Sec 194J (Professional/Tech - 10%)</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="TDS Rate (%)"
                    type="number"
                    size="small"
                    value={formData.tdsPercentage}
                    onChange={(e) => setFormData({ ...formData, tdsPercentage: e.target.value })}
                    fullWidth
                  />
                </Grid>
              </>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Purchase Return / Debit Note Deduction (₹)"
                type="number"
                size="small"
                value={formData.debitNoteDeducted}
                onChange={(e) => setFormData({ ...formData, debitNoteDeducted: e.target.value })}
                fullWidth
                helperText="Amount deducted for QC failed/returned items"
              />
            </Grid>
          </Grid>
        </Paper>

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

        {/* Payout Calculation Breakdown */}
        <Paper elevation={0} sx={{ p: 2.5, backgroundColor: '#EFF6FF', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={3}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Gross Invoiced</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>₹{gross.toLocaleString()}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" sx={{ color: '#D97706' }}>- TDS Deducted</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#D97706' }}>₹{tdsAmt.toLocaleString()}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" sx={{ color: '#E11D48' }}>- Debit Notes</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#E11D48' }}>₹{debitNoteAmt.toLocaleString()}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700 }}>= NET PAID</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#059669' }}>₹{netPaid.toLocaleString()}</Typography>
            </Grid>
          </Grid>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !gross}
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
