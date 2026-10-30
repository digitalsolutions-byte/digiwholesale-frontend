import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  TextField,
  Paper,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Stack,
  Divider,
  useTheme,
  alpha,
  Tooltip
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getAllSystemNotifications } from '../services/notificationService';
import { PATHS } from '../routes/paths';

const NotificationsPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    summary: {
      total: 0,
      urgentCount: 0,
      orders: { readyToDispatch: 0, qc: 0, processing: 0, newOrders: 0 },
      customers: { pendingApprovals: 0, corrections: 0 },
      returns: { pending: 0 }
    },
    notifications: []
  });

  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'ORDERS' | 'CUSTOMER_APPROVAL' | 'RETURNS'
  const [urgencyFilter, setUrgencyFilter] = useState('ALL'); // 'ALL' | 'URGENT' | 'WARNING' | 'INFO'
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await getAllSystemNotifications();
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error fetching system notifications:', err);
      toast.error(err?.message || 'Failed to load system notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const summary = data.summary || {};
  const allNotifications = data.notifications || [];

  // Categorized counts
  const ordersCount = useMemo(() => allNotifications.filter((n) => n.category === 'ORDERS').length, [allNotifications]);
  const approvalsCount = useMemo(() => allNotifications.filter((n) => n.category === 'CUSTOMER_APPROVAL').length, [allNotifications]);
  const returnsCount = useMemo(() => allNotifications.filter((n) => n.category === 'RETURNS').length, [allNotifications]);
  const urgentCount = summary.urgentCount || allNotifications.filter((n) => n.severity === 'URGENT').length;

  // Filtered Notifications List
  const filteredNotifications = useMemo(() => {
    return allNotifications.filter((item) => {
      // Category filter
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }

      // Urgency filter
      if (urgencyFilter !== 'ALL') {
        if (urgencyFilter === 'URGENT' && item.severity !== 'URGENT') return false;
        if (urgencyFilter === 'WARNING' && item.severity !== 'WARNING' && item.severity !== 'ERROR') return false;
        if (urgencyFilter === 'INFO' && item.severity !== 'INFO') return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const party = (item.partyName || '').toLowerCase();
        const title = (item.title || '').toLowerCase();
        const msg = (item.message || '').toLowerCase();
        const entityNum = (item.entityNumber || '').toLowerCase();

        if (
          !party.includes(q) &&
          !title.includes(q) &&
          !msg.includes(q) &&
          !entityNum.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allNotifications, categoryFilter, urgencyFilter, searchQuery]);

  const resetFilters = () => {
    setCategoryFilter('ALL');
    setUrgencyFilter('ALL');
    setSearchQuery('');
  };

  const isFiltered = categoryFilter !== 'ALL' || urgencyFilter !== 'ALL' || searchQuery.trim() !== '';

  const getCategoryTheme = (cat) => {
    switch (cat) {
      case 'ORDERS':
        return {
          icon: 'lucide:package',
          label: 'Order Fulfillment',
          bg: '#EFF6FF',
          color: '#1E40AF',
          border: '#BFDBFE',
          pillBg: '#DBEAFE',
          pillColor: '#1D4ED8'
        };
      case 'CUSTOMER_APPROVAL':
        return {
          icon: 'lucide:user-check',
          label: 'Customer Onboarding',
          bg: '#F5F3FF',
          color: '#6D28D9',
          border: '#DDD6FE',
          pillBg: '#EDE9FE',
          pillColor: '#6D28D9'
        };
      case 'RETURNS':
        return {
          icon: 'lucide:rotate-ccw',
          label: 'Returns & Refunds',
          bg: '#FFF1F2',
          color: '#9F1239',
          border: '#FECDD3',
          pillBg: '#FFE4E6',
          pillColor: '#BE123C'
        };
      default:
        return {
          icon: 'lucide:bell',
          label: 'System Notification',
          bg: '#F8FAFC',
          color: '#334155',
          border: '#E2E8F0',
          pillBg: '#F1F5F9',
          pillColor: '#475569'
        };
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1360, mx: 'auto' }}>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          mb: 3
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              backgroundColor: '#1F618D',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(31, 97, 141, 0.25)'
            }}
          >
            <Icon icon="lucide:bell" fontSize={26} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
              Notifications &amp; Activity Center
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              Real-time operational alerts for Order Fulfillment, Customer Approvals &amp; Return Requests
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="outlined"
            onClick={fetchNotifications}
            disabled={loading}
            startIcon={
              <Icon
                icon="lucide:rotate-cw"
                style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
              />
            }
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
              color: '#475569',
              borderColor: '#CBD5E1',
              backgroundColor: '#FFFFFF',
              '&:hover': { backgroundColor: '#F8FAFC', borderColor: '#94A3B8' }
            }}
          >
            Refresh
          </Button>

          <Button
            variant="contained"
            onClick={() => navigate('/orders/all')}
            startIcon={<Icon icon="lucide:package" />}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 700,
              backgroundColor: '#1F618D',
              boxShadow: 'none',
              '&:hover': { backgroundColor: '#1A5276', boxShadow: 'none' }
            }}
          >
            All Orders
          </Button>
        </Stack>
      </Box>

      {/* ── Top Multi-Module KPI Overview Cards ──────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Card 1: Orders Ready to Dispatch */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.25,
              borderRadius: '14px',
              backgroundColor: summary.orders?.readyToDispatch > 0 ? '#EFF6FF' : '#FFFFFF',
              border: `1.5px solid ${summary.orders?.readyToDispatch > 0 ? '#93C5FD' : '#E2E8F0'}`,
              boxShadow: summary.orders?.readyToDispatch > 0 ? '0 4px 14px rgba(37, 99, 235, 0.12)' : 'none',
              cursor: 'pointer',
              transition: 'all .15s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                borderColor: '#60A5FA',
                boxShadow: '0 6px 16px rgba(37, 99, 235, 0.15)'
              }
            }}
            onClick={() => {
              setCategoryFilter('ORDERS');
              setUrgencyFilter('URGENT');
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Ready to Dispatch
              </Typography>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  backgroundColor: summary.orders?.readyToDispatch > 0 ? '#DBEAFE' : '#F1F5F9',
                  color: summary.orders?.readyToDispatch > 0 ? '#1D4ED8' : '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Icon icon="lucide:truck" style={{ fontSize: 18 }} />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E3A8A', mb: 0.5 }}>
              {summary.orders?.readyToDispatch || 0}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#3B82F6', fontSize: '0.78rem' }}>
              Packed &amp; waiting for courier pickup
            </Typography>
          </Paper>
        </Grid>

        {/* Card 2: Quality Inspection & New Orders */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.25,
              borderRadius: '14px',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #E2E8F0',
              cursor: 'pointer',
              transition: 'all .15s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                borderColor: '#38BDF8',
                boxShadow: '0 6px 16px rgba(14, 165, 233, 0.12)'
              }
            }}
            onClick={() => {
              setCategoryFilter('ORDERS');
              setUrgencyFilter('ALL');
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                QC &amp; New Orders
              </Typography>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  backgroundColor: '#E0F2FE',
                  color: '#0284C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Icon icon="lucide:clipboard-check" style={{ fontSize: 18 }} />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
              {(summary.orders?.qc || 0) + (summary.orders?.newOrders || 0)}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#64748B', fontSize: '0.78rem' }}>
              {summary.orders?.qc || 0} in QC • {summary.orders?.newOrders || 0} new submitted
            </Typography>
          </Paper>
        </Grid>

        {/* Card 3: Customer KYC Approvals */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.25,
              borderRadius: '14px',
              backgroundColor: summary.customers?.pendingApprovals > 0 ? '#FAF5FF' : '#FFFFFF',
              border: `1.5px solid ${summary.customers?.pendingApprovals > 0 ? '#D8B4FE' : '#E2E8F0'}`,
              boxShadow: summary.customers?.pendingApprovals > 0 ? '0 4px 14px rgba(147, 51, 234, 0.1)' : 'none',
              cursor: 'pointer',
              transition: 'all .15s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                borderColor: '#C084FC',
                boxShadow: '0 6px 16px rgba(147, 51, 234, 0.15)'
              }
            }}
            onClick={() => {
              setCategoryFilter('CUSTOMER_APPROVAL');
              setUrgencyFilter('ALL');
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#6B21A8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Customer KYC Approvals
              </Typography>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  backgroundColor: summary.customers?.pendingApprovals > 0 ? '#F3E8FF' : '#F1F5F9',
                  color: summary.customers?.pendingApprovals > 0 ? '#7E22CE' : '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Icon icon="lucide:user-check" style={{ fontSize: 18 }} />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#581C87', mb: 0.5 }}>
              {(summary.customers?.pendingApprovals || 0) + (summary.customers?.corrections || 0)}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#7E22CE', fontSize: '0.78rem' }}>
              {summary.customers?.pendingApprovals || 0} awaiting review • {summary.customers?.corrections || 0} corrections
            </Typography>
          </Paper>
        </Grid>

        {/* Card 4: Urgent Action Items */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.25,
              borderRadius: '14px',
              backgroundColor: urgentCount > 0 ? '#FEF2F2' : '#FFFFFF',
              border: `1.5px solid ${urgentCount > 0 ? '#FCA5A5' : '#E2E8F0'}`,
              boxShadow: urgentCount > 0 ? '0 4px 14px rgba(239, 68, 68, 0.12)' : 'none',
              cursor: 'pointer',
              transition: 'all .15s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                borderColor: '#F87171',
                boxShadow: '0 6px 16px rgba(239, 68, 68, 0.18)'
              }
            }}
            onClick={() => {
              setUrgencyFilter('URGENT');
              setCategoryFilter('ALL');
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Urgent Action Items
              </Typography>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  backgroundColor: urgentCount > 0 ? '#FEE2E2' : '#F1F5F9',
                  color: urgentCount > 0 ? '#DC2626' : '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Icon icon="lucide:alert-circle" style={{ fontSize: 18 }} />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#7F1D1D', mb: 0.5 }}>
              {urgentCount}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#B91C1C', fontSize: '0.78rem' }}>
              Immediate fulfillment / approval required
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Filters & Search Control Bar ─────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between'
        }}
      >
        {/* Left: Category Filters */}
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', py: 0.5 }}>
          <Chip
            label={`All (${allNotifications.length})`}
            clickable
            onClick={() => setCategoryFilter('ALL')}
            sx={{
              fontWeight: categoryFilter === 'ALL' ? 700 : 500,
              backgroundColor: categoryFilter === 'ALL' ? '#1F618D' : '#F1F5F9',
              color: categoryFilter === 'ALL' ? '#FFFFFF' : '#475569',
              border: `1px solid ${categoryFilter === 'ALL' ? '#1F618D' : '#E2E8F0'}`,
              '&:hover': {
                backgroundColor: categoryFilter === 'ALL' ? '#1A5276' : '#E2E8F0'
              }
            }}
          />

          <Chip
            icon={<Icon icon="lucide:package" style={{ fontSize: 16 }} />}
            label={`Orders (${ordersCount})`}
            clickable
            onClick={() => setCategoryFilter('ORDERS')}
            sx={{
              fontWeight: categoryFilter === 'ORDERS' ? 700 : 500,
              backgroundColor: categoryFilter === 'ORDERS' ? '#2563EB' : '#EFF6FF',
              color: categoryFilter === 'ORDERS' ? '#FFFFFF' : '#1E40AF',
              border: `1px solid ${categoryFilter === 'ORDERS' ? '#2563EB' : '#BFDBFE'}`,
              '&:hover': {
                backgroundColor: categoryFilter === 'ORDERS' ? '#1D4ED8' : '#DBEAFE'
              }
            }}
          />

          <Chip
            icon={<Icon icon="lucide:user-check" style={{ fontSize: 16 }} />}
            label={`Customer Approvals (${approvalsCount})`}
            clickable
            onClick={() => setCategoryFilter('CUSTOMER_APPROVAL')}
            sx={{
              fontWeight: categoryFilter === 'CUSTOMER_APPROVAL' ? 700 : 500,
              backgroundColor: categoryFilter === 'CUSTOMER_APPROVAL' ? '#7C3AED' : '#F5F3FF',
              color: categoryFilter === 'CUSTOMER_APPROVAL' ? '#FFFFFF' : '#6D28D9',
              border: `1px solid ${categoryFilter === 'CUSTOMER_APPROVAL' ? '#7C3AED' : '#DDD6FE'}`,
              '&:hover': {
                backgroundColor: categoryFilter === 'CUSTOMER_APPROVAL' ? '#6D28D9' : '#EDE9FE'
              }
            }}
          />

          <Chip
            icon={<Icon icon="lucide:rotate-ccw" style={{ fontSize: 16 }} />}
            label={`Returns (${returnsCount})`}
            clickable
            onClick={() => setCategoryFilter('RETURNS')}
            sx={{
              fontWeight: categoryFilter === 'RETURNS' ? 700 : 500,
              backgroundColor: categoryFilter === 'RETURNS' ? '#BE123C' : '#FFF1F2',
              color: categoryFilter === 'RETURNS' ? '#FFFFFF' : '#9F1239',
              border: `1px solid ${categoryFilter === 'RETURNS' ? '#BE123C' : '#FECDD3'}`,
              '&:hover': {
                backgroundColor: categoryFilter === 'RETURNS' ? '#9F1239' : '#FFE4E6'
              }
            }}
          />
        </Stack>

        {/* Right: Urgency Selector & Search Bar */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="urgency-filter-label" sx={{ fontSize: '0.85rem' }}>Urgency Level</InputLabel>
            <Select
              labelId="urgency-filter-label"
              value={urgencyFilter}
              label="Urgency Level"
              onChange={(e) => setUrgencyFilter(e.target.value)}
              sx={{ borderRadius: '8px', fontSize: '0.85rem' }}
            >
              <MenuItem value="ALL">All Severities</MenuItem>
              <MenuItem value="URGENT">🚨 Urgent Only</MenuItem>
              <MenuItem value="WARNING">⚠️ Action Needed</MenuItem>
              <MenuItem value="INFO">ℹ️ Informational</MenuItem>
            </Select>
          </FormControl>

          <TextField
            size="small"
            placeholder="Search party, order #, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Icon icon="lucide:search" style={{ color: '#94A3B8' }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <Icon icon="lucide:x" style={{ fontSize: 15 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
              sx: { borderRadius: '8px', minWidth: { sm: 240 }, fontSize: '0.85rem' }
            }}
          />

          {isFiltered && (
            <Button
              size="small"
              onClick={resetFilters}
              variant="text"
              sx={{ color: '#64748B', textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap' }}
            >
              Reset Filters
            </Button>
          )}
        </Stack>
      </Paper>

      {/* ── Status Indicator Bar ─────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>
          Showing <strong>{filteredNotifications.length}</strong> of {allNotifications.length} notifications
          {categoryFilter !== 'ALL' && ` in ${categoryFilter}`}
          {urgencyFilter !== 'ALL' && ` (${urgencyFilter})`}
        </Typography>

        {urgentCount > 0 && (
          <Chip
            icon={<Icon icon="lucide:bell-ring" style={{ fontSize: 14 }} />}
            label={`${urgentCount} items requiring immediate team attention`}
            size="small"
            sx={{
              backgroundColor: '#FEF2F2',
              color: '#B91C1C',
              border: '1px solid #FCA5A5',
              fontWeight: 700,
              fontSize: '0.72rem'
            }}
          />
        )}
      </Box>

      {/* ── Notifications Feed ───────────────────────────────────────────── */}
      {loading ? (
        <Paper
          elevation={0}
          sx={{
            py: 8,
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <CircularProgress size={36} sx={{ color: '#1F618D', mb: 2 }} />
          <Typography variant="body1" sx={{ fontWeight: 600, color: '#334155' }}>
            Loading system notifications...
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            Retrieving real-time statuses from Orders, KYC and Returns modules
          </Typography>
        </Paper>
      ) : filteredNotifications.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            py: 8,
            px: 3,
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            textAlign: 'center'
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: '#DCFCE7',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2
            }}
          >
            <Icon icon="lucide:check-circle-2" style={{ fontSize: 32 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
            No Notifications Found
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', maxWidth: 450, mx: 'auto', mb: 2.5 }}>
            {isFiltered
              ? 'No notifications match your current filter settings. Try clearing the search or changing categories.'
              : 'All operations are running smoothly with no pending alerts or actions required.'}
          </Typography>
          {isFiltered && (
            <Button
              variant="outlined"
              onClick={resetFilters}
              startIcon={<Icon icon="lucide:rotate-ccw" />}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
            >
              Reset All Filters
            </Button>
          )}
        </Paper>
      ) : (
        <Stack spacing={2}>
          {filteredNotifications.map((item) => {
            const catTheme = getCategoryTheme(item.category);
            const isUrgent = item.severity === 'URGENT';
            const isWarning = item.severity === 'WARNING';

            return (
              <Paper
                key={item.id}
                elevation={0}
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: '14px',
                  backgroundColor: '#FFFFFF',
                  border: `1.5px solid ${isUrgent ? '#FCA5A5' : isWarning ? '#FDE68A' : '#E2E8F0'}`,
                  borderLeft: `5px solid ${isUrgent ? '#EF4444' : isWarning ? '#F59E0B' : catTheme.color}`,
                  boxShadow: isUrgent
                    ? '0 4px 14px rgba(239, 68, 68, 0.08)'
                    : '0 2px 6px rgba(15, 23, 42, 0.03)',
                  transition: 'all .2s ease',
                  '&:hover': {
                    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.08)',
                    borderColor: isUrgent ? '#F87171' : '#CBD5E1'
                  }
                }}
              >
                <Grid container spacing={2} alignItems="center">
                  {/* Left & Middle: Details */}
                  <Grid item xs={12} md={9}>
                    {/* Header Chips & Date */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.6,
                          px: 1,
                          py: 0.3,
                          borderRadius: '6px',
                          backgroundColor: catTheme.pillBg,
                          color: catTheme.pillColor,
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}
                      >
                        <Icon icon={catTheme.icon} style={{ fontSize: 14 }} />
                        <span>{item.categoryLabel || catTheme.label}</span>
                      </Box>

                      {isUrgent ? (
                        <Chip
                          label="🚨 Urgent Action Required"
                          size="small"
                          sx={{
                            backgroundColor: '#FEE2E2',
                            color: '#991B1B',
                            fontWeight: 800,
                            fontSize: '0.68rem',
                            height: 22,
                            border: '1px solid #FCA5A5'
                          }}
                        />
                      ) : isWarning ? (
                        <Chip
                          label="⚠️ Attention Needed"
                          size="small"
                          sx={{
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                            fontWeight: 700,
                            fontSize: '0.68rem',
                            height: 22,
                            border: '1px solid #FDE68A'
                          }}
                        />
                      ) : (
                        <Chip
                          label="ℹ️ Information"
                          size="small"
                          sx={{
                            backgroundColor: '#F1F5F9',
                            color: '#475569',
                            fontWeight: 600,
                            fontSize: '0.68rem',
                            height: 22
                          }}
                        />
                      )}

                      <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 500, ml: 'auto' }}>
                        {item.formattedDate}
                      </Typography>
                    </Box>

                    {/* Title */}
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        fontSize: { xs: '0.98rem', sm: '1.05rem' },
                        color: '#0F172A',
                        mb: 0.75,
                        lineHeight: 1.3
                      }}
                    >
                      {item.title}
                    </Typography>

                    {/* Message Body */}
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#475569',
                        fontSize: '0.86rem',
                        lineHeight: 1.5,
                        mb: 1.75
                      }}
                    >
                      {item.message}
                    </Typography>

                    {/* Entity Meta Tags */}
                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                      {item.partyName && (
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.6,
                            px: 1.25,
                            py: 0.4,
                            borderRadius: '6px',
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: '#1E293B'
                          }}
                        >
                          <Icon icon="lucide:user" style={{ fontSize: 14, color: '#64748B' }} />
                          <span>{item.partyName}</span>
                        </Box>
                      )}

                      {item.entityNumber && (
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.6,
                            px: 1.25,
                            py: 0.4,
                            borderRadius: '6px',
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: '#334155',
                            fontFamily: 'monospace'
                          }}
                        >
                          <Icon icon="lucide:hash" style={{ fontSize: 14, color: '#64748B' }} />
                          <span>{item.entityNumber}</span>
                        </Box>
                      )}

                      {item.amountFormatted && (
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.6,
                            px: 1.25,
                            py: 0.4,
                            borderRadius: '6px',
                            backgroundColor: '#ECFDF5',
                            border: '1px solid #A7F3D0',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            color: '#047857'
                          }}
                        >
                          <span>{item.amountFormatted}</span>
                        </Box>
                      )}
                    </Stack>
                  </Grid>

                  {/* Right: Action Button */}
                  <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                    <Button
                      variant="contained"
                      onClick={() => item.actionUrl && navigate(item.actionUrl)}
                      endIcon={<Icon icon="lucide:arrow-right" />}
                      sx={{
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 700,
                        px: 2.5,
                        py: 1,
                        backgroundColor: isUrgent ? '#DC2626' : '#1F618D',
                        boxShadow: 'none',
                        '&:hover': {
                          backgroundColor: isUrgent ? '#B91C1C' : '#1A5276',
                          boxShadow: '0 4px 12px rgba(31, 97, 141, 0.2)'
                        }
                      }}
                    >
                      {item.actionLabel || 'View Details'}
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};

export default NotificationsPage;
