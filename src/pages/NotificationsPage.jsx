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
  InputAdornment,
  Stack,
  useTheme
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getAllSystemNotifications } from '../services/notificationService';

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

  const allNotifications = data.notifications || [];

  // Filter list only if user types in search
  const displayedNotifications = useMemo(() => {
    if (!searchQuery.trim()) return allNotifications;
    const q = searchQuery.toLowerCase();
    return allNotifications.filter((item) => {
      const party = (item.partyName || '').toLowerCase();
      const title = (item.title || '').toLowerCase();
      const msg = (item.message || '').toLowerCase();
      const entityNum = (item.entityNumber || '').toLowerCase();

      return (
        party.includes(q) ||
        title.includes(q) ||
        msg.includes(q) ||
        entityNum.includes(q)
      );
    });
  }, [allNotifications, searchQuery]);

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
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1200, mx: 'auto' }}>
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
              width: 46,
              height: 46,
              borderRadius: '12px',
              backgroundColor: '#1F618D',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(31, 97, 141, 0.25)'
            }}
          >
            <Icon icon="lucide:bell" fontSize={24} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
              Notifications
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              Real-time operational alerts for Order Fulfillment, Customer Approvals &amp; Return Requests
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            size="small"
            placeholder="Search notifications..."
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
              sx: { borderRadius: '8px', minWidth: { sm: 240 }, fontSize: '0.85rem', backgroundColor: '#FFFFFF' }
            }}
          />

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
        </Stack>
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
            Loading notifications...
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            Retrieving real-time alerts from Orders, Approvals and Returns modules
          </Typography>
        </Paper>
      ) : displayedNotifications.length === 0 ? (
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
              width: 60,
              height: 60,
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
            <Icon icon="lucide:check-circle-2" style={{ fontSize: 30 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
            No Notifications
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', maxWidth: 450, mx: 'auto' }}>
            {searchQuery
              ? 'No notifications match your search query.'
              : 'All operations are running smoothly with no pending notifications.'}
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {displayedNotifications.map((item) => {
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
                          label="🚨 Urgent"
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
                          label="⚠️ Action Needed"
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
                          label="ℹ️ Info"
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
