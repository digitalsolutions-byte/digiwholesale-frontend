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
  TableContainer,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  MenuItem,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getVendorLedgers, upsertVendorLedger } from '../../services/accountingService';
import VendorPayoutModal from './VendorPayoutModal';

const VendorLedgers = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ledgers, setLedgers] = useState([]);
  const [search, setSearch] = useState('');
  
  // 3-Tab Master Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({
    vendorId: '',
    gstin: '',
    pan: '',
    paymentTerms: 30,
    creditLimit: 0,
    openingBalance: 0,
    openingBalanceType: 'Credit',
    ledgerStatus: 'Active',
    remarks: ''
  });

  // Payout Modal
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutVendor, setPayoutVendor] = useState(null);

  const fetchLedgers = async () => {
    try {
      setLoading(true);
      const res = await getVendorLedgers({ search });
      setLedgers(res.data?.ledgers || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load vendor ledgers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgers();
  }, []);

  const handleOpenEdit = (ledger) => {
    setSelectedLedger(ledger);
    setActiveTab(0);
    setFormData({
      vendorId: ledger.vendorId?._id || ledger.vendorId,
      gstin: ledger.gstin || ledger.vendorId?.gstNumber || '',
      pan: ledger.pan || '',
      paymentTerms: ledger.paymentTerms || 30,
      creditLimit: ledger.creditLimit || ledger.vendorId?.creditLimit || 0,
      openingBalance: ledger.openingBalance || 0,
      openingBalanceType: ledger.openingBalanceType || 'Credit',
      ledgerStatus: ledger.ledgerStatus || 'Active',
      remarks: ledger.remarks || ''
    });
    setEditModalOpen(true);
  };

  const handleSaveSettings = async () => {
    try {
      await upsertVendorLedger(formData);
      toast.success('Vendor financial master updated successfully');
      setEditModalOpen(false);
      fetchLedgers();
    } catch (err) {
      toast.error(err.message || 'Failed to save vendor settings');
    }
  };

  const handleOpenPayout = (ledger) => {
    setPayoutVendor({
      _id: ledger.vendorId?._id || ledger.vendorId,
      id: ledger.vendorId?._id || ledger.vendorId,
      firm: ledger.vendorId?.firm || ledger.vendorId?.name,
      name: ledger.vendorId?.name,
      mobile: ledger.vendorId?.mobile,
      email: ledger.vendorId?.email,
      gstNumber: ledger.vendorId?.gstNumber || ledger.gstin,
      pan: ledger.pan,
      currentOutstanding: ledger.currentOutstanding
    });
    setPayoutModalOpen(true);
  };

  const totalPayables = ledgers.reduce((sum, l) => {
    const out = Number(l.pendingDue !== undefined ? l.pendingDue : (l.currentOutstanding > 0 ? l.currentOutstanding : 0)) || 0;
    return sum + (out > 0 ? out : 0);
  }, 0);
  const totalAdvancesPaid = ledgers.reduce((sum, l) => {
    const adv = Number(l.advanceAmount !== undefined ? l.advanceAmount : (l.currentOutstanding < 0 ? Math.abs(l.currentOutstanding) : 0)) || 0;
    return sum + adv;
  }, 0);
  const totalOverdue = ledgers.reduce((sum, l) => sum + (Number(l.overdueAmount) || 0), 0);
  const activeVendorsCount = ledgers.filter((l) => l.ledgerStatus === 'Active').length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon icon="lucide:truck" style={{ color: '#00A2FF' }} />
            Vendor Ledgers (Accounts Payable)
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Vendor accounts payable, credit terms, and payout tracking
          </Typography>
        </Box>
      </Box>

      {/* Metric Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              TOTAL PAYABLES (TO PAY)
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: totalPayables > 0 ? '#E11D48' : '#6B7280', mt: 0.5 }}>
              ₹{totalPayables.toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Amount owed to vendors</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid', borderColor: '#A7F3D0', backgroundColor: totalAdvancesPaid > 0 ? '#ECFDF5' : 'background.paper' }}>
            <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600 }}>
              TOTAL ADVANCES PAID
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#059669', mt: 0.5 }}>
              ₹{totalAdvancesPaid.toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Advance / Overpaid to vendors</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              OVERDUE PAYABLES
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#D97706', mt: 0.5 }}>
              ₹{totalOverdue.toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Past due amount</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              ACTIVE VENDORS
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#059669', mt: 0.5 }}>
              {activeVendorsCount} / {ledgers.length}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Vendors with active ledgers</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Bar */}
      <Card sx={{ p: 2, mb: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={8} md={6}>
            <TextField
              size="small"
              placeholder="Search vendor by firm, name, mobile, email, or GST..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLedgers()}
              InputProps={{
                startAdornment: <Icon icon="lucide:search" style={{ marginRight: 8, color: '#9CA3AF' }} />
              }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4} md={2}>
            <Button
              variant="outlined"
              onClick={fetchLedgers}
              startIcon={<Icon icon="lucide:rotate-ccw" />}
              sx={{ borderRadius: '8px', textTransform: 'none', height: 40 }}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : ledgers.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            No vendor ledgers found.
          </Typography>
        </Card>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            overflowX: 'auto',
            width: '100%'
          }}
        >
          <Table sx={{ minWidth: 1050 }}>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Ledger Code</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Vendor / Firm</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Contact Info</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>GST Number</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Limit & Terms</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', width: 180, fontSize: '0.8125rem' }}>Credit Utilization</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Pending Due</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Advance</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, color: '#475569', width: 160, fontSize: '0.8125rem' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ledgers.map((l) => {
                const limit = Number(l.creditLimit ?? l.vendorId?.creditLimit ?? 0);
                const pendingDue = Number(
                  l.pendingDue !== undefined
                    ? l.pendingDue
                    : (l.currentOutstanding > 0 ? l.currentOutstanding : 0)
                );
                const advance = Number(
                  l.advanceAmount !== undefined
                    ? l.advanceAmount
                    : (l.currentOutstanding < 0 ? Math.abs(l.currentOutstanding) : 0)
                );
                const terms = l.paymentTerms || l.vendorId?.paymentTerms || 30;

                const effectiveLimit = limit > 0 ? limit : Number(l.totalPurchasedAmount || 0);
                const available = limit > 0
                  ? Math.max(0, limit - pendingDue)
                  : (effectiveLimit > 0 ? Math.max(0, effectiveLimit - pendingDue) : 0);
                const pct = effectiveLimit > 0
                  ? Number(((pendingDue / effectiveLimit) * 100).toFixed(1))
                  : 0;
                const creditStatus = limit > 0
                  ? (pendingDue >= limit
                      ? 'EXCEEDED'
                      : pendingDue >= 0.8 * limit
                        ? 'WARNING_20_PERCENT'
                        : 'HEALTHY')
                  : (pct >= 100
                      ? 'EXCEEDED'
                      : pct >= 80
                        ? 'WARNING_20_PERCENT'
                        : 'HEALTHY');

                const gstNo = l.gstin || l.vendorId?.gstNumber;

                return (
                  <TableRow
                    key={l._id}
                    hover
                    sx={{
                      backgroundColor:
                        creditStatus === 'EXCEEDED'
                          ? '#FFF5F5'
                          : creditStatus === 'WARNING_20_PERCENT'
                            ? '#FFFBEB'
                            : 'inherit'
                    }}
                  >
                    {/* Ledger Code */}
                    <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.8125rem', color: '#475569' }}>
                      {l.ledgerCode}
                    </TableCell>

                    {/* Vendor / Firm */}
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                        {l.vendorId?.firm || l.vendorId?.name || 'N/A'}
                      </Typography>
                      {l.vendorId?.firm && l.vendorId?.name && l.vendorId?.firm !== l.vendorId?.name && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          Contact: {l.vendorId?.name}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Contact Info */}
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Icon icon="lucide:phone" style={{ fontSize: '13px', color: '#0284C7' }} />
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B' }}>
                            {l.vendorId?.mobile || '—'}
                          </Typography>
                        </Box>
                        {l.vendorId?.email ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Icon icon="lucide:mail" style={{ fontSize: '13px', color: '#64748B' }} />
                            <Typography variant="caption" sx={{ color: '#475569' }}>
                              {l.vendorId?.email}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            No email
                          </Typography>
                        )}
                      </Box>
                    </TableCell>

                    {/* GST Number */}
                    <TableCell>
                      {gstNo ? (
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: '#0F172A',
                            backgroundColor: '#F1F5F9',
                            px: 1,
                            py: 0.5,
                            borderRadius: '4px',
                            border: '1px solid #E2E8F0',
                            display: 'inline-block'
                          }}
                        >
                          {gstNo}
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          —
                        </Typography>
                      )}
                    </TableCell>

                    {/* Limit & Terms */}
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A' }}>
                        ₹{limit > 0 ? limit.toLocaleString() : (effectiveLimit > 0 ? effectiveLimit.toLocaleString() : '0')}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                        {terms} days window
                      </Typography>
                    </TableCell>

                    {/* Credit Utilization */}
                    <TableCell sx={{ width: 180 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 600,
                            color:
                              creditStatus === 'EXCEEDED'
                                ? '#DC2626'
                                : creditStatus === 'WARNING_20_PERCENT'
                                  ? '#D97706'
                                  : '#16A34A',
                            fontSize: '0.72rem'
                          }}
                        >
                          {creditStatus === 'EXCEEDED'
                            ? `Exceeded (${pct}%)`
                            : creditStatus === 'WARNING_20_PERCENT'
                              ? `20% Alert (${pct}%)`
                              : `Safe (${pct}%)`}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.72rem' }}>
                          Rem: ₹{available.toLocaleString()}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, pct)}
                        sx={{
                          height: 5,
                          borderRadius: 3,
                          backgroundColor: '#E2E8F0',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor:
                              creditStatus === 'EXCEEDED'
                                ? '#EF4444'
                                : creditStatus === 'WARNING_20_PERCENT'
                                  ? '#F59E0B'
                                  : '#10B981'
                          }
                        }}
                      />
                    </TableCell>

                    {/* Pending Due */}
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: pendingDue > 0 ? 700 : 400,
                          color: pendingDue > 0 ? '#E11D48' : '#64748B'
                        }}
                      >
                        {pendingDue > 0 ? `₹${pendingDue.toLocaleString()}` : '₹0'}
                      </Typography>
                    </TableCell>

                    {/* Advance */}
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: advance > 0 ? 700 : 400,
                          color: advance > 0 ? '#059669' : '#64748B'
                        }}
                      >
                        {advance > 0 ? `₹${advance.toLocaleString()}` : '₹0'}
                      </Typography>
                    </TableCell>

                    {/* Status */}
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={l.ledgerStatus || 'Active'}
                        color={l.ledgerStatus === 'Active' ? 'success' : 'error'}
                        sx={{ fontWeight: 600, height: 22 }}
                      />
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Tooltip title="Print / View Vendor Statement">
                          <IconButton
                            size="small"
                            sx={{ color: '#0284C7' }}
                            onClick={() => navigate(`/accounting/vendor-statement/${l.vendorId?._id}`)}
                          >
                            <Icon icon="lucide:printer" style={{ fontSize: '18px' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Statement Table">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => navigate(`/accounting/vendor-statement/${l.vendorId?._id}`)}
                          >
                            <Icon icon="lucide:file-text" style={{ fontSize: '18px' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Record Payout">
                          <IconButton
                            size="small"
                            sx={{ color: '#E11D48' }}
                            onClick={() => handleOpenPayout(l)}
                          >
                            <Icon icon="lucide:arrow-up-right" style={{ fontSize: '18px' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Financial Settings">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(l)}
                          >
                            <Icon icon="lucide:settings" style={{ fontSize: '18px' }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Financial Master Modal */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Vendor Financial Master Configuration
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 3, pt: 1 }}
          >
            <Tab label="Tab 1: Basic Information" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <Tab label="Tab 2: Financial Settings" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <Tab label="Tab 3: Account Status" sx={{ textTransform: 'none', fontWeight: 600 }} />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {activeTab === 0 && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Firm Name"
                    size="small"
                    value={selectedLedger?.vendorId?.firm || ''}
                    disabled
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Contact Person"
                    size="small"
                    value={selectedLedger?.vendorId?.name || ''}
                    disabled
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="GSTIN"
                    size="small"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="PAN Number"
                    size="small"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                    fullWidth
                  />
                </Grid>
              </Grid>
            )}

            {activeTab === 1 && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Payment Terms (Days)"
                    type="number"
                    size="small"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    fullWidth
                    helperText="Agreed credit window before payment due"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Credit Limit (₹)"
                    type="number"
                    size="small"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                    fullWidth
                    helperText="Maximum allowed outstanding credit"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Opening Balance (₹)"
                    type="number"
                    size="small"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                    fullWidth
                  />
                </Grid>
              </Grid>
            )}

            {activeTab === 2 && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Ledger Status"
                    size="small"
                    value={formData.ledgerStatus}
                    onChange={(e) => setFormData({ ...formData, ledgerStatus: e.target.value })}
                    fullWidth
                  >
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Blocked">Blocked (Halt Payouts)</MenuItem>
                    <MenuItem value="Closed">Closed</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Remarks & Bank Account Details"
                    size="small"
                    multiline
                    rows={2}
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    fullWidth
                  />
                </Grid>
              </Grid>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditModalOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSettings} sx={{ textTransform: 'none', px: 3 }}>
            Save Financial Master
          </Button>
        </DialogActions>
      </Dialog>

      {/* Record Payout Modal */}
      {payoutVendor && (
        <VendorPayoutModal
          open={payoutModalOpen}
          onClose={() => setPayoutModalOpen(false)}
          vendor={payoutVendor}
          onSuccess={fetchLedgers}
        />
      )}
    </Box>
  );
};

export default VendorLedgers;
