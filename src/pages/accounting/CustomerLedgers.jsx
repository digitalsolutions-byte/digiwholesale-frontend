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
  Switch,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getCustomerLedgers, upsertCustomerLedger, adjustDueFromAdvance } from '../../services/accountingService';
import CustomerPaymentModal from './CustomerPaymentModal';

const CustomerLedgers = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ledgers, setLedgers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // 3-Tab Master Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({
    customerId: '',
    customerType: 'Wholesale',
    creditLimit: 0,
    creditDays: 30,
    creditUsed: 0,
    interestRate: 0,
    openingBalance: 0,
    openingBalanceType: 'Debit',
    ledgerStatus: 'Active',
    allowCreditSales: true,
    remarks: ''
  });

  // Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState(null);

  const fetchLedgers = async () => {
    try {
      setLoading(true);
      const res = await getCustomerLedgers({ search, status: statusFilter });
      setLedgers(res.data?.ledgers || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load customer ledgers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgers();
  }, [statusFilter]);

  const handleOpenEdit = (ledger) => {
    setSelectedLedger(ledger);
    setActiveTab(0);
    setFormData({
      customerId: ledger.customerId?._id || ledger.customerId,
      customerType: ledger.customerType || 'Wholesale',
      creditLimit: ledger.creditLimit || ledger.customerId?.creditLimit || 0,
      creditDays: ledger.creditDays || 30,
      creditUsed: ledger.creditUsed || ledger.customerId?.creditUsed || 0,
      interestRate: ledger.interestRate || 0,
      openingBalance: ledger.openingBalance || 0,
      openingBalanceType: ledger.openingBalanceType || 'Debit',
      ledgerStatus: ledger.ledgerStatus || 'Active',
      allowCreditSales: ledger.allowCreditSales !== undefined ? ledger.allowCreditSales : true,
      remarks: ledger.remarks || ''
    });
    setEditModalOpen(true);
  };

  const handleSaveSettings = async () => {
    try {
      await upsertCustomerLedger(formData);
      toast.success('Customer financial settings updated successfully');
      setEditModalOpen(false);
      fetchLedgers();
    } catch (err) {
      toast.error(err.message || 'Failed to update settings');
    }
  };

  
  const handleQuickAdjust = async (customerId, adjustAmount) => {
    try {
      setLoading(true);
      const res = await adjustDueFromAdvance({ customerId, amount: adjustAmount });
      toast.success(res.message || 'Due adjusted from advance successfully!');
      fetchLedgers();
    } catch (err) {
      toast.error(err.message || 'Failed to adjust advance');
      setLoading(false);
    }
  };

  const handleOpenPayment = (ledger) => {
    setPaymentCustomer({
      _id: ledger.customerId?._id,
      shopName: ledger.customerId?.shopName,
      ownerName: ledger.customerId?.ownerName,
      mobile: ledger.customerId?.mobileNo1 || ledger.customerId?.mobile,
      creditLimit: ledger.creditLimit || ledger.customerId?.creditLimit,
      creditUsed: ledger.creditUsed || ledger.customerId?.creditUsed || 0,
      advanceAmount: ledger.advanceAmount || ledger.customerId?.customerBalance || 0,
      currentBalance: ledger.currentBalance
    });
    setPaymentModalOpen(true);
  };

  // Metric aggregates
  const totalCreditUsed = ledgers.reduce((sum, l) => sum + (Number(l.creditUsed) || 0), 0);
  const totalAdvances = ledgers.reduce((sum, l) => sum + (Number(l.advanceAmount) || 0), 0);
  const totalCreditLimit = ledgers.reduce((sum, l) => sum + (Number(l.creditLimit) || 0), 0);
  const activeCount = ledgers.filter((l) => l.ledgerStatus === 'Active').length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon icon="lucide:book-open" style={{ color: '#00A2FF' }} />
            Customer Khata & Ledgers
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Multi-branch Customer accounting, credit limits, credit used (receivables), and advance balances
          </Typography>
        </Box>
      </Box>

      {/* Metric Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #FECDD3', backgroundColor: '#FFF1F2' }}>
            <Typography variant="caption" sx={{ color: '#E11D48', fontWeight: 700 }}>
              TOTAL RECEIVABLE (CREDIT USED)
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#E11D48', mt: 0.5 }}>
              ₹{totalCreditUsed.toLocaleString()}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #A7F3D0', backgroundColor: '#ECFDF5' }}>
            <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700 }}>
              TOTAL ADVANCES (JAMA)
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#059669', mt: 0.5 }}>
              ₹{totalAdvances.toLocaleString()}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #BFDBFE', backgroundColor: '#EFF6FF' }}>
            <Typography variant="caption" sx={{ color: '#2563EB', fontWeight: 700 }}>
              TOTAL CREDIT LIMIT ASSIGNED
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#2563EB', mt: 0.5 }}>
              ₹{totalCreditLimit.toLocaleString()}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              ACTIVE CUSTOMER KHATAS
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#10B981', mt: 0.5 }}>
              {activeCount} / {ledgers.length}
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
              placeholder="Search by shop, owner, or mobile..."
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
              label="Ledger Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              fullWidth
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Blocked">Blocked</MenuItem>
              <MenuItem value="Closed">Closed</MenuItem>
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
            No customer ledgers found matching criteria.
          </Typography>
        </Card>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Ledger Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Shop & Owner</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Credit Limit (₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Credit Used / Due (₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Advance Balance (₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Available Credit (₹)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ledgers.map((l) => {
                const limit = Number(l.creditLimit || l.customerId?.creditLimit || 0);
                const used = Number(l.creditUsed !== undefined ? l.creditUsed : (l.customerId?.creditUsed || 0));
                const adv = Number(l.advanceAmount !== undefined ? l.advanceAmount : (l.customerId?.customerBalance || 0));
                const available = Math.max(0, limit - used);

                return (
                  <TableRow key={l._id} hover>
                    <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                      {l.ledgerCode}
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {l.customerId?.shopName || 'N/A'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {l.customerId?.ownerName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {l.customerId?.mobileNo1 || l.customerId?.mobile || l.customerId?.mobileNo2 || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1F2937' }}>
                      ₹{limit.toLocaleString()}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {used > 0 ? (
                        <span style={{ color: '#EF4444' }}>₹{used.toLocaleString()} (Due)</span>
                      ) : (
                        <span style={{ color: '#6B7280' }}>₹0</span>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {adv > 0 ? (
                        <Chip
                          size="small"
                          label={`₹${adv.toLocaleString()} Advance`}
                          color="success"
                          variant="outlined"
                          sx={{ fontWeight: 700, height: 24, fontSize: '0.75rem' }}
                        />
                      ) : (
                        <span style={{ color: '#9CA3AF' }}>₹0</span>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#2563EB' }}>
                      ₹{available.toLocaleString()}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={l.ledgerStatus || 'Active'}
                        color={l.ledgerStatus === 'Active' ? 'success' : l.ledgerStatus === 'Blocked' ? 'error' : 'default'}
                        sx={{ fontWeight: 600, height: 22 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Tooltip title="View Khata Statement">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => navigate(`/accounting/customer-statement/${l.customerId?._id}`)}
                          >
                            <Icon icon="lucide:file-text" />
                          </IconButton>
                        </Tooltip>
                        
                        {used > 0 && adv > 0 && (
                          <Tooltip title={`Adjust ₹${Math.min(used, adv).toLocaleString()} Due from Advance`}>
                            <IconButton
                              size="small"
                              sx={{ color: '#D97706', backgroundColor: '#FEF3C7', '&:hover': { backgroundColor: '#FDE68A' } }}
                              onClick={() => handleQuickAdjust(l.customerId?._id, Math.min(used, adv))}
                            >
                              <Icon icon="lucide:arrow-left-right" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Collect Payment">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleOpenPayment(l)}
                          >
                            <Icon icon="lucide:arrow-down-left" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Configure 3-Tab Settings">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(l)}
                          >
                            <Icon icon="lucide:settings" />
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
      <Dialog
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider' }}>
          Customer Financial Master Configuration
        </DialogTitle>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          sx={{ px: 3, pt: 1, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Tab label="Tab 1: Basic Info" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Tab 2: Financial Settings" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Tab 3: Account Status" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>
        <DialogContent sx={{ pt: 3 }}>
          {activeTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Shop Name"
                value={selectedLedger?.customerId?.shopName || ''}
                disabled
                fullWidth
              />
              <TextField
                label="Owner Name"
                value={selectedLedger?.customerId?.ownerName || ''}
                disabled
                fullWidth
              />
              <TextField
                label="Contact Mobile"
                value={selectedLedger?.customerId?.mobileNo1 || selectedLedger?.customerId?.mobile || ''}
                disabled
                fullWidth
              />
              <TextField
                select
                label="Customer Category"
                value={formData.customerType}
                onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                fullWidth
              >
                <MenuItem value="Wholesale">Wholesale Optician</MenuItem>
                <MenuItem value="Retail">Retail Client</MenuItem>
              </TextField>
            </Box>
          )}

          {activeTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                type="number"
                label="Credit Limit (₹)"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                fullWidth
                helperText="Maximum allowed outstanding credit"
              />
              <TextField
                type="number"
                label="Credit Days (Window)"
                value={formData.creditDays}
                onChange={(e) => setFormData({ ...formData, creditDays: Number(e.target.value) })}
                fullWidth
                helperText="Agreed payment window in days (e.g. 15, 30, 45, 60)"
              />
              <TextField
                type="number"
                label="Overdue Interest Rate (% / Annum)"
                value={formData.interestRate}
                onChange={(e) => setFormData({ ...formData, interestRate: Number(e.target.value) })}
                fullWidth
              />
              <TextField
                type="number"
                label="Current Credit Used (Due) (₹)"
                value={formData.creditUsed}
                onChange={(e) => setFormData({ ...formData, creditUsed: Number(e.target.value) })}
                fullWidth
                helperText="Outstanding receivable balance"
              />
            </Box>
          )}

          {activeTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                select
                label="Ledger Status"
                value={formData.ledgerStatus}
                onChange={(e) => setFormData({ ...formData, ledgerStatus: e.target.value })}
                fullWidth
              >
                <MenuItem value="Active">Active (Normal Billing Allowed)</MenuItem>
                <MenuItem value="Blocked">Blocked (Stop New Credit Orders)</MenuItem>
                <MenuItem value="Closed">Closed (Khata Settled & Inactive)</MenuItem>
              </TextField>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allowCreditSales}
                    onChange={(e) => setFormData({ ...formData, allowCreditSales: e.target.checked })}
                  />
                }
                label="Allow Credit Billing Orders"
              />

              <TextField
                label="Internal Audit Notes / Remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                multiline
                rows={3}
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setEditModalOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveSettings}
            sx={{ textTransform: 'none', backgroundColor: '#00A2FF', fontWeight: 600 }}
          >
            Save Financial Master
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Collection Modal */}
      {paymentModalOpen && (
        <CustomerPaymentModal
          open={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          customer={paymentCustomer}
          onSuccess={() => fetchLedgers()}
        />
      )}
    </Box>
  );
};

export default CustomerLedgers;
