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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  MenuItem,
  FormControlLabel,
  Checkbox,
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
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // 3-Tab Master Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({
    vendorId: '',
    vendorCategory: 'Manufacturer',
    tdsApplicable: false,
    tdsSection: '194Q',
    tdsPercentage: 0.1,
    gstin: '',
    pan: '',
    paymentTerms: 30,
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
      const res = await getVendorLedgers({ search, category: categoryFilter });
      setLedgers(res.data?.ledgers || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load vendor ledgers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgers();
  }, [categoryFilter]);

  const handleOpenEdit = (ledger) => {
    setSelectedLedger(ledger);
    setActiveTab(0);
    setFormData({
      vendorId: ledger.vendorId?._id || ledger.vendorId,
      vendorCategory: ledger.vendorCategory || 'Manufacturer',
      tdsApplicable: Boolean(ledger.tdsApplicable),
      tdsSection: ledger.tdsSection || '194Q',
      tdsPercentage: ledger.tdsPercentage || 0.1,
      gstin: ledger.gstin || ledger.vendorId?.gstNumber || '',
      pan: ledger.pan || '',
      paymentTerms: ledger.paymentTerms || 30,
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
      _id: ledger.vendorId?._id,
      firm: ledger.vendorId?.firm || ledger.vendorId?.name,
      name: ledger.vendorId?.name,
      mobile: ledger.vendorId?.mobile,
      gstNumber: ledger.vendorId?.gstNumber,
      pan: ledger.pan,
      currentOutstanding: ledger.currentOutstanding,
      tdsApplicable: ledger.tdsApplicable,
      tdsSection: ledger.tdsSection,
      tdsPercentage: ledger.tdsPercentage
    });
    setPayoutModalOpen(true);
  };

  const totalPayables = ledgers.reduce((sum, l) => sum + (Number(l.currentOutstanding) || 0), 0);
  const totalOverdue = ledgers.reduce((sum, l) => sum + (Number(l.overdueAmount) || 0), 0);
  const tdsTrackedCount = ledgers.filter((l) => l.tdsApplicable).length;

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
            Manufacturer, Lab, Logistics, and Supplier payables with automatic TDS and Return adjustments
          </Typography>
        </Box>
      </Box>

      {/* Metric Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              TOTAL PAYABLES (CREDITORS)
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#E11D48', mt: 0.5 }}>
              ₹{totalPayables.toLocaleString()}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              OVERDUE PAYABLES
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#D97706', mt: 0.5 }}>
              ₹{totalOverdue.toLocaleString()}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              TDS DEDUCTION ENABLED
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#4F46E5', mt: 0.5 }}>
              {tdsTrackedCount} / {ledgers.length}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Bar */}
      <Card sx={{ p: 2, mb: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              size="small"
              placeholder="Search vendor by firm, name, or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLedgers()}
              InputProps={{
                startAdornment: <Icon icon="lucide:search" style={{ marginRight: 8, color: '#9CA3AF' }} />
              }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <TextField
              select
              size="small"
              label="Vendor Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              fullWidth
            >
              <MenuItem value="">All Categories</MenuItem>
              {['Manufacturer', 'Distributor', 'Service Provider', 'Logistics', 'Lab', 'Equipment', 'Utility', 'Other'].map((cat) => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={2}>
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
        <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Ledger Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Vendor / Firm</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>TDS Setup</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Payment Terms</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Outstanding (₹)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ledgers.map((l) => {
                const out = Number(l.currentOutstanding || 0);
                return (
                  <TableRow key={l._id} hover>
                    <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                      {l.ledgerCode}
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {l.vendorId?.firm || l.vendorId?.name || 'N/A'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {l.vendorId?.name} | {l.vendorId?.mobile}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={l.vendorCategory || 'Manufacturer'} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      {l.tdsApplicable ? (
                        <Chip size="small" label={`TDS: ${l.tdsSection} (${l.tdsPercentage || 0}%)`} color="warning" sx={{ height: 22 }} />
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Exempt</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">{l.paymentTerms || 0} Days</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {out > 0 ? (
                        <span style={{ color: '#E11D48' }}>₹{out.toLocaleString()} (To Pay)</span>
                      ) : out < 0 ? (
                        <Chip
                          size="small"
                          label={`₹${Math.abs(out).toLocaleString()} Advance Paid`}
                          color="success"
                          variant="outlined"
                          sx={{ fontWeight: 700, height: 24, fontSize: '0.75rem' }}
                        />
                      ) : (
                        <span style={{ color: '#6B7280' }}>₹0 (Settled)</span>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={l.ledgerStatus || 'Active'}
                        color={l.ledgerStatus === 'Active' ? 'success' : 'error'}
                        sx={{ fontWeight: 600, height: 22 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Tooltip title="View Vendor Statement">
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
                        <Tooltip title="Edit Financial Settings (3-Tab)">
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
        </Paper>
      )}

      {/* 3-Tab Master Modal */}
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
            <Tab label="Tab 2: TDS & Financial Settings" sx={{ textTransform: 'none', fontWeight: 600 }} />
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
                    select
                    label="Vendor Category"
                    size="small"
                    value={formData.vendorCategory}
                    onChange={(e) => setFormData({ ...formData, vendorCategory: e.target.value })}
                    fullWidth
                  >
                    {['Manufacturer', 'Distributor', 'Service Provider', 'Logistics', 'Lab', 'Equipment', 'Utility', 'Other'].map((cat) => (
                      <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                    ))}
                  </TextField>
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
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.tdsApplicable}
                        onChange={(e) => setFormData({ ...formData, tdsApplicable: e.target.checked })}
                      />
                    }
                    label="Enable TDS Deduction for this Vendor"
                  />
                </Grid>
                {formData.tdsApplicable && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        size="small"
                        label="TDS Section"
                        value={formData.tdsSection}
                        onChange={(e) => setFormData({ ...formData, tdsSection: e.target.value })}
                        fullWidth
                      >
                        <MenuItem value="194Q">Section 194Q (Purchase of Goods)</MenuItem>
                        <MenuItem value="194C">Section 194C (Jobwork / Lab Services)</MenuItem>
                        <MenuItem value="194J">Section 194J (Technical / Professional Fees)</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
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
