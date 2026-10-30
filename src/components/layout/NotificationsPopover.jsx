import React, { useState, useMemo } from 'react';
import {
  Popover,
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Divider,
  Stack,
  CircularProgress,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../../routes/paths';

const NotificationsPopover = ({
  open,
  anchorEl,
  onClose,
  notificationsData,
  loading,
  onRefresh,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ORDERS' | 'CUSTOMER_APPROVAL' | 'RETURNS' | 'URGENT'

  const notifications = useMemo(() => {
    return notificationsData?.notifications || [];
  }, [notificationsData]);

  const summary = useMemo(() => {
    return notificationsData?.summary || {};
  }, [notificationsData]);

  const urgentCount = summary?.urgentCount || notifications.filter((n) => n.severity === 'URGENT').length;
  const ordersCount = notifications.filter((n) => n.category === 'ORDERS').length;
  const approvalsCount = notifications.filter((n) => n.category === 'CUSTOMER_APPROVAL').length;
  const returnsCount = notifications.filter((n) => n.category === 'RETURNS').length;

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'ALL') return notifications;
    if (activeTab === 'URGENT') return notifications.filter((n) => n.severity === 'URGENT');
    if (activeTab === 'ORDERS') return notifications.filter((n) => n.category === 'ORDERS');
    if (activeTab === 'CUSTOMER_APPROVAL') return notifications.filter((n) => n.category === 'CUSTOMER_APPROVAL');
    if (activeTab === 'RETURNS') return notifications.filter((n) => n.category === 'RETURNS');
    return notifications;
  }, [notifications, activeTab]);

  const handleActionClick = (url) => {
    onClose();
    if (url) {
      navigate(url);
    }
  };

  const getCategoryMeta = (cat) => {
    switch (cat) {
      case 'ORDERS':
        return {
          icon: 'lucide:package',
          color: '#2563EB',
          bg: '#EFF6FF',
          border: '#BFDBFE',
          label: 'Order Fulfillment',
        };
      case 'CUSTOMER_APPROVAL':
        return {
          icon: 'lucide:user-check',
          color: '#7C3AED',
          bg: '#F5F3FF',
          border: '#DDD6FE',
          label: 'Customer Approvals',
        };
      case 'RETURNS':
        return {
          icon: 'lucide:rotate-ccw',
          color: '#BE123C',
          bg: '#FFF1F2',
          border: '#FECDD3',
          label: 'Returns & Refunds',
        };
      default:
        return {
          icon: 'lucide:bell',
          color: '#0284C7',
          bg: '#F0F9FF',
          border: '#BAE6FD',
          label: 'System Alert',
        };
    }
  };

  const getSeverityChip = (severity) => {
    if (severity === 'URGENT') {
      return (
        <Chip
          label="🚨 Urgent"
          size="small"
          sx={{
            height: 20,
            fontSize: '0.65rem',
            fontWeight: 800,
            backgroundColor: '#FEE2E2',
            color: '#B91C1C',
            border: '1px solid #FCA5A5',
          }}
        />
      );
    }
    if (severity === 'WARNING') {
      return (
        <Chip
          label="Action Needed"
          size="small"
          sx={{
            height: 20,
            fontSize: '0.65rem',
            fontWeight: 700,
            backgroundColor: '#FEF3C7',
            color: '#B45309',
            border: '1px solid #FDE68A',
          }}
        />
      );
    }
    return (
      <Chip
        label="Info"
        size="small"
        sx={{
          height: 20,
          fontSize: '0.65rem',
          fontWeight: 600,
          backgroundColor: '#F1F5F9',
          color: '#475569',
        }}
      />
    );
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      PaperProps={{
        sx: {
          width: { xs: '92vw', sm: 440 },
          maxWidth: 440,
          maxHeight: 620,
          borderRadius: '16px',
          boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.22), 0 0 1px 1px rgba(15, 23, 42, 0.05)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          mt: 1.25,
        },
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              border: '1px solid #BFDBFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon icon="lucide:bell" style={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: '0.96rem', color: '#0F172A', lineHeight: 1.2 }}>
                Notifications
              </Typography>
              {urgentCount > 0 && (
                <Chip
                  label={`${urgentCount} Urgent`}
                  size="small"
                  sx={{
                    height: 19,
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF',
                  }}
                />
              )}
            </Stack>
            <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.72rem', display: 'block' }}>
              System Alerts &amp; Workflow Updates
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Tooltip title="Refresh Notifications">
            <IconButton
              size="small"
              onClick={onRefresh}
              disabled={loading}
              sx={{
                color: '#64748B',
                '&:hover': { color: '#0F172A', backgroundColor: '#F8FAFC' },
              }}
            >
              <Icon
                icon="lucide:rotate-cw"
                style={{
                  fontSize: 16,
                  animation: loading ? 'spin 1s linear infinite' : 'none',
                }}
              />
            </IconButton>
          </Tooltip>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              color: '#94A3B8',
              '&:hover': { color: '#0F172A', backgroundColor: '#F8FAFC' },
            }}
          >
            <Icon icon="lucide:x" style={{ fontSize: 18 }} />
          </IconButton>
        </Stack>
      </Box>

      {/* ── Category Filter Tabs ────────────────────────────────────────── */}
      <Box
        sx={{
          px: 2,
          py: 1,
          backgroundColor: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          gap: 0.75,
          overflowX: 'auto',
          '&::-webkit-scrollbar': { height: 4 },
          '&::-webkit-scrollbar-thumb': { backgroundColor: '#CBD5E1', borderRadius: 4 },
        }}
      >
        <Chip
          label={`All (${notifications.length})`}
          size="small"
          clickable
          onClick={() => setActiveTab('ALL')}
          sx={{
            fontWeight: activeTab === 'ALL' ? 700 : 500,
            fontSize: '0.72rem',
            backgroundColor: activeTab === 'ALL' ? '#1F618D' : '#FFFFFF',
            color: activeTab === 'ALL' ? '#FFFFFF' : '#475569',
            border: `1px solid ${activeTab === 'ALL' ? '#1F618D' : '#E2E8F0'}`,
            '&:hover': {
              backgroundColor: activeTab === 'ALL' ? '#1A5276' : '#F1F5F9',
            },
          }}
        />

        {ordersCount > 0 && (
          <Chip
            label={`Orders (${ordersCount})`}
            size="small"
            clickable
            onClick={() => setActiveTab('ORDERS')}
            sx={{
              fontWeight: activeTab === 'ORDERS' ? 700 : 500,
              fontSize: '0.72rem',
              backgroundColor: activeTab === 'ORDERS' ? '#2563EB' : '#FFFFFF',
              color: activeTab === 'ORDERS' ? '#FFFFFF' : '#475569',
              border: `1px solid ${activeTab === 'ORDERS' ? '#2563EB' : '#E2E8F0'}`,
              '&:hover': {
                backgroundColor: activeTab === 'ORDERS' ? '#1D4ED8' : '#F1F5F9',
              },
            }}
          />
        )}

        {approvalsCount > 0 && (
          <Chip
            label={`Approvals (${approvalsCount})`}
            size="small"
            clickable
            onClick={() => setActiveTab('CUSTOMER_APPROVAL')}
            sx={{
              fontWeight: activeTab === 'CUSTOMER_APPROVAL' ? 700 : 500,
              fontSize: '0.72rem',
              backgroundColor: activeTab === 'CUSTOMER_APPROVAL' ? '#7C3AED' : '#FFFFFF',
              color: activeTab === 'CUSTOMER_APPROVAL' ? '#FFFFFF' : '#475569',
              border: `1px solid ${activeTab === 'CUSTOMER_APPROVAL' ? '#7C3AED' : '#E2E8F0'}`,
              '&:hover': {
                backgroundColor: activeTab === 'CUSTOMER_APPROVAL' ? '#6D28D9' : '#F1F5F9',
              },
            }}
          />
        )}

        {returnsCount > 0 && (
          <Chip
            label={`Returns (${returnsCount})`}
            size="small"
            clickable
            onClick={() => setActiveTab('RETURNS')}
            sx={{
              fontWeight: activeTab === 'RETURNS' ? 700 : 500,
              fontSize: '0.72rem',
              backgroundColor: activeTab === 'RETURNS' ? '#BE123C' : '#FFFFFF',
              color: activeTab === 'RETURNS' ? '#FFFFFF' : '#475569',
              border: `1px solid ${activeTab === 'RETURNS' ? '#BE123C' : '#E2E8F0'}`,
              '&:hover': {
                backgroundColor: activeTab === 'RETURNS' ? '#9F1239' : '#F1F5F9',
              },
            }}
          />
        )}

        {urgentCount > 0 && (
          <Chip
            label={`🚨 Urgent (${urgentCount})`}
            size="small"
            clickable
            onClick={() => setActiveTab('URGENT')}
            sx={{
              fontWeight: activeTab === 'URGENT' ? 700 : 600,
              fontSize: '0.72rem',
              backgroundColor: activeTab === 'URGENT' ? '#DC2626' : '#FEE2E2',
              color: activeTab === 'URGENT' ? '#FFFFFF' : '#991B1B',
              border: '1px solid #FCA5A5',
              '&:hover': {
                backgroundColor: activeTab === 'URGENT' ? '#B91C1C' : '#FECACA',
              },
            }}
          />
        )}
      </Box>

      {/* ── Scrollable Notifications List ─────────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          maxHeight: 420,
          p: 1.75,
          backgroundColor: '#F8FAFC',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': { backgroundColor: '#CBD5E1', borderRadius: 6 },
        }}
      >
        {loading && notifications.length === 0 ? (
          <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={28} sx={{ color: '#1F618D', mb: 1.5 }} />
            <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 500 }}>
              Checking system updates...
            </Typography>
          </Box>
        ) : filteredNotifications.length === 0 ? (
          <Box sx={{ py: 6, px: 3, textAlign: 'center' }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                backgroundColor: '#DCFCE7',
                color: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 1.5,
              }}
            >
              <Icon icon="lucide:check-check" style={{ fontSize: 26 }} />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
              All Caught Up!
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
              No pending notifications or action items in this section.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {filteredNotifications.map((item) => {
              const catMeta = getCategoryMeta(item.category);
              const isUrgent = item.severity === 'URGENT';

              return (
                <Box
                  key={item.id}
                  sx={{
                    p: 1.75,
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: `1.5px solid ${isUrgent ? '#FCA5A5' : '#E2E8F0'}`,
                    borderLeft: `4px solid ${isUrgent ? '#EF4444' : catMeta.color}`,
                    boxShadow: isUrgent
                      ? '0 3px 10px rgba(239, 68, 68, 0.08)'
                      : '0 1px 3px rgba(0, 0, 0, 0.04)',
                    transition: 'all .15s ease',
                    '&:hover': {
                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.08)',
                      borderColor: isUrgent ? '#F87171' : '#CBD5E1',
                    },
                  }}
                >
                  {/* Category & Status Row */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          px: 0.8,
                          py: 0.25,
                          borderRadius: '6px',
                          backgroundColor: catMeta.bg,
                          color: catMeta.color,
                          fontSize: '0.68rem',
                          fontWeight: 700,
                        }}
                      >
                        <Icon icon={catMeta.icon} style={{ fontSize: 13 }} />
                        <span>{item.categoryLabel || catMeta.label}</span>
                      </Box>
                      {getSeverityChip(item.severity)}
                    </Stack>

                    <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.68rem', fontWeight: 500 }}>
                      {item.formattedDate}
                    </Typography>
                  </Box>

                  {/* Title */}
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      color: '#0F172A',
                      fontSize: '0.84rem',
                      lineHeight: 1.3,
                      mb: 0.5,
                    }}
                  >
                    {item.title}
                  </Typography>

                  {/* Message */}
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#475569',
                      fontSize: '0.76rem',
                      lineHeight: 1.45,
                      mb: 1.25,
                    }}
                  >
                    {item.message}
                  </Typography>

                  {/* Details Pill / Action row */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      pt: 1,
                      borderTop: '1px solid #F1F5F9',
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, overflow: 'hidden' }}>
                      {item.partyName && (
                        <Typography
                          noWrap
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            color: '#1E293B',
                            fontSize: '0.72rem',
                            maxWidth: 160,
                          }}
                        >
                          👤 {item.partyName}
                        </Typography>
                      )}
                      {item.amountFormatted && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            color: '#047857',
                            fontSize: '0.72rem',
                            backgroundColor: '#D1FAE5',
                            px: 0.75,
                            py: 0.15,
                            borderRadius: '4px',
                          }}
                        >
                          {item.amountFormatted}
                        </Typography>
                      )}
                    </Stack>

                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleActionClick(item.actionUrl)}
                      endIcon={<Icon icon="lucide:arrow-right" style={{ fontSize: 13 }} />}
                      sx={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'none',
                        py: 0.35,
                        px: 1.25,
                        borderRadius: '6px',
                        backgroundColor: isUrgent ? '#DC2626' : '#1F618D',
                        boxShadow: 'none',
                        '&:hover': {
                          backgroundColor: isUrgent ? '#B91C1C' : '#1A5276',
                          boxShadow: 'none',
                        },
                      }}
                    >
                      {item.actionLabel || 'View Details'}
                    </Button>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>

      <Divider />

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <Box
        sx={{
          p: 1.5,
          backgroundColor: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
          {notifications.length} total active notification{notifications.length === 1 ? '' : 's'}
        </Typography>

        <Button
          size="small"
          onClick={() => {
            onClose();
            navigate(PATHS.NOTIFICATIONS);
          }}
          endIcon={<Icon icon="lucide:external-link" style={{ fontSize: 14 }} />}
          sx={{
            textTransform: 'none',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#1F618D',
            '&:hover': { backgroundColor: '#F0F9FF' },
          }}
        >
          Open Notifications Hub
        </Button>
      </Box>
    </Popover>
  );
};

export default NotificationsPopover;
