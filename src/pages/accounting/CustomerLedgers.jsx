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
  TableContainer,
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
  Tooltip,
  Alert,
  LinearProgress,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getCustomerLedgers, upsertCustomerLedger, adjustDueFromAdvance } from '../../services/accountingService';
import CustomerPaymentModal from './CustomerPaymentModal';

const getStatusColor = (status) => {
  switch ((status || '').toUpperCase()) {
    case 'DELIVERED':
    case 'COMPLETED':
      return { bg: '#DEF7EC', text: '#03543F', border: '#BCF0DA' };
    case 'DISPATCHED':
      return { bg: '#E1EFFE', text: '#1E429F', border: '#B4C6FC' };
    case 'READYTODISPATCH':
      return { bg: '#E1F8F7', text: '#067A75', border: '#AFECE7' };
    case 'PROCESSING':
    case 'QC':
      return { bg: '#FEF08A', text: '#854D0E', border: '#FDE047' };
    case 'SUBMITTED':
      return { bg: '#F3E8FF', text: '#6B21A8', border: '#E9D5FF' };
    case 'CANCELLED':
      return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' };
    default:
      return { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
  }
};

const CustomerLedgers = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ledgers, setLedgers] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [creditFilter, setCreditFilter] = useState('ALL'); // ALL | HEALTHY | WARNING_20_PERCENT | EXCEEDED
  const [gstFilter, setGstFilter] = useState('ALL'); // ALL | GST | NON_GST
  const [viewMode, setViewMode] = useState('ALL_TIME'); // ALL_TIME | MONTHLY
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // 3-Tab Master Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({
    customerId: '',
    customerType: 'Wholesale',
    creditLimit: 0,
    creditDays: 30,
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
      const params = {
        search,
        status: statusFilter,
        creditFilter: creditFilter !== 'ALL' ? creditFilter : undefined,
        gstFilter: gstFilter !== 'ALL' ? gstFilter : undefined,
        month: viewMode === 'MONTHLY' ? selectedMonth : undefined
      };
      const res = await getCustomerLedgers(params);
      setLedgers(res.data?.ledgers || []);
      if (res.data?.metrics) {
        setMetrics(res.data.metrics);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load customer ledgers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgers();
  }, [statusFilter, creditFilter, gstFilter, viewMode, selectedMonth]);

  const handleOpenEdit = (ledger) => {
    setSelectedLedger(ledger);
    setActiveTab(0);
    setFormData({
      customerId: ledger.customerId?._id || ledger.customerId,
      customerType: ledger.customerType || 'Wholesale',
      creditLimit: ledger.creditLimit ?? ledger.customerId?.creditLimit ?? 0,
      creditDays: ledger.creditDays || 30,
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
      currentBalance: ledger.currentBalance,
      isGSTRegistered: ledger.isGSTRegistered
    });
    setPaymentModalOpen(true);
  };

  // Metric aggregates fallback
  const totalCreditUsed = metrics.totalReceivable ?? ledgers.reduce((sum, l) => sum + (Number(l.creditUsed) || 0), 0);
  const totalAdvances = metrics.totalAdvances ?? ledgers.reduce((sum, l) => sum + (Number(l.advanceAmount) || 0), 0);
  const totalCreditLimit = metrics.totalCreditLimit ?? ledgers.reduce((sum, l) => sum + (Number(l.creditLimit) || 0), 0);
  const exceededCount = metrics.exceededLimitCount ?? ledgers.filter((l) => l.creditStatus === 'EXCEEDED').length;
  const warningCount = metrics.warning20PercentCount ?? ledgers.filter((l) => l.creditStatus === 'WARNING_20_PERCENT').length;
  const healthyCount = metrics.healthyCreditCount ?? ledgers.filter((l) => l.creditStatus === 'HEALTHY').length;

  // Month Options for Monthly View
  const monthOptions = [];
  const curr = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(curr.getFullYear(), curr.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    monthOptions.push({ val, label });
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          mb: 3,
          gap: 2
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Customer Ledgers
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.25 }}>
            Ledger accounts, credit limits, 20% warning threshold, order tracking & part payment management
          </Typography>
        </Box>

        {/* View Mode Toggle (All-Time vs Monthly) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            size="small"
            onChange={(e, next) => next && setViewMode(next)}
            sx={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}
          >
            <ToggleButton
              value="ALL_TIME"
              sx={{ px: 2, py: 0.6, fontWeight: 600, textTransform: 'none', fontSize: '0.8125rem' }}
            >
              All-Time Position
            </ToggleButton>
            <ToggleButton
              value="MONTHLY"
              sx={{ px: 2, py: 0.6, fontWeight: 600, textTransform: 'none', fontSize: '0.8125rem' }}
            >
              Monthly View
            </ToggleButton>
          </ToggleButtonGroup>

          {viewMode === 'MONTHLY' && (
            <TextField
              select
              size="small"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              sx={{ minWidth: { xs: '100%', sm: 180 }, backgroundColor: '#FFFFFF' }}
            >
              {monthOptions.map((opt) => (
                <MenuItem key={opt.val} value={opt.val}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Box>
      </Box>

      {/* Credit Limit Alert Banner */}
      {(exceededCount > 0 || warningCount > 0) && (
        <Alert
          severity={exceededCount > 0 ? 'error' : 'warning'}
          variant="outlined"
          sx={{
            mb: 3,
            borderRadius: '10px',
            backgroundColor: exceededCount > 0 ? '#FEF2F2' : '#FFFBEB',
            borderColor: exceededCount > 0 ? '#FCA5A5' : '#FDE68A',
            display: 'flex',
            alignItems: 'center'
          }}
          action={
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {exceededCount > 0 && (
                <Button
                  size="small"
                  variant={creditFilter === 'EXCEEDED' ? 'contained' : 'outlined'}
                  color="error"
                  onClick={() => setCreditFilter(creditFilter === 'EXCEEDED' ? 'ALL' : 'EXCEEDED')}
                  sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '6px' }}
                >
                  {creditFilter === 'EXCEEDED' ? 'Clear Filter' : `Exceeded Accounts (${exceededCount})`}
                </Button>
              )}
              {warningCount > 0 && (
                <Button
                  size="small"
                  variant={creditFilter === 'WARNING_20_PERCENT' ? 'contained' : 'outlined'}
                  color="warning"
                  onClick={() => setCreditFilter(creditFilter === 'WARNING_20_PERCENT' ? 'ALL' : 'WARNING_20_PERCENT')}
                  sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '6px' }}
                >
                  {creditFilter === 'WARNING_20_PERCENT' ? 'Clear Filter' : `20% Warning (${warningCount})`}
                </Button>
              )}
            </Box>
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: exceededCount > 0 ? '#991B1B' : '#92400E' }}>
            {exceededCount > 0
              ? `Credit Limit Exceeded: ${exceededCount} customer account(s) have exceeded their sanctioned credit limit.`
              : `20% Threshold Warning: ${warningCount} customer account(s) are within 20% of exhausting their credit limit.`}
          </Typography>
        </Alert>
      )}

      {/* Metric KPI Cards */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.25 },
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF'
            }}
          >
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, letterSpacing: '0.04em' }}>
              TOTAL RECEIVABLE (DUE)
            </Typography>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: '#E11D48', mt: 0.5, fontSize: { xs: '1.35rem', sm: '1.5rem' } }}
            >
              ₹{totalCreditUsed.toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 0.5 }}>
              Pending customer payments
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.25 },
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF'
            }}
          >
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, letterSpacing: '0.04em' }}>
              TOTAL ADVANCES
            </Typography>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: '#059669', mt: 0.5, fontSize: { xs: '1.35rem', sm: '1.5rem' } }}
            >
              ₹{totalAdvances.toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 0.5 }}>
              Customer credit balance available
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.25 },
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF'
            }}
          >
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, letterSpacing: '0.04em' }}>
              SANCTIONED CREDIT LIMIT
            </Typography>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: '#0F172A', mt: 0.5, fontSize: { xs: '1.35rem', sm: '1.5rem' } }}
            >
              ₹{totalCreditLimit.toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 0.5 }}>
              Total approved limits across all buyers
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.25 },
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF'
            }}
          >
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, letterSpacing: '0.04em' }}>
              CREDIT HEALTH STATUS
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={`${healthyCount} Safe`}
                sx={{
                  backgroundColor: '#ECFDF5',
                  color: '#065F46',
                  border: '1px solid #A7F3D0',
                  fontWeight: 600,
                  fontSize: '0.75rem'
                }}
              />
              <Chip
                size="small"
                label={`${warningCount} 20% Warning`}
                sx={{
                  backgroundColor: '#FFFBEB',
                  color: '#92400E',
                  border: '1px solid #FDE68A',
                  fontWeight: 600,
                  fontSize: '0.75rem'
                }}
              />
              <Chip
                size="small"
                label={`${exceededCount} Over Limit`}
                sx={{
                  backgroundColor: '#FEF2F2',
                  color: '#991B1B',
                  border: '1px solid #FECDD3',
                  fontWeight: 600,
                  fontSize: '0.75rem'
                }}
              />
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Filters Bar */}
      <Card elevation={0} sx={{ p: 2, mb: 3, borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>

          {/* Search */}
          <Box sx={{ flex: '1 1 220px', minWidth: 180, position: 'relative' }}>
            <Icon icon="lucide:search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: 16, pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search shop, owner, mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLedgers()}
              style={{
                width: '100%',
                height: 38,
                paddingLeft: 34,
                paddingRight: 12,
                fontSize: '0.8125rem',
                color: '#0F172A',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </Box>

          {/* Credit Status */}
          <Box sx={{ position: 'relative', flex: '0 0 auto' }}>
            <select
              value={creditFilter}
              onChange={(e) => setCreditFilter(e.target.value)}
              style={{
                height: 38,
                paddingLeft: 12,
                paddingRight: 32,
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: '#374151',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                minWidth: 160
              }}
            >
              <option value="ALL">All Profiles</option>
              <option value="HEALTHY">Safe (&lt; 80% Used)</option>
              <option value="WARNING_20_PERCENT">20% Limit Warning</option>
              <option value="EXCEEDED">Limit Exceeded</option>
            </select>
            <Icon icon="lucide:chevron-down" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: 14, pointerEvents: 'none' }} />
          </Box>

          {/* Tax Type */}
          <Box sx={{ position: 'relative', flex: '0 0 auto' }}>
            <select
              value={gstFilter}
              onChange={(e) => setGstFilter(e.target.value)}
              style={{
                height: 38,
                paddingLeft: 12,
                paddingRight: 32,
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: '#374151',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                minWidth: 150
              }}
            >
              <option value="ALL">All Customers</option>
              <option value="GST">GST Registered</option>
              <option value="NON_GST">Non-GST</option>
            </select>
            <Icon icon="lucide:chevron-down" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: 14, pointerEvents: 'none' }} />
          </Box>

          {/* Account Status */}
          <Box sx={{ position: 'relative', flex: '0 0 auto' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                height: 38,
                paddingLeft: 12,
                paddingRight: 32,
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: '#374151',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                minWidth: 140
              }}
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Blocked">Blocked</option>
              <option value="Closed">Closed</option>
            </select>
            <Icon icon="lucide:chevron-down" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: 14, pointerEvents: 'none' }} />
          </Box>

          {/* Refresh */}
          <Button
            variant="outlined"
            onClick={fetchLedgers}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              height: 38,
              px: 2.5,
              color: '#475569',
              borderColor: '#CBD5E1',
              fontWeight: 600,
              fontSize: '0.8125rem',
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
          >
            Refresh
          </Button>
        </Box>
      </Card>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} />
        </Box>
      ) : ledgers.length === 0 ? (
        <Card elevation={0} sx={{ p: 5, textAlign: 'center', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#334155' }}>
            No Customer Ledgers Found
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            No customer ledgers match the selected credit alerts or search criteria.
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
          <Table sx={{ minWidth: 950 }}>
            <TableHead sx={{ backgroundColor: '#F8FAFC', overflowX: "scroll" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: '#475569', width: 150, fontSize: '0.8125rem' }}>Customer Code</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Customer / Shop</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Tax Type</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Limit & Terms</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', width: 180, fontSize: '0.8125rem' }}>Utilization</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Pending Due</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Advance</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>Latest Order</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, color: '#475569', width: 170, fontSize: '0.8125rem' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ledgers.map((l) => {
                const limit = Number(l.creditLimit ?? l.customerId?.creditLimit ?? 0);
                const used = Number(l.creditUsed ?? l.customerId?.creditUsed ?? 0);
                const adv = Number(l.advanceAmount ?? l.customerId?.customerBalance ?? 0);
                const available = Math.max(0, limit - used);
                const pct = limit > 0 ? Number(((used / limit) * 100).toFixed(1)) : 0;
                const creditStatus = l.creditStatus || (limit > 0 && used >= limit ? 'EXCEEDED' : (limit > 0 && used >= 0.8 * limit ? 'WARNING_20_PERCENT' : 'HEALTHY'));
                const isGST = Boolean(l.isGSTRegistered || l.customerId?.isGSTRegistered);
                const gstin = l.gstNumber || l.customerId?.gstNumber || l.customerId?.GSTNo;
                const ordersSummary = l.ordersSummary || {};
                const orderBadge = getStatusColor(ordersSummary.latestOrderStatus);

                return (
                  <TableRow
                    key={l._id}
                    hover
                    sx={{
                      backgroundColor: creditStatus === 'EXCEEDED' ? '#FFF5F5' : creditStatus === 'WARNING_20_PERCENT' ? '#FFFBEB' : 'inherit'
                    }}
                  >
                    {/* Ledger Code */}
                    <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.8125rem', color: '#475569' }}>
                      {l.ledgerCode}
                    </TableCell>

                    {/* Shop & Customer Name */}
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A' }}>
                        {l.customerId?.shopName || 'N/A'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                        {l.customerId?.ownerName} • {l.customerId?.mobileNo1 || l.customerId?.mobile || '—'}
                      </Typography>
                    </TableCell>

                    {/* GST vs Non-GST */}
                    <TableCell>
                      {isGST ? (
                        <Box>
                          <Chip
                            size="small"
                            label="GST"
                            sx={{
                              backgroundColor: '#ECFDF5',
                              color: '#065F46',
                              border: '1px solid #A7F3D0',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              height: 20
                            }}
                          />
                          {gstin && (
                            <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', color: '#64748B', mt: 0.25, fontSize: '0.72rem' }}>
                              {gstin}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Chip
                          size="small"
                          label="Non-GST"
                          sx={{
                            backgroundColor: '#F8FAFC',
                            color: '#64748B',
                            border: '1px solid #E2E8F0',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            height: 20
                          }}
                        />
                      )}
                    </TableCell>

                    {/* Credit Limit & Terms */}
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A' }}>
                        ₹{limit.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                        {l.creditDays || 30} days window
                      </Typography>
                    </TableCell>

                    {/* Utilization Progress */}
                    <TableCell>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 600,
                            color: creditStatus === 'EXCEEDED' ? '#DC2626' : creditStatus === 'WARNING_20_PERCENT' ? '#D97706' : '#16A34A',
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
                            backgroundColor: creditStatus === 'EXCEEDED' ? '#EF4444' : creditStatus === 'WARNING_20_PERCENT' ? '#F59E0B' : '#10B981'
                          }
                        }}
                      />
                    </TableCell>

                    {/* Credit Due / Pending */}
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: used > 0 ? 700 : 400, color: used > 0 ? '#E11D48' : '#64748B' }}
                      >
                        {used > 0 ? `₹${used.toLocaleString()}` : '—'}
                      </Typography>
                    </TableCell>

                    {/* Advance Balance */}
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: adv > 0 ? 700 : 400, color: adv > 0 ? '#059669' : '#64748B' }}
                      >
                        {adv > 0 ? `₹${adv.toLocaleString()}` : '—'}
                      </Typography>
                    </TableCell>

                    {/* Order Status */}
                    <TableCell>
                      {ordersSummary.latestOrderStatus ? (
                        <Box>
                          <Chip
                            size="small"
                            label={ordersSummary.latestOrderStatus}
                            sx={{
                              backgroundColor: orderBadge.bg,
                              color: orderBadge.text,
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              height: 20
                            }}
                          />
                          {ordersSummary.openOrdersCount > 0 && (
                            <Typography variant="caption" sx={{ display: 'block', color: '#64748B', mt: 0.25, fontSize: '0.7rem' }}>
                              {ordersSummary.openOrdersCount} open order(s)
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>No active orders</Typography>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.75 }}>
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => navigate(`/accounting/customer-statement/${l.customerId?._id}`)}
                          sx={{
                            minWidth: 50,
                            px: 1,
                            py: 0.25,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            color: '#0284C7'
                          }}
                        >
                          View
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          onClick={() => handleOpenPayment(l)}
                          sx={{
                            minWidth: 55,
                            px: 1,
                            py: 0.25,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            borderRadius: '6px'
                          }}
                        >
                          Collect
                        </Button>

                        {used > 0 && adv > 0 && (
                          <Tooltip title={`Adjust ₹${Math.min(used, adv).toLocaleString()} Due from Advance`}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleQuickAdjust(l.customerId?._id, Math.min(used, adv))}
                              sx={{
                                minWidth: 50,
                                px: 1,
                                py: 0.25,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                textTransform: 'none',
                                color: '#D97706',
                                borderColor: '#FDE68A'
                              }}
                            >
                              Adjust
                            </Button>
                          </Tooltip>
                        )}

                        <Tooltip title="Configure Terms">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(l)}
                            sx={{ color: '#64748B', p: 0.5 }}
                          >
                            <Icon icon="lucide:settings" fontSize={15} />
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

      {/* 3-Tab Master Modal (Credit Limit & Period Configuration) */}
      <Dialog
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid #E2E8F0', fontSize: '1.1rem', color: '#0F172A' }}>
          Customer Financial Master & Credit Setup
        </DialogTitle>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          sx={{ px: 3, pt: 1, borderBottom: '1px solid #E2E8F0' }}
        >
          <Tab label="Basic Info" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Credit Limit & Terms" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Account Status" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>
        <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
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
                helperText="Maximum allowed outstanding credit for this customer"
              />
              <TextField
                type="number"
                label="Credit Period (Days)"
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
              {/* Credit Used (Read-Only) */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                    Current Credit Used / Due
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#E11D48', mt: 0.25 }}>
                    ₹{Number(selectedLedger?.creditUsed ?? selectedLedger?.customerId?.creditUsed ?? 0).toLocaleString()}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>System-managed</Typography>
              </Box>
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
                <MenuItem value="Closed">Closed (Account Settled & Inactive)</MenuItem>
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
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid #E2E8F0' }}>
          <Button onClick={() => setEditModalOpen(false)} sx={{ textTransform: 'none', color: '#64748B' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveSettings}
            sx={{ textTransform: 'none', backgroundColor: '#0284C7', fontWeight: 600, borderRadius: '6px' }}
          >
            Save Changes
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
