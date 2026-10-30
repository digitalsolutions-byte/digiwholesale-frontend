import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  IconButton,
  Divider,
  Paper,
  Stack,
  Tooltip
} from '@mui/material';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import { getBankAccounts } from '../../services/dropdownService';
import { sendCustomerBankDetails } from '../../services/accountingService';

const SendBankDetailsModal = ({
  open,
  onClose,
  customer,
  pendingDue = 0,
  onSuccess
}) => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [channel, setChannel] = useState('both'); // 'both' | 'whatsapp' | 'email'
  const [recipientMobile, setRecipientMobile] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState('');

  // Extract customer ID and basic details
  const customerId = customer?._id || customer?.customerId?._id || customer?.customerId;
  const customerName =
    customer?.shopName ||
    customer?.ownerName ||
    customer?.customerId?.shopName ||
    customer?.customerId?.ownerName ||
    'Customer';

  const defaultMobile =
    customer?.mobileNo1 ||
    customer?.mobile ||
    customer?.mobileNo2 ||
    customer?.customerId?.mobileNo1 ||
    customer?.customerId?.mobile ||
    '';

  const defaultEmail =
    customer?.businessEmail ||
    customer?.email ||
    customer?.customerId?.businessEmail ||
    customer?.customerId?.email ||
    '';

  useEffect(() => {
    if (open) {
      setRecipientMobile(defaultMobile);
      setRecipientEmail(defaultEmail);
      setCustomNote('');
      fetchBankAccounts();
    }
  }, [open, customer]);

  const fetchBankAccounts = async () => {
    try {
      setLoadingBanks(true);
      const res = await getBankAccounts({ isActive: true });
      const accounts = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setBankAccounts(accounts);

      const defaultAccount = accounts.find((acc) => acc.isDefault) || accounts[0];
      if (defaultAccount) {
        setSelectedAccountId(defaultAccount._id);
      } else {
        setSelectedAccountId('');
      }
    } catch (err) {
      console.error('Error fetching bank accounts:', err);
      toast.error('Failed to load wholesaler bank accounts from settings');
    } finally {
      setLoadingBanks(false);
    }
  };

  const selectedBank = bankAccounts.find((acc) => acc._id === selectedAccountId);

  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.info(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const handleSubmit = async () => {
    if (!customerId) {
      toast.error('Customer ID missing');
      return;
    }

    if (!selectedBank && bankAccounts.length > 0) {
      toast.error('Please select a bank account');
      return;
    }

    const needsMobile = channel === 'both' || channel === 'whatsapp';
    const needsEmail = channel === 'both' || channel === 'email';

    if (needsMobile && !recipientMobile.trim()) {
      toast.error('Please enter a valid mobile number for WhatsApp delivery');
      return;
    }

    if (needsEmail && !recipientEmail.trim()) {
      toast.error('Please enter a valid email address for Email delivery');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        bankAccountId: selectedAccountId || undefined,
        channel,
        mobile: recipientMobile.trim(),
        email: recipientEmail.trim(),
        customNote: customNote.trim() || undefined
      };

      const res = await sendCustomerBankDetails(customerId, payload);
      toast.success(res?.message || 'Wholesaler bank details sent successfully!');
      if (onSuccess) onSuccess(res?.data);
      onClose();
    } catch (err) {
      console.error('Failed to send bank details:', err);
      toast.error(err?.message || 'Failed to send bank details');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
      {/* Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1.5,
          borderBottom: '1px solid #E2E8F0'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '8px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Icon icon="lucide:landmark" fontSize={22} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
              Send Wholesaler Bank Details
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              Dispatch official bank account info via WhatsApp & Email
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: '#94A3B8' }}>
          <Icon icon="lucide:x" fontSize={18} />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ pt: 2.5, pb: 2 }}>
        <Stack spacing={2.5}>
          {/* Customer Summary Card */}
          <Box
            sx={{
              p: 1.75,
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Customer
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, color: '#1E293B' }}>
                {customerName}
              </Typography>
            </Box>
            {pendingDue > 0 && (
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" sx={{ color: '#DC2626', fontWeight: 600, textTransform: 'uppercase' }}>
                  Current Outstanding Due
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 800, color: '#DC2626' }}>
                  ₹{Number(pendingDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Wholesaler Bank Account Selector */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#334155' }}>
                Select Wholesaler Bank Account <span style={{ color: '#EF4444' }}>*</span>
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B' }}>
                Configured in Settings
              </Typography>
            </Box>

            {loadingBanks ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5 }}>
                <CircularProgress size={18} />
                <Typography variant="caption" sx={{ color: '#64748B' }}>
                  Loading bank accounts from settings...
                </Typography>
              </Box>
            ) : bankAccounts.length === 0 ? (
              <Alert severity="warning" sx={{ mt: 0.5, borderRadius: '8px' }}>
                No active bank accounts found. Please add your bank details in <strong>Settings &gt; Bank Accounts</strong>.
              </Alert>
            ) : (
              <TextField
                select
                fullWidth
                size="small"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                sx={{ backgroundColor: '#FFFFFF' }}
              >
                {bankAccounts.map((acc) => (
                  <MenuItem key={acc._id} value={acc._id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', py: 0.5 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {acc.bankName} - A/C {acc.accountNumber}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B' }}>
                          Holder: {acc.accountHolderName} • IFSC: {acc.ifscCode}
                        </Typography>
                      </Box>
                      {acc.isDefault && (
                        <Chip label="Default" size="small" color="primary" sx={{ height: 20, fontSize: '0.65rem' }} />
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            )}

            {/* Selected Bank Details Preview Card */}
            {selectedBank && (
              <Paper
                variant="outlined"
                sx={{
                  mt: 1.5,
                  p: 2,
                  borderRadius: '8px',
                  backgroundColor: '#F1F5F9',
                  borderColor: '#CBD5E1'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon icon="lucide:building" fontSize={18} color="#2563EB" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                      {selectedBank.bankName}
                    </Typography>
                  </Box>
                  <Chip
                    label={`${selectedBank.accountType || 'Current'} A/C`}
                    size="small"
                    sx={{ backgroundColor: '#E0E7FF', color: '#3730A3', fontWeight: 600, height: 22 }}
                  />
                </Box>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 1.25,
                    fontSize: '0.8125rem'
                  }}
                >
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                      Account Holder
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B' }}>
                      {selectedBank.accountHolderName}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                      Account Number
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B', fontFamily: 'monospace' }}>
                        {selectedBank.accountNumber}
                      </Typography>
                      <Tooltip title="Copy Account No.">
                        <IconButton
                          size="small"
                          onClick={() => handleCopy(selectedBank.accountNumber, 'Account Number')}
                          sx={{ p: 0.25 }}
                        >
                          <Icon icon={copiedField === 'Account Number' ? 'lucide:check' : 'lucide:copy'} fontSize={14} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                      IFSC Code
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B', fontFamily: 'monospace' }}>
                        {selectedBank.ifscCode}
                      </Typography>
                      <Tooltip title="Copy IFSC">
                        <IconButton
                          size="small"
                          onClick={() => handleCopy(selectedBank.ifscCode, 'IFSC Code')}
                          sx={{ p: 0.25 }}
                        >
                          <Icon icon={copiedField === 'IFSC Code' ? 'lucide:check' : 'lucide:copy'} fontSize={14} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  {selectedBank.branchName && (
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                        Branch
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#1E293B' }}>
                        {selectedBank.branchName}
                      </Typography>
                    </Box>
                  )}

                  {selectedBank.upiId && (
                    <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                      <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                        UPI ID / VPA
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#16A34A', fontFamily: 'monospace' }}>
                          {selectedBank.upiId}
                        </Typography>
                        <Tooltip title="Copy UPI ID">
                          <IconButton
                            size="small"
                            onClick={() => handleCopy(selectedBank.upiId, 'UPI ID')}
                            sx={{ p: 0.25 }}
                          >
                            <Icon icon={copiedField === 'UPI ID' ? 'lucide:check' : 'lucide:copy'} fontSize={14} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Paper>
            )}
          </Box>

          <Divider />

          {/* Delivery Channel */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#334155', mb: 1 }}>
              Delivery Channel
            </Typography>
            <RadioGroup
              row
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              sx={{ display: 'flex', gap: 2 }}
            >
              <FormControlLabel
                value="both"
                control={<Radio size="small" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Icon icon="lucide:send" fontSize={15} color="#2563EB" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Both (WhatsApp & Email)
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="whatsapp"
                control={<Radio size="small" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Icon icon="lucide:message-square" fontSize={15} color="#16A34A" />
                    <Typography variant="body2">WhatsApp Only</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="email"
                control={<Radio size="small" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Icon icon="lucide:mail" fontSize={15} color="#D97706" />
                    <Typography variant="body2">Email Only</Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </Box>

          {/* Recipient Details */}
          <Stack spacing={1.75}>
            {(channel === 'both' || channel === 'whatsapp') && (
              <TextField
                fullWidth
                size="small"
                label="WhatsApp Mobile Number"
                placeholder="e.g. 9876543210"
                value={recipientMobile}
                onChange={(e) => setRecipientMobile(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <Box sx={{ mr: 1, display: 'flex', alignItems: 'center', color: '#16A34A' }}>
                      <Icon icon="lucide:phone" fontSize={16} />
                    </Box>
                  )
                }}
                helperText="Prefilled from customer profile. Editable if sending to an alternate number."
              />
            )}

            {(channel === 'both' || channel === 'email') && (
              <TextField
                fullWidth
                size="small"
                label="Recipient Email Address"
                placeholder="e.g. store@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <Box sx={{ mr: 1, display: 'flex', alignItems: 'center', color: '#2563EB' }}>
                      <Icon icon="lucide:mail" fontSize={16} />
                    </Box>
                  )
                }}
                helperText="Prefilled from customer profile. Editable if sending to an alternate email."
              />
            )}

            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              label="Custom Note / Message (Optional)"
              placeholder="e.g. Please clear the pending balance by this Friday."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
            />
          </Stack>
        </Stack>
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{ p: 2, borderTop: '1px solid #E2E8F0', justifyContent: 'flex-end', gap: 1 }}>
        <Button variant="outlined" color="inherit" onClick={onClose} disabled={submitting} sx={{ borderRadius: '8px' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={submitting || (!selectedBank && bankAccounts.length > 0)}
          startIcon={
            submitting ? <CircularProgress size={16} color="inherit" /> : <Icon icon="lucide:send" fontSize={16} />
          }
          sx={{ borderRadius: '8px', px: 2.5, fontWeight: 600, textTransform: 'none' }}
        >
          {submitting ? 'Sending...' : 'Send Bank Details'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SendBankDetailsModal;

